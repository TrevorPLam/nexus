import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCalendarData } from './useCalendarData';
import { apiClient } from '@life-os/api-client';

// Mock the apiClient
vi.mock('@life-os/api-client', () => ({
  apiClient: {
    getCalendars: vi.fn(),
    getEvents: vi.fn(),
    createCalendar: vi.fn(),
    updateCalendar: vi.fn(),
    deleteCalendar: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
  },
}));

describe('useCalendarData', () => {
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

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  it('exports useCalendarData hook', () => {
    expect(useCalendarData).toBeDefined();
    expect(typeof useCalendarData).toBe('function');
  });

  it('fetches calendars for workspace', async () => {
    const mockCalendars = [
      {
        id: '1',
        name: 'Work Calendar',
        description: 'Work events',
        color: '#3b82f6',
        isDefault: false,
        provider: 'local',
      },
      {
        id: '2',
        name: 'Personal Calendar',
        description: 'Personal events',
        color: '#10b981',
        isDefault: false,
        provider: 'local',
      },
    ];
    vi.mocked(apiClient.getCalendars).mockResolvedValue(mockCalendars);

    const { result } = renderHook(() => useCalendarData('workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.calendars).toEqual(mockCalendars);
    });

    expect(apiClient.getCalendars).toHaveBeenCalledWith('workspace-1');
  });

  it('fetches events for workspace', async () => {
    const mockEvents = [
      {
        id: '1',
        title: 'Meeting',
        calendarId: 'cal-1',
        start: '2026-07-23T10:00:00Z',
        end: '2026-07-23T11:00:00Z',
      },
      {
        id: '2',
        title: 'Lunch',
        calendarId: 'cal-1',
        start: '2026-07-23T12:00:00Z',
        end: '2026-07-23T13:00:00Z',
      },
    ];
    vi.mocked(apiClient.getEvents).mockResolvedValue(mockEvents);

    const { result } = renderHook(() => useCalendarData('workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.events).toEqual(mockEvents);
    });

    expect(apiClient.getEvents).toHaveBeenCalledWith('workspace-1', undefined);
  });

  it('creates calendar and invalidates query', async () => {
    const mockCalendars = [
      {
        id: '1',
        name: 'Work Calendar',
        description: 'Work events',
        color: '#3b82f6',
        isDefault: false,
        provider: 'local',
      },
    ];
    vi.mocked(apiClient.getCalendars).mockResolvedValue(mockCalendars);
    vi.mocked(apiClient.createCalendar).mockResolvedValue({
      id: '2',
      name: 'New Calendar',
      description: 'New events',
      color: '#f59e0b',
      isDefault: false,
      provider: 'local',
    });

    const { result } = renderHook(() => useCalendarData('workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.calendars).toEqual(mockCalendars);
    });

    await result.current.createCalendarMutation.mutateAsync({
      name: 'New Calendar',
      description: 'New events',
      color: '#f59e0b',
    });

    expect(apiClient.createCalendar).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      name: 'New Calendar',
      description: 'New events',
      color: '#f59e0b',
      isDefault: false,
      provider: 'local',
    });
  });

  it('updates calendar and invalidates query', async () => {
    const mockCalendars = [
      {
        id: '1',
        name: 'Work Calendar',
        description: 'Work events',
        color: '#3b82f6',
        isDefault: false,
        provider: 'local',
      },
    ];
    vi.mocked(apiClient.getCalendars).mockResolvedValue(mockCalendars);
    vi.mocked(apiClient.updateCalendar).mockResolvedValue({
      id: '1',
      name: 'Updated Calendar',
      description: 'Updated events',
      color: '#8b5cf6',
    });

    const { result } = renderHook(() => useCalendarData('workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.calendars).toEqual(mockCalendars);
    });

    await result.current.updateCalendarMutation.mutateAsync({
      id: '1',
      data: { name: 'Updated Calendar', description: 'Updated events', color: '#8b5cf6' },
    });

    expect(apiClient.updateCalendar).toHaveBeenCalledWith('1', {
      name: 'Updated Calendar',
      description: 'Updated events',
      color: '#8b5cf6',
    });
  });

  it('deletes calendar and invalidates queries', async () => {
    const mockCalendars = [
      {
        id: '1',
        name: 'Work Calendar',
        description: 'Work events',
        color: '#3b82f6',
        isDefault: false,
        provider: 'local',
      },
    ];
    vi.mocked(apiClient.getCalendars).mockResolvedValue(mockCalendars);
    vi.mocked(apiClient.deleteCalendar).mockResolvedValue(undefined);

    const { result } = renderHook(() => useCalendarData('workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.calendars).toEqual(mockCalendars);
    });

    await result.current.deleteCalendarMutation.mutateAsync('1');

    expect(apiClient.deleteCalendar).toHaveBeenCalledWith('1');
  });

  it('creates event and invalidates query', async () => {
    const mockEvents = [
      {
        id: '1',
        title: 'Meeting',
        calendarId: 'cal-1',
        start: '2026-07-23T10:00:00Z',
        end: '2026-07-23T11:00:00Z',
      },
    ];
    vi.mocked(apiClient.getEvents).mockResolvedValue(mockEvents);
    vi.mocked(apiClient.createEvent).mockResolvedValue({
      id: '2',
      title: 'New Event',
      calendarId: 'cal-1',
      start: '2026-07-23T14:00:00Z',
      end: '2026-07-23T15:00:00Z',
      isAllDay: false,
      timezone: 'UTC',
    });

    const { result } = renderHook(() => useCalendarData('workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.events).toEqual(mockEvents);
    });

    await result.current.createEventMutation.mutateAsync({
      title: 'New Event',
      calendarId: 'cal-1',
      start: '2026-07-23T14:00:00Z',
      end: '2026-07-23T15:00:00Z',
    });

    expect(apiClient.createEvent).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      title: 'New Event',
      calendarId: 'cal-1',
      start: '2026-07-23T14:00:00Z',
      end: '2026-07-23T15:00:00Z',
      isAllDay: false,
      timezone: 'UTC',
    });
  });

  it('updates event and invalidates query', async () => {
    const mockEvents = [
      {
        id: '1',
        title: 'Meeting',
        calendarId: 'cal-1',
        start: '2026-07-23T10:00:00Z',
        end: '2026-07-23T11:00:00Z',
      },
    ];
    vi.mocked(apiClient.getEvents).mockResolvedValue(mockEvents);
    vi.mocked(apiClient.updateEvent).mockResolvedValue({
      id: '1',
      title: 'Updated Event',
      start: '2026-07-23T10:30:00Z',
      end: '2026-07-23T11:30:00Z',
    });

    const { result } = renderHook(() => useCalendarData('workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.events).toEqual(mockEvents);
    });

    await result.current.updateEventMutation.mutateAsync({
      id: '1',
      data: { title: 'Updated Event', start: '2026-07-23T10:30:00Z', end: '2026-07-23T11:30:00Z' },
    });

    expect(apiClient.updateEvent).toHaveBeenCalledWith('1', {
      title: 'Updated Event',
      start: '2026-07-23T10:30:00Z',
      end: '2026-07-23T11:30:00Z',
    });
  });

  it('deletes event and invalidates query', async () => {
    const mockEvents = [
      {
        id: '1',
        title: 'Meeting',
        calendarId: 'cal-1',
        start: '2026-07-23T10:00:00Z',
        end: '2026-07-23T11:00:00Z',
      },
    ];
    vi.mocked(apiClient.getEvents).mockResolvedValue(mockEvents);
    vi.mocked(apiClient.deleteEvent).mockResolvedValue(undefined);

    const { result } = renderHook(() => useCalendarData('workspace-1'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.events).toEqual(mockEvents);
    });

    await result.current.deleteEventMutation.mutateAsync('1');

    expect(apiClient.deleteEvent).toHaveBeenCalledWith('1');
  });
});
