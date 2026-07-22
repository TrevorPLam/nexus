import { useState, useEffect } from 'react';

import type { Calendar, CalendarForm } from '../types';

interface UseCalendarStateProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createCalendarMutation: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateCalendarMutation: any;
}

export function useCalendarState({
  createCalendarMutation,
  updateCalendarMutation,
}: UseCalendarStateProps) {
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<Calendar | null>(null);
  const [calendarForm, setCalendarForm] = useState<CalendarForm>({
    name: '',
    description: '',
    color: '#3b82f6',
  });

  // Populate form when editing calendar
  useEffect(() => {
    if (editingCalendar) {
      setCalendarForm({
        name: editingCalendar.name,
        description: editingCalendar.description || '',
        color: editingCalendar.color || '#3b82f6',
      });
    } else if (showCalendarModal) {
      setCalendarForm({ name: '', description: '', color: '#3b82f6' });
    }
  }, [editingCalendar, showCalendarModal]);

  const handleNewCalendar = () => {
    setEditingCalendar(null);
    setShowCalendarModal(true);
  };

  const handleEditCalendar = (calendar: Calendar) => {
    setEditingCalendar(calendar);
    setShowCalendarModal(true);
  };

  const handleCalendarModalClose = () => {
    setShowCalendarModal(false);
    setEditingCalendar(null);
    setCalendarForm({ name: '', description: '', color: '#3b82f6' });
  };

  const handleCalendarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: calendarForm.name,
      description: calendarForm.description || undefined,
      color: calendarForm.color || undefined,
    };
    if (editingCalendar) {
      updateCalendarMutation.mutate({ id: editingCalendar.id, data });
    } else {
      createCalendarMutation.mutate(data);
    }
  };

  return {
    showCalendarModal,
    editingCalendar,
    calendarForm,
    setCalendarForm,
    handleNewCalendar,
    handleEditCalendar,
    handleCalendarModalClose,
    handleCalendarSubmit,
  };
}
