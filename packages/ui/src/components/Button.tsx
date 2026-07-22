import { styled } from '@tamagui/core';
import { Text } from '@tamagui/core';
import React from 'react';

const StyledButton = styled('button', {
  name: 'Button',
  backgroundColor: '#007AFF',
  color: 'white',
  padding: '$3',
  borderRadius: '$2',
  fontSize: '$4',
  fontWeight: '600',
  borderWidth: 0,
  cursor: 'pointer',
  variants: {
    variant: {
      primary: {
        backgroundColor: '#007AFF',
      },
      secondary: {
        backgroundColor: '#6c757d',
      },
      danger: {
        backgroundColor: '#dc3545',
      },
    },
    size: {
      small: {
        padding: '$2',
        fontSize: '$3',
      },
      medium: {
        padding: '$3',
        fontSize: '$4',
      },
      large: {
        padding: '$4',
        fontSize: '$5',
      },
    },
  } as const,
  defaultVariants: {
    variant: 'primary',
    size: 'medium',
  },
});

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  disabled?: boolean;
}

export function Button({ children, variant, size, onPress, disabled, ...props }: ButtonProps) {
  return (
    <StyledButton
      variant={variant}
      size={size}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <Text>{children}</Text>
    </StyledButton>
  );
}
