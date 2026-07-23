import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Mock Tamagui for testing
vi.mock('@tamagui/core', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styled: (component: keyof JSX.IntrinsicElements | React.ComponentType<any>) => {
    const StyledComponent = ({
      onChangeText,
      numberOfLines,
      editable,
      onChange,
      disabled,
      onPress,
      ...props
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }: any) => {
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
    const componentName =
      typeof component === 'string'
        ? component
        : component.displayName || component.name || 'Component';
    StyledComponent.displayName = `Styled(${componentName})`;
    return StyledComponent;
  },
  TextInput: 'textarea',
  Text: ({ children }: React.PropsWithChildren) => children,
  View: 'div',
  TamaguiProvider: ({ children }: React.PropsWithChildren) => children,
}));
