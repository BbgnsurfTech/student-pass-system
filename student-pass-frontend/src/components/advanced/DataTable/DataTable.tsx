import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  ListBulletIcon,
  EllipsisHorizontalIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Menu } from '@headlessui/react';
import { BouncyButton } from '../../common/DelightfulComponents';
import { AdvancedFilter } from './AdvancedFilter';
import { BulkActions } from './BulkActions';
import { ExportModal } from './ExportModal';
import debounce from 'lodash.debounce';

export interface Column<T = any> {
  id: string;
  header: string;
  accessor: keyof T | ((item: T) => any);
  sortable?: boolean;
  filterable?: boolean;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  cell?: (props: { value: any; item: T; index: number }) => React.ReactNode;
  headerCell?: () => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export interface SortConfig<T> {
  key: keyof T | null;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  column: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'between';
  value: any;
  values?: any[]; // For between operator
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pageSize?: number;
  virtualScrolling?: boolean;
  selectable?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  bulkActions?: Array<{
    id: string;
    label: string;
    icon?: React.ElementType;
    action: (selectedItems: T[]) => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
  onRowClick?: (item: T, index: number) => void;
  onSort?: (sortConfig: SortConfig<T>) => void;
  onFilter?: (filters: FilterConfig[]) => void;
  onSearch?: (query: string) => void;
  rowHeight?: number;
  className?: string;
  emptyState?: {
    title: string;
    description: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  pageSize = 50,
  virtualScrolling = true,
  selectable = false,
  searchable = true,
  filterable = true,
  exportable = true,
  bulkActions = [],
  onRowClick,
  onSort,
  onFilter,
  onSearch,
  rowHeight = 60,
  className = '',
  emptyState,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  const tableRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearch?.(query);
    }, 300),
    [onSearch]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchQuery && !onSearch) {
      result = result.filter(item =>
        columns.some(column => {
          const value = typeof column.accessor === 'function' 
            ? column.accessor(item)
            : item[column.accessor];
          return value?.toString().toLowerCase().includes(searchQuery.toLowerCase());
        })
      );
    }

    // Apply filters
    if (filters.length > 0 && !onFilter) {
      result = result.filter(item => {
        return filters.every(filter => {
          const column = columns.find(col => col.id === filter.column);
          if (!column) return true;
          
          const value = typeof column.accessor === 'function'
            ? column.accessor(item)
            : item[column.accessor];

          switch (filter.operator) {
            case 'equals':
              return value === filter.value;
            case 'contains':
              return value?.toString().toLowerCase().includes(filter.value.toLowerCase());
            case 'startsWith':
              return value?.toString().toLowerCase().startsWith(filter.value.toLowerCase());
            case 'endsWith':
              return value?.toString().toLowerCase().endsWith(filter.value.toLowerCase());
            case 'gt':
              return Number(value) > Number(filter.value);
            case 'lt':
              return Number(value) < Number(filter.value);
            case 'between':
              return Number(value) >= Number(filter.values?.[0]) && 
                     Number(value) <= Number(filter.values?.[1]);
            default:
              return true;
          }
        });
      });
    }

    // Apply sorting
    if (sortConfig.key && !onSort) {
      result.sort((a, b) => {
        const column = columns.find(col => col.id === sortConfig.key);
        if (!column) return 0;

        const aValue = typeof column.accessor === 'function'
          ? column.accessor(a)
          : a[column.accessor];
        const bValue = typeof column.accessor === 'function'
          ? column.accessor(b)
          : b[column.accessor];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, filters, sortConfig, columns, onSearch, onFilter, onSort]);

  // Virtualization
  const virtualizer = useVirtualizer({
    count: processedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    enabled: virtualScrolling && processedData.length > 100,
  });

  const handleSort = (columnId: string) => {
    const newSortConfig: SortConfig<T> = {
      key: columnId as keyof T,
      direction: sortConfig.key === columnId && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    };
    setSortConfig(newSortConfig);
    onSort?.(newSortConfig);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === processedData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(processedData.map((_, index) => index)));
    }
  };

  const handleSelectItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleApplyFilters = (newFilters: FilterConfig[]) => {
    setFilters(newFilters);
    onFilter?.(newFilters);
  };

  const selectedData = Array.from(selectedItems).map(index => processedData[index]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (processedData.length === 0 && emptyState) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyState.title}</h3>
        <p className="text-gray-600 mb-6">{emptyState.description}</p>
        {emptyState.action && (
          <BouncyButton
            onClick={emptyState.action.onClick}
            className="btn-primary"
          >
            {emptyState.action.label}
          </BouncyButton>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {searchable && (
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            )}
            
            {filterable && (
              <BouncyButton
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 border rounded-lg ${
                  showFilters || filters.length > 0
                    ? 'border-primary-500 text-primary-600 bg-primary-50'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FunnelIcon className="h-4 w-4" />
                <span>Filter</span>
                {filters.length > 0 && (
                  <span className="bg-primary-500 text-white text-xs rounded-full px-2 py-0.5">
                    {filters.length}
                  </span>
                )}
              </BouncyButton>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 ${
                  viewMode === 'table'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${
                  viewMode === 'grid'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
            </div>

            {exportable && (
              <BouncyButton
                onClick={() => setShowExportModal(true)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Export</span>
              </BouncyButton>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <AdvancedFilter
                columns={columns.filter(col => col.filterable)}
                filters={filters}
                onApplyFilters={handleApplyFilters}
                onClose={() => setShowFilters(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk Actions */}
        {selectable && selectedItems.size > 0 && (
          <BulkActions
            selectedCount={selectedItems.size}
            totalCount={processedData.length}
            actions={bulkActions}
            selectedData={selectedData}
            onDeselectAll={() => setSelectedItems(new Set())}
          />
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        {virtualScrolling && processedData.length > 100 ? (
          <div ref={parentRef} className="h-96 overflow-auto">
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const item = processedData[virtualRow.index];
                return (
                  <motion.div
                    key={virtualRow.index}
                    className={`absolute top-0 left-0 w-full flex items-center px-6 py-4 border-b border-gray-100 hover:bg-gray-50 ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => onRowClick?.(item, virtualRow.index)}
                    whileHover={{ backgroundColor: '#f9fafb' }}
                  >
                    {selectable && (
                      <div className="mr-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(virtualRow.index)}
                          onChange={() => handleSelectItem(virtualRow.index)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </div>
                    )}
                    
                    {columns.map((column) => {
                      const value = typeof column.accessor === 'function'
                        ? column.accessor(item)
                        : item[column.accessor];
                      
                      return (
                        <div
                          key={column.id}
                          className={`flex-1 ${column.className || ''} text-${column.align || 'left'}`}
                          style={{
                            width: column.width,
                            minWidth: column.minWidth,
                            maxWidth: column.maxWidth,
                          }}
                        >
                          {column.cell ? (
                            column.cell({ value, item, index: virtualRow.index })
                          ) : (
                            <span>{value?.toString() || '-'}</span>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {selectable && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === processedData.length && processedData.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                  )}
                  
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                      }`}
                      style={{
                        width: column.width,
                        minWidth: column.minWidth,
                        maxWidth: column.maxWidth,
                      }}
                      onClick={() => column.sortable && handleSort(column.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{column.headerCell ? column.headerCell() : column.header}</span>
                        {column.sortable && (
                          <div className="flex flex-col">
                            <ChevronUpIcon
                              className={`h-3 w-3 ${
                                sortConfig.key === column.id && sortConfig.direction === 'asc'
                                  ? 'text-primary-500'
                                  : 'text-gray-400'
                              }`}
                            />
                            <ChevronDownIcon
                              className={`h-3 w-3 -mt-1 ${
                                sortConfig.key === column.id && sortConfig.direction === 'desc'
                                  ? 'text-primary-500'
                                  : 'text-gray-400'
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody className="bg-white divide-y divide-gray-200">
                {processedData.map((item, index) => (
                  <motion.tr
                    key={index}
                    className={`hover:bg-gray-50 ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${selectedItems.has(index) ? 'bg-primary-50' : ''}`}
                    onClick={() => onRowClick?.(item, index)}
                    whileHover={{ backgroundColor: '#f9fafb' }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    {selectable && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(index)}
                          onChange={() => handleSelectItem(index)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    
                    {columns.map((column) => {
                      const value = typeof column.accessor === 'function'
                        ? column.accessor(item)
                        : item[column.accessor];
                      
                      return (
                        <td
                          key={column.id}
                          className={`px-6 py-4 whitespace-nowrap ${column.className || ''}`}
                          style={{
                            textAlign: column.align || 'left',
                            width: column.width,
                            minWidth: column.minWidth,
                            maxWidth: column.maxWidth,
                          }}
                        >
                          {column.cell ? (
                            column.cell({ value, item, index })
                          ) : (
                            <span className="text-sm text-gray-900">
                              {value?.toString() || '-'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          data={selectedItems.size > 0 ? selectedData : processedData}
          columns={columns}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}