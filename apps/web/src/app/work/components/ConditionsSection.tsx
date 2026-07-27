/**
 * MODULE: Conditions Section Component
 *
 * Responsibility:
 * Renders the conditions configuration section for automation rules.
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: modal, form, automation, conditions
 *
 * File:
 * - apps/web/src/app/work/components/ConditionsSection.tsx
 *
 * Last updated:
 * - July 26, 2026
 */

'use client';

import { Button } from '@life-os/ui';
import { Plus, Trash2 } from 'lucide-react';

import type { AutomationCondition } from '../types-automation';

import { conditionTypes, operators } from './automation-constants';

interface ConditionsSectionProps {
  conditions: AutomationCondition[];
  addCondition: () => void;
  updateCondition: (index: number, condition: AutomationCondition) => void;
  removeCondition: (index: number) => void;
}

export function ConditionsSection({
  conditions,
  addCondition,
  updateCondition,
  removeCondition,
}: ConditionsSectionProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">Conditions (optional)</h3>
        <Button variant="secondary" size="small" onPress={addCondition}>
          <Plus className="w-3 h-3 mr-1" />
          Add Condition
        </Button>
      </div>
      <div className="space-y-2">
        {conditions.length === 0 ? (
          <p className="text-xs text-gray-500">
            No conditions - rule applies to all matching triggers
          </p>
        ) : (
          conditions.map((condition, index) => (
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
              <Button variant="secondary" size="small" onPress={() => removeCondition(index)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
