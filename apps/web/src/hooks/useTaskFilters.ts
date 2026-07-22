interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string | null;
  parentId: string | null;
  description?: string | null;
  energyLevel?: string | null;
  estimatedDuration?: number | null;
}

export function useTaskFilters(
  tasks: Task[],
  selectedProject: string | null,
  filterPriority: string | null,
) {
  const getTasksByStatus = (status: string) => {
    let filtered = tasks.filter((task) => task.status === status);

    if (selectedProject) {
      filtered = filtered.filter((task) => task.projectId === selectedProject);
    }

    if (filterPriority) {
      filtered = filtered.filter((task) => task.priority === filterPriority);
    }

    return filtered;
  };

  const getTasksForTimeline = () => {
    let filtered = tasks.filter((task) => task.dueDate);

    if (selectedProject) {
      filtered = filtered.filter((task) => task.projectId === selectedProject);
    }

    if (filterPriority) {
      filtered = filtered.filter((task) => task.priority === filterPriority);
    }

    return filtered;
  };

  return { getTasksByStatus, getTasksForTimeline };
}
