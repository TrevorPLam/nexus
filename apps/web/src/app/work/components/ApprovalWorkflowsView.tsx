'use client';

import { Button } from '@life-os/ui';
import { Plus, ShieldCheck, Edit, Trash2, CheckCircle2, XCircle, Clock, Layers, Users } from 'lucide-react';

import type { ApprovalWorkflow, ApprovalRequest } from '../types-approvals';

interface ApprovalWorkflowsViewProps {
  workflows: ApprovalWorkflow[];
  requests: ApprovalRequest[];
  loading: boolean;
  onNewWorkflow: () => void;
  onEditWorkflow: (workflow: ApprovalWorkflow) => void;
  onDeleteWorkflow: (workflowId: string) => void;
  onToggleWorkflow: (workflowId: string, isActive: boolean) => void;
  onRespondToRequest: (requestId: string, decision: 'approved' | 'rejected', comment?: string) => void;
}

export function ApprovalWorkflowsView({
  workflows,
  requests,
  loading,
  onNewWorkflow,
  onEditWorkflow,
  onDeleteWorkflow,
  onToggleWorkflow,
  onRespondToRequest,
}: ApprovalWorkflowsViewProps) {
  const getStatusColor = (status: ApprovalRequest['status']) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      case 'pending':
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const myPendingRequests = pendingRequests; // In production, filter by current user

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Approval Workflows</h2>
          <p className="text-gray-600 mt-1">Manage approval processes for tasks, projects, and documents</p>
        </div>
        <Button onPress={onNewWorkflow}>
          <Plus className="w-4 h-4 mr-2" />
          New Workflow
        </Button>
      </div>

      {/* Pending Requests Section */}
      {myPendingRequests.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Approvals ({myPendingRequests.length})</h3>
          <div className="space-y-3">
            {myPendingRequests.map((request) => (
              <div key={request.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <h4 className="font-medium text-gray-900">
                        {request.entityType} requires approval
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Stage {request.currentStage + 1} of {workflows.find((w) => w.id === request.workflowId)?.stages.length || 0}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="small"
                        onPress={() => onRespondToRequest(request.id, 'approved')}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        onPress={() => onRespondToRequest(request.id, 'rejected')}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                  {request.expiresAt && (
                    <div className="text-xs text-gray-500">
                      Expires: {new Date(request.expiresAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading workflows...</div>
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No approval workflows yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Create approval workflows with multiple stages to ensure proper review and authorization for important items.
          </p>
          <Button onPress={onNewWorkflow}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Workflow
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-lg ${workflow.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${workflow.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {workflow.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {workflow.entityType}
                      </span>
                    </div>
                    {workflow.description && (
                      <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>{workflow.stages.length} stage{workflow.stages.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{workflow.stages.reduce((sum, stage) => sum + stage.approvers.length, 0)} approver{workflow.stages.reduce((sum, stage) => sum + stage.approvers.length, 0) !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    onPress={() => onToggleWorkflow(workflow.id, !workflow.isActive)}
                  >
                    {workflow.isActive ? 'Pause' : 'Activate'}
                  </Button>
                  <Button variant="secondary" size="small" onPress={() => onEditWorkflow(workflow)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="secondary" size="small" onPress={() => onDeleteWorkflow(workflow.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Workflow Stages */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Approval Stages</h4>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {workflow.stages.map((stage, index) => (
                    <div key={stage.id} className="flex-shrink-0 w-48 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <h5 className="text-sm font-medium text-gray-900">{stage.name}</h5>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        <span className="font-medium">{stage.approvers.length}</span> approver
                        {stage.approvers.length !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-gray-500">
                        {stage.approvalType === 'any' && 'Any approval required'}
                        {stage.approvalType === 'all' && 'All approvals required'}
                        {stage.approvalType === 'majority' && 'Majority approval required'}
                      </div>
                      {stage.timeoutDays && (
                        <div className="text-xs text-gray-500 mt-1">
                          Timeout: {stage.timeoutDays} day{stage.timeoutDays !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Start Templates */}
      {workflows.length < 2 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start Workflow Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="font-medium text-sm">Task Approval</h4>
              </div>
              <p className="text-xs text-gray-500">2 stages: Manager review, Final approval</p>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                </div>
                <h4 className="font-medium text-sm">Budget Approval</h4>
              </div>
              <p className="text-xs text-gray-500">3 stages: Team lead, Finance, Executive</p>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                </div>
                <h4 className="font-medium text-sm">Document Review</h4>
              </div>
              <p className="text-xs text-gray-500">Single stage with multiple reviewers</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
