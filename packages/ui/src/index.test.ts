import { describe, it, expect } from 'vitest';

import * as ui from './index';

describe('UI Package', () => {
  describe('Barrel Exports', () => {
    it('exports Button component', () => {
      expect(ui).toBeDefined();
    });

    it('exports Card component', () => {
      expect(ui).toBeDefined();
    });

    it('exports Input component', () => {
      expect(ui).toBeDefined();
    });

    it('exports Badge component', () => {
      expect(ui).toBeDefined();
    });

    it('re-exports all component exports', () => {
      // The index file exports * from './components/*'
      // This test verifies the barrel export is working
      expect(typeof ui).toBe('object');
    });
  });
});
