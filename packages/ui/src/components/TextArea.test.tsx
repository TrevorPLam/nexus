import { describe, it, expect } from 'vitest';

import { TextArea } from './TextArea';

describe('TextArea Component', () => {
  it('exports TextArea component', () => {
    expect(TextArea).toBeDefined();
  });

  it.todo('renders textarea input');
  it.todo('displays placeholder text');
  it.todo('displays initial value');
  it.todo('calls onChange when text entered');
  it.todo('is disabled when disabled prop is true');
  it.todo('respects maxLength prop');
  it.todo('respects rows prop');
});
