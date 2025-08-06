import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheckIcon,
  QrCodeIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { QRCodeScanner } from '../../components/scanner/QRCodeScanner';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addAccessLog, AccessLog } from '../../store/slices/passSlice';
import { QRPassData } from '../../services/qrCodeService';

interface ScanResult {
  isValid: boolean;
  data?: QRPassData;
  error?: string;
  timestamp: number;
}

interface AccessStats {
  totalScans: number;
  validScans: number;
  invalidScans: number;
  todayScans: number;
}

export const ScannerPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { accessLogs } = useAppSelector(state => state.passes);
  
  const [recentScans, setRecentScans] = useState<(ScanResult & { id: string })[]>([]);
  const [stats, setStats] = useState<AccessStats>({
    totalScans: 0,
    validScans: 0,
    invalidScans: 0,
    todayScans: 0
  });
  
  const [currentAccessPoint] = useState('Main Entrance');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadAccessLogs();
    updateStats();
  }, [recentScans]);

  const loadAccessLogs = () => {
    // Mock access logs - in real app, load from API
    const mockLogs: AccessLog[] = [
      {
        id: 'log-001',
        passId: 'pass-001',
        studentId: 'student-123',
        accessPoint: 'Main Entrance',
        accessType: 'ENTRY',
        timestamp: '2024-08-05T08:30:00Z',
        status: 'GRANTED',
      },
      {
        id: 'log-002',
        passId: 'pass-002',
        studentId: 'student-456',
        accessPoint: 'Main Entrance',
        accessType: 'ENTRY',
        timestamp: '2024-08-05T09:15:00Z',
        status: 'GRANTED',
      },
      {
        id: 'log-003',
        passId: 'unknown',
        studentId: 'unknown',
        accessPoint: 'Main Entrance',
        accessType: 'ENTRY',
        timestamp: '2024-08-05T10:45:00Z',
        status: 'DENIED',
        reason: 'Invalid QR code',
      }
    ];
    
    // This would normally be dispatched from an API call
    // dispatch(setAccessLogs(mockLogs));
  };

  const updateStats = () => {
    const today = new Date().toDateString();
    const todayScans = recentScans.filter(scan => 
      new Date(scan.timestamp).toDateString() === today
    );
    
    setStats({
      totalScans: recentScans.length,
      validScans: recentScans.filter(scan => scan.isValid).length,
      invalidScans: recentScans.filter(scan => !scan.isValid).length,
      todayScans: todayScans.length
    });
  };

  const handleScanResult = (result: ScanResult) => {
    const scanWithId = {
      ...result,
      id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    setRecentScans(prev => [scanWithId, ...prev.slice(0, 49)]); // Keep last 50 scans

    // Create access log
    if (result.data) {
      const accessLog: AccessLog = {
        id: `log-${Date.now()}`,
        passId: result.data.passId,
        studentId: result.data.studentId,
        accessPoint: currentAccessPoint,
        accessType: 'ENTRY',
        timestamp: new Date(result.timestamp).toISOString(),
        status: result.isValid ? 'GRANTED' : 'DENIED',
        reason: result.error,
      };

      dispatch(addAccessLog(accessLog));
    }
  };

  const handleAccessLog = (passId: string, result: ScanResult) => {
    console.log(`Access ${result.isValid ? 'granted' : 'denied'} for pass ${passId}`);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (isValid: boolean) => {
    return isValid ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  };

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? 
      <CheckCircleIcon className="w-5 h-5 text-green-500" /> : 
      <XCircleIcon className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Security Scanner</h1>
              <p className="text-gray-600 mt-1">QR Code access control system</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Access Point</p>
                <p className="font-semibold text-gray-900">{currentAccessPoint}</p>
              </div>
              
              <button
                onClick={() => setIsActive(!isActive)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                {isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <QrCodeIcon className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Scans</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalScans}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Valid Access</p>
                <p className="text-2xl font-bold text-gray-900">{stats.validScans}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <XCircleIcon className="w-8 h-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Denied Access</p>
                <p className="text-2xl font-bold text-gray-900">{stats.invalidScans}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClockIcon className="w-8 h-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Today's Scans</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayScans}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Scanner */}
          <div className="lg:col-span-2">
            <QRCodeScanner
              onScanResult={handleScanResult}
              onAccessLog={handleAccessLog}
              isActive={isActive}
              accessPoint={currentAccessPoint}
            />
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <ChartBarIcon className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {recentScans.length === 0 ? (
                <div className="p-6 text-center">
                  <QrCodeIcon className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-gray-500 mt-2">No scans yet</p>
                  <p className="text-sm text-gray-400">Start scanning to see activity</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  <AnimatePresence>
                    {recentScans.map((scan) => (
                      <motion.div
                        key={scan.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start space-x-3">
                          {getStatusIcon(scan.isValid)}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-medium ${
                                scan.isValid ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {scan.isValid ? 'Access Granted' : 'Access Denied'}
                              </p>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">{formatTime(scan.timestamp)}</p>
                                <p className="text-xs text-gray-400">{formatDate(scan.timestamp)}</p>
                              </div>
                            </div>
                            
                            {scan.data && (
                              <div className="mt-1 space-y-1">
                                <div className="flex items-center text-xs text-gray-600">
                                  <UserIcon className="w-3 h-3 mr-1" />
                                  <span>Student: {scan.data.studentId}</span>
                                </div>
                                <div className="flex items-center text-xs text-gray-600">
                                  <ShieldCheckIcon className="w-3 h-3 mr-1" />
                                  <span>Type: {scan.data.passType}</span>
                                </div>
                              </div>
                            )}
                            
                            {scan.error && (
                              <div className="mt-1 flex items-center text-xs text-red-600">
                                <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                                <span>{scan.error}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Access Logs Table */}
        <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Access Logs</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pass ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Access Point
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accessLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No access logs available
                    </td>
                  </tr>
                ) : (
                  accessLogs.slice(0, 10).map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {log.studentId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                        {log.passId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.accessPoint}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.status === 'GRANTED' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.reason || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScannerPage;