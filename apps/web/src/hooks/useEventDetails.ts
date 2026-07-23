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
    queryFn: () =>
      apiClient.getSchedulingLinks(workspaceId!) as Promise<SchedulingLink[]>,
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
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof apiClient.updateSchedulingLink>[1] }) =>
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
