/**
 * MODULE: Calendar Settings Modal Component
 *
 * Responsibility:
 * Renders a modal form for editing calendar preferences: working hours and
 * default location.
 *
 * Tags:
 * - domain: calendar
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: modal, settings, preferences
 *
 * File:
 * - apps/web/src/app/calendar/components/modals/SettingsModal.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

'use client';

import { Button, Modal } from '@life-os/ui';

interface SettingsModalProps {
  isOpen: boolean;
  workingHours: { start: string; end: string };
  defaultLocation: string;
  onClose: () => void;
  onSave: () => void;
  onWorkingHoursChange: (hours: { start: string; end: string }) => void;
  onDefaultLocationChange: (location: string) => void;
}

export function SettingsModal({
  isOpen,
  workingHours,
  defaultLocation,
  onClose,
  onSave,
  onWorkingHoursChange,
  onDefaultLocationChange,
}: SettingsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Calendar Settings</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Working Hours Start</label>
              <input
                type="time"
                value={workingHours.start}
                onChange={(e) => onWorkingHoursChange({ ...workingHours, start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Working Hours End</label>
              <input
                type="time"
                value={workingHours.end}
                onChange={(e) => onWorkingHoursChange({ ...workingHours, end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Default Location</label>
            <input
              type="text"
              value={defaultLocation}
              onChange={(e) => onDefaultLocationChange(e.target.value)}
              placeholder="e.g., Office, Remote, Home"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onPress={onClose}>
            Cancel
          </Button>
          <Button onPress={onSave}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
