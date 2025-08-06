import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const message = `Route ${req.method} ${req.originalUrl} not found`;
  
  // Log the 404 attempt
  logger.warn('Route not found:', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
  });

  res.status(404).json({
    success: false,
    message,
    availableRoutes: {
      auth: [
        'POST /api/v1/auth/login',
        'POST /api/v1/auth/register',
        'POST /api/v1/auth/refresh',
        'POST /api/v1/auth/logout',
        'POST /api/v1/auth/forgot-password',
        'POST /api/v1/auth/reset-password',
      ],
      users: [
        'GET /api/v1/users',
        'GET /api/v1/users/:id',
        'POST /api/v1/users',
        'PUT /api/v1/users/:id',
        'DELETE /api/v1/users/:id',
      ],
      students: [
        'GET /api/v1/students',
        'GET /api/v1/students/:id',
        'POST /api/v1/students',
        'PUT /api/v1/students/:id',
        'DELETE /api/v1/students/:id',
      ],
      applications: [
        'GET /api/v1/applications',
        'GET /api/v1/applications/:id',
        'POST /api/v1/applications',
        'PUT /api/v1/applications/:id',
        'PATCH /api/v1/applications/:id/review',
      ],
      passes: [
        'GET /api/v1/passes',
        'GET /api/v1/passes/:id',
        'POST /api/v1/passes',
        'PUT /api/v1/passes/:id',
        'DELETE /api/v1/passes/:id',
        'POST /api/v1/passes/:id/revoke',
      ],
      access: [
        'POST /api/v1/access/verify',
        'GET /api/v1/access/logs',
        'POST /api/v1/access/log',
      ],
      uploads: [
        'POST /api/v1/uploads/document',
        'POST /api/v1/uploads/photo',
        'GET /api/v1/uploads/:filename',
      ],
      health: [
        'GET /health',
        'GET /health/db',
        'GET /health/redis',
      ],
    },
  });
};