import { describe, it, expect } from 'vitest';

import { Modal } from './Modal';

describe('Modal Component', () => {
  it('exports Modal component', () => {
    expect(Modal).toBeDefined();
  });

  it.todo('renders modal when open');
  it.todo('does not render when closed');
  it.todo('displays title');
  it.todo('displays children content');
  it.todo('calls onClose when close button clicked');
  it.todo('calls onClose when backdrop clicked');
  it.todo('prevents body scroll when open');
});
