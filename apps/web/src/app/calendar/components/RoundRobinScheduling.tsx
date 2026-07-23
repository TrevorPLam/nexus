'use client';

import { Button, Select } from '@life-os/ui';
import { Users, Clock, Calendar as CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  availability: string[];
}

interface RoundRobinConfig {
  id: string;
  name: string;
  members: TeamMember[];
  distributionMethod: 'round-robin' | 'least-busy' | 'random';
  maxDailyBookings: number;
  bufferMinutes: number;
}

interface RoundRobinSchedulingProps {
  config: RoundRobinConfig | null;
  teamMembers: TeamMember[];
  onCreateConfig: (config: Omit<RoundRobinConfig, 'id'>) => void;
  onUpdateConfig: (config: RoundRobinConfig) => void;
  onDeleteConfig: () => void;
}

const distributionMethods = [
  { value: 'round-robin', label: 'Round Robin (cyclical)' },
  { value: 'least-busy', label: 'Least Busy (workload balanced)' },
  { value: 'random', label: 'Random' },
];

export function RoundRobinScheduling({
  config,
  teamMembers,
  onCreateConfig,
  onUpdateConfig,
  onDeleteConfig,
}: RoundRobinSchedulingProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [configName, setConfigName] = useState(config?.name || '');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    config?.members.map((m) => m.id) || [],
  );
  const [distributionMethod, setDistributionMethod] = useState<
    RoundRobinConfig['distributionMethod']
  >(config?.distributionMethod || 'round-robin');
  const [maxDailyBookings, setMaxDailyBookings] = useState(config?.maxDailyBookings || 5);
  const [bufferMinutes, setBufferMinutes] = useState(config?.bufferMinutes || 15);

  const handleSave = () => {
    const selectedMemberData = teamMembers.filter((m) => selectedMembers.includes(m.id));

    const configData: Omit<RoundRobinConfig, 'id'> = {
      name: configName,
      members: selectedMemberData,
      distributionMethod,
      maxDailyBookings,
      bufferMinutes,
    };

    if (config) {
      onUpdateConfig({ ...config, ...configData });
    } else {
      onCreateConfig(configData);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (config) {
      setConfigName(config.name);
      setSelectedMembers(config.members.map((m) => m.id));
      setDistributionMethod(config.distributionMethod);
      setMaxDailyBookings(config.maxDailyBookings);
      setBufferMinutes(config.bufferMinutes);
    } else {
      setConfigName('');
      setSelectedMembers([]);
      setDistributionMethod('round-robin');
      setMaxDailyBookings(5);
      setBufferMinutes(15);
    }
    setIsEditing(false);
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Team Scheduling</h3>
      </div>

      {!config && !isEditing ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 mb-4">
            Set up round-robin scheduling to distribute bookings across your team
          </p>
          <Button onPress={() => setIsEditing(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Configure Team Scheduling
          </Button>
        </div>
      ) : isEditing ? (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <label className="block text-sm font-medium mb-1">Configuration Name</label>
            <input
              type="text"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="e.g., Sales Team Scheduling"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Team Members</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {teamMembers.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => toggleMember(member.id)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Distribution Method</label>
              <Select
                value={distributionMethod}
                onChange={(value) =>
                  setDistributionMethod(value as RoundRobinConfig['distributionMethod'])
                }
                options={distributionMethods}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Daily Bookings</label>
              <input
                type="number"
                value={maxDailyBookings}
                onChange={(e) => setMaxDailyBookings(parseInt(e.target.value, 10))}
                min={1}
                max={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Buffer Between Meetings (minutes)
            </label>
            <input
              type="number"
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(parseInt(e.target.value, 10))}
              min={0}
              max={60}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onPress={handleSave}>Save Configuration</Button>
            <Button variant="secondary" onPress={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">{config!.name}</h4>
              <div className="flex gap-2">
                <Button variant="secondary" size="small" onPress={() => setIsEditing(true)}>
                  Edit
                </Button>
                <Button variant="secondary" size="small" onPress={onDeleteConfig}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">{config!.members.length} team members</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">
                  {distributionMethods.find((m) => m.value === config!.distributionMethod)?.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">
                  Max {config!.maxDailyBookings} bookings per day
                </span>
              </div>
              {config!.bufferMinutes > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">
                    {config!.bufferMinutes} minute buffer between meetings
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium mb-2">Team Members</p>
              <div className="flex flex-wrap gap-2">
                {config!.members.map((member) => (
                  <span
                    key={member.id}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {member.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 bg-green-50 p-3 rounded-lg border border-green-200">
            <p>
              <strong>Active:</strong> Bookings will be automatically distributed among team members
              based on the selected method.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
