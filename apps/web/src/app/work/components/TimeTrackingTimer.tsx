'use client';

import { Button } from '@life-os/ui';
import { Play, Pause, Square, Clock } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface TimeTrackingTimerProps {
  taskId: string;
  taskTitle: string;
  onStart: (taskId: string) => void;
  onStop: (taskId: string, duration: number) => void;
  isTracking?: boolean;
  initialElapsed?: number;
}

export function TimeTrackingTimer({
  taskId,
  taskTitle,
  onStart,
  onStop,
  isTracking = false,
  initialElapsed = 0,
}: TimeTrackingTimerProps) {
  const [elapsed, setElapsed] = useState(initialElapsed);
  const [isRunning, setIsRunning] = useState(isTracking);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRunning(true);
    onStart(taskId);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    onStop(taskId, elapsed);
    setElapsed(0);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 flex-1">
        <Clock className="w-4 h-4 text-gray-500" />
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900 truncate">{taskTitle}</div>
          <div className="text-2xl font-mono font-semibold text-gray-700">{formatTime(elapsed)}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isRunning && elapsed === 0 ? (
          <Button onPress={handleStart} size="small">
            <Play className="w-4 h-4 mr-1" />
            Start
          </Button>
        ) : isRunning ? (
          <>
            <Button variant="secondary" onPress={handlePause} size="small">
              <Pause className="w-4 h-4 mr-1" />
              Pause
            </Button>
            <Button variant="secondary" onPress={handleStop} size="small">
              <Square className="w-4 h-4 mr-1" />
              Stop
            </Button>
          </>
        ) : (
          <>
            <Button onPress={handleStart} size="small">
              <Play className="w-4 h-4 mr-1" />
              Resume
            </Button>
            <Button variant="secondary" onPress={handleStop} size="small">
              <Square className="w-4 h-4 mr-1" />
              Stop
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
