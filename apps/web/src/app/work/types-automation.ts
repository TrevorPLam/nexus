export interface AutomationRule {
  id: string;
  workspaceId: string;
  projectId: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  conditions: AutomationCondition[];
  createdAt: Date;
  updatedAt: Date;
}

export type AutomationTrigger =
  | { type: 'task_status_changed'; fromStatus?: string; toStatus: string }
  | { type: 'task_created' }
  | { type: 'task_assigned' }
  | { type: 'task_due_date_approaching'; daysBefore: number }
  | { type: 'task_overdue' }
  | { type: 'comment_added' }
  | { type: 'subtask_completed' }
  | { type: 'time_logged'; durationMinutes?: number }
  | { type: 'scheduled'; cronExpression: string };

export type AutomationAction =
  | { type: 'set_status'; status: 'todo' | 'in_progress' | 'done' | 'cancelled' }
  | { type: 'set_priority'; priority: 'low' | 'medium' | 'high' | 'urgent' }
  | { type: 'assign_to'; userId: string }
  | { type: 'add_comment'; template: string }
  | { type: 'add_subtask'; title: string }
  | { type: 'set_due_date'; offsetDays: number }
  | { type: 'send_notification'; message: string }
  | { type: 'create_task'; template: TaskTemplate }
  | { type: 'move_to_project'; projectId: string }
  | { type: 'add_tag'; tag: string }
  | { type: 'remove_tag'; tag: string }
  | { type: 'set_custom_field'; fieldId: string; value: unknown };

export interface AutomationCondition {
  type: 'priority' | 'assignee' | 'project' | 'due_date' | 'custom_field';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: unknown;
}

export interface TaskTemplate {
  title: string;
  description: string | null;
  projectId: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDuration: number | null;
  energyLevel: 'low' | 'medium' | 'high' | null;
  contextTags: string | null;
}

export interface AutomationExecutionLog {
  id: string;
  ruleId: string;
  taskId: string | null;
  triggeredAt: Date;
  triggerType: string;
  actionsExecuted: number;
  success: boolean;
  error: string | null;
  metadata: Record<string, unknown> | null;
}
