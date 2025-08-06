import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCodeIcon,
  ClockIcon,
  ShieldCheckIcon,
  DocumentDuplicateIcon,
  ShareIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Pass } from '../../store/slices/passSlice';
import { QRCodeService } from '../../services/qrCodeService';

interface PassDisplayProps {
  pass: Pass;
  onShare?: () => void;
  onDownload?: () => void;
  showDetails?: boolean;
}

export const PassDisplay: React.FC<PassDisplayProps> = ({
  pass,
  onShare,
  onDownload,
  showDetails = true
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  useEffect(() => {
    // Generate QR code
    const generateQR = async () => {
      try {
        const qrData = {
          passId: pass.id,
          studentId: pass.studentId,
          passType: pass.passType,
          validFrom: pass.validFrom,
          validTo: pass.validTo,
          permissions: pass.permissions,
        };
        
        const qrCodeDataUrl = await QRCodeService.generateQRCode(qrData);
        setQrCodeUrl(qrCodeDataUrl);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    };

    generateQR();
  }, [pass]);

  useEffect(() => {
    // Update time remaining every minute
    const updateTimeRemaining = () => {
      setTimeRemaining(QRCodeService.getTimeRemaining(pass.validTo));
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000);

    return () => clearInterval(interval);
  }, [pass.validTo]);

  const getPassTypeColor = (type: Pass['passType']) => {
    switch (type) {
      case 'PERMANENT': return 'bg-green-500';
      case 'TEMPORARY': return 'bg-yellow-500';
      case 'VISITOR': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getPassTypeLabel = (type: Pass['passType']) => {
    switch (type) {
      case 'PERMANENT': return 'Permanent Pass';
      case 'TEMPORARY': return 'Temporary Pass';
      case 'VISITOR': return 'Visitor Pass';
      default: return 'Pass';
    }
  };

  const isExpired = QRCodeService.isPassExpired(pass.validTo);
  const isExpiringSoon = new Date(pass.validTo).getTime() - Date.now() < 24 * 60 * 60 * 1000; // 24 hours

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
      {/* Pass Header */}
      <div className={`${getPassTypeColor(pass.passType)} text-white p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{getPassTypeLabel(pass.passType)}</h2>
            <p className="text-white/80 text-sm">Student Pass System</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold">
              #{pass.id.slice(-6).toUpperCase()}
            </div>
            <div className="flex items-center justify-end mt-1">
              {pass.isActive ? (
                <div className="flex items-center text-green-200">
                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                  <span className="text-xs">Active</span>
                </div>
              ) : (
                <div className="flex items-center text-red-200">
                  <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                  <span className="text-xs">Inactive</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      {isExpired && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-sm text-red-700 font-medium">This pass has expired</span>
          </div>
        </div>
      )}

      {!isExpired && isExpiringSoon && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <div className="flex items-center">
            <ClockIcon className="w-5 h-5 text-yellow-500 mr-2" />
            <span className="text-sm text-yellow-700 font-medium">
              Expires soon: {timeRemaining}
            </span>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* QR Code Section */}
        <div className="text-center mb-6">
          <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-48 h-48 mx-auto"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded">
                <QrCodeIcon className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Scan this QR code for access verification
          </p>
        </div>

        {/* Pass Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Student ID:</span>
              <p className="font-medium text-gray-900">{pass.studentId}</p>
            </div>
            <div>
              <span className="text-gray-500">Pass Type:</span>
              <p className="font-medium text-gray-900">{pass.passType}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Valid From:</span>
              <p className="font-medium text-gray-900">{formatDate(pass.validFrom)}</p>
            </div>
            <div>
              <span className="text-gray-500">Valid Until:</span>
              <p className="font-medium text-gray-900">{formatDate(pass.validTo)}</p>
            </div>
          </div>

          {!isExpired && (
            <div className="text-center">
              <span className="text-sm text-gray-500">Time Remaining:</span>
              <p className="font-semibold text-lg text-gray-900">{timeRemaining}</p>
            </div>
          )}
        </div>

        {/* Expandable Details */}
        {showDetails && (
          <div className="mt-6">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <span>Pass Details</span>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <InformationCircleIcon className="w-5 h-5" />
              </motion.div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-500">Application ID:</span>
                      <p className="font-medium text-gray-900">{pass.applicationId}</p>
                    </div>
                    
                    {pass.permissions && pass.permissions.length > 0 && (
                      <div>
                        <span className="text-gray-500">Permissions:</span>
                        <ul className="mt-1 space-y-1">
                          {pass.permissions.map((permission, index) => (
                            <li key={index} className="flex items-center text-gray-700">
                              <ShieldCheckIcon className="w-4 h-4 mr-2 text-green-500" />
                              {permission}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500">Usage Count:</span>
                        <p className="font-medium text-gray-900">{pass.usageCount}</p>
                      </div>
                      {pass.lastUsed && (
                        <div>
                          <span className="text-gray-500">Last Used:</span>
                          <p className="font-medium text-gray-900">{formatDate(pass.lastUsed)}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-gray-500">Created:</span>
                      <p className="font-medium text-gray-900">{formatDate(pass.createdAt)}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex space-x-3">
          {onDownload && (
            <button
              onClick={onDownload}
              className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
              Download
            </button>
          )}
          
          {onShare && (
            <button
              onClick={onShare}
              className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              <ShareIcon className="w-4 h-4 mr-2" />
              Share
            </button>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <ShieldCheckIcon className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700">
              <p className="font-medium mb-1">Security Notice</p>
              <p>This pass is digitally signed and cannot be duplicated or modified. Keep your pass secure and do not share with unauthorized persons.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};