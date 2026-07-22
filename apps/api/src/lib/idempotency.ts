import { eq, and, gt } from 'drizzle-orm';
import { db } from './db';
import { idempotencyKeys } from '@life-os/database';

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
        gt(idempotencyKeys.expiresAt, new Date())
      )
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
