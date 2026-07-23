/**
 * MODULE: Work Form State Hook
 *
 * Responsibility:
 * Manages local UI state for project and task create/edit modals, including form
 * fields, modal visibility, and submission to create/update mutations with
 * date/duration parsing.
 *
 * Boundaries:
 * - UI state only; delegates persistence to mutation functions passed as props.
 * - Does not manage query cache or data fetching.
 *
 * Critical invariants:
 * - estimatedDuration is stored as string in the form and parsed to int on submit.
 * - dueDate is stored as a date string and converted to ISO on submit.
 * - New tasks default to the first project in the list when no projectId is given.
 *
 * Change risk:
 * - Medium. Form parsing logic can introduce type coercion bugs.
 *
 * Links:
 * - apps/web/src/app/work/types.ts
 * - apps/web/src/app/work/components/ProjectModal.tsx
 * - apps/web/src/app/work/components/TaskModal.tsx
 *
 * Tags:
 * - domain: work
 * - risk: medium
 * - layer: presentation
 * - stability: stable
 * - concerns: form-state, project-modal, task-modal
 *
 * File:
 * - apps/web/src/app/work/hooks/useWorkState.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { useState, useEffect } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';

import type { Project, Task, ProjectForm, TaskForm } from '../types';

interface UseWorkStateProps {
  projects: Project[];
  createProjectMutation: UseMutationResult<
    unknown,
    Error,
    { name: string; description?: string; color?: string },
    unknown
  >;
  updateProjectMutation: UseMutationResult<
    unknown,
    Error,
    { id: string; data: { name?: string; description?: string; color?: string } },
    unknown
  >;
  createTaskMutation: UseMutationResult<
    unknown,
    Error,
    {
      title: string;
      projectId?: string;
      description?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      dueDate?: string;
      estimatedDuration?: number;
      energyLevel?: 'low' | 'medium' | 'high';
    },
    unknown
  >;
  updateTaskMutation: UseMutationResult<
    unknown,
    Error,
    { id: string; data: Partial<Task> },
    unknown
  >;
}

export function useWorkState({
  projects,
  createProjectMutation,
  updateProjectMutation,
  createTaskMutation,
  updateTaskMutation,
}: UseWorkStateProps) {
  // Project state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectForm>({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: '',
  });

  // Task state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>({
    title: '',
    projectId: '',
    parentId: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    dueTime: '',
    estimatedDuration: '',
    energyLevel: 'medium',
    contextTags: '',
    isMilestone: false,
  });

  // Populate project form when editing
  useEffect(() => {
    if (editingProject) {
      setProjectForm({
        name: editingProject.name,
        description: editingProject.description || '',
        color: editingProject.color || '#3b82f6',
        icon: editingProject.icon || '',
      });
    } else if (showProjectModal) {
      setProjectForm({
        name: '',
        description: '',
        color: '#3b82f6',
        icon: '',
      });
    }
  }, [editingProject, showProjectModal]);

  // Populate task form when editing
  useEffect(() => {
    if (editingTask) {
      setTaskForm({
        title: editingTask.title,
        projectId: editingTask.projectId || '',
        parentId: editingTask.parentId || '',
        description: editingTask.description || '',
        status: editingTask.status,
        priority: editingTask.priority,
        dueDate: editingTask.dueDate ? editingTask.dueDate.toISOString().split('T')[0] : '',
        dueTime: editingTask.dueTime || '',
        estimatedDuration: editingTask.estimatedDuration?.toString() || '',
        energyLevel: editingTask.energyLevel || 'medium',
        contextTags: editingTask.contextTags || '',
        isMilestone: editingTask.isMilestone || false,
      });
    } else if (showTaskModal) {
      setTaskForm({
        title: '',
        projectId: projects[0]?.id || '',
        parentId: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: '',
        dueTime: '',
        estimatedDuration: '',
        energyLevel: 'medium',
        contextTags: '',
        isMilestone: false,
      });
    }
  }, [editingTask, showTaskModal, projects]);

  const handleNewProject = () => {
    setEditingProject(null);
    setShowProjectModal(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const handleProjectModalClose = () => {
    setShowProjectModal(false);
    setEditingProject(null);
    setProjectForm({
      name: '',
      description: '',
      color: '#3b82f6',
      icon: '',
    });
  };

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: projectForm.name,
      description: projectForm.description || undefined,
      color: projectForm.color || undefined,
      icon: projectForm.icon || undefined,
    };

    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data });
    } else {
      createProjectMutation.mutate(data);
    }
  };

  const handleNewTask = (projectId?: string | null) => {
    setEditingTask(null);
    if (projectId) {
      setTaskForm((prev) => ({ ...prev, projectId }));
    }
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleTaskModalClose = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    setTaskForm({
      title: '',
      projectId: '',
      parentId: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      dueTime: '',
      estimatedDuration: '',
      energyLevel: 'medium',
      contextTags: '',
      isMilestone: false,
    });
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      title: taskForm.title,
      projectId: taskForm.projectId || undefined,
      parentId: taskForm.parentId || undefined,
      description: taskForm.description || undefined,
      status: taskForm.status,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : undefined,
      dueTime: taskForm.dueTime || undefined,
      estimatedDuration: taskForm.estimatedDuration
        ? parseInt(taskForm.estimatedDuration, 10)
        : undefined,
      energyLevel: taskForm.energyLevel || undefined,
      contextTags: taskForm.contextTags || undefined,
      isMilestone: taskForm.isMilestone,
    };

    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data: data as Partial<Task> });
    } else {
      await createTaskMutation.mutateAsync(data);
    }
  };

  return {
    showProjectModal,
    editingProject,
    projectForm,
    setProjectForm,
    handleNewProject,
    handleEditProject,
    handleProjectModalClose,
    handleProjectSubmit,
    showTaskModal,
    editingTask,
    taskForm,
    setTaskForm,
    handleNewTask,
    handleEditTask,
    handleTaskModalClose,
    handleTaskSubmit,
  };
}
