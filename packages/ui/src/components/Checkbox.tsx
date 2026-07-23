/**
 * MODULE: Checkbox Component
 *
 * Responsibility:
 * A form input component for boolean selection, styled with Tamagui.
 * Includes a label and handles change events.
 *
 * Boundaries:
 * - Shared component used across web and mobile.
 * - Bridges native HTML checkbox (web) and styled view (mobile).
 *
 * Critical invariants:
 * - Must reflect the 'checked' state accurately.
 * - Must trigger 'onChange' with the new state.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - Medium. Form data integrity depends on correct selection handling.
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
 * - packages/ui/src/components/Checkbox.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import { styled } from '@tamagui/core';
import { View, Text, ViewStyle } from '@tamagui/core';
import React from 'react';

const StyledCheckboxWrapper = styled(View, {
  name: 'CheckboxWrapper',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$2',
});

const StyledCheckbox = styled('input', {
  name: 'Checkbox',
  width: 20,
  height: 20,
  borderWidth: 2,
  borderColor: '#d1d5db',
  borderRadius: '$1',
  accentColor: '#007AFF',
});

const StyledLabel = styled(Text, {
  name: 'CheckboxLabel',
  fontSize: '$4',
  color: '#111827',
});

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export function Checkbox({ checked, onChange, label, style, disabled, ...props }: CheckboxProps) {
  return (
    <StyledCheckboxWrapper style={style} {...props}>
      <StyledCheckbox
        type="checkbox"
        checked={checked}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
        disabled={disabled}
      />
      {label && <StyledLabel>{label}</StyledLabel>}
    </StyledCheckboxWrapper>
  );
}
