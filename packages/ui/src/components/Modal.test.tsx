import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Modal } from './Modal';

describe('Modal Component', () => {
  it('exports Modal component', () => {
    expect(Modal).toBeDefined();
  });

  it('renders modal when open', () => {
    render(
      <Modal isOpen onClose={() => {}}>
        <div>Modal Content</div>
      </Modal>,
    );
    const modal = screen.getByText('Modal Content');
    expect(modal).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        <div>Modal Content</div>
      </Modal>,
    );
    const modal = screen.queryByText('Modal Content');
    expect(modal).not.toBeInTheDocument();
  });

  it('displays children content', () => {
    render(
      <Modal isOpen onClose={() => {}}>
        <div>Test Content</div>
      </Modal>,
    );
    const content = screen.getByText('Test Content');
    expect(content).toBeInTheDocument();
  });

  it('calls onClose when backdrop clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen onClose={handleClose}>
        <div>Modal Content</div>
      </Modal>,
    );
    const overlay = screen.getByText('Modal Content').parentElement;
    if (overlay) {
      fireEvent.click(overlay);
      expect(handleClose).toHaveBeenCalled();
    }
  });
});
