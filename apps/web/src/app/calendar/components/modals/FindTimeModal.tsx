/**
 * MODULE: Find Time Modal Component
 *
 * Responsibility:
 * Displays available time slots for a given date and duration, using the
 * findAvailableSlots utility to exclude conflicting events.
 *
 * Tags:
 * - domain: calendar
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: modal, scheduling, time-slots
 *
 * File:
 * - apps/web/src/app/calendar/components/modals/FindTimeModal.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

'use client';

import { Modal } from '@life-os/ui';

import type { Event } from '../../types';
import { findAvailableSlots, type AvailableSlot } from '../../utils/findAvailableSlots';

interface FindTimeModalProps {
  isOpen: boolean;
  findTimeDate: Date;
  findTimeDuration: number;
  events: Event[];
  onClose: () => void;
  onDateChange: (date: Date) => void;
  onDurationChange: (duration: number) => void;
  onSlotSelect: (slot: AvailableSlot) => void;
}

export function FindTimeModal({
  isOpen,
  findTimeDate,
  findTimeDuration,
  events,
  onClose,
  onDateChange,
  onDurationChange,
  onSlotSelect,
}: FindTimeModalProps) {
  const availableSlots = findAvailableSlots(findTimeDate, findTimeDuration, events);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Find Available Time</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              value={findTimeDate.toISOString().split('T')[0]}
              onChange={(e) => onDateChange(new Date(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
            <select
              value={findTimeDuration}
              onChange={(e) => onDurationChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-3">Available Slots</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableSlots.length === 0 ? (
              <p className="text-sm text-gray-500">No available slots found for this date</p>
            ) : (
              availableSlots.map((slot, index) => (
                <SlotButton key={index} slot={slot} onSelect={onSlotSelect} />
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

interface SlotButtonProps {
  slot: AvailableSlot;
  onSelect: (slot: AvailableSlot) => void;
}

function SlotButton({ slot, onSelect }: SlotButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(slot)}
      className="w-full p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
    >
      <div className="text-sm font-medium">
        {slot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
        {slot.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </button>
  );
}
