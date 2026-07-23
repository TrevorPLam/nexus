/**
 * MODULE: Custom Field Types (Web)
 *
 * Responsibility:
 * Defines TypeScript interfaces for custom fields and their values, including
 * supported field types (text, number, date, select, etc.).
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: types, custom-fields
 *
 * File:
 * - apps/web/src/app/work/types-custom-fields.ts
 *
 * Last updated:
 * - July 23, 2026
 */

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multi_select'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'progress';

export interface CustomField {
  id: string;
  workspaceId: string;
  projectId: string | null;
  name: string;
  type: CustomFieldType;
  options?: string[]; // For select/multi_select
  defaultValue?: unknown;
  isRequired: boolean;
  isVisible: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomFieldValue {
  id: string;
  fieldId: string;
  taskId: string;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
}
