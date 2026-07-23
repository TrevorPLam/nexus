import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock Tamagui for testing
vi.mock('@tamagui/core', () => ({
  styled: (component: any) => {
    const StyledComponent = ({ onChangeText, multiline, numberOfLines, editable, ...props }: any) => {
      const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (onChangeText) {
          onChangeText(e.target.value);
        }
      };
      return React.createElement(component, {
        ...props,
        onChange: handleChange,
        disabled: editable === false,
        rows: numberOfLines,
      });
    };
    StyledComponent.displayName = `Styled(${component.displayName || component.name || 'Component'})`;
    return StyledComponent;
  },
  TextInput: 'textarea',
  Text: ({ children }: any) => children,
  TamaguiProvider: ({ children }: any) => children,
}));
