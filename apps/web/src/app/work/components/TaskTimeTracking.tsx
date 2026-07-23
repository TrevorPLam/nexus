'use client';

import { Button } from '@life-os/ui';
import { Play, Pause, Clock, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import type { TimeEntry } from '../types';

interface TaskTimeTrackingProps {
  timeEntries: TimeEntry[];
  onStartTracking: () => void;
  onStopTracking: (entryId: string) => void;
  onAddManualEntry: (data: Omit<TimeEntry, 'id' | 'taskId' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteEntry: (entryId: string) => void;
  currentUserId?: string;
}

export function TaskTimeTracking({
  timeEntries,
  onStartTracking,
  onStopTracking,
  onAddManualEntry,
  onDeleteEntry,
  currentUserId,
}: TaskTimeTrackingProps) {
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualDescription, setManualDescription] = useState('');
  const [manualDuration, setManualDuration] = useState('');
  const [manualBillable, setManualBillable] = useState(false);

  const activeEntry = timeEntries.find((entry) => !entry.stoppedAt);
  const completedEntries = timeEntries.filter((entry) => entry.stoppedAt);

  const totalDuration = completedEntries.reduce((sum, entry) => {
    if (entry.duration) {
      return sum + parseInt(entry.duration, 10);
    }
    if (entry.stoppedAt && entry.startedAt) {
      return sum + (new Date(entry.stoppedAt).getTime() - new Date(entry.startedAt).getTime()) / 1000;
    }
    return sum;
  }, 0);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleAddManualEntry = () => {
    const durationMinutes = parseInt(manualDuration, 10);
    if (durationMinutes > 0) {
      onAddManualEntry({
        userId: currentUserId || 'unknown',
        description: manualDescription || null,
        startedAt: new Date(),
        stoppedAt: new Date(),
        duration: (durationMinutes * 60).toString(),
        isBillable: manualBillable,
        billableRate: null,
        metadata: null,
      });
      setManualDescription('');
      setManualDuration('');
      setManualBillable(false);
      setIsAddingManual(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeEntry) {
      interval = setInterval(() => {
        // Force re-render to update active timer display
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeEntry]);

  const getActiveDuration = () => {
    if (!activeEntry) return 0;
    return (Date.now() - new Date(activeEntry.startedAt).getTime()) / 1000;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Time Tracking</h3>
        <span className="text-sm text-gray-500">
          ({formatDuration(totalDuration)})
        </span>
      </div>

      {/* Active Timer */}
      {activeEntry ? (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            <div>
              <p className="font-medium text-sm text-blue-900">
                {activeEntry.description || 'Tracking time...'}
              </p>
              <p className="text-xs text-blue-600">
                {formatTime(activeEntry.startedAt)} - {formatDuration(getActiveDuration())}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onPress={() => onStopTracking(activeEntry.id)}
          >
            <Pause className="w-4 h-4 mr-2" />
            Stop
          </Button>
        </div>
      ) : (
        <Button onPress={onStartTracking}>
          <Play className="w-4 h-4 mr-2" />
          Start Timer
        </Button>
      )}

      {/* Add Manual Entry */}
      {!isAddingManual ? (
        <Button
          variant="secondary"
          size="small"
          onPress={() => setIsAddingManual(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Manual Entry
        </Button>
      ) : (
        <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <input
            type="text"
            placeholder="Description (optional)"
            value={manualDescription}
            onChange={(e) => setManualDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Duration (minutes)"
              value={manualDuration}
              onChange={(e) => setManualDuration(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={manualBillable}
                onChange={(e) => setManualBillable(e.target.checked)}
                className="rounded"
              />
              Billable
            </label>
          </div>
          <div className="flex gap-2">
            <Button onPress={handleAddManualEntry}>Add</Button>
            <Button
              variant="secondary"
              onPress={() => {
                setIsAddingManual(false);
                setManualDescription('');
                setManualDuration('');
                setManualBillable(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Time Entries List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {completedEntries.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No time entries yet
          </div>
        ) : (
          completedEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {entry.description || 'Time entry'}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>
                    {formatTime(entry.startedAt)} - {formatTime(entry.stoppedAt!)}
                  </span>
                  <span>•</span>
                  <span>{formatDuration(parseInt(entry.duration || '0', 10))}</span>
                  {entry.isBillable && (
                    <>
                      <span>•</span>
                      <span className="text-green-600">Billable</span>
                    </>
                  )}
                </div>
              </div>
              <Button
                variant="secondary"
                size="small"
                onPress={() => onDeleteEntry(entry.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
