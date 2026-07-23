/**
 * MODULE: Work Management Router
 *
 * Responsibility:
 * Aggregates all work-related routes into a single router, including projects,
 * tasks, dependencies, notes, assignees, comments, attachments, and time entries.
 *
 * Boundaries:
 * - Routing aggregation only.
 * - Endpoint implementations live in the ./work/ subdirectory.
 *
 * Critical invariants:
 * - All sub-routers are mounted at the root level of this router (prefixed by /v1/work
 *   in the main app).
 *
 * Side effects:
 * - Registers sub-routes for the work domain.
 *
 * Change risk:
 * - Low. Only affects route aggregation and discovery.
 *
 * Links:
 * - apps/api/src/routes/work/ (sub-routers)
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: api
 * - stability: stable
 * - concerns: routing, work-management
 *
 * File:
 * - apps/api/src/routes/work.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { OpenAPIHono } from '@hono/zod-openapi';

import batchOperationsRouter from './work/batch-operations.js';
import projectsRouter from './work/projects.js';
import taskAssigneesRouter from './work/task-assignees.js';
import taskAttachmentsRouter from './work/task-attachments.js';
import taskCommentsRouter from './work/task-comments.js';
import taskDependenciesRouter from './work/task-dependencies.js';
import taskNotesRouter from './work/task-notes.js';
import tasksRouter from './work/tasks.js';
import timeEntriesRouter from './work/time-entries.js';

const workRouter = new OpenAPIHono();

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
