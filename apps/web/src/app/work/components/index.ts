/**
 * MODULE: Work Components Barrel Export
 *
 * Responsibility:
 * Re-exports all work management components for convenient importing.
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 *
 * File:
 * - apps/web/src/app/work/components/index.ts
 *
 * Last updated:
 * - July 23, 2026
 */

// Views
export { KanbanView } from './KanbanView';
export { ListView } from './ListView';
export { TimelineView } from './TimelineView';
export { ProjectsView } from './ProjectsView';
export { WorkloadView } from './WorkloadView';

// Feature Views
export { GoalsView } from './GoalsView';
export { DashboardsView } from './DashboardsView';
export { CustomFieldsView } from './CustomFieldsView';
export { AutomationView } from './AutomationView';
export { ApprovalWorkflowsView } from './ApprovalWorkflowsView';
export { ProjectTemplatesView } from './ProjectTemplatesView';

// Modals
export { ProjectModal } from './ProjectModal';
export { TaskModal } from './TaskModal';
export { ProjectTemplatesModal } from './ProjectTemplatesModal';
export { AutomationModal } from './AutomationModal';
export { CustomFieldsModal } from './CustomFieldsModal';

// Task Components
export { TaskComments } from './TaskComments';
export { TaskAttachments } from './TaskAttachments';
export { TaskSubtasks } from './TaskSubtasks';
export { TaskTimeTracking } from './TaskTimeTracking';
export { TaskCalendarView } from './TaskCalendarView';
export { TaskActivityFeed } from './TaskActivityFeed';
export { TimeTrackingTimer } from './TimeTrackingTimer';
