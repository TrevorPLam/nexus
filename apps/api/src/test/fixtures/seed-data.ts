import * as schema from '@life-os/database';
import { eq } from 'drizzle-orm';

import { db } from '../../lib/db.js';

/**
 * Deterministic test fixtures for integration tests
 * Provides consistent test data across API, RLS, and transaction tests
 */

export interface TestFixtures {
  user1: { id: string; supabaseUserId: string; email: string };
  user2: { id: string; supabaseUserId: string; email: string };
  workspace1: { id: string; name: string };
  workspace2: { id: string; name: string };
  project1: { id: string; name: string; workspaceId: string };
  project2: { id: string; name: string; workspaceId: string };
  task1: { id: string; title: string; workspaceId: string; projectId: string | null };
  task2: { id: string; title: string; workspaceId: string; projectId: string | null };
  calendar1: { id: string; name: string; workspaceId: string };
  event1: { id: string; title: string; workspaceId: string; calendarId: string };
}

/**
 * Seed deterministic test data for two users and two workspaces
 * Use this in integration tests to ensure consistent state
 */
export async function seedTestFixtures(): Promise<TestFixtures> {
  // Create test users
  const user1Result = await db
    .insert(schema.appUsers)
    .values({
      supabaseUserId: '00000000-0000-0000-0000-000000000001',
      email: 'user1@test.com',
      fullName: 'User One',
    })
    .returning();
  const user1 = user1Result[0];

  const user2Result = await db
    .insert(schema.appUsers)
    .values({
      supabaseUserId: '00000000-0000-0000-0000-000000000002',
      email: 'user2@test.com',
      fullName: 'User Two',
    })
    .returning();
  const user2 = user2Result[0];

  if (!user1 || !user2) {
    throw new Error('Failed to create test users');
  }

  // Create test workspaces
  const workspace1Result = await db
    .insert(schema.workspaces)
    .values({
      ownerId: user1.id,
      name: 'Workspace One',
    })
    .returning();
  const workspace1 = workspace1Result[0];

  const workspace2Result = await db
    .insert(schema.workspaces)
    .values({
      ownerId: user2.id,
      name: 'Workspace Two',
    })
    .returning();
  const workspace2 = workspace2Result[0];

  if (!workspace1 || !workspace2) {
    throw new Error('Failed to create test workspaces');
  }

  // Create workspace memberships
  await db.insert(schema.workspaceMemberships).values([
    {
      workspaceId: workspace1.id,
      userId: user1.id,
      role: 'owner',
    },
    {
      workspaceId: workspace2.id,
      userId: user2.id,
      role: 'owner',
    },
  ]);

  // Create test projects
  const project1Result = await db
    .insert(schema.projects)
    .values({
      workspaceId: workspace1.id,
      name: 'Project One',
      status: 'active',
    })
    .returning();
  const project1 = project1Result[0];

  const project2Result = await db
    .insert(schema.projects)
    .values({
      workspaceId: workspace2.id,
      name: 'Project Two',
      status: 'active',
    })
    .returning();
  const project2 = project2Result[0];

  if (!project1 || !project2) {
    throw new Error('Failed to create test projects');
  }

  // Create test tasks
  const task1Result = await db
    .insert(schema.tasks)
    .values({
      workspaceId: workspace1.id,
      projectId: project1.id,
      title: 'Task One',
      status: 'todo',
      priority: 'medium',
    })
    .returning();
  const task1 = task1Result[0];

  const task2Result = await db
    .insert(schema.tasks)
    .values({
      workspaceId: workspace2.id,
      projectId: project2.id,
      title: 'Task Two',
      status: 'todo',
      priority: 'medium',
    })
    .returning();
  const task2 = task2Result[0];

  if (!task1 || !task2) {
    throw new Error('Failed to create test tasks');
  }

  // Create test calendar
  const calendar1Result = await db
    .insert(schema.calendars)
    .values({
      workspaceId: workspace1.id,
      name: 'Calendar One',
      isDefault: true,
    })
    .returning();
  const calendar1 = calendar1Result[0];

  if (!calendar1) {
    throw new Error('Failed to create test calendar');
  }

  // Create test event
  const event1Result = await db
    .insert(schema.events)
    .values({
      workspaceId: workspace1.id,
      calendarId: calendar1.id,
      title: 'Event One',
      start: new Date(),
      end: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    })
    .returning();
  const event1 = event1Result[0];

  if (!event1) {
    throw new Error('Failed to create test event');
  }

  return {
    user1: {
      id: user1.id,
      supabaseUserId: user1.supabaseUserId,
      email: user1.email,
    },
    user2: {
      id: user2.id,
      supabaseUserId: user2.supabaseUserId,
      email: user2.email,
    },
    workspace1: {
      id: workspace1.id,
      name: workspace1.name,
    },
    workspace2: {
      id: workspace2.id,
      name: workspace2.name,
    },
    project1: {
      id: project1.id,
      name: project1.name,
      workspaceId: project1.workspaceId,
    },
    project2: {
      id: project2.id,
      name: project2.name,
      workspaceId: project2.workspaceId,
    },
    task1: {
      id: task1.id,
      title: task1.title,
      workspaceId: task1.workspaceId,
      projectId: task1.projectId,
    },
    task2: {
      id: task2.id,
      title: task2.title,
      workspaceId: task2.workspaceId,
      projectId: task2.projectId,
    },
    calendar1: {
      id: calendar1.id,
      name: calendar1.name,
      workspaceId: calendar1.workspaceId,
    },
    event1: {
      id: event1.id,
      title: event1.title,
      workspaceId: event1.workspaceId,
      calendarId: event1.calendarId,
    },
  };
}

/**
 * Clean up test fixtures
 * Call this in afterAll or afterEach to ensure clean state
 */
export async function cleanupTestFixtures(fixtures: TestFixtures): Promise<void> {
  // Delete in reverse order of creation to respect foreign keys
  await db.delete(schema.events).where(eq(schema.events.id, fixtures.event1.id));
  await db.delete(schema.calendars).where(eq(schema.calendars.id, fixtures.calendar1.id));
  await db.delete(schema.tasks).where(eq(schema.tasks.id, fixtures.task1.id));
  await db.delete(schema.tasks).where(eq(schema.tasks.id, fixtures.task2.id));
  await db.delete(schema.projects).where(eq(schema.projects.id, fixtures.project1.id));
  await db.delete(schema.projects).where(eq(schema.projects.id, fixtures.project2.id));
  await db
    .delete(schema.workspaceMemberships)
    .where(eq(schema.workspaceMemberships.workspaceId, fixtures.workspace1.id));
  await db
    .delete(schema.workspaceMemberships)
    .where(eq(schema.workspaceMemberships.workspaceId, fixtures.workspace2.id));
  await db.delete(schema.workspaces).where(eq(schema.workspaces.id, fixtures.workspace1.id));
  await db.delete(schema.workspaces).where(eq(schema.workspaces.id, fixtures.workspace2.id));
  await db.delete(schema.appUsers).where(eq(schema.appUsers.id, fixtures.user1.id));
  await db.delete(schema.appUsers).where(eq(schema.appUsers.id, fixtures.user2.id));
}
