import { describe, it, expect } from 'vitest';

import {
  appUsers,
  workspaces,
  workspaceMemberships,
  outboxEvents,
  auditLogs,
  idempotencyKeys,
} from './core';

describe('Core Schema', () => {
  describe('appUsers table', () => {
    it('exports appUsers table definition', () => {
      expect(appUsers).toBeDefined();
    });

    it('has correct table name', () => {
      expect(appUsers).toHaveProperty('_');
      expect(appUsers._.name).toBe('app_users');
    });

    it('has id column with primary key', () => {
      expect(appUsers.id).toBeDefined();
    });

    it('has supabaseUserId column with unique constraint', () => {
      expect(appUsers.supabaseUserId).toBeDefined();
    });

    it('has email column', () => {
      expect(appUsers.email).toBeDefined();
    });
  });

  describe('workspaces table', () => {
    it('exports workspaces table definition', () => {
      expect(workspaces).toBeDefined();
    });

    it('has correct table name', () => {
      expect(workspaces).toHaveProperty('_');
      expect(workspaces._.name).toBe('workspaces');
    });

    it('has id column with primary key', () => {
      expect(workspaces.id).toBeDefined();
    });

    it('has ownerId column with reference to appUsers', () => {
      expect(workspaces.ownerId).toBeDefined();
    });

    it('has name column', () => {
      expect(workspaces.name).toBeDefined();
    });
  });

  describe('workspaceMemberships table', () => {
    it('exports workspaceMemberships table definition', () => {
      expect(workspaceMemberships).toBeDefined();
    });

    it('has correct table name', () => {
      expect(workspaceMemberships).toHaveProperty('_');
      expect(workspaceMemberships._.name).toBe('workspace_memberships');
    });

    it('has id column with primary key', () => {
      expect(workspaceMemberships.id).toBeDefined();
    });

    it('has workspaceId column with reference to workspaces', () => {
      expect(workspaceMemberships.workspaceId).toBeDefined();
    });

    it('has userId column with reference to appUsers', () => {
      expect(workspaceMemberships.userId).toBeDefined();
    });

    it('has role column', () => {
      expect(workspaceMemberships.role).toBeDefined();
    });
  });

  describe('outboxEvents table', () => {
    it('exports outboxEvents table definition', () => {
      expect(outboxEvents).toBeDefined();
    });

    it('has correct table name', () => {
      expect(outboxEvents).toHaveProperty('_');
      expect(outboxEvents._.name).toBe('outbox_events');
    });

    it('has id column with primary key', () => {
      expect(outboxEvents.id).toBeDefined();
    });

    it('has eventType column', () => {
      expect(outboxEvents.eventType).toBeDefined();
    });

    it('has aggregateType column', () => {
      expect(outboxEvents.aggregateType).toBeDefined();
    });

    it('has aggregateId column', () => {
      expect(outboxEvents.aggregateId).toBeDefined();
    });

    it('has payload column', () => {
      expect(outboxEvents.payload).toBeDefined();
    });

    it('has processedAt column', () => {
      expect(outboxEvents.processedAt).toBeDefined();
    });
  });

  describe('auditLogs table', () => {
    it('exports auditLogs table definition', () => {
      expect(auditLogs).toBeDefined();
    });

    it('has correct table name', () => {
      expect(auditLogs).toHaveProperty('_');
      expect(auditLogs._.name).toBe('audit_logs');
    });

    it('has id column with primary key', () => {
      expect(auditLogs.id).toBeDefined();
    });

    it('has action column', () => {
      expect(auditLogs.action).toBeDefined();
    });

    it('has entityType column', () => {
      expect(auditLogs.entityType).toBeDefined();
    });

    it('has entityId column', () => {
      expect(auditLogs.entityId).toBeDefined();
    });

    it('has changes column', () => {
      expect(auditLogs.changes).toBeDefined();
    });

    it('has ipAddress column', () => {
      expect(auditLogs.ipAddress).toBeDefined();
    });

    it('has userAgent column', () => {
      expect(auditLogs.userAgent).toBeDefined();
    });
  });

  describe('idempotencyKeys table', () => {
    it('exports idempotencyKeys table definition', () => {
      expect(idempotencyKeys).toBeDefined();
    });

    it('has correct table name', () => {
      expect(idempotencyKeys).toHaveProperty('_');
      expect(idempotencyKeys._.name).toBe('idempotency_keys');
    });

    it('has id column with primary key', () => {
      expect(idempotencyKeys.id).toBeDefined();
    });

    it('has key column with unique constraint', () => {
      expect(idempotencyKeys.key).toBeDefined();
    });

    it('has endpoint column', () => {
      expect(idempotencyKeys.endpoint).toBeDefined();
    });

    it('has responseStatus column', () => {
      expect(idempotencyKeys.responseStatus).toBeDefined();
    });

    it('has responseBody column', () => {
      expect(idempotencyKeys.responseBody).toBeDefined();
    });

    it('has expiresAt column', () => {
      expect(idempotencyKeys.expiresAt).toBeDefined();
    });
  });
});
