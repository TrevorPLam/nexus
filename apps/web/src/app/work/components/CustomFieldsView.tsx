'use client';

import { Button } from '@life-os/ui';
import {
  Plus,
  Settings2,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Hash,
  Calendar,
  CheckSquare,
  Link,
  Mail,
  Phone,
} from 'lucide-react';

import type { CustomField } from '../types-custom-fields';

interface CustomFieldsViewProps {
  fields: CustomField[];
  loading: boolean;
  onNewField: () => void;
  onEditField: (field: CustomField) => void;
  onDeleteField: (fieldId: string) => void;
  onToggleVisibility: (fieldId: string, isVisible: boolean) => void;
}

export function CustomFieldsView({
  fields,
  loading,
  onNewField,
  onEditField,
  onDeleteField,
  onToggleVisibility,
}: CustomFieldsViewProps) {
  const getFieldTypeIcon = (type: CustomField['type']) => {
    switch (type) {
      case 'text':
        return Hash;
      case 'number':
        return Hash;
      case 'date':
        return Calendar;
      case 'select':
      case 'multi_select':
        return CheckSquare;
      case 'checkbox':
        return CheckSquare;
      case 'url':
        return Link;
      case 'email':
        return Mail;
      case 'phone':
        return Phone;
      case 'progress':
        return Hash;
      default:
        return Hash;
    }
  };

  const getFieldTypeLabel = (type: CustomField['type']) => {
    switch (type) {
      case 'text':
        return 'Text';
      case 'number':
        return 'Number';
      case 'date':
        return 'Date';
      case 'select':
        return 'Single Select';
      case 'multi_select':
        return 'Multi Select';
      case 'checkbox':
        return 'Checkbox';
      case 'url':
        return 'URL';
      case 'email':
        return 'Email';
      case 'phone':
        return 'Phone';
      case 'progress':
        return 'Progress';
      default:
        return 'Unknown';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Custom Fields</h2>
          <p className="text-gray-600 mt-1">
            Add custom properties to tasks for your specific workflow
          </p>
        </div>
        <Button onPress={onNewField}>
          <Plus className="w-4 h-4 mr-2" />
          New Field
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading custom fields...</div>
        </div>
      ) : fields.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <Settings2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No custom fields yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Create custom fields to track information specific to your projects and workflows.
          </p>
          <Button onPress={onNewField}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Field
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Field Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Options / Default
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visibility
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fields.map((field) => {
                const Icon = getFieldTypeIcon(field.type);
                return (
                  <tr key={field.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Icon className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{field.name}</div>
                          {field.isRequired && (
                            <span className="text-xs text-red-600">Required</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getFieldTypeLabel(field.type)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="space-y-1">
                        {field.options && field.options.length > 0 && (
                          <div className="text-xs">
                            {field.options.slice(0, 2).join(', ')}
                            {field.options.length > 2 && '...'}
                          </div>
                        )}
                        {field.defaultValue !== undefined && field.defaultValue !== null && (
                          <div className="text-xs text-gray-500">
                            Default: {String(field.defaultValue)}
                          </div>
                        )}
                        {!field.options && !field.defaultValue && (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => onToggleVisibility(field.id, !field.isVisible)}
                        className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                        title={field.isVisible ? 'Hide in views' : 'Show in views'}
                      >
                        {field.isVisible ? (
                          <Eye className="w-4 h-4 text-gray-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" size="small" onPress={() => onEditField(field)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="small"
                          onPress={() => onDeleteField(field.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Start Suggestions */}
      {fields.length < 3 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Suggested Fields</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Hash className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="font-medium text-sm">Budget</h4>
              </div>
              <p className="text-xs text-gray-500">Track project budget in dollars</p>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckSquare className="w-4 h-4 text-green-600" />
                </div>
                <h4 className="font-medium text-sm">Approval Status</h4>
              </div>
              <p className="text-xs text-gray-500">Select field for approval workflow</p>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Link className="w-4 h-4 text-orange-600" />
                </div>
                <h4 className="font-medium text-sm">Client URL</h4>
              </div>
              <p className="text-xs text-gray-500">Link to client project page</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
