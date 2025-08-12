import { z } from 'zod';
import Stripe from 'stripe';
import { env } from './env';
import { getPrismaClient } from '@pkg/db';
const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' }) : null;
export async function registerRoutes(app) {
    const prisma = getPrismaClient();
    app.get('/health', async () => ({ status: 'ok' }));
    // Tenants
    app.get('/tenants', async () => {
        try {
            const tenants = await prisma.tenant.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
            return { items: tenants };
        }
        catch {
            return { items: [] };
        }
    });
    app.post('/tenants', async (request, reply) => {
        const Body = z.object({ name: z.string().min(2), domain: z.string().min(3) });
        const data = Body.parse(request.body);
        try {
            const created = await prisma.tenant.create({ data });
            return created;
        }
        catch (e) {
            return reply.code(400).send({ error: 'tenant_create_failed' });
        }
    });
    // Products
    app.get('/products', async (request) => {
        const Query = z.object({ tenantId: z.string().optional() });
        const { tenantId } = Query.parse(request.query);
        try {
            const products = await prisma.product.findMany({
                where: tenantId ? { tenantId } : undefined,
                take: 50,
                orderBy: { createdAt: 'desc' },
            });
            return { items: products };
        }
        catch {
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
        }
        catch (e) {
            return reply.code(400).send({ error: 'product_create_failed' });
        }
    });
    // Cart calculate stub
    app.post('/cart/calculate', async (request) => {
        const Body = z.object({ items: z.array(z.object({ sku: z.string(), qty: z.number().int().positive() })) });
        const body = Body.parse(request.body);
        return { items: body.items, totalCents: 0, currency: 'USD' };
    });
    // Stripe checkout session
    app.post('/checkout/stripe', async (request, reply) => {
        if (!stripe)
            return reply.code(400).send({ error: 'Stripe not configured' });
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
            line_items: body.line_items
        });
        return { id: session.id, url: session.url };
    });
    // bKash create payment (stub)
    app.post('/checkout/bkash', async () => {
        return { status: 'not_configured' };
    });
    // Stripe webhook stub
    app.post('/webhooks/stripe', async () => {
        return { received: true };
    });
    // Messaging stubs
    app.post('/messages/whatsapp', async (request) => {
        const Body = z.object({ to: z.string(), message: z.string() });
        const body = Body.parse(request.body);
        return { sent: true, channel: 'whatsapp', to: body.to };
    });
    app.post('/messages/discord', async (request) => {
        const Body = z.object({ channelId: z.string().optional(), message: z.string() });
        const body = Body.parse(request.body);
        return { sent: true, channel: 'discord' };
    });
    // Notification stub
    app.post('/notify', async (request) => {
        const Body = z.object({ userId: z.string(), type: z.string(), payload: z.any() });
        const body = Body.parse(request.body);
        return { accepted: true };
    });
}
