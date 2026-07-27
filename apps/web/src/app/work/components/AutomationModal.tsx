/**
 * MODULE: Automation Rule Create/Edit Modal Component
 *
 * Responsibility:
 * Renders a modal form for creating and editing automation rules, including
 * trigger selection, action configuration, and condition matching.
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: modal, form, automation, rules
 *
 * File:
 * - apps/web/src/app/work/components/AutomationModal.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

'use client';

import { Button, Modal } from '@life-os/ui';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import type {
  AutomationRule,
  AutomationTrigger,
  AutomationAction,
  AutomationCondition,
} from '../types-automation';

import { ActionsSection } from './ActionsSection';
import { AutomationFormFields } from './AutomationFormFields';
import { ConditionsSection } from './ConditionsSection';
import { TriggerSection } from './TriggerSection';

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
    editingRule?.trigger.type || 'task_status_changed',
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
            <AutomationFormFields
              ruleForm={ruleForm}
              projects={projects}
              setRuleForm={setRuleForm}
            />

            <TriggerSection
              selectedTriggerType={selectedTriggerType}
              trigger={ruleForm.trigger}
              setSelectedTriggerType={(type) => setSelectedTriggerType(type as any)}
              updateTrigger={updateTrigger}
            />

            <ConditionsSection
              conditions={ruleForm.conditions}
              addCondition={addCondition}
              updateCondition={updateCondition}
              removeCondition={removeCondition}
            />

            <ActionsSection
              actions={ruleForm.actions}
              addAction={addAction}
              updateAction={updateAction}
              removeAction={removeAction}
            />
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
