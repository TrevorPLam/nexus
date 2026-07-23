/**
 * MODULE: Kanban Board View Component
 *
 * Responsibility:
 * Renders tasks in a Kanban board layout with columns for each status
 * (todo, in_progress, done, cancelled). Supports task creation and
 * status-based filtering.
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: kanban, board, tasks
 *
 * File:
 * - apps/web/src/app/work/components/KanbanView.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

'use client';

import { Button } from '@life-os/ui';
import { Plus, MoreHorizontal, Clock, GripVertical } from 'lucide-react';
import { useState } from 'react';

import type { Task, Project } from '../types';

interface KanbanViewProps {
  tasks: Task[];
  projects: Project[];
  selectedProject: string | null;
  onTaskDelete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onNewTask: () => void;
  onProjectFilter: (projectId: string | null) => void;
  onTaskStatusChange: (taskId: string, newStatus: Task['status']) => void;
}

const columns = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'done', title: 'Done', color: 'bg-green-100' },
  { id: 'cancelled', title: 'Cancelled', color: 'bg-red-100' },
];

const priorityColors = {
  low: 'bg-gray-200 text-gray-700',
  medium: 'bg-blue-200 text-blue-700',
  high: 'bg-orange-200 text-orange-700',
  urgent: 'bg-red-200 text-red-700',
};

export function KanbanView({
  tasks,
  projects,
  selectedProject,
  onTaskDelete,
  onTaskClick,
  onNewTask,
  onProjectFilter,
  onTaskStatusChange,
}: KanbanViewProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => {
      const matchesStatus = task.status === status;
      const matchesProject = !selectedProject || task.projectId === selectedProject;
      return matchesStatus && matchesProject;
    });
  };

  const getProjectColor = (projectId: string | null) => {
    if (!projectId) return '#3b82f6';
    const project = projects.find((p) => p.id === projectId);
    return project?.color || '#3b82f6';
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'No Project';
    const project = projects.find((p) => p.id === projectId);
    return project?.name || 'Unknown';
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== columnId) {
      onTaskStatusChange(draggedTask.id, columnId as Task['status']);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <select
            value={selectedProject || ''}
            onChange={(e) => onProjectFilter(e.target.value || null)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button onPress={onNewTask}>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => (
          <div key={column.id} className="flex flex-col h-full">
            <div
              className={`${column.color} px-4 py-2 rounded-t-lg flex items-center justify-between`}
            >
              <h3 className="font-semibold text-sm">{column.title}</h3>
              <span className="text-xs bg-white px-2 py-0.5 rounded-full">
                {getTasksByStatus(column.id).length}
              </span>
            </div>
            <div
              className={`flex-1 p-3 rounded-b-lg border border-t-0 min-h-[400px] transition-colors ${
                dragOverColumn === column.id
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-gray-50 border-gray-200'
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="space-y-2">
                {getTasksByStatus(column.id).map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white p-3 rounded-lg border shadow-sm transition-all cursor-pointer ${
                      draggedTask?.id === task.id
                        ? 'border-blue-400 shadow-lg opacity-50'
                        : 'border-gray-200 hover:shadow-md'
                    }`}
                    onClick={() => onTaskClick(task)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                        <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskDelete(task.id);
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getProjectColor(task.projectId) }}
                      />
                      <span className="text-xs text-gray-500">
                        {getProjectName(task.projectId)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${priorityColors[task.priority]}`}
                      >
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {task.energyLevel && (
                      <div className="mt-2 text-xs text-gray-500">Energy: {task.energyLevel}</div>
                    )}
                  </div>
                ))}
                {getTasksByStatus(column.id).length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">No tasks</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
