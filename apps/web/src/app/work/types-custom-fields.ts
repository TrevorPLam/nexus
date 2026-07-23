export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'multi_select' | 'checkbox' | 'url' | 'email' | 'phone' | 'progress';

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
