import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { intelligentPassApprovalService } from '../services/ai/intelligentPassApproval.service';
import { predictiveAnalyticsService } from '../services/ai/predictiveAnalytics.service';
import { nlpService } from '../services/ai/naturalLanguageProcessing.service';
import { computerVisionService } from '../services/ai/computerVision.service';
import { recommendationEngineService } from '../services/ai/recommendationEngine.service';
import { fraudDetectionService } from '../services/ai/fraudDetection.service';
import { aiService } from '../services/ai/core/aiService';
import { logger } from '../utils/logger';

export class AIController {
  // Intelligent Pass Approval
  async predictApproval(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { application } = req.body;
      const prediction = await intelligentPassApprovalService.predictApproval(application);

      res.json({
        success: true,
        data: prediction,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Approval prediction error:', error);
      next(error);
    }
  }

  // Predictive Analytics
  async predictPeakPeriods(req: Request, res: Response, next: NextFunction) {
    try {
      const { daysAhead = 30 } = req.query;
      const predictions = await predictiveAnalyticsService.predictPeakApplicationPeriods(
        parseInt(daysAhead as string)
      );

      res.json({
        success: true,
        data: predictions,
        metadata: {
          daysAhead: parseInt(daysAhead as string),
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Peak prediction error:', error);
      next(error);
    }
  }

  async forecastSystemUsage(req: Request, res: Response, next: NextFunction) {
    try {
      const { metric = 'cpu', hoursAhead = 24 } = req.query;
      const forecast = await predictiveAnalyticsService.forecastSystemUsage(
        metric as any,
        parseInt(hoursAhead as string)
      );

      res.json({
        success: true,
        data: forecast,
        metadata: {
          metric,
          hoursAhead: parseInt(hoursAhead as string),
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Usage forecast error:', error);
      next(error);
    }
  }

  async predictCapacityNeeds(req: Request, res: Response, next: NextFunction) {
    try {
      const { timeframe = 'month' } = req.query;
      const forecast = await predictiveAnalyticsService.predictCapacityNeeds(timeframe as any);

      res.json({
        success: true,
        data: forecast,
        metadata: {
          timeframe,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Capacity prediction error:', error);
      next(error);
    }
  }

  async identifySecurityRisks(req: Request, res: Response, next: NextFunction) {
    try {
      const { lookAheadDays = 7 } = req.query;
      const risks = await predictiveAnalyticsService.identifySecurityRisks(
        parseInt(lookAheadDays as string)
      );

      res.json({
        success: true,
        data: risks,
        metadata: {
          lookAheadDays: parseInt(lookAheadDays as string),
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Security risk prediction error:', error);
      next(error);
    }
  }

  async predictStudentDropoutRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentIds } = req.body;
      const predictions = await predictiveAnalyticsService.predictStudentDropoutRisk(studentIds);

      res.json({
        success: true,
        data: predictions,
        metadata: {
          studentsAnalyzed: studentIds?.length || 'all_at_risk',
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Dropout prediction error:', error);
      next(error);
    }
  }

  async detectAnomalies(req: Request, res: Response, next: NextFunction) {
    try {
      const { metrics } = req.body;
      const anomalies = await predictiveAnalyticsService.detectAnomalies(metrics);

      res.json({
        success: true,
        data: anomalies,
        metadata: {
          metricsAnalyzed: metrics?.length || 'default_set',
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Anomaly detection error:', error);
      next(error);
    }
  }

  async generateInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const { timeframe = 'weekly' } = req.query;
      const insights = await predictiveAnalyticsService.generateInsights(timeframe as any);

      res.json({
        success: true,
        data: insights,
        metadata: {
          timeframe,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Insights generation error:', error);
      next(error);
    }
  }

  // Natural Language Processing
  async processChatMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { userId, message, conversationId } = req.body;
      const response = await nlpService.processChatMessage(userId, message, conversationId);

      res.json({
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Chat processing error:', error);
      next(error);
    }
  }

  async classifySupportTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, attachments } = req.body;
      const classification = await nlpService.classifySupportTicket(title, description, attachments);

      res.json({
        success: true,
        data: classification,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Ticket classification error:', error);
      next(error);
    }
  }

  async analyzeSentiment(req: Request, res: Response, next: NextFunction) {
    try {
      const { text } = req.body;
      const analysis = nlpService.analyzeSentiment(text);

      res.json({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Sentiment analysis error:', error);
      next(error);
    }
  }

  async extractDocumentInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { documentText, documentType } = req.body;
      const extraction = await nlpService.extractDocumentInformation(documentText, documentType);

      res.json({
        success: true,
        data: extraction,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Document extraction error:', error);
      next(error);
    }
  }

  async detectLanguage(req: Request, res: Response, next: NextFunction) {
    try {
      const { text } = req.body;
      const detection = await nlpService.detectLanguage(text);

      res.json({
        success: true,
        data: detection,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Language detection error:', error);
      next(error);
    }
  }

  // Computer Vision
  async verifyDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { imagePath, expectedType, options } = req.body;
      const verification = await computerVisionService.verifyDocument(
        imagePath,
        expectedType,
        options
      );

      res.json({
        success: true,
        data: verification,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Document verification error:', error);
      next(error);
    }
  }

  async recognizeFace(req: Request, res: Response, next: NextFunction) {
    try {
      const { imagePath, referenceImagePath, personId } = req.body;
      const recognition = await computerVisionService.recognizeFace(
        imagePath,
        referenceImagePath,
        personId
      );

      res.json({
        success: true,
        data: recognition,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Face recognition error:', error);
      next(error);
    }
  }

  async analyzeQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { imagePath } = req.body;
      const analysis = await computerVisionService.analyzeQRCode(imagePath);

      res.json({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('QR code analysis error:', error);
      next(error);
    }
  }

  async validatePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const { imagePath, requirements } = req.body;
      const validation = await computerVisionService.validatePhoto(imagePath, requirements);

      res.json({
        success: true,
        data: validation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Photo validation error:', error);
      next(error);
    }
  }

  async assessDamage(req: Request, res: Response, next: NextFunction) {
    try {
      const { imagePath, passType } = req.body;
      const assessment = await computerVisionService.assessDamage(imagePath, passType);

      res.json({
        success: true,
        data: assessment,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Damage assessment error:', error);
      next(error);
    }
  }

  async enhanceImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { imagePath, options } = req.body;
      const enhancement = await computerVisionService.enhanceImage(imagePath, options);

      res.json({
        success: true,
        data: enhancement,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Image enhancement error:', error);
      next(error);
    }
  }

  // Recommendation Engine
  async getPersonalizedRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { maxRecommendations = 10 } = req.query;
      
      const recommendations = await recommendationEngineService.generatePersonalizedRecommendations(
        userId,
        parseInt(maxRecommendations as string)
      );

      res.json({
        success: true,
        data: recommendations,
        metadata: {
          userId,
          maxRecommendations: parseInt(maxRecommendations as string),
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Personalized recommendations error:', error);
      next(error);
    }
  }

  async getCollaborativeRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { itemType = 'pass_application' } = req.query;
      
      const recommendations = await recommendationEngineService.performCollaborativeFiltering(
        userId,
        itemType as string
      );

      res.json({
        success: true,
        data: recommendations,
        metadata: {
          userId,
          itemType,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Collaborative recommendations error:', error);
      next(error);
    }
  }

  async getContentBasedRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { itemType } = req.query;
      
      const recommendations = await recommendationEngineService.performContentBasedRecommendation(
        userId,
        itemType as string
      );

      res.json({
        success: true,
        data: recommendations,
        metadata: {
          userId,
          itemType,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Content-based recommendations error:', error);
      next(error);
    }
  }

  async getHybridRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { itemType = 'general' } = req.query;
      
      const recommendations = await recommendationEngineService.generateHybridRecommendations(
        userId,
        itemType as string
      );

      res.json({
        success: true,
        data: recommendations,
        metadata: {
          userId,
          itemType,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Hybrid recommendations error:', error);
      next(error);
    }
  }

  async recommendOptimalTime(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { passType } = req.body;
      
      const recommendation = await recommendationEngineService.recommendOptimalApplicationTime(
        userId,
        passType
      );

      res.json({
        success: true,
        data: recommendation,
        metadata: {
          userId,
          passType,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Optimal timing recommendation error:', error);
      next(error);
    }
  }

  async recommendSecurityImprovements(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { userType } = req.body;
      
      const recommendations = await recommendationEngineService.recommendSecurityImprovements(
        userId,
        userType
      );

      res.json({
        success: true,
        data: recommendations,
        metadata: {
          userId,
          userType,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Security recommendations error:', error);
      next(error);
    }
  }

  async recommendWorkflowOptimizations(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      
      const recommendations = await recommendationEngineService.recommendWorkflowOptimizations(userId);

      res.json({
        success: true,
        data: recommendations,
        metadata: {
          userId,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Workflow recommendations error:', error);
      next(error);
    }
  }

  async recommendDashboardCustomization(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      
      const recommendations = await recommendationEngineService.recommendDashboardCustomization(userId);

      res.json({
        success: true,
        data: recommendations,
        metadata: {
          userId,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Dashboard recommendations error:', error);
      next(error);
    }
  }

  async updateRecommendationFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, recommendationId } = req.params;
      const { feedback, rating } = req.body;
      
      await recommendationEngineService.updateRecommendationFeedback(
        userId,
        recommendationId,
        feedback,
        rating
      );

      res.json({
        success: true,
        message: 'Feedback updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Recommendation feedback error:', error);
      next(error);
    }
  }

  // Fraud Detection
  async analyzeFraudRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, activity } = req.body;
      const analysis = await fraudDetectionService.analyzeFraudRisk(userId, activity);

      res.json({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Fraud risk analysis error:', error);
      next(error);
    }
  }

  async performBehaviorAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const analysis = await fraudDetectionService.performRealTimeBehaviorAnalysis(userId);

      res.json({
        success: true,
        data: analysis,
        metadata: {
          userId,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Behavior analysis error:', error);
      next(error);
    }
  }

  async performNetworkAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const analysis = await fraudDetectionService.performNetworkAnalysis(userId);

      res.json({
        success: true,
        data: analysis,
        metadata: {
          userId,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Network analysis error:', error);
      next(error);
    }
  }

  async detectCoordinatedAttacks(req: Request, res: Response, next: NextFunction) {
    try {
      const detection = await fraudDetectionService.detectCoordinatedAttacks();

      res.json({
        success: true,
        data: detection,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Coordinated attack detection error:', error);
      next(error);
    }
  }

  async getFraudInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const { timeframe = 'week' } = req.query;
      const insights = await fraudDetectionService.generateFraudInsights(timeframe as any);

      res.json({
        success: true,
        data: insights,
        metadata: {
          timeframe,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Fraud insights error:', error);
      next(error);
    }
  }

  // Core AI Service
  async trainModel(req: Request, res: Response, next: NextFunction) {
    try {
      const { modelName, trainingData } = req.body;
      
      await aiService.trainModel(modelName, trainingData);

      res.json({
        success: true,
        message: `Model ${modelName} training initiated`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Model training error:', error);
      next(error);
    }
  }

  async getModelPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const { modelName } = req.params;
      const performance = await aiService.getModelPerformance(modelName);

      res.json({
        success: true,
        data: performance,
        metadata: {
          modelName,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Model performance error:', error);
      next(error);
    }
  }

  async generateEmbeddings(req: Request, res: Response, next: NextFunction) {
    try {
      const { text } = req.body;
      const embeddings = await aiService.generateEmbeddings(text);

      res.json({
        success: true,
        data: { embeddings },
        metadata: {
          textLength: text.length,
          embeddingSize: embeddings.length,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Embedding generation error:', error);
      next(error);
    }
  }

  async generateCompletion(req: Request, res: Response, next: NextFunction) {
    try {
      const { prompt, maxTokens = 150, temperature = 0.7 } = req.body;
      const completion = await aiService.generateCompletion(prompt, maxTokens, temperature);

      res.json({
        success: true,
        data: { completion },
        metadata: {
          promptLength: prompt.length,
          maxTokens,
          temperature,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Completion generation error:', error);
      next(error);
    }
  }

  async chatCompletion(req: Request, res: Response, next: NextFunction) {
    try {
      const { messages, maxTokens = 150, temperature = 0.7 } = req.body;
      const response = await aiService.chatCompletion(messages, maxTokens, temperature);

      res.json({
        success: true,
        data: { response },
        metadata: {
          messageCount: messages.length,
          maxTokens,
          temperature,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Chat completion error:', error);
      next(error);
    }
  }
}

export const aiController = new AIController();