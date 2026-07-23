/**
 * MODULE: Project Creation Modal
 *
 * Responsibility:
 * Modal form for creating new projects in the mobile work screen.
 *
 * Boundaries:
 * - Uses shared UI components from packages/ui
 * - Integrates with useCreateProject hook for command queue
 * - Validates form input before submission
 *
 * Critical invariants:
 * - Name field is required
 * - Name max length: 100 characters
 * - Description max length: 500 characters
 *
 * Side effects:
 * - Enqueues create project command via useCreateProject
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
 * - apps/mobile/app/work/components/ProjectCreationModal.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import { Button, Input, Modal, TextArea } from '@life-os/ui';
import { useCreateProject } from '../../../src/hooks/useWork';

interface ProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectCreationModal({ isOpen, onClose }: ProjectCreationModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  const createProject = useCreateProject();

  const validateForm = (): boolean => {
    let isValid = true;

    if (!name.trim()) {
      setNameError('Project name is required');
      isValid = false;
    } else if (name.length > 100) {
      setNameError('Project name must be 100 characters or less');
      isValid = false;
    } else {
      setNameError('');
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
      await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      handleClose();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setNameError('');
    setDescriptionError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Create Project</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Name *</Text>
          <Input
            placeholder="Enter project name"
            value={name}
            onChangeText={setName}
            variant={nameError ? 'error' : 'default'}
            style={styles.input}
          />
          {nameError && <Text style={styles.errorText}>{nameError}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextArea
            placeholder="Enter project description (optional)"
            value={description}
            onChangeText={setDescription}
            variant={descriptionError ? 'error' : 'default'}
            style={styles.textArea}
            rows={3}
          />
          {descriptionError && <Text style={styles.errorText}>{descriptionError}</Text>}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            variant="secondary"
            onPress={handleClose}
            disabled={createProject.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleSubmit}
            disabled={createProject.isPending}
          >
            {createProject.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              'Create'
            )}
          </Button>
        </View>

        {createProject.error && (
          <Text style={styles.errorText}>
            Failed to create project. Please try again.
          </Text>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
