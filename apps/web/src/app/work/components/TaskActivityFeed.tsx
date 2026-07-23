'use client';

import { Clock, MessageSquare, Paperclip, User, CheckCircle2, Edit, Calendar } from 'lucide-react';

import type { TaskComment, TaskAttachment, TimeEntry } from '../types';

interface ActivityItem {
  id: string;
  type:
    | 'comment'
    | 'attachment'
    | 'time_entry'
    | 'status_change'
    | 'assignment'
    | 'created'
    | 'updated';
  userId: string;
  userName: string;
  timestamp: Date;
  data?: {
    content?: string;
    fileName?: string;
    duration?: string;
    oldStatus?: string;
    newStatus?: string;
    assignee?: string;
  };
}

interface TaskActivityFeedProps {
  comments: TaskComment[];
  attachments: TaskAttachment[];
  timeEntries: TimeEntry[];
  taskCreatedAt: Date;
  taskUpdatedAt: Date;
}

export function TaskActivityFeed({
  comments,
  attachments,
  timeEntries,
  taskCreatedAt,
  taskUpdatedAt,
}: TaskActivityFeedProps) {
  const getActivities = (): ActivityItem[] => {
    const activities: ActivityItem[] = [];

    // Task created
    activities.push({
      id: 'created',
      type: 'created',
      userId: 'system',
      userName: 'System',
      timestamp: taskCreatedAt,
    });

    // Comments
    comments.forEach((comment) => {
      activities.push({
        id: comment.id,
        type: 'comment',
        userId: comment.userId,
        userName: comment.userId, // In production, fetch user name from API
        timestamp: comment.createdAt,
        data: { content: comment.content },
      });
    });

    // Attachments
    attachments.forEach((attachment) => {
      activities.push({
        id: attachment.id,
        type: 'attachment',
        userId: attachment.uploadedBy,
        userName: attachment.uploadedBy, // In production, fetch user name from API
        timestamp: attachment.createdAt,
        data: { fileName: attachment.fileName },
      });
    });

    // Time entries
    timeEntries.forEach((timeEntry) => {
      activities.push({
        id: timeEntry.id,
        type: 'time_entry',
        userId: timeEntry.userId,
        userName: timeEntry.userId, // In production, fetch user name from API
        timestamp: timeEntry.createdAt,
        data: { duration: timeEntry.duration || undefined },
      });
    });

    // Task updated (if different from created)
    if (taskUpdatedAt.getTime() !== taskCreatedAt.getTime()) {
      activities.push({
        id: 'updated',
        type: 'updated',
        userId: 'system',
        userName: 'System',
        timestamp: taskUpdatedAt,
      });
    }

    // Sort by timestamp descending
    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'comment':
        return MessageSquare;
      case 'attachment':
        return Paperclip;
      case 'time_entry':
        return Clock;
      case 'status_change':
        return CheckCircle2;
      case 'assignment':
        return User;
      case 'created':
        return Calendar;
      case 'updated':
        return Edit;
      default:
        return Clock;
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'comment':
        return `commented: "${activity.data?.content?.substring(0, 50) || ''}${activity.data?.content && activity.data.content.length > 50 ? '...' : ''}"`;
      case 'attachment':
        return `attached ${activity.data?.fileName}`;
      case 'time_entry':
        return `logged ${activity.data?.duration} of time`;
      case 'status_change':
        return `changed status from ${activity.data?.oldStatus} to ${activity.data?.newStatus}`;
      case 'assignment':
        return `assigned to ${activity.data?.assignee}`;
      case 'created':
        return 'created this task';
      case 'updated':
        return 'updated this task';
      default:
        return 'performed an action';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const activities = getActivities();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Activity</h3>

      {activities.length === 0 ? (
        <div className="p-4 text-center text-gray-500 text-sm border border-gray-200 rounded-lg">
          No activity yet
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.type);
            return (
              <div key={activity.id} className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{activity.userName}</span>
                    <span className="text-sm text-gray-600">{getActivityText(activity)}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatTimestamp(activity.timestamp)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
