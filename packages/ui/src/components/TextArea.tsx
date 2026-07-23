/**
 * MODULE: TextArea Component
 *
 * Responsibility:
 * A foundational form input component for multi-line text entry, styled with Tamagui.
 * Supports placeholder, value, and change handling with optional error states.
 *
 * Boundaries:
 * - Shared component used across web and mobile.
 * - Bridges Tamagui TextInput for cross-platform support.
 *
 * Critical invariants:
 * - Style consistency across web and mobile platforms.
 * - Supports accessibility via placeholder and multiline props.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - Medium. Form data entry depends on reliable input behavior.
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
 * - packages/ui/src/components/TextArea.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import { styled } from '@tamagui/core';
import { TextInput, TextStyle } from '@tamagui/core';
import React from 'react';

const StyledTextArea = styled(TextInput, {
  name: 'TextArea',
  borderWidth: 1,
  borderColor: '#d1d5db',
  borderRadius: '$2',
  padding: '$3',
  fontSize: '$4',
  backgroundColor: 'white',
  color: '#111827',
  minHeight: 100,
  textAlignVertical: 'top',
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

interface TextAreaProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  variant?: 'default' | 'error';
  style?: TextStyle;
  rows?: number;
}

export function TextArea({
  placeholder,
  value,
  onChangeText,
  variant,
  style,
  rows = 3,
  ...props
}: TextAreaProps) {
  return (
    <StyledTextArea
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      variant={variant}
      style={style}
      multiline
      numberOfLines={rows}
      {...props}
    />
  );
}
