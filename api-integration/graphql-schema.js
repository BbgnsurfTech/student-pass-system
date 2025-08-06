/**
 * GraphQL Schema for Student Pass System
 * Complete API with subscriptions and real-time updates
 */

import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar DateTime
  scalar Upload
  scalar JSON

  type Query {
    # Student Management
    students(
      filter: StudentFilter
      pagination: PaginationInput
      sort: SortInput
    ): StudentConnection!
    
    student(id: ID!): Student
    studentPasses(studentId: ID!): [Pass!]!
    studentAnalytics(studentId: ID!, timeRange: TimeRange): StudentAnalytics!
    
    # Pass Management
    passes(
      filter: PassFilter
      pagination: PaginationInput
      sort: SortInput
    ): PassConnection!
    
    pass(id: ID!): Pass
    passHistory(passId: ID!): [PassEvent!]!
    
    # Analytics & Reporting
    dashboardMetrics(timeRange: TimeRange): DashboardMetrics!
    attendanceReport(
      startDate: DateTime!
      endDate: DateTime!
      filters: ReportFilter
    ): AttendanceReport!
    
    securityAlerts(
      severity: AlertSeverity
      status: AlertStatus
      limit: Int = 50
    ): [SecurityAlert!]!
    
    complianceReport(region: String!): ComplianceReport!
    
    # System Management
    institutions(filter: InstitutionFilter): [Institution!]!
    institution(id: ID!): Institution
    
    users(filter: UserFilter): [User!]!
    user(id: ID!): User
    
    # AI/ML Insights
    behaviorAnalysis(studentId: ID!, timeRange: TimeRange): BehaviorAnalysis!
    predictiveInsights(institutionId: ID!): [PredictiveInsight!]!
    anomalyDetection(type: AnomalyType): [Anomaly!]!
    
    # IoT Integration
    devices(status: DeviceStatus): [IoTDevice!]!
    device(id: ID!): IoTDevice
    deviceMetrics(deviceId: ID!, timeRange: TimeRange): DeviceMetrics!
    
    # Blockchain Verification
    verifyCredential(credentialId: ID!): CredentialVerification!
    blockchainHealth: BlockchainHealth!
  }

  type Mutation {
    # Student Management
    createStudent(input: CreateStudentInput!): StudentMutationPayload!
    updateStudent(id: ID!, input: UpdateStudentInput!): StudentMutationPayload!
    deleteStudent(id: ID!): DeletePayload!
    importStudents(file: Upload!): ImportResult!
    
    # Pass Management
    createPass(input: CreatePassInput!): PassMutationPayload!
    updatePass(id: ID!, input: UpdatePassInput!): PassMutationPayload!
    activatePass(id: ID!): PassMutationPayload!
    deactivatePass(id: ID!): PassMutationPayload!
    
    # Entry/Exit Events
    recordEntry(input: EntryEventInput!): EntryEventPayload!
    recordExit(input: ExitEventInput!): ExitEventPayload!
    
    # User Management
    createUser(input: CreateUserInput!): UserMutationPayload!
    updateUser(id: ID!, input: UpdateUserInput!): UserMutationPayload!
    changePassword(input: ChangePasswordInput!): ChangePasswordPayload!
    
    # Institution Management
    createInstitution(input: CreateInstitutionInput!): InstitutionMutationPayload!
    updateInstitution(id: ID!, input: UpdateInstitutionInput!): InstitutionMutationPayload!
    
    # Security & Compliance
    acknowledgeAlert(alertId: ID!): SecurityAlert!
    generateComplianceReport(input: ComplianceReportInput!): ComplianceReport!
    
    # IoT Device Management
    registerDevice(input: RegisterDeviceInput!): IoTDevice!
    updateDevice(id: ID!, input: UpdateDeviceInput!): IoTDevice!
    calibrateDevice(id: ID!): CalibrationResult!
    
    # AI/ML Training
    trainModel(input: ModelTrainingInput!): TrainingJob!
    deployModel(modelId: ID!): DeploymentResult!
    
    # Blockchain Operations
    issueCredential(input: IssueCredentialInput!): CredentialIssuance!
    revokeCredential(credentialId: ID!, reason: String!): CredentialRevocation!
  }

  type Subscription {
    # Real-time Entry/Exit Events
    entryEvents(institutionId: ID): EntryEvent!
    exitEvents(institutionId: ID): ExitEvent!
    
    # Pass Status Changes
    passStatusChanged(passId: ID): Pass!
    
    # Security Alerts
    securityAlertCreated(severity: AlertSeverity): SecurityAlert!
    
    # Device Status Updates
    deviceStatusChanged(deviceId: ID): IoTDevice!
    
    # Analytics Updates
    metricsUpdated(institutionId: ID!): DashboardMetrics!
    
    # AI/ML Insights
    anomalyDetected(institutionId: ID): Anomaly!
    behaviorPatternUpdated(studentId: ID!): BehaviorPattern!
    
    # System Health
    systemHealthChanged: SystemHealth!
    
    # Compliance Updates
    complianceStatusChanged(region: String): ComplianceStatus!
  }

  # Core Types
  type Student {
    id: ID!
    institutionId: ID!
    studentId: String!
    firstName: String!
    lastName: String!
    email: String
    phone: String
    dateOfBirth: DateTime
    grade: String
    class: String
    status: StudentStatus!
    profilePhoto: String
    biometricData: BiometricData
    passes: [Pass!]!
    guardians: [Guardian!]!
    analytics: StudentAnalytics
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Pass {
    id: ID!
    studentId: ID!
    institutionId: ID!
    type: PassType!
    status: PassStatus!
    qrCode: String!
    nfcId: String
    rfidId: String
    biometricTemplate: String
    validFrom: DateTime!
    validUntil: DateTime!
    permissions: [Permission!]!
    history: [PassEvent!]!
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Institution {
    id: ID!
    name: String!
    type: InstitutionType!
    address: Address!
    timezone: String!
    settings: InstitutionSettings!
    devices: [IoTDevice!]!
    students: [Student!]!
    analytics: InstitutionAnalytics!
    compliance: ComplianceStatus!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    role: UserRole!
    institutionId: ID
    permissions: [Permission!]!
    lastLogin: DateTime
    status: UserStatus!
    preferences: UserPreferences
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type IoTDevice {
    id: ID!
    institutionId: ID!
    name: String!
    type: DeviceType!
    location: String!
    status: DeviceStatus!
    lastSeen: DateTime
    configuration: DeviceConfiguration!
    metrics: DeviceMetrics
    firmware: FirmwareInfo!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Analytics Types
  type DashboardMetrics {
    totalStudents: Int!
    activeStudents: Int!
    totalPasses: Int!
    activePasses: Int!
    todayEntries: Int!
    todayExits: Int!
    securityAlerts: Int!
    complianceScore: Float!
    deviceHealth: Float!
    trends: MetricTrends!
    updatedAt: DateTime!
  }

  type StudentAnalytics {
    attendanceRate: Float!
    averageEntryTime: String
    averageExitTime: String
    frequentLocations: [LocationFrequency!]!
    behaviorScore: Float!
    riskLevel: RiskLevel!
    predictions: [Prediction!]!
    patterns: [BehaviorPattern!]!
  }

  type BehaviorAnalysis {
    studentId: ID!
    timeRange: TimeRange!
    patterns: [BehaviorPattern!]!
    anomalies: [BehaviorAnomaly!]!
    riskAssessment: RiskAssessment!
    recommendations: [Recommendation!]!
    confidenceScore: Float!
    lastAnalyzed: DateTime!
  }

  # Security Types
  type SecurityAlert {
    id: ID!
    type: AlertType!
    severity: AlertSeverity!
    status: AlertStatus!
    title: String!
    description: String!
    studentId: ID
    deviceId: ID
    location: String
    detectedAt: DateTime!
    acknowledgedAt: DateTime
    acknowledgedBy: ID
    metadata: JSON
  }

  type Anomaly {
    id: ID!
    type: AnomalyType!
    severity: Float!
    description: String!
    studentId: ID
    deviceId: ID
    location: String
    confidence: Float!
    detectedAt: DateTime!
    resolved: Boolean!
    metadata: JSON
  }

  # Event Types
  type EntryEvent {
    id: ID!
    studentId: ID!
    passId: ID!
    deviceId: ID!
    location: String!
    timestamp: DateTime!
    method: VerificationMethod!
    success: Boolean!
    metadata: JSON
  }

  type ExitEvent {
    id: ID!
    studentId: ID!
    passId: ID!
    deviceId: ID!
    location: String!
    timestamp: DateTime!
    method: VerificationMethod!
    success: Boolean!
    metadata: JSON
  }

  # Blockchain Types
  type CredentialVerification {
    credentialId: ID!
    isValid: Boolean!
    issuer: String!
    issuedAt: DateTime!
    revokedAt: DateTime
    blockchainTxId: String!
    verificationHash: String!
  }

  type BlockchainHealth {
    networkStatus: String!
    blockHeight: Int!
    lastBlockTime: DateTime!
    activeNodes: Int!
    transactionCount: Int!
    gasPrice: String!
  }

  # Input Types
  input CreateStudentInput {
    institutionId: ID!
    studentId: String!
    firstName: String!
    lastName: String!
    email: String
    phone: String
    dateOfBirth: DateTime
    grade: String
    class: String
    profilePhoto: Upload
    guardians: [GuardianInput!]
  }

  input CreatePassInput {
    studentId: ID!
    type: PassType!
    validFrom: DateTime!
    validUntil: DateTime!
    permissions: [String!]!
    biometricEnrollment: Boolean = false
  }

  input EntryEventInput {
    studentId: ID
    passId: ID
    deviceId: ID!
    verificationMethod: VerificationMethod!
    biometricData: String
    additionalData: JSON
  }

  input StudentFilter {
    institutionId: ID
    grade: String
    class: String
    status: StudentStatus
    search: String
  }

  input PassFilter {
    studentId: ID
    institutionId: ID
    type: PassType
    status: PassStatus
    validityCheck: Boolean
  }

  input TimeRange {
    startDate: DateTime!
    endDate: DateTime!
  }

  # Enums
  enum StudentStatus {
    ACTIVE
    INACTIVE
    SUSPENDED
    GRADUATED
    TRANSFERRED
  }

  enum PassType {
    STANDARD
    TEMPORARY
    VISITOR
    STAFF
    CONTRACTOR
    EMERGENCY
  }

  enum PassStatus {
    ACTIVE
    INACTIVE
    SUSPENDED
    EXPIRED
    REVOKED
  }

  enum UserRole {
    SUPER_ADMIN
    ADMIN
    MANAGER
    TEACHER
    SECURITY
    SUPPORT
  }

  enum DeviceType {
    QR_SCANNER
    NFC_READER
    RFID_READER
    BIOMETRIC_SCANNER
    FACE_RECOGNITION
    TEMPERATURE_SENSOR
    ACCESS_CONTROL
  }

  enum DeviceStatus {
    ONLINE
    OFFLINE
    ERROR
    MAINTENANCE
    UPDATING
  }

  enum AlertSeverity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum AlertStatus {
    ACTIVE
    ACKNOWLEDGED
    RESOLVED
    DISMISSED
  }

  enum VerificationMethod {
    QR_CODE
    NFC
    RFID
    BIOMETRIC
    FACE_RECOGNITION
    MANUAL
  }

  # Connection Types (for pagination)
  type StudentConnection {
    edges: [StudentEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type StudentEdge {
    node: Student!
    cursor: String!
  }

  type PassConnection {
    edges: [PassEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type PassEdge {
    node: Pass!
    cursor: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  # Mutation Payloads
  type StudentMutationPayload {
    student: Student
    errors: [UserError!]
  }

  type PassMutationPayload {
    pass: Pass
    errors: [UserError!]
  }

  type UserError {
    field: String
    message: String!
    code: String
  }

  type DeletePayload {
    success: Boolean!
    deletedId: ID
    errors: [UserError!]
  }
`;

export const resolvers = {
  Query: {
    students: async (parent, args, { dataSources, user }) => {
      return dataSources.studentAPI.getStudents(args, user);
    },
    
    student: async (parent, { id }, { dataSources, user }) => {
      return dataSources.studentAPI.getStudent(id, user);
    },
    
    passes: async (parent, args, { dataSources, user }) => {
      return dataSources.passAPI.getPasses(args, user);
    },
    
    pass: async (parent, { id }, { dataSources, user }) => {
      return dataSources.passAPI.getPass(id, user);
    },
    
    dashboardMetrics: async (parent, { timeRange }, { dataSources, user }) => {
      return dataSources.analyticsAPI.getDashboardMetrics(timeRange, user);
    },
    
    securityAlerts: async (parent, args, { dataSources, user }) => {
      return dataSources.securityAPI.getAlerts(args, user);
    },
    
    devices: async (parent, { status }, { dataSources, user }) => {
      return dataSources.iotAPI.getDevices(status, user);
    },
    
    behaviorAnalysis: async (parent, args, { dataSources, user }) => {
      return dataSources.aiAPI.getBehaviorAnalysis(args, user);
    },
    
    verifyCredential: async (parent, { credentialId }, { dataSources }) => {
      return dataSources.blockchainAPI.verifyCredential(credentialId);
    }
  },

  Mutation: {
    createStudent: async (parent, { input }, { dataSources, user }) => {
      try {
        const student = await dataSources.studentAPI.createStudent(input, user);
        return { student, errors: [] };
      } catch (error) {
        return {
          student: null,
          errors: [{ message: error.message, code: error.code }]
        };
      }
    },
    
    createPass: async (parent, { input }, { dataSources, user }) => {
      try {
        const pass = await dataSources.passAPI.createPass(input, user);
        return { pass, errors: [] };
      } catch (error) {
        return {
          pass: null,
          errors: [{ message: error.message, code: error.code }]
        };
      }
    },
    
    recordEntry: async (parent, { input }, { dataSources, pubsub }) => {
      const event = await dataSources.eventAPI.recordEntry(input);
      
      // Publish real-time update
      pubsub.publish('ENTRY_EVENT', {
        entryEvents: event,
        institutionId: event.institutionId
      });
      
      return event;
    },
    
    registerDevice: async (parent, { input }, { dataSources, user }) => {
      return dataSources.iotAPI.registerDevice(input, user);
    },
    
    issueCredential: async (parent, { input }, { dataSources, user }) => {
      return dataSources.blockchainAPI.issueCredential(input, user);
    }
  },

  Subscription: {
    entryEvents: {
      subscribe: (parent, { institutionId }, { pubsub }) => {
        return institutionId 
          ? pubsub.asyncIterator([`ENTRY_EVENT_${institutionId}`])
          : pubsub.asyncIterator(['ENTRY_EVENT']);
      }
    },
    
    securityAlertCreated: {
      subscribe: (parent, { severity }, { pubsub }) => {
        return severity
          ? pubsub.asyncIterator([`SECURITY_ALERT_${severity}`])
          : pubsub.asyncIterator(['SECURITY_ALERT']);
      }
    },
    
    deviceStatusChanged: {
      subscribe: (parent, { deviceId }, { pubsub }) => {
        return deviceId
          ? pubsub.asyncIterator([`DEVICE_STATUS_${deviceId}`])
          : pubsub.asyncIterator(['DEVICE_STATUS']);
      }
    },
    
    anomalyDetected: {
      subscribe: (parent, { institutionId }, { pubsub }) => {
        return institutionId
          ? pubsub.asyncIterator([`ANOMALY_${institutionId}`])
          : pubsub.asyncIterator(['ANOMALY']);
      }
    }
  },

  // Field resolvers
  Student: {
    passes: async (parent, args, { dataSources }) => {
      return dataSources.passAPI.getPassesByStudent(parent.id);
    },
    
    analytics: async (parent, args, { dataSources }) => {
      return dataSources.analyticsAPI.getStudentAnalytics(parent.id);
    }
  },
  
  Pass: {
    history: async (parent, args, { dataSources }) => {
      return dataSources.passAPI.getPassHistory(parent.id);
    }
  },
  
  Institution: {
    students: async (parent, args, { dataSources }) => {
      return dataSources.studentAPI.getStudentsByInstitution(parent.id);
    },
    
    devices: async (parent, args, { dataSources }) => {
      return dataSources.iotAPI.getDevicesByInstitution(parent.id);
    },
    
    analytics: async (parent, args, { dataSources }) => {
      return dataSources.analyticsAPI.getInstitutionAnalytics(parent.id);
    }
  },
  
  IoTDevice: {
    metrics: async (parent, args, { dataSources }) => {
      return dataSources.iotAPI.getDeviceMetrics(parent.id);
    }
  }
};