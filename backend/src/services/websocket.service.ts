import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  institutionId?: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private redisClient: Redis;
  private redisSubscriber: Redis;
  private activeConnections = new Map<string, string>(); // userId -> socketId
  private adminSockets = new Set<string>(); // admin socket IDs

  constructor(server: HTTPServer) {
    // Initialize Redis clients for Socket.IO adapter
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    this.redisSubscriber = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    // Initialize Socket.IO with Redis adapter
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.io.adapter(createAdapter(this.redisClient, this.redisSubscriber));
    this.setupEventHandlers();
    this.setupRedisSubscriptions();

    logger.info('WebSocket service initialized');
  }

  private async authenticateSocket(socket: any, token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true, institutionId: true, isActive: true }
      });

      if (!user || !user.isActive) {
        throw new Error('Invalid or inactive user');
      }

      return user;
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          throw new Error('No authentication token provided');
        }

        const user = await this.authenticateSocket(socket, token);
        socket.userId = user.id;
        socket.userRole = user.role;
        socket.institutionId = user.institutionId;

        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`User ${socket.userId} connected with socket ${socket.id}`);
      
      // Store connection
      this.activeConnections.set(socket.userId!, socket.id);
      
      // Join user-specific room
      socket.join(`user:${socket.userId}`);
      
      // Join role-based rooms
      if (socket.userRole === 'admin' || socket.userRole === 'super_admin') {
        socket.join('admins');
        this.adminSockets.add(socket.id);
      }
      
      // Join institution room
      if (socket.institutionId) {
        socket.join(`institution:${socket.institutionId}`);
      }

      // Handle user presence
      this.handleUserPresence(socket, 'online');

      // Handle application status requests
      socket.on('subscribe:application', (applicationId: string) => {
        socket.join(`application:${applicationId}`);
        logger.debug(`Socket ${socket.id} subscribed to application ${applicationId}`);
      });

      // Handle admin dashboard subscriptions
      socket.on('subscribe:admin-dashboard', () => {
        if (socket.userRole === 'admin' || socket.userRole === 'super_admin') {
          socket.join('admin-dashboard');
          this.sendDashboardStats(socket.id);
        }
      });

      // Handle pass status requests
      socket.on('subscribe:pass', (passId: string) => {
        socket.join(`pass:${passId}`);
      });

      // Handle typing indicators for chat/comments
      socket.on('typing:start', (data: { applicationId: string }) => {
        socket.to(`application:${data.applicationId}`).emit('user:typing', {
          userId: socket.userId,
          applicationId: data.applicationId
        });
      });

      socket.on('typing:stop', (data: { applicationId: string }) => {
        socket.to(`application:${data.applicationId}`).emit('user:stopped-typing', {
          userId: socket.userId,
          applicationId: data.applicationId
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`User ${socket.userId} disconnected`);
        this.activeConnections.delete(socket.userId!);
        this.adminSockets.delete(socket.id);
        this.handleUserPresence(socket, 'offline');
      });

      // Send welcome message with current stats
      this.sendWelcomeMessage(socket);
    });
  }

  private setupRedisSubscriptions(): void {
    // Subscribe to application updates
    this.redisSubscriber.subscribe('application:updated', 'application:created');
    this.redisSubscriber.subscribe('pass:updated', 'pass:created');
    this.redisSubscriber.subscribe('system:maintenance', 'system:alert');

    this.redisSubscriber.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        this.handleRedisMessage(channel, data);
      } catch (error) {
        logger.error('Error processing Redis message:', error);
      }
    });
  }

  private handleRedisMessage(channel: string, data: any): void {
    switch (channel) {
      case 'application:updated':
        this.broadcastApplicationUpdate(data);
        break;
      case 'application:created':
        this.broadcastNewApplication(data);
        break;
      case 'pass:updated':
        this.broadcastPassUpdate(data);
        break;
      case 'pass:created':
        this.broadcastNewPass(data);
        break;
      case 'system:maintenance':
        this.broadcastSystemMaintenance(data);
        break;
      case 'system:alert':
        this.broadcastSystemAlert(data);
        break;
    }
  }

  private async handleUserPresence(socket: AuthenticatedSocket, status: 'online' | 'offline'): Promise<void> {
    try {
      // Update user presence in database
      await prisma.user.update({
        where: { id: socket.userId },
        data: {
          lastSeen: new Date(),
          isOnline: status === 'online'
        }
      });

      // Broadcast presence to relevant rooms
      this.io.to('admins').emit('user:presence', {
        userId: socket.userId,
        status,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error updating user presence:', error);
    }
  }

  private async sendWelcomeMessage(socket: AuthenticatedSocket): Promise<void> {
    try {
      const stats = await this.getDashboardStats();
      socket.emit('welcome', {
        message: 'Connected successfully',
        stats,
        serverTime: new Date()
      });
    } catch (error) {
      logger.error('Error sending welcome message:', error);
    }
  }

  private async sendDashboardStats(socketId: string): Promise<void> {
    try {
      const stats = await this.getDashboardStats();
      this.io.to(socketId).emit('dashboard:stats', stats);
    } catch (error) {
      logger.error('Error sending dashboard stats:', error);
    }
  }

  private async getDashboardStats(): Promise<any> {
    const [
      totalApplications,
      pendingApplications,
      activeUsers,
      totalPasses
    ] = await Promise.all([
      prisma.application.count(),
      prisma.application.count({ where: { status: 'pending' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.pass.count({ where: { status: 'active' } })
    ]);

    return {
      totalApplications,
      pendingApplications,
      activeUsers,
      totalPasses,
      onlineUsers: this.activeConnections.size,
      timestamp: new Date()
    };
  }

  // Public methods for broadcasting events
  public broadcastApplicationUpdate(data: any): void {
    // Broadcast to application subscribers
    this.io.to(`application:${data.id}`).emit('application:updated', data);
    
    // Broadcast to user
    if (data.studentId) {
      this.io.to(`user:${data.studentId}`).emit('application:updated', data);
    }
    
    // Broadcast to admins
    this.io.to('admins').emit('application:updated', data);
  }

  public broadcastNewApplication(data: any): void {
    // Broadcast to admins only
    this.io.to('admins').emit('application:created', {
      ...data,
      notification: {
        title: 'New Application Submitted',
        message: `Student ${data.student?.name} submitted a new application`,
        type: 'info',
        timestamp: new Date()
      }
    });
  }

  public broadcastPassUpdate(data: any): void {
    // Broadcast to pass subscribers
    this.io.to(`pass:${data.id}`).emit('pass:updated', data);
    
    // Broadcast to user
    if (data.studentId) {
      this.io.to(`user:${data.studentId}`).emit('pass:updated', {
        ...data,
        notification: {
          title: 'Pass Status Updated',
          message: `Your pass status has been updated to ${data.status}`,
          type: 'success',
          timestamp: new Date()
        }
      });
    }
  }

  public broadcastNewPass(data: any): void {
    // Broadcast to user
    if (data.studentId) {
      this.io.to(`user:${data.studentId}`).emit('pass:created', {
        ...data,
        notification: {
          title: 'Pass Generated',
          message: 'Your student pass has been generated successfully!',
          type: 'success',
          timestamp: new Date()
        }
      });
    }
    
    // Broadcast to admins
    this.io.to('admins').emit('pass:created', data);
  }

  public broadcastSystemMaintenance(data: any): void {
    this.io.emit('system:maintenance', {
      ...data,
      notification: {
        title: 'System Maintenance',
        message: data.message,
        type: 'warning',
        timestamp: new Date()
      }
    });
  }

  public broadcastSystemAlert(data: any): void {
    this.io.emit('system:alert', {
      ...data,
      notification: {
        title: 'System Alert',
        message: data.message,
        type: data.severity || 'info',
        timestamp: new Date()
      }
    });
  }

  public broadcastToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public broadcastToAdmins(event: string, data: any): void {
    this.io.to('admins').emit(event, data);
  }

  public broadcastToInstitution(institutionId: string, event: string, data: any): void {
    this.io.to(`institution:${institutionId}`).emit(event, data);
  }

  public getActiveConnections(): number {
    return this.activeConnections.size;
  }

  public isUserOnline(userId: string): boolean {
    return this.activeConnections.has(userId);
  }

  public async publishToRedis(channel: string, data: any): Promise<void> {
    try {
      await this.redisClient.publish(channel, JSON.stringify(data));
    } catch (error) {
      logger.error(`Error publishing to Redis channel ${channel}:`, error);
    }
  }

  public async close(): Promise<void> {
    this.io.close();
    await this.redisClient.quit();
    await this.redisSubscriber.quit();
    logger.info('WebSocket service closed');
  }
}

let websocketService: WebSocketService | null = null;

export const initializeWebSocket = (server: HTTPServer): WebSocketService => {
  if (!websocketService) {
    websocketService = new WebSocketService(server);
  }
  return websocketService;
};

export const getWebSocketService = (): WebSocketService => {
  if (!websocketService) {
    throw new Error('WebSocket service not initialized');
  }
  return websocketService;
};