/**
 * MODULE: Task List View Component
 *
 * Responsibility:
 * Renders tasks in a searchable, filterable list layout with status indicators
 * and inline actions. Supports search, priority filtering, and task creation.
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: list-view, tasks, filtering
 *
 * File:
 * - apps/web/src/app/work/components/ListView.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

'use client';

import { Button } from '@life-os/ui';
import { Plus, Search, MoreHorizontal, Clock, CheckCircle2, Circle } from 'lucide-react';
import { useState } from 'react';

import type { Task, Project } from '../types';

interface ListViewProps {
  tasks: Task[];
  projects: Project[];
  selectedProject: string | null;
  onTaskDelete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onNewTask: () => void;
  onProjectFilter: (projectId: string | null) => void;
  onTaskStatusChange: (taskId: string, newStatus: Task['status']) => void;
}

const priorityColors = {
  low: 'bg-gray-200 text-gray-700',
  medium: 'bg-blue-200 text-blue-700',
  high: 'bg-orange-200 text-orange-700',
  urgent: 'bg-red-200 text-red-700',
};

const statusIcons = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
  cancelled: Circle,
};

export function ListView({
  tasks,
  projects,
  selectedProject,
  onTaskDelete,
  onTaskClick,
  onNewTask,
  onProjectFilter,
  onTaskStatusChange,
}: ListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt'>('dueDate');

  const getFilteredTasks = () => {
    return tasks
      .filter((task) => {
        const matchesProject = !selectedProject || task.projectId === selectedProject;
        const matchesSearch =
          !searchQuery ||
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = !filterStatus || task.status === filterStatus;
        const matchesPriority = !filterPriority || task.priority === filterPriority;
        return matchesProject && matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        if (sortBy === 'dueDate') {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sortBy === 'priority') {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        if (sortBy === 'createdAt') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
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

  const filteredTasks = getFilteredTasks();

  return (
    <div>
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedProject || ''}
                onChange={(e) => onProjectFilter(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus || ''}
                onChange={(e) => setFilterStatus(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Status</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={filterPriority || ''}
                onChange={(e) => setFilterPriority(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'priority' | 'createdAt')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="dueDate">Sort by Due Date</option>
              <option value="priority">Sort by Priority</option>
              <option value="createdAt">Sort by Created</option>
            </select>
            <Button onPress={onNewTask}>
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="divide-y divide-gray-200">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No tasks found</p>
              <p className="text-sm mt-1">Try adjusting your filters or create a new task</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const StatusIcon = statusIcons[task.status];
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => onTaskClick(task)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextStatus =
                        task.status === 'todo'
                          ? 'in_progress'
                          : task.status === 'in_progress'
                            ? 'done'
                            : 'todo';
                      onTaskStatusChange(task.id, nextStatus);
                    }}
                    className={`flex-shrink-0 ${
                      task.status === 'done'
                        ? 'text-green-500'
                        : 'text-gray-400 hover:text-blue-500'
                    }`}
                  >
                    <StatusIcon className="w-5 h-5" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className={`font-medium text-sm ${
                          task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'
                        }`}
                      >
                        {task.title}
                      </h4>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${priorityColors[task.priority]}`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-500 line-clamp-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getProjectColor(task.projectId) }}
                        />
                        <span>{getProjectName(task.projectId)}</span>
                      </div>
                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {task.estimatedDuration && <span>{task.estimatedDuration}m</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskDelete(task.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Showing {filteredTasks.length} of {tasks.length} tasks
      </div>
    </div>
  );
}
