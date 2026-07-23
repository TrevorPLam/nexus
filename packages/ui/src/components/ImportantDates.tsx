/**
 * MODULE: ImportantDates Component
 *
 * Responsibility:
 * A list component for displaying important dates (birthdays, anniversaries, etc.).
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
 * - packages/ui/src/components/ImportantDates.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import { styled } from '@tamagui/core';
import { View, Text, ViewStyle } from '@tamagui/core';
import { ScrollView } from '@tamagui/core';
import React from 'react';

const StyledContainer = styled(View, {
  name: 'ImportantDatesContainer',
  flex: 1,
});

const StyledDateItem = styled(View, {
  name: 'ImportantDatesItem',
  padding: '$3',
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
  flexDirection: 'row',
  alignItems: 'center',
});

const StyledDateIcon = styled(View, {
  name: 'ImportantDatesIcon',
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: '#dbeafe',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 12,
});

const StyledDateText = styled(Text, {
  name: 'ImportantDatesDateText',
  fontSize: 18,
  fontWeight: '700',
  color: '#1e40af',
});

const StyledDateInfo = styled(View, {
  name: 'ImportantDatesInfo',
  flex: 1,
});

const StyledLabel = styled(Text, {
  name: 'ImportantDatesLabel',
  fontSize: 16,
  fontWeight: '600',
  color: '#111827',
  marginBottom: 2,
});

const StyledType = styled(Text, {
  name: 'ImportantDatesType',
  fontSize: 14,
  color: '#6b7280',
  textTransform: 'capitalize',
});

const StyledReminder = styled(View, {
  name: 'ImportantDatesReminder',
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 4,
});

const StyledReminderText = styled(Text, {
  name: 'ImportantDatesReminderText',
  fontSize: 12,
  color: '#059669',
});

const StyledEmptyState = styled(View, {
  name: 'ImportantDatesEmptyState',
  padding: '$6',
  alignItems: 'center',
});

const StyledEmptyText = styled(Text, {
  name: 'ImportantDatesEmptyText',
  fontSize: 16,
  color: '#6b7280',
  textAlign: 'center',
});

interface ImportantDate {
  id: string;
  type: string;
  label: string;
  date: string;
  year: string | null;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
}

interface ImportantDatesProps {
  dates: ImportantDate[];
  onDatePress?: (date: ImportantDate) => void;
  style?: ViewStyle;
}

export function ImportantDates({ dates, onDatePress, style, ...props }: ImportantDatesProps) {
  const formatDisplayDate = (date: string) => {
    const [month, day] = date.split('-');
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${monthNames[parseInt(month) - 1]} ${day}`;
  };

  return (
    <StyledContainer style={style} {...props}>
      <ScrollView>
        {dates.length === 0 ? (
          <StyledEmptyState>
            <StyledEmptyText>No important dates yet</StyledEmptyText>
          </StyledEmptyState>
        ) : (
          dates.map((date) => (
            <StyledDateItem key={date.id} onPress={() => onDatePress?.(date)}>
              <StyledDateIcon>
                <StyledDateText>{formatDisplayDate(date.date)}</StyledDateText>
              </StyledDateIcon>
              <StyledDateInfo>
                <StyledLabel>{date.label}</StyledLabel>
                <StyledType>{date.type}</StyledType>
                {date.reminderEnabled && date.reminderDaysBefore > 0 && (
                  <StyledReminder>
                    <StyledReminderText>
                      Reminder: {date.reminderDaysBefore} day
                      {date.reminderDaysBefore !== 1 ? 's' : ''} before
                    </StyledReminderText>
                  </StyledReminder>
                )}
              </StyledDateInfo>
            </StyledDateItem>
          ))
        )}
      </ScrollView>
    </StyledContainer>
  );
}
