import { styled } from '@tamagui/core';
import { Text } from '@tamagui/core';

const StyledBadge = styled(Text, {
  name: 'Badge',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$1',
  fontSize: '$2',
  fontWeight: '600',
  variants: {
    variant: {
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
  variant?: 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ children, variant = 'info', ...props }: BadgeProps) {
  return (
    <StyledBadge variant={variant} {...props}>
      {children}
    </StyledBadge>
  );
}
