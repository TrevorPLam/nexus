import { apiClient } from '@life-os/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Attendee, SchedulingLink } from '../app/calendar/types';

export function useEventDetails(selectedEvent: { id: string } | null, workspaceId: string | null) {
  const queryClient = useQueryClient();

  // Event attendees query
  const { data: attendeesData } = useQuery({
    queryKey: ['eventAttendees', selectedEvent?.id],
    queryFn: () =>
      selectedEvent
        ? (apiClient.getEventAttendees(selectedEvent.id) as Promise<{ attendees: Attendee[] }>)
        : Promise.resolve({ attendees: [] }),
    enabled: !!selectedEvent,
  });
  const attendees = attendeesData?.attendees || [];

  // Create event attendee mutation
  const createAttendeeMutation = useMutation({
    mutationFn: (data: { eventId: string; email: string; name?: string }) =>
      apiClient.createEventAttendee(data),
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
  const { data: schedulingLinksData } = useQuery({
    queryKey: ['schedulingLinks', workspaceId],
    queryFn: () =>
      apiClient.getSchedulingLinks(workspaceId!) as Promise<{ schedulingLinks: SchedulingLink[] }>,
    enabled: !!workspaceId,
  });
  const schedulingLinks = schedulingLinksData?.schedulingLinks || [];

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
    }) => apiClient.createSchedulingLink({ workspaceId, ...data }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedulingLinks', workspaceId] });
    },
  });

  // Update scheduling link mutation
  const updateSchedulingLinkMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SchedulingLink> }) =>
      apiClient.updateSchedulingLink(id, data),
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
