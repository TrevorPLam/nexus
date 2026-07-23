import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock Tamagui for testing
vi.mock('@tamagui/core', () => ({
  styled: (component: any) => {
    const StyledComponent = ({ onChangeText, multiline, numberOfLines, editable, onChange, disabled, onPress, onStartShouldSetResponder, ...props }: any) => {
      // For textarea (TextInput), transform onChangeText to onChange
      if (component === 'textarea' && onChangeText) {
        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          onChangeText(e.target.value);
        };
        return React.createElement(component, {
          ...props,
          onChange: handleChange,
          disabled: editable === false,
          rows: numberOfLines,
        });
      }
      // For other elements, transform React Native events to DOM events
      const handleClick = onPress ? (e: React.MouseEvent) => onPress(e) : undefined;
      return React.createElement(component, {
        ...props,
        onChange,
        disabled,
        onClick: handleClick,
        // Ignore React Native specific props
        onStartShouldSetResponder: undefined,
      });
    };
    StyledComponent.displayName = `Styled(${component.displayName || component.name || 'Component'})`;
    return StyledComponent;
  },
  TextInput: 'textarea',
  Text: ({ children }: any) => children,
  View: 'div',
  TamaguiProvider: ({ children }: any) => children,
}));
