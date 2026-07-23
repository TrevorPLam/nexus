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
} from '@life-os/database';
import { eq, and, desc, asc, sql, gt, inArray } from 'drizzle-orm';

import { db } from './db.js';
import { createAuditLog, createOutboxEvent } from './audit.js';

// Transaction wrapper for complex operations
export async function withTransaction<T>(
  callback: (tx: any) => Promise<T>,
): Promise<T> {
  return db.transaction(callback);
}

// Project Operations
export async function createProject(
  data: typeof schema.projects.$inferInsert,
  userId?: string,
  workspaceId?: string,
) {
  return withTransaction(async (tx) => {
    const [project] = await tx.insert(projects).values(data).returning();

    if (!project) {
      throw new Error('Failed to create project');
    }

    // Create audit log
    if (userId && workspaceId) {
      await createAuditLog({
        userId,
        workspaceId,
        action: 'create',
        entityType: 'project',
        entityId: project.id,
        changes: { new: data },
      });
    }

    // Create outbox event for sync
    await createOutboxEvent({
      eventType: 'project.created',
      aggregateType: 'project',
      aggregateId: project.id,
      payload: { project },
    });

    return project;
  });
}

export async function getProjectById(id: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  return project;
}

export async function getProjectsByWorkspace(workspaceId: string, limit = 50, cursor?: string) {
  const conditions = [eq(projects.workspaceId, workspaceId)];

  if (cursor) {
    conditions.push(gt(projects.createdAt, new Date(cursor)));
  }

  const results = await db
    .select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(desc(projects.createdAt))
    .limit(limit + 1); // Fetch one extra to determine if there's a next page

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, -1) : results;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

export async function updateProject(
  id: string,
  data: Partial<typeof schema.projects.$inferInsert>,
  userId?: string,
  workspaceId?: string,
) {
  return withTransaction(async (tx) => {
    const [project] = await tx
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    if (!project) {
      throw new Error('Failed to update project');
    }

    // Create audit log
    if (userId && workspaceId) {
      await createAuditLog({
        userId,
        workspaceId,
        action: 'update',
        entityType: 'project',
        entityId: project.id,
        changes: { old: {}, new: data },
      });
    }

    // Create outbox event for sync
    await createOutboxEvent({
      eventType: 'project.updated',
      aggregateType: 'project',
      aggregateId: project.id,
      payload: { project },
    });

    return project;
  });
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
export async function createTask(
  data: typeof schema.tasks.$inferInsert,
  userId?: string,
  workspaceId?: string,
) {
  return withTransaction(async (tx) => {
    const [task] = await tx.insert(tasks).values(data).returning();

    if (!task) {
      throw new Error('Failed to create task');
    }

    // Create audit log
    if (userId && workspaceId) {
      await createAuditLog({
        userId,
        workspaceId,
        action: 'create',
        entityType: 'task',
        entityId: task.id,
        changes: { new: data },
      });
    }

    // Create outbox event for sync
    await createOutboxEvent({
      eventType: 'task.created',
      aggregateType: 'task',
      aggregateId: task.id,
      payload: { task },
    });

    return task;
  });
}

export async function getTaskById(id: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
  return task ?? null;
}

export async function getTasksByWorkspace(workspaceId: string, limit = 50, cursor?: string) {
  const conditions = [eq(tasks.workspaceId, workspaceId)];

  if (cursor) {
    conditions.push(gt(tasks.createdAt, new Date(cursor)));
  }

  const results = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.dueDate), desc(tasks.priority), asc(tasks.createdAt))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, -1) : results;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

export async function getTasksByProject(projectId: string) {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.dueDate), desc(tasks.priority));
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
}) {
  const conditions = [eq(tasks.workspaceId, filters.workspaceId)];

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
  let query = db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.dueDate), desc(tasks.priority))
    .limit(limit);

  if (filters.cursor) {
    query = query.where(sql`${tasks.id} > ${filters.cursor}`);
  }

  const items = await query;
  const hasMore = items.length === limit;
  const nextCursor = hasMore ? items[items.length - 1].id : undefined;

  return { items, nextCursor, hasMore };
}

// Full-text search function with ranking
export async function searchTasks(workspaceId: string, query: string, limit = 20) {
  return db
    .select({
      task: tasks,
      rank: sql<number>`ts_rank(${tasks.searchVector}, plainto_tsquery('english', ${query}))`.as('rank'),
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
  userId?: string,
  workspaceId?: string,
) {
  return withTransaction(async (tx) => {
    const updateData: Partial<typeof schema.tasks.$inferInsert> = { ...data, updatedAt: new Date() };

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

    // Create audit log
    if (userId && workspaceId) {
      await createAuditLog({
        userId,
        workspaceId,
        action: 'update',
        entityType: 'task',
        entityId: task.id,
        changes: { old: {}, new: data },
      });
    }

    // Create outbox event for sync
    await createOutboxEvent({
      eventType: 'task.updated',
      aggregateType: 'task',
      aggregateId: task.id,
      payload: { task },
    });

    return task;
  });
}

export async function deleteTask(id: string, userId?: string, workspaceId?: string) {
  return withTransaction(async (tx) => {
    const [task] = await tx
      .update(tasks)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();

    if (!task) {
      throw new Error('Failed to delete task');
    }

    // Create audit log
    if (userId && workspaceId) {
      await createAuditLog({
        userId,
        workspaceId,
        action: 'delete',
        entityType: 'task',
        entityId: task.id,
        changes: { old: { status: task.status } },
      });
    }

    // Create outbox event for sync
    await createOutboxEvent({
      eventType: 'task.deleted',
      aggregateType: 'task',
      aggregateId: task.id,
      payload: { task },
    });

    return task;
  });
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
export async function createTaskNote(data: typeof schema.taskNotes.$inferInsert) {
  const [note] = await db.insert(taskNotes).values(data).returning();
  return note;
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
) {
  const [note] = await db
    .update(taskNotes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(taskNotes.id, id))
    .returning();
  return note;
}

export async function deleteTaskNote(id: string) {
  const [note] = await db.delete(taskNotes).where(eq(taskNotes.id, id)).returning();
  return note;
}

// Batch Task Operations
export async function batchCompleteTasks(taskIds: string[]) {
  return db
    .update(tasks)
    .set({
      status: 'done',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(inArray(tasks.id, taskIds))
    .returning();
}

export async function batchDeferTasks(taskIds: string[], deferToDate: Date) {
  return db
    .update(tasks)
    .set({
      dueDate: deferToDate,
      updatedAt: new Date(),
    })
    .where(inArray(tasks.id, taskIds))
    .returning();
}

export async function batchRescheduleTasks(taskIds: string[], newDueDate: Date) {
  return db
    .update(tasks)
    .set({
      dueDate: newDueDate,
      updatedAt: new Date(),
    })
    .where(inArray(tasks.id, taskIds))
    .returning();
}

export async function batchUpdateTaskStatus(taskIds: string[], newStatus: string) {
  const updateData: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };

  if (newStatus === 'done') {
    updateData.completedAt = new Date();
  } else {
    updateData.completedAt = null;
  }

  return db.update(tasks).set(updateData).where(inArray(tasks.id, taskIds)).returning();
}

// Task Assignee Operations
export async function createTaskAssignee(data: typeof schema.taskAssignees.$inferInsert) {
  const [assignee] = await db.insert(taskAssignees).values(data).returning();
  return assignee;
}

export async function getTaskAssignees(taskId: string) {
  return db.select().from(taskAssignees).where(eq(taskAssignees.taskId, taskId));
}

export async function deleteTaskAssignee(id: string) {
  const [assignee] = await db.delete(taskAssignees).where(eq(taskAssignees.id, id)).returning();
  return assignee;
}

// Task Comment Operations
export async function createTaskComment(data: typeof schema.taskComments.$inferInsert) {
  const [comment] = await db.insert(taskComments).values(data).returning();
  return comment;
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
) {
  const [comment] = await db
    .update(taskComments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(taskComments.id, id))
    .returning();
  return comment;
}

export async function deleteTaskComment(id: string) {
  const [comment] = await db.delete(taskComments).where(eq(taskComments.id, id)).returning();
  return comment;
}

// Task Attachment Operations
export async function createTaskAttachment(data: typeof schema.taskAttachments.$inferInsert) {
  const [attachment] = await db.insert(taskAttachments).values(data).returning();
  return attachment;
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

export async function deleteTaskAttachment(id: string) {
  const [attachment] = await db
    .delete(taskAttachments)
    .where(eq(taskAttachments.id, id))
    .returning();
  return attachment;
}

// Time Entry Operations
export async function createTimeEntry(data: typeof schema.timeEntries.$inferInsert) {
  const [entry] = await db.insert(timeEntries).values(data).returning();
  return entry;
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
) {
  const [entry] = await db
    .update(timeEntries)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(timeEntries.id, id))
    .returning();
  return entry;
}

export async function deleteTimeEntry(id: string) {
  const [entry] = await db.delete(timeEntries).where(eq(timeEntries.id, id)).returning();
  return entry;
}

// Transaction-based complex operations

// Create task with dependencies in a single transaction
export async function createTaskWithDependencies(
  taskData: typeof schema.tasks.$inferInsert,
  dependencies: Array<{ dependsOnTaskId: string; type: string }>,
) {
  return withTransaction(async (tx) => {
    const [task] = await tx.insert(tasks).values(taskData).returning();

    if (dependencies.length > 0) {
      await tx.insert(taskDependencies).values(
        dependencies.map((dep) => ({
          taskId: task.id,
          dependsOnTaskId: dep.dependsOnTaskId,
          type: dep.type,
        })),
      );
    }

    return task;
  });
}

// Create task with assignees in a single transaction
export async function createTaskWithAssignees(
  taskData: typeof schema.tasks.$inferInsert,
  assignees: Array<{ userId: string; assignedBy: string; isPrimary?: boolean }>,
) {
  return withTransaction(async (tx) => {
    const [task] = await tx.insert(tasks).values(taskData).returning();

    if (assignees.length > 0) {
      await tx.insert(taskAssignees).values(
        assignees.map((assignee) => ({
          taskId: task.id,
          userId: assignee.userId,
          assignedBy: assignee.assignedBy,
          isPrimary: assignee.isPrimary ?? false,
        })),
      );
    }

    return task;
  });
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
