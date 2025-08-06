import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  CheckIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { BouncyButton } from '../../common/DelightfulComponents';
import type { Column } from './DataTable';

interface ExportModalProps {
  data: any[];
  columns: Column[];
  onClose: () => void;
}

type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

interface ExportOptions {
  format: ExportFormat;
  includeHeaders: boolean;
  selectedColumns: string[];
  filename: string;
}

const EXPORT_FORMATS = [
  {
    id: 'csv' as ExportFormat,
    name: 'CSV',
    description: 'Comma-separated values',
    icon: DocumentTextIcon,
    mimeType: 'text/csv',
  },
  {
    id: 'excel' as ExportFormat,
    name: 'Excel',
    description: 'Microsoft Excel format',
    icon: TableCellsIcon,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  {
    id: 'pdf' as ExportFormat,
    name: 'PDF',
    description: 'Portable Document Format',
    icon: DocumentArrowDownIcon,
    mimeType: 'application/pdf',
  },
  {
    id: 'json' as ExportFormat,
    name: 'JSON',
    description: 'JavaScript Object Notation',
    icon: DocumentTextIcon,
    mimeType: 'application/json',
  },
];

export const ExportModal: React.FC<ExportModalProps> = ({
  data,
  columns,
  onClose,
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeHeaders: true,
    selectedColumns: columns.map(col => col.id),
    filename: `export_${new Date().toISOString().split('T')[0]}`,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const updateOptions = (updates: Partial<ExportOptions>) => {
    setExportOptions(prev => ({ ...prev, ...updates }));
  };

  const toggleColumn = (columnId: string) => {
    const selectedColumns = exportOptions.selectedColumns.includes(columnId)
      ? exportOptions.selectedColumns.filter(id => id !== columnId)
      : [...exportOptions.selectedColumns, columnId];
    
    updateOptions({ selectedColumns });
  };

  const selectAllColumns = () => {
    updateOptions({ 
      selectedColumns: exportOptions.selectedColumns.length === columns.length 
        ? [] 
        : columns.map(col => col.id) 
    });
  };

  const convertToCSV = (data: any[], columns: Column[]) => {
    const selectedColumns = columns.filter(col => 
      exportOptions.selectedColumns.includes(col.id)
    );
    
    const headers = exportOptions.includeHeaders 
      ? selectedColumns.map(col => col.header).join(',')
      : '';
    
    const rows = data.map(item => 
      selectedColumns.map(col => {
        const value = typeof col.accessor === 'function'
          ? col.accessor(item)
          : item[col.accessor];
        
        // Escape CSV values
        const stringValue = value?.toString() || '';
        return stringValue.includes(',') || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      }).join(',')
    );
    
    return [headers, ...rows].filter(Boolean).join('\n');
  };

  const convertToJSON = (data: any[], columns: Column[]) => {
    const selectedColumns = columns.filter(col => 
      exportOptions.selectedColumns.includes(col.id)
    );
    
    return JSON.stringify(
      data.map(item => {
        const filteredItem: any = {};
        selectedColumns.forEach(col => {
          const value = typeof col.accessor === 'function'
            ? col.accessor(item)
            : item[col.accessor];
          filteredItem[col.header] = value;
        });
        return filteredItem;
      }),
      null,
      2
    );
  };

  const generateExcel = async (data: any[], columns: Column[]) => {
    // In a real implementation, you would use a library like xlsx
    // For now, we'll simulate with CSV format
    return convertToCSV(data, columns);
  };

  const generatePDF = async (data: any[], columns: Column[]) => {
    // In a real implementation, you would use a library like jsPDF
    // For now, we'll simulate with a simple text format
    const selectedColumns = columns.filter(col => 
      exportOptions.selectedColumns.includes(col.id)
    );
    
    let content = 'Data Export Report\n\n';
    
    if (exportOptions.includeHeaders) {
      content += selectedColumns.map(col => col.header).join(' | ') + '\n';
      content += '-'.repeat(selectedColumns.map(col => col.header).join(' | ').length) + '\n';
    }
    
    content += data.map(item => 
      selectedColumns.map(col => {
        const value = typeof col.accessor === 'function'
          ? col.accessor(item)
          : item[col.accessor];
        return value?.toString() || '';
      }).join(' | ')
    ).join('\n');
    
    return content;
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const selectedColumns = columns.filter(col => 
        exportOptions.selectedColumns.includes(col.id)
      );
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      let content: string;
      let mimeType: string;
      
      const format = EXPORT_FORMATS.find(f => f.id === exportOptions.format)!;
      
      switch (exportOptions.format) {
        case 'csv':
          content = convertToCSV(data, selectedColumns);
          break;
        case 'json':
          content = convertToJSON(data, selectedColumns);
          break;
        case 'excel':
          content = await generateExcel(data, selectedColumns);
          break;
        case 'pdf':
          content = await generatePDF(data, selectedColumns);
          break;
        default:
          content = convertToCSV(data, selectedColumns);
      }
      
      clearInterval(progressInterval);
      setExportProgress(100);
      
      // Create and download file
      const blob = new Blob([content], { type: format.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${exportOptions.filename}.${exportOptions.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <Transition appear show={true} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <ArrowDownTrayIcon className="h-6 w-6 text-primary-600" />
                      <div>
                        <Dialog.Title className="text-lg font-medium text-gray-900">
                          Export Data
                        </Dialog.Title>
                        <p className="text-sm text-gray-600">
                          {data.length} records ready for export
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-100"
                      disabled={isExporting}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="px-6 py-6 space-y-6">
                  {/* Export Format Selection */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                      Export Format
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {EXPORT_FORMATS.map((format) => (
                        <motion.button
                          key={format.id}
                          onClick={() => updateOptions({ format: format.id })}
                          className={`p-4 border-2 rounded-lg text-left transition-all ${
                            exportOptions.format === format.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={isExporting}
                        >
                          <div className="flex items-start space-x-3">
                            <format.icon className={`h-5 w-5 mt-0.5 ${
                              exportOptions.format === format.id
                                ? 'text-primary-600'
                                : 'text-gray-600'
                            }`} />
                            <div>
                              <p className="font-medium text-gray-900">
                                {format.name}
                              </p>
                              <p className="text-xs text-gray-600">
                                {format.description}
                              </p>
                            </div>
                            {exportOptions.format === format.id && (
                              <CheckIcon className="h-4 w-4 text-primary-600 ml-auto" />
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Filename Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Filename
                    </label>
                    <input
                      type="text"
                      value={exportOptions.filename}
                      onChange={(e) => updateOptions({ filename: e.target.value })}
                      disabled={isExporting}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                      placeholder="Enter filename..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      File extension will be added automatically
                    </p>
                  </div>

                  {/* Column Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-900">
                        Columns to Export
                      </h3>
                      <button
                        onClick={selectAllColumns}
                        disabled={isExporting}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {exportOptions.selectedColumns.length === columns.length 
                          ? 'Deselect All' 
                          : 'Select All'}
                      </button>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                      {columns.map((column, index) => (
                        <motion.div
                          key={column.id}
                          className={`flex items-center p-3 border-b border-gray-100 last:border-b-0 ${
                            exportOptions.selectedColumns.includes(column.id)
                              ? 'bg-primary-50'
                              : 'hover:bg-gray-50'
                          }`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <input
                            type="checkbox"
                            checked={exportOptions.selectedColumns.includes(column.id)}
                            onChange={() => toggleColumn(column.id)}
                            disabled={isExporting}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-3"
                          />
                          <span className="text-sm text-gray-900 font-medium">
                            {column.header}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">
                      {exportOptions.selectedColumns.length} of {columns.length} columns selected
                    </p>
                  </div>

                  {/* Export Options */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      Export Options
                    </h3>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeHeaders}
                        onChange={(e) => updateOptions({ includeHeaders: e.target.checked })}
                        disabled={isExporting}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-sm text-gray-900">
                        Include column headers
                      </span>
                    </label>
                  </div>

                  {/* Export Progress */}
                  {isExporting && (
                    <motion.div
                      className="space-y-3"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Exporting...</span>
                        <span className="text-sm text-gray-900 font-medium">
                          {exportProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          className="bg-primary-600 h-2 rounded-full"
                          initial={{ width: '0%' }}
                          animate={{ width: `${exportProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                  <BouncyButton
                    onClick={onClose}
                    disabled={isExporting}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </BouncyButton>
                  <BouncyButton
                    onClick={handleExport}
                    disabled={isExporting || exportOptions.selectedColumns.length === 0}
                    className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                  >
                    {isExporting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        <span>Export {data.length} Records</span>
                      </>
                    )}
                  </BouncyButton>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};