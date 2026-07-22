import { serve } from '@hono/node-server';

import app from './index.js';

const port = parseInt(process.env.PORT || '3000');

console.log(`Starting Life OS API on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Life OS API is running on http://localhost:${port}`);
