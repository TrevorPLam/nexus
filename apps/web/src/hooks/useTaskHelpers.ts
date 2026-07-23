/**
 * MODULE: Task UI Helper Utilities
 *
 * Responsibility:
 * Provides pure utility functions for task UI rendering: priority color mapping,
 * timeline day generation, and task position calculation for timeline layout.
 *
 * Boundaries:
 * - Pure functions only; no API calls, state, or side effects.
 *
 * Change risk:
 * - Low. Display logic only.
 *
 * Links:
 * - apps/web/src/app/work/components/TimelineView.tsx
 * - apps/web/src/app/work/components/KanbanView.tsx
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: ui-helpers, timeline, priority-colors
 *
 * File:
 * - apps/web/src/hooks/useTaskHelpers.ts
 *
 * Last updated:
 * - July 23, 2026
 */

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string | null;
  parentId: string | null;
  description?: string | null;
  energyLevel?: string | null;
  estimatedDuration?: number | null;
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent':
      return '#ef4444';
    case 'high':
      return '#f59e0b';
    case 'medium':
      return '#3b82f6';
    case 'low':
      return '#10b981';
    default:
      return '#6b7280';
  }
}

export function getTimelineDays(date: Date) {
  const days = [];
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());

  for (let i = 0; i < 14; i++) {
    // 2-week view
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }
  return days;
}

export function getTaskPosition(task: Task, timelineDays: Date[]) {
  if (!task.dueDate) return null;

  const taskDate = new Date(task.dueDate);
  const startDate = timelineDays[0];
  const endDate = timelineDays[timelineDays.length - 1];

  if (taskDate < startDate || taskDate > endDate) return null;

  const dayIndex = timelineDays.findIndex((day) => day.toDateString() === taskDate.toDateString());

  if (dayIndex === -1) return null;

  const duration = task.estimatedDuration || 60; // Default 60 minutes
  const dayWidth = 100; // pixels per day
  const minutesPerPixel = 1440 / dayWidth; // 1440 minutes in a day
  const width = Math.max(duration / minutesPerPixel, 20); // Minimum 20px width

  return {
    left: dayIndex * dayWidth,
    width,
  };
}
