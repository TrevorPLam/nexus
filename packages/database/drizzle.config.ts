/**
 * MODULE: Drizzle Kit Configuration
 *
 * Responsibility:
 * Configures Drizzle Kit with the schema entry point, output directory, PostgreSQL
 * dialect, and database connection credentials used to generate migrations.
 *
 * Boundaries:
 * - Build-time/migration-time configuration only; not imported by runtime code.
 * - Runtime database connection is handled by apps/api/src/lib/db.ts.
 *
 * Critical invariants:
 * - The schema path must point to packages/database/src/schema/index.ts.
 * - DATABASE_URL must be set when running drizzle-kit commands.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - High. A misconfigured schema path or dialect will generate incorrect migrations.
 *
 * Links:
 * - packages/database/src/schema/index.ts
 * - apps/api/src/lib/db.ts
 *
 * Tags:
 * - domain: database
 * - risk: high
 * - layer: infrastructure
 * - stability: stable
 * - concerns: drizzle, migrations, configuration
 *
 * File:
 * - packages/database/drizzle.config.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
