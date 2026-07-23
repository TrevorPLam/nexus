'use client';

import { Button } from '@life-os/ui';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';

import type { Task, Project } from '../types';

interface TaskCalendarViewProps {
  tasks: Task[];
  projects: Project[];
  selectedProject: string | null;
  currentDate: Date;
  onTaskClick: (task: Task) => void;
  onNewTask: (date: Date) => void;
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

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TaskCalendarView({
  tasks,
  projects,
  selectedProject,
  currentDate,
  onTaskClick,
  onNewTask,
  onProjectFilter,
  onNavigatePrev,
  onNavigateNext,
}: TaskCalendarViewProps) {
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const getFilteredTasks = () => {
    return tasks.filter((task) => {
      const matchesProject = !selectedProject || task.projectId === selectedProject;
      const hasDueDate = task.dueDate !== null;
      return matchesProject && hasDueDate;
    });
  };

  const getTasksForDate = (date: Date) => {
    return getFilteredTasks().filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getProjectColor = (projectId: string | null) => {
    if (!projectId) return '#3b82f6';
    const project = projects.find((p) => p.id === projectId);
    return project?.color || '#3b82f6';
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const calendarDays = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  }

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
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {dayNames.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-600 bg-gray-50">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="min-h-[100px] bg-gray-50" />;
            }

            const dayTasks = getTasksForDate(date);
            const today = isToday(date);

            return (
              <div
                key={date.toISOString()}
                className={`min-h-[100px] p-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                  today ? 'bg-blue-50' : 'bg-white'
                }`}
                onClick={() => onNewTask(date)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-medium ${
                      today ? 'text-blue-600' : 'text-gray-900'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {today && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick(task);
                      }}
                      className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                      style={{
                        backgroundColor: getProjectColor(task.projectId),
                        color: 'white',
                      }}
                    >
                      {task.status === 'done' && (
                        <CheckCircle2 className="w-3 h-3 inline mr-1" />
                      )}
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500 pl-1">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Completed tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          <span>Click day to add task</span>
        </div>
      </div>
    </div>
  );
}
