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
    // Warehouses
    app.get('/warehouses', async (request) => {
        const Query = z.object({ tenantId: z.string() });
        const { tenantId } = Query.parse(request.query);
        const items = await prisma.warehouse.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
        return { items };
    });
    app.post('/warehouses', async (request) => {
        const Body = z.object({ tenantId: z.string(), name: z.string(), location: z.string().optional() });
        const data = Body.parse(request.body);
        const created = await prisma.warehouse.create({ data });
        return created;
    });
    // Inventory
    app.get('/inventory', async (request) => {
        const Query = z.object({ tenantId: z.string(), productId: z.string().optional() });
        const { tenantId, productId } = Query.parse(request.query);
        const items = await prisma.inventory.findMany({ where: { tenantId, ...(productId ? { productId } : {}) }, include: { product: true, warehouse: true } });
        return { items };
    });
    app.post('/inventory', async (request, reply) => {
        const Body = z.object({ tenantId: z.string(), productId: z.string(), warehouseId: z.string(), qtyOnHand: z.number().int() });
        const data = Body.parse(request.body);
        try {
            const inv = await prisma.inventory.upsert({
                where: { productId_warehouseId: { productId: data.productId, warehouseId: data.warehouseId } },
                create: { ...data, qtyReserved: 0 },
                update: { qtyOnHand: data.qtyOnHand },
            });
            return inv;
        }
        catch (e) {
            return reply.code(400).send({ error: 'inventory_upsert_failed' });
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
    // Cart
    app.post('/cart', async (request) => {
        const Body = z.object({ tenantId: z.string(), userId: z.string().optional() });
        const data = Body.parse(request.body);
        const cart = await prisma.cart.create({ data: { tenantId: data.tenantId, userId: data.userId, currency: 'USD' } });
        return cart;
    });
    app.get('/cart/:id', async (request) => {
        const Params = z.object({ id: z.string() });
        const { id } = Params.parse(request.params);
        const cart = await prisma.cart.findUnique({ where: { id }, include: { items: true } });
        return cart ?? {};
    });
    app.post('/cart/:id/items', async (request, reply) => {
        const Params = z.object({ id: z.string() });
        const Body = z.object({ productId: z.string(), qty: z.number().int().positive() });
        const { id } = Params.parse(request.params);
        const body = Body.parse(request.body);
        const product = await prisma.product.findUnique({ where: { id: body.productId } });
        if (!product)
            return reply.code(404).send({ error: 'product_not_found' });
        const item = await prisma.cartItem.create({
            data: {
                cartId: id,
                productId: product.id,
                sku: product.sku,
                qty: body.qty,
                priceCents: product.priceCents,
                currency: product.currency,
            },
        });
        return item;
    });
    app.post('/cart/calculate', async (request) => {
        const Body = z.object({ items: z.array(z.object({ sku: z.string(), qty: z.number().int().positive() })) });
        const body = Body.parse(request.body);
        return { items: body.items, totalCents: 0, currency: 'USD' };
    });
    // Checkout -> Order (Stripe intent)
    app.post('/checkout/stripe', async (request, reply) => {
        if (!stripe)
            return reply.code(400).send({ error: 'Stripe not configured' });
        const Body = z.object({
            success_url: z.string().url(),
            cancel_url: z.string().url(),
            cartId: z.string(),
        });
        const { success_url, cancel_url, cartId } = Body.parse(request.body);
        const cart = await prisma.cart.findUnique({ where: { id: cartId }, include: { items: true } });
        if (!cart)
            return reply.code(404).send({ error: 'cart_not_found' });
        const line_items = cart.items.map((ci) => ({
            price_data: { currency: ci.currency, product_data: { name: ci.sku }, unit_amount: ci.priceCents },
            quantity: ci.qty,
        }));
        const session = await stripe.checkout.sessions.create({ mode: 'payment', success_url, cancel_url, line_items: line_items });
        return { id: session.id, url: session.url };
    });
    // Orders
    app.get('/orders', async (request) => {
        const Query = z.object({ tenantId: z.string() });
        const { tenantId } = Query.parse(request.query);
        const items = await prisma.order.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
        return { items };
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
