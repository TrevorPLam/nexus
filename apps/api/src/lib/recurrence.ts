/**
 * MODULE: Recurrence & Timezone Utilities (Barrel Export)
 *
 * Responsibility:
 * Re-exports all recurrence and timezone utilities from their respective modules.
 * This file maintains backward compatibility for existing imports.
 *
 * Boundaries:
 * - Pure barrel export; no implementation logic.
 *
 * Critical invariants:
 * - All exports must be re-exported from their respective modules.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - Low. This is a barrel export only.
 *
 * Links:
 * - recurrence-rrule.ts (RRULE operations)
 * - recurrence-timezone.ts (Timezone operations)
 *
 * Tags:
 * - domain: calendar
 * - risk: low
 * - layer: utilities
 * - stability: stable
 * - concerns: recurrence, timezone, barrel-export
 *
 * File:
 * - apps/api/src/lib/recurrence.ts
 *
 * Last updated:
 * - July 26, 2026
 */

// RRULE operations
export { expandRecurringEvent, generateRRULE, validateRRULE } from './recurrence-rrule.js';

// Timezone operations
export {
  convertFromTimezone,
  convertToTimezone,
  getEndOfDay,
  getStartOfDay,
  rangesOverlap,
} from './recurrence-timezone.js';
