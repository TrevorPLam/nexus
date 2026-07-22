import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import calendarRouter from './routes/calendar.js';
import integrationRouter from './routes/integration.js';
import workRouter from './routes/work.js';

const app = new Hono();

app.use('*', cors());
app.use('*', logger());

app.get('/', (c) => {
  return c.json({ message: 'Life OS API', version: '0.0.1' });
});

app.get('/health', (c) => {
  return c.json({ status: 'healthy' });
});

app.route('/v1/work', workRouter);
app.route('/v1/calendar', calendarRouter);
app.route('/v1/integration', integrationRouter);

export default app;
