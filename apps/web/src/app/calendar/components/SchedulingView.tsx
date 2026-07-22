'use client';

import { Button, Badge } from '@life-os/ui';
import { Plus, Edit2, Trash2 } from 'lucide-react';

import type { SchedulingLink, Calendar } from '../types';

interface SchedulingViewProps {
  schedulingLinks: SchedulingLink[];
  calendars: Calendar[];
  onNewSchedulingLink: () => void;
  onEditSchedulingLink: (link: SchedulingLink) => void;
  onDeleteSchedulingLink: (id: string) => void;
}

export function SchedulingView({
  schedulingLinks,
  calendars,
  onNewSchedulingLink,
  onEditSchedulingLink,
  onDeleteSchedulingLink,
}: SchedulingViewProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Scheduling Links</h2>
        <Button onPress={onNewSchedulingLink}>
          <Plus className="w-4 h-4 mr-2" />
          New Scheduling Link
        </Button>
      </div>

      {schedulingLinks.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <p className="text-gray-600">No scheduling links yet. Create your first booking page.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedulingLinks.map((link) => (
            <div
              key={link.id}
              className="p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold">{link.name}</h3>
                  <p className="text-sm text-gray-500">/{link.slug}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="small"
                    onPress={() => onEditSchedulingLink(link)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onPress={() => onDeleteSchedulingLink(link.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {link.description && <p className="text-gray-600 text-sm mb-4">{link.description}</p>}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration:</span>
                  <span>{link.eventDuration} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Calendar:</span>
                  <span>{calendars.find((c) => c.id === link.calendarId)?.name || 'Unknown'}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {link.isActive && <Badge variant="success">Active</Badge>}
                  {link.requiresApproval && <Badge variant="warning">Requires Approval</Badge>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
