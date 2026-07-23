/**
 * MODULE: Calendar Data Hook
 *
 * Responsibility:
 * Provides workspace-scoped calendar and event data from PowerSync with date-range filtering.
 *
 * Boundaries:
 * - Read operations use PowerSync for offline-first data synchronization.
 * - Mutation operations use the typed API client for immediate backend updates.
 * - Workspace isolation is enforced via the useAuth context.
 *
 * Critical invariants:
 * - All queries MUST be scoped to the current workspace.
 * - Event queries MUST respect date bounds to avoid unbounded results.
 * - Displayed times MUST be timezone-aware.
 *
 * Side effects:
 * - Fetches data from PowerSync and performs HTTP requests via the API client.
 *
 * Change risk:
 * - Medium. Data consistency and timezone handling.
 *
 * Links:
 * - apps/mobile/src/lib/powersync/database.ts
 * - packages/api-client/src/index.ts
 *
 * Tags:
 * - domain: calendar
 * - risk: medium
 * - layer: presentation
 * - stability: stable
 * - concerns: hooks, powersync, calendar-data
 *
 * File:
 * - apps/mobile/app/calendar/hooks/useCalendarData.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { apiClient } from '@life-os/api-client';
import { useState, useEffect } from 'react';

import { useAuth } from '../../../src/contexts/AuthContext';

export interface Calendar {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_default: number;
}

export interface Event {
  id: string;
  title: string;
  start: string;
  end: string;
  is_all_day: number;
  timezone: string;
  calendar_id: string;
}

export function useCalendarData() {
  const { selectedWorkspace } = useAuth();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!selectedWorkspace) {
      setCalendars([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    async function loadCalendars() {
      try {
        setLoading(true);
        // TODO: Implement PowerSync query for workspace-scoped calendars
        // This will use PowerSync queries when sync is fully implemented
        // For now, return empty array as placeholder
        setCalendars([]);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    loadCalendars();
  }, [selectedWorkspace]);

  const loadEvents = async (_calendarId?: string, _startDate?: Date, _endDate?: Date) => {
    if (!selectedWorkspace) {
      setEvents([]);
      return;
    }

    try {
      setLoading(true);
      // TODO: Implement PowerSync query for workspace-scoped events with date filtering
      // This will use PowerSync queries when sync is fully implemented
      // For now, return empty array as placeholder
      setEvents([]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return {
    calendars,
    events,
    loading,
    error,
    loadEvents,
  };
}

export function useEventMutations() {
  const { selectedWorkspace } = useAuth();
  const [pending, setPending] = useState(false);

  const createEvent = async (data: {
    title: string;
    calendarId: string;
    start: string;
    end: string;
    isAllDay?: boolean;
    timezone?: string;
  }) => {
    if (!selectedWorkspace) throw new Error('No workspace selected');

    setPending(true);
    try {
      const result = await apiClient.createEvent({
        workspaceId: selectedWorkspace.id,
        calendarId: data.calendarId,
        title: data.title,
        start: data.start,
        end: data.end,
        isAllDay: data.isAllDay ?? false,
        timezone: data.timezone ?? 'UTC',
      });
      return result;
    } finally {
      setPending(false);
    }
  };

  const updateEvent = async (
    eventId: string,
    data: {
      title?: string;
      start?: string;
      end?: string;
      isAllDay?: boolean;
      timezone?: string;
    },
  ) => {
    setPending(true);
    try {
      const result = await apiClient.updateEvent(eventId, data);
      return result;
    } finally {
      setPending(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    setPending(true);
    try {
      await apiClient.deleteEvent(eventId);
    } finally {
      setPending(false);
    }
  };

  const createCalendar = async (data: { name: string; color: string; description?: string }) => {
    if (!selectedWorkspace) throw new Error('No workspace selected');

    setPending(true);
    try {
      const result = await apiClient.createCalendar({
        workspaceId: selectedWorkspace.id,
        name: data.name,
        isDefault: false,
        provider: 'local',
        description: data.description,
        color: data.color,
      });
      return result;
    } finally {
      setPending(false);
    }
  };

  const updateCalendar = async (
    calendarId: string,
    data: { name?: string; color?: string; description?: string },
  ) => {
    setPending(true);
    try {
      const result = await apiClient.updateCalendar(calendarId, data);
      return result;
    } finally {
      setPending(false);
    }
  };

  const deleteCalendar = async (calendarId: string) => {
    setPending(true);
    try {
      await apiClient.deleteCalendar(calendarId);
    } finally {
      setPending(false);
    }
  };

  return {
    pending,
    createEvent,
    updateEvent,
    deleteEvent,
    createCalendar,
    updateCalendar,
    deleteCalendar,
  };
}
