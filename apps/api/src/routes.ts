import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Stripe from 'stripe';
import { env } from './env';

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' }) : null;

export async function registerRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ status: 'ok' }));

  // Tenants stub
  app.get('/tenants', async () => ({ items: [] }));

  // Products stub
  app.get('/products', async () => ({ items: [] }));

  // Cart calculate stub
  app.post('/cart/calculate', async (request) => {
    const Body = z.object({ items: z.array(z.object({ sku: z.string(), qty: z.number().int().positive() })) });
    const body = Body.parse(request.body);
    return { items: body.items, totalCents: 0, currency: 'USD' };
  });

  // Stripe checkout session
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

  // Stripe webhook stub
  app.post('/webhooks/stripe', async (request) => {
    return { received: true };
  });
}