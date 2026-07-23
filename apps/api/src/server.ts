/**
 * MODULE: API Server Bootstrap
 *
 * Responsibility:
 * Starts the Hono API on the configured port using @hono/node-server. This is
 * the runtime entry point for the Life OS API service.
 *
 * Boundaries:
 * - Server initialization only. Routing and middleware are defined in index.ts.
 * - Does not handle graceful shutdown or process management by default.
 *
 * Critical invariants:
 * - PORT must be a positive integer; defaults to 3000 if not set.
 * - The app exported from ./index.ts must be mounted before serving.
 *
 * Side effects:
 * - Binds an HTTP server to a TCP port and begins accepting requests.
 * - Writes startup messages to stdout.
 *
 * Change risk:
 * - High. Misconfiguration here prevents the API from starting or binds it to the wrong port.
 *
 * Links:
 * - apps/api/src/index.ts
 * - apps/api/package.json
 *
 * Tags:
 * - domain: api
 * - risk: high
 * - layer: infrastructure
 * - stability: stable
 * - concerns: server, bootstrap, hono
 *
 * File:
 * - apps/api/src/server.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { serve } from '@hono/node-server';

import app from './index.js';

const port = parseInt(process.env.PORT || '3000');

console.log(`Starting Life OS API on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Life OS API is running on http://localhost:${port}`);
