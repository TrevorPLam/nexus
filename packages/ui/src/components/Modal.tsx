/**
 * MODULE: Modal Component
 *
 * Responsibility:
 * A foundational UI component for displaying content in an overlay, styled with Tamagui.
 * Supports opening/closing and handles clicks outside the modal content.
 *
 * Boundaries:
 * - Shared component used across web and mobile.
 * - Presentation logic for the overlay and content container.
 *
 * Critical invariants:
 * - Must handle the 'isOpen' state correctly.
 * - Must trigger 'onClose' when the overlay is pressed.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - Medium. UI flow depends on correct modal behavior.
 *
 * Links:
 * - packages/ui/src/index.ts
 *
 * Tags:
 * - domain: ui
 * - risk: medium
 * - layer: presentation
 *
 * File:
 * - packages/ui/src/components/Modal.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import { styled } from '@tamagui/core';
import { View, ViewStyle } from '@tamagui/core';
import React from 'react';

const StyledOverlay = styled(View, {
  name: 'ModalOverlay',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
});

const StyledContent = styled(View, {
  name: 'ModalContent',
  backgroundColor: 'white',
  borderRadius: '$3',
  padding: '$4',
  maxWidth: 500,
  width: '90%',
  maxHeight: '80%',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.25,
  shadowRadius: 10,
  elevation: 10,
});

interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  style?: ViewStyle;
}

export function Modal({ children, isOpen, onClose, style, ...props }: ModalProps) {
  if (!isOpen) return null;

  return (
    <StyledOverlay onPress={onClose} {...props}>
      <StyledContent style={style} onStartShouldSetResponder={() => true}>
        {children}
      </StyledContent>
    </StyledOverlay>
  );
}
