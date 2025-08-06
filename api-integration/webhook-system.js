/**
 * Advanced Webhook System
 * Real-time event delivery with retry logic and security
 */

import crypto from 'crypto';
import axios from 'axios';
import { EventEmitter } from 'events';

class WebhookSystem extends EventEmitter {
  constructor() {
    super();
    this.webhooks = new Map();
    this.eventQueue = [];
    this.retryQueue = [];
    this.deliveryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelays = [1000, 5000, 30000]; // 1s, 5s, 30s
    this.timeout = 10000; // 10s timeout
    
    this.startProcessing();
  }

  // Register a webhook endpoint
  registerWebhook(config) {
    const {
      id,
      url,
      events,
      secret,
      headers = {},
      filters = {},
      transformations = {},
      retryPolicy = {},
      metadata = {}
    } = config;

    if (!id || !url || !events || !Array.isArray(events)) {
      throw new Error('Invalid webhook configuration');
    }

    const webhook = {
      id,
      url,
      events: new Set(events),
      secret,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'StudentPassSystem-Webhooks/1.0',
        ...headers
      },
      filters,
      transformations,
      retryPolicy: {
        maxRetries: retryPolicy.maxRetries || this.maxRetries,
        delays: retryPolicy.delays || this.retryDelays,
        backoffMultiplier: retryPolicy.backoffMultiplier || 1,
        maxDelay: retryPolicy.maxDelay || 300000 // 5 minutes
      },
      metadata,
      createdAt: new Date(),
      status: 'active',
      stats: {
        totalEvents: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        lastDelivery: null,
        averageResponseTime: 0
      }
    };

    this.webhooks.set(id, webhook);
    return webhook;
  }

  // Remove a webhook
  unregisterWebhook(id) {
    return this.webhooks.delete(id);
  }

  // Update webhook configuration
  updateWebhook(id, updates) {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      throw new Error(`Webhook ${id} not found`);
    }

    const updatedWebhook = {
      ...webhook,
      ...updates,
      updatedAt: new Date()
    };

    this.webhooks.set(id, updatedWebhook);
    return updatedWebhook;
  }

  // Emit an event to all relevant webhooks
  async emit(eventType, data, metadata = {}) {
    const event = {
      id: this.generateEventId(),
      type: eventType,
      data,
      metadata: {
        ...metadata,
        timestamp: new Date(),
        source: 'student-pass-system',
        version: '1.0'
      },
      createdAt: new Date()
    };

    // Find webhooks that listen to this event type
    const relevantWebhooks = Array.from(this.webhooks.values())
      .filter(webhook => 
        webhook.status === 'active' && 
        webhook.events.has(eventType)
      );

    // Queue deliveries
    for (const webhook of relevantWebhooks) {
      if (this.passesFilters(event, webhook.filters)) {
        this.queueDelivery(webhook, event);
      }
    }

    super.emit('event', event);
    return event;
  }

  // Queue a delivery for processing
  queueDelivery(webhook, event) {
    const delivery = {
      id: this.generateDeliveryId(),
      webhookId: webhook.id,
      webhook,
      event,
      attempt: 0,
      queuedAt: new Date(),
      status: 'queued'
    };

    this.eventQueue.push(delivery);
    this.emit('delivery-queued', delivery);
  }

  // Start processing queued events
  startProcessing() {
    setInterval(() => {
      this.processQueue();
      this.processRetries();
    }, 1000);
  }

  // Process the main event queue
  async processQueue() {
    while (this.eventQueue.length > 0) {
      const delivery = this.eventQueue.shift();
      try {
        await this.deliverEvent(delivery);
      } catch (error) {
        this.handleDeliveryError(delivery, error);
      }
    }
  }

  // Process retry queue
  async processRetries() {
    const now = new Date();
    const readyRetries = this.retryQueue.filter(
      delivery => delivery.retryAt <= now
    );

    for (const delivery of readyRetries) {
      const index = this.retryQueue.indexOf(delivery);
      this.retryQueue.splice(index, 1);
      
      try {
        await this.deliverEvent(delivery);
      } catch (error) {
        this.handleDeliveryError(delivery, error);
      }
    }
  }

  // Deliver event to webhook endpoint
  async deliverEvent(delivery) {
    const { webhook, event } = delivery;
    const startTime = Date.now();

    delivery.status = 'delivering';
    delivery.attempt++;
    delivery.deliveredAt = new Date();

    // Transform event data if needed
    const transformedData = this.transformEvent(event, webhook.transformations);

    // Create payload
    const payload = {
      id: event.id,
      type: event.type,
      created: event.createdAt.toISOString(),
      data: transformedData,
      metadata: event.metadata
    };

    // Generate signature
    const signature = this.generateSignature(payload, webhook.secret);

    // Prepare headers
    const headers = {
      ...webhook.headers,
      'X-StudentPass-Event': event.type,
      'X-StudentPass-Delivery': delivery.id,
      'X-StudentPass-Signature': signature,
      'X-StudentPass-Timestamp': Math.floor(Date.now() / 1000)
    };

    try {
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: this.timeout,
        validateStatus: (status) => status < 300
      });

      const responseTime = Date.now() - startTime;
      
      delivery.status = 'delivered';
      delivery.response = {
        status: response.status,
        headers: response.headers,
        data: response.data,
        responseTime
      };

      // Update webhook stats
      webhook.stats.totalEvents++;
      webhook.stats.successfulDeliveries++;
      webhook.stats.lastDelivery = new Date();
      webhook.stats.averageResponseTime = 
        (webhook.stats.averageResponseTime + responseTime) / 2;

      this.emit('delivery-success', delivery);

    } catch (error) {
      delivery.status = 'failed';
      delivery.error = {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : null
      };

      throw error;
    }
  }

  // Handle delivery errors and retries
  handleDeliveryError(delivery, error) {
    const { webhook } = delivery;
    const maxRetries = webhook.retryPolicy.maxRetries;

    webhook.stats.failedDeliveries++;

    if (delivery.attempt < maxRetries) {
      const delayIndex = Math.min(delivery.attempt - 1, webhook.retryPolicy.delays.length - 1);
      const baseDelay = webhook.retryPolicy.delays[delayIndex];
      const multiplier = Math.pow(webhook.retryPolicy.backoffMultiplier, delivery.attempt - 1);
      const delay = Math.min(baseDelay * multiplier, webhook.retryPolicy.maxDelay);

      delivery.retryAt = new Date(Date.now() + delay);
      delivery.status = 'retry-scheduled';
      
      this.retryQueue.push(delivery);
      this.emit('delivery-retry-scheduled', delivery);
    } else {
      delivery.status = 'failed-permanently';
      this.emit('delivery-failed-permanently', delivery);
    }

    this.emit('delivery-error', delivery, error);
  }

  // Check if event passes webhook filters
  passesFilters(event, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return true;
    }

    for (const [key, condition] of Object.entries(filters)) {
      const value = this.getNestedValue(event, key);
      
      if (!this.evaluateCondition(value, condition)) {
        return false;
      }
    }

    return true;
  }

  // Evaluate filter condition
  evaluateCondition(value, condition) {
    if (typeof condition === 'object') {
      if (condition.$eq !== undefined) return value === condition.$eq;
      if (condition.$ne !== undefined) return value !== condition.$ne;
      if (condition.$in !== undefined) return condition.$in.includes(value);
      if (condition.$nin !== undefined) return !condition.$nin.includes(value);
      if (condition.$gt !== undefined) return value > condition.$gt;
      if (condition.$gte !== undefined) return value >= condition.$gte;
      if (condition.$lt !== undefined) return value < condition.$lt;
      if (condition.$lte !== undefined) return value <= condition.$lte;
      if (condition.$regex !== undefined) {
        const regex = new RegExp(condition.$regex, condition.$options || '');
        return regex.test(value);
      }
    }

    return value === condition;
  }

  // Transform event data based on webhook transformations
  transformEvent(event, transformations) {
    if (!transformations || Object.keys(transformations).length === 0) {
      return event.data;
    }

    const transformed = {};

    for (const [outputKey, transformation] of Object.entries(transformations)) {
      if (typeof transformation === 'string') {
        // Simple field mapping
        transformed[outputKey] = this.getNestedValue(event.data, transformation);
      } else if (typeof transformation === 'object') {
        if (transformation.source) {
          transformed[outputKey] = this.getNestedValue(event.data, transformation.source);
        }
        
        if (transformation.format) {
          transformed[outputKey] = this.formatValue(
            transformed[outputKey], 
            transformation.format
          );
        }
        
        if (transformation.default !== undefined && transformed[outputKey] === undefined) {
          transformed[outputKey] = transformation.default;
        }
      }
    }

    return transformed;
  }

  // Format value based on format specification
  formatValue(value, format) {
    switch (format) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'iso-date':
        return value instanceof Date ? value.toISOString() : value;
      case 'unix-timestamp':
        return value instanceof Date ? Math.floor(value.getTime() / 1000) : value;
      default:
        return value;
    }
  }

  // Get nested value from object using dot notation
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => 
      current && current[key] !== undefined ? current[key] : undefined, obj
    );
  }

  // Generate webhook signature
  generateSignature(payload, secret) {
    if (!secret) return null;
    
    const payloadString = JSON.stringify(payload);
    return 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  // Verify webhook signature
  verifySignature(payload, signature, secret) {
    if (!secret || !signature) return false;
    
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // Generate unique event ID
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate unique delivery ID
  generateDeliveryId() {
    return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get webhook statistics
  getWebhookStats(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    return webhook ? webhook.stats : null;
  }

  // Get system-wide statistics
  getSystemStats() {
    const webhooks = Array.from(this.webhooks.values());
    
    return {
      totalWebhooks: webhooks.length,
      activeWebhooks: webhooks.filter(w => w.status === 'active').length,
      totalEvents: webhooks.reduce((sum, w) => sum + w.stats.totalEvents, 0),
      successfulDeliveries: webhooks.reduce((sum, w) => sum + w.stats.successfulDeliveries, 0),
      failedDeliveries: webhooks.reduce((sum, w) => sum + w.stats.failedDeliveries, 0),
      queuedEvents: this.eventQueue.length,
      retryQueueSize: this.retryQueue.length,
      averageResponseTime: webhooks.length > 0 
        ? webhooks.reduce((sum, w) => sum + w.stats.averageResponseTime, 0) / webhooks.length 
        : 0
    };
  }

  // Test webhook endpoint
  async testWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    const testEvent = {
      id: this.generateEventId(),
      type: 'webhook.test',
      data: { message: 'This is a test webhook delivery' },
      metadata: {
        timestamp: new Date(),
        source: 'student-pass-system',
        version: '1.0',
        test: true
      },
      createdAt: new Date()
    };

    const delivery = {
      id: this.generateDeliveryId(),
      webhookId: webhook.id,
      webhook,
      event: testEvent,
      attempt: 0,
      queuedAt: new Date(),
      status: 'queued'
    };

    try {
      await this.deliverEvent(delivery);
      return {
        success: true,
        delivery: {
          id: delivery.id,
          status: delivery.status,
          responseTime: delivery.response?.responseTime,
          response: delivery.response
        }
      };
    } catch (error) {
      return {
        success: false,
        delivery: {
          id: delivery.id,
          status: delivery.status,
          error: delivery.error
        },
        error: error.message
      };
    }
  }

  // Get delivery history
  getDeliveryHistory(webhookId, limit = 100) {
    // In a real implementation, this would query a database
    // For now, we'll return a placeholder
    return [];
  }

  // Event type definitions for webhook registration
  static get EVENT_TYPES() {
    return {
      // Student events
      STUDENT_CREATED: 'student.created',
      STUDENT_UPDATED: 'student.updated',
      STUDENT_DELETED: 'student.deleted',
      STUDENT_STATUS_CHANGED: 'student.status_changed',
      
      // Pass events
      PASS_CREATED: 'pass.created',
      PASS_UPDATED: 'pass.updated',
      PASS_ACTIVATED: 'pass.activated',
      PASS_DEACTIVATED: 'pass.deactivated',
      PASS_EXPIRED: 'pass.expired',
      
      // Entry/Exit events
      ENTRY_RECORDED: 'entry.recorded',
      EXIT_RECORDED: 'exit.recorded',
      ENTRY_DENIED: 'entry.denied',
      
      // Security events
      SECURITY_ALERT_CREATED: 'security.alert_created',
      ANOMALY_DETECTED: 'security.anomaly_detected',
      BREACH_DETECTED: 'security.breach_detected',
      
      // Device events
      DEVICE_ONLINE: 'device.online',
      DEVICE_OFFLINE: 'device.offline',
      DEVICE_ERROR: 'device.error',
      DEVICE_MAINTENANCE: 'device.maintenance',
      
      // System events
      SYSTEM_MAINTENANCE: 'system.maintenance',
      BACKUP_COMPLETED: 'system.backup_completed',
      UPDATE_AVAILABLE: 'system.update_available'
    };
  }
}

export default WebhookSystem;