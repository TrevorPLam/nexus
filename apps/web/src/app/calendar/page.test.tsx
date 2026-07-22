import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CalendarPage from './page';

// Mock the custom hooks
vi.mock('../../hooks/useCalendarData', () => ({
  useCalendarData: vi.fn(() => ({
    calendars: [],
    calendarsLoading: false,
    events: [],
    createCalendarMutation: { mutate: vi.fn(), isPending: false },
    updateCalendarMutation: { mutate: vi.fn(), isPending: false },
    deleteCalendarMutation: { mutate: vi.fn(), isPending: false },
    createEventMutation: { mutate: vi.fn(), isPending: false },
    updateEventMutation: { mutate: vi.fn(), isPending: false },
    deleteEventMutation: { mutate: vi.fn(), isPending: false },
  })),
}));

vi.mock('../../hooks/useEventDetails', () => ({
  useEventDetails: vi.fn(() => ({
    attendees: [],
    createAttendeeMutation: { mutate: vi.fn() },
    deleteAttendeeMutation: { mutate: vi.fn() },
    schedulingLinks: [],
    createSchedulingLinkMutation: { mutate: vi.fn() },
    updateSchedulingLinkMutation: { mutate: vi.fn() },
    deleteSchedulingLinkMutation: { mutate: vi.fn() },
  })),
}));

// Mock the UI components
vi.mock('@life-os/ui', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onPress, variant }: any) => (
    <button onClick={onPress} data-variant={variant}>
      {children}
    </button>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Modal: ({ isOpen, onClose, children }: any) =>
    isOpen ? (
      <div role="dialog">
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>,
}));

describe('Calendar Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the calendar page with title', () => {
    render(<CalendarPage />);

    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Manage your events and schedule')).toBeInTheDocument();
  });

  it('displays view toggle buttons', () => {
    render(<CalendarPage />);

    expect(screen.getByText('Calendars')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Scheduling')).toBeInTheDocument();
  });

  it('switches to events view when Events button is clicked', async () => {
    render(<CalendarPage />);

    const eventsButton = screen.getByText('Events');
    fireEvent.click(eventsButton);

    await waitFor(() => {
      expect(screen.getByText('New Event')).toBeInTheDocument();
    });
  });

  it('switches to scheduling view when Scheduling button is clicked', async () => {
    render(<CalendarPage />);

    const schedulingButton = screen.getByText('Scheduling');
    fireEvent.click(schedulingButton);

    await waitFor(() => {
      expect(screen.getByText('Scheduling Links')).toBeInTheDocument();
    });
  });

  it('displays calendar view selector in events view', async () => {
    render(<CalendarPage />);

    fireEvent.click(screen.getByText('Events'));

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });
  });

  it('displays empty state when no calendars exist', () => {
    render(<CalendarPage />);

    expect(
      screen.getByText('No calendars yet. Create your first calendar to get started.'),
    ).toBeInTheDocument();
  });

  it('displays empty state when no scheduling links exist', async () => {
    render(<CalendarPage />);

    fireEvent.click(screen.getByText('Scheduling'));

    await waitFor(() => {
      expect(
        screen.getByText('No scheduling links yet. Create your first booking page.'),
      ).toBeInTheDocument();
    });
  });
});
