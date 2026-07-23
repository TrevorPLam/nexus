/**
 * MODULE: Event Details TanStack Query Hook
 *
 * Responsibility:
 * Provides TanStack Query hooks for event-scoped sub-resources: attendees and
 * scheduling links, including CRUD mutations with cache invalidation.
 *
 * Boundaries:
 * - UI-facing data layer. Calls apiClient methods and manages query invalidation.
 * - Does not own event CRUD itself (handled by useCalendarData).
 *
 * Critical invariants:
 * - Attendee queries are disabled when no selectedEvent is provided.
 * - Scheduling link queries are disabled when workspaceId is null.
 * - Mutations invalidate the corresponding query cache on success.
 *
 * Side effects:
 * - Performs HTTP requests to the API and updates TanStack Query cache.
 *
 * Change risk:
 * - Medium. Response format assumptions must match API route return shapes.
 *
 * Links:
 * - packages/api-client/src/index.ts
 * - apps/web/src/app/calendar/types.ts
 * - apps/web/src/app/calendar/components/modals/EventDetailModal.tsx
 *
 * Tags:
 * - domain: calendar
 * - risk: medium
 * - layer: presentation
 * - stability: stable
 * - concerns: react-query, attendees, scheduling-links
 *
 * File:
 * - apps/web/src/hooks/useEventDetails.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { apiClient } from '@life-os/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Attendee, SchedulingLink } from '../app/calendar/types';

export function useEventDetails(selectedEvent: { id: string } | null, workspaceId: string | null) {
  const queryClient = useQueryClient();

  // Event attendees query
  const { data: attendeesData = [] } = useQuery<Attendee[]>({
    queryKey: ['eventAttendees', selectedEvent?.id],
    queryFn: () =>
      selectedEvent
        ? (apiClient.getEventAttendees(selectedEvent.id) as Promise<Attendee[]>)
        : Promise.resolve([]),
    enabled: !!selectedEvent,
  });
  const attendees = attendeesData;

  // Create event attendee mutation
  const createAttendeeMutation = useMutation({
    mutationFn: (data: { eventId: string; email: string; name?: string }) =>
      apiClient.createEventAttendee({ ...data, status: 'needs_action', isOrganizer: false }),
    onSuccess: () => {
      if (selectedEvent) {
        void queryClient.invalidateQueries({ queryKey: ['eventAttendees', selectedEvent.id] });
      }
    },
  });

  // Delete event attendee mutation
  const deleteAttendeeMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteEventAttendee(id),
    onSuccess: () => {
      if (selectedEvent) {
        void queryClient.invalidateQueries({ queryKey: ['eventAttendees', selectedEvent.id] });
      }
    },
  });

  // Scheduling links query
  const { data: schedulingLinksData = [] } = useQuery<SchedulingLink[]>({
    queryKey: ['schedulingLinks', workspaceId],
    queryFn: () => apiClient.getSchedulingLinks(workspaceId!) as Promise<SchedulingLink[]>,
    enabled: !!workspaceId,
  });
  const schedulingLinks = schedulingLinksData;

  // Create scheduling link mutation
  const createSchedulingLinkMutation = useMutation({
    mutationFn: (data: {
      name: string;
      slug: string;
      description?: string;
      calendarId: string;
      eventDuration: number;
      bufferBefore: number;
      bufferAfter: number;
      minBookingNotice: number;
      maxBookingNotice: number;
      availabilityStart?: string;
      availabilityEnd?: string;
      availableDays?: number[];
      requiresApproval?: boolean;
      maxDailyBookings?: number;
    }) =>
      apiClient.createSchedulingLink({
        workspaceId: workspaceId!,
        ...data,
        availableDays: data.availableDays ?? [0, 1, 2, 3, 4, 5, 6],
        requiresApproval: data.requiresApproval ?? false,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedulingLinks', workspaceId] });
    },
  });

  // Update scheduling link mutation
  const updateSchedulingLinkMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof apiClient.updateSchedulingLink>[1];
    }) => apiClient.updateSchedulingLink(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedulingLinks', workspaceId] });
    },
  });

  // Delete scheduling link mutation
  const deleteSchedulingLinkMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteSchedulingLink(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedulingLinks', workspaceId] });
    },
  });

  return {
    attendees,
    createAttendeeMutation,
    deleteAttendeeMutation,
    schedulingLinks,
    createSchedulingLinkMutation,
    updateSchedulingLinkMutation,
    deleteSchedulingLinkMutation,
  };
}
