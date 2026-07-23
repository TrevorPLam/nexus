const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiError {
  error: string;
  details?: unknown;
}

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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
      const error = (await response.json()) as ApiError;
      throw new Error(error.error || 'API request failed');
    }

    return (await response.json()) as T;
  }

  // Projects
  async getProjects(workspaceId: string) {
    return this.request(`/v1/work/workspaces/${workspaceId}/projects`);
  }

  async getProject(id: string) {
    return this.request(`/v1/work/projects/${id}`);
  }

  async createProject(data: unknown) {
    return this.request('/v1/work/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: unknown) {
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
    );
  }

  async getTask(id: string) {
    return this.request(`/v1/work/tasks/${id}`);
  }

  async getTasksByProject(projectId: string) {
    return this.request(`/v1/work/projects/${projectId}/tasks`);
  }

  async createTask(data: unknown) {
    return this.request('/v1/work/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: unknown) {
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
    return this.request(`/v1/work/tasks/${taskId}/dependencies`);
  }

  async createTaskDependency(data: unknown) {
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
    return this.request(`/v1/work/tasks/${taskId}/assignees`);
  }

  async createTaskAssignee(data: unknown) {
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
    return this.request(`/v1/work/tasks/${taskId}/comments`);
  }

  async createTaskComment(data: unknown) {
    return this.request('/v1/work/task-comments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTaskComment(id: string, data: unknown) {
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
    return this.request(`/v1/work/tasks/${taskId}/attachments`);
  }

  async createTaskAttachment(data: unknown) {
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
    return this.request(`/v1/work/tasks/${taskId}/notes`);
  }

  async createTaskNote(data: unknown) {
    return this.request('/v1/work/task-notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTaskNote(id: string, data: unknown) {
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
    return this.request(`/v1/work/tasks/${taskId}/time-entries`);
  }

  async createTimeEntry(data: unknown) {
    return this.request('/v1/work/time-entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTimeEntry(id: string, data: unknown) {
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
    return this.request(`/v1/calendar/workspaces/${workspaceId}/calendars`);
  }

  async getCalendar(id: string) {
    return this.request(`/v1/calendar/calendars/${id}`);
  }

  async createCalendar(data: unknown) {
    return this.request('/v1/calendar/calendars', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCalendar(id: string, data: unknown) {
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
    );
  }

  async getEvent(id: string) {
    return this.request(`/v1/calendar/events/${id}`);
  }

  async createEvent(data: unknown) {
    return this.request('/v1/calendar/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEvent(id: string, data: unknown) {
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
    return this.request(`/v1/calendar/events/${eventId}/attendees`);
  }

  async createEventAttendee(data: unknown) {
    return this.request('/v1/calendar/event-attendees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEventAttendee(id: string, data: unknown) {
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
    return this.request(`/v1/calendar/workspaces/${workspaceId}/scheduling-links`);
  }

  async getSchedulingLink(id: string) {
    return this.request(`/v1/calendar/scheduling-links/${id}`);
  }

  async createSchedulingLink(data: unknown) {
    return this.request('/v1/calendar/scheduling-links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSchedulingLink(id: string, data: unknown) {
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
