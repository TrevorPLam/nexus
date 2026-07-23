'use client';

import { Button } from '@life-os/ui';
import {
  Plus,
  Target,
  Edit,
  Trash2,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Building2,
  User,
} from 'lucide-react';

import type { Goal } from '../types-goals';

interface GoalsViewProps {
  goals: Goal[];
  loading: boolean;
  onNewGoal: () => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
}

export function GoalsView({ goals, loading, onNewGoal, onEditGoal, onDeleteGoal }: GoalsViewProps) {
  const getStatusIcon = (status: Goal['status']) => {
    switch (status) {
      case 'on_track':
        return CheckCircle2;
      case 'at_risk':
        return AlertCircle;
      case 'off_track':
        return XCircle;
      case 'achieved':
        return CheckCircle2;
      case 'not_achieved':
        return XCircle;
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: Goal['status']) => {
    switch (status) {
      case 'on_track':
        return 'text-green-600 bg-green-100';
      case 'at_risk':
        return 'text-yellow-600 bg-yellow-100';
      case 'off_track':
        return 'text-red-600 bg-red-100';
      case 'achieved':
        return 'text-green-600 bg-green-100';
      case 'not_achieved':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: Goal['type']) => {
    switch (type) {
      case 'company':
        return Building2;
      case 'team':
        return Users;
      case 'individual':
        return User;
      default:
        return Target;
    }
  };

  const getTypeLabel = (type: Goal['type']) => {
    switch (type) {
      case 'company':
        return 'Company';
      case 'team':
        return 'Team';
      case 'individual':
        return 'Individual';
      default:
        return 'Goal';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Goals & OKRs</h2>
          <p className="text-gray-600 mt-1">
            Track objectives and key results across your organization
          </p>
        </div>
        <Button onPress={onNewGoal}>
          <Plus className="w-4 h-4 mr-2" />
          New Goal
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading goals...</div>
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Create goals and key results to align your team and track progress toward strategic
            objectives.
          </p>
          <Button onPress={onNewGoal}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const StatusIcon = getStatusIcon(goal.status);
            const TypeIcon = getTypeIcon(goal.type);

            return (
              <div key={goal.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${getStatusColor(goal.status)}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{goal.name}</h3>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}
                          >
                            {goal.status.replace('_', ' ')}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {getTypeLabel(goal.type)}
                          </span>
                        </div>
                      </div>
                      {goal.description && (
                        <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <TypeIcon className="w-3 h-3" />
                          <span>{goal.period.name}</span>
                        </div>
                        <span>•</span>
                        <span>
                          {goal.keyResults.length} key result
                          {goal.keyResults.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="small" onPress={() => onEditGoal(goal)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="secondary" size="small" onPress={() => onDeleteGoal(goal.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Overall Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round(goal.progress)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>

                {/* Key Results */}
                {goal.keyResults.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Key Results</h4>
                    <div className="space-y-3">
                      {goal.keyResults.map((kr) => {
                        const krProgress = (kr.currentValue / kr.targetValue) * 100;
                        const KRStatusIcon = getStatusIcon(kr.status);
                        return (
                          <div key={kr.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="text-sm font-medium text-gray-900">{kr.title}</h5>
                                  <KRStatusIcon
                                    className={`w-3 h-3 ${getStatusColor(kr.status).split(' ')[0]}`}
                                  />
                                </div>
                                {kr.description && (
                                  <p className="text-xs text-gray-600">{kr.description}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">
                                  {kr.currentValue} / {kr.targetValue}
                                  {kr.unit && ` ${kr.unit}`}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {Math.round(krProgress)}%
                                </div>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  krProgress >= 100
                                    ? 'bg-green-500'
                                    : krProgress >= 50
                                      ? 'bg-blue-500'
                                      : 'bg-yellow-500'
                                }`}
                                style={{ width: `${Math.min(krProgress, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Start */}
      {goals.length < 2 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start Goal Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="font-medium text-sm">Revenue Growth</h4>
              </div>
              <p className="text-xs text-gray-500">Increase revenue by 20% this quarter</p>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <h4 className="font-medium text-sm">Team Productivity</h4>
              </div>
              <p className="text-xs text-gray-500">Improve team velocity by 15%</p>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="w-4 h-4 text-purple-600" />
                </div>
                <h4 className="font-medium text-sm">Customer Satisfaction</h4>
              </div>
              <p className="text-xs text-gray-500">Achieve 95% customer satisfaction score</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
