/**
 * MODULE: Command Queue
 *
 * Responsibility:
 * Manages offline command queue for mobile mutations with retry logic.
 *
 * Boundaries:
 * - Stores commands in PowerSync SQLite for offline durability.
 * - Processes commands when network is available.
 * - Implements exponential backoff for failed commands.
 *
 * Critical invariants:
 * - Commands must be idempotent.
 * - Failed commands are retried with exponential backoff.
 * - Commands are processed in FIFO order.
 *
 * Side effects:
 * - Writes to PowerSync database.
 * - Makes HTTP requests to API when processing.
 *
 * Change risk:
 * - High. Data consistency and offline sync integrity.
 *
 * Tags:
 * - domain: command-queue
 * - risk: high
 * - layer: infrastructure
 * - stability: experimental
 */

import { apiClient } from '@life-os/api-client';
import type { PowerSyncDatabase } from '@powersync/react-native';

export type CommandType = 'create_project' | 'create_task' | 'update_task' | 'delete_task';

export interface Command {
  id: string;
  type: CommandType;
  payload: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Base delay for exponential backoff

/**
 * Enqueue a command for offline processing
 */
export async function enqueueCommand(
  db: PowerSyncDatabase,
  type: CommandType,
  payload: Record<string, unknown>,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO command_queue (id, type, payload, status, retry_count, error_message, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, type, JSON.stringify(payload), 'pending', 0, null, now, now],
  );

  return id;
}

/**
 * Process pending commands from the queue
 */
export async function processCommands(db: PowerSyncDatabase): Promise<void> {
  const pendingCommands = await db.getAll(
    `SELECT * FROM command_queue WHERE status = 'pending' OR status = 'failed' ORDER BY created_at ASC`,
  );

  for (const command of pendingCommands as Command[]) {
    if (command.retry_count >= MAX_RETRIES) {
      // Skip commands that have exceeded max retries
      continue;
    }

    try {
      // Mark as processing
      const now = new Date().toISOString();
      await db.execute(
        `UPDATE command_queue SET status = 'processing', updated_at = ? WHERE id = ?`,
        [now, command.id],
      );

      const payload = JSON.parse(command.payload);

      // Execute command based on type
      switch (command.type) {
        case 'create_project':
          await apiClient.createProject(payload);
          break;
        case 'create_task':
          await apiClient.createTask(payload);
          break;
        case 'update_task':
          await apiClient.updateTask(payload.taskId, payload);
          break;
        case 'delete_task':
          await apiClient.deleteTask(payload.taskId);
          break;
        default:
          throw new Error(`Unknown command type: ${command.type}`);
      }

      // Mark as completed
      const completedAt = new Date().toISOString();
      await db.execute(
        `UPDATE command_queue SET status = 'completed', updated_at = ? WHERE id = ?`,
        [completedAt, command.id],
      );
    } catch (error) {
      // Mark as failed with retry count increment
      const failedAt = new Date().toISOString();
      const newRetryCount = command.retry_count + 1;
      await db.execute(
        `UPDATE command_queue SET status = 'failed', retry_count = ?, error_message = ?, updated_at = ? WHERE id = ?`,
        [newRetryCount, (error as Error).message, failedAt, command.id],
      );

      // Implement exponential backoff before next retry
      if (newRetryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, newRetryCount);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

/**
 * Get count of pending commands
 */
export async function getPendingCommandCount(db: PowerSyncDatabase): Promise<number> {
  const result = await db.get(
    `SELECT COUNT(*) as count FROM command_queue WHERE status = 'pending' OR status = 'failed'`,
  );
  return result?.count || 0;
}
