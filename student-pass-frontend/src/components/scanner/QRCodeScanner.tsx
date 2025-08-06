import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CameraIcon,
  StopIcon,
  PhotoIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  UserIcon,
  ClockIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { QRCodeService, QRPassData } from '../../services/qrCodeService';

interface ScanResult {
  isValid: boolean;
  data?: QRPassData;
  error?: string;
  timestamp: number;
}

interface QRCodeScannerProps {
  onScanResult: (result: ScanResult) => void;
  onAccessLog?: (passId: string, result: ScanResult) => void;
  isActive?: boolean;
  accessPoint?: string;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  onScanResult,
  onAccessLog,
  isActive = true,
  accessPoint = 'Main Entrance'
}) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: 'environment' // Use back camera on mobile
  };

  const scanQRCode = useCallback(() => {
    if (!isScanning || !webcamRef.current || !canvasRef.current) return;

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!video || !context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code && code.data) {
      // Validate QR code data
      const validationResult = QRCodeService.verifyQRData(code.data);
      
      const result: ScanResult = {
        isValid: validationResult.isValid,
        data: validationResult.data,
        error: validationResult.error,
        timestamp: Date.now()
      };

      setLastScanResult(result);
      setScanHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 scans
      setScanCount(prev => prev + 1);
      
      onScanResult(result);
      
      if (onAccessLog && result.data) {
        onAccessLog(result.data.passId, result);
      }

      // Stop scanning briefly after successful scan
      setIsScanning(false);
      setTimeout(() => {
        if (isActive) setIsScanning(true);
      }, 2000);
    }
  }, [isScanning, onScanResult, onAccessLog, isActive]);

  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(scanQRCode, 100); // Scan every 100ms
    return () => clearInterval(interval);
  }, [scanQRCode, isScanning]);

  const startScanning = () => {
    setCameraError(null);
    setIsScanning(true);
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  const handleUserMediaError = (error: string | DOMException) => {
    console.error('Camera access error:', error);
    setCameraError('Unable to access camera. Please check permissions.');
    setIsScanning(false);
  };

  const formatScanTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getResultIcon = (result: ScanResult) => {
    if (result.isValid) {
      return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
    } else {
      return <XCircleIcon className="w-6 h-6 text-red-500" />;
    }
  };

  const getResultColor = (result: ScanResult) => {
    return result.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Scanner Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">QR Code Scanner</h3>
            <p className="text-sm text-gray-500">
              {accessPoint} • {scanCount} scans today
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Camera View */}
        <div className="relative mb-6">
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
            {isScanning && !cameraError ? (
              <>
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  videoConstraints={videoConstraints}
                  onUserMediaError={handleUserMediaError}
                  className="w-full h-full object-cover"
                />
                
                {/* Scanning Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 border-2 border-dashed border-white/30 rounded-lg">
                    <motion.div
                      className="absolute top-0 left-0 right-0 h-1 bg-blue-500"
                      animate={{ y: [0, 300, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                  
                  <div className="absolute top-4 left-4 text-white">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium">Scanning...</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {cameraError ? (
                  <div className="text-center text-white">
                    <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">{cameraError}</p>
                  </div>
                ) : (
                  <div className="text-center text-white">
                    <CameraIcon className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">Camera not active</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Camera Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-2">
              {!isScanning ? (
                <button
                  onClick={startScanning}
                  disabled={!isActive}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CameraIcon className="w-5 h-5 mr-2" />
                  Start Scan
                </button>
              ) : (
                <button
                  onClick={stopScanning}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                >
                  <StopIcon className="w-5 h-5 mr-2" />
                  Stop
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hidden canvas for QR code processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Last Scan Result */}
        <AnimatePresence>
          {lastScanResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-4 rounded-lg border mb-6 ${getResultColor(lastScanResult)}`}
            >
              <div className="flex items-start space-x-3">
                {getResultIcon(lastScanResult)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">
                      {lastScanResult.isValid ? 'Access Granted' : 'Access Denied'}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {formatScanTime(lastScanResult.timestamp)}
                    </span>
                  </div>
                  
                  {lastScanResult.isValid && lastScanResult.data ? (
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                          <span>Student: {lastScanResult.data.studentId}</span>
                        </div>
                        <div className="flex items-center">
                          <ShieldCheckIcon className="w-4 h-4 mr-2 text-gray-400" />
                          <span>Type: {lastScanResult.data.passType}</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <span>Valid until: {new Date(lastScanResult.data.validTo).toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-red-600">
                      {lastScanResult.error || 'Invalid QR code'}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">Recent Scans</h4>
              <button
                onClick={() => setScanHistory([])}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear History
              </button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {scanHistory.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border text-sm ${getResultColor(result)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {result.isValid ? (
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircleIcon className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-medium">
                        {result.isValid ? 'Valid' : 'Invalid'}
                      </span>
                      {result.data && (
                        <span className="text-gray-600">
                          - {result.data.studentId}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatScanTime(result.timestamp)}
                    </span>
                  </div>
                  
                  {!result.isValid && result.error && (
                    <p className="text-xs text-red-600 mt-1">{result.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <PhotoIcon className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700">
              <p className="font-medium mb-1">Scanning Instructions</p>
              <ul className="space-y-1">
                <li>• Hold the QR code steady within the camera view</li>
                <li>• Ensure good lighting for best results</li>
                <li>• The scanner will automatically detect and validate passes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};