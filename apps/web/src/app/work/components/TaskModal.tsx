/**
 * MODULE: Task Create/Edit Modal Component
 *
 * Responsibility:
 * Renders a modal form for creating and editing tasks, including title, project,
 * parent task, description, status, priority, due date/time, estimated duration,
 * energy level, context tags, and milestone flag. Validates against
 * CreateTaskRequest from contracts.
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: modal, form, task
 *
 * File:
 * - apps/web/src/app/work/components/TaskModal.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

'use client';

import { Button, Modal, Input, Select, TextArea } from '@life-os/ui';
import { Loader2 } from 'lucide-react';
import { CreateTaskRequest } from '@life-os/contracts';
import { useState } from 'react';

import type { Task, Project } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  editingTask: Task | null;
  taskForm: {
    title: string;
    projectId: string;
    parentId: string;
    description: string;
    status: 'todo' | 'in_progress' | 'done' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate: string;
    dueTime: string;
    estimatedDuration: string;
    energyLevel: 'low' | 'medium' | 'high';
    contextTags: string;
    isMilestone: boolean;
  };
  projects: Project[];
  setTaskForm: (form: TaskModalProps['taskForm']) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

const energyOptions = [
  { value: 'low', label: 'Low Energy' },
  { value: 'medium', label: 'Medium Energy' },
  { value: 'high', label: 'High Energy' },
];

export function TaskModal({
  isOpen,
  editingTask,
  taskForm,
  projects,
  setTaskForm,
  onClose,
  onSubmit,
  isPending,
}: TaskModalProps) {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate using the contract schema
    const result = CreateTaskRequest.safeParse({
      workspaceId: 'temp', // Not used in validation
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
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    onSubmit(e);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{editingTask ? 'Edit Task' : 'Create Task'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input
                placeholder="Task title"
                value={taskForm.title}
                onChangeText={(value) => setTaskForm({ ...taskForm, title: value })}
              />
              {validationErrors.title && (
                <p className="text-red-500 text-sm mt-1" role="alert">
                  {validationErrors.title}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Project</label>
              <Select
                value={taskForm.projectId}
                onChange={(value) => setTaskForm({ ...taskForm, projectId: value })}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select
                  value={taskForm.status}
                  onChange={(value) =>
                    setTaskForm({
                      ...taskForm,
                      status: value as TaskModalProps['taskForm']['status'],
                    })
                  }
                  options={statusOptions}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <Select
                  value={taskForm.priority}
                  onChange={(value) =>
                    setTaskForm({
                      ...taskForm,
                      priority: value as TaskModalProps['taskForm']['priority'],
                    })
                  }
                  options={priorityOptions}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isMilestone"
                checked={taskForm.isMilestone}
                onChange={(e) => setTaskForm({ ...taskForm, isMilestone: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isMilestone" className="text-sm">
                Mark as Milestone
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Due Date</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                {validationErrors.dueDate && (
                  <p className="text-red-500 text-sm mt-1" role="alert">
                    {validationErrors.dueDate}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Due Time</label>
                <input
                  type="time"
                  value={taskForm.dueTime}
                  onChange={(e) => setTaskForm({ ...taskForm, dueTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                {validationErrors.dueTime && (
                  <p className="text-red-500 text-sm mt-1" role="alert">
                    {validationErrors.dueTime}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Estimated Duration (minutes)</label>
              <Input
                keyboardType="numeric"
                placeholder="e.g., 30"
                value={taskForm.estimatedDuration}
                onChangeText={(value) => setTaskForm({ ...taskForm, estimatedDuration: value })}
              />
              {validationErrors.estimatedDuration && (
                <p className="text-red-500 text-sm mt-1" role="alert">
                  {validationErrors.estimatedDuration}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Energy Level</label>
              <Select
                value={taskForm.energyLevel}
                onChange={(value) =>
                  setTaskForm({
                    ...taskForm,
                    energyLevel: value as TaskModalProps['taskForm']['energyLevel'],
                  })
                }
                options={energyOptions}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description (optional)</label>
              <TextArea
                placeholder="Task description"
                value={taskForm.description}
                onChangeText={(value) => setTaskForm({ ...taskForm, description: value })}
              />
              {validationErrors.description && (
                <p className="text-red-500 text-sm mt-1" role="alert">
                  {validationErrors.description}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Context Tags (optional)</label>
              <Input
                placeholder="e.g., deep-work, review, meeting"
                value={taskForm.contextTags}
                onChangeText={(value) => setTaskForm({ ...taskForm, contextTags: value })}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-6">
            <Button variant="secondary" onPress={onClose}>
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingTask ? (
                'Update'
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
