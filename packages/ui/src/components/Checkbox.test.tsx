import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Checkbox } from './Checkbox';

describe('Checkbox Component', () => {
  it('exports Checkbox component', () => {
    expect(Checkbox).toBeDefined();
  });

  it('renders checkbox input', () => {
    render(<Checkbox checked={false} onChange={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('handles checked state', () => {
    render(<Checkbox checked={true} onChange={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('handles unchecked state', () => {
    render(<Checkbox checked={false} onChange={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('calls onChange when clicked', () => {
    const handleChange = vi.fn();
    render(<Checkbox checked={false} onChange={handleChange} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Checkbox checked={false} onChange={() => {}} disabled />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('displays label when provided', () => {
    render(<Checkbox checked={false} onChange={() => {}} label="Accept terms" />);
    const label = screen.getByText('Accept terms');
    expect(label).toBeInTheDocument();
  });
});
