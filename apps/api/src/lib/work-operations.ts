import { eq, and, desc, asc, or, like, sql, gt, inArray } from 'drizzle-orm';
import { db } from './db';
import * as schema from '@life-os/database';
import { projects, tasks, taskDependencies, taskNotes } from '@life-os/database';

// Project Operations
export async function createProject(data: typeof schema.projects.$inferInsert) {
  const [project] = await db.insert(projects).values(data).returning();
  return project;
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

  const results = await db.select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(desc(projects.createdAt))
    .limit(limit + 1); // Fetch one extra to determine if there's a next page

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, -1) : results;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

export async function updateProject(id: string, data: Partial<typeof schema.projects.$inferInsert>) {
  const [project] = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return project;
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
export async function createTask(data: typeof schema.tasks.$inferInsert) {
  const [task] = await db.insert(tasks).values(data).returning();
  return task;
}

export async function getTaskById(id: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
  return task;
}

export async function getTasksByWorkspace(workspaceId: string, limit = 50, cursor?: string) {
  const conditions = [eq(tasks.workspaceId, workspaceId)];
  
  if (cursor) {
    conditions.push(gt(tasks.createdAt, new Date(cursor)));
  }

  const results = await db.select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.dueDate), desc(tasks.priority), asc(tasks.createdAt))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, -1) : results;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

export async function getTasksByProject(projectId: string) {
  return db.select()
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
    conditions.push(
      or(
        like(tasks.title, `%${filters.searchQuery}%`),
        like(tasks.description, `%${filters.searchQuery}%`)
      )
    );
  }
  
  if (filters.dueBefore) {
    conditions.push(sql`${tasks.dueDate} <= ${filters.dueBefore}`);
  }
  
  if (filters.dueAfter) {
    conditions.push(sql`${tasks.dueDate} >= ${filters.dueAfter}`);
  }
  
  return db.select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.dueDate), desc(tasks.priority));
}

export async function updateTask(id: string, data: Partial<typeof schema.tasks.$inferInsert>) {
  const updateData: Partial<typeof schema.tasks.$inferInsert> = { ...data, updatedAt: new Date() };
  
  // Auto-set completedAt when status is 'done'
  if (data.status === 'done' && !data.completedAt) {
    updateData.completedAt = new Date();
  }
  
  // Clear completedAt when status is not 'done'
  if (data.status && data.status !== 'done') {
    updateData.completedAt = null;
  }
  
  const [task] = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, id))
    .returning();
  return task;
}

export async function deleteTask(id: string) {
  const [task] = await db
    .update(tasks)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  return task;
}

// Task Dependency Operations
export async function createTaskDependency(data: typeof schema.taskDependencies.$inferInsert) {
  const [dependency] = await db.insert(taskDependencies).values(data).returning();
  return dependency;
}

export async function getTaskDependencies(taskId: string) {
  return db.select()
    .from(taskDependencies)
    .where(eq(taskDependencies.taskId, taskId));
}

export async function deleteTaskDependency(id: string) {
  const [dependency] = await db
    .delete(taskDependencies)
    .where(eq(taskDependencies.id, id))
    .returning();
  return dependency;
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
    })
  );
  
  return {
    items: projectsWithTasks,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
  };
}

// Subtask Operations
export async function getSubtasks(parentTaskId: string) {
  return db.select()
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
  return db.select()
    .from(taskNotes)
    .where(eq(taskNotes.taskId, taskId))
    .orderBy(desc(taskNotes.createdAt));
}

export async function updateTaskNote(id: string, data: Partial<typeof schema.taskNotes.$inferInsert>) {
  const [note] = await db
    .update(taskNotes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(taskNotes.id, id))
    .returning();
  return note;
}

export async function deleteTaskNote(id: string) {
  const [note] = await db
    .delete(taskNotes)
    .where(eq(taskNotes.id, id))
    .returning();
  return note;
}

// Batch Task Operations
export async function batchCompleteTasks(taskIds: string[]) {
  return db
    .update(tasks)
    .set({ 
      status: 'done', 
      completedAt: new Date(), 
      updatedAt: new Date() 
    })
    .where(inArray(tasks.id, taskIds))
    .returning();
}

export async function batchDeferTasks(taskIds: string[], deferToDate: Date) {
  return db
    .update(tasks)
    .set({ 
      dueDate: deferToDate, 
      updatedAt: new Date() 
    })
    .where(inArray(tasks.id, taskIds))
    .returning();
}

export async function batchRescheduleTasks(taskIds: string[], newDueDate: Date) {
  return db
    .update(tasks)
    .set({ 
      dueDate: newDueDate, 
      updatedAt: new Date() 
    })
    .where(inArray(tasks.id, taskIds))
    .returning();
}

export async function batchUpdateTaskStatus(taskIds: string[], newStatus: string) {
  const updateData: any = { status: newStatus, updatedAt: new Date() };
  
  if (newStatus === 'done') {
    updateData.completedAt = new Date();
  } else {
    updateData.completedAt = null;
  }
  
  return db
    .update(tasks)
    .set(updateData)
    .where(inArray(tasks.id, taskIds))
    .returning();
}
