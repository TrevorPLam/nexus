export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  status: 'active' | 'archived' | 'deleted';
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  workspaceId: string;
  projectId: string | null;
  parentId: string | null;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: Date | null;
  dueTime: string | null;
  estimatedDuration: number | null;
  completedAt: Date | null;
  calendarEventId: string | null;
  recurrenceRule: string | null;
  recurrenceId: string | null;
  energyLevel: 'low' | 'medium' | 'high' | null;
  contextTags: string | null;
  isMilestone: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  createdAt: Date;
}

export interface TaskNote {
  id: string;
  taskId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  assignedBy: string;
  assignedAt: Date;
  isPrimary: boolean;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  parentId: string | null;
  mentions: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  uploadedBy: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  storagePath: string;
  storageBucket: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  description: string | null;
  startedAt: Date;
  stoppedAt: Date | null;
  duration: string | null;
  isBillable: boolean;
  billableRate: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectForm {
  name: string;
  description: string;
  color: string;
  icon: string;
}

export interface TaskForm {
  title: string;
  projectId: string;
  parentId: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  dueTime: string;
  estimatedDuration: string;
  energyLevel: 'low' | 'medium' | 'high';
  contextTags: string;
  isMilestone: boolean;
}

export type WorkView = 'projects' | 'kanban' | 'list' | 'timeline';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
