'use client';

import { Button } from '@life-os/ui';
import { ChevronLeft, ChevronRight, Plus, Calendar, Diamond } from 'lucide-react';

import type { Task, Project } from '../types';

interface TimelineViewProps {
  tasks: Task[];
  projects: Project[];
  selectedProject: string | null;
  currentDate: Date;
  onTaskClick: (task: Task) => void;
  onNewTask: () => void;
  onProjectFilter: (projectId: string | null) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
}

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function TimelineView({
  tasks,
  projects,
  selectedProject,
  currentDate,
  onTaskClick,
  onNewTask,
  onProjectFilter,
  onNavigatePrev,
  onNavigateNext,
}: TimelineViewProps) {
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    return lastDay.getDate();
  };

  const getFilteredTasks = () => {
    return tasks.filter((task) => {
      const matchesProject = !selectedProject || task.projectId === selectedProject;
      const hasDueDate = task.dueDate !== null;
      const isInCurrentMonth = task.dueDate
        ? new Date(task.dueDate).getMonth() === currentDate.getMonth() &&
          new Date(task.dueDate).getFullYear() === currentDate.getFullYear()
        : false;
      return matchesProject && hasDueDate && isInCurrentMonth;
    });
  };

  const getMilestones = () => {
    return tasks.filter((task) => {
      const matchesProject = !selectedProject || task.projectId === selectedProject;
      const hasDueDate = task.dueDate !== null;
      const isInCurrentMonth = task.dueDate
        ? new Date(task.dueDate).getMonth() === currentDate.getMonth() &&
          new Date(task.dueDate).getFullYear() === currentDate.getFullYear()
        : false;
      return matchesProject && hasDueDate && isInCurrentMonth && task.isMilestone;
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

  const getTaskPosition = (task: Task) => {
    if (!task.dueDate) return { left: 0, width: 0 };
    const dueDate = new Date(task.dueDate);
    const dayOfMonth = dueDate.getDate();
    const daysInMonth = getDaysInMonth(currentDate);
    const dayWidth = 100 / daysInMonth;
    const estimatedDays = task.estimatedDuration
      ? Math.max(1, Math.ceil(task.estimatedDuration / (8 * 60))) // Assume 8-hour workday
      : 1;
    return {
      left: (dayOfMonth - 1) * dayWidth,
      width: Math.min(estimatedDays * dayWidth, 100 - (dayOfMonth - 1) * dayWidth),
    };
  };

  const filteredTasks = getFilteredTasks();
  const milestones = getMilestones();
  const daysInMonth = getDaysInMonth(currentDate);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onPress={onNavigatePrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <Button variant="secondary" onPress={onNavigateNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
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
          <Button onPress={onNewTask}>
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Timeline Header */}
        <div className="flex border-b border-gray-200">
          <div className="w-64 flex-shrink-0 p-3 bg-gray-50 border-r border-gray-200 font-semibold text-sm">
            Task
          </div>
          <div className="flex-1 flex">
            {Array.from({ length: daysInMonth }, (_, i) => (
              <div
                key={i}
                className="flex-1 p-2 text-center text-xs border-r border-gray-100 last:border-r-0"
              >
                <div className="font-medium text-gray-600">{i + 1}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Body */}
        <div className="divide-y divide-gray-100">
          {filteredTasks.length === 0 && milestones.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No tasks with due dates in this month</p>
              <p className="text-sm mt-1">Add due dates to tasks to see them on the timeline</p>
            </div>
          ) : (
            <>
              {/* Milestones */}
              {milestones.map((milestone) => {
                const position = getTaskPosition(milestone);
                return (
                  <div key={milestone.id} className="flex hover:bg-gray-50 bg-amber-50">
                    <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <Diamond className="w-4 h-4 text-amber-600" />
                        <div
                          className="font-medium text-sm cursor-pointer hover:text-blue-600 truncate"
                          onClick={() => onTaskClick(milestone)}
                        >
                          {milestone.title}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getProjectColor(milestone.projectId) }}
                        />
                        <span className="text-xs text-gray-500 truncate">
                          {getProjectName(milestone.projectId)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 relative p-2 min-h-[48px]">
                      <div
                        className="absolute top-2 bottom-2 rounded-md cursor-pointer hover:opacity-80 transition-opacity flex items-center px-2"
                        style={{
                          left: `${position.left}%`,
                          width: '20px',
                          backgroundColor: '#f59e0b',
                        }}
                        onClick={() => onTaskClick(milestone)}
                      >
                        <Diamond className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Regular Tasks */}
              {filteredTasks.map((task) => {
                const position = getTaskPosition(task);
                return (
                  <div key={task.id} className="flex hover:bg-gray-50">
                    <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200">
                      <div
                        className="font-medium text-sm cursor-pointer hover:text-blue-600 truncate"
                        onClick={() => onTaskClick(task)}
                      >
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getProjectColor(task.projectId) }}
                        />
                        <span className="text-xs text-gray-500 truncate">
                          {getProjectName(task.projectId)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 relative p-2 min-h-[48px]">
                      <div
                        className="absolute top-2 bottom-2 rounded-md cursor-pointer hover:opacity-80 transition-opacity flex items-center px-2"
                        style={{
                          left: `${position.left}%`,
                          width: `${position.width}%`,
                          backgroundColor: getProjectColor(task.projectId),
                        }}
                        onClick={() => onTaskClick(task)}
                      >
                        <span className="text-xs text-white font-medium truncate">
                          {task.title}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Project colors indicate task association</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span>Bar width based on estimated duration</span>
        </div>
      </div>
    </div>
  );
}
