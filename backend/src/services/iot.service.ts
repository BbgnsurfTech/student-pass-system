import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { getCacheService } from './cache.service';
import { getNotificationService } from './notification.service';
import * as mqtt from 'mqtt';
import * as WebSocket from 'ws';
import { EventEmitter } from 'events';
import axios from 'axios';

export interface IoTDeviceConfig {
  id: string;
  name: string;
  type: 'ACCESS_SCANNER' | 'CAMERA' | 'SENSOR_OCCUPANCY' | 'SENSOR_TEMPERATURE' | 'SENSOR_AIR_QUALITY' | 'SMART_LOCK' | 'TURNSTILE' | 'GATEWAY' | 'BEACON';
  location?: string;
  ipAddress?: string;
  macAddress?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  configuration: {
    mqttTopic?: string;
    httpEndpoint?: string;
    pollingInterval?: number;
    thresholds?: Record<string, number>;
    alertRules?: Array<{
      condition: string;
      value: number;
      alertType: string;
      severity: string;
    }>;
  };
  credentials: {
    username?: string;
    password?: string;
    apiKey?: string;
    certificate?: string;
  };
}

export interface SensorReading {
  deviceId: string;
  sensorType: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface DeviceStatus {
  deviceId: string;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'MAINTENANCE';
  lastSeen: Date;
  batteryLevel?: number;
  signalStrength?: number;
  uptime?: number;
  errorMessage?: string;
}

export interface AccessEvent {
  deviceId: string;
  passId?: string;
  studentId?: string;
  accessType: 'ENTRY' | 'EXIT' | 'DENIED';
  timestamp: Date;
  location: string;
  metadata?: Record<string, any>;
}

export interface OccupancyData {
  location: string;
  currentOccupancy: number;
  maxCapacity: number;
  utilizationPercentage: number;
  timestamp: Date;
}

export class IoTDeviceService extends EventEmitter {
  private cacheService = getCacheService();
  private notificationService = getNotificationService();
  private mqttClient?: mqtt.MqttClient;
  private deviceConnections: Map<string, WebSocket> = new Map();
  private devicePollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private tenantDevices: Map<string, Set<string>> = new Map();

  constructor() {
    super();
    this.initializeMqttClient();
  }

  private initializeMqttClient(): void {
    try {
      if (process.env.MQTT_BROKER_URL) {
        this.mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL, {
          username: process.env.MQTT_USERNAME,
          password: process.env.MQTT_PASSWORD,
          clientId: `student-pass-system-${Date.now()}`,
          clean: true,
          reconnectPeriod: 5000
        });

        this.mqttClient.on('connect', () => {
          logger.info('Connected to MQTT broker');
        });

        this.mqttClient.on('message', (topic, message) => {
          this.handleMqttMessage(topic, message.toString());
        });

        this.mqttClient.on('error', (error) => {
          logger.error('MQTT client error:', error);
        });
      }
    } catch (error) {
      logger.warn('Failed to initialize MQTT client:', error);
    }
  }

  /**
   * Register IoT device for a tenant
   */
  async registerDevice(
    tenantId: string,
    schoolId: string,
    deviceConfig: IoTDeviceConfig,
    db: PrismaClient
  ): Promise<void> {
    try {
      // Create device record
      const device = await db.ioTDevice.create({
        data: {
          tenantId,
          schoolId,
          deviceId: deviceConfig.id,
          name: deviceConfig.name,
          type: deviceConfig.type,
          location: deviceConfig.location,
          manufacturer: deviceConfig.manufacturer,
          model: deviceConfig.model,
          firmwareVersion: deviceConfig.firmwareVersion,
          ipAddress: deviceConfig.ipAddress,
          macAddress: deviceConfig.macAddress,
          status: 'OFFLINE',
          configuration: deviceConfig.configuration as any,
          isActive: true
        }
      });

      // Add to tenant devices
      if (!this.tenantDevices.has(tenantId)) {
        this.tenantDevices.set(tenantId, new Set());
      }
      this.tenantDevices.get(tenantId)!.add(deviceConfig.id);

      // Subscribe to MQTT topics if configured
      if (deviceConfig.configuration.mqttTopic && this.mqttClient) {
        this.mqttClient.subscribe(`${deviceConfig.configuration.mqttTopic}/+`);
        logger.info(`Subscribed to MQTT topic: ${deviceConfig.configuration.mqttTopic}/+`);
      }

      // Start HTTP polling if configured
      if (deviceConfig.configuration.httpEndpoint && deviceConfig.configuration.pollingInterval) {
        this.startDevicePolling(deviceConfig, tenantId, db);
      }

      logger.info(`IoT device registered: ${deviceConfig.name} (${deviceConfig.id})`);

      // Send notification
      await this.notificationService.sendTenantNotification(tenantId, {
        type: 'SYSTEM',
        title: 'IoT Device Registered',
        message: `Device ${deviceConfig.name} has been registered and is ready for monitoring`,
        severity: 'INFO'
      });

    } catch (error) {
      logger.error(`Failed to register IoT device:`, error);
      throw new AppError('Device registration failed', 500);
    }
  }

  /**
   * Update device status
   */
  async updateDeviceStatus(
    tenantId: string,
    deviceId: string,
    status: DeviceStatus,
    db: PrismaClient
  ): Promise<void> {
    try {
      await db.ioTDevice.updateMany({
        where: {
          tenantId,
          deviceId
        },
        data: {
          status: status.status,
          lastHeartbeat: status.lastSeen
        }
      });

      // Cache current status
      await this.cacheService.set(
        `device_status:${tenantId}:${deviceId}`,
        JSON.stringify(status),
        300 // 5 minutes
      );

      // Check for status changes and trigger alerts
      await this.checkDeviceAlerts(tenantId, deviceId, status, db);

      this.emit('deviceStatusChanged', { tenantId, deviceId, status });

    } catch (error) {
      logger.error(`Failed to update device status:`, error);
    }
  }

  /**
   * Process sensor data
   */
  async processSensorData(
    tenantId: string,
    reading: SensorReading,
    db: PrismaClient
  ): Promise<void> {
    try {
      // Store sensor data
      await db.sensorData.create({
        data: {
          deviceId: reading.deviceId,
          sensorType: reading.sensorType,
          value: reading.value,
          unit: reading.unit,
          timestamp: reading.timestamp,
          metadata: reading.metadata as any
        }
      });

      // Update device last seen
      await db.ioTDevice.updateMany({
        where: {
          tenantId,
          deviceId: reading.deviceId
        },
        data: {
          lastHeartbeat: reading.timestamp
        }
      });

      // Check for threshold alerts
      await this.checkSensorThresholds(tenantId, reading, db);

      // Update real-time data cache
      await this.updateRealtimeCache(tenantId, reading);

      this.emit('sensorDataReceived', { tenantId, reading });

    } catch (error) {
      logger.error(`Failed to process sensor data:`, error);
    }
  }

  /**
   * Handle access events from smart locks/scanners
   */
  async processAccessEvent(
    tenantId: string,
    event: AccessEvent,
    db: PrismaClient
  ): Promise<void> {
    try {
      // Find the access point
      const accessPoint = await db.accessPoint.findFirst({
        where: {
          tenantId,
          deviceId: event.deviceId
        }
      });

      if (!accessPoint) {
        logger.warn(`Access point not found for device: ${event.deviceId}`);
        return;
      }

      // Create access log
      const accessLog = await db.accessLog.create({
        data: {
          tenantId,
          studentId: event.studentId,
          passId: event.passId,
          accessPointId: accessPoint.id,
          accessTime: event.timestamp,
          accessType: event.accessType === 'ENTRY' ? 'entry' : 'exit',
          status: event.accessType === 'DENIED' ? 'denied' : 'granted',
          deviceInfo: event.metadata as any
        }
      });

      // Update occupancy if this is an entry/exit event
      if (event.accessType === 'ENTRY' || event.accessType === 'EXIT') {
        await this.updateOccupancyCount(tenantId, event.location, event.accessType, db);
      }

      // Send real-time notification for denied access
      if (event.accessType === 'DENIED') {
        await this.notificationService.sendTenantNotification(tenantId, {
          type: 'SECURITY',
          title: 'Access Denied',
          message: `Access denied at ${event.location} for ${event.studentId || 'unknown user'}`,
          severity: 'WARNING'
        });
      }

      this.emit('accessEvent', { tenantId, event, accessLog });

    } catch (error) {
      logger.error(`Failed to process access event:`, error);
    }
  }

  /**
   * Get real-time occupancy data
   */
  async getOccupancyData(tenantId: string, location?: string): Promise<OccupancyData[]> {
    const cacheKey = location ? 
      `occupancy:${tenantId}:${location}` : 
      `occupancy:${tenantId}:*`;

    try {
      if (location) {
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
          return [JSON.parse(cached)];
        }
      }

      // Get from database if not in cache
      // This would typically aggregate access logs to calculate current occupancy
      const mockData: OccupancyData = {
        location: location || 'Campus',
        currentOccupancy: Math.floor(Math.random() * 100),
        maxCapacity: 150,
        utilizationPercentage: 0,
        timestamp: new Date()
      };
      
      mockData.utilizationPercentage = (mockData.currentOccupancy / mockData.maxCapacity) * 100;

      return [mockData];

    } catch (error) {
      logger.error('Failed to get occupancy data:', error);
      return [];
    }
  }

  /**
   * Get device analytics and insights
   */
  async getDeviceAnalytics(
    tenantId: string,
    deviceId?: string,
    timeRange: { start: Date; end: Date } = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    },
    db?: PrismaClient
  ): Promise<any> {
    try {
      if (!db) {
        db = new PrismaClient();
      }

      const whereClause: any = {
        device: {
          tenantId
        },
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      };

      if (deviceId) {
        whereClause.deviceId = deviceId;
      }

      // Get sensor data statistics
      const sensorData = await db.sensorData.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' }
      });

      // Calculate statistics
      const analytics = {
        totalReadings: sensorData.length,
        averageValues: {} as Record<string, number>,
        minValues: {} as Record<string, number>,
        maxValues: {} as Record<string, number>,
        trendData: {} as Record<string, Array<{ timestamp: Date; value: number }>>,
        deviceUptime: {} as Record<string, number>
      };

      // Group by sensor type
      const sensorTypes = [...new Set(sensorData.map(d => d.sensorType))];
      
      sensorTypes.forEach(type => {
        const typeData = sensorData.filter(d => d.sensorType === type);
        const values = typeData.map(d => d.value.toNumber());
        
        analytics.averageValues[type] = values.reduce((a, b) => a + b, 0) / values.length;
        analytics.minValues[type] = Math.min(...values);
        analytics.maxValues[type] = Math.max(...values);
        analytics.trendData[type] = typeData.map(d => ({
          timestamp: d.timestamp,
          value: d.value.toNumber()
        }));
      });

      return analytics;

    } catch (error) {
      logger.error('Failed to get device analytics:', error);
      throw error;
    }
  }

  /**
   * Control smart device (locks, cameras, etc.)
   */
  async controlDevice(
    tenantId: string,
    deviceId: string,
    command: string,
    parameters?: Record<string, any>,
    db?: PrismaClient
  ): Promise<boolean> {
    try {
      if (!db) {
        db = new PrismaClient();
      }

      const device = await db.ioTDevice.findFirst({
        where: {
          tenantId,
          deviceId,
          isActive: true
        }
      });

      if (!device) {
        throw new AppError('Device not found or inactive', 404);
      }

      const config = device.configuration as IoTDeviceConfig['configuration'];

      // Send command via MQTT if configured
      if (config.mqttTopic && this.mqttClient) {
        const topic = `${config.mqttTopic}/command`;
        const message = JSON.stringify({
          command,
          parameters,
          timestamp: new Date().toISOString()
        });

        this.mqttClient.publish(topic, message);
        logger.info(`Command sent via MQTT: ${command} to ${deviceId}`);
        return true;
      }

      // Send command via HTTP if configured
      if (config.httpEndpoint) {
        const response = await axios.post(`${config.httpEndpoint}/command`, {
          command,
          parameters
        }, {
          timeout: 5000,
          headers: {
            'Authorization': `Bearer ${device.configuration.credentials?.apiKey}`
          }
        });

        logger.info(`Command sent via HTTP: ${command} to ${deviceId}`);
        return response.status >= 200 && response.status < 300;
      }

      throw new AppError('No communication method configured for device', 400);

    } catch (error) {
      logger.error(`Failed to control device ${deviceId}:`, error);
      return false;
    }
  }

  /**
   * Bulk device operations
   */
  async bulkDeviceOperation(
    tenantId: string,
    operation: 'restart' | 'update_firmware' | 'sync_config',
    deviceIds: string[],
    db: PrismaClient
  ): Promise<Array<{ deviceId: string; success: boolean; error?: string }>> {
    const results: Array<{ deviceId: string; success: boolean; error?: string }> = [];

    for (const deviceId of deviceIds) {
      try {
        const success = await this.controlDevice(tenantId, deviceId, operation, {}, db);
        results.push({ deviceId, success });
      } catch (error) {
        results.push({
          deviceId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  // Private helper methods

  private handleMqttMessage(topic: string, message: string): void {
    try {
      const data = JSON.parse(message);
      const topicParts = topic.split('/');
      const deviceId = topicParts[topicParts.length - 2]; // Assuming topic format: tenant/device/type
      const messageType = topicParts[topicParts.length - 1];

      // Find tenant for this device
      let tenantId: string | undefined;
      for (const [tid, devices] of this.tenantDevices.entries()) {
        if (devices.has(deviceId)) {
          tenantId = tid;
          break;
        }
      }

      if (!tenantId) {
        logger.warn(`Unknown device in MQTT message: ${deviceId}`);
        return;
      }

      this.processMqttMessage(tenantId, deviceId, messageType, data);

    } catch (error) {
      logger.error('Failed to handle MQTT message:', error);
    }
  }

  private async processMqttMessage(
    tenantId: string,
    deviceId: string,
    messageType: string,
    data: any
  ): Promise<void> {
    const db = new PrismaClient();

    try {
      switch (messageType) {
        case 'status':
          await this.updateDeviceStatus(tenantId, deviceId, data, db);
          break;
        case 'sensor':
          await this.processSensorData(tenantId, { ...data, deviceId }, db);
          break;
        case 'access':
          await this.processAccessEvent(tenantId, { ...data, deviceId }, db);
          break;
        default:
          logger.debug(`Unknown message type: ${messageType}`);
      }
    } finally {
      await db.$disconnect();
    }
  }

  private startDevicePolling(
    deviceConfig: IoTDeviceConfig,
    tenantId: string,
    db: PrismaClient
  ): void {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(deviceConfig.configuration.httpEndpoint!, {
          timeout: 5000,
          headers: {
            'Authorization': `Bearer ${deviceConfig.credentials.apiKey}`
          }
        });

        if (response.data.sensors) {
          for (const sensor of response.data.sensors) {
            await this.processSensorData(tenantId, {
              ...sensor,
              deviceId: deviceConfig.id,
              timestamp: new Date()
            }, db);
          }
        }

        if (response.data.status) {
          await this.updateDeviceStatus(tenantId, deviceConfig.id, {
            ...response.data.status,
            deviceId: deviceConfig.id,
            lastSeen: new Date()
          }, db);
        }

      } catch (error) {
        logger.error(`Polling failed for device ${deviceConfig.id}:`, error);
        
        await this.updateDeviceStatus(tenantId, deviceConfig.id, {
          deviceId: deviceConfig.id,
          status: 'ERROR',
          lastSeen: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Polling failed'
        }, db);
      }
    }, deviceConfig.configuration.pollingInterval! * 1000);

    this.devicePollingIntervals.set(deviceConfig.id, interval);
  }

  private async checkDeviceAlerts(
    tenantId: string,
    deviceId: string,
    status: DeviceStatus,
    db: PrismaClient
  ): Promise<void> {
    try {
      const device = await db.ioTDevice.findFirst({
        where: { tenantId, deviceId }
      });

      if (!device) return;

      // Check if device went offline
      if (status.status === 'OFFLINE') {
        await db.deviceAlert.create({
          data: {
            deviceId: device.id,
            alertType: 'DEVICE_OFFLINE',
            severity: 'HIGH',
            title: 'Device Offline',
            message: `Device ${device.name} has gone offline`,
            metadata: { status }
          }
        });

        await this.notificationService.sendTenantNotification(tenantId, {
          type: 'SYSTEM',
          title: 'Device Offline Alert',
          message: `IoT Device ${device.name} has gone offline`,
          severity: 'WARNING'
        });
      }

      // Check battery level if available
      if (status.batteryLevel && status.batteryLevel < 20) {
        await db.deviceAlert.create({
          data: {
            deviceId: device.id,
            alertType: 'BATTERY_LOW',
            severity: 'MEDIUM',
            title: 'Low Battery',
            message: `Device ${device.name} has low battery (${status.batteryLevel}%)`,
            metadata: { batteryLevel: status.batteryLevel }
          }
        });
      }

    } catch (error) {
      logger.error('Failed to check device alerts:', error);
    }
  }

  private async checkSensorThresholds(
    tenantId: string,
    reading: SensorReading,
    db: PrismaClient
  ): Promise<void> {
    try {
      const device = await db.ioTDevice.findFirst({
        where: { tenantId, deviceId: reading.deviceId }
      });

      if (!device) return;

      const config = device.configuration as any;
      const alertRules = config.alertRules || [];

      for (const rule of alertRules) {
        if (rule.sensorType !== reading.sensorType) continue;

        let triggered = false;
        
        switch (rule.condition) {
          case 'above':
            triggered = reading.value > rule.value;
            break;
          case 'below':
            triggered = reading.value < rule.value;
            break;
          case 'equals':
            triggered = reading.value === rule.value;
            break;
        }

        if (triggered) {
          await db.deviceAlert.create({
            data: {
              deviceId: device.id,
              alertType: 'SENSOR_ANOMALY',
              severity: rule.severity.toUpperCase(),
              title: 'Sensor Threshold Alert',
              message: `${reading.sensorType} value ${reading.value}${reading.unit} is ${rule.condition} threshold ${rule.value}${reading.unit}`,
              metadata: { reading, rule }
            }
          });
        }
      }

    } catch (error) {
      logger.error('Failed to check sensor thresholds:', error);
    }
  }

  private async updateRealtimeCache(tenantId: string, reading: SensorReading): Promise<void> {
    const cacheKey = `realtime:${tenantId}:${reading.deviceId}:${reading.sensorType}`;
    await this.cacheService.set(cacheKey, JSON.stringify(reading), 300);
  }

  private async updateOccupancyCount(
    tenantId: string,
    location: string,
    accessType: 'ENTRY' | 'EXIT',
    db: PrismaClient
  ): Promise<void> {
    const cacheKey = `occupancy:${tenantId}:${location}`;
    
    try {
      let currentData = await this.cacheService.get(cacheKey);
      let occupancyData: OccupancyData = currentData ? 
        JSON.parse(currentData) : 
        {
          location,
          currentOccupancy: 0,
          maxCapacity: 100, // This would be configurable
          utilizationPercentage: 0,
          timestamp: new Date()
        };

      // Update count based on access type
      if (accessType === 'ENTRY') {
        occupancyData.currentOccupancy++;
      } else if (accessType === 'EXIT' && occupancyData.currentOccupancy > 0) {
        occupancyData.currentOccupancy--;
      }

      occupancyData.utilizationPercentage = 
        (occupancyData.currentOccupancy / occupancyData.maxCapacity) * 100;
      occupancyData.timestamp = new Date();

      await this.cacheService.set(cacheKey, JSON.stringify(occupancyData), 3600); // Cache for 1 hour

    } catch (error) {
      logger.error('Failed to update occupancy count:', error);
    }
  }

  /**
   * Cleanup method
   */
  async cleanup(): Promise<void> {
    // Clear polling intervals
    this.devicePollingIntervals.forEach(interval => clearInterval(interval));
    this.devicePollingIntervals.clear();

    // Close WebSocket connections
    this.deviceConnections.forEach(ws => ws.close());
    this.deviceConnections.clear();

    // Disconnect MQTT
    if (this.mqttClient) {
      this.mqttClient.end();
    }

    logger.info('IoT service cleanup completed');
  }
}

// Singleton instance
let iotService: IoTDeviceService;

export const getIoTService = (): IoTDeviceService => {
  if (!iotService) {
    iotService = new IoTDeviceService();
  }
  return iotService;
};