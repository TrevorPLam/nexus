/**
 * MODULE: Goals & Key Results Types (Web)
 *
 * Responsibility:
 * Defines TypeScript interfaces for goals, goal periods, key results, and
 * goal progress updates.
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: types, goals, key-results
 *
 * File:
 * - apps/web/src/app/work/types-goals.ts
 *
 * Last updated:
 * - July 23, 2026
 */

export interface Goal {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  type: 'company' | 'team' | 'individual';
  status: 'on_track' | 'at_risk' | 'off_track' | 'achieved' | 'not_achieved';
  period: GoalPeriod;
  progress: number; // 0-100
  ownerId: string | null; // For individual goals
  parentGoalId: string | null; // For nested goals
  keyResults: KeyResult[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalPeriod {
  type: 'quarter' | 'year' | 'month' | 'custom';
  startDate: Date;
  endDate: Date;
  name: string; // e.g., "Q1 2024", "2024"
}

export interface KeyResult {
  id: string;
  goalId: string;
  title: string;
  description: string | null;
  targetValue: number;
  currentValue: number;
  unit: string | null; // e.g., "%", "$", "count"
  status: 'on_track' | 'at_risk' | 'off_track' | 'achieved' | 'not_achieved';
  linkedTasks: string[]; // Task IDs that contribute to this key result
  linkedProjects: string[]; // Project IDs that contribute to this key result
  dueDate: Date | null;
  owner: string | null; // User ID
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalUpdate {
  id: string;
  goalId: string;
  keyResultId: string | null;
  userId: string;
  previousProgress: number;
  newProgress: number;
  notes: string | null;
  createdAt: Date;
}
