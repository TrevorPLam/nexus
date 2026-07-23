'use client';

import { Button, Modal, Select, TextArea } from '@life-os/ui';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useState } from 'react';

import type { AutomationRule, AutomationTrigger, AutomationAction, AutomationCondition } from '../types-automation';

interface AutomationModalProps {
  isOpen: boolean;
  editingRule: AutomationRule | null;
  ruleForm: {
    name: string;
    description: string;
    projectId: string;
    isActive: boolean;
    trigger: AutomationTrigger;
    actions: AutomationAction[];
    conditions: AutomationCondition[];
  };
  projects: { id: string; name: string }[];
  setRuleForm: (form: AutomationModalProps['ruleForm']) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

const triggerTypes = [
  { value: 'task_status_changed', label: 'Task Status Changed' },
  { value: 'task_created', label: 'Task Created' },
  { value: 'task_assigned', label: 'Task Assigned' },
  { value: 'task_due_date_approaching', label: 'Due Date Approaching' },
  { value: 'task_overdue', label: 'Task Overdue' },
  { value: 'comment_added', label: 'Comment Added' },
  { value: 'subtask_completed', label: 'Subtask Completed' },
  { value: 'time_logged', label: 'Time Logged' },
];

const actionTypes = [
  { value: 'set_status', label: 'Set Status' },
  { value: 'set_priority', label: 'Set Priority' },
  { value: 'assign_to', label: 'Assign To' },
  { value: 'add_comment', label: 'Add Comment' },
  { value: 'add_subtask', label: 'Add Subtask' },
  { value: 'set_due_date', label: 'Set Due Date' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'move_to_project', label: 'Move to Project' },
  { value: 'add_tag', label: 'Add Tag' },
  { value: 'remove_tag', label: 'Remove Tag' },
];

const conditionTypes = [
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'project', label: 'Project' },
  { value: 'due_date', label: 'Due Date' },
  { value: 'custom_field', label: 'Custom Field' },
];

const operators = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
];

export function AutomationModal({
  isOpen,
  editingRule,
  ruleForm,
  projects,
  setRuleForm,
  onClose,
  onSubmit,
  isPending,
}: AutomationModalProps) {
  const [selectedTriggerType, setSelectedTriggerType] = useState(
    editingRule?.trigger.type || 'task_status_changed'
  );

  const addAction = () => {
    setRuleForm({
      ...ruleForm,
      actions: [...ruleForm.actions, { type: 'set_status', status: 'todo' }],
    });
  };

  const updateAction = (index: number, action: AutomationAction) => {
    const newActions = [...ruleForm.actions];
    newActions[index] = action;
    setRuleForm({ ...ruleForm, actions: newActions });
  };

  const removeAction = (index: number) => {
    setRuleForm({
      ...ruleForm,
      actions: ruleForm.actions.filter((_, i) => i !== index),
    });
  };

  const addCondition = () => {
    setRuleForm({
      ...ruleForm,
      conditions: [...ruleForm.conditions, { type: 'priority', operator: 'equals', value: 'high' }],
    });
  };

  const updateCondition = (index: number, condition: AutomationCondition) => {
    const newConditions = [...ruleForm.conditions];
    newConditions[index] = condition;
    setRuleForm({ ...ruleForm, conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    setRuleForm({
      ...ruleForm,
      conditions: ruleForm.conditions.filter((_, i) => i !== index),
    });
  };

  const updateTrigger = (trigger: AutomationTrigger) => {
    setRuleForm({ ...ruleForm, trigger });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">
          {editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'}
        </h2>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rule Name</label>
              <input
                type="text"
                placeholder="e.g., Auto-assign high priority tasks"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description (optional)</label>
              <TextArea
                placeholder="Describe what this automation does"
                value={ruleForm.description}
                onChangeText={(value) => setRuleForm({ ...ruleForm, description: value })}
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Project (optional)</label>
              <select
                value={ruleForm.projectId}
                onChange={(e) => setRuleForm({ ...ruleForm, projectId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={ruleForm.isActive}
                onChange={(e) => setRuleForm({ ...ruleForm, isActive: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isActive" className="text-sm">Active</label>
            </div>

            {/* Trigger Section */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-medium text-sm mb-3">Trigger</h3>
              <div className="space-y-3">
                <select
                  value={selectedTriggerType}
                  onChange={(e) => {
                    setSelectedTriggerType(e.target.value);
                    // Reset trigger based on type
                    const baseTrigger: AutomationTrigger = { type: e.target.value as any };
                    if (e.target.value === 'task_status_changed') {
                      updateTrigger({ ...baseTrigger, type: 'task_status_changed', toStatus: 'done' });
                    } else if (e.target.value === 'task_due_date_approaching') {
                      updateTrigger({ ...baseTrigger, type: 'task_due_date_approaching', daysBefore: 1 });
                    } else {
                      updateTrigger(baseTrigger);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {triggerTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>

                {selectedTriggerType === 'task_status_changed' && (
                  <div>
                    <label className="block text-xs font-medium mb-1">When status changes to</label>
                    <select
                      value={(ruleForm.trigger as any).toStatus || ''}
                      onChange={(e) =>
                        updateTrigger({ ...ruleForm.trigger, type: 'task_status_changed', toStatus: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}

                {selectedTriggerType === 'task_due_date_approaching' && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Days before due date</label>
                    <input
                      type="number"
                      value={(ruleForm.trigger as any).daysBefore || 1}
                      onChange={(e) =>
                        updateTrigger({
                          ...ruleForm.trigger,
                          type: 'task_due_date_approaching',
                          daysBefore: parseInt(e.target.value, 10),
                        })
                      }
                      min={1}
                      max={30}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Conditions Section */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">Conditions (optional)</h3>
                <Button variant="secondary" size="small" onPress={addCondition}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Condition
                </Button>
              </div>
              <div className="space-y-2">
                {ruleForm.conditions.length === 0 ? (
                  <p className="text-xs text-gray-500">No conditions - rule applies to all matching triggers</p>
                ) : (
                  ruleForm.conditions.map((condition, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <select
                        value={condition.type}
                        onChange={(e) =>
                          updateCondition(index, { ...condition, type: e.target.value as any })
                        }
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                      >
                        {conditionTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={condition.operator}
                        onChange={(e) =>
                          updateCondition(index, { ...condition, operator: e.target.value as any })
                        }
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                      >
                        {operators.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={condition.value as string}
                        onChange={(e) => updateCondition(index, { ...condition, value: e.target.value })}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                        placeholder="Value"
                      />
                      <Button
                        variant="secondary"
                        size="small"
                        onPress={() => removeCondition(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions Section */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">Actions</h3>
                <Button variant="secondary" size="small" onPress={addAction}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Action
                </Button>
              </div>
              <div className="space-y-2">
                {ruleForm.actions.length === 0 ? (
                  <p className="text-xs text-gray-500">No actions defined</p>
                ) : (
                  ruleForm.actions.map((action, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <select
                        value={action.type}
                        onChange={(e) => {
                          const newAction: AutomationAction = { type: e.target.value as any };
                          if (e.target.value === 'set_status') {
                            (newAction as any).status = 'todo';
                          } else if (e.target.value === 'set_priority') {
                            (newAction as any).priority = 'medium';
                          }
                          updateAction(index, newAction);
                        }}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                      >
                        {actionTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>

                      {action.type === 'set_status' && (
                        <select
                          value={(action as any).status}
                          onChange={(e) => updateAction(index, { ...action, status: e.target.value as any })}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      )}

                      {action.type === 'set_priority' && (
                        <select
                          value={(action as any).priority}
                          onChange={(e) => updateAction(index, { ...action, priority: e.target.value as any })}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      )}

                      {(action.type === 'assign_to' || action.type === 'add_comment' || action.type === 'add_tag' || action.type === 'remove_tag') && (
                        <input
                          type="text"
                          value={(action as any).userId || (action as any).template || (action as any).tag || ''}
                          onChange={(e) => {
                            if (action.type === 'assign_to') {
                              updateAction(index, { ...action, userId: e.target.value } as any);
                            } else if (action.type === 'add_comment' || action.type === 'add_tag' || action.type === 'remove_tag') {
                              updateAction(index, { ...action, template: e.target.value } as any);
                            }
                          }}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                          placeholder={action.type === 'assign_to' ? 'User ID' : 'Value'}
                        />
                      )}

                      {action.type === 'set_due_date' && (
                        <input
                          type="number"
                          value={(action as any).offsetDays || 0}
                          onChange={(e) => updateAction(index, { ...action, offsetDays: parseInt(e.target.value, 10) } as any)}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                          placeholder="Days offset"
                        />
                      )}

                      <Button
                        variant="secondary"
                        size="small"
                        onPress={() => removeAction(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-6">
            <Button variant="secondary" onPress={onClose}>
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isPending || ruleForm.actions.length === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingRule ? (
                'Update Rule'
              ) : (
                'Create Rule'
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
