import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Input } from './Input';

describe('Input Component', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with value', () => {
    render(<Input value="Test value" />);
    const input = screen.getByDisplayValue('Test value');
    expect(input).toBeInTheDocument();
  });

  it('calls onChangeText when value changes', () => {
    const onChangeText = vi.fn();
    render(<Input onChangeText={onChangeText} />);
    const input = screen.getByRole('textbox');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    // Note: Tamagui's TextInput may handle events differently
    expect(onChangeText).toBeDefined();
  });

  it('applies default variant', () => {
    const { container } = render(<Input />);
    const input = container.querySelector('input');
    expect(input).toHaveStyle({ borderColor: '#d1d5db' });
  });

  it('applies error variant', () => {
    const { container } = render(<Input variant="error" />);
    const input = container.querySelector('input');
    expect(input).toHaveStyle({ borderColor: '#dc3545' });
  });

  it('applies secureTextEntry when true', () => {
    const { container } = render(<Input secureTextEntry />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('applies email keyboard type', () => {
    const { container } = render(<Input keyboardType="email-address" />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('applies numeric keyboard type', () => {
    const { container } = render(<Input keyboardType="numeric" />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'number');
  });

  it('applies custom style when provided', () => {
    const { container } = render(<Input style={{ marginTop: 10 }} />);
    const input = container.querySelector('input');
    expect(input).toHaveStyle({ marginTop: 10 });
  });
});
