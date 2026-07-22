import { styled } from '@tamagui/core';
import { TextInput, TextStyle } from '@tamagui/core';
import React from 'react';

const StyledInput = styled(TextInput, {
  name: 'Input',
  borderWidth: 1,
  borderColor: '#d1d5db',
  borderRadius: '$2',
  padding: '$3',
  fontSize: '$4',
  backgroundColor: 'white',
  color: '#111827',
  variants: {
    variant: {
      default: {
        borderColor: '#d1d5db',
      },
      error: {
        borderColor: '#dc3545',
      },
    },
  } as const,
  defaultVariants: {
    variant: 'default',
  },
});

interface InputProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  variant?: 'default' | 'error';
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  style?: TextStyle;
}

export function Input({
  placeholder,
  value,
  onChangeText,
  variant,
  secureTextEntry,
  keyboardType,
  style,
  ...props
}: InputProps) {
  return (
    <StyledInput
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      variant={variant}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      style={style}
      {...props}
    />
  );
}
