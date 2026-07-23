import { Hono } from 'hono';

import batchOperationsRouter from './work/batch-operations.js';
import projectsRouter from './work/projects.js';
import taskAssigneesRouter from './work/task-assignees.js';
import taskAttachmentsRouter from './work/task-attachments.js';
import taskCommentsRouter from './work/task-comments.js';
import taskDependenciesRouter from './work/task-dependencies.js';
import taskNotesRouter from './work/task-notes.js';
import tasksRouter from './work/tasks.js';
import timeEntriesRouter from './work/time-entries.js';

const workRouter = new Hono();

// Mount all work route modules
workRouter.route('/', projectsRouter);
workRouter.route('/', tasksRouter);
workRouter.route('/', taskDependenciesRouter);
workRouter.route('/', taskNotesRouter);
workRouter.route('/', batchOperationsRouter);
workRouter.route('/', taskAssigneesRouter);
workRouter.route('/', taskAttachmentsRouter);
workRouter.route('/', taskCommentsRouter);
workRouter.route('/', timeEntriesRouter);

export default workRouter;
