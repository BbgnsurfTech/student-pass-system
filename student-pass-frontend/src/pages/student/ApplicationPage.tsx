import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  DocumentTextIcon, 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { ApplicationForm } from '../../components/application/ApplicationForm';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { 
  addApplication, 
  setApplications, 
  setLoading,
  Application 
} from '../../store/slices/applicationSlice';
import { UploadedFile } from '../../services/fileService';
import { notificationService } from '../../services/notificationService';

interface ApplicationFormData {
  passType: 'TEMPORARY' | 'PERMANENT' | 'VISITOR';
  purpose: string;
  validFrom: string;
  validTo: string;
  emergencyContact: string;
  emergencyPhone: string;
  additionalInfo?: string;
  documents: UploadedFile[];
}

export const ApplicationPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { applications, isLoading } = useAppSelector(state => state.applications);
  const { user } = useAppSelector(state => state.auth);
  
  const [showForm, setShowForm] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  useEffect(() => {
    // Load user's applications
    loadApplications();
    
    // Setup notification callbacks
    notificationService.setCallbacks({
      onApplicationStatusChange: (applicationId, status) => {
        // Update application status in real-time
        console.log(`Application ${applicationId} status changed to ${status}`);
        loadApplications(); // Refresh applications
      }
    });
  }, []);

  const loadApplications = async () => {
    dispatch(setLoading(true));
    try {
      // Mock API call - replace with actual API
      const mockApplications: Application[] = [
        {
          id: 'app-001',
          studentId: user?.id || 'student-123',
          passType: 'TEMPORARY',
          purpose: 'Medical appointment and follow-up visits',
          validFrom: '2024-08-10',
          validTo: '2024-08-20',
          status: 'PENDING',
          documents: ['doc1.pdf', 'doc2.jpg'],
          createdAt: '2024-08-05T10:00:00Z',
          updatedAt: '2024-08-05T10:00:00Z',
        },
        {
          id: 'app-002',
          studentId: user?.id || 'student-123',
          passType: 'PERMANENT',
          purpose: 'Regular campus access for research project',
          validFrom: '2024-08-01',
          validTo: '2024-12-31',
          status: 'APPROVED',
          documents: ['research-proposal.pdf'],
          reviewedBy: 'admin-001',
          reviewedAt: '2024-08-03T14:30:00Z',
          reviewComments: 'Approved for research access. Please follow safety protocols.',
          createdAt: '2024-08-01T09:00:00Z',
          updatedAt: '2024-08-03T14:30:00Z',
        }
      ];
      
      dispatch(setApplications(mockApplications));
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleSubmitApplication = async (formData: ApplicationFormData) => {
    dispatch(setLoading(true));
    try {
      // Mock API call - replace with actual API
      const newApplication: Application = {
        id: `app-${Date.now()}`,
        studentId: user?.id || 'student-123',
        passType: formData.passType,
        purpose: formData.purpose,
        validFrom: formData.validFrom,
        validTo: formData.validTo,
        status: 'PENDING',
        documents: formData.documents.map(doc => doc.id),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dispatch(addApplication(newApplication));
      setShowForm(false);
      
      // Show success notification
      alert('Application submitted successfully!');
    } catch (error) {
      console.error('Failed to submit application:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      dispatch(setLoading(false));
    }
  };

  const getStatusIcon = (status: Application['status']) => {
    switch (status) {
      case 'PENDING': return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'APPROVED': return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'REJECTED': return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'EXPIRED': return <ClockIcon className="w-5 h-5 text-gray-500" />;
      default: return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Application['status']) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-700 bg-yellow-100';
      case 'APPROVED': return 'text-green-700 bg-green-100';
      case 'REJECTED': return 'text-red-700 bg-red-100';
      case 'EXPIRED': return 'text-gray-700 bg-gray-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <button
              onClick={() => setShowForm(false)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Applications
            </button>
          </div>
          
          <ApplicationForm
            onSubmit={handleSubmitApplication}
            isLoading={isLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
              <p className="text-gray-600 mt-1">Manage your pass applications and track their status</p>
            </div>
            
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              New Application
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DocumentTextIcon className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClockIcon className="w-8 h-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.filter(app => app.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.filter(app => app.status === 'APPROVED').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <XCircleIcon className="w-8 h-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.filter(app => app.status === 'REJECTED').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Applications</h3>
          </div>
          
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center">
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto" />
              <p className="text-gray-500 mt-2">No applications found</p>
              <p className="text-sm text-gray-400">Click "New Application" to submit your first application</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              <AnimatePresence>
                {applications.map((application) => (
                  <motion.div
                    key={application.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-medium text-gray-900">
                            {application.passType} Pass
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                            {getStatusIcon(application.status)}
                            <span className="ml-1">{application.status}</span>
                          </span>
                        </div>
                        
                        <p className="text-gray-700 mb-3">{application.purpose}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Valid Period:</span>
                            <p>{formatDate(application.validFrom)} - {formatDate(application.validTo)}</p>
                          </div>
                          <div>
                            <span className="font-medium">Submitted:</span>
                            <p>{formatDate(application.createdAt)}</p>
                          </div>
                          <div>
                            <span className="font-medium">Documents:</span>
                            <p>{application.documents.length} file(s)</p>
                          </div>
                        </div>

                        {application.reviewComments && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <span className="font-medium">Admin Comments:</span> {application.reviewComments}
                            </p>
                            {application.reviewedAt && (
                              <p className="text-xs text-blue-600 mt-1">
                                Reviewed on {formatDate(application.reviewedAt)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-6">
                        <button
                          onClick={() => setSelectedApplication(application)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Application Details Modal */}
      <AnimatePresence>
        {selectedApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-96 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Application Details
                </h3>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Application ID:</span>
                    <p className="text-gray-900">{selectedApplication.id}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedApplication.status)}`}>
                      {selectedApplication.status}
                    </span>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Purpose:</span>
                  <p className="text-gray-900">{selectedApplication.purpose}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Valid From:</span>
                    <p className="text-gray-900">{formatDate(selectedApplication.validFrom)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Valid To:</span>
                    <p className="text-gray-900">{formatDate(selectedApplication.validTo)}</p>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Documents:</span>
                  <p className="text-gray-900">{selectedApplication.documents.length} file(s) attached</p>
                </div>
                
                {selectedApplication.reviewComments && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Review Comments:</span>
                    <p className="text-gray-900">{selectedApplication.reviewComments}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ApplicationPage;