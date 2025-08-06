import { PrismaClient } from '@prisma/client';
import * as tf from '@tensorflow/tfjs-node';
import { aiService } from './core/aiService';
import { logger } from '../utils/logger';
import { cacheService } from '../cache.service';
import DeviceDetector from 'node-device-detector';
import geoip from 'geoip-lite';
import crypto from 'crypto';

export interface FraudDetectionResult {
  isFraudulent: boolean;
  riskScore: number; // 0-1, higher is more risky
  riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  riskFactors: {
    category: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    evidence: any;
  }[];
  behavioralAnomalies: {
    type: string;
    deviation: number;
    description: string;
  }[];
  recommendations: {
    action: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    description: string;
  }[];
  similarCases?: string[];
  networkAnalysis: {
    suspiciousConnections: number;
    networkRiskScore: number;
    relatedAccounts: string[];
  };
}

export interface BehavioralProfile {
  userId: string;
  patterns: {
    loginTimes: number[];
    sessionDurations: number[];
    deviceFingerprints: string[];
    ipAddresses: string[];
    locationPatterns: { country: string; city: string; frequency: number }[];
    applicationPatterns: {
      frequency: number;
      timing: number[];
      types: string[];
      averageCompletionTime: number;
    };
  };
  baseline: {
    established: boolean;
    normalRanges: {
      loginHour: { min: number; max: number };
      sessionDuration: { min: number; max: number };
      applicationsPerMonth: { min: number; max: number };
    };
    deviationThresholds: {
      location: number;
      timing: number;
      frequency: number;
      device: number;
    };
  };
  riskMetrics: {
    velocityScore: number;
    diversityScore: number;
    consistencyScore: number;
    predictabilityScore: number;
  };
}

export interface DeviceFingerprint {
  id: string;
  userId: string;
  components: {
    userAgent: string;
    screenResolution: string;
    timezone: string;
    language: string;
    platform: string;
    vendor: string;
    plugins: string[];
    fonts: string[];
    canvas: string;
    webgl: string;
  };
  hash: string;
  firstSeen: Date;
  lastSeen: Date;
  trustScore: number;
  riskFactors: string[];
}

export interface NetworkAnalysis {
  userId: string;
  connections: {
    targetUserId: string;
    connectionType: 'ip_sharing' | 'device_sharing' | 'behavioral_similarity' | 'temporal_correlation';
    strength: number;
    riskLevel: 'low' | 'medium' | 'high';
    evidence: any;
  }[];
  clusters: {
    clusterId: string;
    members: string[];
    riskScore: number;
    commonAttributes: string[];
  }[];
  anomalies: {
    type: string;
    description: string;
    affectedUsers: string[];
    riskScore: number;
  }[];
}

export interface RealTimeFraudMonitoring {
  alerts: {
    id: string;
    userId: string;
    alertType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    timestamp: Date;
    status: 'active' | 'investigating' | 'resolved' | 'false_positive';
    evidence: any;
    autoActions: string[];
  }[];
  patterns: {
    pattern: string;
    frequency: number;
    riskLevel: number;
    affectedUsers: number;
  }[];
  systemRiskLevel: 'normal' | 'elevated' | 'high' | 'critical';
}

export class FraudDetectionService {
  private prisma: PrismaClient;
  private deviceDetector: DeviceDetector;
  private behavioralProfiles: Map<string, BehavioralProfile> = new Map();
  private networkGraph: Map<string, Set<string>> = new Map();
  private activeAlerts: Map<string, any> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
    this.deviceDetector = new DeviceDetector();
    this.initializeFraudDetection();
  }

  private async initializeFraudDetection() {
    try {
      await this.loadBehavioralProfiles();
      await this.buildNetworkGraph();
      await this.loadFraudModels();
      
      // Start real-time monitoring
      this.startRealTimeMonitoring();
      
      logger.info('Fraud detection service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize fraud detection:', error);
    }
  }

  async analyzeFraudRisk(
    userId: string,
    activity: {
      type: 'login' | 'application' | 'payment' | 'profile_update' | 'password_change';
      details: any;
      metadata: {
        ipAddress: string;
        userAgent: string;
        timestamp: Date;
        sessionId: string;
      };
    }
  ): Promise<FraudDetectionResult> {
    try {
      // Get or create behavioral profile
      const behavioralProfile = await this.getBehavioralProfile(userId);
      
      // Analyze device fingerprint
      const deviceFingerprint = this.generateDeviceFingerprint(activity.metadata);
      const deviceAnalysis = await this.analyzeDeviceRisk(deviceFingerprint, userId);
      
      // Analyze behavioral patterns
      const behavioralAnalysis = this.analyzeBehavioralAnomalies(activity, behavioralProfile);
      
      // Analyze location patterns
      const locationAnalysis = this.analyzeLocationRisk(activity.metadata.ipAddress, userId);
      
      // Analyze velocity patterns
      const velocityAnalysis = await this.analyzeVelocityRisk(userId, activity);
      
      // Analyze network connections
      const networkAnalysis = await this.analyzeNetworkRisk(userId);
      
      // Check against known fraud patterns
      const patternAnalysis = await this.checkFraudPatterns(activity);
      
      // Combine all risk factors
      const riskFactors = [
        ...deviceAnalysis.riskFactors,
        ...behavioralAnalysis.riskFactors,
        ...locationAnalysis.riskFactors,
        ...velocityAnalysis.riskFactors,
        ...networkAnalysis.riskFactors,
        ...patternAnalysis.riskFactors
      ];

      // Calculate overall risk score
      const riskScore = this.calculateOverallRiskScore(riskFactors);
      
      // Determine risk level
      const riskLevel = this.classifyRiskLevel(riskScore);
      
      // Calculate confidence
      const confidence = this.calculateConfidence(riskFactors, behavioralProfile);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(riskScore, riskLevel, riskFactors);
      
      // Find similar cases
      const similarCases = await this.findSimilarCases(riskFactors);
      
      const result: FraudDetectionResult = {
        isFraudulent: riskScore > 0.7,
        riskScore,
        riskLevel,
        confidence,
        riskFactors,
        behavioralAnomalies: behavioralAnalysis.anomalies,
        recommendations,
        similarCases,
        networkAnalysis: {
          suspiciousConnections: networkAnalysis.suspiciousConnections,
          networkRiskScore: networkAnalysis.networkRiskScore,
          relatedAccounts: networkAnalysis.relatedAccounts
        }
      };

      // Update behavioral profile
      await this.updateBehavioralProfile(userId, activity, result);
      
      // Trigger alerts if high risk
      if (riskScore > 0.8) {
        await this.triggerFraudAlert(userId, result, activity);
      }
      
      // Store result for learning
      await this.storeFraudAnalysis(userId, activity, result);

      return result;
    } catch (error) {
      logger.error('Fraud risk analysis error:', error);
      throw new Error(`Fraud analysis failed: ${error.message}`);
    }
  }

  async performRealTimeBehaviorAnalysis(userId: string): Promise<{
    anomalies: any[];
    riskScore: number;
    alerts: any[];
    recommendations: string[];
  }> {
    try {
      const behavioralProfile = await this.getBehavioralProfile(userId);
      const recentActivities = await this.getRecentActivities(userId, 24); // Last 24 hours
      
      const anomalies: any[] = [];
      let totalRiskScore = 0;
      
      // Analyze recent patterns against baseline
      for (const activity of recentActivities) {
        const activityAnomalies = this.detectActivityAnomalies(activity, behavioralProfile);
        anomalies.push(...activityAnomalies);
        totalRiskScore += activityAnomalies.reduce((sum, a) => sum + a.riskScore, 0);
      }
      
      // Normalize risk score
      const riskScore = Math.min(totalRiskScore / recentActivities.length, 1.0);
      
      // Generate alerts for significant anomalies
      const alerts = anomalies
        .filter(a => a.riskScore > 0.6)
        .map(a => this.createBehaviorAlert(userId, a));
      
      // Generate recommendations
      const recommendations = this.generateBehaviorRecommendations(anomalies, riskScore);
      
      return {
        anomalies,
        riskScore,
        alerts,
        recommendations
      };
    } catch (error) {
      logger.error('Real-time behavior analysis error:', error);
      throw new Error(`Behavior analysis failed: ${error.message}`);
    }
  }

  async performNetworkAnalysis(userId: string): Promise<NetworkAnalysis> {
    try {
      // Find connected users
      const connections = await this.findUserConnections(userId);
      
      // Analyze connection patterns
      const analyzedConnections = connections.map(connection => ({
        ...connection,
        riskLevel: this.assessConnectionRisk(connection) as 'low' | 'medium' | 'high'
      }));
      
      // Identify clusters
      const clusters = await this.identifyFraudClusters(userId);
      
      // Detect network anomalies
      const anomalies = await this.detectNetworkAnomalies(userId, analyzedConnections);
      
      return {
        userId,
        connections: analyzedConnections,
        clusters,
        anomalies
      };
    } catch (error) {
      logger.error('Network analysis error:', error);
      throw new Error(`Network analysis failed: ${error.message}`);
    }
  }

  async detectCoordinatedAttacks(): Promise<{
    attacks: {
      id: string;
      type: string;
      participants: string[];
      timeline: Date[];
      riskScore: number;
      pattern: string;
      countermeasures: string[];
    }[];
    systemRiskLevel: string;
    affectedUsers: number;
  }> {
    try {
      const attacks: any[] = [];
      
      // Detect account creation spikes
      const creationSpikes = await this.detectAccountCreationSpikes();
      attacks.push(...creationSpikes);
      
      // Detect coordinated application patterns
      const coordApps = await this.detectCoordinatedApplications();
      attacks.push(...coordApps);
      
      // Detect IP-based coordinated activities
      const ipCoordination = await this.detectIPCoordination();
      attacks.push(...ipCoordination);
      
      // Detect device-based coordination
      const deviceCoordination = await this.detectDeviceCoordination();
      attacks.push(...deviceCoordination);
      
      // Calculate system risk level
      const systemRiskLevel = this.calculateSystemRiskLevel(attacks);
      
      // Count affected users
      const affectedUsers = new Set(attacks.flatMap(a => a.participants)).size;
      
      return {
        attacks,
        systemRiskLevel,
        affectedUsers
      };
    } catch (error) {
      logger.error('Coordinated attack detection error:', error);
      throw new Error(`Attack detection failed: ${error.message}`);
    }
  }

  async generateFraudInsights(timeframe: 'day' | 'week' | 'month'): Promise<{
    summary: {
      totalAnalyses: number;
      fraudAttempts: number;
      preventedLosses: number;
      falsePositiveRate: number;
    };
    trends: {
      fraudTypes: { type: string; count: number; trend: string }[];
      riskDistribution: { level: string; count: number; percentage: number }[];
      temporalPatterns: { hour: number; riskScore: number }[];
    };
    topRiskFactors: {
      factor: string;
      frequency: number;
      averageRisk: number;
      examples: string[];
    }[];
    recommendations: string[];
  }> {
    try {
      const timeRange = this.getTimeRange(timeframe);
      
      // Get fraud analysis data
      const analyses = await this.getFraudAnalyses(timeRange);
      
      // Calculate summary statistics
      const summary = this.calculateFraudSummary(analyses);
      
      // Analyze trends
      const trends = this.analyzeFraudTrends(analyses);
      
      // Identify top risk factors
      const topRiskFactors = this.identifyTopRiskFactors(analyses);
      
      // Generate recommendations
      const recommendations = this.generateSystemRecommendations(summary, trends, topRiskFactors);
      
      return {
        summary,
        trends,
        topRiskFactors,
        recommendations
      };
    } catch (error) {
      logger.error('Fraud insights generation error:', error);
      throw new Error(`Insights generation failed: ${error.message}`);
    }
  }

  // Private helper methods

  private generateDeviceFingerprint(metadata: any): DeviceFingerprint {
    const deviceInfo = this.deviceDetector.detect(metadata.userAgent);
    
    const components = {
      userAgent: metadata.userAgent,
      screenResolution: metadata.screenResolution || 'unknown',
      timezone: metadata.timezone || 'unknown',
      language: metadata.language || 'unknown',
      platform: deviceInfo.os?.name || 'unknown',
      vendor: deviceInfo.device?.brand || 'unknown',
      plugins: metadata.plugins || [],
      fonts: metadata.fonts || [],
      canvas: metadata.canvas || 'unknown',
      webgl: metadata.webgl || 'unknown'
    };

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(components))
      .digest('hex');

    return {
      id: hash,
      userId: '',
      components,
      hash,
      firstSeen: new Date(),
      lastSeen: new Date(),
      trustScore: 0.5,
      riskFactors: []
    };
  }

  private async analyzeDeviceRisk(fingerprint: DeviceFingerprint, userId: string): Promise<any> {
    const riskFactors: any[] = [];
    
    // Check if device is known
    const knownDevice = await this.isKnownDevice(fingerprint.hash, userId);
    if (!knownDevice) {
      riskFactors.push({
        category: 'device',
        description: 'New or unknown device detected',
        severity: 'medium' as const,
        score: 0.5,
        evidence: { deviceHash: fingerprint.hash }
      });
    }
    
    // Check for suspicious device characteristics
    if (fingerprint.components.userAgent.includes('bot') || 
        fingerprint.components.userAgent.includes('crawler')) {
      riskFactors.push({
        category: 'device',
        description: 'Automated agent detected',
        severity: 'high' as const,
        score: 0.8,
        evidence: { userAgent: fingerprint.components.userAgent }
      });
    }
    
    return { riskFactors };
  }

  private analyzeBehavioralAnomalies(activity: any, profile: BehavioralProfile): any {
    const riskFactors: any[] = [];
    const anomalies: any[] = [];
    
    // Analyze timing anomalies
    const activityHour = activity.metadata.timestamp.getHours();
    if (profile.baseline.established) {
      const { min, max } = profile.baseline.normalRanges.loginHour;
      if (activityHour < min || activityHour > max) {
        const deviation = Math.min(
          Math.abs(activityHour - min),
          Math.abs(activityHour - max)
        ) / 12; // Normalize to 0-1
        
        anomalies.push({
          type: 'timing_anomaly',
          deviation,
          description: `Activity at unusual hour: ${activityHour}:00`
        });
        
        if (deviation > 0.5) {
          riskFactors.push({
            category: 'behavioral',
            description: 'Activity outside normal hours',
            severity: deviation > 0.8 ? 'high' : 'medium',
            score: deviation,
            evidence: { activityHour, normalRange: { min, max } }
          });
        }
      }
    }
    
    return { riskFactors, anomalies };
  }

  private analyzeLocationRisk(ipAddress: string, userId: string): any {
    const riskFactors: any[] = [];
    
    const geoInfo = geoip.lookup(ipAddress);
    
    if (geoInfo) {
      // Check for unusual location
      // This would compare against user's typical locations
      if (this.isUnusualLocation(geoInfo, userId)) {
        riskFactors.push({
          category: 'location',
          description: 'Access from unusual location',
          severity: 'medium' as const,
          score: 0.6,
          evidence: { location: geoInfo.city, country: geoInfo.country }
        });
      }
      
      // Check for high-risk countries
      const highRiskCountries = ['XX', 'YY']; // List of high-risk country codes
      if (highRiskCountries.includes(geoInfo.country)) {
        riskFactors.push({
          category: 'location',
          description: 'Access from high-risk location',
          severity: 'high' as const,
          score: 0.8,
          evidence: { country: geoInfo.country }
        });
      }
    }
    
    return { riskFactors };
  }

  private async analyzeVelocityRisk(userId: string, activity: any): Promise<any> {
    const riskFactors: any[] = [];
    
    // Check for rapid successive actions
    const recentActivities = await this.getRecentActivities(userId, 1); // Last hour
    
    if (recentActivities.length > 10) { // More than 10 activities in an hour
      riskFactors.push({
        category: 'velocity',
        description: 'Unusually high activity velocity',
        severity: 'high' as const,
        score: Math.min(recentActivities.length / 10, 1.0),
        evidence: { activitiesPerHour: recentActivities.length }
      });
    }
    
    return { riskFactors };
  }

  private async analyzeNetworkRisk(userId: string): Promise<any> {
    const riskFactors: any[] = [];
    
    // Get user's network connections
    const connections = this.networkGraph.get(userId) || new Set();
    
    let suspiciousConnections = 0;
    const relatedAccounts: string[] = [];
    
    for (const connectedUserId of connections) {
      const connectionRisk = await this.assessUserRisk(connectedUserId);
      if (connectionRisk > 0.6) {
        suspiciousConnections++;
        relatedAccounts.push(connectedUserId);
      }
    }
    
    if (suspiciousConnections > 0) {
      riskFactors.push({
        category: 'network',
        description: 'Connected to suspicious accounts',
        severity: suspiciousConnections > 2 ? 'high' : 'medium',
        score: Math.min(suspiciousConnections / 3, 1.0),
        evidence: { suspiciousConnections, relatedAccounts }
      });
    }
    
    const networkRiskScore = suspiciousConnections / Math.max(connections.size, 1);
    
    return {
      riskFactors,
      suspiciousConnections,
      networkRiskScore,
      relatedAccounts
    };
  }

  private async checkFraudPatterns(activity: any): Promise<any> {
    const riskFactors: any[] = [];
    
    // Check against known fraud patterns
    const fraudPatterns = await this.getKnownFraudPatterns();
    
    for (const pattern of fraudPatterns) {
      if (this.matchesPattern(activity, pattern)) {
        riskFactors.push({
          category: 'pattern',
          description: `Matches known fraud pattern: ${pattern.name}`,
          severity: pattern.severity,
          score: pattern.riskScore,
          evidence: { patternId: pattern.id, matches: pattern.matches }
        });
      }
    }
    
    return { riskFactors };
  }

  private calculateOverallRiskScore(riskFactors: any[]): number {
    if (riskFactors.length === 0) return 0;
    
    // Calculate weighted average
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    const severityWeights = {
      low: 0.2,
      medium: 0.5,
      high: 0.8,
      critical: 1.0
    };
    
    riskFactors.forEach(factor => {
      const weight = severityWeights[factor.severity];
      totalWeightedScore += factor.score * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  }

  private classifyRiskLevel(riskScore: number): 'very_low' | 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 0.9) return 'critical';
    if (riskScore >= 0.7) return 'high';
    if (riskScore >= 0.5) return 'medium';
    if (riskScore >= 0.2) return 'low';
    return 'very_low';
  }

  private calculateConfidence(riskFactors: any[], profile: BehavioralProfile): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence if baseline is established
    if (profile.baseline.established) {
      confidence += 0.2;
    }
    
    // Increase confidence with more risk factors
    confidence += Math.min(riskFactors.length * 0.1, 0.3);
    
    // Adjust based on risk factor severity
    const highSeverityFactors = riskFactors.filter(f => f.severity === 'high' || f.severity === 'critical').length;
    confidence += highSeverityFactors * 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private generateRecommendations(riskScore: number, riskLevel: string, riskFactors: any[]): any[] {
    const recommendations: any[] = [];
    
    if (riskScore > 0.8) {
      recommendations.push({
        action: 'immediate_review',
        priority: 'urgent' as const,
        description: 'Requires immediate manual review and investigation'
      });
    }
    
    if (riskScore > 0.6) {
      recommendations.push({
        action: 'enhanced_verification',
        priority: 'high' as const,
        description: 'Require additional verification steps'
      });
    }
    
    if (riskFactors.some(f => f.category === 'device')) {
      recommendations.push({
        action: 'device_verification',
        priority: 'medium' as const,
        description: 'Verify device ownership through secondary channel'
      });
    }
    
    return recommendations;
  }

  // Placeholder implementations for complex methods
  private async loadBehavioralProfiles(): Promise<void> {}
  private async buildNetworkGraph(): Promise<void> {}
  private async loadFraudModels(): Promise<void> {}
  private startRealTimeMonitoring(): void {}
  private async getBehavioralProfile(userId: string): Promise<BehavioralProfile> {
    return {
      userId,
      patterns: {
        loginTimes: [9, 14, 17],
        sessionDurations: [30, 45, 60],
        deviceFingerprints: [],
        ipAddresses: [],
        locationPatterns: [],
        applicationPatterns: {
          frequency: 2,
          timing: [10, 15],
          types: ['temporary', 'semester'],
          averageCompletionTime: 15
        }
      },
      baseline: {
        established: true,
        normalRanges: {
          loginHour: { min: 8, max: 18 },
          sessionDuration: { min: 15, max: 120 },
          applicationsPerMonth: { min: 0, max: 5 }
        },
        deviationThresholds: {
          location: 0.3,
          timing: 0.5,
          frequency: 0.7,
          device: 0.4
        }
      },
      riskMetrics: {
        velocityScore: 0.3,
        diversityScore: 0.4,
        consistencyScore: 0.8,
        predictabilityScore: 0.7
      }
    };
  }
  private async isKnownDevice(hash: string, userId: string): Promise<boolean> { return false; }
  private isUnusualLocation(geoInfo: any, userId: string): boolean { return false; }
  private async getRecentActivities(userId: string, hours: number): Promise<any[]> { return []; }
  private async assessUserRisk(userId: string): Promise<number> { return 0.3; }
  private async getKnownFraudPatterns(): Promise<any[]> { return []; }
  private matchesPattern(activity: any, pattern: any): boolean { return false; }
  private async findSimilarCases(riskFactors: any[]): Promise<string[]> { return []; }
  private async updateBehavioralProfile(userId: string, activity: any, result: FraudDetectionResult): Promise<void> {}
  private async triggerFraudAlert(userId: string, result: FraudDetectionResult, activity: any): Promise<void> {}
  private async storeFraudAnalysis(userId: string, activity: any, result: FraudDetectionResult): Promise<void> {}
  private detectActivityAnomalies(activity: any, profile: BehavioralProfile): any[] { return []; }
  private createBehaviorAlert(userId: string, anomaly: any): any { return {}; }
  private generateBehaviorRecommendations(anomalies: any[], riskScore: number): string[] { return []; }
  private async findUserConnections(userId: string): Promise<any[]> { return []; }
  private assessConnectionRisk(connection: any): string { return 'low'; }
  private async identifyFraudClusters(userId: string): Promise<any[]> { return []; }
  private async detectNetworkAnomalies(userId: string, connections: any[]): Promise<any[]> { return []; }
  private async detectAccountCreationSpikes(): Promise<any[]> { return []; }
  private async detectCoordinatedApplications(): Promise<any[]> { return []; }
  private async detectIPCoordination(): Promise<any[]> { return []; }
  private async detectDeviceCoordination(): Promise<any[]> { return []; }
  private calculateSystemRiskLevel(attacks: any[]): string { return 'normal'; }
  private getTimeRange(timeframe: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    
    switch (timeframe) {
      case 'day': start.setDate(start.getDate() - 1); break;
      case 'week': start.setDate(start.getDate() - 7); break;
      case 'month': start.setMonth(start.getMonth() - 1); break;
    }
    
    return { start, end };
  }
  private async getFraudAnalyses(timeRange: any): Promise<any[]> { return []; }
  private calculateFraudSummary(analyses: any[]): any { return { totalAnalyses: 0, fraudAttempts: 0, preventedLosses: 0, falsePositiveRate: 0 }; }
  private analyzeFraudTrends(analyses: any[]): any { return { fraudTypes: [], riskDistribution: [], temporalPatterns: [] }; }
  private identifyTopRiskFactors(analyses: any[]): any[] { return []; }
  private generateSystemRecommendations(summary: any, trends: any, riskFactors: any[]): string[] { return []; }
}

export const fraudDetectionService = new FraudDetectionService();