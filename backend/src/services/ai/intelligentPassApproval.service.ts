import { PrismaClient } from '@prisma/client';
import { aiService, PredictionResult } from './core/aiService';
import { logger } from '../utils/logger';
import { metricsService } from './metrics.service';
import { notificationService } from './notification.service';

export interface PassApplication {
  id: string;
  studentId: string;
  passType: string;
  applicationDate: Date;
  documents: Document[];
  previousApplications?: number;
  gpa?: number;
  attendanceRate?: number;
  disciplinaryRecords?: number;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  applicantHistory?: ApplicationHistory;
}

export interface Document {
  type: string;
  url: string;
  verificationStatus?: 'verified' | 'pending' | 'rejected';
  confidenceScore?: number;
}

export interface ApplicationHistory {
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  averageProcessingTime: number;
  lastApplicationDate?: Date;
}

export interface ApprovalPrediction {
  approvalLikelihood: number;
  riskScore: number;
  fraudScore: number;
  recommendedAction: 'approve' | 'review' | 'reject';
  reasonsForDecision: string[];
  requiredReviewer?: string;
  estimatedProcessingTime: number;
  urgencyScore: number;
}

export interface FraudDetectionResult {
  isFraudulent: boolean;
  fraudScore: number;
  riskFactors: string[];
  suspiciousPatterns: string[];
  recommendedAction: string;
}

export class IntelligentPassApprovalService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async predictApproval(application: PassApplication): Promise<ApprovalPrediction> {
    try {
      const features = await this.extractFeatures(application);
      
      // Get approval likelihood prediction
      const approvalResult = await aiService.predict('approval_predictor', features.approval);
      
      // Get risk assessment
      const riskResult = await aiService.predict('risk_assessment', features.risk);
      
      // Get fraud detection
      const fraudResult = await this.detectFraud(application);
      
      // Calculate urgency score
      const urgencyScore = this.calculateUrgencyScore(application);
      
      const prediction: ApprovalPrediction = {
        approvalLikelihood: approvalResult.prediction[0],
        riskScore: this.calculateRiskScore(riskResult.prediction),
        fraudScore: fraudResult.fraudScore,
        recommendedAction: this.determineRecommendedAction(
          approvalResult.prediction[0],
          fraudResult.fraudScore,
          urgencyScore
        ),
        reasonsForDecision: await this.generateReasons(
          application,
          approvalResult,
          riskResult,
          fraudResult
        ),
        requiredReviewer: await this.determineRequiredReviewer(
          application,
          riskResult.prediction
        ),
        estimatedProcessingTime: this.estimateProcessingTime(
          application,
          urgencyScore,
          fraudResult.fraudScore
        ),
        urgencyScore
      };

      // Store prediction for learning
      await this.storePrediction(application.id, prediction);
      
      // Trigger automated actions if needed
      await this.triggerAutomatedActions(application, prediction);

      return prediction;
    } catch (error) {
      logger.error('Approval prediction error:', error);
      throw new Error(`Approval prediction failed: ${error.message}`);
    }
  }

  private async extractFeatures(application: PassApplication): Promise<{
    approval: number[];
    risk: number[];
  }> {
    const features = {
      approval: [],
      risk: []
    };

    // Student features
    const studentData = await this.getStudentData(application.studentId);
    
    // Approval features (15 features)
    features.approval = [
      // Academic performance
      studentData.gpa || 0,
      studentData.attendanceRate || 0,
      studentData.creditsCompleted || 0,
      
      // Application history
      application.applicantHistory?.approvedApplications || 0,
      application.applicantHistory?.rejectedApplications || 0,
      application.applicantHistory?.totalApplications || 0,
      
      // Current application
      this.encodePassType(application.passType),
      this.daysSinceLastApplication(application.applicantHistory?.lastApplicationDate),
      application.documents.length,
      
      // Behavioral factors
      studentData.disciplinaryRecords || 0,
      studentData.extracurricularActivities || 0,
      studentData.communityService || 0,
      
      // Temporal features
      this.extractTemporalFeatures(application.applicationDate),
      this.isWeekend(application.applicationDate) ? 1 : 0,
      this.isHoliday(application.applicationDate) ? 1 : 0
    ];

    // Risk features (25 features)
    features.risk = [
      ...features.approval, // Include all approval features
      
      // Additional risk factors
      studentData.financialAidStatus || 0,
      studentData.internationalStudent ? 1 : 0,
      studentData.firstTimeApplicant ? 1 : 0,
      this.calculateDocumentRiskScore(application.documents),
      this.calculateTimeRiskScore(application.applicationDate),
      studentData.previousViolations || 0,
      studentData.accountStatus || 0,
      this.calculateApplicationVelocity(application.studentId),
      studentData.graduationStatus || 0,
      studentData.enrollmentStatus || 0
    ];

    return features;
  }

  private async detectFraud(application: PassApplication): Promise<FraudDetectionResult> {
    try {
      const fraudFeatures = await this.extractFraudFeatures(application);
      const result = await aiService.predict('fraud_detection', fraudFeatures);
      
      const fraudScore = result.prediction[0];
      const isFraudulent = fraudScore > 0.7;
      
      // Analyze suspicious patterns
      const suspiciousPatterns = await this.analyzeSuspiciousPatterns(application);
      const riskFactors = await this.identifyRiskFactors(application, fraudScore);

      return {
        isFraudulent,
        fraudScore,
        riskFactors,
        suspiciousPatterns,
        recommendedAction: this.getRecommendedFraudAction(fraudScore)
      };
    } catch (error) {
      logger.error('Fraud detection error:', error);
      throw new Error(`Fraud detection failed: ${error.message}`);
    }
  }

  private async extractFraudFeatures(application: PassApplication): Promise<number[]> {
    const studentBehavior = await this.analyzeStudentBehavior(application.studentId);
    const documentAnalysis = await this.analyzeDocuments(application.documents);
    const temporalAnalysis = this.analyzeTemporalPatterns(application);

    return [
      // Behavioral features
      studentBehavior.applicationFrequency,
      studentBehavior.unusualTiming ? 1 : 0,
      studentBehavior.deviceFingerprint,
      studentBehavior.locationConsistency,
      studentBehavior.sessionDuration,
      
      // Document features  
      documentAnalysis.qualityScore,
      documentAnalysis.consistencyScore,
      documentAnalysis.verificationScore,
      documentAnalysis.duplicateScore,
      documentAnalysis.metadataScore,
      
      // Temporal features
      temporalAnalysis.velocityScore,
      temporalAnalysis.patternScore,
      temporalAnalysis.anomalyScore,
      temporalAnalysis.seasonalityScore,
      
      // Network features
      await this.calculateNetworkRisk(application.studentId),
      await this.calculatePeerBehaviorScore(application.studentId),
      
      // Historical features
      await this.calculateHistoricalAnomalyScore(application.studentId),
      await this.calculateReputationScore(application.studentId),
      
      // System features
      this.calculateSystemLoadFactor(),
      this.calculateConcurrentApplications()
    ];
  }

  private determineRecommendedAction(
    approvalLikelihood: number,
    fraudScore: number,
    urgencyScore: number
  ): 'approve' | 'review' | 'reject' {
    if (fraudScore > 0.8) return 'reject';
    if (fraudScore > 0.5) return 'review';
    if (approvalLikelihood > 0.8 && urgencyScore > 0.7) return 'approve';
    if (approvalLikelihood > 0.6) return 'review';
    if (approvalLikelihood < 0.3) return 'reject';
    return 'review';
  }

  private async generateReasons(
    application: PassApplication,
    approvalResult: PredictionResult,
    riskResult: PredictionResult,
    fraudResult: FraudDetectionResult
  ): Promise<string[]> {
    const reasons: string[] = [];

    // Use AI to generate human-readable explanations
    const prompt = `
      Explain the decision for student pass application based on:
      - Approval likelihood: ${approvalResult.prediction[0]}
      - Risk score: ${riskResult.prediction[0]}
      - Fraud score: ${fraudResult.fraudScore}
      - Pass type: ${application.passType}
      - Application urgency: ${application.urgencyLevel}
      
      Provide 3-5 concise bullet points explaining the key factors.
    `;

    try {
      const explanation = await aiService.generateCompletion(prompt, 200, 0.3);
      const points = explanation.split('\n').filter(line => line.trim().startsWith('-'));
      reasons.push(...points.map(point => point.trim().substring(1).trim()));
    } catch (error) {
      logger.error('Failed to generate AI reasons:', error);
      // Fallback to rule-based reasons
      reasons.push(...this.generateFallbackReasons(approvalResult, riskResult, fraudResult));
    }

    return reasons;
  }

  private generateFallbackReasons(
    approvalResult: PredictionResult,
    riskResult: PredictionResult,
    fraudResult: FraudDetectionResult
  ): string[] {
    const reasons: string[] = [];

    if (approvalResult.prediction[0] > 0.8) {
      reasons.push('High approval likelihood based on historical patterns');
    } else if (approvalResult.prediction[0] < 0.3) {
      reasons.push('Low approval likelihood due to risk factors');
    }

    if (fraudResult.fraudScore > 0.7) {
      reasons.push('High fraud risk detected in application');
    }

    if (riskResult.prediction[0] > 0.6) {
      reasons.push('Elevated risk score requires additional review');
    }

    return reasons;
  }

  private async determineRequiredReviewer(
    application: PassApplication,
    riskPrediction: number[]
  ): Promise<string> {
    const riskLevel = Math.max(...riskPrediction);
    
    if (riskLevel > 0.8) return 'senior_officer';
    if (riskLevel > 0.6) return 'experienced_officer';
    if (application.urgencyLevel === 'critical') return 'duty_officer';
    
    return 'standard_officer';
  }

  private calculateUrgencyScore(application: PassApplication): number {
    let score = 0.5; // Base score

    // Urgency level mapping
    const urgencyMapping = {
      'low': 0.2,
      'medium': 0.5,
      'high': 0.8,
      'critical': 1.0
    };

    score = urgencyMapping[application.urgencyLevel] || 0.5;

    // Adjust based on application date proximity to academic deadlines
    const daysUntilDeadline = this.getDaysUntilDeadline();
    if (daysUntilDeadline <= 3) score += 0.3;
    else if (daysUntilDeadline <= 7) score += 0.2;
    else if (daysUntilDeadline <= 14) score += 0.1;

    return Math.min(score, 1.0);
  }

  private estimateProcessingTime(
    application: PassApplication,
    urgencyScore: number,
    fraudScore: number
  ): number {
    let baseTime = 24; // Base 24 hours

    // Adjust for urgency
    if (urgencyScore > 0.8) baseTime *= 0.25; // 6 hours
    else if (urgencyScore > 0.6) baseTime *= 0.5; // 12 hours
    else if (urgencyScore > 0.4) baseTime *= 0.75; // 18 hours

    // Adjust for fraud risk
    if (fraudScore > 0.7) baseTime *= 3; // Additional review time
    else if (fraudScore > 0.5) baseTime *= 2;

    // Adjust for document count
    baseTime += application.documents.length * 2;

    return Math.round(baseTime);
  }

  private async triggerAutomatedActions(
    application: PassApplication,
    prediction: ApprovalPrediction
  ): Promise<void> {
    try {
      // Auto-approve low-risk, high-confidence applications
      if (
        prediction.recommendedAction === 'approve' &&
        prediction.approvalLikelihood > 0.9 &&
        prediction.fraudScore < 0.2
      ) {
        await this.autoApprove(application, prediction);
      }

      // Auto-reject high-fraud applications
      if (prediction.fraudScore > 0.9) {
        await this.autoReject(application, prediction);
      }

      // Route to appropriate reviewer
      await this.routeToReviewer(application, prediction);

      // Send notifications
      await this.sendNotifications(application, prediction);

      // Update priority queue
      await this.updatePriorityQueue(application, prediction);

    } catch (error) {
      logger.error('Failed to trigger automated actions:', error);
    }
  }

  private async autoApprove(application: PassApplication, prediction: ApprovalPrediction) {
    await this.prisma.passApplication.update({
      where: { id: application.id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: 'AI_SYSTEM',
        processingTime: prediction.estimatedProcessingTime,
        aiPrediction: JSON.stringify(prediction)
      }
    });

    await notificationService.sendApprovalNotification(application.studentId, {
      status: 'approved',
      processingMethod: 'automated',
      estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    logger.info(`Application ${application.id} auto-approved`);
  }

  private async autoReject(application: PassApplication, prediction: ApprovalPrediction) {
    await this.prisma.passApplication.update({
      where: { id: application.id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: 'AI_SYSTEM',
        rejectionReason: prediction.reasonsForDecision.join('; '),
        aiPrediction: JSON.stringify(prediction)
      }
    });

    await notificationService.sendRejectionNotification(application.studentId, {
      reasons: prediction.reasonsForDecision,
      appealProcess: true
    });

    logger.info(`Application ${application.id} auto-rejected due to fraud risk`);
  }

  private async routeToReviewer(application: PassApplication, prediction: ApprovalPrediction) {
    const reviewer = await this.findBestReviewer(prediction.requiredReviewer, prediction.urgencyScore);
    
    await this.prisma.applicationQueue.create({
      data: {
        applicationId: application.id,
        assignedTo: reviewer.id,
        priority: this.calculatePriority(prediction),
        estimatedReviewTime: prediction.estimatedProcessingTime,
        aiInsights: JSON.stringify({
          approvalLikelihood: prediction.approvalLikelihood,
          riskScore: prediction.riskScore,
          fraudScore: prediction.fraudScore,
          reasons: prediction.reasonsForDecision
        })
      }
    });
  }

  private async storePrediction(applicationId: string, prediction: ApprovalPrediction) {
    await this.prisma.aIPrediction.create({
      data: {
        applicationId,
        modelType: 'approval_predictor',
        prediction: JSON.stringify(prediction),
        confidence: prediction.approvalLikelihood,
        timestamp: new Date()
      }
    });
  }

  // Helper methods (simplified for brevity)
  private async getStudentData(studentId: string): Promise<any> {
    return await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        academicRecord: true,
        disciplinaryRecords: true,
        applications: true
      }
    });
  }

  private encodePassType(passType: string): number {
    const mapping = { 'temporary': 0.2, 'semester': 0.5, 'annual': 0.8, 'permanent': 1.0 };
    return mapping[passType] || 0.5;
  }

  private daysSinceLastApplication(lastDate?: Date): number {
    if (!lastDate) return 999;
    return Math.floor((Date.now() - lastDate.getTime()) / (24 * 60 * 60 * 1000));
  }

  private extractTemporalFeatures(date: Date): number {
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    const month = date.getMonth();
    
    // Normalize to 0-1 range
    return (hour + dayOfWeek * 24 + month * 24 * 7) / (24 * 7 * 12);
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  private isHoliday(date: Date): boolean {
    // Implement holiday detection logic
    return false;
  }

  private calculateRiskScore(predictions: number[]): number {
    return Math.max(...predictions);
  }

  private calculatePriority(prediction: ApprovalPrediction): number {
    return prediction.urgencyScore * 0.4 + 
           (1 - prediction.fraudScore) * 0.3 + 
           prediction.approvalLikelihood * 0.3;
  }

  // Placeholder implementations for complex analysis methods
  private async analyzeStudentBehavior(studentId: string): Promise<any> {
    return {
      applicationFrequency: 0.5,
      unusualTiming: false,
      deviceFingerprint: 0.8,
      locationConsistency: 0.9,
      sessionDuration: 0.7
    };
  }

  private async analyzeDocuments(documents: Document[]): Promise<any> {
    return {
      qualityScore: 0.85,
      consistencyScore: 0.9,
      verificationScore: 0.8,
      duplicateScore: 0.95,
      metadataScore: 0.87
    };
  }

  private analyzeTemporalPatterns(application: PassApplication): any {
    return {
      velocityScore: 0.6,
      patternScore: 0.7,
      anomalyScore: 0.3,
      seasonalityScore: 0.8
    };
  }

  private async calculateNetworkRisk(studentId: string): Promise<number> {
    return 0.4;
  }

  private async calculatePeerBehaviorScore(studentId: string): Promise<number> {
    return 0.7;
  }

  private async calculateHistoricalAnomalyScore(studentId: string): Promise<number> {
    return 0.3;
  }

  private async calculateReputationScore(studentId: string): Promise<number> {
    return 0.8;
  }

  private calculateSystemLoadFactor(): number {
    return 0.5;
  }

  private calculateConcurrentApplications(): number {
    return 0.6;
  }

  private getDaysUntilDeadline(): number {
    // Calculate days until next academic deadline
    return 30;
  }

  private getRecommendedFraudAction(fraudScore: number): string {
    if (fraudScore > 0.8) return 'immediate_investigation';
    if (fraudScore > 0.6) return 'enhanced_verification';
    if (fraudScore > 0.4) return 'standard_verification';
    return 'automated_processing';
  }

  private async analyzeSuspiciousPatterns(application: PassApplication): Promise<string[]> {
    const patterns: string[] = [];
    // Implement pattern analysis
    return patterns;
  }

  private async identifyRiskFactors(application: PassApplication, fraudScore: number): Promise<string[]> {
    const factors: string[] = [];
    // Implement risk factor identification
    return factors;
  }

  private calculateDocumentRiskScore(documents: Document[]): number {
    return 0.5;
  }

  private calculateTimeRiskScore(applicationDate: Date): number {
    return 0.3;
  }

  private calculateApplicationVelocity(studentId: string): number {
    return 0.4;
  }

  private async findBestReviewer(requiredLevel: string, urgencyScore: number): Promise<any> {
    return { id: 'reviewer-123' };
  }

  private async sendNotifications(application: PassApplication, prediction: ApprovalPrediction) {
    // Implement notification logic
  }

  private async updatePriorityQueue(application: PassApplication, prediction: ApprovalPrediction) {
    // Implement priority queue logic
  }
}

export const intelligentPassApprovalService = new IntelligentPassApprovalService();