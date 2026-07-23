/**
 * MODULE: Calendar Create/Edit Modal Component
 *
 * Responsibility:
 * Renders a modal form for creating and editing calendars, including name,
 * description, and color fields.
 *
 * Tags:
 * - domain: calendar
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: modal, form, calendar
 *
 * File:
 * - apps/web/src/app/calendar/components/CalendarModal.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

'use client';

import { Button, Modal } from '@life-os/ui';
import { Loader2 } from 'lucide-react';

import type { Calendar, CalendarForm } from '../types';

interface CalendarModalProps {
  isOpen: boolean;
  editingCalendar: Calendar | null;
  calendarForm: CalendarForm;
  setCalendarForm: (form: CalendarForm) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function CalendarModal({
  isOpen,
  editingCalendar,
  calendarForm,
  setCalendarForm,
  onClose,
  onSubmit,
  isPending,
}: CalendarModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {editingCalendar ? 'Edit Calendar' : 'Create Calendar'}
        </h2>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                name="name"
                required
                placeholder="Calendar name"
                value={calendarForm.name}
                onChange={(e) => setCalendarForm({ ...calendarForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description (optional)</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Calendar description"
                value={calendarForm.description}
                onChange={(e) => setCalendarForm({ ...calendarForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-vertical"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Color (optional)</label>
              <input
                name="color"
                type="color"
                value={calendarForm.color}
                onChange={(e) => setCalendarForm({ ...calendarForm, color: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
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
              ) : editingCalendar ? (
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
