import { db } from './db.js';
import { createAuditLog, createOutboxEvent } from './audit.js';
import { checkIdempotencyKey, createIdempotencyKey } from './idempotency.js';
import { Context } from 'hono';
import { appUsers } from '@life-os/database';
import { eq } from 'drizzle-orm';

/**
 * Command context that provides transaction, audit, outbox, and idempotency
 * This is a deep module that hides the complexity of atomic writes behind a simple interface
 */

export interface CommandContext {
  userId?: string;
  workspaceId?: string;
  idempotencyKey?: string;
  endpoint?: string;
}

export interface CommandResult<T> {
  data: T;
  isIdempotent?: boolean;
}

export interface AuditConfig {
  action: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown>;
}

export interface OutboxConfig {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

/**
 * Extract CommandContext from Hono context
 * This helper extracts user, workspace, and idempotency information from the Hono context
 * and converts it to a CommandContext suitable for command execution
 */
export async function extractCommandContext(c: Context): Promise<CommandContext> {
  const context: CommandContext = {};

  // Extract user information
  const user = c.get('user');
  if (user) {
    // Get the app_user record for the authenticated user
    const [appUser] = await db.select().from(appUsers).where(eq(appUsers.supabaseUserId, user.id));
    if (appUser) {
      context.userId = appUser.id;
    }
  }

  // Extract workspace information
  const workspaceMembership = c.get('workspaceMembership');
  if (workspaceMembership) {
    context.workspaceId = workspaceMembership.workspaceId;
  }

  // Extract idempotency key
  const idempotencyKey = c.req.header('Idempotency-Key');
  if (idempotencyKey) {
    context.idempotencyKey = idempotencyKey;
  }

  // Extract endpoint
  context.endpoint = c.req.path;

  return context;
}

/**
 * Execute a command within a transaction with automatic audit, outbox, and idempotency
 *
 * @param context - Command context with user, workspace, and idempotency info
 * @param command - The command function to execute within the transaction
 * @param auditConfig - Audit log configuration
 * @param outboxConfig - Outbox event configuration
 * @returns Command result with data and idempotency flag
 */
export async function executeCommand<T>(
  context: CommandContext,
  command: (tx: any) => Promise<T>,
  auditConfig?: AuditConfig,
  outboxConfig?: OutboxConfig,
): Promise<CommandResult<T>> {
  const { userId, workspaceId, idempotencyKey, endpoint } = context;

  // Check idempotency if key provided
  if (idempotencyKey && userId && endpoint) {
    const idempotencyCheck = await checkIdempotencyKey(idempotencyKey, userId, endpoint);
    if (idempotencyCheck.isDuplicate) {
      return {
        data: idempotencyCheck.responseBody as T,
        isIdempotent: true,
      };
    }
  }

  // Execute command within transaction
  return db.transaction(async (tx) => {
    // Execute the command
    const result = await command(tx);

    // Create audit log if configured
    if (auditConfig && userId && workspaceId) {
      await createAuditLog({
        userId,
        workspaceId,
        action: auditConfig.action,
        entityType: auditConfig.entityType,
        entityId: auditConfig.entityId,
        changes: auditConfig.changes || {},
      });
    }

    // Create outbox event if configured
    if (outboxConfig) {
      await createOutboxEvent({
        eventType: outboxConfig.eventType,
        aggregateType: outboxConfig.aggregateType,
        aggregateId: outboxConfig.aggregateId,
        payload: outboxConfig.payload,
      });
    }

    // Store idempotency key if provided
    if (idempotencyKey && userId && endpoint) {
      await createIdempotencyKey({
        key: idempotencyKey,
        userId,
        endpoint,
        responseStatus: '200',
        responseBody: result as Record<string, unknown>,
      });
    }

    return {
      data: result,
    };
  });
}

/**
 * Execute a command without idempotency (for internal operations)
 */
export async function executeCommandWithoutIdempotency<T>(
  context: Omit<CommandContext, 'idempotencyKey' | 'endpoint'>,
  command: (tx: any) => Promise<T>,
  auditConfig?: AuditConfig,
  outboxConfig?: OutboxConfig,
): Promise<T> {
  return db.transaction(async (tx) => {
    // Execute the command
    const result = await command(tx);

    // Create audit log if configured
    if (auditConfig && context.userId && context.workspaceId) {
      await createAuditLog({
        userId: context.userId,
        workspaceId: context.workspaceId,
        action: auditConfig.action,
        entityType: auditConfig.entityType,
        entityId: auditConfig.entityId,
        changes: auditConfig.changes || {},
      });
    }

    // Create outbox event if configured
    if (outboxConfig) {
      await createOutboxEvent({
        eventType: outboxConfig.eventType,
        aggregateType: outboxConfig.aggregateType,
        aggregateId: outboxConfig.aggregateId,
        payload: outboxConfig.payload,
      });
    }

    return result;
  });
}
