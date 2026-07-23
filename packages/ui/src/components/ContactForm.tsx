/**
 * MODULE: ContactForm Component
 *
 * Responsibility:
 * A form component for creating and editing contacts.
 * Styled with Tamagui for cross-platform compatibility.
 *
 * Boundaries:
 * - Shared component used across web and mobile.
 * - Purely presentational; form submission handled by parent.
 *
 * Critical invariants:
 * - Must render consistently on both web and mobile.
 * - Must validate required fields.
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
 * - packages/ui/src/components/ContactForm.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

import { styled } from '@tamagui/core';
import { View, Text, ViewStyle } from '@tamagui/core';
import { ScrollView } from '@tamagui/core';
import React from 'react';

import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { TextArea } from './TextArea';

const StyledContainer = styled(View, {
  name: 'ContactFormContainer',
  flex: 1,
  padding: '$4',
});

const StyledLabel = styled(Text, {
  name: 'ContactFormLabel',
  fontSize: 14,
  fontWeight: '600',
  color: '#374151',
  marginBottom: 8,
});

const StyledField = styled(View, {
  name: 'ContactFormField',
  marginBottom: 16,
});

const StyledSection = styled(View, {
  name: 'ContactFormSection',
  marginBottom: 24,
});

const StyledSectionTitle = styled(Text, {
  name: 'ContactFormSectionTitle',
  fontSize: 18,
  fontWeight: '700',
  color: '#111827',
  marginBottom: 16,
});

const StyledButtonContainer = styled(View, {
  name: 'ContactFormButtonContainer',
  flexDirection: 'row',
  gap: 12,
  marginTop: 24,
});

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  tags: string[];
  relationshipStrength: string;
  notes: string;
}

interface ContactFormProps {
  initialData?: Partial<ContactFormData>;
  onSubmit: (data: ContactFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
  style?: ViewStyle;
}

export function ContactForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  style,
  ...props
}: ContactFormProps) {
  const [formData, setFormData] = React.useState<ContactFormData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    tags: initialData?.tags || [],
    relationshipStrength: initialData?.relationshipStrength || '',
    notes: initialData?.notes || '',
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      return;
    }
    onSubmit(formData);
  };

  return (
    <StyledContainer style={style} {...props}>
      <ScrollView>
        <StyledSection>
          <StyledSectionTitle>Basic Information</StyledSectionTitle>

          <StyledField>
            <StyledLabel>Name *</StyledLabel>
            <Input
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter name"
            />
          </StyledField>

          <StyledField>
            <StyledLabel>Email</StyledLabel>
            <Input
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="email@example.com"
              keyboardType="email-address"
            />
          </StyledField>

          <StyledField>
            <StyledLabel>Phone</StyledLabel>
            <Input
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="+1 (555) 000-0000"
              keyboardType="numeric"
            />
          </StyledField>

          <StyledField>
            <StyledLabel>Address</StyledLabel>
            <Input
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="123 Main St, City, State"
            />
          </StyledField>
        </StyledSection>

        <StyledSection>
          <StyledSectionTitle>Relationship</StyledSectionTitle>

          <StyledField>
            <StyledLabel>Relationship Strength</StyledLabel>
            <Select
              value={formData.relationshipStrength}
              onChange={(value: string) =>
                setFormData({ ...formData, relationshipStrength: value })
              }
              options={[
                { label: 'Select...', value: '' },
                { label: 'Close', value: 'close' },
                { label: 'Moderate', value: 'moderate' },
                { label: 'Acquaintance', value: 'acquaintance' },
                { label: 'Professional', value: 'professional' },
              ]}
            />
          </StyledField>

          <StyledField>
            <StyledLabel>Tags (comma-separated)</StyledLabel>
            <Input
              value={formData.tags.join(', ')}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  tags: text
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              placeholder="family, friend, work"
            />
          </StyledField>
        </StyledSection>

        <StyledSection>
          <StyledSectionTitle>Notes</StyledSectionTitle>

          <StyledField>
            <StyledLabel>Additional Notes</StyledLabel>
            <TextArea
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Add any additional information..."
              rows={4}
            />
          </StyledField>
        </StyledSection>

        <StyledButtonContainer>
          {onCancel && (
            <Button onPress={onCancel} variant="secondary">
              Cancel
            </Button>
          )}
          <Button onPress={handleSubmit}>{submitLabel}</Button>
        </StyledButtonContainer>
      </ScrollView>
    </StyledContainer>
  );
}
