import { useState, useEffect } from 'react';

import type { Event, Calendar, EventForm } from '../types';

interface UseEventStateProps {
  calendars: Calendar[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createEventMutation: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateEventMutation: any;
  currentDate: Date;
}

export function useEventState({
  calendars,
  createEventMutation,
  updateEventMutation,
  currentDate,
}: UseEventStateProps) {
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventForm, setEventForm] = useState<EventForm>({
    title: '',
    calendarId: '',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '10:00',
    isAllDay: false,
    isFocusTime: false,
    description: '',
    location: '',
    recurrenceRule: '',
  });

  // Populate form when editing event
  useEffect(() => {
    if (editingEvent) {
      setEventForm({
        title: editingEvent.title,
        calendarId: editingEvent.calendarId,
        startDate: new Date(editingEvent.start).toISOString().split('T')[0],
        startTime: new Date(editingEvent.start).toTimeString().slice(0, 5),
        endDate: new Date(editingEvent.end).toISOString().split('T')[0],
        endTime: new Date(editingEvent.end).toTimeString().slice(0, 5),
        isAllDay: editingEvent.isAllDay,
        isFocusTime: editingEvent.isFocusTime || false,
        description: editingEvent.description || '',
        location: editingEvent.location || '',
        recurrenceRule: editingEvent.recurrenceRule || '',
      });
    } else if (showEventModal) {
      setEventForm({
        title: '',
        calendarId: calendars[0]?.id || '',
        startDate: currentDate.toISOString().split('T')[0],
        startTime: '09:00',
        endDate: currentDate.toISOString().split('T')[0],
        endTime: '10:00',
        isAllDay: false,
        isFocusTime: false,
        description: '',
        location: '',
        recurrenceRule: '',
      });
    }
  }, [editingEvent, showEventModal, calendars, currentDate]);

  const handleNewEvent = () => {
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const handleEventModalClose = () => {
    setShowEventModal(false);
    setEditingEvent(null);
    setEventForm({
      title: '',
      calendarId: '',
      startDate: '',
      startTime: '09:00',
      endDate: '',
      endTime: '10:00',
      isAllDay: false,
      isFocusTime: false,
      description: '',
      location: '',
      recurrenceRule: '',
    });
  };

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let start: Date, end: Date;

    if (editingEvent) {
      start = new Date(editingEvent.start);
      end = new Date(editingEvent.end);
    } else {
      start = new Date(currentDate);
      start.setHours(9, 0, 0, 0);
      end = new Date(currentDate);
      end.setHours(10, 0, 0, 0);
    }

    const startDate = eventForm.startDate || currentDate.toISOString().split('T')[0];
    const startTime = eventForm.startTime || '09:00';
    const endDate = eventForm.endDate || currentDate.toISOString().split('T')[0];
    const endTime = eventForm.endTime || '10:00';

    if (startDate) {
      const [hours, minutes] = startTime ? startTime.split(':').map(Number) : [9, 0];
      start = new Date(startDate);
      start.setHours(hours, minutes, 0, 0);
    }

    if (endDate) {
      const [hours, minutes] = endTime ? endTime.split(':').map(Number) : [10, 0];
      end = new Date(endDate);
      end.setHours(hours, minutes, 0, 0);
    }

    const data = {
      title: eventForm.title,
      calendarId: eventForm.calendarId,
      start: start.toISOString(),
      end: end.toISOString(),
      isAllDay: eventForm.isAllDay,
      isFocusTime: eventForm.isFocusTime,
      description: eventForm.description || undefined,
      location: eventForm.location || undefined,
      recurrenceRule: eventForm.recurrenceRule || undefined,
    };

    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, data });
    } else {
      createEventMutation.mutate(data);
    }
  };

  return {
    showEventModal,
    editingEvent,
    eventForm,
    setEventForm,
    handleNewEvent,
    handleEditEvent,
    handleEventModalClose,
    handleEventSubmit,
  };
}
