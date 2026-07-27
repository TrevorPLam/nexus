/**
 * MODULE: Automation Constants
 *
 * Responsibility:
 * Provides constant arrays for automation rule configuration options.
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: automation, constants
 *
 * File:
 * - apps/web/src/app/work/components/automation-constants.ts
 *
 * Last updated:
 * - July 26, 2026
 */

export const triggerTypes = [
  { value: 'task_status_changed', label: 'Task Status Changed' },
  { value: 'task_created', label: 'Task Created' },
  { value: 'task_assigned', label: 'Task Assigned' },
  { value: 'task_due_date_approaching', label: 'Due Date Approaching' },
  { value: 'task_overdue', label: 'Task Overdue' },
  { value: 'comment_added', label: 'Comment Added' },
  { value: 'subtask_completed', label: 'Subtask Completed' },
  { value: 'time_logged', label: 'Time Logged' },
] as const;

export const actionTypes = [
  { value: 'set_status', label: 'Set Status' },
  { value: 'set_priority', label: 'Set Priority' },
  { value: 'assign_to', label: 'Assign To' },
  { value: 'add_comment', label: 'Add Comment' },
  { value: 'add_subtask', label: 'Add Subtask' },
  { value: 'set_due_date', label: 'Set Due Date' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'move_to_project', label: 'Move to Project' },
  { value: 'add_tag', label: 'Add Tag' },
  { value: 'remove_tag', label: 'Remove Tag' },
] as const;

export const conditionTypes = [
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'project', label: 'Project' },
  { value: 'due_date', label: 'Due Date' },
  { value: 'custom_field', label: 'Custom Field' },
] as const;

export const operators = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
] as const;
