/**
 * MODULE: Work Management Operations
 *
 * Responsibility:
 * Orchestrates business logic for work management entities (projects, tasks, etc.).
 * This module now serves as a central export point for specialized operation modules
 * and provides shared utilities like transaction helpers.
 *
 * Boundaries:
 * - Sits between the API routers and the specialized operation modules.
 * - Provides shared utilities (withTransaction).
 * - Re-exports operations from specialized modules for backward compatibility.
 *
 * Critical invariants:
 * - Preconditions:
 *   - Caller must provide valid workspace membership for all workspace-scoped operations
 * - Postconditions:
 *   - All mutations emit audit log entries when context is provided
 *   - All mutations emit outbox events for downstream processing
 *
 * Side effects:
 * - Performs database writes (CRUD) via specialized modules.
 * - Emits audit logs to 'audit_logs' table.
 * - Emits outbox events to 'outbox_events' table for downstream sync/notifications.
 *
 * Change risk:
 * - Medium. This is now an export aggregation module with shared utilities.
 *
 * Context:
 * - Database Schema: @life-os/database
 *
 * Links:
 * - packages/database/src/schema/work.ts (persistence layer)
 * - packages/contracts/src/work.ts (domain schemas)
 * - apps/api/src/routes/work.ts (API routes)
 * - apps/api/src/lib/project-operations.ts (project operations)
 * - apps/api/src/lib/task-operations.ts (task operations)
 * - apps/api/src/lib/task-dependency-operations.ts (dependency operations)
 * - apps/api/src/lib/task-note-operations.ts (note operations)
 * - apps/api/src/lib/task-assignee-operations.ts (assignee operations)
 * - apps/api/src/lib/task-comment-operations.ts (comment operations)
 * - apps/api/src/lib/task-attachment-operations.ts (attachment operations)
 * - apps/api/src/lib/time-entry-operations.ts (time entry operations)
 * - apps/api/src/lib/batch-task-operations.ts (batch operations)
 * - apps/api/src/lib/complex-task-operations.ts (complex operations)
 * - apps/api/src/lib/integration-commands.ts (integration commands)
 *
 * Tags:
 * - domain: work-management
 * - risk: medium
 * - layer: business-logic
 * - stability: stable
 * - concerns: audit, outbox, transactions
 *
 * File:
 * - apps/api/src/lib/work-operations.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { db } from './db.js';

// Re-export from specialized modules for backward compatibility
export * from './project-operations.js';
export * from './task-operations.js';
export * from './task-dependency-operations.js';
export * from './task-note-operations.js';
export * from './task-assignee-operations.js';
export * from './task-comment-operations.js';
export * from './task-attachment-operations.js';
export * from './time-entry-operations.js';
export * from './batch-task-operations.js';
export * from './complex-task-operations.js';
export * from './integration-commands.js';

/**
 * Executes a callback within a database transaction.
 *
 * Purpose:
 * Provides a transaction wrapper for complex operations that require
 * atomicity across multiple database writes.
 *
 * Parameters:
 * - callback: Async function that receives a transaction object
 *   - Required, non-null
 *   - The transaction object (tx) should be used for all DB operations
 *
 * Returns:
 * The return value of the callback function.
 *
 * Errors:
 * - Throws if callback throws (transaction will be rolled back)
 * - Throws if database connection fails
 *
 * Side effects:
 * - Begins a database transaction
 * - Commits transaction if callback succeeds
 * - Rolls back transaction if callback throws
 *
 * Idempotency:
 * Depends on the callback. The wrapper itself is idempotent.
 *
 * Authorization:
 * No authorization checks performed here; caller must enforce.
 *
 * Preconditions:
 * - Database connection must be available
 *
 * Postconditions:
 * - All writes in callback are committed atomically if successful
 * - No writes persist if callback throws
 */
// Transaction wrapper for complex operations
export async function withTransaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
  return db.transaction(callback);
}
