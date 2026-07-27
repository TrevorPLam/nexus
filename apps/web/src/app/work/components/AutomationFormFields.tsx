/**
 * MODULE: Automation Form Fields Component
 *
 * Responsibility:
 * Renders basic form fields for automation rule configuration (name, description, project, active).
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: modal, form, automation
 *
 * File:
 * - apps/web/src/app/work/components/AutomationFormFields.tsx
 *
 * Last updated:
 * - July 26, 2026
 */

'use client';

import { TextArea } from '@life-os/ui';

import type { AutomationTrigger, AutomationAction, AutomationCondition } from '../types-automation';

interface AutomationFormFieldsProps {
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
  setRuleForm: (form: AutomationFormFieldsProps['ruleForm']) => void;
}

export function AutomationFormFields({
  ruleForm,
  projects,
  setRuleForm,
}: AutomationFormFieldsProps) {
  return (
    <>
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
        <label htmlFor="isActive" className="text-sm">
          Active
        </label>
      </div>
    </>
  );
}
