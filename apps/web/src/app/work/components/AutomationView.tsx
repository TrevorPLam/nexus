'use client';

import { Button } from '@life-os/ui';
import { Plus, Settings2, Play, Pause, Trash2, Edit, Clock, Zap } from 'lucide-react';

import type { AutomationRule } from '../types-automation';

interface AutomationViewProps {
  rules: AutomationRule[];
  loading: boolean;
  onNewRule: () => void;
  onEditRule: (rule: AutomationRule) => void;
  onDeleteRule: (ruleId: string) => void;
  onToggleRule: (ruleId: string, isActive: boolean) => void;
  onRunRule: (ruleId: string) => void;
}

export function AutomationView({
  rules,
  loading,
  onNewRule,
  onEditRule,
  onDeleteRule,
  onToggleRule,
  onRunRule,
}: AutomationViewProps) {
  const getTriggerLabel = (trigger: AutomationRule['trigger']) => {
    switch (trigger.type) {
      case 'task_status_changed':
        return `When status changes to ${trigger.toStatus}`;
      case 'task_created':
        return 'When task is created';
      case 'task_assigned':
        return 'When task is assigned';
      case 'task_due_date_approaching':
        return `When due date is ${trigger.daysBefore} days away`;
      case 'task_overdue':
        return 'When task is overdue';
      case 'comment_added':
        return 'When comment is added';
      case 'subtask_completed':
        return 'When subtask is completed';
      case 'time_logged':
        return 'When time is logged';
      case 'scheduled':
        return `Scheduled (${trigger.cronExpression})`;
      default:
        return 'Unknown trigger';
    }
  };

  const getActionsSummary = (actions: AutomationRule['actions']) => {
    if (actions.length === 0) return 'No actions';
    if (actions.length === 1) return `1 action: ${actions[0].type}`;
    return `${actions.length} actions`;
  };

  const getTriggerIcon = (trigger: AutomationRule['trigger']) => {
    switch (trigger.type) {
      case 'scheduled':
        return Clock;
      default:
        return Zap;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Automations</h2>
          <p className="text-gray-600 mt-1">Create rules to automate repetitive tasks</p>
        </div>
        <Button onPress={onNewRule}>
          <Plus className="w-4 h-4 mr-2" />
          New Automation
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading automations...</div>
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <Settings2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No automations yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Create automation rules to streamline your workflow. Automatically assign tasks, send notifications, and more.
          </p>
          <Button onPress={onNewRule}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Automation
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => {
            const TriggerIcon = getTriggerIcon(rule.trigger);
            return (
              <div
                key={rule.id}
                className={`bg-white border rounded-lg p-5 transition-all ${
                  rule.isActive ? 'border-gray-200 shadow-sm' : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={`p-3 rounded-lg ${
                        rule.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <TriggerIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            rule.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {rule.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      {rule.description && (
                        <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Zap className="w-4 h-4" />
                          <span>{getTriggerLabel(rule.trigger)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Settings2 className="w-4 h-4" />
                          <span>{getActionsSummary(rule.actions)}</span>
                        </div>
                        {rule.conditions.length > 0 && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <span>{rule.conditions.length} condition{rule.conditions.length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="small"
                      onPress={() => onToggleRule(rule.id, !rule.isActive)}
                    >
                      {rule.isActive ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      onPress={() => onRunRule(rule.id)}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      onPress={() => onEditRule(rule)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      onPress={() => onDeleteRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Start Templates */}
      {rules.length < 3 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="font-medium text-sm">Auto-assign high priority</h4>
              </div>
              <p className="text-xs text-gray-500">
                Automatically assign high-priority tasks to a specific team member
              </p>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="w-4 h-4 text-orange-600" />
                </div>
                <h4 className="font-medium text-sm">Due date reminder</h4>
              </div>
              <p className="text-xs text-gray-500">
                Send notification when tasks are due within 24 hours
              </p>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Settings2 className="w-4 h-4 text-green-600" />
                </div>
                <h4 className="font-medium text-sm">Completion follow-up</h4>
              </div>
              <p className="text-xs text-gray-500">
                Add a comment when a task is marked as done
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
