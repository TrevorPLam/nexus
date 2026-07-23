/**
 * MODULE: Life OS API Client
 *
 * Responsibility:
 * Provides a fully typed, Zod-validated TypeScript client for interacting with
 * the Life OS REST/command API. This module composes domain-specific API client
 * classes into a single public ApiClient class.
 *
 * Boundaries:
 * - Pure client-side library; no direct database access.
 * - Depends on ./base, ./work, and ./calendar for implementation.
 *
 * Side effects:
 * - Performs network requests to the Life OS API.
 */

import type { TokenProvider } from './base';
import { CalendarApi } from './calendar';

class ApiClient extends CalendarApi {
  constructor(baseUrl?: string, tokenProvider?: TokenProvider) {
    super(baseUrl, tokenProvider);
  }
}

export const apiClient = new ApiClient();
export { ApiClient };
export type { TokenProvider };
export default apiClient;
