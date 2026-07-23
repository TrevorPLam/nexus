import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

describe('Mobile Calendar Page', () => {
  describe('File structure', () => {
    it('calendar screen component exists', () => {
      const file = readFileSync(join(__dirname, 'index.tsx'), 'utf-8');
      expect(file).toContain('export default function CalendarScreen');
    });

    it('calendar hooks exist', () => {
      const file = readFileSync(join(__dirname, 'hooks', 'useCalendarData.ts'), 'utf-8');
      expect(file).toContain('export function useCalendarData');
      expect(file).toContain('export function useEventMutations');
    });

    it('scheduling shows honest MVP message', () => {
      const file = readFileSync(join(__dirname, 'index.tsx'), 'utf-8');
      expect(file).toContain('not available in mobile MVP');
    });
  });

  describe('Schema completeness', () => {
    it('mobile schema includes timezone field for scheduling_links', () => {
      const schemaFile = readFileSync(
        join(__dirname, '..', '..', '..', '..', 'packages', 'mobile-data', 'src', 'schema.ts'),
        'utf-8',
      );
      expect(schemaFile).toContain('timezone: column.text');
    });
  });
});
