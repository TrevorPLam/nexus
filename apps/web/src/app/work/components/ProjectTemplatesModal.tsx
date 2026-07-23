/**
 * MODULE: Project Template Create/Edit Modal Component
 *
 * Responsibility:
 * Renders a modal form for creating and editing project templates, including
 * project config and a list of template tasks with dependencies and subtasks.
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: modal, form, templates
 *
 * File:
 * - apps/web/src/app/work/components/ProjectTemplatesModal.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

'use client';

import { Button, Input, TextArea } from '@life-os/ui';
import { Plus, Trash2, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import type { ProjectTemplate, TemplateTask } from '../types-templates';

interface ProjectTemplatesModalProps {
  isOpen: boolean;
  editingTemplate: ProjectTemplate | null;
  templateForm: {
    name: string;
    description: string;
    icon: string;
    color: string;
    isPublic: boolean;
    projectConfig: {
      name: string;
      description: string;
      color: string;
    };
    tasks: TemplateTask[];
  };
  setTemplateForm: (form: ProjectTemplatesModalProps['templateForm']) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

const templateColors = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#14b8a6', label: 'Teal' },
];

const templateIcons = ['📋', '🎯', '🚀', '💡', '📊', '🎨', '🔧', '📝', '🏆', '⚡'];

export function ProjectTemplatesModal({
  isOpen,
  editingTemplate,
  templateForm,
  setTemplateForm,
  onClose,
  onSubmit,
  isPending,
}: ProjectTemplatesModalProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  const addTask = () => {
    setTemplateForm({
      ...templateForm,
      tasks: [
        ...templateForm.tasks,
        {
          title: 'New Task',
          description: null,
          priority: 'medium',
          estimatedDuration: null,
          energyLevel: null,
          contextTags: null,
          dependencies: [],
          subtasks: [],
          order: templateForm.tasks.length,
        },
      ],
    });
  };

  const updateTask = (index: number, task: TemplateTask) => {
    const newTasks = [...templateForm.tasks];
    newTasks[index] = task;
    setTemplateForm({ ...templateForm, tasks: newTasks });
  };

  const removeTask = (index: number) => {
    setTemplateForm({
      ...templateForm,
      tasks: templateForm.tasks.filter((_, i) => i !== index),
    });
  };

  const addSubtask = (taskIndex: number) => {
    const newTasks = [...templateForm.tasks];
    newTasks[taskIndex].subtasks.push({ title: 'New Subtask', completed: false });
    setTemplateForm({ ...templateForm, tasks: newTasks });
  };

  const updateSubtask = (taskIndex: number, subtaskIndex: number, title: string) => {
    const newTasks = [...templateForm.tasks];
    newTasks[taskIndex].subtasks[subtaskIndex].title = title;
    setTemplateForm({ ...templateForm, tasks: newTasks });
  };

  const removeSubtask = (taskIndex: number, subtaskIndex: number) => {
    const newTasks = [...templateForm.tasks];
    newTasks[taskIndex].subtasks = newTasks[taskIndex].subtasks.filter(
      (_, i) => i !== subtaskIndex,
    );
    setTemplateForm({ ...templateForm, tasks: newTasks });
  };

  const toggleTaskExpanded = (index: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTasks(newExpanded);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">
            {editingTemplate ? 'Edit Project Template' : 'Create Project Template'}
          </h2>
          <form onSubmit={onSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Template Name</label>
                <Input
                  placeholder="e.g., Software Development Sprint"
                  value={templateForm.name}
                  onChangeText={(value) => setTemplateForm({ ...templateForm, name: value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (optional)</label>
                <TextArea
                  placeholder="Describe when to use this template"
                  value={templateForm.description}
                  onChangeText={(value) => setTemplateForm({ ...templateForm, description: value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Icon</label>
                  <select
                    value={templateForm.icon}
                    onChange={(e) => setTemplateForm({ ...templateForm, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {templateIcons.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <select
                    value={templateForm.color}
                    onChange={(e) => setTemplateForm({ ...templateForm, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {templateColors.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Default Project Name</label>
                <Input
                  placeholder="Name for projects created from this template"
                  value={templateForm.projectConfig.name}
                  onChangeText={(value) =>
                    setTemplateForm({
                      ...templateForm,
                      projectConfig: { ...templateForm.projectConfig, name: value },
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Default Project Description (optional)
                </label>
                <TextArea
                  placeholder="Description for projects created from this template"
                  value={templateForm.projectConfig.description}
                  onChangeText={(value) =>
                    setTemplateForm({
                      ...templateForm,
                      projectConfig: { ...templateForm.projectConfig, description: value },
                    })
                  }
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={templateForm.isPublic}
                  onChange={(e) => setTemplateForm({ ...templateForm, isPublic: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isPublic" className="text-sm">
                  Available to all workspace members
                </label>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm">Template Tasks</h3>
                  <Button variant="secondary" size="small" onPress={addTask}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Task
                  </Button>
                </div>
                <div className="space-y-3">
                  {templateForm.tasks.map((task, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleTaskExpanded(index)}
                          className="mt-1 flex-shrink-0"
                        >
                          {expandedTasks.has(index) ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={task.title}
                              onChange={(e) =>
                                updateTask(index, { ...task, title: e.target.value })
                              }
                              className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                              placeholder="Task title"
                            />
                            <select
                              value={task.priority}
                              onChange={(e) =>
                                updateTask(index, { ...task, priority: e.target.value as any })
                              }
                              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>

                          {expandedTasks.has(index) && (
                            <div className="space-y-2 mt-3">
                              <textarea
                                placeholder="Task description (optional)"
                                value={task.description || ''}
                                onChange={(e) =>
                                  updateTask(index, { ...task, description: e.target.value })
                                }
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  placeholder="Duration (hours)"
                                  value={task.estimatedDuration || ''}
                                  onChange={(e) =>
                                    updateTask(index, {
                                      ...task,
                                      estimatedDuration: e.target.value
                                        ? parseInt(e.target.value, 10)
                                        : null,
                                    })
                                  }
                                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                                />
                                <select
                                  value={task.energyLevel || ''}
                                  onChange={(e) =>
                                    updateTask(index, {
                                      ...task,
                                      energyLevel: (e.target.value as any) || null,
                                    })
                                  }
                                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                                >
                                  <option value="">Energy Level</option>
                                  <option value="low">Low</option>
                                  <option value="medium">Medium</option>
                                  <option value="high">High</option>
                                </select>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium">Subtasks</span>
                                  <button
                                    type="button"
                                    onClick={() => addSubtask(index)}
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                  >
                                    + Add Subtask
                                  </button>
                                </div>
                                <div className="space-y-1">
                                  {task.subtasks.map((subtask, subIndex) => (
                                    <div key={subIndex} className="flex gap-2 items-center">
                                      <input
                                        type="text"
                                        value={subtask.title}
                                        onChange={(e) =>
                                          updateSubtask(index, subIndex, e.target.value)
                                        }
                                        className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-xs"
                                        placeholder="Subtask title"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeSubtask(index, subIndex)}
                                        className="text-gray-400 hover:text-red-500"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <Button variant="secondary" size="small" onPress={() => removeTask(index)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button variant="secondary" onPress={onClose}>
                Cancel
              </Button>
              <button
                type="submit"
                disabled={isPending || !templateForm.name || templateForm.tasks.length === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingTemplate ? (
                  'Update Template'
                ) : (
                  'Create Template'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
