/**
 * MODULE: Idempotency Management
 *
 * Responsibility:
 * Provides functions for checking and creating idempotency keys to ensure
 * safe retry of mutation operations without duplicate side effects.
 *
 * Boundaries:
 * - Low-level persistence helper for idempotency table.
 * - Used by middleware.ts to intercept and cache responses.
 *
 * Critical invariants:
 * - Idempotency keys are scoped to (key, userId, endpoint) tuples.
 * - Keys expire after 48 hours to prevent unbounded table growth.
 * - Duplicate requests return the cached response without re-executing.
 *
 * Side effects:
 * - Inserts records into 'idempotency_keys' table.
 *
 * Change risk:
 * - Medium. Faulty idempotency logic could permit duplicate mutations
 *   or prevent legitimate retries.
 *
 * Links:
 * - packages/database/src/schema/core.ts (idempotency_keys table)
 * - apps/api/src/lib/middleware.ts (idempotencyMiddleware usage)
 *
 * Tags:
 * - domain: reliability
 * - risk: medium
 * - layer: infrastructure
 * - stability: stable
 * - concerns: idempotency, persistence
 *
 * File:
 * - apps/api/src/lib/idempotency.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { idempotencyKeys } from '@life-os/database';
import { eq, and, gt } from 'drizzle-orm';

import { db } from './db.js';

const IDEMPOTENCY_KEY_EXPIRY_HOURS = 48;

export async function checkIdempotencyKey(key: string, userId: string, endpoint: string) {
  const existing = await db
    .select()
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, key),
        eq(idempotencyKeys.userId, userId),
        eq(idempotencyKeys.endpoint, endpoint),
        gt(idempotencyKeys.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return {
      isDuplicate: true,
      responseStatus: existing[0].responseStatus,
      responseBody: existing[0].responseBody,
    };
  }

  return { isDuplicate: false };
}

export async function createIdempotencyKey(data: {
  key: string;
  userId: string;
  endpoint: string;
  responseStatus: string;
  responseBody: Record<string, unknown>;
}) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + IDEMPOTENCY_KEY_EXPIRY_HOURS);

  const [record] = await db
    .insert(idempotencyKeys)
    .values({
      ...data,
      expiresAt,
    })
    .returning();

  return record;
}
