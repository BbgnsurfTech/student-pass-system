import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { auth, requireRole } from '../middleware/auth';
import { getNotificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication to all routes
router.use(auth);

// Get user notifications
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('unreadOnly').optional().isBoolean().toBoolean()
  ],
  async (req: any, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parameters',
          errors: errors.array()
        });
      }

      const notificationService = getNotificationService();
      const result = await notificationService.getUserNotifications(
        req.user.id,
        req.query.page || 1,
        req.query.limit || 20,
        req.query.unreadOnly || false
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to get notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Mark notification as read
router.patch('/:id/read',
  async (req: any, res) => {
    try {
      const notificationService = getNotificationService();
      await notificationService.markNotificationAsRead(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Mark all notifications as read
router.patch('/read-all',
  async (req: any, res) => {
    try {
      const notificationService = getNotificationService();
      await notificationService.markAllNotificationsAsRead(req.user.id);

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Update notification preferences
router.put('/preferences',
  [
    body('email').isBoolean(),
    body('push').isBoolean(),
    body('realtime').isBoolean(),
    body('applicationUpdates').optional().isBoolean(),
    body('passUpdates').optional().isBoolean(),
    body('systemAlerts').optional().isBoolean(),
    body('weeklyDigest').optional().isBoolean()
  ],
  async (req: any, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid preferences data',
          errors: errors.array()
        });
      }

      const notificationService = getNotificationService();
      await notificationService.updateNotificationPreferences(req.user.id, req.body);

      res.json({
        success: true,
        message: 'Notification preferences updated'
      });
    } catch (error) {
      logger.error('Failed to update notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Subscribe to push notifications
router.post('/push/subscribe',
  [
    body('subscription').isObject(),
    body('subscription.endpoint').isURL(),
    body('subscription.keys').isObject(),
    body('subscription.keys.p256dh').isString(),
    body('subscription.keys.auth').isString()
  ],
  async (req: any, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subscription data',
          errors: errors.array()
        });
      }

      const notificationService = getNotificationService();
      await notificationService.subscribeToPush(req.user.id, req.body.subscription);

      res.json({
        success: true,
        message: 'Push notification subscription successful'
      });
    } catch (error) {
      logger.error('Failed to subscribe to push notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to subscribe to push notifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Unsubscribe from push notifications
router.post('/push/unsubscribe',
  [
    body('endpoint').isURL()
  ],
  async (req: any, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid endpoint',
          errors: errors.array()
        });
      }

      const notificationService = getNotificationService();
      await notificationService.unsubscribeFromPush(req.user.id, req.body.endpoint);

      res.json({
        success: true,
        message: 'Push notification unsubscription successful'
      });
    } catch (error) {
      logger.error('Failed to unsubscribe from push notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unsubscribe from push notifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Send system alert (admin only)
router.post('/system-alert',
  requireRole(['admin', 'super_admin']),
  [
    body('message').isString().isLength({ min: 1, max: 500 }),
    body('severity').optional().isIn(['info', 'warning', 'error']),
    body('targetRoles').optional().isArray()
  ],
  async (req: any, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid alert data',
          errors: errors.array()
        });
      }

      const notificationService = getNotificationService();
      await notificationService.sendSystemAlert(
        req.body.message,
        req.body.severity || 'info',
        req.body.targetRoles
      );

      res.json({
        success: true,
        message: 'System alert sent successfully'
      });
    } catch (error) {
      logger.error('Failed to send system alert:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send system alert',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Send bulk notification (admin only)
router.post('/bulk',
  requireRole(['admin', 'super_admin']),
  [
    body('userIds').isArray().isLength({ min: 1, max: 1000 }),
    body('userIds.*').isUUID(),
    body('title').isString().isLength({ min: 1, max: 200 }),
    body('message').isString().isLength({ min: 1, max: 1000 }),
    body('type').isIn(['info', 'success', 'warning', 'error']),
    body('channels').optional().isArray(),
    body('channels.*').optional().isIn(['email', 'push', 'realtime'])
  ],
  async (req: any, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification data',
          errors: errors.array()
        });
      }

      const notificationService = getNotificationService();
      
      const notification = {
        title: req.body.title,
        message: req.body.message,
        type: req.body.type,
        action: req.body.action,
        data: req.body.data
      };

      const channels = req.body.channels || ['realtime'];

      await notificationService.sendBulkNotification(
        req.body.userIds,
        notification,
        channels
      );

      res.json({
        success: true,
        message: `Bulk notification sent to ${req.body.userIds.length} users`
      });
    } catch (error) {
      logger.error('Failed to send bulk notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send bulk notification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Test notification (development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/test',
    [
      body('type').isIn(['info', 'success', 'warning', 'error']),
      body('title').optional().isString(),
      body('message').optional().isString()
    ],
    async (req: any, res) => {
      try {
        const notificationService = getNotificationService();
        
        const notification = {
          title: req.body.title || 'Test Notification',
          message: req.body.message || 'This is a test notification',
          type: req.body.type || 'info',
          data: { test: true }
        };

        await notificationService.sendNotification(
          req.user.id,
          notification,
          ['realtime', 'push']
        );

        res.json({
          success: true,
          message: 'Test notification sent'
        });
      } catch (error) {
        logger.error('Failed to send test notification:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to send test notification',
          error: error.message
        });
      }
    }
  );
}

export default router;