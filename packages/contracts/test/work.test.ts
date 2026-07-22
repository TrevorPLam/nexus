import { describe, it, expect } from 'vitest';

import {
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectResponse,
  CreateTaskRequest,
  TaskResponse,
  CreateTaskDependencyRequest,
  CreateTaskNoteRequest,
  UpdateTaskNoteRequest,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  EnergyLevel,
  DependencyType,
} from '../src/work';

describe('Work Contracts', () => {
  describe('Project Contracts', () => {
    it('accepts valid create project request', () => {
      const result = CreateProjectRequest.parse({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'My Project',
        description: 'A test project',
        color: '#FF0000',
        icon: 'folder',
      });
      expect(result.name).toBe('My Project');
    });

    it('accepts minimal create project request', () => {
      const result = CreateProjectRequest.parse({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'My Project',
      });
      expect(result.name).toBe('My Project');
      expect(result.description).toBeUndefined();
    });

    it('rejects create project without workspaceId', () => {
      expect(() =>
        CreateProjectRequest.parse({
          name: 'My Project',
        }),
      ).toThrow();
    });

    it('rejects create project without name', () => {
      expect(() =>
        CreateProjectRequest.parse({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        }),
      ).toThrow();
    });

    it('rejects invalid color format', () => {
      expect(() =>
        CreateProjectRequest.parse({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'My Project',
          color: 'red',
        }),
      ).toThrow();
    });

    it('accepts valid update project request', () => {
      const result = UpdateProjectRequest.parse({
        name: 'Updated Project',
      });
      expect(result.name).toBe('Updated Project');
    });

    it('accepts empty update project request', () => {
      const result = UpdateProjectRequest.parse({});
      expect(result).toEqual({});
    });

    it('project response includes all fields', () => {
      const result = ProjectResponse.parse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'My Project',
        description: 'A test project',
        color: '#FF0000',
        icon: 'folder',
        status: ProjectStatus.enum.active,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(result.id).toBeDefined();
      expect(result.status).toBe(ProjectStatus.enum.active);
    });
  });

  describe('Task Contracts', () => {
    it('accepts valid create task request', () => {
      const result = CreateTaskRequest.parse({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'My Task',
        status: TaskStatus.enum.todo,
        priority: TaskPriority.enum.medium,
        energyLevel: EnergyLevel.enum.high,
      });
      expect(result.title).toBe('My Task');
    });

    it('applies default status and priority', () => {
      const result = CreateTaskRequest.parse({
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'My Task',
      });
      expect(result.status).toBe(TaskStatus.enum.todo);
      expect(result.priority).toBe(TaskPriority.enum.medium);
    });

    it('rejects invalid task status', () => {
      expect(() =>
        CreateTaskRequest.parse({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'My Task',
          status: 'invalid' as const,
        }),
      ).toThrow();
    });

    it('rejects invalid datetime format for dueDate', () => {
      expect(() =>
        CreateTaskRequest.parse({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'My Task',
          dueDate: 'not-a-date',
        }),
      ).toThrow();
    });

    it('rejects invalid time format for dueTime', () => {
      expect(() =>
        CreateTaskRequest.parse({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'My Task',
          dueTime: '25:00',
        }),
      ).toThrow();
    });

    it('rejects negative estimated duration', () => {
      expect(() =>
        CreateTaskRequest.parse({
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'My Task',
          estimatedDuration: -10,
        }),
      ).toThrow();
    });

    it('task response uses number for estimatedDuration', () => {
      const result = TaskResponse.parse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'My Task',
        description: null,
        status: TaskStatus.enum.todo,
        priority: TaskPriority.enum.medium,
        dueDate: null,
        dueTime: null,
        estimatedDuration: 60,
        completedAt: null,
        projectId: null,
        parentId: null,
        calendarEventId: null,
        recurrenceRule: null,
        recurrenceId: null,
        energyLevel: EnergyLevel.enum.high,
        contextTags: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(typeof result.estimatedDuration).toBe('number');
      expect(result.estimatedDuration).toBe(60);
    });

    it('task response uses enum for energyLevel', () => {
      const result = TaskResponse.parse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'My Task',
        description: null,
        status: TaskStatus.enum.todo,
        priority: TaskPriority.enum.medium,
        dueDate: null,
        dueTime: null,
        estimatedDuration: null,
        completedAt: null,
        projectId: null,
        parentId: null,
        calendarEventId: null,
        recurrenceRule: null,
        recurrenceId: null,
        energyLevel: EnergyLevel.enum.high,
        contextTags: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(result.energyLevel).toBe(EnergyLevel.enum.high);
    });
  });

  describe('Task Dependency Contracts', () => {
    it('accepts valid create dependency request', () => {
      const result = CreateTaskDependencyRequest.parse({
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        dependsOnTaskId: '123e4567-e89b-12d3-a456-426614174001',
        type: DependencyType.enum.finish_to_start,
      });
      expect(result.type).toBe(DependencyType.enum.finish_to_start);
    });

    it('applies default dependency type', () => {
      const result = CreateTaskDependencyRequest.parse({
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        dependsOnTaskId: '123e4567-e89b-12d3-a456-426614174001',
      });
      expect(result.type).toBe(DependencyType.enum.finish_to_start);
    });

    it('rejects invalid dependency type', () => {
      expect(() =>
        CreateTaskDependencyRequest.parse({
          taskId: '123e4567-e89b-12d3-a456-426614174000',
          dependsOnTaskId: '123e4567-e89b-12d3-a456-426614174001',
          type: 'invalid' as const,
        }),
      ).toThrow();
    });
  });

  describe('Task Note Contracts', () => {
    it('accepts valid create note request', () => {
      const result = CreateTaskNoteRequest.parse({
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'This is a note',
      });
      expect(result.content).toBe('This is a note');
    });

    it('rejects empty content', () => {
      expect(() =>
        CreateTaskNoteRequest.parse({
          taskId: '123e4567-e89b-12d3-a456-426614174000',
          content: '',
        }),
      ).toThrow();
    });

    it('rejects content over max length', () => {
      expect(() =>
        CreateTaskNoteRequest.parse({
          taskId: '123e4567-e89b-12d3-a456-426614174000',
          content: 'a'.repeat(10001),
        }),
      ).toThrow();
    });

    it('update note request does not include taskId', () => {
      const result = UpdateTaskNoteRequest.parse({
        content: 'Updated note',
      });
      expect(result.content).toBe('Updated note');
      expect('taskId' in result).toBe(false);
    });
  });
});
