/**
 * Tests for PowerSync schema definition.
 * Validates table presence and required field names for offline sync.
 */

import { describe, it, expect } from 'vitest';

import { powersyncSchema } from './schema';

describe('Mobile Data Schema', () => {
  describe('PowerSync Schema', () => {
    it('exports powersyncSchema', () => {
      expect(powersyncSchema).toBeDefined();
    });

    it('includes app_users table', () => {
      expect(powersyncSchema).toHaveProperty('app_users');
    });

    it('includes workspaces table', () => {
      expect(powersyncSchema).toHaveProperty('workspaces');
    });

    it('includes workspace_memberships table', () => {
      expect(powersyncSchema).toHaveProperty('workspace_memberships');
    });

    it('includes projects table', () => {
      expect(powersyncSchema).toHaveProperty('projects');
    });

    it('includes tasks table', () => {
      expect(powersyncSchema).toHaveProperty('tasks');
    });

    it('includes calendars table', () => {
      expect(powersyncSchema).toHaveProperty('calendars');
    });

    it('includes events table', () => {
      expect(powersyncSchema).toHaveProperty('events');
    });

    it('app_users has required fields', () => {
      const appUsers = powersyncSchema.app_users;
      expect(appUsers).toHaveProperty('id');
      expect(appUsers).toHaveProperty('supabase_user_id');
      expect(appUsers).toHaveProperty('email');
      expect(appUsers).toHaveProperty('full_name');
    });

    it('tasks has required fields', () => {
      const tasks = powersyncSchema.tasks;
      expect(tasks).toHaveProperty('id');
      expect(tasks).toHaveProperty('title');
      expect(tasks).toHaveProperty('status');
      expect(tasks).toHaveProperty('priority');
      expect(tasks).toHaveProperty('due_date');
    });

    it('events has required fields', () => {
      const events = powersyncSchema.events;
      expect(events).toHaveProperty('id');
      expect(events).toHaveProperty('title');
      expect(events).toHaveProperty('start');
      expect(events).toHaveProperty('end');
      expect(events).toHaveProperty('timezone');
    });
  });
});
