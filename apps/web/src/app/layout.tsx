/**
 * MODULE: Web Root Layout
 *
 * Responsibility:
 * The foundational layout for the Next.js web application. Configures the
 * React Query client, global CSS, and page metadata.
 *
 * Boundaries:
 * - Top-level provider injection (Auth, Query).
 * - Shared UI structure for the entire application.
 *
 * Critical invariants:
 * - QueryClient is initialized with a default staleTime to minimize redundant API calls.
 * - Root HTML and body tags must be present here.
 *
 * Side effects:
 * - Initializes global application state providers.
 *
 * Change risk:
 * - Low. Only affects top-level configuration and styles.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Metadata } from 'next';
import React from 'react';
import './globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export const metadata: Metadata = {
  title: 'Life OS',
  description: 'Personal productivity system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </body>
    </html>
  );
}
