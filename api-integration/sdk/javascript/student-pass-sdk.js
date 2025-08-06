/**
 * Student Pass System JavaScript SDK
 * Official SDK for integrating with Student Pass System APIs
 */

class StudentPassSDK {
  constructor(options = {}) {
    this.apiKey = options.apiKey;
    this.baseURL = options.baseURL || 'https://api.studentpass.com/v1';
    this.timeout = options.timeout || 30000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    if (!this.apiKey) {
      throw new Error('API key is required');
    }
    
    // Initialize modules
    this.students = new StudentsModule(this);
    this.passes = new PassesModule(this);
    this.analytics = new AnalyticsModule(this);
    this.devices = new DevicesModule(this);
    this.webhooks = new WebhooksModule(this);
    this.institutions = new InstitutionsModule(this);
    this.compliance = new ComplianceModule(this);
  }

  // Core HTTP request method
  async request(method, endpoint, data = null, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'StudentPassSDK/1.0.0',
        ...options.headers
      },
      timeout: options.timeout || this.timeout
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new StudentPassError(
            errorData.message || `HTTP ${response.status}`,
            response.status,
            errorData.code,
            errorData.details
          );
        }

        return await response.json();
        
      } catch (error) {
        lastError = error;
        
        if (attempt < this.retryAttempts && this.shouldRetry(error)) {
          await this.delay(this.retryDelay * attempt);
          continue;
        }
        
        break;
      }
    }
    
    throw lastError;
  }

  // HTTP method helpers
  get(endpoint, options = {}) {
    return this.request('GET', endpoint, null, options);
  }

  post(endpoint, data, options = {}) {
    return this.request('POST', endpoint, data, options);
  }

  put(endpoint, data, options = {}) {
    return this.request('PUT', endpoint, data, options);
  }

  patch(endpoint, data, options = {}) {
    return this.request('PATCH', endpoint, data, options);
  }

  delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, null, options);
  }

  // Utility methods
  shouldRetry(error) {
    return error.status >= 500 || error.code === 'NETWORK_ERROR';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Build query string from params
  buildQueryString(params) {
    const query = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => query.append(key, v));
        } else {
          query.append(key, value);
        }
      }
    });
    
    return query.toString();
  }
}

// Students Module
class StudentsModule {
  constructor(sdk) {
    this.sdk = sdk;
  }

  async list(params = {}) {
    const queryString = this.sdk.buildQueryString(params);
    return this.sdk.get(`/students${queryString ? `?${queryString}` : ''}`);
  }

  async get(studentId) {
    return this.sdk.get(`/students/${studentId}`);
  }

  async create(studentData) {
    return this.sdk.post('/students', studentData);
  }

  async update(studentId, updates) {
    return this.sdk.patch(`/students/${studentId}`, updates);
  }

  async delete(studentId) {
    return this.sdk.delete(`/students/${studentId}`);
  }

  async getPasses(studentId) {
    return this.sdk.get(`/students/${studentId}/passes`);
  }

  async getAnalytics(studentId, timeRange = {}) {
    const queryString = this.sdk.buildQueryString(timeRange);
    return this.sdk.get(`/students/${studentId}/analytics${queryString ? `?${queryString}` : ''}`);
  }

  async uploadPhoto(studentId, photoFile) {
    const formData = new FormData();
    formData.append('photo', photoFile);

    return this.sdk.request('POST', `/students/${studentId}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  async bulkImport(csvFile) {
    const formData = new FormData();
    formData.append('file', csvFile);

    return this.sdk.request('POST', '/students/bulk-import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
}

// Passes Module
class PassesModule {
  constructor(sdk) {
    this.sdk = sdk;
  }

  async list(params = {}) {
    const queryString = this.sdk.buildQueryString(params);
    return this.sdk.get(`/passes${queryString ? `?${queryString}` : ''}`);
  }

  async get(passId) {
    return this.sdk.get(`/passes/${passId}`);
  }

  async create(passData) {
    return this.sdk.post('/passes', passData);
  }

  async update(passId, updates) {
    return this.sdk.patch(`/passes/${passId}`, updates);
  }

  async activate(passId) {
    return this.sdk.post(`/passes/${passId}/activate`);
  }

  async deactivate(passId) {
    return this.sdk.post(`/passes/${passId}/deactivate`);
  }

  async getHistory(passId) {
    return this.sdk.get(`/passes/${passId}/history`);
  }

  async verify(passId, deviceId, method = 'qr') {
    return this.sdk.post(`/passes/${passId}/verify`, {
      deviceId,
      method,
      timestamp: new Date().toISOString()
    });
  }

  async generateQR(passId, options = {}) {
    const queryString = this.sdk.buildQueryString(options);
    return this.sdk.get(`/passes/${passId}/qr${queryString ? `?${queryString}` : ''}`);
  }
}

// Analytics Module
class AnalyticsModule {
  constructor(sdk) {
    this.sdk = sdk;
  }

  async getDashboard(timeRange = {}) {
    const queryString = this.sdk.buildQueryString(timeRange);
    return this.sdk.get(`/analytics/dashboard${queryString ? `?${queryString}` : ''}`);
  }

  async getAttendanceReport(params = {}) {
    const queryString = this.sdk.buildQueryString(params);
    return this.sdk.get(`/analytics/attendance${queryString ? `?${queryString}` : ''}`);
  }

  async getSecurityAlerts(params = {}) {
    const queryString = this.sdk.buildQueryString(params);
    return this.sdk.get(`/analytics/security-alerts${queryString ? `?${queryString}` : ''}`);
  }

  async getBehaviorAnalysis(studentId, timeRange = {}) {
    const queryString = this.sdk.buildQueryString(timeRange);
    return this.sdk.get(`/analytics/behavior/${studentId}${queryString ? `?${queryString}` : ''}`);
  }

  async getPredictiveInsights(institutionId) {
    return this.sdk.get(`/analytics/predictions/${institutionId}`);
  }

  async getAnomalies(params = {}) {
    const queryString = this.sdk.buildQueryString(params);
    return this.sdk.get(`/analytics/anomalies${queryString ? `?${queryString}` : ''}`);
  }

  async exportReport(type, params = {}) {
    const queryString = this.sdk.buildQueryString(params);
    return this.sdk.get(`/analytics/export/${type}${queryString ? `?${queryString}` : ''}`);
  }
}

// Devices Module
class DevicesModule {
  constructor(sdk) {
    this.sdk = sdk;
  }

  async list(params = {}) {
    const queryString = this.sdk.buildQueryString(params);
    return this.sdk.get(`/devices${queryString ? `?${queryString}` : ''}`);
  }

  async get(deviceId) {
    return this.sdk.get(`/devices/${deviceId}`);
  }

  async register(deviceData) {
    return this.sdk.post('/devices', deviceData);
  }

  async update(deviceId, updates) {
    return this.sdk.patch(`/devices/${deviceId}`, updates);
  }

  async delete(deviceId) {
    return this.sdk.delete(`/devices/${deviceId}`);
  }

  async getMetrics(deviceId, timeRange = {}) {
    const queryString = this.sdk.buildQueryString(timeRange);
    return this.sdk.get(`/devices/${deviceId}/metrics${queryString ? `?${queryString}` : ''}`);
  }

  async getHealth() {
    return this.sdk.get('/devices/health');
  }

  async calibrate(deviceId) {
    return this.sdk.post(`/devices/${deviceId}/calibrate`);
  }

  async updateFirmware(deviceId, firmwareData) {
    return this.sdk.post(`/devices/${deviceId}/firmware`, firmwareData);
  }
}

// Webhooks Module
class WebhooksModule {
  constructor(sdk) {
    this.sdk = sdk;
  }

  async list() {
    return this.sdk.get('/webhooks');
  }

  async get(webhookId) {
    return this.sdk.get(`/webhooks/${webhookId}`);
  }

  async create(webhookData) {
    return this.sdk.post('/webhooks', webhookData);
  }

  async update(webhookId, updates) {
    return this.sdk.patch(`/webhooks/${webhookId}`, updates);
  }

  async delete(webhookId) {
    return this.sdk.delete(`/webhooks/${webhookId}`);
  }

  async test(webhookId) {
    return this.sdk.post(`/webhooks/${webhookId}/test`);
  }

  async getDeliveries(webhookId, params = {}) {
    const queryString = this.sdk.buildQueryString(params);
    return this.sdk.get(`/webhooks/${webhookId}/deliveries${queryString ? `?${queryString}` : ''}`);
  }

  // Verify webhook signature
  verifySignature(payload, signature, secret) {
    const crypto = require('crypto');
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

// Institutions Module
class InstitutionsModule {
  constructor(sdk) {
    this.sdk = sdk;
  }

  async list(params = {}) {
    const queryString = this.sdk.buildQueryString(params);
    return this.sdk.get(`/institutions${queryString ? `?${queryString}` : ''}`);
  }

  async get(institutionId) {
    return this.sdk.get(`/institutions/${institutionId}`);
  }

  async create(institutionData) {
    return this.sdk.post('/institutions', institutionData);
  }

  async update(institutionId, updates) {
    return this.sdk.patch(`/institutions/${institutionId}`, updates);
  }

  async getAnalytics(institutionId, timeRange = {}) {
    const queryString = this.sdk.buildQueryString(timeRange);
    return this.sdk.get(`/institutions/${institutionId}/analytics${queryString ? `?${queryString}` : ''}`);
  }

  async getSettings(institutionId) {
    return this.sdk.get(`/institutions/${institutionId}/settings`);
  }

  async updateSettings(institutionId, settings) {
    return this.sdk.put(`/institutions/${institutionId}/settings`, settings);
  }
}

// Compliance Module
class ComplianceModule {
  constructor(sdk) {
    this.sdk = sdk;
  }

  async getReport(region) {
    return this.sdk.get(`/compliance/report/${region}`);
  }

  async validateData(data, region) {
    return this.sdk.post(`/compliance/validate/${region}`, data);
  }

  async getRequirements(region) {
    return this.sdk.get(`/compliance/requirements/${region}`);
  }

  async exportAuditTrail(params = {}) {
    const queryString = this.sdk.buildQueryString(params);
    return this.sdk.get(`/compliance/audit-trail${queryString ? `?${queryString}` : ''}`);
  }

  async requestDataDeletion(studentId, reason) {
    return this.sdk.post('/compliance/data-deletion', {
      studentId,
      reason,
      requestedAt: new Date().toISOString()
    });
  }

  async exportStudentData(studentId, format = 'json') {
    return this.sdk.get(`/compliance/export-data/${studentId}?format=${format}`);
  }
}

// Custom Error Class
class StudentPassError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'StudentPassError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Event types for webhook subscriptions
const EVENT_TYPES = {
  STUDENT_CREATED: 'student.created',
  STUDENT_UPDATED: 'student.updated',
  STUDENT_DELETED: 'student.deleted',
  PASS_CREATED: 'pass.created',
  PASS_ACTIVATED: 'pass.activated',
  ENTRY_RECORDED: 'entry.recorded',
  EXIT_RECORDED: 'exit.recorded',
  SECURITY_ALERT: 'security.alert_created',
  DEVICE_OFFLINE: 'device.offline'
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = { StudentPassSDK, StudentPassError, EVENT_TYPES };
} else if (typeof define === 'function' && define.amd) {
  // AMD
  define(() => ({ StudentPassSDK, StudentPassError, EVENT_TYPES }));
} else {
  // Browser globals
  window.StudentPassSDK = StudentPassSDK;
  window.StudentPassError = StudentPassError;
  window.StudentPassEventTypes = EVENT_TYPES;
}

export { StudentPassSDK, StudentPassError, EVENT_TYPES };