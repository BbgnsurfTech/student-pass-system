import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar Date
  scalar JSON

  type User {
    id: ID!
    email: String!
    name: String!
    phone: String
    role: UserRole!
    isActive: Boolean!
    emailVerified: Boolean!
    createdAt: Date!
    updatedAt: Date!
    lastSeen: Date
    isOnline: Boolean
    institution: Institution
    student: Student
    notifications: [Notification!]!
    auditLogs: [AuditLog!]!
  }

  type Student {
    id: ID!
    userId: String!
    studentId: String!
    department: String!
    course: String!
    year: Int!
    enrollmentDate: Date!
    graduationDate: Date
    status: StudentStatus!
    user: User!
    applications: [Application!]!
    passes: [Pass!]!
    institution: Institution!
  }

  type Institution {
    id: ID!
    name: String!
    code: String!
    address: String!
    city: String!
    state: String!
    country: String!
    contactEmail: String!
    contactPhone: String!
    website: String
    logo: String
    isActive: Boolean!
    createdAt: Date!
    updatedAt: Date!
    users: [User!]!
    students: [Student!]!
    applications: [Application!]!
    passes: [Pass!]!
    stats: InstitutionStats!
  }

  type Application {
    id: ID!
    applicationNumber: String
    status: ApplicationStatus!
    submittedAt: Date!
    reviewedAt: Date
    approvedAt: Date
    rejectedAt: Date
    notes: String
    documents: JSON
    student: Student!
    institution: Institution!
    pass: Pass
    reviewedBy: User
    createdAt: Date!
    updatedAt: Date!
  }

  type Pass {
    id: ID!
    status: PassStatus!
    qrCode: String!
    validFrom: Date!
    validUntil: Date!
    downloadUrl: String
    downloadCount: Int!
    lastAccessed: Date
    student: Student!
    application: Application!
    institution: Institution!
    accessLogs: [AccessLog!]!
    createdAt: Date!
    updatedAt: Date!
  }

  type AccessLog {
    id: ID!
    passId: String!
    location: String!
    deviceInfo: String
    ipAddress: String
    accessTime: Date!
    pass: Pass!
  }

  type Notification {
    id: ID!
    title: String!
    message: String!
    type: NotificationType!
    isRead: Boolean!
    data: JSON
    actionUrl: String
    actionLabel: String
    userId: String!
    user: User!
    createdAt: Date!
    readAt: Date
  }

  type AuditLog {
    id: ID!
    action: String!
    entityType: String!
    entityId: String!
    oldValues: JSON
    newValues: JSON
    metadata: JSON
    ipAddress: String
    userAgent: String
    severity: AuditSeverity!
    category: AuditCategory!
    success: Boolean!
    errorMessage: String
    userId: String
    user: User
    institutionId: String
    institution: Institution
    createdAt: Date!
  }

  type SearchResult {
    id: ID!
    type: String!
    score: Float!
    title: String!
    content: String!
    highlight: JSON
    data: JSON!
  }

  type BulkOperation {
    id: ID!
    type: BulkOperationType!
    status: BulkOperationStatus!
    totalRecords: Int!
    processedRecords: Int!
    failedRecords: Int!
    progress: Float!
    errors: [String!]!
    result: JSON
    userId: String!
    user: User!
    createdAt: Date!
    updatedAt: Date!
  }

  # Statistics Types
  type InstitutionStats {
    totalUsers: Int!
    activeUsers: Int!
    totalStudents: Int!
    totalApplications: Int!
    pendingApplications: Int!
    approvedApplications: Int!
    rejectedApplications: Int!
    totalPasses: Int!
    activePasses: Int!
    expiredPasses: Int!
    onlineUsers: Int!
  }

  type DashboardStats {
    totalApplications: Int!
    pendingApplications: Int!
    approvedApplications: Int!
    rejectedApplications: Int!
    totalPasses: Int!
    activePasses: Int!
    expiredPasses: Int!
    totalUsers: Int!
    activeUsers: Int!
    onlineUsers: Int!
    recentApplications: [Application!]!
    recentPasses: [Pass!]!
    applicationsByStatus: [StatusCount!]!
    passesStats: [StatusCount!]!
    monthlyStats: [MonthlyCount!]!
  }

  type StatusCount {
    status: String!
    count: Int!
  }

  type MonthlyCount {
    month: String!
    applications: Int!
    passes: Int!
  }

  type SearchResponse {
    results: [SearchResult!]!
    total: Int!
    took: Int!
    suggestions: [String!]!
    aggregations: JSON
  }

  # Enums
  enum UserRole {
    STUDENT
    ADMIN
    SUPER_ADMIN
    STAFF
  }

  enum StudentStatus {
    ACTIVE
    INACTIVE
    GRADUATED
    SUSPENDED
    TRANSFERRED
  }

  enum ApplicationStatus {
    PENDING
    UNDER_REVIEW
    APPROVED
    REJECTED
    CANCELLED
  }

  enum PassStatus {
    ACTIVE
    INACTIVE
    EXPIRED
    REVOKED
    SUSPENDED
  }

  enum NotificationType {
    INFO
    SUCCESS
    WARNING
    ERROR
  }

  enum AuditSeverity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum AuditCategory {
    AUTH
    DATA
    SYSTEM
    SECURITY
    COMPLIANCE
  }

  enum BulkOperationType {
    IMPORT
    EXPORT
    GENERATE_PASSES
    UPDATE_STATUS
    DELETE
  }

  enum BulkOperationStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
    CANCELLED
  }

  # Input Types
  input UserInput {
    email: String!
    name: String!
    phone: String
    role: UserRole!
    institutionId: String!
  }

  input StudentInput {
    userId: String!
    studentId: String!
    department: String!
    course: String!
    year: Int!
    enrollmentDate: Date!
    graduationDate: Date
    institutionId: String!
  }

  input ApplicationInput {
    studentId: String!
    institutionId: String!
    documents: JSON
    notes: String
  }

  input ApplicationUpdateInput {
    status: ApplicationStatus
    notes: String
    reviewerId: String
  }

  input PassInput {
    studentId: String!
    applicationId: String!
    institutionId: String!
    validFrom: Date!
    validUntil: Date!
  }

  input SearchInput {
    query: String!
    filters: JSON
    sort: JSON
    size: Int
    from: Int
    includeTypes: [String!]
    excludeTypes: [String!]
  }

  input NotificationPreferencesInput {
    email: Boolean!
    push: Boolean!
    realtime: Boolean!
    applicationUpdates: Boolean!
    passUpdates: Boolean!
    systemAlerts: Boolean!
    weeklyDigest: Boolean!
  }

  input AuditLogFilter {
    userId: String
    institutionId: String
    action: String
    entityType: String
    entityId: String
    category: AuditCategory
    severity: AuditSeverity
    success: Boolean
    dateRange: DateRangeInput
    page: Int
    limit: Int
  }

  input DateRangeInput {
    start: Date!
    end: Date!
  }

  # Queries
  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users(
      institutionId: String
      role: UserRole
      isActive: Boolean
      page: Int
      limit: Int
      search: String
    ): UserConnection!

    # Student queries
    student(id: ID!): Student
    students(
      institutionId: String
      department: String
      year: Int
      status: StudentStatus
      page: Int
      limit: Int
      search: String
    ): StudentConnection!

    # Application queries
    application(id: ID!): Application
    applications(
      institutionId: String
      studentId: String
      status: ApplicationStatus
      dateRange: DateRangeInput
      page: Int
      limit: Int
      search: String
    ): ApplicationConnection!

    # Pass queries
    pass(id: ID!): Pass
    passes(
      institutionId: String
      studentId: String
      status: PassStatus
      dateRange: DateRangeInput
      page: Int
      limit: Int
      search: String
    ): PassConnection!

    # Institution queries
    institution(id: ID!): Institution
    institutions(
      isActive: Boolean
      page: Int
      limit: Int
      search: String
    ): InstitutionConnection!

    # Statistics
    dashboardStats(institutionId: String): DashboardStats!
    institutionStats(id: ID!): InstitutionStats!

    # Search
    search(input: SearchInput!): SearchResponse!
    suggestions(query: String!, size: Int): [String!]!

    # Notifications
    notifications(
      unreadOnly: Boolean
      page: Int
      limit: Int
    ): NotificationConnection!
    notificationPreferences: NotificationPreferencesInput!

    # Audit logs
    auditLogs(filter: AuditLogFilter!): AuditLogConnection!
    auditStats(
      institutionId: String
      dateRange: DateRangeInput
    ): JSON!
    complianceReport(
      institutionId: String
      period: String
    ): JSON!

    # Bulk operations
    bulkOperation(id: ID!): BulkOperation
    bulkOperations(
      userId: String
      type: BulkOperationType
      status: BulkOperationStatus
      page: Int
      limit: Int
    ): BulkOperationConnection!
  }

  # Mutations
  type Mutation {
    # Authentication
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
    refreshToken: AuthPayload!
    forgotPassword(email: String!): Boolean!
    resetPassword(token: String!, password: String!): Boolean!

    # User mutations
    createUser(input: UserInput!): User!
    updateUser(id: ID!, input: UserInput!): User!
    deleteUser(id: ID!): Boolean!
    activateUser(id: ID!): User!
    deactivateUser(id: ID!): User!

    # Student mutations
    createStudent(input: StudentInput!): Student!
    updateStudent(id: ID!, input: StudentInput!): Student!
    deleteStudent(id: ID!): Boolean!

    # Application mutations
    createApplication(input: ApplicationInput!): Application!
    updateApplication(id: ID!, input: ApplicationUpdateInput!): Application!
    reviewApplication(id: ID!, status: ApplicationStatus!, notes: String): Application!
    deleteApplication(id: ID!): Boolean!

    # Pass mutations
    generatePass(applicationId: String!): Pass!
    updatePassStatus(id: ID!, status: PassStatus!): Pass!
    revokePass(id: ID!, reason: String!): Pass!
    downloadPass(id: ID!): String!

    # Notification mutations
    markNotificationRead(id: ID!): Notification!
    markAllNotificationsRead: Boolean!
    updateNotificationPreferences(input: NotificationPreferencesInput!): Boolean!
    subscribeToPush(subscription: JSON!): Boolean!

    # Bulk operations
    importUsers(file: String!, options: JSON): BulkOperation!
    exportUsers(filters: JSON, format: String): BulkOperation!
    generatePassesBulk(applicationIds: [String!]!): BulkOperation!
    updateStatusBulk(
      entityType: String!
      entityIds: [String!]!
      status: String!
    ): BulkOperation!
    cancelBulkOperation(id: ID!): Boolean!

    # System operations
    reindexSearch(institutionId: String): JSON!
    clearCache(pattern: String): Boolean!
    sendTestNotification(userId: String!, type: String!): Boolean!
  }

  # Subscriptions
  type Subscription {
    # Real-time application updates
    applicationUpdated(institutionId: String): Application!
    applicationCreated(institutionId: String): Application!

    # Real-time pass updates
    passUpdated(studentId: String): Pass!
    passGenerated(studentId: String): Pass!

    # Real-time notifications
    notificationReceived(userId: String!): Notification!
    
    # System alerts
    systemAlert: JSON!
    
    # Bulk operation progress
    bulkOperationProgress(userId: String!): BulkOperation!
    
    # User presence
    userPresence: JSON!
  }

  # Connection types for pagination
  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type UserEdge {
    node: User!
    cursor: String!
  }

  type StudentConnection {
    edges: [StudentEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type StudentEdge {
    node: Student!
    cursor: String!
  }

  type ApplicationConnection {
    edges: [ApplicationEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type ApplicationEdge {
    node: Application!
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

  type InstitutionConnection {
    edges: [InstitutionEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type InstitutionEdge {
    node: Institution!
    cursor: String!
  }

  type NotificationConnection {
    edges: [NotificationEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type NotificationEdge {
    node: Notification!
    cursor: String!
  }

  type AuditLogConnection {
    edges: [AuditLogEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type AuditLogEdge {
    node: AuditLog!
    cursor: String!
  }

  type BulkOperationConnection {
    edges: [BulkOperationEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type BulkOperationEdge {
    node: BulkOperation!
    cursor: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
    expiresAt: Date!
  }
`;