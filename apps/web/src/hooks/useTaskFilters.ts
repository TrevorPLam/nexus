/**
 * MODULE: Task Filtering Hook
 *
 * Responsibility:
 * Provides pure filtering functions for task lists by status, project, and
 * priority, plus a timeline-specific filter for tasks with due dates.
 *
 * Boundaries:
 * - Pure logic only; no API calls or side effects.
 * - Operates on already-fetched task arrays.
 *
 * Change risk:
 * - Low. Filtering logic only; no data mutation.
 *
 * Links:
 * - apps/web/src/app/work/components/KanbanView.tsx
 * - apps/web/src/app/work/components/ListView.tsx
 * - apps/web/src/app/work/components/TimelineView.tsx
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: filtering, tasks
 *
 * File:
 * - apps/web/src/hooks/useTaskFilters.ts
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

export function useTaskFilters(
  tasks: Task[],
  selectedProject: string | null,
  filterPriority: string | null,
) {
  const getTasksByStatus = (status: string) => {
    let filtered = tasks.filter((task) => task.status === status);

    if (selectedProject) {
      filtered = filtered.filter((task) => task.projectId === selectedProject);
    }

    if (filterPriority) {
      filtered = filtered.filter((task) => task.priority === filterPriority);
    }

    return filtered;
  };

  const getTasksForTimeline = () => {
    let filtered = tasks.filter((task) => task.dueDate);

    if (selectedProject) {
      filtered = filtered.filter((task) => task.projectId === selectedProject);
    }

    if (filterPriority) {
      filtered = filtered.filter((task) => task.priority === filterPriority);
    }

    return filtered;
  };

  return { getTasksByStatus, getTasksForTimeline };
}
