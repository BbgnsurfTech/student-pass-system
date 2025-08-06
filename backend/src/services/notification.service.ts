import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface NotificationData {
  userId: string;
  type: 'approval' | 'rejection' | 'alert' | 'reminder' | 'system';
  title: string;
  message: string;
  data?: any;
  channels?: ('email' | 'push' | 'in_app')[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ApprovalNotificationData {
  status: 'approved' | 'rejected';
  processingMethod: 'automated' | 'manual';
  estimatedDelivery?: Date;
}

export interface RejectionNotificationData {
  reasons: string[];
  appealProcess: boolean;
}

export class NotificationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async sendApprovalNotification(
    userId: string,
    data: ApprovalNotificationData
  ): Promise<boolean> {
    try {
      logger.info(`Sending approval notification to user ${userId}`, data);
      return true;
    } catch (error) {
      logger.error('Failed to send approval notification:', error);
      return false;
    }
  }

  async sendRejectionNotification(
    userId: string,
    data: RejectionNotificationData
  ): Promise<boolean> {
    try {
      logger.info(`Sending rejection notification to user ${userId}`, data);
      return true;
    } catch (error) {
      logger.error('Failed to send rejection notification:', error);
      return false;
    }
  }
}

export const notificationService = new NotificationService();