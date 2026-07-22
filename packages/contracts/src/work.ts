import { z } from 'zod';

export const ProjectStatus = z.enum(['active', 'archived', 'deleted']);
export const TaskStatus = z.enum(['todo', 'in_progress', 'done', 'cancelled']);
export const TaskPriority = z.enum(['low', 'medium', 'high', 'urgent']);

export const CreateProjectSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  id: z.string().uuid(),
});

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  status: ProjectStatus,
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const EnergyLevel = z.enum(['low', 'medium', 'high']);

export const CreateTaskSchema = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  status: TaskStatus.default('todo'),
  priority: TaskPriority.default('medium'),
  dueDate: z.string().datetime().optional(),
  dueTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  estimatedDuration: z.number().int().positive().optional(),
  calendarEventId: z.string().uuid().optional(),
  recurrenceRule: z.string().optional(),
  recurrenceId: z.string().uuid().optional(),
  energyLevel: EnergyLevel.optional(),
  contextTags: z.string().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  id: z.string().uuid(),
});

export const TaskSchema = z.object({
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
  estimatedDuration: z.string().nullable(),
  completedAt: z.date().nullable(),
  calendarEventId: z.string().uuid().nullable(),
  recurrenceRule: z.string().nullable(),
  recurrenceId: z.string().uuid().nullable(),
  energyLevel: z.string().nullable(),
  contextTags: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateTaskDependencySchema = z.object({
  taskId: z.string().uuid(),
  dependsOnTaskId: z.string().uuid(),
  type: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']).default('finish_to_start'),
});

export const TaskDependencySchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  dependsOnTaskId: z.string().uuid(),
  type: z.string(),
  createdAt: z.date(),
});

export const CreateTaskNoteSchema = z.object({
  taskId: z.string().uuid(),
  content: z.string().min(1).max(10000),
});

export const UpdateTaskNoteSchema = CreateTaskNoteSchema.partial().extend({
  id: z.string().uuid(),
});

export const TaskNoteSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  content: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
