import { describe, it, expect } from 'vitest';

import { Select } from './Select';

describe('Select Component', () => {
  it('exports Select component', () => {
    expect(Select).toBeDefined();
  });

  it.todo('renders select input');
  it.todo('renders options');
  it.todo('displays placeholder when no value selected');
  it.todo('calls onChange when option selected');
  it.todo('is disabled when disabled prop is true');
  it.todo('displays selected value');
});
