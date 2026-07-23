import { z } from 'zod';
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
  CreateCalendarRequest,
  UpdateCalendarRequest,
  CalendarResponse,
  CreateEventRequest,
  UpdateEventRequest,
  EventResponse,
  CreateEventAttendeeRequest,
  UpdateEventAttendeeRequest,
  EventAttendeeResponse,
  CreateSchedulingLinkRequest,
  UpdateSchedulingLinkRequest,
  SchedulingLinkResponse,
  ErrorResponseSchema,
} from '@life-os/contracts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface TokenProvider {
  getAccessToken(): Promise<string | null>;
}

class ApiClient {
  private baseUrl: string;
  private tokenProvider: TokenProvider | undefined;

  constructor(baseUrl: string = API_BASE_URL, tokenProvider?: TokenProvider) {
    this.baseUrl = baseUrl;
    this.tokenProvider = tokenProvider;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    responseSchema?: any,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.tokenProvider) {
      const token = await this.tokenProvider.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorResult = ErrorResponseSchema.safeParse(errorData);
      if (errorResult.success) {
        throw new Error(errorResult.data.error.message || 'API request failed');
      }
      throw new Error('API request failed');
    }

    const data = await response.json();
    if (responseSchema) {
      const result = responseSchema.safeParse(data);
      if (!result.success) {
        throw new Error(`Invalid response: ${result.error.message}`);
      }
      return result.data;
    }
    return data as T;
  }

  // Workspaces
  async getWorkspaces() {
    return this.request('/v1/work/workspaces', {}, z.array(ProjectResponse) as any);
  }

  // Projects
  async getProjects(workspaceId: string) {
    return this.request(
      `/v1/work/workspaces/${workspaceId}/projects`,
      {},
      z.array(ProjectResponse) as any,
    );
  }

  async getProject(id: string) {
    return this.request(`/v1/work/projects/${id}`, {}, ProjectResponse as any);
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
      z.array(TaskResponse) as any,
    );
  }

  async getTask(id: string) {
    return this.request(`/v1/work/tasks/${id}`, {}, TaskResponse as any);
  }

  async getTasksByProject(projectId: string) {
    return this.request(
      `/v1/work/projects/${projectId}/tasks`,
      {},
      z.array(TaskResponse) as any,
    );
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
      z.array(TaskDependencyResponse) as any,
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
    return this.request(
      `/v1/work/tasks/${taskId}/assignees`,
      {},
      z.array(TaskAssigneeResponse) as any,
    );
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
    return this.request(
      `/v1/work/tasks/${taskId}/comments`,
      {},
      z.array(TaskCommentResponse) as any,
    );
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
      z.array(TaskAttachmentResponse) as any,
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
    return this.request(
      `/v1/work/tasks/${taskId}/notes`,
      {},
      z.array(TaskNoteResponse) as any,
    );
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
    return this.request(
      `/v1/work/tasks/${taskId}/time-entries`,
      {},
      z.array(TimeEntryResponse) as any,
    );
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

  // Calendars
  async getCalendars(workspaceId: string) {
    return this.request(
      `/v1/calendar/workspaces/${workspaceId}/calendars`,
      {},
      z.array(CalendarResponse) as any,
    );
  }

  async getCalendar(id: string) {
    return this.request(`/v1/calendar/calendars/${id}`, {}, CalendarResponse as any);
  }

  async createCalendar(data: z.infer<typeof CreateCalendarRequest>) {
    CreateCalendarRequest.parse(data);
    return this.request('/v1/calendar/calendars', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCalendar(id: string, data: z.infer<typeof UpdateCalendarRequest>) {
    UpdateCalendarRequest.parse(data);
    return this.request(`/v1/calendar/calendars/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCalendar(id: string) {
    return this.request(`/v1/calendar/calendars/${id}`, {
      method: 'DELETE',
    });
  }

  // Events
  async getEvents(workspaceId: string, filters?: Record<string, string>) {
    const params = new URLSearchParams(filters);
    const queryString = params.toString();
    return this.request(
      `/v1/calendar/workspaces/${workspaceId}/events${queryString ? `?${queryString}` : ''}`,
      {},
      z.array(EventResponse) as any,
    );
  }

  async getEvent(id: string) {
    return this.request(`/v1/calendar/events/${id}`, {}, EventResponse as any);
  }

  async createEvent(data: z.infer<typeof CreateEventRequest>) {
    CreateEventRequest.parse(data);
    return this.request('/v1/calendar/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEvent(id: string, data: z.infer<typeof UpdateEventRequest>) {
    UpdateEventRequest.parse(data);
    return this.request(`/v1/calendar/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEvent(id: string) {
    return this.request(`/v1/calendar/events/${id}`, {
      method: 'DELETE',
    });
  }

  // Event Attendees
  async getEventAttendees(eventId: string) {
    return this.request(
      `/v1/calendar/events/${eventId}/attendees`,
      {},
      z.array(EventAttendeeResponse) as any,
    );
  }

  async createEventAttendee(data: z.infer<typeof CreateEventAttendeeRequest>) {
    CreateEventAttendeeRequest.parse(data);
    return this.request('/v1/calendar/event-attendees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEventAttendee(id: string, data: z.infer<typeof UpdateEventAttendeeRequest>) {
    UpdateEventAttendeeRequest.parse(data);
    return this.request(`/v1/calendar/event-attendees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEventAttendee(id: string) {
    return this.request(`/v1/calendar/event-attendees/${id}`, {
      method: 'DELETE',
    });
  }

  // Scheduling Links
  async getSchedulingLinks(workspaceId: string) {
    return this.request(
      `/v1/calendar/workspaces/${workspaceId}/scheduling-links`,
      {},
      z.array(SchedulingLinkResponse) as any,
    );
  }

  async getSchedulingLink(id: string) {
    return this.request(
      `/v1/calendar/scheduling-links/${id}`,
      {},
      SchedulingLinkResponse as any,
    );
  }

  async createSchedulingLink(data: z.infer<typeof CreateSchedulingLinkRequest>) {
    CreateSchedulingLinkRequest.parse(data);
    return this.request('/v1/calendar/scheduling-links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSchedulingLink(id: string, data: z.infer<typeof UpdateSchedulingLinkRequest>) {
    UpdateSchedulingLinkRequest.parse(data);
    return this.request(`/v1/calendar/scheduling-links/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSchedulingLink(id: string) {
    return this.request(`/v1/calendar/scheduling-links/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
export { ApiClient };
export default apiClient;
