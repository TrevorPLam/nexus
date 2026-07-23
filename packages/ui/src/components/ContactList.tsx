/**
 * MODULE: ContactList Component
 *
 * Responsibility:
 * A list component for displaying contacts with search and filtering capabilities.
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
 * - packages/ui/src/components/ContactList.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import { styled, View, Text, ScrollView } from '@tamagui/core';
import type { ViewStyle } from '@tamagui/core';
import React from 'react';

const StyledContainer = styled(View, {
  name: 'ContactListContainer',
  flex: 1,
});

const StyledSearchInput = styled(View, {
  name: 'ContactListSearchInput',
  backgroundColor: '#f3f4f6',
  borderRadius: '$2',
  padding: '$3',
  marginBottom: '$3',
});

const StyledContactItem = styled(View, {
  name: 'ContactListItem',
  padding: '$3',
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
  alignItems: 'center',
  flexDirection: 'row',
});

const StyledContactInfo = styled(View, {
  name: 'ContactListInfo',
  flex: 1,
});

const StyledName = styled(Text, {
  name: 'ContactListName',
  fontSize: 16,
  fontWeight: '600',
  color: '#111827',
  marginBottom: 2,
});

const StyledEmail = styled(Text, {
  name: 'ContactListEmail',
  fontSize: 14,
  color: '#6b7280',
});

const StyledTags = styled(View, {
  name: 'ContactListTags',
  flexDirection: 'row',
  flexWrap: 'wrap',
  marginTop: 4,
});

const StyledTag = styled(Text, {
  name: 'ContactListTag',
  fontSize: 12,
  color: '#6b7280',
  backgroundColor: '#f3f4f6',
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 4,
  marginRight: 4,
  marginBottom: 2,
});

const StyledEmptyState = styled(View, {
  name: 'ContactListEmptyState',
  padding: '$6',
  alignItems: 'center',
});

const StyledEmptyText = styled(Text, {
  name: 'ContactListEmptyText',
  fontSize: 16,
  color: '#6b7280',
  textAlign: 'center',
});

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: string[] | null;
  relationshipStrength: string | null;
}

interface ContactListProps {
  contacts: Contact[];
  onContactPress?: (contact: Contact) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  style?: ViewStyle;
}

function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <StyledEmptyState>
      <StyledEmptyText>{searchQuery ? 'No contacts found' : 'No contacts yet'}</StyledEmptyText>
    </StyledEmptyState>
  );
}

interface ContactTagsProps {
  tags: string[];
}

function ContactTags({ tags }: ContactTagsProps) {
  return (
    <StyledTags>
      {tags.map((tag, index) => (
        <StyledTag key={index}>{tag}</StyledTag>
      ))}
    </StyledTags>
  );
}

interface ContactItemProps {
  contact: Contact;
  onPress?: ((contact: Contact) => void) | undefined;
}

function ContactItem({ contact, onPress }: ContactItemProps) {
  return (
    <StyledContactItem onPress={() => onPress?.(contact)}>
      <StyledContactInfo>
        <StyledName>{contact.name}</StyledName>
        {contact.email && <StyledEmail>{contact.email}</StyledEmail>}
        {contact.tags && contact.tags.length > 0 && <ContactTags tags={contact.tags} />}
      </StyledContactInfo>
    </StyledContactItem>
  );
}

export function ContactList({
  contacts,
  onContactPress,
  searchQuery = '',
  onSearchChange,
  style,
  ...props
}: ContactListProps) {
  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.includes(searchQuery),
  );

  return (
    <StyledContainer style={style} {...props}>
      {onSearchChange && (
        <StyledSearchInput>
          <Text style={{ fontSize: 14, color: '#6b7280' }}>
            {searchQuery || 'Search contacts...'}
          </Text>
        </StyledSearchInput>
      )}

      <ScrollView flex={1}>
        {filteredContacts.length === 0 ? (
          <EmptyState searchQuery={searchQuery} />
        ) : (
          filteredContacts.map((contact) => (
            <ContactItem key={contact.id} contact={contact} onPress={onContactPress} />
          ))
        )}
      </ScrollView>
    </StyledContainer>
  );
}
