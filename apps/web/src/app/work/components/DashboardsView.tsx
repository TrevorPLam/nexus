'use client';

import { Button } from '@life-os/ui';
import { Plus, LayoutDashboard, Edit, Trash2, BarChart3, PieChart, Clock, Users, TrendingUp } from 'lucide-react';

import type { Dashboard, DashboardWidget } from '../types-reporting';

interface DashboardsViewProps {
  dashboards: Dashboard[];
  loading: boolean;
  onNewDashboard: () => void;
  onEditDashboard: (dashboard: Dashboard) => void;
  onDeleteDashboard: (dashboardId: string) => void;
  onUseDashboard: (dashboardId: string) => void;
}

export function DashboardsView({
  dashboards,
  loading,
  onNewDashboard,
  onEditDashboard,
  onDeleteDashboard,
  onUseDashboard,
}: DashboardsViewProps) {
  const getWidgetIcon = (widget: DashboardWidget) => {
    switch (widget.type) {
      case 'task_completion':
        return TrendingUp;
      case 'project_progress':
        return BarChart3;
      case 'workload':
        return Users;
      case 'time_tracking':
        return Clock;
      case 'priority_distribution':
        return PieChart;
      case 'team_performance':
        return TrendingUp;
      default:
        return LayoutDashboard;
    }
  };

  const getWidgetCount = (dashboard: Dashboard) => dashboard.widgets.length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Dashboards</h2>
          <p className="text-gray-600 mt-1">Visualize project metrics and team performance</p>
        </div>
        <Button onPress={onNewDashboard}>
          <Plus className="w-4 h-4 mr-2" />
          New Dashboard
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading dashboards...</div>
        </div>
      ) : dashboards.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <LayoutDashboard className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No dashboards yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Create dashboards with customizable widgets to track project progress, team workload, and key metrics.
          </p>
          <Button onPress={onNewDashboard}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Dashboard
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map((dashboard) => (
            <div
              key={dashboard.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onUseDashboard(dashboard.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <LayoutDashboard className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditDashboard(dashboard);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDashboard(dashboard.id);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-2">{dashboard.name}</h3>
              {dashboard.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{dashboard.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{getWidgetCount(dashboard)} widgets</span>
                </div>
                {dashboard.isPublic && (
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>Shared</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {dashboard.widgets.slice(0, 4).map((widget) => {
                  const Icon = getWidgetIcon(widget);
                  return (
                    <div
                      key={widget.id}
                      className="p-2 bg-gray-100 rounded-md"
                      title={widget.title}
                    >
                      <Icon className="w-4 h-4 text-gray-600" />
                    </div>
                  );
                })}
                {dashboard.widgets.length > 4 && (
                  <div className="p-2 bg-gray-100 rounded-md text-xs text-gray-600">
                    +{dashboard.widgets.length - 4}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Widget Types Guide */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Widget Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-sm">Task Completion</h4>
            </div>
            <p className="text-xs text-gray-500">Track completed tasks over time with customizable grouping</p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-sm">Project Progress</h4>
            </div>
            <p className="text-xs text-gray-500">Visualize progress across multiple projects</p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-purple-600" />
              <h4 className="font-medium text-sm">Workload</h4>
            </div>
            <p className="text-xs text-gray-500">Monitor team capacity and task distribution</p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <h4 className="font-medium text-sm">Time Tracking</h4>
            </div>
            <p className="text-xs text-gray-500">Analyze time logged by user, project, or task</p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <PieChart className="w-5 h-5 text-red-600" />
              <h4 className="font-medium text-sm">Priority Distribution</h4>
            </div>
            <p className="text-xs text-gray-500">See task priority breakdown at a glance</p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h4 className="font-medium text-sm">Team Performance</h4>
            </div>
            <p className="text-xs text-gray-500">Track individual and team productivity metrics</p>
          </div>
        </div>
      </div>
    </div>
  );
}
