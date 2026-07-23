/**
 * MODULE: Card Component
 *
 * Responsibility:
 * A container component for grouping related information, styled with Tamagui.
 * Provides consistent padding, border, and shadows.
 *
 * Boundaries:
 * - Shared component used across web and mobile.
 * - Purely presentational.
 *
 * Critical invariants:
 * - Must provide consistent layout and elevation.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - Low. Visual container with minimal behavioral impact.
 *
 * Links:
 * - packages/ui/src/index.ts
 *
 * Tags:
 * - domain: ui
 * - risk: low
 * - layer: presentation
 *
 * File:
 * - packages/ui/src/components/Card.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import { styled } from '@tamagui/core';
import { View, ViewStyle } from '@tamagui/core';
import React from 'react';

const StyledCard = styled(View, {
  name: 'Card',
  backgroundColor: 'white',
  padding: '$4',
  borderRadius: '$2',
  borderWidth: 1,
  borderColor: '#e5e7eb',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 2,
});

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style, ...props }: CardProps) {
  return (
    <StyledCard style={style} {...props}>
      {children}
    </StyledCard>
  );
}
