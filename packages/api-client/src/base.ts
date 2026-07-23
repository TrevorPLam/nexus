/**
 * MODULE: API Client Base
 *
 * Responsibility:
 * Provides the base HTTP client used by all domain-specific API client mixins.
 * Handles authentication headers, request formatting, response parsing, and
 * runtime Zod validation.
 *
 * Boundaries:
 * - Pure client-side library; no direct database access.
 * - Depends on @life-os/contracts for the shared error response schema.
 *
 * Side effects:
 * - Performs network requests to the Life OS API.
 */

import { ErrorResponseSchema } from '@life-os/contracts';
import { z } from 'zod';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface TokenProvider {
  getAccessToken(): Promise<string | null>;
}

export type Constructor<T = unknown> = new (...args: unknown[]) => T;

export class ApiClientBase {
  private baseUrl: string;
  private tokenProvider: TokenProvider | undefined;

  constructor(baseUrl: string = API_BASE_URL, tokenProvider?: TokenProvider) {
    this.baseUrl = baseUrl;
    this.tokenProvider = tokenProvider;
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {},
    responseSchema?: z.ZodType<T>,
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
}
