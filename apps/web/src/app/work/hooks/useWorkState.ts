import { useState, useEffect } from 'react';

import type { Project, Task, ProjectForm, TaskForm } from '../types';

interface UseWorkStateProps {
  projects: Project[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createProjectMutation: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateProjectMutation: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createTaskMutation: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateTaskMutation: any;
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
    dependencies: [],
    assignees: [],
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
        dependencies: [],
        assignees: [],
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
        dependencies: [],
        assignees: [],
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
      dependencies: [],
      assignees: [],
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
      estimatedDuration: taskForm.estimatedDuration ? parseInt(taskForm.estimatedDuration, 10) : undefined,
      energyLevel: taskForm.energyLevel || undefined,
      contextTags: taskForm.contextTags || undefined,
      isMilestone: taskForm.isMilestone,
    };

    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data });
    } else {
      const result = await createTaskMutation.mutateAsync(data);
      // Save dependencies if any
      if (taskForm.dependencies.length > 0 && result?.id) {
        for (const dep of taskForm.dependencies) {
          if (dep.taskId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (window as any).apiClient.createTaskDependency({
              taskId: result.id,
              dependsOnTaskId: dep.taskId,
              type: dep.type,
            });
          }
        }
      }
      // Save assignees if any
      if (taskForm.assignees.length > 0 && result?.id) {
        for (const assigneeId of taskForm.assignees) {
          if (assigneeId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (window as any).apiClient.createTaskAssignee({
              taskId: result.id,
              userId: assigneeId,
            });
          }
        }
      }
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
