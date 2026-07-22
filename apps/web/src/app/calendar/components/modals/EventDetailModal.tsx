'use client';

import { Button, Modal, Badge } from '@life-os/ui';
import { X, Edit2, Trash2, User } from 'lucide-react';

import type { Event, Calendar, Attendee } from '../../types';

interface EventDetailModalProps {
  isOpen: boolean;
  selectedEvent: Event | null;
  attendees: Attendee[];
  calendars: Calendar[];
  onClose: () => void;
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onAddAttendee: () => void;
  onDeleteAttendee: (attendeeId: string) => void;
}

export function EventDetailModal({
  isOpen,
  selectedEvent,
  attendees,
  calendars,
  onClose,
  onEdit,
  onDelete,
  onAddAttendee,
  onDeleteAttendee,
}: EventDetailModalProps) {
  if (!selectedEvent) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <h2 className="text-xl font-semibold">{selectedEvent.title}</h2>
          <div className="flex gap-2">
            <Button variant="secondary" size="small" onPress={() => onEdit(selectedEvent)}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="small" onPress={() => onDelete(selectedEvent.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="small" onPress={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          {selectedEvent.description && (
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <p className="text-sm text-gray-600">{selectedEvent.description}</p>
            </div>
          )}
          {selectedEvent.location && (
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <p className="text-sm text-gray-600">{selectedEvent.location}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-medium mb-1">Start</label>
              <p className="text-gray-600">{new Date(selectedEvent.start).toLocaleString()}</p>
            </div>
            <div>
              <label className="block font-medium mb-1">End</label>
              <p className="text-gray-600">{new Date(selectedEvent.end).toLocaleString()}</p>
            </div>
            <div>
              <label className="block font-medium mb-1">Calendar</label>
              <p className="text-gray-600">
                {calendars.find((c) => c.id === selectedEvent.calendarId)?.name || 'None'}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <label className="block font-medium">Attendees</label>
              <Button variant="secondary" size="small" onPress={onAddAttendee}>
                <User className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
            {attendees.length === 0 ? (
              <p className="text-sm text-gray-500">No attendees</p>
            ) : (
              <div className="space-y-2">
                {attendees.map((attendee) => (
                  <AttendeeItem
                    key={attendee.id}
                    attendee={attendee}
                    onDelete={() => onDeleteAttendee(attendee.id)}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {selectedEvent.isAllDay && <Badge variant="info">All Day</Badge>}
            {selectedEvent.isFocusTime && <Badge variant="success">Focus Time</Badge>}
            {selectedEvent.recurrenceRule && <Badge variant="warning">Recurring</Badge>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

interface AttendeeItemProps {
  attendee: Attendee;
  onDelete: () => void;
}

function AttendeeItem({ attendee, onDelete }: AttendeeItemProps) {
  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-gray-500" />
        <div>
          <span className="text-sm">{attendee.name || attendee.email}</span>
          {attendee.name && (
            <span className="text-xs text-gray-500 ml-2">({attendee.email})</span>
          )}
        </div>
        {attendee.isOrganizer && <Badge variant="success">Organizer</Badge>}
        <Badge
          variant={
            attendee.status === 'accepted'
              ? 'success'
              : attendee.status === 'declined'
                ? 'danger'
                : attendee.status === 'tentative'
                  ? 'warning'
                  : 'default'
          }
        >
          {attendee.status.replace('_', ' ')}
        </Badge>
      </div>
      <Button variant="secondary" size="small" onPress={onDelete}>
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}
