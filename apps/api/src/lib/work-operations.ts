import * as schema from '@life-os/database';
import {
  projects,
  tasks,
  taskDependencies,
  taskNotes,
  taskAssignees,
  taskComments,
  taskAttachments,
  timeEntries,
  events,
  calendars,
} from '@life-os/database';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';

import { db } from './db.js';
import { createAuditLog, createOutboxEvent } from './audit.js';
import { checkIdempotencyKey, createIdempotencyKey } from './idempotency.js';
import { executeCommandWithoutIdempotency, type CommandContext } from './command-context.js';

// Transaction wrapper for complex operations
export async function withTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
  return db.transaction(callback);
}

// Project Operations
export async function createProject(
  data: typeof schema.projects.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [project] = await tx.insert(projects).values(data).returning();

      if (!project) {
        throw new Error('Failed to create project');
      }

      return project;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'project',
          entityId: data.id || 'pending',
          changes: { new: data },
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'project.created',
          aggregateType: 'project',
          aggregateId: data.id || 'pending',
          payload: { project: data },
        }
      : undefined,
  );
}

export async function getProjectById(id: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  return project;
}

export async function getProjectsByWorkspace(
  workspaceId: string,
  limit = 50,
  cursor?: string,
  includeDeleted = false,
) {
  const conditions = [eq(projects.workspaceId, workspaceId)];

  // Exclude deleted projects by default
  if (!includeDeleted) {
    conditions.push(sql`${projects.status} != 'deleted'`);
  }

  if (cursor) {
    const cursorData = JSON.parse(cursor);
    conditions.push(
      sql`(${projects.createdAt} < ${new Date(cursorData.createdAt)} OR (${projects.createdAt} = ${new Date(cursorData.createdAt)} AND ${projects.id} > ${cursorData.id}))`,
    );
  }

  const results = await db
    .select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(desc(projects.createdAt), asc(projects.id))
    .limit(limit + 1); // Fetch one extra to determine if there's a next page

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, -1) : results;
  const lastItem = items.length > 0 ? items[items.length - 1] : null;
  const nextCursor =
    hasMore && lastItem
      ? JSON.stringify({
          createdAt: lastItem.createdAt.toISOString(),
          id: lastItem.id,
        })
      : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

export async function updateProject(
  id: string,
  data: Partial<typeof schema.projects.$inferInsert>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [project] = await tx
        .update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();

      if (!project) {
        throw new Error('Failed to update project');
      }

      return project;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'project',
          entityId: id,
          changes: { new: data },
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'project.updated',
          aggregateType: 'project',
          aggregateId: id,
          payload: { project: data },
        }
      : undefined,
  );
}

export async function deleteProject(id: string) {
  const [project] = await db
    .update(projects)
    .set({ status: 'deleted', updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return project;
}

// Task Operations
export async function createTask(data: typeof schema.tasks.$inferInsert, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [task] = await tx.insert(tasks).values(data).returning();

      if (!task) {
        throw new Error('Failed to create task');
      }

      return task;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'task',
          entityId: data.id || 'pending',
          changes: { new: data },
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'task.created',
          aggregateType: 'task',
          aggregateId: data.id || 'pending',
          payload: { task: data },
        }
      : undefined,
  );
}

export async function getTaskById(id: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
  return task ?? null;
}

export async function getTasksByWorkspace(
  workspaceId: string,
  limit = 50,
  cursor?: string,
  includeCancelled = false,
) {
  const conditions = [eq(tasks.workspaceId, workspaceId)];

  // Exclude cancelled tasks by default
  if (!includeCancelled) {
    conditions.push(sql`${tasks.status} != 'cancelled'`);
  }

  if (cursor) {
    const cursorData = JSON.parse(cursor);
    // Composite cursor matching: asc(dueDate), desc(priority), asc(createdAt), asc(id)
    // For asc: use >, for desc: use <
    conditions.push(
      sql`(${tasks.dueDate} > ${cursorData.dueDate ? new Date(cursorData.dueDate) : null} OR 
          (${tasks.dueDate} = ${cursorData.dueDate ? new Date(cursorData.dueDate) : null} AND 
           ${tasks.priority} < ${cursorData.priority}) OR 
          (${tasks.dueDate} = ${cursorData.dueDate ? new Date(cursorData.dueDate) : null} AND 
           ${tasks.priority} = ${cursorData.priority} AND 
           ${tasks.createdAt} > ${new Date(cursorData.createdAt)}) OR
          (${tasks.dueDate} = ${cursorData.dueDate ? new Date(cursorData.dueDate) : null} AND 
           ${tasks.priority} = ${cursorData.priority} AND 
           ${tasks.createdAt} = ${new Date(cursorData.createdAt)} AND 
           ${tasks.id} > ${cursorData.id}))`,
    );
  }

  const results = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.dueDate), desc(tasks.priority), asc(tasks.createdAt), asc(tasks.id))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, -1) : results;
  const lastItem = items.length > 0 ? items[items.length - 1] : null;
  const nextCursor =
    hasMore && lastItem
      ? JSON.stringify({
          dueDate: lastItem.dueDate?.toISOString() || null,
          priority: lastItem.priority,
          createdAt: lastItem.createdAt.toISOString(),
          id: lastItem.id,
        })
      : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

export async function getTasksByProject(projectId: string, includeCancelled = false) {
  const conditions = [eq(tasks.projectId, projectId)];

  // Exclude cancelled tasks by default
  if (!includeCancelled) {
    conditions.push(sql`${tasks.status} != 'cancelled'`);
  }

  return db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.dueDate), desc(tasks.priority), asc(tasks.id));
}

export async function getFilteredTasks(filters: {
  workspaceId: string;
  projectId?: string;
  status?: string;
  priority?: string;
  searchQuery?: string;
  dueBefore?: Date;
  dueAfter?: Date;
  limit?: number;
  cursor?: string;
  includeCancelled?: boolean;
}) {
  const conditions = [eq(tasks.workspaceId, filters.workspaceId)];

  // Exclude cancelled tasks by default unless explicitly requested
  if (!filters.includeCancelled && filters.status !== 'cancelled') {
    conditions.push(sql`${tasks.status} != 'cancelled'`);
  }

  if (filters.projectId) {
    conditions.push(eq(tasks.projectId, filters.projectId));
  }

  if (filters.status) {
    conditions.push(eq(tasks.status, filters.status));
  }

  if (filters.priority) {
    conditions.push(eq(tasks.priority, filters.priority));
  }

  if (filters.searchQuery) {
    // Use ILIKE search for title and description
    conditions.push(
      sql`(${tasks.title} ILIKE ${'%' + filters.searchQuery + '%'} OR ${tasks.description} ILIKE ${'%' + filters.searchQuery + '%'})`,
    );
  }

  if (filters.dueBefore) {
    conditions.push(sql`${tasks.dueDate} <= ${filters.dueBefore}`);
  }

  if (filters.dueAfter) {
    conditions.push(sql`${tasks.dueDate} >= ${filters.dueAfter}`);
  }

  const limit = filters.limit || 50;

  // Add cursor predicate if provided
  if (filters.cursor) {
    const cursorData = JSON.parse(filters.cursor);
    // Composite cursor matching: asc(dueDate), desc(priority), asc(id)
    conditions.push(
      sql`(${tasks.dueDate} > ${cursorData.dueDate ? new Date(cursorData.dueDate) : null} OR 
          (${tasks.dueDate} = ${cursorData.dueDate ? new Date(cursorData.dueDate) : null} AND 
           ${tasks.priority} < ${cursorData.priority}) OR 
          (${tasks.dueDate} = ${cursorData.dueDate ? new Date(cursorData.dueDate) : null} AND 
           ${tasks.priority} = ${cursorData.priority} AND 
           ${tasks.id} > ${cursorData.id}))`,
    );
  }

  const query = db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.dueDate), desc(tasks.priority), asc(tasks.id))
    .limit(limit + 1);

  const results = await query;
  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, -1) : results;
  const lastItem = items.length > 0 ? items[items.length - 1] : null;
  const nextCursor =
    hasMore && lastItem
      ? JSON.stringify({
          dueDate: lastItem.dueDate?.toISOString() || null,
          priority: lastItem.priority,
          id: lastItem.id,
        })
      : null;

  return { items, nextCursor, hasMore };
}

// Full-text search function with ranking
export async function searchTasks(workspaceId: string, query: string, limit = 20) {
  return db
    .select({
      task: tasks,
      rank: sql<number>`ts_rank(${tasks.searchVector}, plainto_tsquery('english', ${query}))`.as(
        'rank',
      ),
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        sql`${tasks.searchVector} @@ plainto_tsquery('english', ${query})`,
      ),
    )
    .orderBy(sql`ts_rank(${tasks.searchVector}, plainto_tsquery('english', ${query})) DESC`)
    .limit(limit);
}

export async function updateTask(
  id: string,
  data: Partial<typeof schema.tasks.$inferInsert>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const updateData: Partial<typeof schema.tasks.$inferInsert> = {
        ...data,
        updatedAt: new Date(),
      };

      // Auto-set completedAt when status is 'done'
      if (data.status === 'done' && !data.completedAt) {
        updateData.completedAt = new Date();
      }

      // Clear completedAt when status is not 'done'
      if (data.status && data.status !== 'done') {
        updateData.completedAt = null;
      }

      const [task] = await tx.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();

      if (!task) {
        throw new Error('Failed to update task');
      }

      return task;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'task',
          entityId: id,
          changes: { new: data },
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'task.updated',
          aggregateType: 'task',
          aggregateId: id,
          payload: { task: data },
        }
      : undefined,
  );
}

export async function deleteTask(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [task] = await tx
        .update(tasks)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(tasks.id, id))
        .returning();

      if (!task) {
        throw new Error('Failed to delete task');
      }

      return task;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'task',
          entityId: id,
          changes: {},
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'task.deleted',
          aggregateType: 'task',
          aggregateId: id,
          payload: { taskId: id },
        }
      : undefined,
  );
}

// Task Dependency Operations
export async function createTaskDependency(data: typeof schema.taskDependencies.$inferInsert) {
  // Check for circular dependency before creating
  const hasCycle = await checkCircularDependency(data.taskId, data.dependsOnTaskId);
  if (hasCycle) {
    throw new Error('Cannot create circular dependency');
  }

  const [dependency] = await db.insert(taskDependencies).values(data).returning();
  return dependency;
}

export async function getTaskDependencies(taskId: string) {
  return db.select().from(taskDependencies).where(eq(taskDependencies.taskId, taskId));
}

export async function deleteTaskDependency(id: string) {
  const [dependency] = await db
    .delete(taskDependencies)
    .where(eq(taskDependencies.id, id))
    .returning();
  return dependency;
}

// Circular dependency validation using DFS
async function checkCircularDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
  // If dependsOnTaskId depends on taskId (directly or indirectly), we have a cycle
  return hasPath(dependsOnTaskId, taskId, new Set());
}

async function hasPath(from: string, to: string, visited: Set<string>): Promise<boolean> {
  if (from === to) return true;
  if (visited.has(from)) return false;

  visited.add(from);

  // Get all tasks that depend on 'from'
  const dependencies = await db
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.dependsOnTaskId, from));

  for (const dep of dependencies) {
    if (await hasPath(dep.taskId, to, visited)) {
      return true;
    }
  }

  return false;
}

// Batch operations
export async function getProjectsWithTasks(workspaceId: string, limit = 50, cursor?: string) {
  const result = await getProjectsByWorkspace(workspaceId, limit, cursor);

  const projectsWithTasks = await Promise.all(
    result.items.map(async (project) => {
      const taskList = await getTasksByProject(project.id);
      return {
        ...project,
        tasks: taskList,
      };
    }),
  );

  return {
    items: projectsWithTasks,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
  };
}

// Subtask Operations
export async function getSubtasks(parentTaskId: string) {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.parentId, parentTaskId))
    .orderBy(asc(tasks.createdAt));
}

// Task Note Operations
export async function createTaskNote(
  data: typeof schema.taskNotes.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [note] = await tx.insert(taskNotes).values(data).returning();
      return note;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'task_note',
          entityId: data.taskId,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'task_note.created',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { note: data },
    },
  );
}

export async function getTaskNoteById(id: string) {
  const [note] = await db.select().from(taskNotes).where(eq(taskNotes.id, id));
  return note;
}

export async function getTaskNotesByTask(taskId: string) {
  return db
    .select()
    .from(taskNotes)
    .where(eq(taskNotes.taskId, taskId))
    .orderBy(desc(taskNotes.createdAt));
}

export async function updateTaskNote(
  id: string,
  data: Partial<typeof schema.taskNotes.$inferInsert>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [note] = await tx
        .update(taskNotes)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(taskNotes.id, id))
        .returning();
      return note;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'task_note',
          entityId: id,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'task_note.updated',
      aggregateType: 'task',
      aggregateId: id,
      payload: { note: data },
    },
  );
}

export async function deleteTaskNote(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [note] = await tx.delete(taskNotes).where(eq(taskNotes.id, id)).returning();
      return note;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'task_note',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'task_note.deleted',
      aggregateType: 'task',
      aggregateId: id,
      payload: { noteId: id },
    },
  );
}

// Batch Task Operations
export async function batchCompleteTasks(taskIds: string[], context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      return tx
        .update(tasks)
        .set({
          status: 'done',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(inArray(tasks.id, taskIds))
        .returning();
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'task',
          entityId: 'batch',
          changes: { new: { status: 'done' } },
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'task.batch_completed',
          aggregateType: 'task',
          aggregateId: 'batch',
          payload: { taskIds },
        }
      : undefined,
  );
}

export async function batchDeferTasks(
  taskIds: string[],
  deferToDate: Date,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      return tx
        .update(tasks)
        .set({
          dueDate: deferToDate,
          updatedAt: new Date(),
        })
        .where(inArray(tasks.id, taskIds))
        .returning();
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'task',
          entityId: 'batch',
          changes: { new: { dueDate: deferToDate } },
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'task.batch_deferred',
          aggregateType: 'task',
          aggregateId: 'batch',
          payload: { taskIds, deferToDate },
        }
      : undefined,
  );
}

export async function batchRescheduleTasks(
  taskIds: string[],
  newDueDate: Date,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      return tx
        .update(tasks)
        .set({
          dueDate: newDueDate,
          updatedAt: new Date(),
        })
        .where(inArray(tasks.id, taskIds))
        .returning();
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'task',
          entityId: 'batch',
          changes: { new: { dueDate: newDueDate } },
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'task.batch_rescheduled',
          aggregateType: 'task',
          aggregateId: 'batch',
          payload: { taskIds, newDueDate },
        }
      : undefined,
  );
}

export async function batchUpdateTaskStatus(
  taskIds: string[],
  newStatus: string,
  context?: CommandContext,
) {
  const updateData: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };

  if (newStatus === 'done') {
    updateData.completedAt = new Date();
  } else {
    updateData.completedAt = null;
  }

  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      return tx.update(tasks).set(updateData).where(inArray(tasks.id, taskIds)).returning();
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'task',
          entityId: 'batch',
          changes: { new: { status: newStatus } },
        }
      : undefined,
    context?.userId && context?.workspaceId
      ? {
          eventType: 'task.batch_status_updated',
          aggregateType: 'task',
          aggregateId: 'batch',
          payload: { taskIds, newStatus },
        }
      : undefined,
  );
}

// Task Assignee Operations
export async function createTaskAssignee(
  data: typeof schema.taskAssignees.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [assignee] = await tx.insert(taskAssignees).values(data).returning();
      return assignee;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'task_assignee',
          entityId: data.taskId,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'task_assignee.created',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { assignee: data },
    },
  );
}

export async function getTaskAssignees(taskId: string) {
  return db.select().from(taskAssignees).where(eq(taskAssignees.taskId, taskId));
}

export async function deleteTaskAssignee(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [assignee] = await tx.delete(taskAssignees).where(eq(taskAssignees.id, id)).returning();
      return assignee;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'task_assignee',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'task_assignee.deleted',
      aggregateType: 'task',
      aggregateId: id,
      payload: { assigneeId: id },
    },
  );
}

// Task Comment Operations
export async function createTaskComment(
  data: typeof schema.taskComments.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [comment] = await tx.insert(taskComments).values(data).returning();
      return comment;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'task_comment',
          entityId: data.taskId,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'task_comment.created',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { comment: data },
    },
  );
}

export async function getTaskCommentById(id: string) {
  const [comment] = await db.select().from(taskComments).where(eq(taskComments.id, id));
  return comment;
}

export async function getTaskCommentsByTask(taskId: string) {
  return db
    .select()
    .from(taskComments)
    .where(eq(taskComments.taskId, taskId))
    .orderBy(desc(taskComments.createdAt));
}

export async function updateTaskComment(
  id: string,
  data: Partial<typeof schema.taskComments.$inferInsert>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [comment] = await tx
        .update(taskComments)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(taskComments.id, id))
        .returning();
      return comment;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'task_comment',
          entityId: id,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'task_comment.updated',
      aggregateType: 'task',
      aggregateId: id,
      payload: { comment: data },
    },
  );
}

export async function deleteTaskComment(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [comment] = await tx.delete(taskComments).where(eq(taskComments.id, id)).returning();
      return comment;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'task_comment',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'task_comment.deleted',
      aggregateType: 'task',
      aggregateId: id,
      payload: { commentId: id },
    },
  );
}

// Task Attachment Operations
export async function createTaskAttachment(
  data: typeof schema.taskAttachments.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [attachment] = await tx.insert(taskAttachments).values(data).returning();
      return attachment;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'task_attachment',
          entityId: data.taskId,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'task_attachment.created',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { attachment: data },
    },
  );
}

export async function getTaskAttachmentById(id: string) {
  const [attachment] = await db.select().from(taskAttachments).where(eq(taskAttachments.id, id));
  return attachment;
}

export async function getTaskAttachmentsByTask(taskId: string) {
  return db
    .select()
    .from(taskAttachments)
    .where(eq(taskAttachments.taskId, taskId))
    .orderBy(desc(taskAttachments.createdAt));
}

export async function deleteTaskAttachment(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [attachment] = await tx
        .delete(taskAttachments)
        .where(eq(taskAttachments.id, id))
        .returning();
      return attachment;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'task_attachment',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'task_attachment.deleted',
      aggregateType: 'task',
      aggregateId: id,
      payload: { attachmentId: id },
    },
  );
}

// Time Entry Operations
export async function createTimeEntry(
  data: typeof schema.timeEntries.$inferInsert,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [entry] = await tx.insert(timeEntries).values(data).returning();
      return entry;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'time_entry',
          entityId: data.taskId,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'time_entry.created',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { entry: data },
    },
  );
}

export async function getTimeEntryById(id: string) {
  const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
  return entry;
}

export async function getTimeEntriesByTask(taskId: string) {
  return db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.taskId, taskId))
    .orderBy(desc(timeEntries.startedAt));
}

export async function getTimeEntriesByUser(userId: string, startDate?: Date, endDate?: Date) {
  const conditions = [eq(timeEntries.userId, userId)];

  if (startDate) {
    conditions.push(sql`${timeEntries.startedAt} >= ${startDate}`);
  }

  if (endDate) {
    conditions.push(sql`${timeEntries.startedAt} <= ${endDate}`);
  }

  return db
    .select()
    .from(timeEntries)
    .where(and(...conditions))
    .orderBy(desc(timeEntries.startedAt));
}

export async function updateTimeEntry(
  id: string,
  data: Partial<typeof schema.timeEntries.$inferInsert>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [entry] = await tx
        .update(timeEntries)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(timeEntries.id, id))
        .returning();
      return entry;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'update',
          entityType: 'time_entry',
          entityId: id,
          changes: { new: data },
        }
      : undefined,
    {
      eventType: 'time_entry.updated',
      aggregateType: 'task',
      aggregateId: id,
      payload: { entry: data },
    },
  );
}

export async function deleteTimeEntry(id: string, context?: CommandContext) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [entry] = await tx.delete(timeEntries).where(eq(timeEntries.id, id)).returning();
      return entry;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'delete',
          entityType: 'time_entry',
          entityId: id,
          changes: {},
        }
      : undefined,
    {
      eventType: 'time_entry.deleted',
      aggregateType: 'task',
      aggregateId: id,
      payload: { entryId: id },
    },
  );
}

// Transaction-based complex operations

// Create task with dependencies in a single transaction
export async function createTaskWithDependencies(
  taskData: typeof schema.tasks.$inferInsert,
  dependencies: Array<{ dependsOnTaskId: string; type: string }>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [task] = await tx.insert(tasks).values(taskData).returning();

      if (dependencies.length > 0) {
        await tx.insert(taskDependencies).values(
          dependencies.map((dep: { dependsOnTaskId: string; type: string }) => ({
            taskId: task.id,
            dependsOnTaskId: dep.dependsOnTaskId,
            type: dep.type,
          })) as (typeof schema.taskDependencies.$inferInsert)[],
        );
      }

      return task;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'task_with_dependencies',
          entityId: taskData.id || 'pending',
          changes: { new: { taskData, dependencies } },
        }
      : undefined,
    {
      eventType: 'task_with_dependencies.created',
      aggregateType: 'task',
      aggregateId: taskData.id || 'pending',
      payload: { taskData, dependencies },
    },
  );
}

// Create task with assignees in a single transaction
export async function createTaskWithAssignees(
  taskData: typeof schema.tasks.$inferInsert,
  assignees: Array<{ userId: string; assignedBy: string; isPrimary?: boolean }>,
  context?: CommandContext,
) {
  return executeCommandWithoutIdempotency(
    context || {},
    async (tx) => {
      const [task] = await tx.insert(tasks).values(taskData).returning();

      if (assignees.length > 0) {
        await tx.insert(taskAssignees).values(
          assignees.map(
            (assignee: { userId: string; assignedBy: string; isPrimary?: boolean }) => ({
              taskId: task.id,
              userId: assignee.userId,
              assignedBy: assignee.assignedBy,
              isPrimary: assignee.isPrimary ?? false,
            }),
          ) as (typeof schema.taskAssignees.$inferInsert)[],
        );
      }

      return task;
    },
    context?.userId && context?.workspaceId
      ? {
          action: 'create',
          entityType: 'task_with_assignees',
          entityId: taskData.id || 'pending',
          changes: { new: { taskData, assignees } },
        }
      : undefined,
    {
      eventType: 'task_with_assignees.created',
      aggregateType: 'task',
      aggregateId: taskData.id || 'pending',
      payload: { taskData, assignees },
    },
  );
}

// Delete project with all its tasks (soft delete cascade)
export async function deleteProjectWithTasks(projectId: string) {
  return withTransaction(async (tx) => {
    // Soft delete all tasks in the project
    await tx
      .update(tasks)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(tasks.projectId, projectId));

    // Soft delete the project
    const [project] = await tx
      .update(projects)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();

    return project;
  });
}

// Move task to different project
export async function moveTaskToProject(taskId: string, newProjectId: string) {
  return withTransaction(async (tx) => {
    const [task] = await tx
      .update(tasks)
      .set({ projectId: newProjectId, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();

    return task;
  });
}

// Complete task with time entry in a single transaction
export async function completeTaskWithTimeEntry(
  taskId: string,
  timeEntryData: typeof schema.timeEntries.$inferInsert,
) {
  return withTransaction(async (tx) => {
    // Update task status
    const [task] = await tx
      .update(tasks)
      .set({ status: 'done', completedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();

    // Create time entry if provided
    if (timeEntryData) {
      await tx.insert(timeEntries).values(timeEntryData);
    }

    return task;
  });
}

// Batch delete tasks with their dependencies
export async function batchDeleteTasksWithDependencies(taskIds: string[]) {
  return withTransaction(async (tx) => {
    // Delete dependencies
    await tx.delete(taskDependencies).where(inArray(taskDependencies.taskId, taskIds));

    // Delete assignees
    await tx.delete(taskAssignees).where(inArray(taskAssignees.taskId, taskIds));

    // Delete comments
    await tx.delete(taskComments).where(inArray(taskComments.taskId, taskIds));

    // Delete attachments
    await tx.delete(taskAttachments).where(inArray(taskAttachments.taskId, taskIds));

    // Delete time entries
    await tx.delete(timeEntries).where(inArray(timeEntries.taskId, taskIds));

    // Soft delete tasks
    const deletedTasks = await tx
      .update(tasks)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(inArray(tasks.id, taskIds))
      .returning();

    return deletedTasks;
  });
}

// Clone task with all its data (for templates)
export async function cloneTaskWithDependencies(
  originalTaskId: string,
  newTaskData: Partial<typeof schema.tasks.$inferInsert>,
) {
  return withTransaction(async (tx) => {
    // Get original task
    const [originalTask] = await tx.select().from(tasks).where(eq(tasks.id, originalTaskId));
    if (!originalTask) {
      throw new Error('Original task not found');
    }

    // Create new task
    const [newTask] = await tx
      .insert(tasks)
      .values({
        ...originalTask,
        ...newTaskData,
        id: undefined, // Generate new ID
        title: newTaskData.title || `${originalTask.title} (Copy)`,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Copy dependencies
    const originalDependencies = await tx
      .select()
      .from(taskDependencies)
      .where(eq(taskDependencies.taskId, originalTaskId));

    if (originalDependencies.length > 0) {
      await tx.insert(taskDependencies).values(
        originalDependencies.map((dep) => ({
          taskId: newTask.id,
          dependsOnTaskId: dep.dependsOnTaskId,
          type: dep.type,
        })),
      );
    }

    // Copy assignees
    const originalAssignees = await tx
      .select()
      .from(taskAssignees)
      .where(eq(taskAssignees.taskId, originalTaskId));

    if (originalAssignees.length > 0) {
      await tx.insert(taskAssignees).values(
        originalAssignees.map((assignee) => ({
          taskId: newTask.id,
          userId: assignee.userId,
          assignedBy: assignee.assignedBy,
          isPrimary: assignee.isPrimary,
        })),
      );
    }

    return newTask;
  });
}

// Integration Command: Create task with optional calendar event
export async function createTaskWithEventCommand(
  data: {
    workspaceId: string;
    projectId?: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: string;
    dueTime?: string;
    estimatedDuration?: number;
    createCalendarEvent: boolean;
    calendarId?: string;
    idempotencyKey?: string;
  },
  userId?: string,
) {
  const endpoint = 'POST /tasks-with-event';

  // Check idempotency if key provided
  if (data.idempotencyKey && userId) {
    const idempotencyCheck = await checkIdempotencyKey(data.idempotencyKey, userId, endpoint);
    if (idempotencyCheck.isDuplicate) {
      return {
        isIdempotent: true,
        responseStatus: idempotencyCheck.responseStatus,
        responseBody: idempotencyCheck.responseBody,
      };
    }
  }

  return withTransaction(async (tx) => {
    // Verify project belongs to workspace if provided
    if (data.projectId) {
      const [project] = await tx
        .select()
        .from(projects)
        .where(and(eq(projects.id, data.projectId), eq(projects.workspaceId, data.workspaceId)))
        .limit(1);

      if (!project) {
        throw new Error('Project not found or does not belong to workspace');
      }
    }

    // Verify calendar belongs to workspace if creating event
    if (data.createCalendarEvent && data.calendarId) {
      const [calendar] = await tx
        .select()
        .from(calendars)
        .where(and(eq(calendars.id, data.calendarId), eq(calendars.workspaceId, data.workspaceId)))
        .limit(1);

      if (!calendar) {
        throw new Error('Calendar not found or does not belong to workspace');
      }
    }

    // Create task
    const [task] = await tx
      .insert(tasks)
      .values({
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        dueTime: data.dueTime,
        estimatedDuration: data.estimatedDuration ? String(data.estimatedDuration) : null,
      })
      .returning();

    if (!task) {
      throw new Error('Failed to create task');
    }

    let event = null;

    // Create calendar event if requested
    if (data.createCalendarEvent && data.dueDate && data.calendarId) {
      const dueDate = new Date(data.dueDate);
      const duration = data.estimatedDuration || 60;
      const startTime = dueDate;
      const endTime = new Date(dueDate.getTime() + duration * 60000);

      const [createdEvent] = await tx
        .insert(events)
        .values({
          workspaceId: data.workspaceId,
          calendarId: data.calendarId,
          title: data.title,
          description: data.description,
          start: startTime,
          end: endTime,
          timezone: 'UTC',
          taskId: task.id,
        })
        .returning();

      if (!createdEvent) {
        throw new Error('Failed to create event');
      }

      // Update task with calendar event ID
      await tx.update(tasks).set({ calendarEventId: createdEvent.id }).where(eq(tasks.id, task.id));

      event = createdEvent;
    }

    // Create audit log
    if (userId) {
      await createAuditLog({
        userId,
        workspaceId: data.workspaceId,
        action: 'create',
        entityType: 'task_with_event',
        entityId: task.id,
        changes: { new: data },
      });
    }

    // Create outbox event
    await createOutboxEvent({
      eventType: 'task_with_event.created',
      aggregateType: 'task',
      aggregateId: task.id,
      payload: { task, event },
    });

    // Store idempotency key if provided
    const responseBody = { task, event };
    if (data.idempotencyKey && userId) {
      await createIdempotencyKey({
        key: data.idempotencyKey,
        userId,
        endpoint,
        responseStatus: '201',
        responseBody,
      });
    }

    return responseBody;
  });
}

// Integration Command: Link task to calendar event
export async function linkTaskEventCommand(
  data: { taskId: string; eventId: string; idempotencyKey?: string },
  userId?: string,
) {
  const endpoint = 'POST /link-task-event';

  // Check idempotency if key provided
  if (data.idempotencyKey && userId) {
    const idempotencyCheck = await checkIdempotencyKey(data.idempotencyKey, userId, endpoint);
    if (idempotencyCheck.isDuplicate) {
      return {
        isIdempotent: true,
        responseStatus: idempotencyCheck.responseStatus,
        responseBody: idempotencyCheck.responseBody,
      };
    }
  }

  return withTransaction(async (tx) => {
    // Fetch task and event to verify workspace ownership
    const [task] = await tx.select().from(tasks).where(eq(tasks.id, data.taskId)).limit(1);
    const [event] = await tx.select().from(events).where(eq(events.id, data.eventId)).limit(1);

    if (!task || !event) {
      throw new Error('Task or event not found');
    }

    // Verify both belong to same workspace
    if (task.workspaceId !== event.workspaceId) {
      throw new Error('Task and event must belong to the same workspace');
    }

    // Link event to task
    const [updatedEvent] = await tx
      .update(events)
      .set({ taskId: data.taskId, updatedAt: new Date() })
      .where(eq(events.id, data.eventId))
      .returning();

    if (!updatedEvent) {
      throw new Error('Failed to link event to task');
    }

    // Update task with calendar event ID
    const [updatedTask] = await tx
      .update(tasks)
      .set({ calendarEventId: data.eventId, updatedAt: new Date() })
      .where(eq(tasks.id, data.taskId))
      .returning();

    if (!updatedTask) {
      throw new Error('Failed to update task');
    }

    // Create audit log
    if (userId) {
      await createAuditLog({
        userId,
        workspaceId: task.workspaceId,
        action: 'update',
        entityType: 'task_event_link',
        entityId: data.taskId,
        changes: { new: { eventId: data.eventId } },
      });
    }

    // Create outbox event
    await createOutboxEvent({
      eventType: 'task_event.linked',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { task: updatedTask, event: updatedEvent },
    });

    // Store idempotency key if provided
    const responseBody = { task: updatedTask };
    if (data.idempotencyKey && userId) {
      await createIdempotencyKey({
        key: data.idempotencyKey,
        userId,
        endpoint,
        responseStatus: '200',
        responseBody,
      });
    }

    return responseBody;
  });
}

// Integration Command: Unlink task from calendar event
export async function unlinkTaskEventCommand(
  data: { taskId: string; idempotencyKey?: string },
  userId?: string,
) {
  const endpoint = 'POST /unlink-task-event';

  // Check idempotency if key provided
  if (data.idempotencyKey && userId) {
    const idempotencyCheck = await checkIdempotencyKey(data.idempotencyKey, userId, endpoint);
    if (idempotencyCheck.isDuplicate) {
      return {
        isIdempotent: true,
        responseStatus: idempotencyCheck.responseStatus,
        responseBody: idempotencyCheck.responseBody,
      };
    }
  }

  return withTransaction(async (tx) => {
    // Fetch task to get workspace and current event
    const [task] = await tx.select().from(tasks).where(eq(tasks.id, data.taskId)).limit(1);

    if (!task) {
      throw new Error('Task not found');
    }

    const eventId = task.calendarEventId;

    // Unlink event from task
    if (eventId) {
      await tx
        .update(events)
        .set({ taskId: null, updatedAt: new Date() })
        .where(eq(events.id, eventId));
    }

    // Update task to remove calendar event ID
    const [updatedTask] = await tx
      .update(tasks)
      .set({ calendarEventId: null, updatedAt: new Date() })
      .where(eq(tasks.id, data.taskId))
      .returning();

    if (!updatedTask) {
      throw new Error('Failed to update task');
    }

    // Create audit log
    if (userId) {
      await createAuditLog({
        userId,
        workspaceId: task.workspaceId,
        action: 'update',
        entityType: 'task_event_link',
        entityId: data.taskId,
        changes: { old: { eventId }, new: { eventId: null } },
      });
    }

    // Create outbox event
    await createOutboxEvent({
      eventType: 'task_event.unlinked',
      aggregateType: 'task',
      aggregateId: data.taskId,
      payload: { task: updatedTask },
    });

    // Store idempotency key if provided
    const responseBody = { task: updatedTask };
    if (data.idempotencyKey && userId) {
      await createIdempotencyKey({
        key: data.idempotencyKey,
        userId,
        endpoint,
        responseStatus: '200',
        responseBody,
      });
    }

    return responseBody;
  });
}
