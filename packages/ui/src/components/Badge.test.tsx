import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Badge } from './Badge';

describe('Badge Component', () => {
  it('renders children', () => {
    const { getByText } = render(<Badge>Test Badge</Badge>);
    expect(getByText('Test Badge')).toBeInTheDocument();
  });

  it('applies default info variant', () => {
    const { getByText } = render(<Badge>Test</Badge>);
    const badge = getByText('Test');
    expect(badge).toHaveStyle({ backgroundColor: '#3b82f6' });
  });

  it('applies success variant', () => {
    const { getByText } = render(<Badge variant="success">Test</Badge>);
    const badge = getByText('Test');
    expect(badge).toHaveStyle({ backgroundColor: '#10b981' });
  });

  it('applies warning variant', () => {
    const { getByText } = render(<Badge variant="warning">Test</Badge>);
    const badge = getByText('Test');
    expect(badge).toHaveStyle({ backgroundColor: '#f59e0b' });
  });

  it('applies danger variant', () => {
    const { getByText } = render(<Badge variant="danger">Test</Badge>);
    const badge = getByText('Test');
    expect(badge).toHaveStyle({ backgroundColor: '#ef4444' });
  });
});
