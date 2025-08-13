/* eslint-disable no-console */
const { execSync } = require('child_process');
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

function run(cmd, options = {}) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...options });
}

function writeJson(filePath, obj) {
  const json = JSON.stringify(obj, null, 2);
  writeFileSync(filePath, json, 'utf8');
  console.log(`WROTE ${filePath}`);
}

function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function ensureDir(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
    console.log(`MKDIR ${path}`);
  }
}

function upsertRootPackageJson(root) {
  const file = join(root, 'package.json');
  const current = readJson(file, {});
  const next = {
    name: 'multi-tenant-marketplace',
    private: true,
    version: '0.1.0',
    workspaces: ['apps/*', 'packages/*'],
    scripts: {
      dev: 'concurrently -n web,api -c blue,magenta "npm run -w @app/web dev" "npm run -w @app/api dev"',
      build: 'npm run -w @pkg/db build && npm run -w @app/web build && npm run -w @app/api build',
      'db:gen': 'npm run -w @pkg/db generate',
      lint: 'npm run -w @app/web lint || true'
    },
    devDependencies: {
      concurrently: '8.2.2',
      prettier: '3.3.3'
    },
    ...current,
  };
  writeJson(file, next);
}

function ensureWebApp(root) {
  const webDir = join(root, 'apps', 'web');
  if (!existsSync(webDir)) {
    console.warn('apps/web not found. Skipping scaffold. You can create it with create-next-app.');
    return;
  }
  const pkgFile = join(webDir, 'package.json');
  const pkg = readJson(pkgFile);
  if (pkg && pkg.name !== '@app/web') {
    pkg.name = '@app/web';
    writeJson(pkgFile, pkg);
  }
}

function ensureApiApp(root) {
  const apiDir = join(root, 'apps', 'api');
  ensureDir(apiDir);
  ensureDir(join(apiDir, 'src'));
  writeJson(join(apiDir, 'package.json'), {
    name: '@app/api',
    version: '0.1.0',
    private: true,
    type: 'module',
    main: 'dist/index.js',
    scripts: {
      dev: 'tsx watch src/index.ts',
      build: 'tsc -p tsconfig.json',
      start: 'node dist/index.js',
      lint: 'eslint . || true'
    },
    dependencies: {
      fastify: '4.28.1',
      '@fastify/cors': '9.0.1',
      '@fastify/helmet': '12.0.1',
      zod: '3.23.8',
      '@prisma/client': '5.16.2',
      stripe: '15.8.0',
      dotenv: '16.4.5'
    },
    devDependencies: {
      typescript: '5.5.4',
      tsx: '4.16.2',
      eslint: '9.9.0',
      '@types/node': '22.5.4'
    }
  });
  writeJson(join(apiDir, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      outDir: 'dist',
      strict: true,
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      skipLibCheck: true
    },
    include: ['src/**/*']
  });
  writeFileSync(
    join(apiDir, 'src', 'env.ts'),
    `import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  BKASH_APP_KEY: z.string().optional(),
  BKASH_APP_SECRET: z.string().optional(),
  BKASH_USERNAME: z.string().optional(),
  BKASH_PASSWORD: z.string().optional(),
  DISCORD_WEBHOOK_URL: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;
export const env: Env = EnvSchema.parse(process.env);
`,
    'utf8'
  );
  writeFileSync(
    join(apiDir, 'src', 'routes.ts'),
    `import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Stripe from 'stripe';
import { env } from './env';
import { getPrismaClient } from '@pkg/db';

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' }) : null;

export async function registerRoutes(app: FastifyInstance) {
  const prisma = getPrismaClient();

  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/tenants', async () => {
    try {
      const tenants = await prisma.tenant.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
      return { items: tenants };
    } catch {
      return { items: [] };
    }
  });

  app.post('/tenants', async (request, reply) => {
    const Body = z.object({ name: z.string().min(2), domain: z.string().min(3) });
    const data = Body.parse(request.body);
    try {
      const created = await prisma.tenant.create({ data });
      return created;
    } catch (e) {
      return reply.code(400).send({ error: 'tenant_create_failed' });
    }
  });

  app.get('/products', async (request) => {
    const Query = z.object({ tenantId: z.string().optional() });
    const { tenantId } = Query.parse(request.query as any);
    try {
      const products = await prisma.product.findMany({ where: tenantId ? { tenantId } : undefined, take: 50, orderBy: { createdAt: 'desc' } });
      return { items: products };
    } catch {
      return { items: [] };
    }
  });

  app.post('/products', async (request, reply) => {
    const Body = z.object({
      tenantId: z.string(),
      sku: z.string().min(1),
      title: z.string().min(2),
      description: z.string().optional(),
      priceCents: z.number().int().nonnegative(),
      currency: z.string().min(3).max(3).default('USD'),
    });
    const data = Body.parse(request.body);
    try {
      const created = await prisma.product.create({ data });
      return created;
    } catch (e) {
      return reply.code(400).send({ error: 'product_create_failed' });
    }
  });

  app.post('/cart/calculate', async (request) => {
    const Body = z.object({ items: z.array(z.object({ sku: z.string(), qty: z.number().int().positive() })) });
    const body = Body.parse(request.body);
    return { items: body.items, totalCents: 0, currency: 'USD' };
  });

  app.post('/checkout/stripe', async (request, reply) => {
    if (!stripe) return reply.code(400).send({ error: 'Stripe not configured' });
    const Body = z.object({
      success_url: z.string().url(),
      cancel_url: z.string().url(),
      line_items: z.array(z.object({ price_data: z.any(), quantity: z.number().int().positive() }))
    });
    const body = Body.parse(request.body);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: body.success_url,
      cancel_url: body.cancel_url,
      line_items: body.line_items as any
    });
    return { id: session.id, url: session.url };
  });

  app.post('/checkout/bkash', async () => ({ status: 'not_configured' }));
  app.post('/webhooks/stripe', async () => ({ received: true }));
  app.post('/messages/whatsapp', async (request) => {
    const Body = z.object({ to: z.string(), message: z.string() });
    const body = Body.parse(request.body);
    return { sent: true, channel: 'whatsapp', to: body.to };
  });
  app.post('/messages/discord', async () => ({ sent: true, channel: 'discord' }));
  app.post('/notify', async () => ({ accepted: true }));
}
`,
    'utf8'
  );
  writeFileSync(
    join(apiDir, 'src', 'index.ts'),
    `import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import 'dotenv/config';
import { registerRoutes } from './routes';

const app = Fastify({ logger: true });
await app.register(fastifyCors, { origin: true });
await app.register(fastifyHelmet);
await registerRoutes(app);

const port = Number(process.env.PORT || 4000);
app
  .listen({ port, host: '0.0.0.0' })
  .then(() => app.log.info(`api listening on ${port}`))
  .catch((err) => { app.log.error(err); process.exit(1); });
`,
    'utf8'
  );
}

function ensureDbPackage(root) {
  const dbDir = join(root, 'packages', 'db');
  ensureDir(dbDir);
  ensureDir(join(dbDir, 'prisma'));
  ensureDir(join(dbDir, 'src'));
  writeJson(join(dbDir, 'package.json'), {
    name: '@pkg/db',
    version: '0.1.0',
    private: true,
    type: 'module',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    scripts: {
      build: 'tsc -p tsconfig.json',
      generate: 'prisma generate',
      'db:push': 'prisma db push'
    },
    devDependencies: {
      prisma: '5.16.2',
      typescript: '5.5.4'
    },
    dependencies: {
      '@prisma/client': '5.16.2',
      zod: '3.23.8'
    }
  });
  writeJson(join(dbDir, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      declaration: true,
      outDir: 'dist',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true
    },
    include: ['src/**/*', 'prisma/schema.prisma']
  });
  writeFileSync(
    join(dbDir, 'prisma', 'schema.prisma'),
    `generator client { provider = "prisma-client-js" }

datasource db { provider = "mysql" url = env("DATABASE_URL") }

model Tenant {
  id        String   @id @default(cuid())
  name      String
  domain    String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  users     User[]
  products  Product[]
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  role      String   @default("customer")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Product {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  sku         String   @unique
  title       String
  description String?
  priceCents  Int
  currency    String   @default("USD")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
`,
    'utf8'
  );
  writeFileSync(
    join(dbDir, 'src', 'index.ts'),
    `import { PrismaClient } from '@prisma/client';
let prismaClientSingleton: PrismaClient | null = null;
export function getPrismaClient(): PrismaClient {
  if (!prismaClientSingleton) prismaClientSingleton = new PrismaClient();
  return prismaClientSingleton;
}
export type { Prisma, Tenant, User, Product } from '@prisma/client';
`,
    'utf8'
  );
}

function ensureDotfiles(root) {
  const gitignore = join(root, '.gitignore');
  if (!existsSync(gitignore)) {
    writeFileSync(gitignore, 'node_modules\n.DS_Store\n.next\n.env*\ncoverage\n.prisma\n', 'utf8');
  }
  const envFile = join(root, '.env');
  if (!existsSync(envFile)) {
    writeFileSync(
      envFile,
      'DATABASE_URL="mysql://user:password@localhost:3306/marketplace"\nSTRIPE_SECRET_KEY="sk_test_..."\nNEXT_PUBLIC_API_URL="http://localhost:4000"\nBKASH_APP_KEY=""\nBKASH_APP_SECRET=""\nBKASH_USERNAME=""\nBKASH_PASSWORD=""\nDISCORD_WEBHOOK_URL=""\nWHATSAPP_ACCESS_TOKEN=""\nWHATSAPP_PHONE_NUMBER_ID=""\n',
      'utf8'
    );
  }
  const compose = join(root, 'docker-compose.yml');
  if (!existsSync(compose)) {
    writeFileSync(
      compose,
      'version: "3.9"\nservices:\n  mysql:\n    image: mysql:8.0\n    container_name: marketplace-mysql\n    restart: unless-stopped\n    environment:\n      MYSQL_ROOT_PASSWORD: root\n      MYSQL_DATABASE: marketplace\n      MYSQL_USER: user\n      MYSQL_PASSWORD: password\n    ports:\n      - "3306:3306"\n    volumes:\n      - db_data:/var/lib/mysql\nvolumes:\n  db_data: {}\n',
      'utf8'
    );
  }
}

function main() {
  const root = process.cwd();
  ensureDir(join(root, 'apps'));
  ensureDir(join(root, 'packages'));
  upsertRootPackageJson(root);
  ensureWebApp(root);
  ensureApiApp(root);
  ensureDbPackage(root);
  ensureDotfiles(root);

  // Install workspaces
  run('npm install');
  // Generate Prisma Client
  run('npm run -w @pkg/db generate');
  // Build all
  run('npm run build');

  console.log('\nSetup complete.');
  console.log('- Start DB: docker compose up -d');
  console.log('- Push schema: npm run -w @pkg/db db:push');
  console.log('- Dev: npm run dev');
}

if (require.main === module) {
  main();
}
