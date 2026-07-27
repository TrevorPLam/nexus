/**
 * Tests for API Client class instantiation and default export.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ApiClient, apiClient } from './index';

describe('API Client Package', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('http://test-api.com');
    global.fetch = vi.fn();
  });

  describe('ApiClient Class', () => {
    it('creates client with default base URL', () => {
      const defaultClient = new ApiClient();
      expect(defaultClient).toBeDefined();
    });

    it('creates client with custom base URL', () => {
      const customClient = new ApiClient('http://custom.com');
      expect(customClient).toBeDefined();
    });
  });

  describe('Default Export', () => {
    it('exports default apiClient instance', () => {
      expect(apiClient).toBeInstanceOf(ApiClient);
    });
  });
});
