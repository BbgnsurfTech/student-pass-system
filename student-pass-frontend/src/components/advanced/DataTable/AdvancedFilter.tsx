import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  TrashIcon, 
  XMarkIcon,
  CheckIcon 
} from '@heroicons/react/24/outline';
import { BouncyButton } from '../../common/DelightfulComponents';
import type { Column, FilterConfig } from './DataTable';

interface AdvancedFilterProps {
  columns: Column[];
  filters: FilterConfig[];
  onApplyFilters: (filters: FilterConfig[]) => void;
  onClose: () => void;
}

const OPERATORS = [
  { value: 'equals', label: 'Equals', supportedTypes: ['string', 'number', 'date'] },
  { value: 'contains', label: 'Contains', supportedTypes: ['string'] },
  { value: 'startsWith', label: 'Starts with', supportedTypes: ['string'] },
  { value: 'endsWith', label: 'Ends with', supportedTypes: ['string'] },
  { value: 'gt', label: 'Greater than', supportedTypes: ['number', 'date'] },
  { value: 'lt', label: 'Less than', supportedTypes: ['number', 'date'] },
  { value: 'between', label: 'Between', supportedTypes: ['number', 'date'] },
] as const;

export const AdvancedFilter: React.FC<AdvancedFilterProps> = ({
  columns,
  filters,
  onApplyFilters,
  onClose,
}) => {
  const [localFilters, setLocalFilters] = useState<FilterConfig[]>(
    filters.length > 0 ? filters : [{ column: '', operator: 'equals', value: '' }]
  );

  const addFilter = () => {
    setLocalFilters([
      ...localFilters,
      { column: '', operator: 'equals', value: '' }
    ]);
  };

  const removeFilter = (index: number) => {
    setLocalFilters(localFilters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<FilterConfig>) => {
    const updated = localFilters.map((filter, i) => 
      i === index ? { ...filter, ...updates } : filter
    );
    setLocalFilters(updated);
  };

  const handleApply = () => {
    const validFilters = localFilters.filter(
      filter => filter.column && filter.value !== ''
    );
    onApplyFilters(validFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters([{ column: '', operator: 'equals', value: '' }]);
    onApplyFilters([]);
  };

  const getColumnType = (columnId: string): string => {
    const column = columns.find(col => col.id === columnId);
    // This is a simplified type detection - in real implementation,
    // you might want to pass column types explicitly
    return 'string'; // Default to string for now
  };

  const getAvailableOperators = (columnId: string) => {
    const columnType = getColumnType(columnId);
    return OPERATORS.filter(op => op.supportedTypes.includes(columnType));
  };

  return (
    <motion.div
      className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-4"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Advanced Filters</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {localFilters.map((filter, index) => (
            <motion.div
              key={index}
              className="flex items-center space-x-4 bg-white p-4 rounded-lg border border-gray-200"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Column Selection */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Column
                </label>
                <select
                  value={filter.column}
                  onChange={(e) => updateFilter(index, { 
                    column: e.target.value,
                    operator: 'equals',
                    value: ''
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select column...</option>
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.header}
                    </option>
                  ))}
                </select>
              </div>

              {/* Operator Selection */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operator
                </label>
                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(index, { 
                    operator: e.target.value as FilterConfig['operator'],
                    value: '',
                    values: undefined
                  })}
                  disabled={!filter.column}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                >
                  {getAvailableOperators(filter.column).map((operator) => (
                    <option key={operator.value} value={operator.value}>
                      {operator.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Value Input */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value
                </label>
                {filter.operator === 'between' ? (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="From"
                      value={filter.values?.[0] || ''}
                      onChange={(e) => updateFilter(index, {
                        values: [e.target.value, filter.values?.[1] || '']
                      })}
                      disabled={!filter.column}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                    />
                    <input
                      type="text"
                      placeholder="To"
                      value={filter.values?.[1] || ''}
                      onChange={(e) => updateFilter(index, {
                        values: [filter.values?.[0] || '', e.target.value]
                      })}
                      disabled={!filter.column}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter value..."
                    value={filter.value}
                    onChange={(e) => updateFilter(index, { value: e.target.value })}
                    disabled={!filter.column}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                  />
                )}
              </div>

              {/* Remove Filter Button */}
              {localFilters.length > 1 && (
                <motion.button
                  onClick={() => removeFilter(index)}
                  className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <TrashIcon className="h-5 w-5" />
                </motion.button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add Filter Button */}
        <motion.button
          onClick={addFilter}
          className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Filter</span>
        </motion.button>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <motion.button
            onClick={handleClear}
            className="text-gray-600 hover:text-gray-800 font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Clear All
          </motion.button>

          <div className="flex space-x-3">
            <BouncyButton
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </BouncyButton>
            <BouncyButton
              onClick={handleApply}
              className="btn-primary flex items-center space-x-2"
            >
              <CheckIcon className="h-4 w-4" />
              <span>Apply Filters</span>
            </BouncyButton>
          </div>
        </div>
      </div>

      {/* Filter Preview */}
      {localFilters.some(f => f.column && f.value) && (
        <motion.div
          className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <p className="text-sm text-blue-800 font-medium mb-2">Filter Preview:</p>
          <div className="text-xs text-blue-600 space-y-1">
            {localFilters
              .filter(f => f.column && f.value)
              .map((filter, index) => {
                const column = columns.find(c => c.id === filter.column);
                const operator = OPERATORS.find(op => op.value === filter.operator);
                
                return (
                  <div key={index}>
                    <strong>{column?.header}</strong> {operator?.label.toLowerCase()} 
                    {filter.operator === 'between' 
                      ? ` ${filter.values?.[0]} and ${filter.values?.[1]}`
                      : ` "${filter.value}"`
                    }
                  </div>
                );
              })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};