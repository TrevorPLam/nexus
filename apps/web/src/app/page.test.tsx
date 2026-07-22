import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import Home from './page';

describe('Home Page', () => {
  it('renders main heading', () => {
    render(<Home />);
    expect(screen.getByText('Life OS')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    render(<Home />);
    expect(screen.getByText('Personal productivity system')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Home />);
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('has correct link hrefs', () => {
    render(<Home />);
    const workLink = screen.getByText('Work');
    const calendarLink = screen.getByText('Calendar');

    expect(workLink.closest('a')).toHaveAttribute('href', '/work');
    expect(calendarLink.closest('a')).toHaveAttribute('href', '/calendar');
  });
});
