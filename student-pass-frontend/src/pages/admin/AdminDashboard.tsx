import React from 'react';
import { Link } from 'react-router-dom';
import {
  UsersIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useGetApplicationsQuery, useGetPassesQuery } from '../../store/api/api';

const AdminDashboard: React.FC = () => {
  const { data: applications = [], isLoading: applicationsLoading } = useGetApplicationsQuery({});
  const { data: passes = [], isLoading: passesLoading } = useGetPassesQuery({});

  const stats = [
    {
      name: 'Total Applications',
      value: applications.length,
      icon: DocumentTextIcon,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
      change: '+12%',
      changeType: 'increase',
    },
    {
      name: 'Pending Reviews',
      value: applications.filter(app => app.status === 'PENDING').length,
      icon: ClockIcon,
      color: 'text-warning-600',
      bgColor: 'bg-warning-100',
      change: '+5%',
      changeType: 'increase',
    },
    {
      name: 'Active Passes',
      value: passes.filter(pass => pass.isActive).length,
      icon: CheckCircleIcon,
      color: 'text-success-600',
      bgColor: 'bg-success-100',
      change: '+8%',
      changeType: 'increase',
    },
    {
      name: 'Total Students',
      value: new Set(applications.map(app => app.studentId)).size,
      icon: UsersIcon,
      color: 'text-secondary-600',
      bgColor: 'bg-secondary-100',
      change: '+3%',
      changeType: 'increase',
    },
  ];

  const pendingApplications = applications
    .filter(app => app.status === 'PENDING')
    .slice(0, 5);

  const recentPasses = passes
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getStatusBadge = (status: string) => {
    const baseClasses = 'badge';
    switch (status) {
      case 'APPROVED':
        return `${baseClasses} badge-success`;
      case 'PENDING':
        return `${baseClasses} badge-warning`;
      case 'REJECTED':
        return `${baseClasses} badge-error`;
      case 'EXPIRED':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} badge-info`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">
            Manage student applications and monitor system activity.
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/admin/reports"
            className="btn-outline flex items-center"
          >
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Reports
          </Link>
          <Link
            to="/admin/applications"
            className="btn-primary flex items-center"
          >
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Review Applications
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <span className={`ml-2 text-sm font-medium ${
                    stat.changeType === 'increase' ? 'text-success-600' : 'text-error-600'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Applications */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Applications
            </h2>
            <Link
              to="/admin/applications?status=pending"
              className="text-primary-600 hover:text-primary-500 text-sm font-medium"
            >
              View all
            </Link>
          </div>

          {applicationsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : pendingApplications.length > 0 ? (
            <div className="space-y-4">
              {pendingApplications.map((application) => (
                <div key={application.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">
                        {application.passType} Pass
                      </h3>
                      <span className={getStatusBadge(application.status)}>
                        {application.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Purpose: {application.purpose}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Applied: {new Date(application.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4">
                    <Link
                      to={`/admin/applications/${application.id}`}
                      className="btn-primary text-sm"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No pending applications.</p>
            </div>
          )}
        </div>

        {/* Recent Passes */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Passes</h2>
            <Link
              to="/admin/passes"
              className="text-primary-600 hover:text-primary-500 text-sm font-medium"
            >
              View all
            </Link>
          </div>

          {passesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : recentPasses.length > 0 ? (
            <div className="space-y-4">
              {recentPasses.map((pass) => (
                <div key={pass.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">
                        {pass.passType} Pass
                      </h3>
                      <span className={`badge ${pass.isActive ? 'badge-success' : 'bg-gray-100 text-gray-800'}`}>
                        {pass.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Usage: {pass.usageCount} times
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {new Date(pass.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4">
                    <Link
                      to={`/admin/passes/${pass.id}`}
                      className="btn-outline text-sm"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No passes created yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/applications"
            className="flex items-center p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <DocumentTextIcon className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Review Applications</h3>
              <p className="text-sm text-gray-600">Process pending requests</p>
            </div>
          </Link>

          <Link
            to="/admin/users"
            className="flex items-center p-4 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors"
          >
            <UsersIcon className="h-8 w-8 text-secondary-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Manage Users</h3>
              <p className="text-sm text-gray-600">Add or edit user accounts</p>
            </div>
          </Link>

          <Link
            to="/admin/reports"
            className="flex items-center p-4 bg-success-50 rounded-lg hover:bg-success-100 transition-colors"
          >
            <ChartBarIcon className="h-8 w-8 text-success-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">View Reports</h3>
              <p className="text-sm text-gray-600">Analytics and insights</p>
            </div>
          </Link>

          <Link
            to="/admin/settings"
            className="flex items-center p-4 bg-warning-50 rounded-lg hover:bg-warning-100 transition-colors"
          >
            <ClockIcon className="h-8 w-8 text-warning-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">System Settings</h3>
              <p className="text-sm text-gray-600">Configure system options</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;