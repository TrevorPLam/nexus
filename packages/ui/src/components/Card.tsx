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
