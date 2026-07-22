import { auditLogs, outboxEvents } from '@life-os/database';
import { eq } from 'drizzle-orm';

import { db } from './db.js';

export async function createAuditLog(data: {
  userId?: string;
  workspaceId?: string;
  action: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  const [log] = await db.insert(auditLogs).values(data).returning();
  return log;
}

export async function createOutboxEvent(data: {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const [event] = await db.insert(outboxEvents).values(data).returning();
  return event;
}

export async function markOutboxEventProcessed(eventId: string) {
  const [event] = await db
    .update(outboxEvents)
    .set({ processedAt: new Date() })
    .where(eq(outboxEvents.id, eventId))
    .returning();
  return event;
}
