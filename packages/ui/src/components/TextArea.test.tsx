import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { TextArea } from './TextArea';

describe('TextArea Component', () => {
  it('exports TextArea component', () => {
    expect(TextArea).toBeDefined();
  });

  it('renders textarea input', () => {
    render(<TextArea />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('displays placeholder text', () => {
    render(<TextArea placeholder="Enter your text" />);
    const textarea = screen.getByPlaceholderText('Enter your text');
    expect(textarea).toBeInTheDocument();
  });

  it('displays initial value', () => {
    render(<TextArea value="Initial value" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveDisplayValue('Initial value');
  });

  it('calls onChange when text entered', () => {
    const handleChange = vi.fn();
    render(<TextArea onChangeText={handleChange} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New text' } });
    expect(handleChange).toHaveBeenCalledWith('New text');
  });

  it('respects rows prop', () => {
    render(<TextArea rows={5} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '5');
  });
});
