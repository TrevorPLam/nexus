'use client';

import { Button, Modal } from '@life-os/ui';
import { Loader2 } from 'lucide-react';

import type { Calendar, SchedulingForm } from '../../types';

interface SchedulingLinkModalProps {
  isOpen: boolean;
  editingSchedulingLink: boolean;
  schedulingForm: SchedulingForm;
  calendars: Calendar[];
  isPending: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormChange: (form: SchedulingForm) => void;
}

export function SchedulingLinkModal({
  isOpen,
  editingSchedulingLink,
  schedulingForm,
  calendars,
  isPending,
  onClose,
  onSubmit,
  onFormChange,
}: SchedulingLinkModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {editingSchedulingLink ? 'Edit Scheduling Link' : 'Create Scheduling Link'}
        </h2>
        <form onSubmit={onSubmit}>
          <SchedulingFormFields
            schedulingForm={schedulingForm}
            calendars={calendars}
            onFormChange={onFormChange}
          />
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
              ) : editingSchedulingLink ? (
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

interface SchedulingFormFieldsProps {
  schedulingForm: SchedulingForm;
  calendars: Calendar[];
  onFormChange: (form: SchedulingForm) => void;
}

function SchedulingFormFields({ schedulingForm, calendars, onFormChange }: SchedulingFormFieldsProps) {
  return (
    <div className="space-y-4">
      <FormField
        label="Name"
        name="name"
        required
        placeholder="30 Minute Meeting"
        value={schedulingForm.name}
        onChange={(value) => onFormChange({ ...schedulingForm, name: value })}
      />
      <FormField
        label="Slug (URL)"
        name="slug"
        required
        placeholder="30min-meeting"
        value={schedulingForm.slug}
        onChange={(value) =>
          onFormChange({ ...schedulingForm, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
        }
      />
      <div>
        <label className="block text-sm font-medium mb-2">Description (optional)</label>
        <textarea
          name="description"
          rows={2}
          placeholder="Brief description of this booking type"
          value={schedulingForm.description}
          onChange={(e) => onFormChange({ ...schedulingForm, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-vertical"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Calendar</label>
        <select
          name="calendarId"
          required
          value={schedulingForm.calendarId}
          onChange={(e) => onFormChange({ ...schedulingForm, calendarId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Select a calendar</option>
          {calendars.map((calendar) => (
            <option key={calendar.id} value={calendar.id}>
              {calendar.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <NumberInput
          label="Duration (min)"
          name="eventDuration"
          required
          min={5}
          max={480}
          value={schedulingForm.eventDuration}
          onChange={(value) => onFormChange({ ...schedulingForm, eventDuration: parseInt(value) })}
        />
        <NumberInput
          label="Buffer Before (min)"
          name="bufferBefore"
          min={0}
          value={schedulingForm.bufferBefore}
          onChange={(value) => onFormChange({ ...schedulingForm, bufferBefore: parseInt(value) })}
        />
        <NumberInput
          label="Buffer After (min)"
          name="bufferAfter"
          min={0}
          value={schedulingForm.bufferAfter}
          onChange={(value) => onFormChange({ ...schedulingForm, bufferAfter: parseInt(value) })}
        />
        <NumberInput
          label="Min Notice (hours)"
          name="minBookingNotice"
          min={0}
          value={schedulingForm.minBookingNotice}
          onChange={(value) => onFormChange({ ...schedulingForm, minBookingNotice: parseInt(value) })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TimeInput
          label="Availability Start"
          name="availabilityStart"
          value={schedulingForm.availabilityStart}
          onChange={(value) => onFormChange({ ...schedulingForm, availabilityStart: value })}
        />
        <TimeInput
          label="Availability End"
          name="availabilityEnd"
          value={schedulingForm.availabilityEnd}
          onChange={(value) => onFormChange({ ...schedulingForm, availabilityEnd: value })}
        />
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={schedulingForm.requiresApproval}
            onChange={(e) => onFormChange({ ...schedulingForm, requiresApproval: e.target.checked })}
          />
          Require approval for bookings
        </label>
      </div>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

function FormField({ label, name, required, placeholder, value, onChange }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
      />
    </div>
  );
}

interface NumberInputProps {
  label: string;
  name: string;
  required?: boolean;
  min?: number;
  max?: number;
  value: number;
  onChange: (value: string) => void;
}

function NumberInput({ label, name, required, min, max, value, onChange }: NumberInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <input
        name={name}
        type="number"
        required={required}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
      />
    </div>
  );
}

interface TimeInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}

function TimeInput({ label, name, value, onChange }: TimeInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <input
        name={name}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
      />
    </div>
  );
}
