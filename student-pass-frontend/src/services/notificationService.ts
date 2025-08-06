import { io, Socket } from 'socket.io-client';

export interface Notification {
  id: string;
  type: 'APPLICATION_STATUS' | 'PASS_GENERATED' | 'PASS_EXPIRED' | 'ACCESS_GRANTED' | 'ACCESS_DENIED';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationCallbacks {
  onNotification?: (notification: Notification) => void;
  onApplicationStatusChange?: (applicationId: string, status: string) => void;
  onPassGenerated?: (passId: string) => void;
  onAccessEvent?: (event: any) => void;
}

export class NotificationService {
  private socket: Socket | null = null;
  private callbacks: NotificationCallbacks = {};
  private notifications: Notification[] = [];

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.socket) return;

    this.socket = io(process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:3001', {
      autoConnect: false,
      withCredentials: true,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to notification server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from notification server');
    });

    this.socket.on('notification', (notification: Notification) => {
      this.handleNotification(notification);
    });

    this.socket.on('application_status_changed', (data: { applicationId: string; status: string }) => {
      this.callbacks.onApplicationStatusChange?.(data.applicationId, data.status);
    });

    this.socket.on('pass_generated', (data: { passId: string }) => {
      this.callbacks.onPassGenerated?.(data.passId);
    });

    this.socket.on('access_event', (event: any) => {
      this.callbacks.onAccessEvent?.(event);
    });
  }

  private handleNotification(notification: Notification) {
    this.notifications.unshift(notification);
    
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    this.callbacks.onNotification?.(notification);

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/notification-icon.png',
        tag: notification.id,
      });
    }
  }

  start() {
    this.socket?.connect();
  }

  disconnect() {
    this.socket?.disconnect();
  }

  subscribe(userId: string, userType: 'student' | 'admin' | 'security') {
    if (this.socket?.connected) {
      this.socket.emit('subscribe', { userId, userType });
    }
  }

  unsubscribe() {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe');
    }
  }

  setCallbacks(callbacks: NotificationCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  getNotifications(): Notification[] {
    return this.notifications.slice();
  }

  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.isRead = true);
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  // Mock notification for testing
  static createMockNotification(type: Notification['type'], title: string, message: string): Notification {
    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title,
      message,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
  }
}

// Global notification service instance
export const notificationService = new NotificationService();