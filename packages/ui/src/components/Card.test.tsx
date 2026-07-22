import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card Component', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies default styles', () => {
    const { container } = render(<Card>Test</Card>);
    const card = container.firstChild;
    expect(card).toHaveStyle({ backgroundColor: 'white' });
    expect(card).toHaveStyle({ padding: '$4' });
    expect(card).toHaveStyle({ borderRadius: '$2' });
  });

  it('applies custom style when provided', () => {
    const { container } = render(<Card style={{ marginTop: 10 }}>Test</Card>);
    const card = container.firstChild;
    expect(card).toHaveStyle({ marginTop: 10 });
  });

  it('renders multiple children', () => {
    const { container } = render(
      <Card>
        <div>First child</div>
        <div>Second child</div>
      </Card>
    );
    expect(container.firstChild?.childNodes.length).toBe(2);
  });
});
