import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { db } from '../lib/db';
import { tasks, events } from '@life-os/database';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const integrationRouter = new Hono();

// Schema for creating a task with calendar event
const CreateTaskWithEventSchema = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z.string().datetime().optional(),
  dueTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  estimatedDuration: z.number().int().positive().optional(),
  createCalendarEvent: z.boolean().default(false),
  calendarId: z.string().uuid().optional(),
});

// Create task with optional calendar event
integrationRouter.post('/tasks-with-event', validator('json', (value, c) => {
  const parsed = CreateTaskWithEventSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
  }
  return parsed.data;
}), async (c) => {
  const data = c.req.valid('json');
  
  try {
    // Create the task
    const [task] = await db.insert(tasks).values({
      workspaceId: data.workspaceId,
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      dueTime: data.dueTime,
      estimatedDuration: data.estimatedDuration ? String(data.estimatedDuration) : null,
    }).returning();

    // If createCalendarEvent is true and dueDate is provided, create a calendar event
    if (data.createCalendarEvent && data.dueDate && data.calendarId) {
      const dueDate = new Date(data.dueDate);
      const duration = data.estimatedDuration || 60; // Default 1 hour
      const startTime = dueDate;
      const endTime = new Date(dueDate.getTime() + duration * 60000);

      const [event] = await db.insert(events).values({
        workspaceId: data.workspaceId,
        calendarId: data.calendarId,
        title: data.title,
        description: data.description,
        start: startTime,
        end: endTime,
        timezone: 'UTC',
        taskId: task.id,
      }).returning();

      // Update task with calendar event ID
      await db.update(tasks)
        .set({ calendarEventId: event.id })
        .where(eq(tasks.id, task.id));

      return c.json({ task, event }, 201);
    }

    return c.json({ task }, 201);
  } catch (error) {
    console.error('Error creating task with event:', error);
    return c.json({ error: 'Failed to create task with event' }, 500);
  }
});

// Link existing task to calendar event
integrationRouter.post('/link-task-event', validator('json', (value, c) => {
  const schema = z.object({
    taskId: z.string().uuid(),
    eventId: z.string().uuid(),
  });
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
  }
  return parsed.data;
}), async (c) => {
  const { taskId, eventId } = c.req.valid('json');

  try {
    const [task] = await db.update(tasks)
      .set({ calendarEventId: eventId })
      .where(eq(tasks.id, taskId))
      .returning();

    return c.json({ task });
  } catch (error) {
    console.error('Error linking task to event:', error);
    return c.json({ error: 'Failed to link task to event' }, 500);
  }
});

// Unlink task from calendar event
integrationRouter.post('/unlink-task-event', validator('json', (value, c) => {
  const schema = z.object({
    taskId: z.string().uuid(),
  });
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request data', details: parsed.error }, 400);
  }
  return parsed.data;
}), async (c) => {
  const { taskId } = c.req.valid('json');

  try {
    const [task] = await db.update(tasks)
      .set({ calendarEventId: null })
      .where(eq(tasks.id, taskId))
      .returning();

    return c.json({ task });
  } catch (error) {
    console.error('Error unlinking task from event:', error);
    return c.json({ error: 'Failed to unlink task from event' }, 500);
  }
});

// Get tasks with their linked calendar events
integrationRouter.get('/tasks-with-events/:workspaceId', async (c) => {
  const workspaceId = c.req.param('workspaceId');

  try {
    const tasksWithEvents = await db.query.tasks.findMany({
      where: eq(tasks.workspaceId, workspaceId),
      with: {
        calendarEvent: true,
      },
    });

    return c.json({ tasks: tasksWithEvents });
  } catch (error) {
    console.error('Error fetching tasks with events:', error);
    return c.json({ error: 'Failed to fetch tasks with events' }, 500);
  }
});

export default integrationRouter;
