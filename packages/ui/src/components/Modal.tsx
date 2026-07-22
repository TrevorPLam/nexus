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
