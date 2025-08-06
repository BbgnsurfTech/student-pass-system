import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCodeIcon,
  ClockIcon,
  ShieldCheckIcon,
  DocumentArrowDownIcon,
  ShareIcon,
  EyeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { PassDisplay } from '../../components/pass/PassDisplay';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setPasses, Pass, AccessLog } from '../../store/slices/passSlice';

export const PassPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { passes, accessLogs } = useAppSelector(state => state.passes);
  const { user } = useAppSelector(state => state.auth);
  
  const [selectedPass, setSelectedPass] = useState<Pass | null>(null);
  const [showAccessLogs, setShowAccessLogs] = useState(false);

  useEffect(() => {
    loadPasses();
  }, []);

  const loadPasses = async () => {
    try {
      // Mock API call - replace with actual API
      const mockPasses: Pass[] = [
        {
          id: 'pass-001',
          applicationId: 'app-002',
          studentId: user?.id || 'student-123',
          passType: 'PERMANENT',
          qrCode: 'mock-qr-code-data',
          isActive: true,
          validFrom: '2024-08-01T00:00:00Z',
          validTo: '2024-12-31T23:59:59Z',
          permissions: ['Main Building Access', 'Library Access', 'Lab Access'],
          usageCount: 15,
          lastUsed: '2024-08-04T14:30:00Z',
          createdAt: '2024-08-03T14:30:00Z',
          updatedAt: '2024-08-04T14:30:00Z',
        },
        {
          id: 'pass-002',
          applicationId: 'app-003',
          studentId: user?.id || 'student-123',
          passType: 'TEMPORARY',
          qrCode: 'mock-qr-code-data-2',
          isActive: true,
          validFrom: '2024-08-10T00:00:00Z',
          validTo: '2024-08-20T23:59:59Z',
          permissions: ['Medical Center Access'],
          usageCount: 3,
          lastUsed: '2024-08-12T10:15:00Z',
          createdAt: '2024-08-10T08:00:00Z',
          updatedAt: '2024-08-12T10:15:00Z',
        }
      ];
      
      dispatch(setPasses(mockPasses));
    } catch (error) {
      console.error('Failed to load passes:', error);
    }
  };

  const handleDownloadPass = (pass: Pass) => {
    // Create a download link for the pass
    const passData = {
      id: pass.id,
      studentId: pass.studentId,
      passType: pass.passType,
      validFrom: pass.validFrom,
      validTo: pass.validTo,
      qrCode: pass.qrCode
    };
    
    const dataStr = JSON.stringify(passData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `student-pass-${pass.id}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleSharePass = async (pass: Pass) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Student Pass - ${pass.passType}`,
          text: `Student Pass ID: ${pass.id}`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      const shareText = `Student Pass - ${pass.passType}\nPass ID: ${pass.id}\nValid: ${new Date(pass.validFrom).toLocaleDateString()} - ${new Date(pass.validTo).toLocaleDateString()}`;
      navigator.clipboard.writeText(shareText);
      alert('Pass details copied to clipboard!');
    }
  };

  const activePasses = passes.filter(pass => pass.isActive);
  const expiredPasses = passes.filter(pass => !pass.isActive);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPassStatusColor = (pass: Pass) => {
    if (!pass.isActive) return 'text-gray-500';
    
    const now = new Date();
    const expiry = new Date(pass.validTo);
    const daysDiff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1) return 'text-red-500';
    if (daysDiff <= 7) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Passes</h1>
          <p className="text-gray-600 mt-1">Your digital access passes with QR codes</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <QrCodeIcon className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Passes</p>
                <p className="text-2xl font-bold text-gray-900">{passes.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ShieldCheckIcon className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="text-2xl font-bold text-gray-900">{activePasses.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClockIcon className="w-8 h-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Expiring Soon</p>
                <p className="text-2xl font-bold text-gray-900">
                  {activePasses.filter(pass => {
                    const daysDiff = Math.ceil((new Date(pass.validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return daysDiff <= 7;
                  }).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Expired</p>
                <p className="text-2xl font-bold text-gray-900">{expiredPasses.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Passes */}
        {activePasses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Passes</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {activePasses.map((pass) => (
                <motion.div
                  key={pass.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative"
                >
                  <PassDisplay
                    pass={pass}
                    onShare={() => handleSharePass(pass)}
                    onDownload={() => handleDownloadPass(pass)}
                    showDetails={false}
                  />
                  
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => setSelectedPass(pass)}
                      className="p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
                      title="View Full Details"
                    >
                      <EyeIcon className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Pass List View */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">All Passes</h3>
            <button
              onClick={() => setShowAccessLogs(!showAccessLogs)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showAccessLogs ? 'Hide' : 'Show'} Access History
            </button>
          </div>
          
          <div className="divide-y divide-gray-200">
            {passes.length === 0 ? (
              <div className="p-12 text-center">
                <QrCodeIcon className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="text-gray-500 mt-2">No passes found</p>
                <p className="text-sm text-gray-400">Submit an application to get your first pass</p>
              </div>
            ) : (
              passes.map((pass) => (
                <div key={pass.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">
                          {pass.passType} Pass
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          pass.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {pass.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Pass ID:</span>
                          <p className="font-mono">{pass.id.slice(-8).toUpperCase()}</p>
                        </div>
                        <div>
                          <span className="font-medium">Valid Period:</span>
                          <p>{formatDate(pass.validFrom)} - {formatDate(pass.validTo)}</p>
                        </div>
                        <div>
                          <span className="font-medium">Usage:</span>
                          <p>{pass.usageCount} times</p>
                        </div>
                        <div>
                          <span className="font-medium">Last Used:</span>
                          <p>{pass.lastUsed ? formatDate(pass.lastUsed) : 'Never'}</p>
                        </div>
                      </div>

                      {pass.permissions && pass.permissions.length > 0 && (
                        <div className="mt-3">
                          <span className="text-sm font-medium text-gray-500">Permissions:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {pass.permissions.map((permission, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                              >
                                <ShieldCheckIcon className="w-3 h-3 mr-1" />
                                {permission}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-6">
                      <button
                        onClick={() => handleDownloadPass(pass)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Download Pass"
                      >
                        <DocumentArrowDownIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleSharePass(pass)}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title="Share Pass"
                      >
                        <ShareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setSelectedPass(pass)}
                        className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                        title="View QR Code"
                      >
                        <QrCodeIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Access Logs */}
        <AnimatePresence>
          {showAccessLogs && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 bg-white rounded-lg shadow overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Access History</h3>
              </div>
              
              <div className="p-6">
                <p className="text-gray-500 text-center">Access history feature coming soon...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pass Detail Modal */}
      <AnimatePresence>
        {selectedPass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg"
            >
              <div className="relative">
                <PassDisplay
                  pass={selectedPass}
                  onShare={() => handleSharePass(selectedPass)}
                  onDownload={() => handleDownloadPass(selectedPass)}
                  showDetails={true}
                />
                
                <button
                  onClick={() => setSelectedPass(null)}
                  className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
                >
                  <ExclamationTriangleIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PassPage;