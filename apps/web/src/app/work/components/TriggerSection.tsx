/**
 * MODULE: Trigger Section Component
 *
 * Responsibility:
 * Renders the trigger configuration section for automation rules.
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: modal, form, automation, trigger
 *
 * File:
 * - apps/web/src/app/work/components/TriggerSection.tsx
 *
 * Last updated:
 * - July 26, 2026
 */

'use client';

import type { AutomationTrigger } from '../types-automation';

import { triggerTypes } from './automation-constants';

interface TriggerSectionProps {
  selectedTriggerType: string;
  trigger: AutomationTrigger;
  setSelectedTriggerType: (type: string) => void;
  updateTrigger: (trigger: AutomationTrigger) => void;
}

export function TriggerSection({
  selectedTriggerType,
  trigger,
  setSelectedTriggerType,
  updateTrigger,
}: TriggerSectionProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="font-medium text-sm mb-3">Trigger</h3>
      <div className="space-y-3">
        <select
          value={selectedTriggerType}
          onChange={(e) => {
            setSelectedTriggerType(e.target.value as any);
            // Reset trigger based on type
            const baseTrigger: AutomationTrigger = { type: e.target.value as any };
            if (e.target.value === 'task_status_changed') {
              updateTrigger({
                ...baseTrigger,
                type: 'task_status_changed',
                toStatus: 'done',
              });
            } else if (e.target.value === 'task_due_date_approaching') {
              updateTrigger({
                ...baseTrigger,
                type: 'task_due_date_approaching',
                daysBefore: 1,
              });
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
              value={(trigger as any).toStatus || ''}
              onChange={(e) =>
                updateTrigger({
                  ...trigger,
                  type: 'task_status_changed',
                  toStatus: e.target.value,
                })
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
              value={(trigger as any).daysBefore || 1}
              onChange={(e) =>
                updateTrigger({
                  ...trigger,
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
  );
}
