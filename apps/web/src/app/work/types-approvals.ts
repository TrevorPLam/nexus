/**
 * MODULE: Approval Workflow Types (Web)
 *
 * Responsibility:
 * Defines TypeScript interfaces for approval workflows, stages, approvers,
 * requests, and responses.
 *
 * Tags:
 * - domain: work
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: types, approvals
 *
 * File:
 * - apps/web/src/app/work/types-approvals.ts
 *
 * Last updated:
 * - July 23, 2026
 */

export interface ApprovalWorkflow {
  id: string;
  workspaceId: string;
  projectId: string | null;
  name: string;
  description: string | null;
  entityType: 'task' | 'project' | 'document';
  stages: ApprovalStage[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalStage {
  id: string;
  workflowId: string;
  name: string;
  order: number;
  approvers: Approver[];
  approvalType: 'any' | 'all' | 'majority';
  timeoutDays: number | null;
  autoRejectOnTimeout: boolean;
}

export interface Approver {
  userId: string;
  role: 'required' | 'optional';
  order: number;
}

export interface ApprovalRequest {
  id: string;
  workflowId: string;
  entityId: string;
  entityType: 'task' | 'project' | 'document';
  requestedBy: string;
  currentStage: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  responses: ApprovalResponse[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

export interface ApprovalResponse {
  id: string;
  requestId: string;
  approverId: string;
  decision: 'approved' | 'rejected' | 'deferred';
  comment: string | null;
  respondedAt: Date;
}
