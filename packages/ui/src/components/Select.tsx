import { styled } from '@tamagui/core';
import { View, ViewStyle } from '@tamagui/core';
import React from 'react';

const StyledSelectWrapper = styled(View, {
  name: 'SelectWrapper',
  borderWidth: 1,
  borderColor: '#d1d5db',
  borderRadius: '$2',
  backgroundColor: 'white',
  overflow: 'hidden',
});

const StyledSelect = styled('select', {
  name: 'Select',
  padding: '$3',
  fontSize: '$4',
  color: '#111827',
  borderWidth: 0,
  backgroundColor: 'transparent',
  width: '100%',
});

const StyledOption = styled('option', {
  name: 'Option',
  padding: '$2',
});

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export function Select({
  options,
  value,
  onChange,
  placeholder,
  style,
  disabled,
  ...props
}: SelectProps) {
  return (
    <StyledSelectWrapper style={style} {...props}>
      <StyledSelect
        value={value}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        disabled={disabled}
      >
        {placeholder && <StyledOption value="">{placeholder}</StyledOption>}
        {options.map((option) => (
          <StyledOption key={option.value} value={option.value}>
            {option.label}
          </StyledOption>
        ))}
      </StyledSelect>
    </StyledSelectWrapper>
  );
}
