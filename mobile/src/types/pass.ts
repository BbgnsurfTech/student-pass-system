export interface Pass {
  id: string;
  type: PassType;
  status: PassStatus;
  studentId: string;
  student?: Student;
  issueDate: string;
  expirationDate: string;
  qrCode: string;
  permissions: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PassApplication {
  type: PassType;
  reason: string;
  duration: number; // in days
  startDate: string;
  endDate: string;
  documents?: DocumentUpload[];
  emergencyContact?: EmergencyContact;
  additionalInfo?: string;
}

export interface DocumentUpload {
  uri: string;
  type: string;
  name: string;
  size?: number;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  department: string;
  year: number;
  avatar?: string;
}

export type PassType = 
  | 'library'
  | 'laboratory' 
  | 'dormitory'
  | 'cafeteria'
  | 'gym'
  | 'parking'
  | 'event'
  | 'temporary'
  | 'all_access';

export type PassStatus = 
  | 'pending'
  | 'approved'
  | 'active'
  | 'expired'
  | 'suspended'
  | 'cancelled'
  | 'rejected';

export interface PassValidation {
  isValid: boolean;
  reason?: string;
  expiresAt: string;
  permissions: string[];
}

export interface AccessLog {
  id: string;
  passId: string;
  studentId: string;
  location: string;
  action: 'granted' | 'denied';
  timestamp: string;
  securityOfficer?: string;
  reason?: string;
}

export interface PassStatistics {
  totalPasses: number;
  activePasses: number;
  expiringSoon: number;
  suspended: number;
  byType: Record<PassType, number>;
  recentActivity: AccessLog[];
}