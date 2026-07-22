import { describe, it, expect } from 'vitest';

import { powersyncSchema } from './index';

describe('Mobile Data Package', () => {
  describe('Barrel Exports', () => {
    it('exports powersyncSchema from index', () => {
      expect(powersyncSchema).toBeDefined();
    });
  });

  describe('Schema Validation', () => {
    it('powersyncSchema includes all required tables', () => {
      const requiredTables = [
        'app_users',
        'workspaces',
        'workspace_memberships',
        'projects',
        'tasks',
        'calendars',
        'events',
      ];

      requiredTables.forEach((table) => {
        expect(powersyncSchema).toHaveProperty(table);
      });
    });

    it('tasks table has all required fields for offline sync', () => {
      const tasks = powersyncSchema.tasks;
      const requiredFields = [
        'id',
        'workspace_id',
        'project_id',
        'title',
        'status',
        'priority',
        'due_date',
        'calendar_event_id',
      ];

      requiredFields.forEach((field) => {
        expect(tasks).toHaveProperty(field);
      });
    });

    it('events table has all required fields for offline sync', () => {
      const events = powersyncSchema.events;
      const requiredFields = [
        'id',
        'workspace_id',
        'calendar_id',
        'title',
        'start',
        'end',
        'timezone',
        'task_id',
      ];

      requiredFields.forEach((field) => {
        expect(events).toHaveProperty(field);
      });
    });
  });
});
