'use client';

import { Button, Badge } from '@life-os/ui';
import { Plus, Edit2, Trash2, Loader2, ChevronRight } from 'lucide-react';

import type { Project } from '../types';

interface ProjectsViewProps {
  projects: Project[];
  projectsLoading: boolean;
  onNewProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onProjectSelect: (projectId: string) => void;
}

export function ProjectsView({
  projects,
  projectsLoading,
  onNewProject,
  onEditProject,
  onDeleteProject,
  onProjectSelect,
}: ProjectsViewProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Projects</h2>
        <Button onPress={onNewProject}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {projectsLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : projects.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <p className="text-gray-600">
            No projects yet. Create your first project to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow group cursor-pointer"
              onClick={() => onProjectSelect(project.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  {project.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                  )}
                  <h3 className="text-lg font-semibold">{project.name}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="small"
                    onPress={() => onEditProject(project)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onPress={() => onDeleteProject(project.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {project.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {project.status === 'active' && <Badge variant="success">Active</Badge>}
                  {project.status === 'archived' && <Badge variant="default">Archived</Badge>}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
