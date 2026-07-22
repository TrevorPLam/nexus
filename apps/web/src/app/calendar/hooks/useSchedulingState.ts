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
