/**
 * MODULE: InteractionLog Component
 *
 * Responsibility:
 * A list component for displaying contact interactions with filtering.
 * Styled with Tamagui for cross-platform compatibility.
 *
 * Boundaries:
 * - Shared component used across web and mobile.
 * - Purely presentational; data fetching handled by parent.
 *
 * Critical invariants:
 * - Must render consistently on both web and mobile.
 * - Must handle empty states gracefully.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - Low. Presentational component with minimal behavioral impact.
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
 * - packages/ui/src/components/InteractionLog.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import { styled, View, Text, ScrollView } from '@tamagui/core';
import type { ViewStyle } from '@tamagui/core';
import React from 'react';

const StyledContainer = styled(View, {
  name: 'InteractionLogContainer',
  flex: 1,
});

const StyledInteractionItem = styled(View, {
  name: 'InteractionLogItem',
  padding: '$3',
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
});

const StyledInteractionHeader = styled(View, {
  name: 'InteractionLogHeader',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
});

const StyledType = styled(Text, {
  name: 'InteractionLogType',
  fontSize: 14,
  fontWeight: '600',
  color: '#374151',
  textTransform: 'capitalize',
});

const StyledDirection = styled(Text, {
  name: 'InteractionLogDirection',
  fontSize: 12,
  color: '#6b7280',
  textTransform: 'capitalize',
});

const StyledDate = styled(Text, {
  name: 'InteractionLogDate',
  fontSize: 12,
  color: '#9ca3af',
});

const StyledSummary = styled(Text, {
  name: 'InteractionLogSummary',
  fontSize: 14,
  color: '#374151',
  marginBottom: 4,
});

const StyledContext = styled(Text, {
  name: 'InteractionLogContext',
  fontSize: 12,
  color: '#6b7280',
  fontStyle: 'italic',
  marginBottom: 4,
});

const StyledFollowUp = styled(View, {
  name: 'InteractionLogFollowUp',
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 8,
});

const StyledFollowUpText = styled(Text, {
  name: 'InteractionLogFollowUpText',
  fontSize: 12,
  color: '#dc3545',
  fontWeight: '500',
});

const StyledEmptyState = styled(View, {
  name: 'InteractionLogEmptyState',
  padding: '$6',
  alignItems: 'center',
});

const StyledEmptyText = styled(Text, {
  name: 'InteractionLogEmptyText',
  fontSize: 16,
  color: '#6b7280',
  textAlign: 'center',
});

interface Interaction {
  id: string;
  type: string;
  direction: string;
  summary: string | null;
  context: string | null;
  followUpRequired: boolean;
  followUpDate: Date | null;
  createdAt: Date;
}

interface InteractionLogProps {
  interactions: Interaction[];
  onInteractionPress?: (interaction: Interaction) => void;
  style?: ViewStyle;
}

function EmptyState() {
  return (
    <StyledEmptyState>
      <StyledEmptyText>No interactions yet</StyledEmptyText>
    </StyledEmptyState>
  );
}

interface InteractionItemProps {
  interaction: Interaction;
  onPress?: ((interaction: Interaction) => void) | undefined;
}

function InteractionItem({ interaction, onPress }: InteractionItemProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const followUpText = interaction.followUpDate
    ? `Follow up by ${formatDate(interaction.followUpDate)}`
    : 'Follow up required';

  return (
    <StyledInteractionItem onPress={() => onPress?.(interaction)}>
      <StyledInteractionHeader>
        <StyledType>{interaction.type.replace('_', ' ')}</StyledType>
        <StyledDirection>{interaction.direction}</StyledDirection>
      </StyledInteractionHeader>
      <StyledDate>{formatDate(interaction.createdAt)}</StyledDate>
      {interaction.summary && <StyledSummary>{interaction.summary}</StyledSummary>}
      {interaction.context && <StyledContext>{interaction.context}</StyledContext>}
      {interaction.followUpRequired && (
        <StyledFollowUp>
          <StyledFollowUpText>{followUpText}</StyledFollowUpText>
        </StyledFollowUp>
      )}
    </StyledInteractionItem>
  );
}

export function InteractionLog({
  interactions,
  onInteractionPress,
  style,
  ...props
}: InteractionLogProps) {
  return (
    <StyledContainer style={style} {...props}>
      <ScrollView>
        {interactions.length === 0 ? (
          <EmptyState />
        ) : (
          interactions.map((interaction) => (
            <InteractionItem
              key={interaction.id}
              interaction={interaction}
              onPress={onInteractionPress}
            />
          ))
        )}
      </ScrollView>
    </StyledContainer>
  );
}
