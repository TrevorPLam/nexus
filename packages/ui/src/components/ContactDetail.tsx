/**
 * MODULE: ContactDetail Component
 *
 * Responsibility:
 * A detail view component for displaying full contact information.
 * Styled with Tamagui for cross-platform compatibility.
 *
 * Boundaries:
 * - Shared component used across web and mobile.
 * - Purely presentational; editing handled by parent.
 *
 * Critical invariants:
 * - Must render consistently on both web and mobile.
 * - Must handle missing optional fields gracefully.
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
 * - packages/ui/src/components/ContactDetail.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import { styled } from '@tamagui/core';
import { View, Text, ViewStyle } from '@tamagui/core';
import { ScrollView } from '@tamagui/core';
import React from 'react';

import { Button } from './Button';
import { Card } from './Card';

const StyledContainer = styled(View, {
  name: 'ContactDetailContainer',
  flex: 1,
  padding: '$4',
});

const StyledHeader = styled(View, {
  name: 'ContactDetailHeader',
  marginBottom: 24,
});

const StyledName = styled(Text, {
  name: 'ContactDetailName',
  fontSize: 28,
  fontWeight: '700',
  color: '#111827',
  marginBottom: 8,
});

const StyledEmail = styled(Text, {
  name: 'ContactDetailEmail',
  fontSize: 16,
  color: '#6b7280',
  marginBottom: 4,
});

const StyledPhone = styled(Text, {
  name: 'ContactDetailPhone',
  fontSize: 16,
  color: '#6b7280',
});

const StyledSection = styled(View, {
  name: 'ContactDetailSection',
  marginBottom: 24,
});

const StyledSectionTitle = styled(Text, {
  name: 'ContactDetailSectionTitle',
  fontSize: 18,
  fontWeight: '600',
  color: '#374151',
  marginBottom: 12,
});

const StyledField = styled(View, {
  name: 'ContactDetailField',
  marginBottom: 8,
});

const StyledLabel = styled(Text, {
  name: 'ContactDetailLabel',
  fontSize: 14,
  fontWeight: '500',
  color: '#6b7280',
  marginBottom: 4,
});

const StyledValue = styled(Text, {
  name: 'ContactDetailValue',
  fontSize: 16,
  color: '#111827',
});

const StyledTags = styled(View, {
  name: 'ContactDetailTags',
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
});

const StyledTag = styled(Text, {
  name: 'ContactDetailTag',
  fontSize: 14,
  color: '#374151',
  backgroundColor: '#f3f4f6',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 6,
});

const StyledNotes = styled(Text, {
  name: 'ContactDetailNotes',
  fontSize: 16,
  color: '#374151',
  lineHeight: 24,
});

const StyledButtonContainer = styled(View, {
  name: 'ContactDetailButtonContainer',
  flexDirection: 'row',
  gap: 12,
  marginTop: 24,
});

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tags: string[] | null;
  relationshipStrength: string | null;
  notes: string | null;
}

interface ContactDetailProps {
  contact: Contact;
  onEdit?: () => void;
  onDelete?: () => void;
  style?: ViewStyle;
}

export function ContactDetail({ contact, onEdit, onDelete, style, ...props }: ContactDetailProps) {
  return (
    <StyledContainer style={style} {...props}>
      <ScrollView>
        <StyledHeader>
          <StyledName>{contact.name}</StyledName>
          {contact.email && <StyledEmail>{contact.email}</StyledEmail>}
          {contact.phone && <StyledPhone>{contact.phone}</StyledPhone>}
        </StyledHeader>

        <Card>
          <StyledSection>
            <StyledSectionTitle>Contact Information</StyledSectionTitle>

            {contact.address && (
              <StyledField>
                <StyledLabel>Address</StyledLabel>
                <StyledValue>{contact.address}</StyledValue>
              </StyledField>
            )}

            {contact.relationshipStrength && (
              <StyledField>
                <StyledLabel>Relationship</StyledLabel>
                <StyledValue>
                  {contact.relationshipStrength.charAt(0).toUpperCase() +
                    contact.relationshipStrength.slice(1)}
                </StyledValue>
              </StyledField>
            )}

            {contact.tags && contact.tags.length > 0 && (
              <StyledField>
                <StyledLabel>Tags</StyledLabel>
                <StyledTags>
                  {contact.tags.map((tag, index) => (
                    <StyledTag key={index}>{tag}</StyledTag>
                  ))}
                </StyledTags>
              </StyledField>
            )}
          </StyledSection>

          {contact.notes && (
            <StyledSection>
              <StyledSectionTitle>Notes</StyledSectionTitle>
              <StyledNotes>{contact.notes}</StyledNotes>
            </StyledSection>
          )}
        </Card>

        {(onEdit || onDelete) && (
          <StyledButtonContainer>
            {onEdit && (
              <Button onPress={onEdit} variant="secondary">
                Edit
              </Button>
            )}
            {onDelete && (
              <Button onPress={onDelete} variant="danger">
                Delete
              </Button>
            )}
          </StyledButtonContainer>
        )}
      </ScrollView>
    </StyledContainer>
  );
}
