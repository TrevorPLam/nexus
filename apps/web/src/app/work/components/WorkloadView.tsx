'use client';

import { Button } from '@life-os/ui';
import { ChevronLeft, ChevronRight, User, Calendar, AlertCircle } from 'lucide-react';
import { useState } from 'react';

import type { Task, Project } from '../types';

interface WorkloadViewProps {
  tasks: Task[];
  projects: Project[];
  selectedProject: string | null;
  onProjectFilter: (projectId: string | null) => void;
  onTaskClick: (task: Task) => void;
}

interface TeamMember {
  id: string;
  name: string;
  capacity: number; // hours per day
}

// Mock team data - in production this would come from API
const mockTeamMembers: TeamMember[] = [
  { id: '1', name: 'John Doe', capacity: 8 },
  { id: '2', name: 'Jane Smith', capacity: 8 },
  { id: '3', name: 'Bob Johnson', capacity: 6 },
  { id: '4', name: 'Alice Williams', capacity: 8 },
];

export function WorkloadView({
  tasks,
  projects,
  selectedProject,
  onProjectFilter,
  onTaskClick,
}: WorkloadViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewWeeks, setViewWeeks] = useState(2); // Show 2 weeks by default

  const getWeekDates = (date: Date, weeks: number) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday
    const dates = [];
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const getFilteredTasks = () => {
    return tasks.filter((task) => {
      const matchesProject = !selectedProject || task.projectId === selectedProject;
      const hasDueDate = task.dueDate !== null;
      const isNotDone = task.status !== 'done' && task.status !== 'cancelled';
      return matchesProject && hasDueDate && isNotDone;
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

  const calculateWorkload = (memberId: string, date: Date) => {
    // In production, this would use actual task assignments
    // For now, we'll simulate workload based on task distribution
    const filteredTasks = getFilteredTasks();
    const dayTasks = filteredTasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.toDateString() === date.toDateString() &&
        // Simulate assignment by hashing task ID to member
        parseInt(task.id, 36) % mockTeamMembers.length ===
          mockTeamMembers.findIndex((m) => m.id === memberId)
      );
    });

    const totalHours = dayTasks.reduce((sum, task) => {
      return sum + (task.estimatedDuration ? task.estimatedDuration / 60 : 1);
    }, 0);

    return totalHours;
  };

  const getWorkloadColor = (hours: number, capacity: number) => {
    const ratio = hours / capacity;
    if (ratio > 1) return 'bg-red-200 text-red-800';
    if (ratio > 0.8) return 'bg-orange-200 text-orange-800';
    if (ratio > 0.5) return 'bg-yellow-200 text-yellow-800';
    return 'bg-green-200 text-green-800';
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const weekDates = getWeekDates(currentDate, viewWeeks);
  const filteredTasks = getFilteredTasks();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onPress={() => navigateWeek('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <Button variant="secondary" onPress={() => navigateWeek('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <select
            value={viewWeeks}
            onChange={(e) => setViewWeeks(parseInt(e.target.value, 10))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value={1}>1 Week</option>
            <option value={2}>2 Weeks</option>
            <option value={4}>4 Weeks</option>
          </select>
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
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200">
          <div
            className="grid"
            style={{ gridTemplateColumns: '200px repeat(auto-fit, minmax(80px, 1fr))' }}
          >
            <div className="p-3 font-medium text-sm bg-gray-50 border-r border-gray-200">
              Team Member
            </div>
            {weekDates.map((date) => (
              <div
                key={date.toISOString()}
                className="p-2 text-center text-xs border-r border-gray-200 last:border-r-0"
              >
                <div className="font-medium text-gray-600">{date.getDate()}</div>
                <div className="text-gray-400">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Rows */}
        <div className="divide-y divide-gray-100">
          {mockTeamMembers.map((member) => (
            <div key={member.id} className="hover:bg-gray-50">
              <div
                className="grid"
                style={{ gridTemplateColumns: '200px repeat(auto-fit, minmax(80px, 1fr))' }}
              >
                <div className="p-3 border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-sm">{member.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{member.capacity}h/day capacity</div>
                </div>
                {weekDates.map((date) => {
                  const hours = calculateWorkload(member.id, date);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <div
                      key={date.toISOString()}
                      className={`p-2 text-center border-r border-gray-200 last:border-r-0 ${
                        isWeekend ? 'bg-gray-50' : ''
                      }`}
                    >
                      {isWeekend ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <div
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${getWorkloadColor(
                            hours,
                            member.capacity,
                          )}`}
                        >
                          {hours.toFixed(1)}h
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-200" />
          <span>&lt;50% capacity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-200" />
          <span>50-80% capacity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-200" />
          <span>80-100% capacity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-200" />
          <span>&gt;100% capacity (overloaded)</span>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Workload Summary</p>
            <p>
              Showing {filteredTasks.length} active tasks across {mockTeamMembers.length} team
              members for the next {viewWeeks} week{viewWeeks > 1 ? 's' : ''}. This view helps
              identify resource allocation and prevent team burnout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
