import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import WorkPage from './page';
import { createTestWrapper } from './test-utils';

describe('Work Page', () => {
  const { beforeEach: setupBeforeEach, wrapper } = createTestWrapper();

  beforeEach(() => {
    setupBeforeEach();
  });

  it('renders the work page with title', () => {
    render(<WorkPage />, { wrapper });

    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('displays view toggle buttons', () => {
    render(<WorkPage />, { wrapper });

    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
  });

  it('switches to tasks view when Tasks button is clicked', async () => {
    render(<WorkPage />, { wrapper });

    const tasksButton = screen.getByText('Tasks');
    fireEvent.click(tasksButton);

    await waitFor(() => {
      expect(screen.getByText('New Task')).toBeInTheDocument();
    });
  });

  it('switches to timeline view when Timeline button is clicked', async () => {
    render(<WorkPage />, { wrapper });

    const timelineButton = screen.getByText('Timeline');
    fireEvent.click(timelineButton);

    await waitFor(() => {
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });
  });

  it('displays empty state when no projects exist', () => {
    render(<WorkPage />, { wrapper });

    expect(
      screen.getByText('No projects yet. Create your first project to get started.'),
    ).toBeInTheDocument();
  });

  it('displays empty state when no tasks exist', async () => {
    render(<WorkPage />, { wrapper });

    fireEvent.click(screen.getByText('Tasks'));

    await waitFor(() => {
      expect(
        screen.getByText('No tasks yet. Create your first task to get started.'),
      ).toBeInTheDocument();
    });
  });
});
