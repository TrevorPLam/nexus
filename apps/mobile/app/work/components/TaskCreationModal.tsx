/**
 * MODULE: Task Creation Modal
 *
 * Responsibility:
 * Modal form for creating new tasks in the mobile work screen.
 *
 * Boundaries:
 * - Uses shared UI components from packages/ui
 * - Integrates with useCreateTask hook for command queue
 * - Validates form input before submission
 *
 * Critical invariants:
 * - Title field is required
 * - Title max length: 200 characters
 * - Description max length: 500 characters
 *
 * Side effects:
 * - Enqueues create task command via useCreateTask
 *
 * Change risk:
 * - Medium. Form validation and command queue integration.
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
 * - apps/mobile/app/work/components/TaskCreationModal.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';

import { Button, Input, Modal, TextArea } from '@life-os/ui';
import { useCreateTask, useProjects } from '../../../src/hooks/useWork';

interface TaskCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function TaskCreationModal({ isOpen, onClose }: TaskCreationModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  const createTask = useCreateTask();
  const { data: projects } = useProjects();

  const validateForm = (): boolean => {
    let isValid = true;

    if (!title.trim()) {
      setTitleError('Task title is required');
      isValid = false;
    } else if (title.length > 200) {
      setTitleError('Task title must be 200 characters or less');
      isValid = false;
    } else {
      setTitleError('');
    }

    if (description.length > 500) {
      setDescriptionError('Description must be 500 characters or less');
      isValid = false;
    } else {
      setDescriptionError('');
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: projectId || undefined,
        priority,
        dueDate: dueDate || undefined,
      });
      handleClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setProjectId('');
    setPriority('medium');
    setDueDate('');
    setTitleError('');
    setDescriptionError('');
    setShowPriorityDropdown(false);
    onClose();
  };

  const selectedProject = projects?.find((p) => p.id === projectId);
  const selectedPriority = PRIORITY_OPTIONS.find((p) => p.value === priority);

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Create Task</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Title *</Text>
            <Input
              placeholder="Enter task title"
              value={title}
              onChangeText={setTitle}
              variant={titleError ? 'error' : 'default'}
              style={styles.input}
            />
            {titleError && <Text style={styles.errorText}>{titleError}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextArea
              placeholder="Enter task description (optional)"
              value={description}
              onChangeText={setDescription}
              variant={descriptionError ? 'error' : 'default'}
              style={styles.textArea}
              rows={3}
            />
            {descriptionError && <Text style={styles.errorText}>{descriptionError}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Project</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => {
                // For simplicity, we'll just cycle through projects
                if (projects && projects.length > 0) {
                  const currentIndex = projects.findIndex((p) => p.id === projectId);
                  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % projects.length;
                  setProjectId(projects[nextIndex].id);
                }
              }}
            >
              <Text style={styles.dropdownText}>
                {selectedProject ? selectedProject.name : 'No project'}
              </Text>
            </TouchableOpacity>
            {projects && projects.length > 0 && (
              <Text style={styles.hintText}>Tap to cycle through projects</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Priority</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowPriorityDropdown(!showPriorityDropdown)}
            >
              <Text style={styles.dropdownText}>{selectedPriority?.label}</Text>
            </TouchableOpacity>
            {showPriorityDropdown && (
              <View style={styles.dropdownMenu}>
                {PRIORITY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setPriority(option.value);
                      setShowPriorityDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Due Date</Text>
            <Input
              placeholder="YYYY-MM-DD (optional)"
              value={dueDate}
              onChangeText={setDueDate}
              keyboardType="default"
              style={styles.input}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              variant="secondary"
              onPress={handleClose}
              disabled={createTask.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={handleSubmit}
              disabled={createTask.isPending}
            >
              {createTask.isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                'Create'
              )}
            </Button>
          </View>

          {createTask.error && (
            <Text style={styles.errorText}>
              Failed to create task. Please try again.
            </Text>
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
  input: {
    marginBottom: 4,
  },
  textArea: {
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 4,
  },
  dropdown: {
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
  hintText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
});
