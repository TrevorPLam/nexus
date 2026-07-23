/**
 * MODULE: API Entry Point
 *
 * Responsibility:
 * Entry point for the Life OS API. Configures global middleware (CORS, logging)
 * and mounts versioned domain routers for work, calendar, and integrations.
 *
 * Boundaries:
 * - Routing and middleware configuration only.
 * - Business logic is delegated to individual routers in ./routes/.
 * - Server lifecycle management is handled by the runtime adapter (server.ts).
 *
 * Critical invariants:
 * - All domain routes are versioned under /v1.
 * - Global middleware is applied to all incoming requests.
 *
 * Side effects:
 * - Registers global request handlers and state.
 *
 * Change risk:
 * - Medium. Changes affect the overall API surface area and global behavior.
 *
 * Links:
 * - apps/api/src/routes/ (domain routers)
 * - apps/api/src/lib/middleware.ts (global middleware)
 *
 * Tags:
 * - domain: api
 * - risk: medium
 * - layer: infrastructure
 * - stability: stable
 * - concerns: routing, middleware, hono
 *
 * File:
 * - apps/api/src/index.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import calendarRouter from './routes/calendar.js';
import integrationRouter from './routes/integration.js';
import workRouter from './routes/work.js';

const app = new OpenAPIHono();

app.use('*', cors());
app.use('*', logger());

app.get('/', (c) => {
  return c.json({ message: 'Life OS API', version: '0.0.1' });
});

app.get('/health', (c) => {
  return c.json({ status: 'healthy' });
});

// OpenAPI documentation
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Life OS API',
  },
});

app.get('/ui', swaggerUI({ url: '/doc' }));

app.route('/v1/work', workRouter);
app.route('/v1/calendar', calendarRouter);
app.route('/v1/integration', integrationRouter);

export default app;
