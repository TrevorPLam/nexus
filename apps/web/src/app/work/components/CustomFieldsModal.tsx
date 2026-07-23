/**
 * MODULE: Custom Field Create/Edit Modal Component
 *
 * Responsibility:
 * Renders a modal form for creating and editing custom fields, including
 * field type, options, default value, required/visible flags, and ordering.
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: modal, form, custom-fields
 *
 * File:
 * - apps/web/src/app/work/components/CustomFieldsModal.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

'use client';

import { Button, Input } from '@life-os/ui';
import { Loader2 } from 'lucide-react';

import type { CustomField, CustomFieldType } from '../types-custom-fields';

interface CustomFieldsModalProps {
  isOpen: boolean;
  editingField: CustomField | null;
  fieldForm: {
    name: string;
    type: CustomFieldType;
    options: string;
    defaultValue: string;
    isRequired: boolean;
    isVisible: boolean;
  };
  setFieldForm: (form: CustomFieldsModalProps['fieldForm']) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

const fieldTypes: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Single Select' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'progress', label: 'Progress (0-100%)' },
];

export function CustomFieldsModal({
  isOpen,
  editingField,
  fieldForm,
  setFieldForm,
  onClose,
  onSubmit,
  isPending,
}: CustomFieldsModalProps) {
  const needsOptions = fieldForm.type === 'select' || fieldForm.type === 'multi_select';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">
            {editingField ? 'Edit Custom Field' : 'Create Custom Field'}
          </h2>
          <form onSubmit={onSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Field Name</label>
                <Input
                  placeholder="e.g., Client Name, Budget, Approval Status"
                  value={fieldForm.name}
                  onChangeText={(value) => setFieldForm({ ...fieldForm, name: value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Field Type</label>
                <select
                  value={fieldForm.type}
                  onChange={(e) =>
                    setFieldForm({ ...fieldForm, type: e.target.value as CustomFieldType })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {fieldTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {needsOptions && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Options (comma-separated)
                  </label>
                  <textarea
                    placeholder="e.g., Pending, Approved, Rejected"
                    value={fieldForm.options}
                    onChange={(e) => setFieldForm({ ...fieldForm, options: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate options with commas</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Default Value (optional)</label>
                <Input
                  placeholder="Default value for new tasks"
                  value={fieldForm.defaultValue}
                  onChangeText={(value) => setFieldForm({ ...fieldForm, defaultValue: value })}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={fieldForm.isRequired}
                    onChange={(e) => setFieldForm({ ...fieldForm, isRequired: e.target.checked })}
                    className="rounded"
                  />
                  Required field
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={fieldForm.isVisible}
                    onChange={(e) => setFieldForm({ ...fieldForm, isVisible: e.target.checked })}
                    className="rounded"
                  />
                  Visible in views
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button variant="secondary" onPress={onClose}>
                Cancel
              </Button>
              <button
                type="submit"
                disabled={isPending || !fieldForm.name}
                className="px-4 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingField ? (
                  'Update Field'
                ) : (
                  'Create Field'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
