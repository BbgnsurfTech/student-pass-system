import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  UserIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
  FunnelIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { Application } from '../../store/slices/applicationSlice';
import { useAppSelector, useAppDispatch } from '../../store/hooks';

interface AdminReviewPanelProps {
  applications: Application[];
  onApprove: (applicationId: string, comments?: string) => void;
  onReject: (applicationId: string, comments: string) => void;
  onViewDetails: (application: Application) => void;
  isLoading?: boolean;
}

interface FilterState {
  status: string;
  passType: string;
  dateRange: { start: string; end: string } | null;
  search: string;
}

export const AdminReviewPanel: React.FC<AdminReviewPanelProps> = ({
  applications,
  onApprove,
  onReject,
  onViewDetails,
  isLoading = false
}) => {
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    passType: 'all',
    dateRange: null,
    search: ''
  });
  const [reviewComment, setReviewComment] = useState('');
  const [reviewingApp, setReviewingApp] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);

  const filteredApplications = applications.filter(app => {
    if (filters.status !== 'all' && app.status !== filters.status) return false;
    if (filters.passType !== 'all' && app.passType !== filters.passType) return false;
    if (filters.search && !app.purpose.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.dateRange) {
      const appDate = new Date(app.createdAt);
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      if (appDate < startDate || appDate > endDate) return false;
    }
    return true;
  });

  const getStatusColor = (status: Application['status']) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-700 bg-yellow-100';
      case 'APPROVED': return 'text-green-700 bg-green-100';
      case 'REJECTED': return 'text-red-700 bg-red-100';
      case 'EXPIRED': return 'text-gray-700 bg-gray-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusIcon = (status: Application['status']) => {
    switch (status) {
      case 'PENDING': return <ClockIcon className="w-4 h-4" />;
      case 'APPROVED': return <CheckCircleIcon className="w-4 h-4" />;
      case 'REJECTED': return <XCircleIcon className="w-4 h-4" />;
      case 'EXPIRED': return <ClockIcon className="w-4 h-4" />;
      default: return <ClockIcon className="w-4 h-4" />;
    }
  };

  const handleBulkAction = (action: 'approve' | 'reject') => {
    if (selectedApplications.length === 0) return;
    
    if (action === 'approve') {
      selectedApplications.forEach(id => onApprove(id));
    } else {
      // For bulk reject, we'll need a bulk comment modal
      console.log('Bulk reject not implemented yet');
    }
    
    setSelectedApplications([]);
    setShowBulkActions(false);
  };

  const handleReviewSubmit = () => {
    if (!reviewingApp || !reviewAction) return;
    
    if (reviewAction === 'approve') {
      onApprove(reviewingApp, reviewComment);
    } else {
      onReject(reviewingApp, reviewComment);
    }
    
    setReviewingApp(null);
    setReviewAction(null);
    setReviewComment('');
  };

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
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Application Reviews</h3>
            <p className="text-sm text-gray-500">
              {filteredApplications.length} applications • {applications.filter(a => a.status === 'PENDING').length} pending
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {selectedApplications.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedApplications.length} selected
                </span>
                <button
                  onClick={() => handleBulkAction('approve')}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Bulk Approve
                </button>
                <button
                  onClick={() => setSelectedApplications([])}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search applications..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>
          
          <select
            value={filters.passType}
            onChange={(e) => setFilters(prev => ({ ...prev, passType: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="TEMPORARY">Temporary</option>
            <option value="PERMANENT">Permanent</option>
            <option value="VISITOR">Visitor</option>
          </select>
          
          <button
            onClick={() => setFilters({ status: 'all', passType: 'all', dateRange: null, search: '' })}
            className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Applications List */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {filteredApplications.map((application) => (
            <motion.div
              key={application.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start space-x-4">
                <input
                  type="checkbox"
                  checked={selectedApplications.includes(application.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedApplications(prev => [...prev, application.id]);
                    } else {
                      setSelectedApplications(prev => prev.filter(id => id !== application.id));
                    }
                  }}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        Application #{application.id.slice(-8)}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        <span className="ml-1">{application.status}</span>
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {application.passType}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onViewDetails(application)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="View Details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      
                      {application.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => {
                              setReviewingApp(application.id);
                              setReviewAction('approve');
                            }}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Approve"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setReviewingApp(application.id);
                              setReviewAction('reject');
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Reject"
                          >
                            <XCircleIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <UserIcon className="w-4 h-4 mr-2" />
                      Student ID: {application.studentId}
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {application.validFrom} - {application.validTo}
                    </div>
                    <div className="flex items-center">
                      <ClockIcon className="w-4 h-4 mr-2" />
                      {formatDate(application.createdAt)}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm text-gray-700 line-clamp-2">
                      <span className="font-medium">Purpose:</span> {application.purpose}
                    </p>
                  </div>

                  {application.documents && application.documents.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">
                        {application.documents.length} document(s) attached
                      </span>
                    </div>
                  )}

                  {application.reviewComments && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <div className="flex items-start">
                        <ChatBubbleLeftIcon className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">
                            Reviewed by {application.reviewedBy} • {application.reviewedAt && formatDate(application.reviewedAt)}
                          </p>
                          <p className="text-sm text-gray-700 mt-1">{application.reviewComments}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredApplications.length === 0 && (
        <div className="p-12 text-center">
          <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">No applications found</p>
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {reviewingApp && reviewAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {reviewAction === 'approve' ? 'Approve Application' : 'Reject Application'}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {reviewAction === 'approve' ? 'Approval Comments (Optional)' : 'Rejection Reason (Required)'}
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={reviewAction === 'approve' 
                    ? 'Add any comments about the approval...' 
                    : 'Please explain why this application is being rejected...'}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setReviewingApp(null);
                    setReviewAction(null);
                    setReviewComment('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReviewSubmit}
                  disabled={reviewAction === 'reject' && !reviewComment.trim()}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    reviewAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {reviewAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};