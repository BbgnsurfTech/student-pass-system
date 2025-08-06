import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { 
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

// Redux
import { AppDispatch } from '../../store/store';
import {
  fetchAllAnalytics,
  setFilters,
  updateDashboardSettings,
  toggleWidget,
  selectAnalytics,
  selectKeyMetrics,
  selectApplicationAnalytics,
  selectAccessAnalytics,
  selectUserEngagement,
  selectRealTimeData,
  selectFilters,
  selectLoading,
  selectErrors,
  selectActiveAlerts,
  selectDashboardSettings,
  selectIsRealTimeConnected,
  exportReport,
  AnalyticsFilters
} from '../../store/slices/analyticsSlice';

// Services
import { analyticsService } from '../../services/analyticsService';

// Components
import KeyMetricsWidget from '../../components/analytics/widgets/KeyMetricsWidget';
import RealTimeStatusWidget from '../../components/analytics/widgets/RealTimeStatusWidget';
import ApplicationTrendsWidget from '../../components/analytics/widgets/ApplicationTrendsWidget';

// Types
interface AnalyticsDashboardProps {
  userRole?: string;
  schoolId?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  userRole = 'admin',
  schoolId
}) => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux state
  const analytics = useSelector(selectAnalytics);
  const keyMetrics = useSelector(selectKeyMetrics);
  const applicationAnalytics = useSelector(selectApplicationAnalytics);
  const accessAnalytics = useSelector(selectAccessAnalytics);
  const userEngagement = useSelector(selectUserEngagement);
  const realTimeData = useSelector(selectRealTimeData);
  const filters = useSelector(selectFilters);
  const loading = useSelector(selectLoading);
  const errors = useSelector(selectErrors);
  const activeAlerts = useSelector(selectActiveAlerts);
  const dashboardSettings = useSelector(selectDashboardSettings);
  const isRealTimeConnected = useSelector(selectIsRealTimeConnected);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Date range options
  const dateRangeOptions = analyticsService.getDateRangeOptions();

  // Initialize analytics
  useEffect(() => {
    // Set initial filters if schoolId is provided
    if (schoolId && !filters.schoolId) {
      dispatch(setFilters({ schoolId }));
    }

    // Initialize real-time connection
    analyticsService.initializeRealTime({
      userId: 'current-user-id', // You would get this from auth state
      role: userRole,
      schoolId
    });

    // Load initial data
    handleRefresh();

    // Set up auto-refresh if enabled
    let refreshInterval: NodeJS.Timeout;
    if (dashboardSettings.autoRefresh) {
      refreshInterval = setInterval(() => {
        handleRefresh(false); // Silent refresh
      }, dashboardSettings.refreshInterval * 1000);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      analyticsService.disconnect();
    };
  }, []);

  // Update filters and refetch data when filters change
  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      handleRefresh();
    }
  }, [filters]);

  // Set up real-time event listeners
  useEffect(() => {
    const handleRealTimeUpdate = (data: any) => {
      console.log('Real-time update received:', data);
      // The real-time data is handled by the Redux slice
    };

    analyticsService.onRealTimeUpdate('realtime-update', handleRealTimeUpdate);

    return () => {
      analyticsService.offRealTimeUpdate('realtime-update');
    };
  }, []);

  const handleRefresh = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setRefreshing(true);
    }

    try {
      await dispatch(fetchAllAnalytics(filters)).unwrap();
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      if (showLoading) {
        setRefreshing(false);
      }
    }
  }, [dispatch, filters]);

  const handleFilterChange = (newFilters: Partial<AnalyticsFilters>) => {
    dispatch(setFilters(newFilters));
  };

  const handleExport = async (type: 'comprehensive' | 'applications' | 'access' | 'users', format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const result = await dispatch(exportReport({ ...filters, type, format })).unwrap();
      
      if (format === 'csv' && result instanceof Blob) {
        // Create download link for CSV
        const url = URL.createObjectURL(result);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Handle JSON export
        console.log('Export completed:', result);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleToggleWidget = (widgetId: string) => {
    dispatch(toggleWidget(widgetId));
  };

  const availableWidgets = [
    { id: 'key-metrics', name: 'Key Metrics', component: KeyMetricsWidget },
    { id: 'real-time-status', name: 'Real-Time Status', component: RealTimeStatusWidget },
    { id: 'application-trends', name: 'Application Trends', component: ApplicationTrendsWidget },
    // Add more widgets as needed
  ];

  const isWidgetVisible = (widgetId: string) => {
    return dashboardSettings.selectedWidgets.includes(widgetId);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Comprehensive insights into your student pass system
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Filters Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 ${showFilters ? 'ring-2 ring-blue-500' : ''}`}
              >
                <FunnelIcon className="w-4 h-4 mr-2" />
                Filters
              </button>
              
              {/* Export Button */}
              <div className="relative">
                <button
                  onClick={() => handleExport('comprehensive', 'csv')}
                  disabled={exporting}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  {exporting ? 'Exporting...' : 'Export'}
                </button>
              </div>
              
              {/* Settings Toggle */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 ${showSettings ? 'ring-2 ring-blue-500' : ''}`}
              >
                <Cog6ToothIcon className="w-4 h-4 mr-2" />
                Settings
              </button>
              
              {/* Refresh Button */}
              <button
                onClick={() => handleRefresh()}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <svg 
                  className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
          
          {/* Alerts */}
          {activeAlerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-2"
            >
              {activeAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${
                    alert.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                    alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                    'bg-blue-50 border-blue-200 text-blue-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>{alert.title}:</strong> {alert.message}
                    </div>
                    <span className="text-xs opacity-75">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {activeAlerts.length > 3 && (
                <p className="text-sm text-gray-500 text-center">
                  And {activeAlerts.length - 3} more alerts...
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 bg-white rounded-lg shadow p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  value={filters.dateRange || '30d'}
                  onChange={(e) => handleFilterChange({ dateRange: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {dateRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {!schoolId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School
                  </label>
                  <select
                    value={filters.schoolId || ''}
                    onChange={(e) => handleFilterChange({ schoolId: e.target.value || undefined })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">All Schools</option>
                    {/* Add school options dynamically */}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={filters.departmentId || ''}
                  onChange={(e) => handleFilterChange({ departmentId: e.target.value || undefined })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All Departments</option>
                  {/* Add department options dynamically */}
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => handleFilterChange({ dateRange: '30d', schoolId: undefined, departmentId: undefined })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 bg-white rounded-lg shadow p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dashboard Settings</h3>
            
            <div className="space-y-4">
              {/* Widget Visibility */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Visible Widgets</h4>
                <div className="space-y-2">
                  {availableWidgets.map((widget) => (
                    <label key={widget.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isWidgetVisible(widget.id)}
                        onChange={() => handleToggleWidget(widget.id)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{widget.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Auto Refresh */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={dashboardSettings.autoRefresh}
                    onChange={(e) => dispatch(updateDashboardSettings({ autoRefresh: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto Refresh</span>
                </label>
                
                {dashboardSettings.autoRefresh && (
                  <div className="mt-2 ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Refresh Interval (seconds)
                    </label>
                    <select
                      value={dashboardSettings.refreshInterval}
                      onChange={(e) => dispatch(updateDashboardSettings({ refreshInterval: parseInt(e.target.value) }))}
                      className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                      <option value={15}>15</option>
                      <option value={30}>30</option>
                      <option value={60}>60</option>
                      <option value={120}>120</option>
                      <option value={300}>300</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Dashboard Widgets */}
        <div className="space-y-8">
          {/* Key Metrics */}
          {isWidgetVisible('key-metrics') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <KeyMetricsWidget
                data={keyMetrics}
                loading={loading.keyMetrics}
                error={errors.keyMetrics}
              />
            </motion.div>
          )}
          
          {/* Real-Time Status */}
          {isWidgetVisible('real-time-status') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <RealTimeStatusWidget
                data={realTimeData}
                connected={isRealTimeConnected}
              />
            </motion.div>
          )}
          
          {/* Application Trends */}
          {isWidgetVisible('application-trends') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <ApplicationTrendsWidget
                data={applicationAnalytics}
                loading={loading.applicationAnalytics}
                error={errors.applicationAnalytics}
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;