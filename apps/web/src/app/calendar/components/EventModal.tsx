/**
 * MODULE: Event Create/Edit Modal Component
 *
 * Responsibility:
 * Renders a modal form for creating and editing calendar events, including
 * title, calendar selection, date/time, all-day, focus time, description,
 * location, and recurrence rule fields.
 *
 * Tags:
 * - domain: calendar
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: modal, form, event
 *
 * File:
 * - apps/web/src/app/calendar/components/EventModal.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

'use client';

import { Button, Modal } from '@life-os/ui';
import { Loader2 } from 'lucide-react';

import type { Event, Calendar } from '../types';

interface EventModalProps {
  isOpen: boolean;
  editingEvent: Event | null;
  eventForm: {
    title: string;
    calendarId: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    isAllDay: boolean;
    isFocusTime: boolean;
    description: string;
    location: string;
    recurrenceRule: string;
  };
  calendars: Calendar[];
  setEventForm: (form: EventModalProps['eventForm']) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function EventModal({
  isOpen,
  editingEvent,
  eventForm,
  calendars,
  setEventForm,
  onClose,
  onSubmit,
  isPending,
}: EventModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{editingEvent ? 'Edit Event' : 'Create Event'}</h2>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                name="title"
                required
                placeholder="Event title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Calendar</label>
              <select
                name="calendarId"
                required
                value={eventForm.calendarId}
                onChange={(e) => setEventForm({ ...eventForm, calendarId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <input
                  name="startDate"
                  type="date"
                  required
                  value={eventForm.startDate}
                  onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Start Time</label>
                <input
                  name="startTime"
                  type="time"
                  required
                  value={eventForm.startTime}
                  onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <input
                  name="endDate"
                  type="date"
                  required
                  value={eventForm.endDate}
                  onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Time</label>
                <input
                  name="endTime"
                  type="time"
                  required
                  value={eventForm.endTime}
                  onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  name="isAllDay"
                  type="checkbox"
                  checked={eventForm.isAllDay}
                  onChange={(e) => setEventForm({ ...eventForm, isAllDay: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">All day</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  name="isFocusTime"
                  type="checkbox"
                  checked={eventForm.isFocusTime}
                  onChange={(e) => setEventForm({ ...eventForm, isFocusTime: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Focus time</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description (optional)</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Event description"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-vertical"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Location (optional)</label>
              <input
                name="location"
                placeholder="Event location"
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Recurrence Rule (optional)</label>
              <input
                name="recurrenceRule"
                placeholder="e.g., FREQ=WEEKLY;BYDAY=MO,WE,FR"
                value={eventForm.recurrenceRule}
                onChange={(e) => setEventForm({ ...eventForm, recurrenceRule: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-6">
            <Button variant="secondary" onPress={onClose}>
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingEvent ? (
                'Update'
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
