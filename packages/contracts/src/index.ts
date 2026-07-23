/**
 * MODULE: Contract Exports
 *
 * Responsibility:
 * Re-exports all Zod contract modules from a single entry point, defining the
 * public API contract surface used by the backend, API client, and web/mobile apps.
 *
 * Boundaries:
 * - Pure barrel export; no runtime logic or schema definitions.
 * - Contract definitions live in sibling modules (work.ts, calendar.ts, common.ts).
 *
 * Critical invariants:
 * - Must re-export all schemas consumed by packages/api-client and apps/api routes.
 * - Changing module names or paths here breaks every downstream consumer.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - Medium. Removing an export breaks API client and route imports; adding one is safe.
 *
 * Links:
 * - packages/contracts/src/work.ts
 * - packages/contracts/src/calendar.ts
 * - packages/contracts/src/common.ts
 *
 * Tags:
 * - domain: contracts
 * - risk: medium
 * - layer: contracts
 * - stability: stable
 * - concerns: barrel-export, api-contract
 *
 * File:
 * - packages/contracts/src/index.ts
 *
 * Last updated:
 * - July 22, 2026
 */

export * from './work';
export * from './calendar';
export * from './contacts';
export * from './common';
