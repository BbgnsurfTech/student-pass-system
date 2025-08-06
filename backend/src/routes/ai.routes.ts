import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { aiController } from '../controllers/ai.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { rateLimitAI } from '../middleware/rateLimitAI.middleware';

const router = Router();

// Apply authentication to all AI routes
router.use(authenticateToken);

// Apply AI-specific rate limiting
router.use(rateLimitAI);

// Intelligent Pass Approval Routes
router.post('/approval/predict',
  [
    body('application').isObject().withMessage('Application object is required'),
    body('application.studentId').isString().withMessage('Student ID is required'),
    body('application.passType').isString().withMessage('Pass type is required'),
    body('application.documents').isArray().withMessage('Documents array is required'),
    validateRequest
  ],
  aiController.predictApproval
);

// Predictive Analytics Routes
router.get('/analytics/peak-periods',
  [
    query('daysAhead').optional().isInt({ min: 1, max: 90 }).withMessage('Days ahead must be between 1 and 90'),
    validateRequest
  ],
  aiController.predictPeakPeriods
);

router.get('/analytics/system-usage',
  [
    query('metric').optional().isIn(['cpu', 'memory', 'storage', 'network', 'database_connections']).withMessage('Invalid metric'),
    query('hoursAhead').optional().isInt({ min: 1, max: 168 }).withMessage('Hours ahead must be between 1 and 168'),
    validateRequest
  ],
  aiController.forecastSystemUsage
);

router.get('/analytics/capacity-needs',
  [
    query('timeframe').optional().isIn(['week', 'month', 'quarter']).withMessage('Invalid timeframe'),
    validateRequest
  ],
  aiController.predictCapacityNeeds
);

router.get('/analytics/security-risks',
  [
    query('lookAheadDays').optional().isInt({ min: 1, max: 30 }).withMessage('Look ahead days must be between 1 and 30'),
    validateRequest
  ],
  aiController.identifySecurityRisks
);

router.post('/analytics/dropout-risk',
  [
    body('studentIds').optional().isArray().withMessage('Student IDs must be an array'),
    validateRequest
  ],
  aiController.predictStudentDropoutRisk
);

router.post('/analytics/anomalies',
  [
    body('metrics').optional().isArray().withMessage('Metrics must be an array'),
    validateRequest
  ],
  aiController.detectAnomalies
);

router.get('/analytics/insights',
  [
    query('timeframe').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid timeframe'),
    validateRequest
  ],
  aiController.generateInsights
);

// Natural Language Processing Routes
router.post('/nlp/chat',
  [
    body('userId').isString().withMessage('User ID is required'),
    body('message').isString().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
    body('conversationId').optional().isString().withMessage('Conversation ID must be a string'),
    validateRequest
  ],
  aiController.processChatMessage
);

router.post('/nlp/classify-ticket',
  [
    body('title').isString().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
    body('description').isString().isLength({ min: 1, max: 2000 }).withMessage('Description must be between 1 and 2000 characters'),
    body('attachments').optional().isArray().withMessage('Attachments must be an array'),
    validateRequest
  ],
  aiController.classifySupportTicket
);

router.post('/nlp/sentiment',
  [
    body('text').isString().isLength({ min: 1, max: 5000 }).withMessage('Text must be between 1 and 5000 characters'),
    validateRequest
  ],
  aiController.analyzeSentiment
);

router.post('/nlp/extract-document',
  [
    body('documentText').isString().withMessage('Document text is required'),
    body('documentType').optional().isString().withMessage('Document type must be a string'),
    validateRequest
  ],
  aiController.extractDocumentInfo
);

router.post('/nlp/detect-language',
  [
    body('text').isString().isLength({ min: 1, max: 1000 }).withMessage('Text must be between 1 and 1000 characters'),
    validateRequest
  ],
  aiController.detectLanguage
);

// Computer Vision Routes
router.post('/cv/verify-document',
  [
    body('imagePath').isString().withMessage('Image path is required'),
    body('expectedType').optional().isString().withMessage('Expected type must be a string'),
    body('options').optional().isObject().withMessage('Options must be an object'),
    validateRequest
  ],
  aiController.verifyDocument
);

router.post('/cv/recognize-face',
  [
    body('imagePath').isString().withMessage('Image path is required'),
    body('referenceImagePath').optional().isString().withMessage('Reference image path must be a string'),
    body('personId').optional().isString().withMessage('Person ID must be a string'),
    validateRequest
  ],
  aiController.recognizeFace
);

router.post('/cv/analyze-qr',
  [
    body('imagePath').isString().withMessage('Image path is required'),
    validateRequest
  ],
  aiController.analyzeQRCode
);

router.post('/cv/validate-photo',
  [
    body('imagePath').isString().withMessage('Image path is required'),
    body('requirements').optional().isObject().withMessage('Requirements must be an object'),
    validateRequest
  ],
  aiController.validatePhoto
);

router.post('/cv/assess-damage',
  [
    body('imagePath').isString().withMessage('Image path is required'),
    body('passType').isString().withMessage('Pass type is required'),
    validateRequest
  ],
  aiController.assessDamage
);

router.post('/cv/enhance-image',
  [
    body('imagePath').isString().withMessage('Image path is required'),
    body('options').isObject().withMessage('Options object is required'),
    validateRequest
  ],
  aiController.enhanceImage
);

// Recommendation Engine Routes
router.get('/recommendations/:userId/personalized',
  [
    param('userId').isString().withMessage('User ID is required'),
    query('maxRecommendations').optional().isInt({ min: 1, max: 50 }).withMessage('Max recommendations must be between 1 and 50'),
    validateRequest
  ],
  aiController.getPersonalizedRecommendations
);

router.get('/recommendations/:userId/collaborative',
  [
    param('userId').isString().withMessage('User ID is required'),
    query('itemType').optional().isString().withMessage('Item type must be a string'),
    validateRequest
  ],
  aiController.getCollaborativeRecommendations
);

router.get('/recommendations/:userId/content-based',
  [
    param('userId').isString().withMessage('User ID is required'),
    query('itemType').isString().withMessage('Item type is required'),
    validateRequest
  ],
  aiController.getContentBasedRecommendations
);

router.get('/recommendations/:userId/hybrid',
  [
    param('userId').isString().withMessage('User ID is required'),
    query('itemType').optional().isString().withMessage('Item type must be a string'),
    validateRequest
  ],
  aiController.getHybridRecommendations
);

router.post('/recommendations/:userId/optimal-time',
  [
    param('userId').isString().withMessage('User ID is required'),
    body('passType').isString().withMessage('Pass type is required'),
    validateRequest
  ],
  aiController.recommendOptimalTime
);

router.post('/recommendations/:userId/security',
  [
    param('userId').isString().withMessage('User ID is required'),
    body('userType').isIn(['student', 'staff', 'admin']).withMessage('User type must be student, staff, or admin'),
    validateRequest
  ],
  aiController.recommendSecurityImprovements
);

router.get('/recommendations/:userId/workflow',
  [
    param('userId').isString().withMessage('User ID is required'),
    validateRequest
  ],
  aiController.recommendWorkflowOptimizations
);

router.get('/recommendations/:userId/dashboard',
  [
    param('userId').isString().withMessage('User ID is required'),
    validateRequest
  ],
  aiController.recommendDashboardCustomization
);

router.put('/recommendations/:userId/:recommendationId/feedback',
  [
    param('userId').isString().withMessage('User ID is required'),
    param('recommendationId').isString().withMessage('Recommendation ID is required'),
    body('feedback').isIn(['helpful', 'not_helpful', 'implemented']).withMessage('Invalid feedback value'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    validateRequest
  ],
  aiController.updateRecommendationFeedback
);

// Fraud Detection Routes
router.post('/fraud/analyze',
  [
    body('userId').isString().withMessage('User ID is required'),
    body('activity').isObject().withMessage('Activity object is required'),
    body('activity.type').isIn(['login', 'application', 'payment', 'profile_update', 'password_change']).withMessage('Invalid activity type'),
    body('activity.metadata').isObject().withMessage('Activity metadata is required'),
    body('activity.metadata.ipAddress').isIP().withMessage('Valid IP address is required'),
    body('activity.metadata.userAgent').isString().withMessage('User agent is required'),
    validateRequest
  ],
  aiController.analyzeFraudRisk
);

router.get('/fraud/:userId/behavior',
  [
    param('userId').isString().withMessage('User ID is required'),
    validateRequest
  ],
  aiController.performBehaviorAnalysis
);

router.get('/fraud/:userId/network',
  [
    param('userId').isString().withMessage('User ID is required'),
    validateRequest
  ],
  aiController.performNetworkAnalysis
);

router.get('/fraud/coordinated-attacks',
  aiController.detectCoordinatedAttacks
);

router.get('/fraud/insights',
  [
    query('timeframe').optional().isIn(['day', 'week', 'month']).withMessage('Invalid timeframe'),
    validateRequest
  ],
  aiController.getFraudInsights
);

// Core AI Service Routes
router.post('/models/:modelName/train',
  [
    param('modelName').isString().withMessage('Model name is required'),
    body('trainingData').isObject().withMessage('Training data is required'),
    body('trainingData.features').isArray().withMessage('Features array is required'),
    body('trainingData.labels').isArray().withMessage('Labels array is required'),
    validateRequest
  ],
  aiController.trainModel
);

router.get('/models/:modelName/performance',
  [
    param('modelName').isString().withMessage('Model name is required'),
    validateRequest
  ],
  aiController.getModelPerformance
);

router.post('/embeddings',
  [
    body('text').isString().isLength({ min: 1, max: 8000 }).withMessage('Text must be between 1 and 8000 characters'),
    validateRequest
  ],
  aiController.generateEmbeddings
);

router.post('/completion',
  [
    body('prompt').isString().isLength({ min: 1, max: 2000 }).withMessage('Prompt must be between 1 and 2000 characters'),
    body('maxTokens').optional().isInt({ min: 1, max: 1000 }).withMessage('Max tokens must be between 1 and 1000'),
    body('temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be between 0 and 2'),
    validateRequest
  ],
  aiController.generateCompletion
);

router.post('/chat-completion',
  [
    body('messages').isArray().withMessage('Messages array is required'),
    body('messages.*.role').isIn(['system', 'user', 'assistant']).withMessage('Invalid message role'),
    body('messages.*.content').isString().withMessage('Message content is required'),
    body('maxTokens').optional().isInt({ min: 1, max: 1000 }).withMessage('Max tokens must be between 1 and 1000'),
    body('temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be between 0 and 2'),
    validateRequest
  ],
  aiController.chatCompletion
);

// Health check endpoint for AI services
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      aiCore: 'operational',
      intelligentApproval: 'operational',
      predictiveAnalytics: 'operational',
      nlp: 'operational',
      computerVision: 'operational',
      recommendationEngine: 'operational',
      fraudDetection: 'operational'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;