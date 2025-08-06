import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  DocumentTextIcon,
  FunnelIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { ApplicationAnalytics } from '../../../services/analyticsService';
import LineChart from '../charts/LineChart';
import BarChart from '../charts/BarChart';
import { format, parseISO } from 'date-fns';

interface ApplicationTrendsWidgetProps {
  data: ApplicationAnalytics | null;
  loading: boolean;
  error: string | null;
  className?: string;
}

type ViewType = 'volume' | 'funnel' | 'processing' | 'departments';

export const ApplicationTrendsWidget: React.FC<ApplicationTrendsWidgetProps> = ({
  data,
  loading,
  error,
  className = ''
}) => {
  const [activeView, setActiveView] = useState<ViewType>('volume');

  const viewOptions = [
    { key: 'volume' as ViewType, label: 'Volume Trends', icon: ChartBarIcon },
    { key: 'funnel' as ViewType, label: 'Conversion Funnel', icon: FunnelIcon },
    { key: 'processing' as ViewType, label: 'Processing Times', icon: ClockIcon },
    { key: 'departments' as ViewType, label: 'By Department', icon: DocumentTextIcon },
  ];

  // Process data for different chart types
  const chartData = useMemo(() => {
    if (!data) return null;

    switch (activeView) {
      case 'volume': {
        // Application volume over time
        const volumeData = data.applicationVolume.map(item => ({
          date: format(new Date(item.appliedAt), 'MMM dd'),
          count: item._count
        }));

        return {
          labels: volumeData.map(d => d.date),
          datasets: [{
            label: 'Applications',
            data: volumeData.map(d => d.count),
            borderColor: '#3B82F6',
            backgroundColor: '#3B82F620',
            fill: true
          }]
        };
      }

      case 'funnel': {
        // Conversion funnel
        const funnelOrder = ['pending', 'under_review', 'approved', 'rejected'];
        const sortedFunnel = data.conversionFunnel
          .sort((a, b) => funnelOrder.indexOf(a.status) - funnelOrder.indexOf(b.status));

        return {
          labels: sortedFunnel.map(f => f.status.replace('_', ' ').toUpperCase()),
          datasets: [{
            label: 'Applications',
            data: sortedFunnel.map(f => f.count),
            backgroundColor: ['#FEF3C7', '#FDE68A', '#10B981', '#EF4444'],
            borderColor: ['#F59E0B', '#F59E0B', '#059669', '#DC2626'],
            borderWidth: 2
          }]
        };
      }

      case 'processing': {
        // Processing times by status
        const processingStats = data.processingTimes.reduce((acc, item) => {
          if (!acc[item.status]) {
            acc[item.status] = { total: 0, count: 0 };
          }
          acc[item.status].total += item.processingTime;
          acc[item.status].count += 1;
          return acc;
        }, {} as Record<string, { total: number; count: number }>);

        const avgProcessingTimes = Object.entries(processingStats).map(([status, stats]) => ({
          status,
          avgTime: stats.count > 0 ? Math.round(stats.total / stats.count) : 0
        }));

        return {
          labels: avgProcessingTimes.map(p => p.status.replace('_', ' ').toUpperCase()),
          datasets: [{
            label: 'Average Hours',
            data: avgProcessingTimes.map(p => p.avgTime),
            backgroundColor: '#8B5CF6',
            borderColor: '#7C3AED',
            borderWidth: 2
          }]
        };
      }

      case 'departments': {
        // Applications by department (simplified - you'd need department names)
        return {
          labels: data.departmentBreakdown.map((_, index) => `Dept ${index + 1}`),
          datasets: [{
            label: 'Applications',
            data: data.departmentBreakdown.map(d => d._count),
            backgroundColor: data.departmentBreakdown.map((_, index) => {
              const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
              return colors[index % colors.length];
            })
          }]
        };
      }

      default:
        return null;
    }
  }, [data, activeView]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!data) return null;

    const totalApplications = data.conversionFunnel.reduce((sum, f) => sum + f.count, 0);
    const approvedCount = data.conversionFunnel.find(f => f.status === 'approved')?.count || 0;
    const rejectedCount = data.conversionFunnel.find(f => f.status === 'rejected')?.count || 0;
    const pendingCount = data.conversionFunnel.find(f => f.status === 'pending')?.count || 0;

    const approvalRate = totalApplications > 0 ? (approvedCount / totalApplications) * 100 : 0;
    const rejectionRate = totalApplications > 0 ? (rejectedCount / totalApplications) * 100 : 0;

    const avgProcessingTime = data.processingTimes.length > 0
      ? data.processingTimes.reduce((sum, p) => sum + p.processingTime, 0) / data.processingTimes.length
      : 0;

    return {
      totalApplications,
      approvalRate,
      rejectionRate,
      pendingCount,
      avgProcessingTime
    };
  }, [data]);

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
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

  const renderChart = () => {
    if (!chartData) return null;

    switch (activeView) {
      case 'volume':
        return (
          <LineChart
            data={chartData}
            height={300}
            showGrid={true}
            tooltipFormatter={(value, label) => `${value.toLocaleString()} applications`}
          />
        );
      
      case 'funnel':
      case 'departments':
        return (
          <BarChart
            data={chartData}
            height={300}
            showGrid={true}
            tooltipFormatter={(value, label) => `${value.toLocaleString()} applications`}
          />
        );
      
      case 'processing':
        return (
          <BarChart
            data={chartData}
            height={300}
            showGrid={true}
            tooltipFormatter={(value, label) => `${value} hours average`}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Application Trends</h2>
          {data?.timestamp && (
            <span className="text-sm text-gray-500">
              Updated: {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* View Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {viewOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.key}
                onClick={() => setActiveView(option.key)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === option.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      {summaryStats && !loading && (
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {summaryStats.totalApplications.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {summaryStats.approvalRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {summaryStats.rejectionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {summaryStats.pendingCount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {summaryStats.avgProcessingTime.toFixed(1)}h
              </div>
              <div className="text-sm text-gray-600">Avg Time</div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <motion.div
            key={activeView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {renderChart()}
          </motion.div>
        )}
      </div>

      {/* Insights */}
      {data && !loading && (
        <div className="p-6 bg-gray-50 rounded-b-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Insights</h4>
          <div className="space-y-1 text-sm text-gray-600">
            {activeView === 'volume' && (
              <p>
                • Peak application period shows {Math.max(...(chartData?.datasets[0].data || []))} 
                applications in a single day
              </p>
            )}
            {activeView === 'funnel' && summaryStats && (
              <>
                <p>
                  • {summaryStats.approvalRate > 80 ? 'High' : summaryStats.approvalRate > 60 ? 'Moderate' : 'Low'} 
                  approval rate at {summaryStats.approvalRate.toFixed(1)}%
                </p>
                <p>
                  • {summaryStats.pendingCount} applications currently awaiting review
                </p>
              </>
            )}
            {activeView === 'processing' && summaryStats && (
              <p>
                • Average processing time of {summaryStats.avgProcessingTime.toFixed(1)} hours
                {summaryStats.avgProcessingTime > 48 && ' (consider process optimization)'}
              </p>
            )}
            {activeView === 'departments' && data.departmentBreakdown.length > 0 && (
              <p>
                • Top department accounts for {Math.max(...data.departmentBreakdown.map(d => d._count)).toLocaleString()} 
                applications
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationTrendsWidget;