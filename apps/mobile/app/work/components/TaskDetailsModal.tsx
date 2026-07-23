/**
 * MODULE: Task Details Modal
 *
 * Responsibility:
 * Modal for displaying task details and updating task status in the mobile work screen.
 *
 * Boundaries:
 * - Uses shared UI components from packages/ui
 * - Integrates with useUpdateTaskStatus hook for command queue
 * - Displays all relevant task information
 *
 * Critical invariants:
 * - Must display task information read-only
 * - Status updates must go through command queue
 *
 * Side effects:
 * - Enqueues update task command via useUpdateTaskStatus
 *
 * Change risk:
 * - Medium. Status update integration and command queue.
 *
 * Links:
 * - apps/mobile/src/hooks/useWork.ts
 * - packages/ui/src/components/Modal.tsx
 *
 * Tags:
 * - domain: work
 * - risk: medium
 * - layer: presentation
 *
 * File:
 * - apps/mobile/app/work/components/TaskDetailsModal.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import type { TaskRecord } from '@life-os/mobile-data';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import { Button, Modal } from '@life-os/ui';
import { useUpdateTaskStatus, useProjects } from '../../../src/hooks/useWork';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskRecord;
}

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export function TaskDetailsModal({ isOpen, onClose, task }: TaskDetailsModalProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [localStatus, setLocalStatus] = useState(task.status);

  const updateTaskStatus = useUpdateTaskStatus();
  const { data: projects } = useProjects();

  const handleStatusChange = async (newStatus: string) => {
    setLocalStatus(newStatus);
    setShowStatusDropdown(false);

    try {
      await updateTaskStatus.mutateAsync({
        taskId: task.id,
        status: newStatus,
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
      setLocalStatus(task.status);
    }
  };

  const handleClose = () => {
    setLocalStatus(task.status);
    setShowStatusDropdown(false);
    onClose();
  };

  const selectedProject = projects?.find((p) => p.id === task.project_id);
  const selectedStatus = STATUS_OPTIONS.find((s) => s.value === localStatus);

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Task Details</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <Text style={styles.value}>{task.title}</Text>
          </View>

          {task.description && (
            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.value}>{task.description}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Status</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowStatusDropdown(!showStatusDropdown)}
              disabled={updateTaskStatus.isPending}
            >
              <Text style={styles.dropdownText}>{selectedStatus?.label}</Text>
              {updateTaskStatus.isPending && (
                <ActivityIndicator size="small" color="#007AFF" style={styles.dropdownIndicator} />
              )}
            </TouchableOpacity>
            {showStatusDropdown && (
              <View style={styles.dropdownMenu}>
                {STATUS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.dropdownItem}
                    onPress={() => handleStatusChange(option.value)}
                  >
                    <Text style={styles.dropdownItemText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {selectedProject && (
            <View style={styles.field}>
              <Text style={styles.label}>Project</Text>
              <Text style={styles.value}>{selectedProject.name}</Text>
            </View>
          )}

          {task.priority && (
            <View style={styles.field}>
              <Text style={styles.label}>Priority</Text>
              <Text style={styles.value}>{task.priority}</Text>
            </View>
          )}

          {task.due_date && (
            <View style={styles.field}>
              <Text style={styles.label}>Due Date</Text>
              <Text style={styles.value}>{task.due_date}</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Button variant="secondary" onPress={handleClose} disabled={updateTaskStatus.isPending}>
              Close
            </Button>
          </View>

          {updateTaskStatus.error && (
            <Text style={styles.errorText}>Failed to update task status. Please try again.</Text>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    maxHeight: '80%',
  },
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  value: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  dropdownText: {
    fontSize: 16,
    color: '#111827',
  },
  dropdownIndicator: {
    marginLeft: 8,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: 'white',
    maxHeight: 150,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#111827',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  button: {
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 12,
    textAlign: 'center',
  },
});
