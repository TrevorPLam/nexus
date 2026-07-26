/**
 * PowerSync type augmentations
 *
 * PowerSync v2 type definitions are incomplete for some methods.
 * This module augments the PowerSyncDatabase interface with missing types.
 */

import '@powersync/react-native';

declare module '@powersync/react-native' {
  interface PowerSyncDatabase {
    /**
     * Execute a SQL statement (INSERT, UPDATE, DELETE, etc.)
     * @param sql - SQL statement to execute
     * @param params - Optional parameters for the SQL statement
     */
    execute(sql: string, params?: unknown[]): Promise<void>;

    /**
     * Execute a query and return all results
     * @param sql - SQL query to execute
     * @param params - Optional parameters for the SQL query
     * @returns Array of result rows
     */
    getAll(sql: string, params?: unknown[]): Promise<unknown[]>;

    /**
     * Execute a query and return the first result
     * @param sql - SQL query to execute
     * @param params - Optional parameters for the SQL query
     * @returns First result row or null
     */
    get(sql: string, params?: unknown[]): Promise<unknown | null>;

  }
}
