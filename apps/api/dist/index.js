import Fastify from 'fastify';
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
    .then(() => {
    app.log.info(`api listening on ${port}`);
})
    .catch((err) => {
    app.log.error(err);
    process.exit(1);
});
