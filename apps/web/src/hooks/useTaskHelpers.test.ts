import { describe, it, expect } from 'vitest';

import { getPriorityColor, getTimelineDays, getTaskPosition } from './useTaskHelpers';

describe('useTaskHelpers', () => {
  describe('getPriorityColor', () => {
    it('returns correct color for each priority level', () => {
      expect(getPriorityColor('urgent')).toBe('#ef4444');
      expect(getPriorityColor('high')).toBe('#f59e0b');
      expect(getPriorityColor('medium')).toBe('#3b82f6');
      expect(getPriorityColor('low')).toBe('#10b981');
    });

    it('returns gray for unknown priority', () => {
      expect(getPriorityColor('unknown')).toBe('#6b7280');
      expect(getPriorityColor('')).toBe('#6b7280');
    });
  });

  describe('getTimelineDays', () => {
    it('returns 14 days starting from Sunday', () => {
      const date = new Date('2024-01-10'); // Wednesday
      const days = getTimelineDays(date);

      expect(days).toHaveLength(14);
      expect(days[0].getDay()).toBe(0); // Sunday
      expect(days[13].getDay()).toBe(6); // Saturday
    });
  });

  describe('getTaskPosition', () => {
    it('returns null for task without due date', () => {
      const task = {
        id: '1',
        title: 'Task 1',
        status: 'todo',
        priority: 'high',
        dueDate: null,
        projectId: 'proj-1',
        parentId: null,
      };
      const timelineDays = getTimelineDays(new Date('2024-01-10'));

      const position = getTaskPosition(task, timelineDays);
      expect(position).toBeNull();
    });

    it('returns null for task outside timeline range', () => {
      const task = {
        id: '1',
        title: 'Task 1',
        status: 'todo',
        priority: 'high',
        dueDate: '2024-01-01',
        projectId: 'proj-1',
        parentId: null,
      };
      const timelineDays = getTimelineDays(new Date('2024-01-10'));

      const position = getTaskPosition(task, timelineDays);
      expect(position).toBeNull();
    });

    it('calculates correct position and width', () => {
      const task = {
        id: '1',
        title: 'Task 1',
        status: 'todo',
        priority: 'high',
        dueDate: '2024-01-10',
        projectId: 'proj-1',
        parentId: null,
        estimatedDuration: 60,
      };
      const timelineDays = getTimelineDays(new Date('2024-01-10'));

      const position = getTaskPosition(task, timelineDays);
      expect(position).not.toBeNull();
      expect(position?.left).toBe(200); // Day 2 in timeline, 2 * 100 = 200
      expect(position?.width).toBeGreaterThan(0);
    });
  });
});
