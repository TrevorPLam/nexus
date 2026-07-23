/**
 * MODULE: Database Connection
 *
 * Responsibility:
 * Initializes and exports the Drizzle ORM instance and the underlying PostgreSQL
 * connection pool for the backend API.
 *
 * Boundaries:
 * - Low-level persistence connection only.
 * - Central point for all database interactions.
 *
 * Critical invariants:
 * - DATABASE_URL must be provided via environment variables.
 * - Connection pool is limited to 10 concurrent connections by default.
 * - Exports a singleton 'db' instance.
 *
 * Side effects:
 * - Establishes network connections to PostgreSQL.
 *
 * Change risk:
 * - High. Affects connection reliability and throughput across the entire API.
 *
 * Links:
 * - packages/database/src/schema/ (Drizzle schema definitions)
 * - .env.example (DATABASE_URL configuration)
 *
 * Tags:
 * - domain: database
 * - risk: high
 * - layer: infrastructure
 * - stability: stable
 * - concerns: postgresql, drizzle, connection-pool
 *
 * File:
 * - apps/api/src/lib/db.ts
 *
 * Last updated:
 * - July 22, 2026
 */

import * as schema from '@life-os/database';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
