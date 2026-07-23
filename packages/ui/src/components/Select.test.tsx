import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Select } from './Select';

describe('Select Component', () => {
  it('exports Select component', () => {
    expect(Select).toBeDefined();
  });

  const mockOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  it('renders select input', () => {
    render(<Select options={mockOptions} onChange={() => {}} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('renders options', () => {
    render(<Select options={mockOptions} onChange={() => {}} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
  });

  it('displays placeholder when no value selected', () => {
    render(<Select options={mockOptions} placeholder="Select an option" onChange={() => {}} />);
    const placeholder = screen.getByText('Select an option');
    expect(placeholder).toBeInTheDocument();
  });

  it('calls onChange when option selected', () => {
    const handleChange = vi.fn();
    render(<Select options={mockOptions} onChange={handleChange} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'option1' } });
    expect(handleChange).toHaveBeenCalledWith('option1');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Select options={mockOptions} disabled onChange={() => {}} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('displays selected value', () => {
    render(<Select options={mockOptions} value="option2" onChange={() => {}} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('option2');
  });
});
