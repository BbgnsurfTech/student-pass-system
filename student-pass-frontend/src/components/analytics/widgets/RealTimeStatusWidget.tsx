import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { RealTimeData } from '../../../services/analyticsService';

interface RealTimeStatusWidgetProps {
  data: RealTimeData | null;
  connected: boolean;
  className?: string;
}

interface StatusIndicatorProps {
  status: 'online' | 'warning' | 'error' | 'offline';
  label: string;
  count?: number;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, label, count }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          color: 'bg-green-500',
          textColor: 'text-green-700',
          icon: CheckCircleIcon,
          pulse: true
        };
      case 'warning':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-700',
          icon: ExclamationTriangleIcon,
          pulse: true
        };
      case 'error':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          icon: XCircleIcon,
          pulse: true
        };
      default:
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          icon: XCircleIcon,
          pulse: false
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center space-x-3">
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${config.color}`}>
          {config.pulse && (
            <div className={`absolute inset-0 w-3 h-3 rounded-full ${config.color} animate-ping opacity-75`}></div>
          )}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${config.textColor}`}>{label}</span>
          {count !== undefined && (
            <span className="text-sm font-semibold text-gray-900">{count.toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
};

interface AlertItemProps {
  alert: RealTimeData['alerts'][0];
  onDismiss?: (alertId: string) => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert, onDismiss }) => {
  const getPriorityColor = () => {
    switch (alert.priority) {
      case 'high':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  const getTypeIcon = () => {
    switch (alert.type) {
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <CheckCircleIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`border rounded-lg p-3 ${getPriorityColor()}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {getTypeIcon()}
          <div className="flex-1">
            <h4 className="text-sm font-medium">{alert.title}</h4>
            <p className="text-sm mt-1">{alert.message}</p>
            <p className="text-xs mt-1 opacity-75">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(alert.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
};

export const RealTimeStatusWidget: React.FC<RealTimeStatusWidgetProps> = ({
  data,
  connected,
  className = ''
}) => {
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  useEffect(() => {
    if (data) {
      setLastUpdateTime(new Date());
    }
  }, [data]);

  const getConnectionStatus = (): 'online' | 'warning' | 'error' | 'offline' => {
    if (!connected) return 'offline';
    if (!data) return 'warning';
    
    const lastUpdate = lastUpdateTime ? new Date() : null;
    const dataTime = data.timestamp ? new Date(data.timestamp) : null;
    
    if (lastUpdate && dataTime) {
      const diffInMinutes = (lastUpdate.getTime() - dataTime.getTime()) / (1000 * 60);
      if (diffInMinutes > 5) return 'warning';
    }
    
    return 'online';
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SignalIcon className="w-6 h-6 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Real-Time Status</h2>
          </div>
          <div className="flex items-center space-x-2">
            <StatusIndicator 
              status={connectionStatus} 
              label={connected ? 'Connected' : 'Disconnected'} 
            />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Live Metrics */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Live Activity</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <UserGroupIcon className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-900">
                    {data?.metrics.activeUsers || 0}
                  </p>
                  <p className="text-sm text-blue-700">Active Users</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-900">
                    {data?.metrics.recentApplications || 0}
                  </p>
                  <p className="text-sm text-green-700">New Applications</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <ShieldCheckIcon className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-900">
                    {data?.metrics.recentAccessAttempts || 0}
                  </p>
                  <p className="text-sm text-purple-700">Access Attempts</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Queue Status */}
        {data?.queue && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Processing Queue</h3>
            <div className="space-y-2">
              <StatusIndicator 
                status={data.queue.pending > 100 ? 'warning' : 'online'} 
                label="Pending Applications" 
                count={data.queue.pending} 
              />
              <StatusIndicator 
                status="online" 
                label="Under Review" 
                count={data.queue.underReview} 
              />
              <div className="bg-gray-50 rounded p-3">
                <div className="flex justify-between text-sm">
                  <span>Queue Health</span>
                  <span className={`font-medium ${
                    data.queue.total < 50 ? 'text-green-600' : 
                    data.queue.total < 100 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {data.queue.total < 50 ? 'Good' : 
                     data.queue.total < 100 ? 'Moderate' : 'High Load'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${
                      data.queue.total < 50 ? 'bg-green-500' : 
                      data.queue.total < 100 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((data.queue.total / 150) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Alerts */}
        {data?.alerts && data.alerts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Active Alerts</h3>
              <span className="text-xs text-gray-500">
                {data.alerts.length} alert{data.alerts.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        )}

        {/* Last Update Info */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-4 h-4" />
              <span>
                Last updated: {lastUpdateTime ? lastUpdateTime.toLocaleTimeString() : 'Never'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span>{connected ? 'Live' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeStatusWidget;