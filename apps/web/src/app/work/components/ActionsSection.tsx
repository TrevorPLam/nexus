/**
 * MODULE: Actions Section Component
 *
 * Responsibility:
 * Renders the actions configuration section for automation rules.
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: modal, form, automation, actions
 *
 * File:
 * - apps/web/src/app/work/components/ActionsSection.tsx
 *
 * Last updated:
 * - July 26, 2026
 */

'use client';

import { Button } from '@life-os/ui';
import { Plus, Trash2 } from 'lucide-react';

import type { AutomationAction } from '../types-automation';

import { actionTypes } from './automation-constants';

interface ActionsSectionProps {
  actions: AutomationAction[];
  addAction: () => void;
  updateAction: (index: number, action: AutomationAction) => void;
  removeAction: (index: number) => void;
}

export function ActionsSection({
  actions,
  addAction,
  updateAction,
  removeAction,
}: ActionsSectionProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">Actions</h3>
        <Button variant="secondary" size="small" onPress={addAction}>
          <Plus className="w-3 h-3 mr-1" />
          Add Action
        </Button>
      </div>
      <div className="space-y-2">
        {actions.length === 0 ? (
          <p className="text-xs text-gray-500">No actions defined</p>
        ) : (
          actions.map((action, index) => (
            <div key={index} className="flex gap-2 items-center">
              <select
                value={action.type}
                onChange={(e) => {
                  const newAction: any = { type: e.target.value as any };
                  if (e.target.value === 'set_status') {
                    newAction.status = 'todo';
                  } else if (e.target.value === 'set_priority') {
                    newAction.priority = 'medium';
                  }
                  updateAction(index, newAction as AutomationAction);
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
                  onChange={(e) =>
                    updateAction(index, { ...action, status: e.target.value as any })
                  }
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
                  onChange={(e) =>
                    updateAction(index, { ...action, priority: e.target.value as any })
                  }
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              )}

              {(action.type === 'assign_to' ||
                action.type === 'add_comment' ||
                action.type === 'add_tag' ||
                action.type === 'remove_tag') && (
                <input
                  type="text"
                  value={
                    (action as any).userId || (action as any).template || (action as any).tag || ''
                  }
                  onChange={(e) => {
                    if (action.type === 'assign_to') {
                      updateAction(index, { ...action, userId: e.target.value } as any);
                    } else if (
                      action.type === 'add_comment' ||
                      action.type === 'add_tag' ||
                      action.type === 'remove_tag'
                    ) {
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
                  onChange={(e) =>
                    updateAction(index, {
                      ...action,
                      offsetDays: parseInt(e.target.value, 10),
                    } as any)
                  }
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                  placeholder="Days offset"
                />
              )}

              <Button variant="secondary" size="small" onPress={() => removeAction(index)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
