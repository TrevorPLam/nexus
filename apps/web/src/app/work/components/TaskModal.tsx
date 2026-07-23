'use client';

import { Button, Modal, Input, Select, TextArea } from '@life-os/ui';
import { Loader2 } from 'lucide-react';

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
    dependencies: Array<{ taskId: string; type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish' }>;
    assignees: string[];
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
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{editingTask ? 'Edit Task' : 'Create Task'}</h2>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input
                placeholder="Task title"
                value={taskForm.title}
                onChangeText={(value) => setTaskForm({ ...taskForm, title: value })}
              />
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
                    setTaskForm({ ...taskForm, status: value as TaskModalProps['taskForm']['status'] })
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
              <label htmlFor="isMilestone" className="text-sm">Mark as Milestone</label>
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
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Due Time</label>
                <input
                  type="time"
                  value={taskForm.dueTime}
                  onChange={(e) => setTaskForm({ ...taskForm, dueTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
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
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Context Tags (optional)</label>
              <Input
                placeholder="e.g., deep-work, review, meeting"
                value={taskForm.contextTags}
                onChangeText={(value) => setTaskForm({ ...taskForm, contextTags: value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Dependencies (optional)</label>
              <div className="space-y-2">
                {taskForm.dependencies.map((dep, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Task ID"
                      value={dep.taskId}
                      onChange={(e) => {
                        const newDeps = [...taskForm.dependencies];
                        newDeps[index] = { ...dep, taskId: e.target.value };
                        setTaskForm({ ...taskForm, dependencies: newDeps });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <select
                      value={dep.type}
                      onChange={(e) => {
                        const newDeps = [...taskForm.dependencies];
                        newDeps[index] = { ...dep, type: e.target.value as any };
                        setTaskForm({ ...taskForm, dependencies: newDeps });
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="finish_to_start">Finish to Start</option>
                      <option value="start_to_start">Start to Start</option>
                      <option value="finish_to_finish">Finish to Finish</option>
                      <option value="start_to_finish">Start to Finish</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const newDeps = taskForm.dependencies.filter((_, i) => i !== index);
                        setTaskForm({ ...taskForm, dependencies: newDeps });
                      }}
                      className="px-2 py-2 text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setTaskForm({
                      ...taskForm,
                      dependencies: [...taskForm.dependencies, { taskId: '', type: 'finish_to_start' }],
                    })
                  }
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Dependency
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Assignees (optional)</label>
              <div className="space-y-2">
                {taskForm.assignees.map((assignee, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="User ID or email"
                      value={assignee}
                      onChange={(e) => {
                        const newAssignees = [...taskForm.assignees];
                        newAssignees[index] = e.target.value;
                        setTaskForm({ ...taskForm, assignees: newAssignees });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newAssignees = taskForm.assignees.filter((_, i) => i !== index);
                        setTaskForm({ ...taskForm, assignees: newAssignees });
                      }}
                      className="px-2 py-2 text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setTaskForm({ ...taskForm, assignees: [...taskForm.assignees, ''] })}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Assignee
                </button>
              </div>
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
