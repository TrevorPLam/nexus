'use client';

import { Button, Input } from '@life-os/ui';
import { Plus, Check, X, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import type { Task } from '../types';

interface TaskSubtasksProps {
  subtasks: Task[];
  onAddSubtask: (title: string) => void;
  onUpdateSubtask: (subtaskId: string, data: Partial<Task>) => void;
  onDeleteSubtask: (subtaskId: string) => void;
}

export function TaskSubtasks({
  subtasks,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
}: TaskSubtasksProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      onAddSubtask(newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      setIsAdding(false);
    }
  };

  const handleToggleComplete = (subtask: Task) => {
    const newStatus = subtask.status === 'done' ? 'todo' : 'done';
    onUpdateSubtask(subtask.id, { status: newStatus });
  };

  const completedCount = subtasks.filter((s) => s.status === 'done').length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChevronRight className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Subtasks</h3>
          <span className="text-sm text-gray-500">
            ({completedCount}/{totalCount})
          </span>
        </div>
        <Button
          variant="secondary"
          size="small"
          onPress={() => setIsAdding(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Add Subtask Form */}
      {isAdding && (
        <div className="flex gap-2">
          <Input
            placeholder="Subtask title..."
            value={newSubtaskTitle}
            onChangeText={setNewSubtaskTitle}
          />
          <Button onPress={handleAddSubtask}>
            <Check className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            onPress={() => {
              setIsAdding(false);
              setNewSubtaskTitle('');
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Subtasks List */}
      <div className="space-y-2">
        {subtasks.length === 0 && !isAdding ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No subtasks yet
          </div>
        ) : (
          subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors group"
            >
              <button
                onClick={() => handleToggleComplete(subtask)}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  subtask.status === 'done'
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                {subtask.status === 'done' && <Check className="w-3 h-3" />}
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm ${
                    subtask.status === 'done'
                      ? 'text-gray-400 line-through'
                      : 'text-gray-900'
                  }`}
                >
                  {subtask.title}
                </p>
                {subtask.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                    {subtask.description}
                  </p>
                )}
              </div>
              <Button
                variant="secondary"
                size="small"
                onPress={() => onDeleteSubtask(subtask.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
