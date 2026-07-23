/**
 * MODULE: Calendar Data TanStack Query Hook
 *
 * Responsibility:
 * Provides TanStack Query hooks for workspace-scoped calendars and events,
 * including calendar CRUD, event CRUD, and date-range-based event listing.
 *
 * Boundaries:
 * - UI-facing data layer. Calls apiClient methods and manages query invalidation.
 * - No direct database or PowerSync access.
 *
 * Critical invariants:
 * - Queries are disabled when workspaceId is null.
 * - Mutations invalidate the ['calendars', workspaceId] and ['events', workspaceId] query keys.
 *
 * Side effects:
 * - Performs HTTP requests to the API and updates TanStack Query cache.
 *
 * Change risk:
 * - Medium. Response formats must match the API client expectations.
 *
 * Links:
 * - packages/api-client/src/index.ts
 * - apps/web/src/app/calendar/page.tsx
 * - apps/web/src/contexts/AuthContext.tsx
 *
 * Tags:
 * - domain: calendar
 * - risk: medium
 * - layer: presentation
 * - stability: stable
 * - concerns: react-query, calendars, events, hooks
 *
 * File:
 * - apps/web/src/hooks/useCalendarData.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import { apiClient } from '@life-os/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Calendar, Event } from '../app/calendar/types';

export function useCalendarData(workspaceId: string | null, dateRange?: { startDate: string; endDate: string }) {
  const queryClient = useQueryClient();

  // Calendars query
  const { data: calendarsData = [], isLoading: calendarsLoading } = useQuery<Calendar[]>({
    queryKey: ['calendars', workspaceId],
    queryFn: () => apiClient.getCalendars(workspaceId!) as Promise<Calendar[]>,
    enabled: !!workspaceId,
  });
  const calendars = calendarsData;

  // Events query with date range support
  const { data: eventsData = [] } = useQuery<Event[]>({
    queryKey: ['events', workspaceId, dateRange],
    queryFn: () => apiClient.getEvents(workspaceId!, dateRange) as Promise<Event[]>,
    enabled: !!workspaceId,
  });
  const events = eventsData;

  // Create calendar mutation
  const createCalendarMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; color?: string }) =>
      apiClient.createCalendar({ workspaceId: workspaceId!, ...data, isDefault: false, provider: 'local' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendars', workspaceId] });
    },
  });

  // Update calendar mutation
  const updateCalendarMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string; color?: string };
    }) => apiClient.updateCalendar(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendars', workspaceId] });
    },
  });

  // Delete calendar mutation
  const deleteCalendarMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteCalendar(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendars', workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['events', workspaceId] });
    },
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: (data: {
      title: string;
      calendarId: string;
      start: string;
      end: string;
      isAllDay?: boolean;
      description?: string;
      location?: string;
      recurrenceRule?: string;
    }) =>
      apiClient.createEvent({
        workspaceId: workspaceId!,
        ...data,
        isAllDay: data.isAllDay ?? false,
        timezone: 'UTC',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events', workspaceId] });
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof apiClient.updateEvent>[1] }) =>
      apiClient.updateEvent(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events', workspaceId] });
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteEvent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events', workspaceId] });
    },
  });

  return {
    calendars,
    calendarsLoading,
    events,
    createCalendarMutation,
    updateCalendarMutation,
    deleteCalendarMutation,
    createEventMutation,
    updateEventMutation,
    deleteEventMutation,
  };
}
