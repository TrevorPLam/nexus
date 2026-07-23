/**
 * MODULE: Badge Component
 *
 * Responsibility:
 * A small UI component for displaying tags, statuses, or categories.
 * Supports multiple variants (default, success, warning, danger, info).
 *
 * Boundaries:
 * - Shared component used across web and mobile.
 * - Purely presentational.
 *
 * Critical invariants:
 * - Style consistency across web and mobile platforms.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - Low. Visual element with minimal behavioral impact.
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
 * - packages/ui/src/components/Badge.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import { styled } from '@tamagui/core';
import { Text } from '@tamagui/core';
import React from 'react';

const StyledBadge = styled(Text, {
  name: 'Badge',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$1',
  fontSize: '$2',
  fontWeight: '600',
  variants: {
    variant: {
      default: {
        backgroundColor: '#f3f4f6',
        color: '#374151',
      },
      success: {
        backgroundColor: '#10b981',
        color: 'white',
      },
      warning: {
        backgroundColor: '#f59e0b',
        color: 'white',
      },
      danger: {
        backgroundColor: '#ef4444',
        color: 'white',
      },
      info: {
        backgroundColor: '#3b82f6',
        color: 'white',
      },
    },
  } as const,
});

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ children, variant = 'info', ...props }: BadgeProps) {
  return (
    <StyledBadge variant={variant} {...props}>
      {children}
    </StyledBadge>
  );
}
