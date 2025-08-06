import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { logger } from '../utils/logger';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Student Pass System API',
    version: process.env.APP_VERSION || '1.0.0',
    description: 'RESTful API for Student Pass Management System',
    contact: {
      name: 'Student Pass System Team',
      email: 'support@studentpass.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: process.env.NODE_ENV === 'production' 
        ? 'https://api.studentpass.com' 
        : `http://localhost:${process.env.PORT || 3000}`,
      description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for authentication',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          roleId: { type: 'string', format: 'uuid' },
          schoolId: { type: 'string', format: 'uuid' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Student: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          studentId: { type: 'string' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          middleName: { type: 'string' },
          dateOfBirth: { type: 'string', format: 'date' },
          gender: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          schoolId: { type: 'string', format: 'uuid' },
          departmentId: { type: 'string', format: 'uuid' },
          program: { type: 'string' },
          yearOfStudy: { type: 'integer' },
          status: { type: 'string', enum: ['active', 'inactive', 'graduated', 'suspended'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Pass: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          studentId: { type: 'string', format: 'uuid' },
          passNumber: { type: 'string' },
          qrCode: { type: 'string' },
          issueDate: { type: 'string', format: 'date-time' },
          expiryDate: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['active', 'inactive', 'expired', 'revoked'] },
          passType: { type: 'string', enum: ['standard', 'temporary', 'visitor'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      StudentApplication: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          studentId: { type: 'string' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          schoolId: { type: 'string', format: 'uuid' },
          departmentId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'under_review'] },
          appliedAt: { type: 'string', format: 'date-time' },
          reviewedAt: { type: 'string', format: 'date-time' },
          reviewComments: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          statusCode: { type: 'integer' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
                code: { type: 'string' },
              },
            },
          },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'array', items: {} },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
              hasNext: { type: 'boolean' },
              hasPrev: { type: 'boolean' },
            },
          },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      NotFound: {
        description: 'Not Found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      Conflict: {
        description: 'Conflict',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      TooManyRequests: {
        description: 'Too Many Requests',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      InternalServerError: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Authentication', description: 'User authentication and authorization' },
    { name: 'Users', description: 'User management' },
    { name: 'Students', description: 'Student management' },
    { name: 'Applications', description: 'Student application management' },
    { name: 'Passes', description: 'Student pass management' },
    { name: 'Access', description: 'Access control and logging' },
    { name: 'Uploads', description: 'File upload and management' },
    { name: 'Health', description: 'System health checks' },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'System health check',
        tags: ['Health'],
        security: [],
        responses: {
          200: {
            description: 'System is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    timestamp: { type: 'string' },
                    uptime: { type: 'number' },
                    database: { type: 'string' },
                    redis: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    // Auth endpoints would be documented here
    // ... (paths would be extensive, keeping this minimal for brevity)
  },
};

const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .info .title { color: #3b82f6 }
  `,
  customSiteTitle: 'Student Pass System API Documentation',
  customfavIcon: '/favicon.ico',
};

export const setupSwagger = (app: Express, apiPrefix: string): void => {
  try {
    // Serve Swagger UI
    app.use(
      `/${apiPrefix}/docs`,
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument, swaggerOptions)
    );

    // Serve Swagger JSON
    app.get(`/${apiPrefix}/docs.json`, (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerDocument);
    });

    logger.info(`📚 Swagger documentation available at /${apiPrefix}/docs`);
  } catch (error) {
    logger.error('Failed to setup Swagger documentation:', error);
  }
};