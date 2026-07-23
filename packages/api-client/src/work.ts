/**
 * MODULE: Work API Mixin
 *
 * Responsibility:
 * Provides work-management API operations (projects, tasks, dependencies, notes,
 * assignees, comments, attachments, and time entries) as a reusable mixin over
 * the API client base.
 */

import {
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectResponse,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskResponse,
  CreateTaskDependencyRequest,
  TaskDependencyResponse,
  CreateTaskNoteRequest,
  UpdateTaskNoteRequest,
  TaskNoteResponse,
  CreateTaskAssigneeRequest,
  TaskAssigneeResponse,
  CreateTaskCommentRequest,
  UpdateTaskCommentRequest,
  TaskCommentResponse,
  CreateTaskAttachmentRequest,
  TaskAttachmentResponse,
  CreateTimeEntryRequest,
  UpdateTimeEntryRequest,
  TimeEntryResponse,
} from '@life-os/contracts';
import { z } from 'zod';

import { ApiClientBase } from './base';

export class WorkApi extends ApiClientBase {
  // Workspaces
  async getWorkspaces() {
    return this.request('/v1/work/workspaces', {}, z.array(ProjectResponse));
  }

  // Projects
  async getProjects(workspaceId: string) {
    return this.request(
      `/v1/work/workspaces/${workspaceId}/projects`,
      {},
      z.array(ProjectResponse),
    );
  }

  async getProject(id: string) {
    return this.request(`/v1/work/projects/${id}`, {}, ProjectResponse);
  }

  async createProject(data: z.infer<typeof CreateProjectRequest>) {
    CreateProjectRequest.parse(data);
    return this.request('/v1/work/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: z.infer<typeof UpdateProjectRequest>) {
    UpdateProjectRequest.parse(data);
    return this.request(`/v1/work/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.request(`/v1/work/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Tasks
  async getTasks(workspaceId: string, filters?: Record<string, string>) {
    const params = new URLSearchParams(filters);
    const queryString = params.toString();
    return this.request(
      `/v1/work/workspaces/${workspaceId}/tasks${queryString ? `?${queryString}` : ''}`,
      {},
      z.array(TaskResponse),
    );
  }

  async getTask(id: string) {
    return this.request(`/v1/work/tasks/${id}`, {}, TaskResponse);
  }

  async getTasksByProject(projectId: string) {
    return this.request(`/v1/work/projects/${projectId}/tasks`, {}, z.array(TaskResponse));
  }

  async createTask(data: z.infer<typeof CreateTaskRequest>) {
    CreateTaskRequest.parse(data);
    return this.request('/v1/work/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: z.infer<typeof UpdateTaskRequest>) {
    UpdateTaskRequest.parse(data);
    return this.request(`/v1/work/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string) {
    return this.request(`/v1/work/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Task Dependencies
  async getTaskDependencies(taskId: string) {
    return this.request(
      `/v1/work/tasks/${taskId}/dependencies`,
      {},
      z.array(TaskDependencyResponse),
    );
  }

  async createTaskDependency(data: z.infer<typeof CreateTaskDependencyRequest>) {
    CreateTaskDependencyRequest.parse(data);
    return this.request('/v1/work/task-dependencies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTaskDependency(id: string) {
    return this.request(`/v1/work/task-dependencies/${id}`, {
      method: 'DELETE',
    });
  }

  // Task Assignees
  async getTaskAssignees(taskId: string) {
    return this.request(`/v1/work/tasks/${taskId}/assignees`, {}, z.array(TaskAssigneeResponse));
  }

  async createTaskAssignee(data: z.infer<typeof CreateTaskAssigneeRequest>) {
    CreateTaskAssigneeRequest.parse(data);
    return this.request('/v1/work/task-assignees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTaskAssignee(id: string) {
    return this.request(`/v1/work/task-assignees/${id}`, {
      method: 'DELETE',
    });
  }

  // Task Comments
  async getTaskComments(taskId: string) {
    return this.request(`/v1/work/tasks/${taskId}/comments`, {}, z.array(TaskCommentResponse));
  }

  async createTaskComment(data: z.infer<typeof CreateTaskCommentRequest>) {
    CreateTaskCommentRequest.parse(data);
    return this.request('/v1/work/task-comments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTaskComment(id: string, data: z.infer<typeof UpdateTaskCommentRequest>) {
    UpdateTaskCommentRequest.parse(data);
    return this.request(`/v1/work/task-comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTaskComment(id: string) {
    return this.request(`/v1/work/task-comments/${id}`, {
      method: 'DELETE',
    });
  }

  // Task Attachments
  async getTaskAttachments(taskId: string) {
    return this.request(
      `/v1/work/tasks/${taskId}/attachments`,
      {},
      z.array(TaskAttachmentResponse),
    );
  }

  async createTaskAttachment(data: z.infer<typeof CreateTaskAttachmentRequest>) {
    CreateTaskAttachmentRequest.parse(data);
    return this.request('/v1/work/task-attachments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTaskAttachment(id: string) {
    return this.request(`/v1/work/task-attachments/${id}`, {
      method: 'DELETE',
    });
  }

  // Task Notes
  async getTaskNotes(taskId: string) {
    return this.request(`/v1/work/tasks/${taskId}/notes`, {}, z.array(TaskNoteResponse));
  }

  async createTaskNote(data: z.infer<typeof CreateTaskNoteRequest>) {
    CreateTaskNoteRequest.parse(data);
    return this.request('/v1/work/task-notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTaskNote(id: string, data: z.infer<typeof UpdateTaskNoteRequest>) {
    UpdateTaskNoteRequest.parse(data);
    return this.request(`/v1/work/task-notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTaskNote(id: string) {
    return this.request(`/v1/work/task-notes/${id}`, {
      method: 'DELETE',
    });
  }

  // Time Entries
  async getTimeEntries(taskId: string) {
    return this.request(`/v1/work/tasks/${taskId}/time-entries`, {}, z.array(TimeEntryResponse));
  }

  async createTimeEntry(data: z.infer<typeof CreateTimeEntryRequest>) {
    CreateTimeEntryRequest.parse(data);
    return this.request('/v1/work/time-entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTimeEntry(id: string, data: z.infer<typeof UpdateTimeEntryRequest>) {
    UpdateTimeEntryRequest.parse(data);
    return this.request(`/v1/work/time-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTimeEntry(id: string) {
    return this.request(`/v1/work/time-entries/${id}`, {
      method: 'DELETE',
    });
  }
}
