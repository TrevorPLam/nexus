import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onPress when clicked', () => {
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Click me</Button>);
    screen.getByText('Click me').click();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies default primary variant', () => {
    const { container } = render(<Button>Test</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveStyle({ backgroundColor: '#007AFF' });
  });

  it('applies secondary variant', () => {
    const { container } = render(<Button variant="secondary">Test</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveStyle({ backgroundColor: '#6c757d' });
  });

  it('applies danger variant', () => {
    const { container } = render(<Button variant="danger">Test</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveStyle({ backgroundColor: '#dc3545' });
  });

  it('applies small size', () => {
    const { container } = render(<Button size="small">Test</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveStyle({ padding: '$2' });
  });

  it('applies large size', () => {
    const { container } = render(<Button size="large">Test</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveStyle({ padding: '$4' });
  });

  it('is disabled when disabled prop is true', () => {
    const { container } = render(<Button disabled>Test</Button>);
    const button = container.querySelector('button');
    expect(button).toBeDisabled();
  });
});
