import React from 'react';
import { motion } from 'framer-motion';
import { 
  UserGroupIcon, 
  DocumentTextIcon, 
  CreditCardIcon, 
  ShieldCheckIcon,
  TrendingUpIcon,
  TrendingDownIcon 
} from '@heroicons/react/24/outline';
import { KeyMetrics } from '../../../services/analyticsService';

interface KeyMetricsWidgetProps {
  data: KeyMetrics | null;
  loading: boolean;
  error: string | null;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  icon: React.ElementType;
  color: string;
  formatValue?: (value: number) => string;
  isLoading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  previousValue,
  icon: Icon,
  color,
  formatValue = (val) => val.toLocaleString(),
  isLoading = false
}) => {
  const percentageChange = previousValue && previousValue > 0 
    ? Math.round(((value - previousValue) / previousValue) * 100) 
    : 0;
  
  const isPositive = percentageChange >= 0;
  const TrendIcon = isPositive ? TrendingUpIcon : TrendingDownIcon;

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${color}`}>
        <div className="flex items-center justify-between">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 ${color}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatValue(value)}
          </p>
          {previousValue !== undefined && (
            <div className="flex items-center mt-2">
              <TrendIcon 
                className={`w-4 h-4 mr-1 ${
                  isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              />
              <span 
                className={`text-sm font-medium ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {Math.abs(percentageChange)}%
              </span>
              <span className="text-sm text-gray-500 ml-1">vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color.includes('blue') ? 'bg-blue-50' : color.includes('green') ? 'bg-green-50' : color.includes('yellow') ? 'bg-yellow-50' : 'bg-purple-50'}`}>
          <Icon 
            className={`w-8 h-8 ${
              color.includes('blue') ? 'text-blue-600' : 
              color.includes('green') ? 'text-green-600' : 
              color.includes('yellow') ? 'text-yellow-600' : 
              'text-purple-600'
            }`}
          />
        </div>
      </div>
    </motion.div>
  );
};

export const KeyMetricsWidget: React.FC<KeyMetricsWidgetProps> = ({
  data,
  loading,
  error,
  className = ''
}) => {
  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="text-red-500 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const metrics = [
    {
      title: 'Total Applications',
      value: data?.overview.totalApplications || 0,
      icon: DocumentTextIcon,
      color: 'border-l-4 border-blue-500',
      previousValue: 0 // You would calculate this from historical data
    },
    {
      title: 'Active Students',
      value: data?.overview.totalStudents || 0,
      icon: UserGroupIcon,
      color: 'border-l-4 border-green-500',
      formatValue: formatNumber
    },
    {
      title: 'Active Passes',
      value: data?.overview.totalPasses || 0,
      icon: CreditCardIcon,
      color: 'border-l-4 border-yellow-500',
      formatValue: formatNumber
    },
    {
      title: 'Access Events',
      value: data?.overview.totalAccessLogs || 0,
      icon: ShieldCheckIcon,
      color: 'border-l-4 border-purple-500',
      formatValue: formatNumber
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Key Metrics</h2>
        <div className="flex items-center text-sm text-gray-500">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'Never'}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.title}
            value={metric.value}
            previousValue={metric.previousValue}
            icon={metric.icon}
            color={metric.color}
            formatValue={metric.formatValue}
            isLoading={loading}
          />
        ))}
      </div>

      {/* Quick Insights */}
      {data && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-50 rounded-lg p-4"
        >
          <h3 className="text-sm font-medium text-gray-900 mb-2">Quick Insights</h3>
          <div className="space-y-1 text-sm text-gray-600">
            {data.overview.totalApplications > 0 && (
              <p>
                • {((data.overview.totalStudents / data.overview.totalApplications) * 100).toFixed(1)}% 
                application approval rate
              </p>
            )}
            {data.overview.totalStudents > 0 && (
              <p>
                • {(data.overview.totalPasses / data.overview.totalStudents * 100).toFixed(1)}% 
                of students have active passes
              </p>
            )}
            {data.overview.totalAccessLogs > 0 && (
              <p>
                • Average of {Math.round(data.overview.totalAccessLogs / Math.max(data.overview.totalStudents, 1))} 
                access events per student
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default KeyMetricsWidget;