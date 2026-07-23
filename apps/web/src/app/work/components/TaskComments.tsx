'use client';

import { Button, TextArea } from '@life-os/ui';
import { Send, Trash2, MessageSquare } from 'lucide-react';
import { useState } from 'react';

import type { TaskComment } from '../types';

interface TaskCommentsProps {
  comments: TaskComment[];
  onAddComment: (content: string) => void;
  onDeleteComment: (commentId: string) => void;
  currentUserId?: string;
}

export function TaskComments({
  comments,
  onAddComment,
  onDeleteComment,
  currentUserId,
}: TaskCommentsProps) {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return commentDate.toLocaleDateString();
  };

  const sortedComments = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Comments</h3>
        <span className="text-sm text-gray-500">({comments.length})</span>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <TextArea
          placeholder="Add a comment..."
          value={newComment}
          onChangeText={setNewComment}
          rows={3}
        />
        <div className="flex justify-end">
          <Button disabled={!newComment.trim()} onPress={() => handleSubmit(new Event('submit') as unknown as React.FormEvent)}>
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {sortedComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No comments yet</p>
            <p className="text-sm mt-1">Be the first to comment on this task</p>
          </div>
        ) : (
          sortedComments.map((comment) => (
            <div
              key={comment.id}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">
                    {comment.userId === currentUserId ? 'You' : comment.userId.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {comment.userId === currentUserId ? 'You' : comment.userId}
                    </div>
                    <div className="text-xs text-gray-500">{formatDate(comment.createdAt)}</div>
                  </div>
                </div>
                {comment.userId === currentUserId && (
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
              {comment.mentions && comment.mentions.length > 0 && (
                <div className="mt-2 flex gap-1 flex-wrap">
                  {comment.mentions.map((mention) => (
                    <span
                      key={mention}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
                    >
                      @{mention}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
