/**
 * MODULE: Reporting & Dashboard Types (Web)
 *
 * Responsibility:
 * Defines TypeScript interfaces for dashboards, dashboard widgets (task
 * completion, project progress, workload, time tracking, etc.), reports,
 * and report schedules.
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: types, reporting, dashboards, widgets
 *
 * File:
 * - apps/web/src/app/work/types-reporting.ts
 *
 * Last updated:
 * - July 23, 2026
 */

export interface Dashboard {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  widgets: DashboardWidget[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type DashboardWidget =
  | TaskCompletionWidget
  | ProjectProgressWidget
  | WorkloadWidget
  | TimeTrackingWidget
  | PriorityDistributionWidget
  | TeamPerformanceWidget;

export interface TaskCompletionWidget {
  type: 'task_completion';
  id: string;
  title: string;
  config: {
    projectId: string | null;
    timeRange: '7d' | '30d' | '90d' | 'all';
    groupBy: 'day' | 'week' | 'month';
  };
  position: { x: number; y: number; w: number; h: number };
}

export interface ProjectProgressWidget {
  type: 'project_progress';
  id: string;
  title: string;
  config: {
    projectIds: string[];
  };
  position: { x: number; y: number; w: number; h: number };
}

export interface WorkloadWidget {
  type: 'workload';
  id: string;
  title: string;
  config: {
    userIds: string[];
    timeRange: 'week' | 'month';
  };
  position: { x: number; y: number; w: number; h: number };
}

export interface TimeTrackingWidget {
  type: 'time_tracking';
  id: string;
  title: string;
  config: {
    projectId: string | null;
    timeRange: '7d' | '30d' | '90d';
    groupBy: 'user' | 'project' | 'task';
  };
  position: { x: number; y: number; w: number; h: number };
}

export interface PriorityDistributionWidget {
  type: 'priority_distribution';
  id: string;
  title: string;
  config: {
    projectId: string | null;
  };
  position: { x: number; y: number; w: number; h: number };
}

export interface TeamPerformanceWidget {
  type: 'team_performance';
  id: string;
  title: string;
  config: {
    userIds: string[];
    timeRange: '7d' | '30d' | '90d';
  };
  position: { x: number; y: number; w: number; h: number };
}

export interface Report {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  type: 'project_summary' | 'team_performance' | 'time_report' | 'custom';
  config: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportSchedule {
  id: string;
  reportId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  nextRunAt: Date;
  isActive: boolean;
}
