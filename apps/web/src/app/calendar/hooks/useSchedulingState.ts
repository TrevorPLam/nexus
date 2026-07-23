/**
 * MODULE: Scheduling Link Form State Hook
 *
 * Responsibility:
 * Manages local UI state for the scheduling link create/edit modal, including
 * form fields (duration, buffers, availability windows, booking limits), modal
 * visibility, and submission to create/update mutations.
 *
 * Boundaries:
 * - UI state only; delegates persistence to mutation functions passed as props.
 * - Does not manage query cache or data fetching.
 *
 * Critical invariants:
 * - maxDailyBookings is stored as string in the form and parsed to int on submit.
 * - Default availableDays is all 7 days (0–6).
 *
 * Change risk:
 * - Low. Form state management only.
 *
 * Links:
 * - apps/web/src/app/calendar/types.ts
 * - apps/web/src/app/calendar/components/modals/SchedulingLinkModal.tsx
 * - apps/web/src/app/calendar/components/SchedulingView.tsx
 *
 * Tags:
 * - domain: calendar
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: form-state, scheduling-links
 *
 * File:
 * - apps/web/src/app/calendar/hooks/useSchedulingState.ts
 *
 * Last updated:
 * - July 23, 2026
 */

import { useState } from 'react';

import type { SchedulingLink, SchedulingForm } from '../types';

interface UseSchedulingStateProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSchedulingLinkMutation: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateSchedulingLinkMutation: any;
}

export function useSchedulingState({
  createSchedulingLinkMutation,
  updateSchedulingLinkMutation,
}: UseSchedulingStateProps) {
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [editingSchedulingLink, setEditingSchedulingLink] = useState<SchedulingLink | null>(null);
  const [schedulingForm, setSchedulingForm] = useState<SchedulingForm>({
    name: '',
    slug: '',
    description: '',
    calendarId: '',
    eventDuration: 30,
    bufferBefore: 0,
    bufferAfter: 0,
    minBookingNotice: 0,
    maxBookingNotice: 0,
    availabilityStart: '09:00',
    availabilityEnd: '17:00',
    availableDays: [0, 1, 2, 3, 4, 5, 6],
    requiresApproval: false,
    maxDailyBookings: '',
  });

  const handleNewSchedulingLink = () => {
    setEditingSchedulingLink(null);
    setShowSchedulingModal(true);
  };

  const handleEditSchedulingLink = (link: SchedulingLink) => {
    setEditingSchedulingLink(link);
    setSchedulingForm({
      name: link.name,
      slug: link.slug,
      description: link.description || '',
      calendarId: link.calendarId,
      eventDuration: link.eventDuration,
      bufferBefore: link.bufferBefore,
      bufferAfter: link.bufferAfter,
      minBookingNotice: link.minBookingNotice,
      maxBookingNotice: link.maxBookingNotice,
      availabilityStart: link.availabilityStart || '09:00',
      availabilityEnd: link.availabilityEnd || '17:00',
      availableDays: link.availableDays || [0, 1, 2, 3, 4, 5, 6],
      requiresApproval: link.requiresApproval,
      maxDailyBookings: link.maxDailyBookings?.toString() || '',
    });
    setShowSchedulingModal(true);
  };

  const handleSchedulingModalClose = () => {
    setShowSchedulingModal(false);
    setEditingSchedulingLink(null);
    setSchedulingForm({
      name: '',
      slug: '',
      description: '',
      calendarId: '',
      eventDuration: 30,
      bufferBefore: 0,
      bufferAfter: 0,
      minBookingNotice: 0,
      maxBookingNotice: 0,
      availabilityStart: '09:00',
      availabilityEnd: '17:00',
      availableDays: [0, 1, 2, 3, 4, 5, 6],
      requiresApproval: false,
      maxDailyBookings: '',
    });
  };

  const handleSchedulingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: schedulingForm.name,
      slug: schedulingForm.slug,
      description: schedulingForm.description || undefined,
      calendarId: schedulingForm.calendarId,
      eventDuration: schedulingForm.eventDuration,
      bufferBefore: schedulingForm.bufferBefore,
      bufferAfter: schedulingForm.bufferAfter,
      minBookingNotice: schedulingForm.minBookingNotice,
      maxBookingNotice: schedulingForm.maxBookingNotice,
      availabilityStart: schedulingForm.availabilityStart,
      availabilityEnd: schedulingForm.availabilityEnd,
      availableDays: schedulingForm.availableDays,
      requiresApproval: schedulingForm.requiresApproval,
      maxDailyBookings: schedulingForm.maxDailyBookings
        ? parseInt(schedulingForm.maxDailyBookings)
        : undefined,
    };
    if (editingSchedulingLink) {
      updateSchedulingLinkMutation.mutate({ id: editingSchedulingLink.id, data });
    } else {
      createSchedulingLinkMutation.mutate(data);
    }
  };

  return {
    showSchedulingModal,
    editingSchedulingLink,
    schedulingForm,
    setSchedulingForm,
    handleNewSchedulingLink,
    handleEditSchedulingLink,
    handleSchedulingModalClose,
    handleSchedulingSubmit,
  };
}
