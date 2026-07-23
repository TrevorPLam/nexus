import { describe, it, expect } from 'vitest';

import { useTaskFilters } from './useTaskFilters';

describe('useTaskFilters', () => {
  it('exports useTaskFilters hook', () => {
    expect(useTaskFilters).toBeDefined();
    expect(typeof useTaskFilters).toBe('function');
  });

  it('manages filter state', () => {
    const tasks = [
      {
        id: '1',
        title: 'Task 1',
        status: 'todo',
        priority: 'high',
        dueDate: '2024-01-01',
        projectId: 'proj-1',
        parentId: null,
      },
      {
        id: '2',
        title: 'Task 2',
        status: 'done',
        priority: 'high',
        dueDate: '2024-01-02',
        projectId: 'proj-1',
        parentId: null,
      },
      {
        id: '3',
        title: 'Task 3',
        status: 'todo',
        priority: 'medium',
        dueDate: '2024-01-03',
        projectId: 'proj-2',
        parentId: null,
      },
    ];

    const { getTasksByStatus } = useTaskFilters(tasks, 'proj-1', 'high');

    const todoTasks = getTasksByStatus('todo');
    expect(todoTasks).toHaveLength(1);
    expect(todoTasks[0].id).toBe('1');

    const doneTasks = getTasksByStatus('done');
    expect(doneTasks).toHaveLength(1);
    expect(doneTasks[0].id).toBe('2');
  });
  it('resets filters to default', () => {
    const tasks = [
      {
        id: '1',
        title: 'Task 1',
        status: 'todo',
        priority: 'high',
        dueDate: '2024-01-01',
        projectId: 'proj-1',
        parentId: null,
      },
      {
        id: '2',
        title: 'Task 2',
        status: 'todo',
        priority: 'low',
        dueDate: '2024-01-02',
        projectId: 'proj-2',
        parentId: null,
      },
      {
        id: '3',
        title: 'Task 3',
        status: 'done',
        priority: 'medium',
        dueDate: '2024-01-03',
        projectId: 'proj-1',
        parentId: null,
      },
    ];

    const { getTasksByStatus } = useTaskFilters(tasks, null, null);

    const todoTasks = getTasksByStatus('todo');
    expect(todoTasks).toHaveLength(2);
    expect(todoTasks.map((t) => t.id)).toEqual(['1', '2']);

    const doneTasks = getTasksByStatus('done');
    expect(doneTasks).toHaveLength(1);
    expect(doneTasks[0].id).toBe('3');
  });
  it('applies multiple filters', () => {
    const tasks = [
      {
        id: '1',
        title: 'Task 1',
        status: 'todo',
        priority: 'high',
        dueDate: '2024-01-01',
        projectId: 'proj-1',
        parentId: null,
      },
      {
        id: '2',
        title: 'Task 2',
        status: 'todo',
        priority: 'high',
        dueDate: '2024-01-02',
        projectId: 'proj-2',
        parentId: null,
      },
      {
        id: '3',
        title: 'Task 3',
        status: 'todo',
        priority: 'low',
        dueDate: '2024-01-03',
        projectId: 'proj-1',
        parentId: null,
      },
      {
        id: '4',
        title: 'Task 4',
        status: 'done',
        priority: 'high',
        dueDate: '2024-01-04',
        projectId: 'proj-1',
        parentId: null,
      },
    ];

    const { getTasksByStatus } = useTaskFilters(tasks, 'proj-1', 'high');

    const filteredTasks = getTasksByStatus('todo');
    expect(filteredTasks).toHaveLength(1);
    expect(filteredTasks[0].id).toBe('1');
    expect(filteredTasks[0].projectId).toBe('proj-1');
    expect(filteredTasks[0].priority).toBe('high');
  });
});
