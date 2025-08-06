import { io, Socket } from 'socket.io-client';
import { store } from '../store/store';
import { notificationService } from './notificationService';
import { api } from '../store/api/api';

export interface WebSocketEvent {
  type: string;
  payload: any;
  timestamp: Date;
  userId?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectionStatus: ConnectionStatus = {
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
  };

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(import.meta.env.VITE_WS_URL || 'ws://localhost:3001', {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
    });

    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.updateConnectionStatus({ 
        connected: false, 
        reconnecting: false, 
        reconnectAttempts: 0 
      });
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.updateConnectionStatus({ 
        connected: true, 
        reconnecting: false, 
        lastConnected: new Date(),
        reconnectAttempts: 0
      });
      
      // Show connection restored notification if this was a reconnection
      if (this.connectionStatus.reconnectAttempts > 0) {
        notificationService.show({
          type: 'success',
          title: 'Connection Restored',
          message: 'Real-time updates are now active',
          duration: 3000,
        });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.updateConnectionStatus({ 
        connected: false, 
        reconnecting: reason === 'io server disconnect' ? false : true,
        reconnectAttempts: this.reconnectAttempts
      });

      if (reason === 'io server disconnect') {
        notificationService.show({
          type: 'error',
          title: 'Connection Lost',
          message: 'Real-time updates are unavailable',
          duration: 5000,
        });
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnection();
    });

    // Application-specific events
    this.socket.on('application:updated', (data) => {
      this.handleApplicationUpdate(data);
      this.emit('application:updated', data);
    });

    this.socket.on('application:reviewed', (data) => {
      this.handleApplicationReviewed(data);
      this.emit('application:reviewed', data);
    });

    this.socket.on('pass:generated', (data) => {
      this.handlePassGenerated(data);
      this.emit('pass:generated', data);
    });

    this.socket.on('pass:verified', (data) => {
      this.handlePassVerified(data);
      this.emit('pass:verified', data);
    });

    this.socket.on('user:activity', (data) => {
      this.emit('user:activity', data);
    });

    this.socket.on('system:notification', (data) => {
      this.handleSystemNotification(data);
      this.emit('system:notification', data);
    });

    // Real-time analytics updates
    this.socket.on('analytics:update', (data) => {
      this.emit('analytics:update', data);
    });
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      notificationService.show({
        type: 'error',
        title: 'Connection Failed',
        message: 'Unable to establish real-time connection. Please refresh the page.',
        duration: 0, // Persistent notification
      });
      return;
    }

    this.reconnectAttempts++;
    this.updateConnectionStatus({ 
      ...this.connectionStatus,
      reconnecting: true,
      reconnectAttempts: this.reconnectAttempts
    });

    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, this.reconnectInterval * Math.pow(2, this.reconnectAttempts)); // Exponential backoff
  }

  private handleApplicationUpdate(data: any): void {
    // Invalidate cached application data
    store.dispatch(api.util.invalidateTags(['Application']));
    
    // Show notification to relevant users
    const state = store.getState();
    const currentUser = state.auth.user;
    
    if (currentUser && (
      currentUser.id === data.userId || 
      ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)
    )) {
      notificationService.show({
        type: 'info',
        title: 'Application Updated',
        message: `Application #${data.applicationId} has been updated`,
        duration: 5000,
      });
    }
  }

  private handleApplicationReviewed(data: any): void {
    store.dispatch(api.util.invalidateTags(['Application', 'Pass']));
    
    const state = store.getState();
    const currentUser = state.auth.user;
    
    if (currentUser?.id === data.userId) {
      const status = data.status === 'APPROVED' ? 'approved' : 'rejected';
      notificationService.show({
        type: data.status === 'APPROVED' ? 'success' : 'error',
        title: `Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: data.status === 'APPROVED' 
          ? 'Your application has been approved! Your pass will be generated shortly.'
          : data.comments || 'Your application needs attention.',
        duration: 8000,
      });
    }
  }

  private handlePassGenerated(data: any): void {
    store.dispatch(api.util.invalidateTags(['Pass']));
    
    const state = store.getState();
    const currentUser = state.auth.user;
    
    if (currentUser?.id === data.userId) {
      notificationService.show({
        type: 'success',
        title: 'Pass Generated',
        message: 'Your new pass is ready! Check your passes page.',
        duration: 8000,
        action: {
          label: 'View Pass',
          onClick: () => {
            window.location.href = '/student/passes';
          }
        }
      });
    }
  }

  private handlePassVerified(data: any): void {
    // Update access logs
    store.dispatch(api.util.invalidateTags(['AccessLog']));
    
    this.emit('pass:verified', data);
  }

  private handleSystemNotification(data: any): void {
    notificationService.show({
      type: data.type || 'info',
      title: data.title,
      message: data.message,
      duration: data.duration || 5000,
    });
  }

  private updateConnectionStatus(status: Partial<ConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...status };
    this.emit('connection:status', this.connectionStatus);
  }

  // Event system for components to listen to WebSocket events
  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  // Send events to server
  send(event: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected. Event not sent:', event, data);
    }
  }

  // Join/leave rooms for specific updates
  joinRoom(room: string): void {
    this.send('join:room', { room });
  }

  leaveRoom(room: string): void {
    this.send('leave:room', { room });
  }

  // Get current connection status
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Ping server for connectivity check
  ping(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Not connected'));
        return;
      }

      const start = Date.now();
      this.socket.emit('ping', start, (response: number) => {
        const latency = Date.now() - response;
        resolve(latency);
      });

      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('Ping timeout')), 5000);
    });
  }
}

export const websocketService = new WebSocketService();

// React hooks for using WebSocket in components
export const useWebSocket = () => {
  return {
    connect: websocketService.connect.bind(websocketService),
    disconnect: websocketService.disconnect.bind(websocketService),
    on: websocketService.on.bind(websocketService),
    send: websocketService.send.bind(websocketService),
    joinRoom: websocketService.joinRoom.bind(websocketService),
    leaveRoom: websocketService.leaveRoom.bind(websocketService),
    getConnectionStatus: websocketService.getConnectionStatus.bind(websocketService),
    isConnected: websocketService.isConnected.bind(websocketService),
    ping: websocketService.ping.bind(websocketService),
  };
};