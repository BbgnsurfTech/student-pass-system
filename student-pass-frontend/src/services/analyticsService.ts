import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface KeyMetrics {
  overview: {
    totalApplications: number;
    totalStudents: number;
    totalPasses: number;
    totalAccessLogs: number;
  };
  trends: {
    applications: Array<{ date: string; count: number }>;
    applicationsByStatus: Array<{ status: string; _count: number }>;
    passDistribution: Array<{ passType: string; _count: number }>;
    accessPatterns: Array<{ hour: number; count: number }>;
  };
  timestamp: string;
}

export interface ApplicationAnalytics {
  applicationVolume: Array<{ appliedAt: Date; _count: number }>;
  conversionFunnel: Array<{ status: string; count: number }>;
  processingTimes: Array<{ status: string; processingTime: number }>;
  departmentBreakdown: Array<{ departmentId: string; _count: number }>;
  rejectionReasons: Array<{ reason: string; count: number }>;
  timestamp: string;
}

export interface AccessAnalytics {
  accessVolume: Array<{ accessTime: Date; _count: number }>;
  peakUsageTimes: Array<{ hour: number; count: number }>;
  accessPointBreakdown: Array<{ accessPointId: string; _count: number }>;
  deniedAccessReasons: Array<{ reason: string; count: number }>;
  securityIncidents: number;
  timestamp: string;
}

export interface UserEngagement {
  activeUsers: number;
  userGrowth: Array<{ createdAt: Date; _count: number }>;
  engagementMetrics: {
    totalAccess: number;
    uniqueUsers: number;
    averageSessionsPerUser: number;
  };
  retentionRates: {
    newUsers: number;
    activeUsers: number;
    retentionRate: number;
  };
  timestamp: string;
}

export interface SystemStatus {
  realTime: {
    activeUsers: number;
    recentApplications: number;
    recentAccess: number;
    timestamp: string;
  };
  systemHealth: {
    database: string;
    timestamp: string;
  };
  alerts: Array<{
    type: string;
    message: string;
    value?: string;
    timestamp: string;
  }>;
}

export interface RealTimeData {
  timestamp: string;
  metrics: {
    recentApplications: number;
    recentAccessAttempts: number;
    activeUsers: number;
  };
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  queue: {
    pending: number;
    underReview: number;
    total: number;
  };
  trends: {
    applications: Array<{ time: string; count: number }>;
    access: Array<{ time: string; count: number }>;
    denials: Array<{ time: string; count: number }>;
  };
}

export class AnalyticsService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private realTimeCallbacks: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.token = localStorage.getItem('token');
    this.setupAxiosInterceptors();
  }

  private setupAxiosInterceptors() {
    axios.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  /**
   * Initialize real-time analytics connection
   */
  initializeRealTime(userData: { userId: string; role: string; schoolId?: string }) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(API_BASE_URL.replace('/api', ''), {
      auth: {
        token: this.token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to analytics real-time service');
      this.reconnectAttempts = 0;
      
      // Join analytics room
      this.socket?.emit('join-analytics', userData);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from analytics real-time service');
      this.handleReconnection();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Analytics connection error:', error);
      this.handleReconnection();
    });

    // Set up real-time event listeners
    this.setupRealTimeListeners();
  }

  private setupRealTimeListeners() {
    if (!this.socket) return;

    this.socket.on('realtime-update', (data: RealTimeData) => {
      this.notifyCallbacks('realtime-update', data);
    });

    this.socket.on('metrics-update', (data: any) => {
      this.notifyCallbacks('metrics-update', data);
    });

    this.socket.on('application-created', (data: any) => {
      this.notifyCallbacks('application-created', data);
    });

    this.socket.on('access-event', (data: any) => {
      this.notifyCallbacks('access-event', data);
    });

    this.socket.on('status-change', (data: any) => {
      this.notifyCallbacks('status-change', data);
    });

    this.socket.on('error', (error: any) => {
      console.error('Real-time analytics error:', error);
    });
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.socket?.connect();
      }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
    }
  }

  private notifyCallbacks(event: string, data: any) {
    const callback = this.realTimeCallbacks.get(event);
    if (callback) {
      callback(data);
    }
  }

  /**
   * Subscribe to real-time updates
   */
  onRealTimeUpdate(event: string, callback: (data: any) => void) {
    this.realTimeCallbacks.set(event, callback);
  }

  /**
   * Unsubscribe from real-time updates
   */
  offRealTimeUpdate(event: string) {
    this.realTimeCallbacks.delete(event);
  }

  /**
   * Request specific metrics
   */
  requestMetrics(filters: any) {
    this.socket?.emit('request-metrics', filters);
  }

  /**
   * Get key metrics
   */
  async getKeyMetrics(filters: {
    schoolId?: string;
    dateRange?: string;
  }): Promise<KeyMetrics> {
    const params = new URLSearchParams();
    if (filters.schoolId) params.append('schoolId', filters.schoolId);
    if (filters.dateRange) params.append('dateRange', filters.dateRange);

    const response = await axios.get(`${API_BASE_URL}/analytics/metrics?${params}`);
    return response.data;
  }

  /**
   * Get application analytics
   */
  async getApplicationAnalytics(filters: {
    schoolId?: string;
    departmentId?: string;
    dateRange?: string;
  }): Promise<ApplicationAnalytics> {
    const params = new URLSearchParams();
    if (filters.schoolId) params.append('schoolId', filters.schoolId);
    if (filters.departmentId) params.append('departmentId', filters.departmentId);
    if (filters.dateRange) params.append('dateRange', filters.dateRange);

    const response = await axios.get(`${API_BASE_URL}/analytics/applications?${params}`);
    return response.data;
  }

  /**
   * Get access analytics
   */
  async getAccessAnalytics(filters: {
    schoolId?: string;
    accessPointId?: string;
    dateRange?: string;
  }): Promise<AccessAnalytics> {
    const params = new URLSearchParams();
    if (filters.schoolId) params.append('schoolId', filters.schoolId);
    if (filters.accessPointId) params.append('accessPointId', filters.accessPointId);
    if (filters.dateRange) params.append('dateRange', filters.dateRange);

    const response = await axios.get(`${API_BASE_URL}/analytics/access?${params}`);
    return response.data;
  }

  /**
   * Get user engagement analytics
   */
  async getUserEngagement(filters: {
    schoolId?: string;
    dateRange?: string;
  }): Promise<UserEngagement> {
    const params = new URLSearchParams();
    if (filters.schoolId) params.append('schoolId', filters.schoolId);
    if (filters.dateRange) params.append('dateRange', filters.dateRange);

    const response = await axios.get(`${API_BASE_URL}/analytics/users?${params}`);
    return response.data;
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const response = await axios.get(`${API_BASE_URL}/analytics/realtime`);
    return response.data;
  }

  /**
   * Export analytics report
   */
  async exportReport(filters: {
    type?: 'comprehensive' | 'applications' | 'access' | 'users';
    format?: 'json' | 'csv';
    schoolId?: string;
    departmentId?: string;
    dateRange?: string;
  }): Promise<Blob | any> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const response = await axios.get(`${API_BASE_URL}/analytics/export?${params}`, {
      responseType: filters.format === 'csv' ? 'blob' : 'json'
    });

    return response.data;
  }

  /**
   * Get cached analytics data
   */
  getCachedData(key: string): any {
    const cached = localStorage.getItem(`analytics_${key}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Check if cached data is still valid (5 minutes)
      if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
        return parsed.data;
      }
    }
    return null;
  }

  /**
   * Cache analytics data
   */
  setCachedData(key: string, data: any) {
    const cached = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(`analytics_${key}`, JSON.stringify(cached));
  }

  /**
   * Clear cached data
   */
  clearCache() {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('analytics_')) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Update authentication token
   */
  updateToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  /**
   * Disconnect from real-time service
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.realTimeCallbacks.clear();
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Utility method to format data for charts
   */
  formatChartData(data: Array<any>, xField: string, yField: string) {
    return {
      labels: data.map(item => item[xField]),
      datasets: [{
        data: data.map(item => item[yField])
      }]
    };
  }

  /**
   * Utility method to calculate percentage change
   */
  calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Utility method to format numbers
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Get date range options
   */
  getDateRangeOptions() {
    return [
      { value: '7d', label: 'Last 7 days' },
      { value: '30d', label: 'Last 30 days' },
      { value: '90d', label: 'Last 90 days' },
      { value: '1y', label: 'Last year' },
      { value: 'week', label: 'This week' },
      { value: 'month', label: 'This month' }
    ];
  }
}

export const analyticsService = new AnalyticsService();