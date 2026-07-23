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
