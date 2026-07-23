/**
 * MODULE: Mobile Work Domain Screen
 *
 * Responsibility:
 * Displays and manages work-related data (projects and tasks) for the mobile
 * application. Interfaces with the useWork hooks for data fetching and mutations.
 *
 * Boundaries:
 * - Presentation of projects and tasks in a mobile-optimized view.
 * - Triggers command mutations for data updates.
 * - Workspace isolation via useAuth.
 *
 * Critical invariants:
 * - Must display a workspace selection prompt if no workspace is selected.
 * - Must handle loading and error states for projects and tasks.
 *
 * Side effects:
 * - Fetches data from PowerSync and enqueues commands via hooks.
 *
 * Change risk:
 * - Medium. UI consistency and data synchronization feedback.
 *
 * Links:
 * - apps/mobile/src/hooks/useWork.ts
 *
 * Tags:
 * - domain: work
 * - risk: medium
 * - layer: presentation
 *
 * File:
 * - apps/mobile/app/work/index.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import type { ProjectRecord, TaskRecord } from '@life-os/mobile-data';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, FlatList } from 'react-native';

import { useAuth } from '../../src/contexts/AuthContext';
import { useProjects, useTasks, useCreateProject, useCreateTask, useUpdateTaskStatus } from '../../src/hooks/useWork';
import { ProjectCreationModal } from './components/ProjectCreationModal';

export default function WorkScreen() {
  const { selectedWorkspace, isLoading: authLoading } = useAuth();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const createProject = useCreateProject();
  const createTask = useCreateTask();
  const updateTaskStatus = useUpdateTaskStatus();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // These hooks are ready for use when creation flows are implemented
  void createProject;
  void createTask;
  void updateTaskStatus;

  if (authLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  if (!selectedWorkspace) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.card}>
            <Text style={styles.cardText}>Please select a workspace to view projects and tasks.</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  const handleCreateProject = () => {
    setIsProjectModalOpen(true);
  };

  const handleCreateTask = () => {
    // TODO: Open task creation modal
    console.log('Create task');
  };

  const handleTaskPress = (taskId: string) => {
    // TODO: Open task details
    console.log('Task pressed:', taskId);
  };

  const renderProject = ({ item }: { item: ProjectRecord }) => (
    <TouchableOpacity style={styles.listItem} onPress={() => console.log('Project:', item.id)}>
      <Text style={styles.listItemTitle}>{item.name}</Text>
      {item.description && <Text style={styles.listItemSubtitle}>{item.description}</Text>}
    </TouchableOpacity>
  );

  const renderTask = ({ item }: { item: TaskRecord }) => (
    <TouchableOpacity style={styles.listItem} onPress={() => handleTaskPress(item.id)}>
      <Text style={styles.listItemTitle}>{item.title}</Text>
      <View style={styles.taskMeta}>
        <Text style={styles.taskStatus}>{item.status}</Text>
        {item.priority && <Text style={styles.taskPriority}>{item.priority}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.sectionTitle}>Projects</Text>
        {projectsLoading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : projects && projects.length > 0 ? (
          <FlatList
            data={projects}
            renderItem={renderProject}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            style={styles.list}
          />
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardText}>
              No projects yet. Create your first project to get started.
            </Text>
            <TouchableOpacity style={styles.cardButton} onPress={handleCreateProject}>
              <Text style={styles.cardButtonText}>Create Project</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Tasks</Text>
        {tasksLoading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : tasks && tasks.length > 0 ? (
          <FlatList
            data={tasks}
            renderItem={renderTask}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            style={styles.list}
          />
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardText}>
              No tasks yet. Create a task to start tracking your work.
            </Text>
            <TouchableOpacity style={styles.cardButton} onPress={handleCreateTask}>
              <Text style={styles.cardButtonText}>Create Task</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ProjectCreationModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  cardButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cardButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    marginBottom: 20,
  },
  listItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  taskMeta: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 10,
  },
  taskStatus: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  taskPriority: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
});
