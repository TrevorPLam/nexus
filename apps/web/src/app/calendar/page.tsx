'use client';

/**
 * MODULE: Calendar Page
 *
 * Responsibility:
 * Top-level Next.js client page for calendar management. Coordinates calendar and
 * event data fetching, view state (calendars, events, scheduling), and modals for
 * calendar, event, attendee, scheduling link, and find-time interactions.
 *
 * Boundaries:
 * - Composition layer that delegates rendering to calendar-specific components and hooks.
 * - Business logic and API calls are handled by useCalendarData, useEventDetails, and related state hooks.
 *
 * Critical invariants:
 * - Data fetching is disabled until a workspace is selected.
 * - View navigation (calendars, events, scheduling) must not lose current workspace context.
 *
 * Side effects:
 * - Triggers API requests via TanStack Query hooks.
 * - Opens/closes modals for calendar, event, attendee, and scheduling link forms.
 *
 * Change risk:
 * - High. Central UI entry point for the Calendar module and scheduling features.
 *
 * Links:
 * - apps/web/src/hooks/useCalendarData.ts
 * - apps/web/src/hooks/useEventDetails.ts
 * - apps/web/src/app/calendar/hooks/useCalendarState.ts
 * - apps/web/src/app/calendar/hooks/useEventState.ts
 * - apps/web/src/app/calendar/hooks/useSchedulingState.ts
 * - apps/web/src/contexts/AuthContext.tsx
 *
 * Tags:
 * - domain: calendar
 * - risk: high
 * - layer: presentation
 * - stability: stable
 * - concerns: nextjs, react-query, calendar, events, scheduling
 *
 * File:
 * - apps/web/src/app/calendar/page.tsx
 *
 * Last updated:
 * - July 22, 2026
 */

import { Button } from '@life-os/ui';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

import { useCalendarData } from '../../hooks/useCalendarData';
import { useEventDetails } from '../../hooks/useEventDetails';

import { CalendarModal } from './components/CalendarModal';
import { CalendarsView } from './components/CalendarsView';
import { EventModal } from './components/EventModal';
import { EventsView } from './components/EventsView';
import { SchedulingView } from './components/SchedulingView';
import {
  AttendeeModal,
  EventDetailModal,
  FindTimeModal,
  SchedulingLinkModal,
} from './components/modals';
import { useCalendarState } from './hooks/useCalendarState';
import { useEventState } from './hooks/useEventState';
import { useSchedulingState } from './hooks/useSchedulingState';
import type { Event } from './types';
import { type AvailableSlot } from './utils/findAvailableSlots';

export default function CalendarPage() {
  const { workspaceId, workspaceState } = useAuth();
  // Only fetch data when workspace is selected
  const effectiveWorkspaceId = workspaceState === 'selected' ? workspaceId : null;
  const [view, setView] = useState<'calendars' | 'events' | 'scheduling'>('calendars');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAttendeeModal, setShowAttendeeModal] = useState(false);
  const [newAttendeeEmail, setNewAttendeeEmail] = useState('');
  const [showFindTimeModal, setShowFindTimeModal] = useState(false);
  const [findTimeDuration, setFindTimeDuration] = useState(30);
  const [findTimeDate, setFindTimeDate] = useState(new Date());

  // Custom hooks for data fetching and mutations
  const {
    calendars,
    calendarsLoading,
    events,
    createCalendarMutation,
    updateCalendarMutation,
    deleteCalendarMutation,
    createEventMutation,
    updateEventMutation,
    deleteEventMutation,
  } = useCalendarData(effectiveWorkspaceId);

  const {
    attendees,
    createAttendeeMutation,
    deleteAttendeeMutation,
    schedulingLinks,
    createSchedulingLinkMutation,
    updateSchedulingLinkMutation,
    deleteSchedulingLinkMutation,
  } = useEventDetails(selectedEvent, effectiveWorkspaceId);

  // State management hooks
  const calendarState = useCalendarState({
    createCalendarMutation,
    updateCalendarMutation,
  });

  const eventState = useEventState({
    calendars,
    createEventMutation,
    updateEventMutation,
    currentDate,
  });

  const schedulingState = useSchedulingState({
    createSchedulingLinkMutation,
    updateSchedulingLinkMutation,
  });

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-2">Manage your events and schedule</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'calendars' ? 'primary' : 'secondary'}
            onPress={() => setView('calendars')}
          >
            Calendars
          </Button>
          <Button
            variant={view === 'events' ? 'primary' : 'secondary'}
            onPress={() => setView('events')}
          >
            Events
          </Button>
          <Button
            variant={view === 'scheduling' ? 'primary' : 'secondary'}
            onPress={() => setView('scheduling')}
          >
            Scheduling
          </Button>
        </div>
      </div>

      {view === 'calendars' ? (
        <CalendarsView
          calendars={calendars}
          calendarsLoading={calendarsLoading}
          onNewCalendar={calendarState.handleNewCalendar}
          onEditCalendar={calendarState.handleEditCalendar}
          onDeleteCalendar={(id) => deleteCalendarMutation.mutate(id)}
        />
      ) : view === 'scheduling' ? (
        <SchedulingView
          schedulingLinks={schedulingLinks}
          calendars={calendars}
          onNewSchedulingLink={schedulingState.handleNewSchedulingLink}
          onEditSchedulingLink={schedulingState.handleEditSchedulingLink}
          onDeleteSchedulingLink={(id) => deleteSchedulingLinkMutation.mutate(id)}
        />
      ) : (
        <EventsView
          calendarView={calendarView}
          currentDate={currentDate}
          calendars={calendars}
          events={events}
          onNavigatePrev={() => {
            if (calendarView === 'month') navigateMonth('prev');
            else if (calendarView === 'week') navigateWeek('prev');
            else navigateDay('prev');
          }}
          onNavigateNext={() => {
            if (calendarView === 'month') navigateMonth('next');
            else if (calendarView === 'week') navigateWeek('next');
            else navigateDay('next');
          }}
          onSetCalendarView={setCalendarView}
          onNewEvent={eventState.handleNewEvent}
          onFindTime={() => setShowFindTimeModal(true)}
          onDayClick={(date) => {
            setCurrentDate(date);
            eventState.handleNewEvent();
          }}
          onEventClick={(event) => {
            setSelectedEvent(event);
            setShowEventDetail(true);
          }}
        />
      )}

      {/* Calendar Modal */}
      <CalendarModal
        isOpen={calendarState.showCalendarModal || !!calendarState.editingCalendar}
        editingCalendar={calendarState.editingCalendar}
        calendarForm={calendarState.calendarForm}
        setCalendarForm={calendarState.setCalendarForm}
        onClose={calendarState.handleCalendarModalClose}
        onSubmit={calendarState.handleCalendarSubmit}
        isPending={createCalendarMutation.isPending || updateCalendarMutation.isPending}
      />

      {/* Event Modal */}
      <EventModal
        isOpen={eventState.showEventModal || !!eventState.editingEvent}
        editingEvent={eventState.editingEvent}
        eventForm={eventState.eventForm}
        calendars={calendars}
        setEventForm={eventState.setEventForm}
        onClose={eventState.handleEventModalClose}
        onSubmit={eventState.handleEventSubmit}
        isPending={createEventMutation.isPending || updateEventMutation.isPending}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        isOpen={showEventDetail}
        selectedEvent={selectedEvent}
        attendees={attendees}
        calendars={calendars}
        onClose={() => setShowEventDetail(false)}
        onEdit={(event) => {
          eventState.handleEditEvent(event);
          setShowEventDetail(false);
        }}
        onDelete={(eventId) => deleteEventMutation.mutate(eventId)}
        onAddAttendee={() => setShowAttendeeModal(true)}
        onDeleteAttendee={(attendeeId) => deleteAttendeeMutation.mutate(attendeeId)}
      />

      {/* Attendee Modal */}
      <AttendeeModal
        isOpen={showAttendeeModal}
        newAttendeeEmail={newAttendeeEmail}
        isPending={createAttendeeMutation.isPending}
        onClose={() => {
          setShowAttendeeModal(false);
          setNewAttendeeEmail('');
        }}
        onSubmit={(e) => {
          e.preventDefault();
          if (selectedEvent && newAttendeeEmail.trim()) {
            createAttendeeMutation.mutate({
              eventId: selectedEvent.id,
              email: newAttendeeEmail.trim(),
            });
          }
        }}
        onEmailChange={setNewAttendeeEmail}
      />

      {/* Scheduling Link Modal */}
      <SchedulingLinkModal
        isOpen={schedulingState.showSchedulingModal || !!schedulingState.editingSchedulingLink}
        editingSchedulingLink={!!schedulingState.editingSchedulingLink}
        schedulingForm={schedulingState.schedulingForm}
        calendars={calendars}
        isPending={createSchedulingLinkMutation.isPending || updateSchedulingLinkMutation.isPending}
        onClose={schedulingState.handleSchedulingModalClose}
        onSubmit={schedulingState.handleSchedulingSubmit}
        onFormChange={schedulingState.setSchedulingForm}
      />

      {/* Find Time Modal */}
      <FindTimeModal
        isOpen={showFindTimeModal}
        findTimeDate={findTimeDate}
        findTimeDuration={findTimeDuration}
        events={events}
        onClose={() => setShowFindTimeModal(false)}
        onDateChange={setFindTimeDate}
        onDurationChange={setFindTimeDuration}
        onSlotSelect={(slot: AvailableSlot) => {
          eventState.setEventForm({
            ...eventState.eventForm,
            startDate: slot.start.toISOString().split('T')[0],
            startTime: slot.start.toTimeString().slice(0, 5),
            endDate: slot.end.toISOString().split('T')[0],
            endTime: slot.end.toTimeString().slice(0, 5),
          });
          setShowFindTimeModal(false);
          eventState.handleNewEvent();
        }}
      />
    </main>
  );
}
