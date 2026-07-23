/**
 * MODULE: Project Templates List View Component
 *
 * Responsibility:
 * Displays the list of project templates with create, duplicate, edit, delete,
 * and apply actions. Shows visibility (public/private) status.
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: list-view, templates
 *
 * File:
 * - apps/web/src/app/work/components/ProjectTemplatesView.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

'use client';

import { Button } from '@life-os/ui';
import { Plus, Copy, Edit, Trash2, FolderOpen, Lock, Globe } from 'lucide-react';

import type { ProjectTemplate } from '../types-templates';

interface ProjectTemplatesViewProps {
  templates: ProjectTemplate[];
  loading: boolean;
  onNewTemplate: () => void;
  onEditTemplate: (template: ProjectTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onUseTemplate: (templateId: string) => void;
}

export function ProjectTemplatesView({
  templates,
  loading,
  onNewTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onUseTemplate,
}: ProjectTemplatesViewProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Project Templates</h2>
          <p className="text-gray-600 mt-1">
            Pre-configured project structures to accelerate your workflow
          </p>
        </div>
        <Button onPress={onNewTemplate}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading templates...</div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Create project templates with pre-defined tasks, subtasks, and configurations to
            standardize your workflows.
          </p>
          <Button onPress={onNewTemplate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${template.color}20` }}
                  >
                    {template.icon || '📋'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {template.isPublic ? (
                        <Globe className="w-3 h-3" />
                      ) : (
                        <Lock className="w-3 h-3" />
                      )}
                      <span>{template.isPublic ? 'Public' : 'Private'}</span>
                      <span>•</span>
                      <span>{template.tasks.length} tasks</span>
                    </div>
                  </div>
                </div>
              </div>

              {template.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>
              )}

              <div className="space-y-2 mb-4">
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Project name:</span> {template.projectConfig.name}
                </div>
                {template.projectConfig.description && (
                  <div className="text-xs text-gray-500 line-clamp-1">
                    <span className="font-medium">Description:</span>{' '}
                    {template.projectConfig.description}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Button
                    variant="secondary"
                    size="small"
                    onPress={() => onUseTemplate(template.id)}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Use Template
                  </Button>
                </div>
                <Button variant="secondary" size="small" onPress={() => onEditTemplate(template)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onPress={() => onDeleteTemplate(template.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Start Templates */}
      {templates.length < 3 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <span className="text-xl">🚀</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Product Launch</h4>
                  <p className="text-xs text-gray-500">12 tasks • 3 phases</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <span className="text-xl">🎨</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Design Sprint</h4>
                  <p className="text-xs text-gray-500">8 tasks • 5 days</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Quarterly Planning</h4>
                  <p className="text-xs text-gray-500">15 tasks • 4 weeks</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
