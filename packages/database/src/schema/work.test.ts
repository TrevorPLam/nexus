/**
 * Tests for work schema table definitions.
 * Validates table names, column presence, and foreign key references for work management tables.
 */

import { describe, it, expect } from 'vitest';

import { projects, tasks, taskDependencies, taskNotes } from './work';

describe('Work Schema', () => {
  describe('projects table', () => {
    it('exports projects table definition', () => {
      expect(projects).toBeDefined();
    });

    it('has correct table name', () => {
      expect(projects).toHaveProperty('_');
      expect(projects._.name).toBe('projects');
    });

    it('has id column with primary key', () => {
      expect(projects.id).toBeDefined();
    });

    it('has workspaceId column with reference to workspaces', () => {
      expect(projects.workspaceId).toBeDefined();
    });

    it('has name column', () => {
      expect(projects.name).toBeDefined();
    });

    it('has status column', () => {
      expect(projects.status).toBeDefined();
    });

    it('has color column', () => {
      expect(projects.color).toBeDefined();
    });

    it('has icon column', () => {
      expect(projects.icon).toBeDefined();
    });
  });

  describe('tasks table', () => {
    it('exports tasks table definition', () => {
      expect(tasks).toBeDefined();
    });

    it('has correct table name', () => {
      expect(tasks).toHaveProperty('_');
      expect(tasks._.name).toBe('tasks');
    });

    it('has id column with primary key', () => {
      expect(tasks.id).toBeDefined();
    });

    it('has workspaceId column with reference to workspaces', () => {
      expect(tasks.workspaceId).toBeDefined();
    });

    it('has projectId column with reference to projects', () => {
      expect(tasks.projectId).toBeDefined();
    });

    it('has parentId column with self-reference to tasks', () => {
      expect(tasks.parentId).toBeDefined();
    });

    it('has title column', () => {
      expect(tasks.title).toBeDefined();
    });

    it('has status column', () => {
      expect(tasks.status).toBeDefined();
    });

    it('has priority column', () => {
      expect(tasks.priority).toBeDefined();
    });

    it('has dueDate column', () => {
      expect(tasks.dueDate).toBeDefined();
    });

    it('has dueTime column', () => {
      expect(tasks.dueTime).toBeDefined();
    });

    it('has estimatedDuration column', () => {
      expect(tasks.estimatedDuration).toBeDefined();
    });

    it('has completedAt column', () => {
      expect(tasks.completedAt).toBeDefined();
    });

    it('has calendarEventId column for linking to calendar events', () => {
      expect(tasks.calendarEventId).toBeDefined();
    });

    it('has recurrenceRule column', () => {
      expect(tasks.recurrenceRule).toBeDefined();
    });

    it('has energyLevel column', () => {
      expect(tasks.energyLevel).toBeDefined();
    });

    it('has contextTags column', () => {
      expect(tasks.contextTags).toBeDefined();
    });
  });

  describe('taskDependencies table', () => {
    it('exports taskDependencies table definition', () => {
      expect(taskDependencies).toBeDefined();
    });

    it('has correct table name', () => {
      expect(taskDependencies).toHaveProperty('_');
      expect(taskDependencies._.name).toBe('task_dependencies');
    });

    it('has id column with primary key', () => {
      expect(taskDependencies.id).toBeDefined();
    });

    it('has taskId column with reference to tasks', () => {
      expect(taskDependencies.taskId).toBeDefined();
    });

    it('has dependsOnTaskId column with reference to tasks', () => {
      expect(taskDependencies.dependsOnTaskId).toBeDefined();
    });

    it('has type column', () => {
      expect(taskDependencies.type).toBeDefined();
    });
  });

  describe('taskNotes table', () => {
    it('exports taskNotes table definition', () => {
      expect(taskNotes).toBeDefined();
    });

    it('has correct table name', () => {
      expect(taskNotes).toHaveProperty('_');
      expect(taskNotes._.name).toBe('task_notes');
    });

    it('has id column with primary key', () => {
      expect(taskNotes.id).toBeDefined();
    });

    it('has taskId column with reference to tasks', () => {
      expect(taskNotes.taskId).toBeDefined();
    });

    it('has content column', () => {
      expect(taskNotes.content).toBeDefined();
    });
  });
});
