'use client';

import { Button } from '@life-os/ui';
import { Paperclip, Download, Trash2, FileText, Image as ImageIcon, File } from 'lucide-react';
import { useState } from 'react';

import type { TaskAttachment } from '../types';

interface TaskAttachmentsProps {
  attachments: TaskAttachment[];
  onUploadFile: (file: File) => void;
  onDeleteAttachment: (attachmentId: string) => void;
  onDownloadAttachment: (attachmentId: string) => void;
  currentUserId?: string;
}

export function TaskAttachments({
  attachments,
  onUploadFile,
  onDeleteAttachment,
  onDownloadAttachment,
  currentUserId,
}: TaskAttachmentsProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onUploadFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUploadFile(files[0]);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5" />;
    }
    if (fileType === 'application/pdf') {
      return <FileText className="w-5 h-5" />;
    }
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (size: string) => {
    const bytes = parseInt(size, 10);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Paperclip className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Attachments</h3>
        <span className="text-sm text-gray-500">({attachments.length})</span>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileSelect}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer block"
        >
          <Paperclip className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Images, PDFs, documents up to 10MB
          </p>
        </label>
      </div>

      {/* Attachments List */}
      <div className="space-y-2">
        {attachments.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No attachments yet
          </div>
        ) : (
          attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-gray-500 flex-shrink-0">
                  {getFileIcon(attachment.fileType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.fileName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatFileSize(attachment.fileSize)}</span>
                    <span>•</span>
                    <span>{formatDate(attachment.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="secondary"
                  size="small"
                  onPress={() => onDownloadAttachment(attachment.id)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                {attachment.uploadedBy === currentUserId && (
                  <Button
                    variant="secondary"
                    size="small"
                    onPress={() => onDeleteAttachment(attachment.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
