'use client';

import { Button, Select } from '@life-os/ui';
import { Bell, Plus, Trash2, Clock } from 'lucide-react';
import { useState } from 'react';

interface Reminder {
  id: string;
  minutesBefore: number;
  method: 'email' | 'push' | 'sms';
}

interface EventRemindersProps {
  reminders: Reminder[];
  onAddReminder: (minutesBefore: number, method: Reminder['method']) => void;
  onDeleteReminder: (reminderId: string) => void;
}

const reminderOptions = [
  { value: 0, label: 'At time of event' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
  { value: 10080, label: '1 week before' },
];

const methodOptions = [
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push Notification' },
  { value: 'sms', label: 'SMS' },
];

export function EventReminders({
  reminders,
  onAddReminder,
  onDeleteReminder,
}: EventRemindersProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState(15);
  const [selectedMethod, setSelectedMethod] = useState<Reminder['method']>('push');

  const handleAddReminder = () => {
    onAddReminder(selectedMinutes, selectedMethod);
    setIsAdding(false);
    setSelectedMinutes(15);
    setSelectedMethod('push');
  };

  const formatReminderTime = (minutes: number) => {
    const option = reminderOptions.find((opt) => opt.value === minutes);
    return option?.label || `${minutes} minutes before`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Reminders</h3>
        <span className="text-sm text-gray-500">({reminders.length})</span>
      </div>

      {/* Add Reminder Form */}
      {!isAdding ? (
        <Button
          variant="secondary"
          size="small"
          onPress={() => setIsAdding(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Reminder
        </Button>
      ) : (
        <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">When</label>
              <Select
                value={selectedMinutes.toString()}
                onChange={(value) => setSelectedMinutes(parseInt(value, 10))}
                options={reminderOptions.map((opt) => ({
                  value: opt.value.toString(),
                  label: opt.label,
                }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Method</label>
              <Select
                value={selectedMethod}
                onChange={(value) => setSelectedMethod(value as Reminder['method'])}
                options={methodOptions}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onPress={handleAddReminder}>Add</Button>
            <Button
              variant="secondary"
              onPress={() => {
                setIsAdding(false);
                setSelectedMinutes(15);
                setSelectedMethod('push');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Reminders List */}
      <div className="space-y-2">
        {reminders.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No reminders set
          </div>
        ) : (
          reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatReminderTime(reminder.minutesBefore)}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    via {reminder.method}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="small"
                onPress={() => onDeleteReminder(reminder.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Info Text */}
      <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-200">
        <p>
          <strong>Tip:</strong> Set multiple reminders to ensure you never miss an
          important event. Reminders are sent based on your local timezone.
        </p>
      </div>
    </div>
  );
}
