import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  EyeIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { AdminReviewPanel } from '../../components/admin/AdminReviewPanel';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { 
  setApplications, 
  updateApplication,
  Application 
} from '../../store/slices/applicationSlice';
import { addPass, Pass } from '../../store/slices/passSlice';
import { QRCodeService } from '../../services/qrCodeService';

interface ApplicationDetails extends Application {
  studentName?: string;
  studentEmail?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export const ApplicationReviewPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { applications, isLoading } = useAppSelector(state => state.applications);
  const { user } = useAppSelector(state => state.auth);
  
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDetails | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      // Mock API call - replace with actual API
      const mockApplications: ApplicationDetails[] = [
        {
          id: 'app-001',
          studentId: 'student-123',
          studentName: 'John Smith',
          studentEmail: 'john.smith@university.edu',
          passType: 'TEMPORARY',
          purpose: 'Medical appointment and follow-up visits at campus health center',
          validFrom: '2024-08-10',
          validTo: '2024-08-20',
          status: 'PENDING',
          documents: ['medical-certificate.pdf', 'doctor-note.jpg'],
          emergencyContact: 'Jane Smith (Mother)',
          emergencyPhone: '+1-555-0123',
          createdAt: '2024-08-05T10:00:00Z',
          updatedAt: '2024-08-05T10:00:00Z',
        },
        {
          id: 'app-002',
          studentId: 'student-456',
          studentName: 'Emily Johnson',
          studentEmail: 'emily.johnson@university.edu',
          passType: 'PERMANENT',
          purpose: 'Research project requiring regular lab access for semester project on renewable energy systems',
          validFrom: '2024-08-01',
          validTo: '2024-12-31',
          status: 'PENDING',
          documents: ['research-proposal.pdf', 'supervisor-approval.pdf', 'student-id.jpg'],
          emergencyContact: 'Robert Johnson (Father)',
          emergencyPhone: '+1-555-0456',
          createdAt: '2024-08-04T14:30:00Z',
          updatedAt: '2024-08-04T14:30:00Z',
        },
        {
          id: 'app-003',
          studentId: 'student-789',
          studentName: 'Michael Brown',
          studentEmail: 'michael.brown@university.edu',
          passType: 'VISITOR',
          purpose: 'Guest lecturer for computer science department, multiple sessions throughout the month',
          validFrom: '2024-08-15',
          validTo: '2024-09-15',
          status: 'PENDING',
          documents: ['invitation-letter.pdf', 'curriculum-vitae.pdf'],
          emergencyContact: 'Sarah Brown (Spouse)',
          emergencyPhone: '+1-555-0789',
          createdAt: '2024-08-03T09:15:00Z',
          updatedAt: '2024-08-03T09:15:00Z',
        },
        {
          id: 'app-004',
          studentId: 'student-321',
          studentName: 'Lisa Davis',
          studentEmail: 'lisa.davis@university.edu',
          passType: 'TEMPORARY',
          purpose: 'Library research access for thesis completion',
          validFrom: '2024-08-01',
          validTo: '2024-08-31',
          status: 'APPROVED',
          documents: ['thesis-proposal.pdf'],
          emergencyContact: 'Mark Davis (Husband)',
          emergencyPhone: '+1-555-0321',
          reviewedBy: user?.id || 'admin-001',
          reviewedAt: '2024-08-02T16:20:00Z',
          reviewComments: 'Approved for library access. Please follow quiet hours policy.',
          createdAt: '2024-08-01T11:45:00Z',
          updatedAt: '2024-08-02T16:20:00Z',
        },
        {
          id: 'app-005',
          studentId: 'student-654',
          studentName: 'David Wilson',
          studentEmail: 'david.wilson@university.edu',
          passType: 'PERMANENT',
          purpose: 'Graduate student requiring access to engineering labs',
          validFrom: '2024-08-01',
          validTo: '2024-07-31',
          status: 'REJECTED',
          documents: ['incomplete-form.pdf'],
          emergencyContact: 'Not provided',
          emergencyPhone: 'Not provided',
          reviewedBy: user?.id || 'admin-001',
          reviewedAt: '2024-08-02T10:00:00Z',
          reviewComments: 'Application rejected due to incomplete documentation. Please provide valid emergency contact information and supervisor approval.',
          createdAt: '2024-08-01T08:30:00Z',
          updatedAt: '2024-08-02T10:00:00Z',
        }
      ];
      
      dispatch(setApplications(mockApplications));
    } catch (error) {
      console.error('Failed to load applications:', error);
    }
  };

  const handleApproveApplication = async (applicationId: string, comments?: string) => {
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) return;

      // Update application status
      const updatedApplication: Application = {
        ...application,
        status: 'APPROVED',
        reviewedBy: user?.id || 'admin-001',
        reviewedAt: new Date().toISOString(),
        reviewComments: comments || 'Application approved',
        updatedAt: new Date().toISOString(),
      };

      dispatch(updateApplication(updatedApplication));

      // Generate pass
      const newPass: Pass = {
        id: `pass-${Date.now()}`,
        applicationId: application.id,
        studentId: application.studentId,
        passType: application.passType,
        qrCode: await generateQRCodeData(application),
        isActive: true,
        validFrom: application.validFrom,
        validTo: application.validTo,
        permissions: getPermissionsForPassType(application.passType),
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dispatch(addPass(newPass));

      // Show success message
      alert(`Application ${applicationId} approved successfully!`);
    } catch (error) {
      console.error('Failed to approve application:', error);
      alert('Failed to approve application. Please try again.');
    }
  };

  const handleRejectApplication = async (applicationId: string, comments: string) => {
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) return;

      const updatedApplication: Application = {
        ...application,
        status: 'REJECTED',
        reviewedBy: user?.id || 'admin-001',
        reviewedAt: new Date().toISOString(),
        reviewComments: comments,
        updatedAt: new Date().toISOString(),
      };

      dispatch(updateApplication(updatedApplication));
      
      alert(`Application ${applicationId} rejected.`);
    } catch (error) {
      console.error('Failed to reject application:', error);
      alert('Failed to reject application. Please try again.');
    }
  };

  const generateQRCodeData = async (application: Application): Promise<string> => {
    const qrData = {
      passId: `pass-${Date.now()}`,
      studentId: application.studentId,
      passType: application.passType,
      validFrom: application.validFrom,
      validTo: application.validTo,
      permissions: getPermissionsForPassType(application.passType),
    };

    return await QRCodeService.generateQRCode(qrData);
  };

  const getPermissionsForPassType = (passType: string): string[] => {
    switch (passType) {
      case 'PERMANENT':
        return ['Main Building Access', 'Library Access', 'Lab Access', 'Parking Access'];
      case 'TEMPORARY':
        return ['Main Building Access', 'Library Access'];
      case 'VISITOR':
        return ['Main Building Access', 'Visitor Parking'];
      default:
        return ['Main Building Access'];
    }
  };

  const handleViewApplicationDetails = (application: Application) => {
    setSelectedApplication(application as ApplicationDetails);
    setShowApplicationModal(true);
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

  const pendingCount = applications.filter(app => app.status === 'PENDING').length;
  const approvedToday = applications.filter(app => 
    app.status === 'APPROVED' && 
    new Date(app.reviewedAt || '').toDateString() === new Date().toDateString()
  ).length;
  const rejectedToday = applications.filter(app => 
    app.status === 'REJECTED' && 
    new Date(app.reviewedAt || '').toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Application Reviews</h1>
          <p className="text-gray-600 mt-1">Review and manage student pass applications</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClockIcon className="w-8 h-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Approved Today</p>
                <p className="text-2xl font-bold text-gray-900">{approvedToday}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <XCircleIcon className="w-8 h-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Rejected Today</p>
                <p className="text-2xl font-bold text-gray-900">{rejectedToday}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DocumentTextIcon className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Review Panel */}
        <AdminReviewPanel
          applications={applications}
          onApprove={handleApproveApplication}
          onReject={handleRejectApplication}
          onViewDetails={handleViewApplicationDetails}
          isLoading={isLoading}
        />
      </div>

      {/* Application Details Modal */}
      <AnimatePresence>
        {showApplicationModal && selectedApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg w-full max-w-4xl max-h-96 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Application Details
                  </h3>
                  <button
                    onClick={() => setShowApplicationModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Student Information */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <UserIcon className="w-5 h-5 mr-2" />
                        Student Information
                      </h4>
                      
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-gray-500">Name:</span>
                          <p className="text-gray-900">{selectedApplication.studentName || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Student ID:</span>
                          <p className="text-gray-900 font-mono">{selectedApplication.studentId}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Email:</span>
                          <p className="text-gray-900">{selectedApplication.studentEmail || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Emergency Contact:</span>
                          <p className="text-gray-900">{selectedApplication.emergencyContact || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Emergency Phone:</span>
                          <p className="text-gray-900">{selectedApplication.emergencyPhone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Documents */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <DocumentTextIcon className="w-5 h-5 mr-2" />
                        Documents
                      </h4>
                      
                      {selectedApplication.documents && selectedApplication.documents.length > 0 ? (
                        <div className="space-y-2">
                          {selectedApplication.documents.map((doc, index) => (
                            <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                              <DocumentTextIcon className="w-5 h-5 text-gray-400 mr-3" />
                              <span className="text-sm text-gray-700">{doc}</span>
                              <button className="ml-auto text-blue-600 hover:text-blue-700 text-sm">
                                View
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No documents attached</p>
                      )}
                    </div>
                  </div>

                  {/* Application Details */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <CalendarIcon className="w-5 h-5 mr-2" />
                        Pass Details
                      </h4>
                      
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-gray-500">Application ID:</span>
                          <p className="text-gray-900 font-mono">{selectedApplication.id}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Pass Type:</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2">
                            {selectedApplication.passType}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Valid Period:</span>
                          <p className="text-gray-900">
                            {formatDate(selectedApplication.validFrom)} - {formatDate(selectedApplication.validTo)}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Status:</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${
                            selectedApplication.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            selectedApplication.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            selectedApplication.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedApplication.status}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Submitted:</span>
                          <p className="text-gray-900">{formatDate(selectedApplication.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Purpose</h4>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-700">{selectedApplication.purpose}</p>
                      </div>
                    </div>

                    {selectedApplication.reviewComments && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                          <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
                          Review Comments
                        </h4>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-blue-800">{selectedApplication.reviewComments}</p>
                          {selectedApplication.reviewedAt && (
                            <p className="text-xs text-blue-600 mt-2">
                              Reviewed on {formatDate(selectedApplication.reviewedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedApplication.status === 'PENDING' && (
                  <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => handleRejectApplication(selectedApplication.id, 'Rejected after detailed review')}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={() => handleApproveApplication(selectedApplication.id, 'Approved after detailed review')}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      Approve Application
                    </button>
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

export default ApplicationReviewPage;