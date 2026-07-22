import { Hono } from 'hono';

import batchOperationsRouter from './work/batch-operations.js';
import projectsRouter from './work/projects.js';
import taskDependenciesRouter from './work/task-dependencies.js';
import taskNotesRouter from './work/task-notes.js';
import tasksRouter from './work/tasks.js';

const workRouter = new Hono();

// Mount all work route modules
workRouter.route('/', projectsRouter);
workRouter.route('/', tasksRouter);
workRouter.route('/', taskDependenciesRouter);
workRouter.route('/', taskNotesRouter);
workRouter.route('/', batchOperationsRouter);

export default workRouter;
