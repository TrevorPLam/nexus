/**
 * MODULE: Audit & Outbox
 *
 * Responsibility:
 * Provides functions for recording audit logs (user actions) and outbox events
 * (transactional side effects).
 *
 * Boundaries:
 * - Low-level persistence helper.
 * - Should be used within the same transaction as the domain change it describes.
 *
 * Critical invariants:
 * - createAuditLog records the 'what' and 'who' of a change for compliance/history.
 * - createOutboxEvent records a pending side effect (e.g., sync, notification)
 *   that must be processed reliably by a background worker.
 *
 * Side effects:
 * - Inserts records into 'audit_logs' and 'outbox_events' tables.
 *
 * Change risk:
 * - Medium. Faulty audit logging breaks history; faulty outbox breaks reliable side effects.
 *
 * Links:
 * - packages/database/src/schema/core.ts (audit_logs, outbox_events tables)
 * - apps/api/src/lib/command-context.ts (usage in executeCommand)
 *
 * Tags:
 * - domain: audit
 * - risk: medium
 * - layer: infrastructure
 * - stability: stable
 * - concerns: audit-logging, outbox, reliability
 *
 * File:
 * - apps/api/src/lib/audit.ts
 *
 * Last updated:
 * - July 22, 2026
 */

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
