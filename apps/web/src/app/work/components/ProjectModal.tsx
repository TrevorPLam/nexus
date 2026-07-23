'use client';

import { Button, Modal, Input } from '@life-os/ui';
import { Loader2 } from 'lucide-react';

import type { Project } from '../types';

interface ProjectModalProps {
  isOpen: boolean;
  editingProject: Project | null;
  projectForm: {
    name: string;
    description: string;
    color: string;
    icon: string;
  };
  setProjectForm: (form: ProjectModalProps['projectForm']) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

const colorOptions = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function ProjectModal({
  isOpen,
  editingProject,
  projectForm,
  setProjectForm,
  onClose,
  onSubmit,
  isPending,
}: ProjectModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{editingProject ? 'Edit Project' : 'Create Project'}</h2>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input
                placeholder="Project name"
                value={projectForm.name}
                onChangeText={(value) => setProjectForm({ ...projectForm, name: value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description (optional)</label>
              <textarea
                rows={3}
                placeholder="Project description"
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-vertical"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setProjectForm({ ...projectForm, color })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      projectForm.color === color ? 'border-gray-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Icon (optional)</label>
              <Input
                placeholder="Emoji or icon name"
                value={projectForm.icon}
                onChangeText={(value) => setProjectForm({ ...projectForm, icon: value })}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-6">
            <Button variant="secondary" onPress={onClose}>
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingProject ? (
                'Update'
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
