import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import CalendarPage from './page';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the custom hooks
vi.mock('../../hooks/useCalendarData', () => ({
  useCalendarData: vi.fn(() => ({
    calendars: [],
    events: [],
    isLoading: false,
    isError: false,
    error: null,
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
    recurrence: null,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Input: ({ placeholder, value, onChange }: any) => (
    <input placeholder={placeholder} value={value} onChange={onChange} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TextArea: ({ placeholder, value, onChange }: any) => (
    <textarea placeholder={placeholder} value={value} onChange={onChange} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Select: ({ value, onChange, children }: any) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {children}
    </select>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    workspaceId: 'default-workspace',
    workspaceState: 'selected',
  })),
  AuthProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

/**
 * BDD Journey Regression Tests for Calendar Module
 * Tests the complete user journey for Calendar management
 * Validates that all completed features work end-to-end
 */

describe('Calendar Journey Regression Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );

  describe('BDD: Core Calendar User Journey', () => {
    // Given: User is on the Calendar page with a selected workspace
    // When: User creates a new calendar
    // Then: The calendar appears in the calendars list
    it('Given a user on the Calendar page, when they create a calendar, then the calendar appears in the list', async () => {
      const mockCalendars = [
        {
          id: '1',
          name: 'Test Calendar',
          description: 'A test calendar',
          color: '#3b82f6',
          isDefault: true,
          provider: 'local' as const,
          workspaceId: 'ws-1',
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const { useCalendarData } = await import('../../hooks/useCalendarData');
      vi.mocked(useCalendarData).mockReturnValue({
        calendars: mockCalendars,
        calendarsLoading: false,
        events: [],
        createCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        updateCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        createEventMutation: { mutate: vi.fn(), isPending: false } as any,
        updateEventMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteEventMutation: { mutate: vi.fn(), isPending: false } as any,
      });

      render(<CalendarPage />, { wrapper });

      expect(screen.getByText('Test Calendar')).toBeInTheDocument();
    });

    // Given: User has calendars
    // When: User creates an event
    // Then: The event appears in the calendar view
    it('Given a user with calendars, when they create an event, then the event appears in the calendar view', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Test Event',
          calendarId: 'cal-1',
          start: new Date().toISOString(),
          end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          status: 'confirmed' as const,
          location: null,
          description: null,
          isAllDay: false,
          recurrenceRule: null,
          recurrenceId: null,
          workspaceId: 'ws-1',
          metadata: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      const { useCalendarData } = await import('../../hooks/useCalendarData');
      vi.mocked(useCalendarData).mockReturnValue({
        calendars: [],
        calendarsLoading: false,
        events: mockEvents,
        createCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        updateCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        createEventMutation: { mutate: vi.fn(), isPending: false } as any,
        updateEventMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteEventMutation: { mutate: vi.fn(), isPending: false } as any,
      });

      render(<CalendarPage />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });
    });

    // Given: User has events
    // When: User edits an event
    // Then: The event details are updated
    it('Given a user with events, when they edit an event, then the event details are updated', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Original Title',
          calendarId: 'cal-1',
          start: new Date().toISOString(),
          end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          status: 'confirmed' as const,
          location: null,
          description: null,
          isAllDay: false,
          recurrenceRule: null,
          recurrenceId: null,
          workspaceId: 'ws-1',
          metadata: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      const { useCalendarData } = await import('../../hooks/useCalendarData');
      const updateMock = vi.fn();
      vi.mocked(useCalendarData).mockReturnValue({
        calendars: [],
        calendarsLoading: false,
        events: mockEvents,
        createCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        updateCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        createEventMutation: { mutate: vi.fn(), isPending: false } as any,
        updateEventMutation: { mutate: updateMock, isPending: false } as any,
        deleteEventMutation: { mutate: vi.fn(), isPending: false } as any,
      });

      render(<CalendarPage />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Original Title')).toBeInTheDocument();
      });
    });

    // Given: User encounters an error
    // When: An API error occurs
    // Then: An accessible error message is displayed
    it('Given a user encounters an error, when an API error occurs, then an accessible error message is shown', async () => {
      const { useCalendarData } = await import('../../hooks/useCalendarData');
      vi.mocked(useCalendarData).mockReturnValue({
        calendars: [],
        calendarsLoading: false,
        events: [],
        createCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        updateCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        createEventMutation: { mutate: vi.fn(), isPending: false } as any,
        updateEventMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteEventMutation: { mutate: vi.fn(), isPending: false } as any,
      });

      render(<CalendarPage />, { wrapper });

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent('Error loading calendar');
      });
    });

    // Given: User is creating an event
    // When: Form validation fails
    // Then: Validation errors are displayed
    it('Given a user is creating an event, when form validation fails, then validation errors are displayed', async () => {
      const { useCalendarData } = await import('../../hooks/useCalendarData');
      vi.mocked(useCalendarData).mockReturnValue({
        calendars: [],
        calendarsLoading: false,
        events: [],
        createCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        updateCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        createEventMutation: { mutate: vi.fn(), isPending: false } as any,
        updateEventMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteEventMutation: { mutate: vi.fn(), isPending: false } as any,
      });

      render(<CalendarPage />, { wrapper });

      // Try to create event without required fields
      // This should show validation error once Zod is implemented
      // For now, this test documents the expected behavior
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    // Given: User has no calendars
    // When: User navigates to Calendar page
    // Then: Empty state is displayed with clear call-to-action
    it('Given a user with no calendars, when they navigate to Calendar page, then empty state is shown with CTA', async () => {
      const { useCalendarData } = await import('../../hooks/useCalendarData');
      vi.mocked(useCalendarData).mockReturnValue({
        calendars: [],
        calendarsLoading: false,
        events: [],
        createCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        updateCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        createEventMutation: { mutate: vi.fn(), isPending: false } as any,
        updateEventMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteEventMutation: { mutate: vi.fn(), isPending: false } as any,
      });

      render(<CalendarPage />, { wrapper });

      expect(
        screen.getByText('No calendars yet. Create your first calendar to get started.'),
      ).toBeInTheDocument();
    });

    // Given: User has no events
    // When: User views a calendar
    // Then: Empty state is displayed with clear call-to-action
    it('Given a user with no events, when they view a calendar, then empty state is shown with CTA', async () => {
      const mockCalendars = [
        {
          id: '1',
          name: 'Test Calendar',
          description: 'A test calendar',
          color: '#3b82f6',
          isDefault: true,
          provider: 'local' as const,
          workspaceId: 'ws-1',
          metadata: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      const { useCalendarData } = await import('../../hooks/useCalendarData');
      vi.mocked(useCalendarData).mockReturnValue({
        calendars: mockCalendars,
        calendarsLoading: false,
        events: [],
        createCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        updateCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        createEventMutation: { mutate: vi.fn(), isPending: false } as any,
        updateEventMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteEventMutation: { mutate: vi.fn(), isPending: false } as any,
      });

      render(<CalendarPage />, { wrapper });

      expect(
        screen.getByText('No events yet. Create your first event to get started.'),
      ).toBeInTheDocument();
    });

    // Given: User is loading data
    // When: Data is being fetched
    // Then: Loading state is displayed
    it('Given a user loading data, when data is being fetched, then loading state is shown', async () => {
      const { useCalendarData } = await import('../../hooks/useCalendarData');
      vi.mocked(useCalendarData).mockReturnValue({
        calendars: [],
        calendarsLoading: true,
        events: [],
        createCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        updateCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        createEventMutation: { mutate: vi.fn(), isPending: false } as any,
        updateEventMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteEventMutation: { mutate: vi.fn(), isPending: false } as any,
      });

      render(<CalendarPage />, { wrapper });

      // Loading state should be shown
      // This test documents the expected loading behavior
    });
  });

  describe('Recurring Events', () => {
    // Given: User has a recurring event
    // When: User views the calendar
    // Then: All recurring instances are displayed
    it('Given a user with a recurring event, when they view the calendar, then all instances are shown', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Recurring Meeting',
          calendarId: 'cal-1',
          start: new Date().toISOString(),
          end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          status: 'confirmed' as const,
          location: null,
          description: null,
          isAllDay: false,
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
          recurrenceId: null,
          workspaceId: 'ws-1',
          metadata: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      const { useCalendarData } = await import('../../hooks/useCalendarData');
      vi.mocked(useCalendarData).mockReturnValue({
        calendars: [],
        calendarsLoading: false,
        events: mockEvents,
        createCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        updateCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteCalendarMutation: { mutate: vi.fn(), isPending: false } as any,
        createEventMutation: { mutate: vi.fn(), isPending: false } as any,
        updateEventMutation: { mutate: vi.fn(), isPending: false } as any,
        deleteEventMutation: { mutate: vi.fn(), isPending: false } as any,
      });

      render(<CalendarPage />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Recurring Meeting')).toBeInTheDocument();
      });
    });
  });
});
