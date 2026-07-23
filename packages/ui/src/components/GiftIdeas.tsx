/**
 * MODULE: GiftIdeas Component
 *
 * Responsibility:
 * A list component for displaying gift ideas with purchase tracking.
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
 * - packages/ui/src/components/GiftIdeas.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import { styled } from '@tamagui/core';
import { View, Text, ViewStyle } from '@tamagui/core';
import { ScrollView } from '@tamagui/core';
import React from 'react';

import { Checkbox } from './Checkbox';

const StyledContainer = styled(View, {
  name: 'GiftIdeasContainer',
  flex: 1,
});

const StyledGiftItem = styled(View, {
  name: 'GiftIdeasItem',
  padding: '$3',
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
  flexDirection: 'row',
  alignItems: 'flex-start',
});

const StyledCheckboxContainer = styled(View, {
  name: 'GiftIdeasCheckboxContainer',
  marginRight: 12,
  marginTop: 2,
});

const StyledGiftInfo = styled(View, {
  name: 'GiftIdeasInfo',
  flex: 1,
});

const StyledIdea = styled(Text, {
  name: 'GiftIdeasIdea',
  fontSize: 16,
  fontWeight: '600',
  color: '#111827',
  marginBottom: 4,
});

const StyledDescription = styled(Text, {
  name: 'GiftIdeasDescription',
  fontSize: 14,
  color: '#6b7280',
  marginBottom: 4,
});

const StyledDetails = styled(View, {
  name: 'GiftIdeasDetails',
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 4,
});

const StyledDetail = styled(Text, {
  name: 'GiftIdeasDetail',
  fontSize: 12,
  color: '#6b7280',
  backgroundColor: '#f3f4f6',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 4,
});

const StyledHoliday = styled(Text, {
  name: 'GiftIdeasHoliday',
  fontSize: 12,
  color: '#7c3aed',
  fontWeight: '500',
  marginTop: 4,
});

const StyledPurchasedBadge = styled(Text, {
  name: 'GiftIdeasPurchasedBadge',
  fontSize: 12,
  color: '#059669',
  fontWeight: '500',
  marginTop: 4,
});

const StyledEmptyState = styled(View, {
  name: 'GiftIdeasEmptyState',
  padding: '$6',
  alignItems: 'center',
});

const StyledEmptyText = styled(Text, {
  name: 'GiftIdeasEmptyText',
  fontSize: 16,
  color: '#6b7280',
  textAlign: 'center',
});

interface GiftIdea {
  id: string;
  idea: string;
  description: string | null;
  budget: string | null;
  size: string | null;
  preferences: string | null;
  holiday: string | null;
  isPurchased: boolean;
  purchasedAt: Date | null;
}

interface GiftIdeasProps {
  gifts: GiftIdea[];
  onGiftPress?: (gift: GiftIdea) => void;
  onTogglePurchased?: (gift: GiftIdea) => void;
  style?: ViewStyle;
}

export function GiftIdeas({
  gifts,
  onGiftPress,
  onTogglePurchased,
  style,
  ...props
}: GiftIdeasProps) {
  return (
    <StyledContainer style={style} {...props}>
      <ScrollView>
        {gifts.length === 0 ? (
          <StyledEmptyState>
            <StyledEmptyText>No gift ideas yet</StyledEmptyText>
          </StyledEmptyState>
        ) : (
          gifts.map((gift) => (
            <StyledGiftItem key={gift.id} onPress={() => onGiftPress?.(gift)}>
              {onTogglePurchased && (
                <StyledCheckboxContainer>
                  <Checkbox checked={gift.isPurchased} onChange={() => onTogglePurchased(gift)} />
                </StyledCheckboxContainer>
              )}
              <StyledGiftInfo>
                <StyledIdea
                  style={{
                    textDecoration: gift.isPurchased ? 'line-through' : 'none',
                    opacity: gift.isPurchased ? 0.6 : 1,
                  }}
                >
                  {gift.idea}
                </StyledIdea>
                {gift.description && <StyledDescription>{gift.description}</StyledDescription>}
                <StyledDetails>
                  {gift.budget && <StyledDetail>Budget: {gift.budget}</StyledDetail>}
                  {gift.size && <StyledDetail>Size: {gift.size}</StyledDetail>}
                  {gift.preferences && <StyledDetail>{gift.preferences}</StyledDetail>}
                </StyledDetails>
                {gift.holiday && <StyledHoliday>{gift.holiday}</StyledHoliday>}
                {gift.isPurchased && (
                  <StyledPurchasedBadge>
                    Purchased{' '}
                    {gift.purchasedAt && `on ${new Date(gift.purchasedAt).toLocaleDateString()}`}
                  </StyledPurchasedBadge>
                )}
              </StyledGiftInfo>
            </StyledGiftItem>
          ))
        )}
      </ScrollView>
    </StyledContainer>
  );
}
