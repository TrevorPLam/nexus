/**
 * MODULE: Estimated Duration Type Migration
 *
 * Responsibility:
 * Changes estimated_duration column from text to integer type to align
 * with the contract schema where estimatedDuration is a number (minutes).
 *
 * Boundaries:
 * - Type migration only; no business logic changes.
 * - Handles data conversion with fallback for invalid values.
 *
 * Critical invariants:
 * - Valid numeric text values are converted to integers.
 * - Non-numeric values are set to NULL to prevent type errors.
 * - Migration is reversible via type change back to text.
 *
 * Side effects:
 * - Alters column type, affecting all dependent queries and indexes.
 * - May lose precision for non-integer values (set to NULL).
 *
 * Change risk:
 * - Medium. Type changes can break dependent code if not synchronized.
 *
 * Links:
 * - packages/contracts/src/work.ts (estimatedDuration schema)
 * - packages/database/src/schema/work.ts (tasks table)
 *
 * Tags:
 * - domain: database
 * - risk: medium
 * - layer: migration
 * - stability: stable
 * - concerns: type-change, data-migration
 *
 * File:
 * - supabase/migrations/0003_change_estimated_duration_to_integer.sql
 *
 * Last updated:
 * - July 22, 2026
 */

-- Change estimated_duration from text to integer for tasks table
-- This aligns with the contract schema where estimatedDuration is a number (minutes)

-- First, convert any existing text values to integers
-- NULL values will remain NULL
UPDATE tasks
SET estimated_duration = CAST(estimated_duration AS INTEGER)
WHERE estimated_duration IS NOT NULL
  AND estimated_duration ~ '^[0-9]+$';

-- For any non-numeric values, set to NULL
UPDATE tasks
SET estimated_duration = NULL
WHERE estimated_duration IS NOT NULL
  AND estimated_duration !~ '^[0-9]+$';

-- Alter the column type to integer
ALTER TABLE tasks
  ALTER COLUMN estimated_duration TYPE INTEGER USING estimated_duration::INTEGER;
