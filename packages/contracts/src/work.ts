import { z } from 'zod';

export const ProjectStatus = z.enum(['active', 'archived', 'deleted']);
export const TaskStatus = z.enum(['todo', 'in_progress', 'done', 'cancelled']);
export const TaskPriority = z.enum(['low', 'medium', 'high', 'urgent']);
export const EnergyLevel = z.enum(['low', 'medium', 'high']);
export const DependencyType = z.enum([
  'finish_to_start',
  'start_to_start',
  'finish_to_finish',
  'start_to_finish',
]);

// Request schemas (input DTOs)
export const CreateProjectRequest = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  icon: z.string().max(50).optional(),
});

export const UpdateProjectRequest = CreateProjectRequest.partial();

export const CreateTaskRequest = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  status: TaskStatus.default('todo'),
  priority: TaskPriority.default('medium'),
  dueDate: z.string().datetime().optional(),
  dueTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  estimatedDuration: z.number().int().positive().optional(),
  calendarEventId: z.string().uuid().optional(),
  recurrenceRule: z.string().optional(),
  recurrenceId: z.string().uuid().optional(),
  energyLevel: EnergyLevel.optional(),
  contextTags: z.string().optional(),
  isMilestone: z.boolean().default(false),
});

export const UpdateTaskRequest = CreateTaskRequest.partial();

export const CreateTaskDependencyRequest = z.object({
  taskId: z.string().uuid(),
  dependsOnTaskId: z.string().uuid(),
  type: DependencyType.default('finish_to_start'),
});

export const CreateTaskNoteRequest = z.object({
  taskId: z.string().uuid(),
  content: z.string().min(1).max(10000),
});

export const UpdateTaskNoteRequest = z.object({
  content: z.string().min(1).max(10000),
});

// Response schemas (output DTOs)
export const ProjectResponse = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  status: ProjectStatus,
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TaskResponse = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  parentId: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: TaskStatus,
  priority: TaskPriority,
  dueDate: z.date().nullable(),
  dueTime: z.string().nullable(),
  estimatedDuration: z.number().int().positive().nullable(),
  completedAt: z.date().nullable(),
  calendarEventId: z.string().uuid().nullable(),
  recurrenceRule: z.string().nullable(),
  recurrenceId: z.string().uuid().nullable(),
  energyLevel: EnergyLevel.nullable(),
  contextTags: z.string().nullable(),
  isMilestone: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TaskDependencyResponse = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  dependsOnTaskId: z.string().uuid(),
  type: DependencyType,
  createdAt: z.date(),
});

export const TaskNoteResponse = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  content: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateTaskAssigneeRequest = z.object({
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
});

export const TaskAssigneeResponse = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  assignedBy: z.string().uuid(),
  assignedAt: z.date(),
  isPrimary: z.boolean(),
});

export const CreateTaskCommentRequest = z.object({
  taskId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  parentId: z.string().uuid().optional(),
  mentions: z.array(z.string().uuid()).optional(),
});

export const UpdateTaskCommentRequest = z.object({
  content: z.string().min(1).max(10000),
});

export const TaskCommentResponse = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  content: z.string(),
  parentId: z.string().uuid().nullable(),
  mentions: z.array(z.string()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateTaskAttachmentRequest = z.object({
  taskId: z.string().uuid(),
  fileName: z.string().min(1).max(500),
  fileType: z.string().min(1).max(100),
  fileSize: z.string().min(1), // Size in bytes as string
  storagePath: z.string().min(1).max(1000),
  storageBucket: z.string().default('attachments'),
});

export const TaskAttachmentResponse = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  uploadedBy: z.string().uuid(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.string(),
  storagePath: z.string(),
  storageBucket: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
});

export const CreateTimeEntryRequest = z.object({
  taskId: z.string().uuid(),
  description: z.string().max(1000).optional(),
  startedAt: z.string().datetime(),
  stoppedAt: z.string().datetime().optional(),
  duration: z.number().int().positive().optional(),
  isBillable: z.boolean().default(false),
  billableRate: z.string().optional(),
});

export const UpdateTimeEntryRequest = z.object({
  description: z.string().max(1000).optional(),
  stoppedAt: z.string().datetime().optional(),
  duration: z.number().int().positive().optional(),
  isBillable: z.boolean().optional(),
  billableRate: z.string().optional(),
});

export const TimeEntryResponse = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  description: z.string().nullable(),
  startedAt: z.date(),
  stoppedAt: z.date().nullable(),
  duration: z.string().nullable(),
  isBillable: z.boolean(),
  billableRate: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Integration command schemas
export const CreateTaskWithEventRequest = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  status: TaskStatus.default('todo'),
  priority: TaskPriority.default('medium'),
  dueDate: z.string().datetime().optional(),
  dueTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  estimatedDuration: z.number().int().positive().optional(),
  createCalendarEvent: z.boolean().default(false),
  calendarId: z.string().uuid().optional(),
  idempotencyKey: z.string().optional(),
});

export const CreateTaskWithEventResponse = z.object({
  task: TaskResponse,
  event: z
    .object({
      id: z.string().uuid(),
      workspaceId: z.string().uuid(),
      calendarId: z.string().uuid(),
      title: z.string(),
      description: z.string().nullable(),
      start: z.date(),
      end: z.date(),
      timezone: z.string(),
      taskId: z.string().uuid(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
    .optional(),
});

export const LinkTaskEventRequest = z.object({
  taskId: z.string().uuid(),
  eventId: z.string().uuid(),
  idempotencyKey: z.string().optional(),
});

export const LinkTaskEventResponse = z.object({
  task: TaskResponse,
});

export const UnlinkTaskEventRequest = z.object({
  taskId: z.string().uuid(),
  idempotencyKey: z.string().optional(),
});

export const UnlinkTaskEventResponse = z.object({
  task: TaskResponse,
});
