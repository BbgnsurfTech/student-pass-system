import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  PhotoIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { FileService, UploadedFile, FileUploadProgress } from '../../services/fileService';

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxFileSize?: number;
}

interface FileUploadState {
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  uploadedFile?: UploadedFile;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesUploaded,
  maxFiles = 5,
  acceptedTypes = ['image/*', '.pdf', '.doc', '.docx'],
  maxFileSize = 10 * 1024 * 1024 // 10MB
}) => {
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileSelection(droppedFiles);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFileSelection(selectedFiles);
    
    // Reset input value
    e.target.value = '';
  }, []);

  const handleFileSelection = useCallback((selectedFiles: File[]) => {
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newFileStates: FileUploadState[] = selectedFiles.map(file => ({
      file,
      status: 'uploading' as const,
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFileStates]);

    // Start uploading files
    selectedFiles.forEach((file, index) => {
      uploadFile(file, files.length + index);
    });
  }, [files.length, maxFiles]);

  const uploadFile = async (file: File, fileIndex: number) => {
    const validation = FileService.validateFile(file);
    
    if (!validation.isValid) {
      updateFileState(fileIndex, {
        status: 'error',
        error: validation.error,
        progress: 0,
      });
      return;
    }

    try {
      const uploadedFile = await FileService.uploadFile(
        file,
        (progress: FileUploadProgress) => {
          updateFileState(fileIndex, {
            progress: progress.percentage,
          });
        }
      );

      updateFileState(fileIndex, {
        status: 'success',
        progress: 100,
        uploadedFile,
      });

      // Update parent component with successful uploads
      updateParentFiles();
    } catch (error) {
      updateFileState(fileIndex, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
        progress: 0,
      });
    }
  };

  const updateFileState = (fileIndex: number, updates: Partial<FileUploadState>) => {
    setFiles(prev =>
      prev.map((fileState, index) =>
        index === fileIndex ? { ...fileState, ...updates } : fileState
      )
    );
  };

  const updateParentFiles = () => {
    setFiles(prev => {
      const successfulUploads = prev
        .filter(f => f.status === 'success' && f.uploadedFile)
        .map(f => f.uploadedFile!);
      
      onFilesUploaded(successfulUploads);
      return prev;
    });
  };

  const removeFile = (fileIndex: number) => {
    setFiles(prev => {
      const newFiles = prev.filter((_, index) => index !== fileIndex);
      
      // Update parent with remaining successful uploads
      const successfulUploads = newFiles
        .filter(f => f.status === 'success' && f.uploadedFile)
        .map(f => f.uploadedFile!);
      
      onFilesUploaded(successfulUploads);
      return newFiles;
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <PhotoIcon className="w-8 h-8 text-blue-500" />;
    }
    return <DocumentIcon className="w-8 h-8 text-gray-500" />;
  };

  const getStatusIcon = (status: FileUploadState['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${files.length >= maxFiles ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={files.length >= maxFiles}
        />
        
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-900">
            Drop files here or click to browse
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Supports: {acceptedTypes.join(', ')} • Max {FileService.formatFileSize(maxFileSize)} per file
          </p>
          <p className="text-xs text-gray-500">
            {files.length}/{maxFiles} files uploaded
          </p>
        </div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {files.map((fileState, index) => (
          <motion.div
            key={`${fileState.file.name}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getFileIcon(fileState.file)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileState.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {FileService.formatFileSize(fileState.file.size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {getStatusIcon(fileState.status)}
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {fileState.status === 'uploading' && (
              <div className="mt-3">
                <div className="bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-blue-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${fileState.progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Uploading... {fileState.progress}%
                </p>
              </div>
            )}

            {/* Error Message */}
            {fileState.status === 'error' && fileState.error && (
              <div className="mt-2 text-xs text-red-600 flex items-center">
                <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                {fileState.error}
              </div>
            )}

            {/* Success Message */}
            {fileState.status === 'success' && (
              <div className="mt-2 text-xs text-green-600 flex items-center">
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                Upload successful
              </div>
            )}

            {/* File Preview */}
            {fileState.file.type.startsWith('image/') && (
              <div className="mt-3">
                <img
                  src={FileService.generatePreviewUrl(fileState.file)}
                  alt={fileState.file.name}
                  className="max-w-xs max-h-32 object-contain rounded border"
                />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Upload Summary */}
      {files.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          {files.filter(f => f.status === 'success').length} of {files.length} files uploaded successfully
        </div>
      )}
    </div>
  );
};