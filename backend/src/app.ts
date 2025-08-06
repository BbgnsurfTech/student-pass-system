import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

// GraphQL Server
import { setupGraphQLServer } from './graphql/server';

// Routes
import analyticsRoutes from './routes/analytics.routes';
import aiRoutes from './routes/ai.routes';

// Services
import { realTimeAnalyticsService } from './services/realTimeAnalytics.service';

const prisma = new PrismaClient();

export async function createApp() {
  const app = express();
  const httpServer = createServer(app);
  
  // Socket.IO setup
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true
    }
  });

  // Initialize real-time analytics service with Socket.IO
  realTimeAnalyticsService.initialize(io);

  // Basic middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));
  
  app.use(compression());
  
  app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  app.use(limiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging
  app.use(morgan('combined'));

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected'
      });
    } catch (error) {
      res.status(503).json({ 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // API Routes
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/ai', aiRoutes);

  // Setup GraphQL server
  const { server: apolloServer } = await setupGraphQLServer(app);

  // Socket.IO authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    // Verify JWT token (simplified - implement proper JWT verification)
    try {
      // const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      // socket.userId = decoded.userId;
      // socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`Socket error from ${socket.id}:`, error);
    });
  });

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.stack);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: err.message,
        details: (err as any).details || []
      });
    }
    
    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing authentication token'
      });
    }
    
    if (err.name === 'ForbiddenError') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    // Default error response
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.originalUrl} not found`
    });
  });

  return { app, httpServer, io, apolloServer, prisma };
}

// Start the server
export async function startServer() {
  try {
    const { httpServer, apolloServer } = await createApp();
    
    const PORT = process.env.PORT || 5000;

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Analytics API available at http://localhost:${PORT}/api/analytics`);
      console.log(`🎯 GraphQL playground available at http://localhost:${PORT}${apolloServer.graphqlPath}`);
      console.log(`🔄 Socket.IO server running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`${signal} received, shutting down gracefully`);
      
      // Close HTTP server
      httpServer.close(() => {
        console.log('HTTP server closed');
      });

      // Clean up real-time analytics service
      realTimeAnalyticsService.cleanup();

      // Close database connection
      await (await import('@prisma/client')).PrismaClient().prototype.$disconnect();
      console.log('Database connection closed');
      
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}