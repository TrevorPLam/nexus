import { apiClient } from '@life-os/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface Calendar {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isDefault: boolean;
  provider: string | null;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  isAllDay: boolean;
  start: string;
  end: string;
  calendarId: string;
  recurrenceRule?: string | null;
  isFocusTime?: boolean;
}

export function useCalendarData(workspaceId: string) {
  const queryClient = useQueryClient();

  // Calendars query
  const { data: calendarsData, isLoading: calendarsLoading } = useQuery({
    queryKey: ['calendars', workspaceId],
    queryFn: () => apiClient.getCalendars(workspaceId) as Promise<{ calendars: Calendar[] }>,
  });
  const calendars = calendarsData?.calendars || [];

  // Events query
  const { data: eventsData } = useQuery({
    queryKey: ['events', workspaceId],
    queryFn: () => apiClient.getEvents(workspaceId) as Promise<{ events: Event[] }>,
  });
  const events = eventsData?.events || [];

  // Create calendar mutation
  const createCalendarMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; color?: string }) =>
      apiClient.createCalendar({ workspaceId, ...data }),
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
    }) => apiClient.createEvent({ workspaceId, ...data }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events', workspaceId] });
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) =>
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
