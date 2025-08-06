import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
  EllipsisHorizontalIcon,
  PhotoIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Menu } from '@headlessui/react';
import { BouncyButton } from '../../common/DelightfulComponents';

export interface WidgetData {
  id: string;
  title: string;
  value: number | string;
  previousValue?: number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  format?: 'number' | 'currency' | 'percentage';
  description?: string;
  trend?: Array<{ label: string; value: number }>;
  status?: 'success' | 'warning' | 'error' | 'info';
}

interface DashboardWidgetProps {
  data: WidgetData;
  loading?: boolean;
  showTrend?: boolean;
  showMenu?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onRefresh?: () => void;
  onDrillDown?: () => void;
  onExport?: (format: 'png' | 'pdf' | 'csv') => void;
  className?: string;
  children?: React.ReactNode;
}

const formatValue = (value: number | string, format?: string): string => {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    case 'percentage':
      return `${value}%`;
    case 'number':
    default:
      return new Intl.NumberFormat('en-US').format(value);
  }
};

const getSizeClasses = (size: string) => {
  switch (size) {
    case 'sm':
      return 'p-4';
    case 'lg':
      return 'p-8';
    case 'md':
    default:
      return 'p-6';
  }
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'success':
      return 'border-green-200 bg-green-50';
    case 'warning':
      return 'border-yellow-200 bg-yellow-50';
    case 'error':
      return 'border-red-200 bg-red-50';
    case 'info':
      return 'border-blue-200 bg-blue-50';
    default:
      return 'border-gray-200 bg-white';
  }
};

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  data,
  loading = false,
  showTrend = false,
  showMenu = true,
  size = 'md',
  onRefresh,
  onDrillDown,
  onExport,
  className = '',
  children,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const exportAsImage = async (format: 'png' | 'pdf' | 'csv') => {
    if (onExport) {
      await onExport(format);
    }
    // In a real implementation, you would use html2canvas or similar
  };

  const renderTrendChart = () => {
    if (!data.trend || data.trend.length === 0) return null;
    
    const maxValue = Math.max(...data.trend.map(point => point.value));
    const minValue = Math.min(...data.trend.map(point => point.value));
    const range = maxValue - minValue || 1;
    
    return (
      <div className="mt-4 h-16">
        <svg className="w-full h-full" viewBox="0 0 200 64">
          <defs>
            <linearGradient id={`gradient-${data.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={data.changeType === 'increase' ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={data.changeType === 'increase' ? '#10b981' : '#ef4444'} stopOpacity="0" />
            </linearGradient>
          </defs>
          
          <path
            d={`M 0,${64 - ((data.trend[0].value - minValue) / range) * 64} ${data.trend
              .map((point, index) => {
                const x = (index / (data.trend!.length - 1)) * 200;
                const y = 64 - ((point.value - minValue) / range) * 64;
                return `L ${x},${y}`;
              })
              .join(' ')} L 200,64 L 0,64 Z`}
            fill={`url(#gradient-${data.id})`}
          />
          
          <path
            d={`M 0,${64 - ((data.trend[0].value - minValue) / range) * 64} ${data.trend
              .map((point, index) => {
                const x = (index / (data.trend!.length - 1)) * 200;
                const y = 64 - ((point.value - minValue) / range) * 64;
                return `L ${x},${y}`;
              })
              .join(' ')}`}
            fill="none"
            stroke={data.changeType === 'increase' ? '#10b981' : '#ef4444'}
            strokeWidth="2"
          />
          
          {data.trend.map((point, index) => {
            const x = (index / (data.trend!.length - 1)) * 200;
            const y = 64 - ((point.value - minValue) / range) * 64;
            return (
              <motion.circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill={data.changeType === 'increase' ? '#10b981' : '#ef4444'}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              />
            );
          })}
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <motion.div
        className={`rounded-lg border border-gray-200 ${getSizeClasses(size)} ${className}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-4"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          {showTrend && <div className="h-16 bg-gray-200 rounded mt-4"></div>}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={widgetRef}
      className={`rounded-lg border ${getStatusColor(data.status)} ${getSizeClasses(
        size
      )} ${className} hover:shadow-lg transition-all duration-200 relative overflow-hidden`}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="h-5 w-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">{data.title}</h3>
          {data.description && (
            <div className="group relative">
              <InformationCircleIcon className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                  {data.description}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {showMenu && (
          <Menu as="div" className="relative">
            <Menu.Button as={motion.button} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <EllipsisHorizontalIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </Menu.Button>

            <Menu.Items className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
              <div className="p-1">
                {onRefresh && (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className={`${
                          active ? 'bg-gray-50' : ''
                        } group flex items-center w-full px-3 py-2 text-sm text-gray-700 rounded-md`}
                      >
                        <ArrowPathIcon className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    )}
                  </Menu.Item>
                )}

                {onDrillDown && (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={onDrillDown}
                        className={`${
                          active ? 'bg-gray-50' : ''
                        } group flex items-center w-full px-3 py-2 text-sm text-gray-700 rounded-md`}
                      >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                        View Details
                      </button>
                    )}
                  </Menu.Item>
                )}

                {onExport && (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => exportAsImage('png')}
                        className={`${
                          active ? 'bg-gray-50' : ''
                        } group flex items-center w-full px-3 py-2 text-sm text-gray-700 rounded-md`}
                      >
                        <PhotoIcon className="h-4 w-4 mr-2" />
                        Export Image
                      </button>
                    )}
                  </Menu.Item>
                )}
              </div>
            </Menu.Items>
          </Menu>
        )}
      </div>

      {/* Value */}
      <motion.div
        className="mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="text-2xl font-bold text-gray-900">
          {formatValue(data.value, data.format)}
        </div>
      </motion.div>

      {/* Change Indicator */}
      {data.change !== undefined && (
        <motion.div
          className="flex items-center space-x-1 mb-3"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {data.changeType === 'increase' ? (
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
          ) : data.changeType === 'decrease' ? (
            <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
          ) : null}
          
          <span
            className={`text-sm font-medium ${
              data.changeType === 'increase'
                ? 'text-green-600'
                : data.changeType === 'decrease'
                ? 'text-red-600'
                : 'text-gray-600'
            }`}
          >
            {data.change > 0 ? '+' : ''}{data.change}%
          </span>
          
          {data.previousValue !== undefined && (
            <span className="text-xs text-gray-500">
              from {formatValue(data.previousValue, data.format)}
            </span>
          )}
        </motion.div>
      )}

      {/* Trend Chart */}
      <AnimatePresence>
        {showTrend && data.trend && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: 0.3 }}
          >
            {renderTrendChart()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Content */}
      {children && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {children}
        </motion.div>
      )}

      {/* Loading Overlay */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center space-x-2">
              <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full" />
              <span className="text-sm text-gray-600">Updating...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};