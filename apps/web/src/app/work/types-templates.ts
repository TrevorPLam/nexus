export interface ProjectTemplate {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isPublic: boolean;
  projectConfig: {
    name: string;
    description: string | null;
    color: string;
  };
  tasks: TemplateTask[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateTask {
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDuration: number | null;
  energyLevel: 'low' | 'medium' | 'high' | null;
  contextTags: string | null;
  dependencies: { title: string; type: string }[];
  subtasks: { title: string; completed: boolean }[];
  order: number;
}

export interface TaskTemplate {
  id: string;
  workspaceId: string;
  projectId: string | null;
  name: string;
  description: string | null;
  taskConfig: {
    title: string;
    description: string | null;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    estimatedDuration: number | null;
    energyLevel: 'low' | 'medium' | 'high' | null;
    contextTags: string | null;
  };
  subtasks: { title: string }[];
  createdAt: Date;
  updatedAt: Date;
}
