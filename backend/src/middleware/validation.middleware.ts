import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { logger } from '../utils/logger';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error: ValidationError) => ({
      field: error.type === 'field' ? (error as any).path : error.type,
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined,
      location: error.type === 'field' ? (error as any).location : undefined
    }));

    logger.warn('Validation failed:', {
      path: req.path,
      method: req.method,
      errors: formattedErrors,
      userId: (req as any).user?.id
    });

    return res.status(400).json({
      error: 'Validation Error',
      message: 'Request validation failed',
      details: formattedErrors,
      timestamp: new Date().toISOString()
    });
  }

  next();
};