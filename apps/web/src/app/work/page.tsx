'use client';

import { Button } from '@life-os/ui';
import { useState } from 'react';

import { useWorkProjects } from '../../hooks/useWorkProjects';
import { useWorkTasks } from '../../hooks/useWorkTasks';
import { useAuth } from '../../contexts/AuthContext';

import { KanbanView } from './components/KanbanView';
import { ProjectsView } from './components/ProjectsView';
import { TaskModal } from './components/TaskModal';
import { ProjectModal } from './components/ProjectModal';
import { TimelineView } from './components/TimelineView';
import { ListView } from './components/ListView';
import { WorkloadView } from './components/WorkloadView';
import { useWorkState } from './hooks/useWorkState';
import type { WorkView, Task, Project } from './types';

export default function WorkPage() {
  const { workspaceId } = useAuth();
  const [view, setView] = useState<WorkView>('projects');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = useState<Project | null>(null);
  const [timelineDate, setTimelineDate] = useState(new Date());

  // Fallback to default workspace if auth not loaded
  const effectiveWorkspaceId = workspaceId || 'default-workspace';

  const {
    projects,
    projectsLoading,
    createProjectMutation,
    updateProjectMutation,
    deleteProjectMutation,
  } = useWorkProjects(effectiveWorkspaceId);

  const { tasks, createTaskMutation, updateTaskMutation, deleteTaskMutation } = useWorkTasks(
    effectiveWorkspaceId,
    selectedProject,
    filterPriority,
  );

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

      {view === 'projects' ? (
        <ProjectsView
          projects={projects}
          projectsLoading={projectsLoading}
          onNewProject={workState.handleNewProject}
          onEditProject={(project) => {
            setSelectedProjectForEdit(project);
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
            setSelectedTask(task);
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
            setSelectedTask(task);
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
            setSelectedTask(task);
            workState.handleEditTask(task);
          }}
          onNewTask={() => workState.handleNewTask(selectedProject)}
          onProjectFilter={setSelectedProject}
          onTaskStatusChange={handleTaskStatusChange}
        />
      ) : view === 'workload' ? (
        <WorkloadView
          tasks={tasks}
          projects={projects}
          selectedProject={selectedProject}
          onProjectFilter={setSelectedProject}
          onTaskClick={(task) => {
            setSelectedTask(task);
            workState.handleEditTask(task);
          }}
        />
      ) : (
        <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <p className="text-gray-600">List view coming soon</p>
        </div>
      )}

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
