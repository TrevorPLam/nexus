/**
 * MODULE: Calendar API Mixin
 *
 * Responsibility:
 * Provides calendar and scheduling API operations (calendars, events, attendees,
 * and scheduling links) as a reusable mixin over the API client base.
 */

import {
  CreateCalendarRequest,
  UpdateCalendarRequest,
  CalendarResponse,
  CreateEventRequest,
  UpdateEventRequest,
  EventResponse,
  CreateEventAttendeeRequest,
  UpdateEventAttendeeRequest,
  EventAttendeeResponse,
  CreateSchedulingLinkRequest,
  UpdateSchedulingLinkRequest,
  SchedulingLinkResponse,
} from '@life-os/contracts';
import { z } from 'zod';

import { WorkApi } from './work';

export class CalendarApi extends WorkApi {
  // Calendars
  async getCalendars(workspaceId: string) {
    return this.request(
      `/v1/calendar/workspaces/${workspaceId}/calendars`,
      {},
      z.array(CalendarResponse),
    );
  }

  async getCalendar(id: string) {
    return this.request(`/v1/calendar/calendars/${id}`, {}, CalendarResponse);
  }

  async createCalendar(data: z.infer<typeof CreateCalendarRequest>) {
    CreateCalendarRequest.parse(data);
    return this.request('/v1/calendar/calendars', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCalendar(id: string, data: z.infer<typeof UpdateCalendarRequest>) {
    UpdateCalendarRequest.parse(data);
    return this.request(`/v1/calendar/calendars/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCalendar(id: string) {
    return this.request(`/v1/calendar/calendars/${id}`, {
      method: 'DELETE',
    });
  }

  // Events
  async getEvents(workspaceId: string, filters?: Record<string, string>) {
    const params = new URLSearchParams(filters);
    const queryString = params.toString();
    return this.request(
      `/v1/calendar/workspaces/${workspaceId}/events${queryString ? `?${queryString}` : ''}`,
      {},
      z.array(EventResponse),
    );
  }

  async getEvent(id: string) {
    return this.request(`/v1/calendar/events/${id}`, {}, EventResponse);
  }

  async createEvent(data: z.infer<typeof CreateEventRequest>) {
    CreateEventRequest.parse(data);
    return this.request('/v1/calendar/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEvent(id: string, data: z.infer<typeof UpdateEventRequest>) {
    UpdateEventRequest.parse(data);
    return this.request(`/v1/calendar/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEvent(id: string) {
    return this.request(`/v1/calendar/events/${id}`, {
      method: 'DELETE',
    });
  }

  // Event Attendees
  async getEventAttendees(eventId: string) {
    return this.request(
      `/v1/calendar/events/${eventId}/attendees`,
      {},
      z.array(EventAttendeeResponse),
    );
  }

  async createEventAttendee(data: z.infer<typeof CreateEventAttendeeRequest>) {
    CreateEventAttendeeRequest.parse(data);
    return this.request('/v1/calendar/event-attendees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEventAttendee(id: string, data: z.infer<typeof UpdateEventAttendeeRequest>) {
    UpdateEventAttendeeRequest.parse(data);
    return this.request(`/v1/calendar/event-attendees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEventAttendee(id: string) {
    return this.request(`/v1/calendar/event-attendees/${id}`, {
      method: 'DELETE',
    });
  }

  // Scheduling Links
  async getSchedulingLinks(workspaceId: string) {
    return this.request(
      `/v1/calendar/workspaces/${workspaceId}/scheduling-links`,
      {},
      z.array(SchedulingLinkResponse),
    );
  }

  async getSchedulingLink(id: string) {
    return this.request(`/v1/calendar/scheduling-links/${id}`, {}, SchedulingLinkResponse);
  }

  async createSchedulingLink(data: z.infer<typeof CreateSchedulingLinkRequest>) {
    CreateSchedulingLinkRequest.parse(data);
    return this.request('/v1/calendar/scheduling-links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSchedulingLink(id: string, data: z.infer<typeof UpdateSchedulingLinkRequest>) {
    UpdateSchedulingLinkRequest.parse(data);
    return this.request(`/v1/calendar/scheduling-links/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSchedulingLink(id: string) {
    return this.request(`/v1/calendar/scheduling-links/${id}`, {
      method: 'DELETE',
    });
  }
}
