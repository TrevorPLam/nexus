/**
 * MODULE: Calendar Events View Component
 *
 * Responsibility:
 * Renders the main calendar grid with month/week/day views, event display,
 * and navigation controls. Supports event selection and creation triggers.
 *
 * Tags:
 * - domain: calendar
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: calendar-grid, month-view, week-view, day-view
 *
 * File:
 * - apps/web/src/app/calendar/components/EventsView.tsx
 *
 * Last updated:
 * - July 23, 2026
 */

'use client';

import { Button } from '@life-os/ui';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

import type { Event, Calendar } from '../types';

interface EventsViewProps {
  calendarView: 'month' | 'week' | 'day';
  currentDate: Date;
  calendars: Calendar[];
  events: Event[];
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onSetCalendarView: (view: 'month' | 'week' | 'day') => void;
  onNewEvent: () => void;
  onFindTime: () => void;
  onDayClick: (date: Date) => void;
  onEventClick: (event: Event) => void;
}

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function EventsView({
  calendarView,
  currentDate,
  calendars,
  events,
  onNavigatePrev,
  onNavigateNext,
  onSetCalendarView,
  onNewEvent,
  onFindTime,
  onDayClick,
  onEventClick,
}: EventsViewProps) {
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getHoursInDay = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i);
    }
    return hours;
  };

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getEventsForHour = (date: Date, hour: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getHours() === hour
      );
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onPress={onNavigatePrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {calendarView === 'month'
              ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              : calendarView === 'week'
                ? `Week of ${currentDate.toLocaleDateString()}`
                : currentDate.toLocaleDateString()}
          </h2>
          <Button variant="secondary" onPress={onNavigateNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <select
            value={calendarView}
            onChange={(e) => onSetCalendarView(e.target.value as 'month' | 'week' | 'day')}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </select>
          <Button variant="secondary" onPress={onFindTime}>
            Find Time
          </Button>
          <Button onPress={onNewEvent}>
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      {calendarView === 'month' && (
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          {dayNames.map((day) => (
            <div
              key={day}
              className="p-3 bg-gray-50 text-center text-sm font-semibold text-gray-600"
            >
              {day}
            </div>
          ))}
          {getDaysInMonth(currentDate).map((date, index) => (
            <div
              key={index}
              className="min-h-[100px] p-2 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => date && onDayClick(date)}
            >
              {date && (
                <>
                  <div className="text-sm font-medium mb-2">{date.getDate()}</div>
                  <div className="flex flex-col gap-1">
                    {getEventsForDay(date)
                      .slice(0, 3)
                      .map((event) => (
                        <div
                          key={event.id}
                          className="px-2 py-1 text-xs rounded text-white overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer hover:opacity-80"
                          style={{
                            backgroundColor:
                              calendars.find((c) => c.id === event.calendarId)?.color || '#3b82f6',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                        >
                          {event.title}
                        </div>
                      ))}
                    {getEventsForDay(date).length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{getEventsForDay(date).length - 3} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {calendarView === 'week' && (
        <div className="grid grid-cols-8 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-3 bg-gray-50 text-center text-sm font-semibold text-gray-600">Time</div>
          {getWeekDays(currentDate).map((date) => (
            <div
              key={date.toISOString()}
              className="p-3 bg-gray-50 text-center text-sm font-semibold text-gray-600"
            >
              <div>{dayNames[date.getDay()]}</div>
              <div className="text-xs mt-1">{date.getDate()}</div>
            </div>
          ))}
          {getHoursInDay().map((hour) => (
            <div key={hour}>
              <div className="p-2 bg-white text-xs text-gray-500 text-right">{hour}:00</div>
              {getWeekDays(currentDate).map((date) => (
                <div
                  key={`${hour}-${date.toISOString()}`}
                  className="min-h-[50px] p-1 bg-white border-t border-gray-100 cursor-pointer hover:bg-gray-50"
                  onClick={() => onDayClick(date)}
                >
                  {getEventsForHour(date, hour).map((event) => (
                    <div
                      key={event.id}
                      className="px-2 py-1 text-xs rounded text-white overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer hover:opacity-80 mb-1"
                      style={{
                        backgroundColor:
                          calendars.find((c) => c.id === event.calendarId)?.color || '#3b82f6',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {calendarView === 'day' && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold">{currentDate.toLocaleDateString()}</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {getHoursInDay().map((hour) => (
              <div
                key={hour}
                className="flex min-h-[60px] p-2 hover:bg-gray-50 cursor-pointer"
                onClick={onNewEvent}
              >
                <div className="w-16 text-sm text-gray-500 text-right pr-4">{hour}:00</div>
                <div className="flex-1">
                  {getEventsForHour(currentDate, hour).map((event) => (
                    <div
                      key={event.id}
                      className="px-3 py-2 mb-1 rounded text-white cursor-pointer hover:opacity-80"
                      style={{
                        backgroundColor:
                          calendars.find((c) => c.id === event.calendarId)?.color || '#3b82f6',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    >
                      <div className="font-medium">{event.title}</div>
                      <div className="text-xs opacity-90">
                        {new Date(event.start).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        -{' '}
                        {new Date(event.end).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
