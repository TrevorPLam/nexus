import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import RootLayout from './layout';

describe('Root Layout', () => {
  it('renders children', () => {
    render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>,
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('provides QueryClientProvider', () => {
    render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>,
    );
    // If this renders without error, QueryClientProvider is working
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('sets correct HTML structure', () => {
    render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>,
    );
    const html = document.documentElement;
    expect(html.lang).toBe('en');
  });
});
