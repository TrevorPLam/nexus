import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEventDetails } from './useEventDetails';
import { apiClient } from '@life-os/api-client';

// Mock the apiClient
vi.mock('@life-os/api-client', () => ({
  apiClient: {
    getEventAttendees: vi.fn(),
    createEventAttendee: vi.fn(),
    deleteEventAttendee: vi.fn(),
    getSchedulingLinks: vi.fn(),
    createSchedulingLink: vi.fn(),
    updateSchedulingLink: vi.fn(),
    deleteSchedulingLink: vi.fn(),
  },
}));

describe('useEventDetails', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('exports useEventDetails hook', () => {
    expect(useEventDetails).toBeDefined();
    expect(typeof useEventDetails).toBe('function');
  });

  it('fetches event attendees when event selected', async () => {
    const mockAttendees = [
      {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        status: 'needs_action',
        isOrganizer: false,
      },
    ];
    vi.mocked(apiClient.getEventAttendees).mockResolvedValue(mockAttendees);

    const { result } = renderHook(() => useEventDetails({ id: 'event-1' }, 'workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.attendees).toEqual(mockAttendees);
    });

    expect(apiClient.getEventAttendees).toHaveBeenCalledWith('event-1');
  });

  it('creates event attendee and invalidates query', async () => {
    const mockAttendees = [
      {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        status: 'needs_action',
        isOrganizer: false,
      },
    ];
    vi.mocked(apiClient.getEventAttendees).mockResolvedValue(mockAttendees);
    vi.mocked(apiClient.createEventAttendee).mockResolvedValue({
      id: '2',
      email: 'new@example.com',
      name: 'New User',
      status: 'needs_action',
      isOrganizer: false,
    });

    const { result } = renderHook(() => useEventDetails({ id: 'event-1' }, 'workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.attendees).toEqual(mockAttendees);
    });

    await result.current.createAttendeeMutation.mutateAsync({
      eventId: 'event-1',
      email: 'new@example.com',
      name: 'New User',
    });

    expect(apiClient.createEventAttendee).toHaveBeenCalledWith({
      eventId: 'event-1',
      email: 'new@example.com',
      name: 'New User',
      status: 'needs_action',
      isOrganizer: false,
    });
  });

  it('deletes event attendee and invalidates query', async () => {
    const mockAttendees = [
      {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        status: 'needs_action',
        isOrganizer: false,
      },
    ];
    vi.mocked(apiClient.getEventAttendees).mockResolvedValue(mockAttendees);
    vi.mocked(apiClient.deleteEventAttendee).mockResolvedValue(undefined);

    const { result } = renderHook(() => useEventDetails({ id: 'event-1' }, 'workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.attendees).toEqual(mockAttendees);
    });

    await result.current.deleteAttendeeMutation.mutateAsync('1');

    expect(apiClient.deleteEventAttendee).toHaveBeenCalledWith('1');
  });

  it('fetches scheduling links for workspace', async () => {
    const mockSchedulingLinks = [
      {
        id: '1',
        name: 'Test Link',
        slug: 'test-link',
        calendarId: 'cal-1',
        eventDuration: 30,
        bufferBefore: 0,
        bufferAfter: 0,
        minBookingNotice: 0,
        maxBookingNotice: 30,
      },
    ];
    vi.mocked(apiClient.getSchedulingLinks).mockResolvedValue(mockSchedulingLinks);

    const { result } = renderHook(() => useEventDetails({ id: 'event-1' }, 'workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.schedulingLinks).toEqual(mockSchedulingLinks);
    });

    expect(apiClient.getSchedulingLinks).toHaveBeenCalledWith('workspace-1');
  });

  it('creates scheduling link and invalidates query', async () => {
    const mockSchedulingLinks = [
      {
        id: '1',
        name: 'Test Link',
        slug: 'test-link',
        calendarId: 'cal-1',
        eventDuration: 30,
        bufferBefore: 0,
        bufferAfter: 0,
        minBookingNotice: 0,
        maxBookingNotice: 30,
      },
    ];
    vi.mocked(apiClient.getSchedulingLinks).mockResolvedValue(mockSchedulingLinks);
    vi.mocked(apiClient.createSchedulingLink).mockResolvedValue({
      id: '2',
      name: 'New Link',
      slug: 'new-link',
      calendarId: 'cal-1',
      eventDuration: 30,
      bufferBefore: 0,
      bufferAfter: 0,
      minBookingNotice: 0,
      maxBookingNotice: 30,
    });

    const { result } = renderHook(() => useEventDetails({ id: 'event-1' }, 'workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.schedulingLinks).toEqual(mockSchedulingLinks);
    });

    await result.current.createSchedulingLinkMutation.mutateAsync({
      name: 'New Link',
      slug: 'new-link',
      calendarId: 'cal-1',
      eventDuration: 30,
      bufferBefore: 0,
      bufferAfter: 0,
      minBookingNotice: 0,
      maxBookingNotice: 30,
    });

    expect(apiClient.createSchedulingLink).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      name: 'New Link',
      slug: 'new-link',
      calendarId: 'cal-1',
      eventDuration: 30,
      bufferBefore: 0,
      bufferAfter: 0,
      minBookingNotice: 0,
      maxBookingNotice: 30,
      availableDays: [0, 1, 2, 3, 4, 5, 6],
      requiresApproval: false,
    });
  });

  it('updates scheduling link and invalidates query', async () => {
    const mockSchedulingLinks = [
      {
        id: '1',
        name: 'Test Link',
        slug: 'test-link',
        calendarId: 'cal-1',
        eventDuration: 30,
        bufferBefore: 0,
        bufferAfter: 0,
        minBookingNotice: 0,
        maxBookingNotice: 30,
      },
    ];
    vi.mocked(apiClient.getSchedulingLinks).mockResolvedValue(mockSchedulingLinks);
    vi.mocked(apiClient.updateSchedulingLink).mockResolvedValue({
      id: '1',
      name: 'Updated Link',
      slug: 'test-link',
      calendarId: 'cal-1',
      eventDuration: 30,
      bufferBefore: 0,
      bufferAfter: 0,
      minBookingNotice: 0,
      maxBookingNotice: 30,
    });

    const { result } = renderHook(() => useEventDetails({ id: 'event-1' }, 'workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.schedulingLinks).toEqual(mockSchedulingLinks);
    });

    await result.current.updateSchedulingLinkMutation.mutateAsync({
      id: '1',
      data: { name: 'Updated Link' },
    });

    expect(apiClient.updateSchedulingLink).toHaveBeenCalledWith('1', { name: 'Updated Link' });
  });

  it('deletes scheduling link and invalidates query', async () => {
    const mockSchedulingLinks = [
      {
        id: '1',
        name: 'Test Link',
        slug: 'test-link',
        calendarId: 'cal-1',
        eventDuration: 30,
        bufferBefore: 0,
        bufferAfter: 0,
        minBookingNotice: 0,
        maxBookingNotice: 30,
      },
    ];
    vi.mocked(apiClient.getSchedulingLinks).mockResolvedValue(mockSchedulingLinks);
    vi.mocked(apiClient.deleteSchedulingLink).mockResolvedValue(undefined);

    const { result } = renderHook(() => useEventDetails({ id: 'event-1' }, 'workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.schedulingLinks).toEqual(mockSchedulingLinks);
    });

    await result.current.deleteSchedulingLinkMutation.mutateAsync('1');

    expect(apiClient.deleteSchedulingLink).toHaveBeenCalledWith('1');
  });
});
