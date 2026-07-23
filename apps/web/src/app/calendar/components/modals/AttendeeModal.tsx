/**
 * MODULE: Add Attendee Modal Component
 *
 * Responsibility:
 * Renders a modal form for adding a new attendee to an event by email.
 *
 * Tags:
 * - domain: calendar
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: modal, attendee, form
 *
 * File:
 * - apps/web/src/app/calendar/components/modals/AttendeeModal.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

'use client';

import { Button, Modal } from '@life-os/ui';
import { Loader2 } from 'lucide-react';

interface AttendeeModalProps {
  isOpen: boolean;
  newAttendeeEmail: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onEmailChange: (email: string) => void;
}

export function AttendeeModal({
  isOpen,
  newAttendeeEmail,
  isPending,
  onClose,
  onSubmit,
  onEmailChange,
}: AttendeeModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Add Attendee</h2>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                required
                placeholder="attendee@example.com"
                value={newAttendeeEmail}
                onChange={(e) => onEmailChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-6">
            <Button
              variant="secondary"
              onPress={() => {
                onClose();
                onEmailChange('');
              }}
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={!newAttendeeEmail.trim() || isPending}
              className="px-4 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Attendee'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
