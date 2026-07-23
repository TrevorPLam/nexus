'use client';

/**
 * MODULE: Work Management Page
 *
 * Responsibility:
 * Top-level Next.js client page for work management. Coordinates project and task
 * data fetching, view state (projects, kanban, timeline, list), and modal-based
 * creation/editing of projects and tasks.
 *
 * Boundaries:
 * - Composition layer that delegates rendering to work-specific components and hooks.
 * - Business logic and API calls are handled by useWorkProjects, useWorkTasks, and useWorkState.
 *
 * Critical invariants:
 * - Data fetching is disabled until a workspace is selected.
 * - All mutations must invalidate the corresponding TanStack Query cache keys.
 *
 * Side effects:
 * - Triggers API requests via TanStack Query hooks.
 * - Opens/closes modals for project and task forms.
 *
 * Change risk:
 * - High. Central UI entry point for the entire Work module.
 *
 * Links:
 * - apps/web/src/hooks/useWorkProjects.ts
 * - apps/web/src/hooks/useWorkTasks.ts
 * - apps/web/src/app/work/hooks/useWorkState.ts
 * - apps/web/src/contexts/AuthContext.tsx
 *
 * Tags:
 * - domain: work
 * - risk: high
 * - layer: presentation
 * - stability: stable
 * - concerns: nextjs, react-query, work, tasks, projects
 *
 * File:
 * - apps/web/src/app/work/page.tsx
 *
 * Last updated:
 * - July 22, 2026
 */

import { Button } from '@life-os/ui';
import { useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useWorkProjects } from '../../hooks/useWorkProjects';
import { useWorkTasks } from '../../hooks/useWorkTasks';

import {
  KanbanView,
  ListView,
  ProjectModal,
  ProjectsView,
  TaskModal,
  TimelineView,
} from './components';
import { useWorkState } from './hooks/useWorkState';
import type { WorkView, Task } from './types';

export default function WorkPage() {
  const { workspaceId, workspaceState } = useAuth();
  const [view, setView] = useState<WorkView>('projects');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [filterPriority] = useState<string | null>(null);
  const [timelineDate, setTimelineDate] = useState(new Date());

  // Only fetch data when workspace is selected
  const effectiveWorkspaceId = workspaceState === 'selected' ? workspaceId : null;

  const {
    projects,
    projectsLoading,
    createProjectMutation,
    updateProjectMutation,
    deleteProjectMutation,
  } = useWorkProjects(effectiveWorkspaceId);

  const {
    tasks,
    isLoading,
    isError,
    error,
    createTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
  } = useWorkTasks(effectiveWorkspaceId, selectedProject, filterPriority);

  const workState = useWorkState({
    projects,
    createProjectMutation,
    updateProjectMutation,
    createTaskMutation,
    updateTaskMutation,
  });

  const handleViewChange = (newView: WorkView) => {
    setView(newView);
    if (newView === 'projects') {
      setSelectedProject(null);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    setSelectedProject(projectId);
    setView('kanban');
  };

  const navigateTimelineMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(timelineDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setTimelineDate(newDate);
  };

  const handleTaskStatusChange = (taskId: string, newStatus: Task['status']) => {
    updateTaskMutation.mutate({ id: taskId, data: { status: newStatus } });
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Work</h1>
          <p className="text-gray-600 mt-2">Project management and task tracking</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'projects' ? 'primary' : 'secondary'}
            onPress={() => handleViewChange('projects')}
          >
            Projects
          </Button>
          <Button
            variant={view === 'kanban' ? 'primary' : 'secondary'}
            onPress={() => handleViewChange('kanban')}
          >
            Kanban
          </Button>
          <Button
            variant={view === 'timeline' ? 'primary' : 'secondary'}
            onPress={() => handleViewChange('timeline')}
          >
            Timeline
          </Button>
          <Button
            variant={view === 'list' ? 'primary' : 'secondary'}
            onPress={() => handleViewChange('list')}
          >
            List
          </Button>
        </div>
      </div>

      {isError && (
        <div role="alert" className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">Error loading tasks: {error?.message || 'Unknown error'}</p>
        </div>
      )}

      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <p className="text-blue-800">Loading tasks...</p>
        </div>
      )}

      {createProjectMutation.error && (
        <div role="alert" className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">
            Error creating project: {createProjectMutation.error.message}
          </p>
        </div>
      )}

      {updateProjectMutation.error && (
        <div role="alert" className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">
            Error updating project: {updateProjectMutation.error.message}
          </p>
        </div>
      )}

      {createTaskMutation.error && (
        <div role="alert" className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">Error creating task: {createTaskMutation.error.message}</p>
        </div>
      )}

      {updateTaskMutation.error && (
        <div role="alert" className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">Error updating task: {updateTaskMutation.error.message}</p>
        </div>
      )}

      {view === 'projects' ? (
        <ProjectsView
          projects={projects}
          projectsLoading={projectsLoading}
          onNewProject={workState.handleNewProject}
          onEditProject={(project) => {
            workState.handleEditProject(project);
          }}
          onDeleteProject={(id) => deleteProjectMutation.mutate(id)}
          onProjectSelect={handleProjectSelect}
        />
      ) : view === 'kanban' ? (
        <KanbanView
          tasks={tasks}
          projects={projects}
          selectedProject={selectedProject}
          onTaskDelete={(id) => deleteTaskMutation.mutate(id)}
          onTaskClick={(task) => {
            workState.handleEditTask(task);
          }}
          onNewTask={() => workState.handleNewTask(selectedProject)}
          onProjectFilter={setSelectedProject}
          onTaskStatusChange={handleTaskStatusChange}
        />
      ) : view === 'timeline' ? (
        <TimelineView
          tasks={tasks}
          projects={projects}
          selectedProject={selectedProject}
          currentDate={timelineDate}
          onTaskClick={(task) => {
            workState.handleEditTask(task);
          }}
          onNewTask={() => workState.handleNewTask(selectedProject)}
          onProjectFilter={setSelectedProject}
          onNavigatePrev={() => navigateTimelineMonth('prev')}
          onNavigateNext={() => navigateTimelineMonth('next')}
        />
      ) : view === 'list' ? (
        <ListView
          tasks={tasks}
          projects={projects}
          selectedProject={selectedProject}
          onTaskDelete={(id) => deleteTaskMutation.mutate(id)}
          onTaskClick={(task) => {
            workState.handleEditTask(task);
          }}
          onNewTask={() => workState.handleNewTask(selectedProject)}
          onProjectFilter={setSelectedProject}
          onTaskStatusChange={handleTaskStatusChange}
        />
      ) : null}

      {/* Project Modal */}
      <ProjectModal
        isOpen={workState.showProjectModal || !!workState.editingProject}
        editingProject={workState.editingProject}
        projectForm={workState.projectForm}
        setProjectForm={workState.setProjectForm}
        onClose={workState.handleProjectModalClose}
        onSubmit={workState.handleProjectSubmit}
        isPending={createProjectMutation.isPending || updateProjectMutation.isPending}
      />

      {/* Task Modal */}
      <TaskModal
        isOpen={workState.showTaskModal || !!workState.editingTask}
        editingTask={workState.editingTask}
        taskForm={workState.taskForm}
        projects={projects}
        setTaskForm={workState.setTaskForm}
        onClose={workState.handleTaskModalClose}
        onSubmit={workState.handleTaskSubmit}
        isPending={createTaskMutation.isPending || updateTaskMutation.isPending}
      />
    </main>
  );
}
