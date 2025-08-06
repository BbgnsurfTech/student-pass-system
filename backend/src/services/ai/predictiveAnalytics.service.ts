import { PrismaClient } from '@prisma/client';
import * as tf from '@tensorflow/tfjs-node';
import { aiService } from './core/aiService';
import { logger } from '../utils/logger';
import { cacheService } from '../cache.service';
import { addDays, startOfWeek, endOfWeek, format, subDays, isSameDay } from 'date-fns';

export interface TimeSeriesPrediction {
  timestamp: Date;
  predicted_value: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  seasonality_factor: number;
  trend_factor: number;
}

export interface PeakPrediction {
  startDate: Date;
  endDate: Date;
  expectedVolume: number;
  probabilityLevel: 'low' | 'medium' | 'high' | 'critical';
  resourceRequirement: {
    staff: number;
    servers: number;
    storage: number;
  };
  recommendations: string[];
}

export interface CapacityForecast {
  currentCapacity: number;
  projectedDemand: number;
  utilizationRate: number;
  bottlenecks: string[];
  scalingRecommendations: {
    type: 'horizontal' | 'vertical';
    timeline: 'immediate' | 'short_term' | 'long_term';
    resources: string[];
  }[];
}

export interface RiskPrediction {
  riskType: string;
  probability: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  timeframe: number; // days until risk materializes
  preventiveMeasures: string[];
  monitoringMetrics: string[];
}

export interface StudentDropoutPrediction {
  studentId: string;
  dropoutProbability: number;
  riskFactors: {
    factor: string;
    weight: number;
    current_value: number;
    threshold: number;
  }[];
  interventionRecommendations: string[];
  timeframe: number; // days before likely dropout
}

export interface AnomalyDetection {
  timestamp: Date;
  metric: string;
  actual_value: number;
  expected_value: number;
  anomaly_score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  potential_causes: string[];
  recommended_actions: string[];
}

export class PredictiveAnalyticsService {
  private prisma: PrismaClient;
  private timeSeriesCache: Map<string, any[]> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
  }

  async predictPeakApplicationPeriods(daysAhead: number = 30): Promise<PeakPrediction[]> {
    try {
      const historicalData = await this.getHistoricalApplicationData();
      const processedData = this.prepareTimeSeriesData(historicalData);
      
      // Create time series model for peak prediction
      const model = await this.createTimeSeriesModel(processedData);
      
      const predictions: PeakPrediction[] = [];
      const startDate = new Date();
      
      for (let i = 0; i < daysAhead; i++) {
        const targetDate = addDays(startDate, i);
        const features = this.extractTimeSeriesFeatures(targetDate, processedData);
        
        const prediction = await aiService.predict('peak_predictor', features);
        const expectedVolume = prediction.prediction[0] * 1000; // Scale to realistic numbers
        
        // Classify probability level
        const probabilityLevel = this.classifyPeakProbability(expectedVolume);
        
        if (probabilityLevel !== 'low') {
          predictions.push({
            startDate: targetDate,
            endDate: addDays(targetDate, 1),
            expectedVolume,
            probabilityLevel,
            resourceRequirement: this.calculateResourceRequirement(expectedVolume),
            recommendations: await this.generatePeakRecommendations(expectedVolume, targetDate)
          });
        }
      }

      // Merge consecutive peak periods
      return this.mergePeakPeriods(predictions);
    } catch (error) {
      logger.error('Peak prediction error:', error);
      throw new Error(`Peak prediction failed: ${error.message}`);
    }
  }

  async forecastSystemUsage(
    metric: 'cpu' | 'memory' | 'storage' | 'network' | 'database_connections',
    hoursAhead: number = 24
  ): Promise<TimeSeriesPrediction[]> {
    try {
      const historicalMetrics = await this.getSystemMetrics(metric);
      const processedData = this.prepareMetricsData(historicalMetrics);
      
      const predictions: TimeSeriesPrediction[] = [];
      
      for (let hour = 1; hour <= hoursAhead; hour++) {
        const targetTime = new Date(Date.now() + hour * 60 * 60 * 1000);
        const features = this.extractMetricFeatures(targetTime, processedData, metric);
        
        const result = await aiService.predict('usage_predictor', features);
        
        predictions.push({
          timestamp: targetTime,
          predicted_value: result.prediction[0],
          confidence_interval: this.calculateConfidenceInterval(result.prediction[0], result.confidence),
          seasonality_factor: this.calculateSeasonalityFactor(targetTime),
          trend_factor: this.calculateTrendFactor(processedData)
        });
      }

      return predictions;
    } catch (error) {
      logger.error('Usage forecast error:', error);
      throw new Error(`Usage forecast failed: ${error.message}`);
    }
  }

  async predictCapacityNeeds(timeframe: 'week' | 'month' | 'quarter'): Promise<CapacityForecast> {
    try {
      const currentMetrics = await this.getCurrentSystemMetrics();
      const usageForecasts = await Promise.all([
        this.forecastSystemUsage('cpu', this.getHoursForTimeframe(timeframe)),
        this.forecastSystemUsage('memory', this.getHoursForTimeframe(timeframe)),
        this.forecastSystemUsage('storage', this.getHoursForTimeframe(timeframe))
      ]);

      const projectedPeakUsage = this.calculatePeakUsage(usageForecasts);
      const currentCapacity = this.calculateCurrentCapacity(currentMetrics);
      
      const forecast: CapacityForecast = {
        currentCapacity,
        projectedDemand: projectedPeakUsage,
        utilizationRate: projectedPeakUsage / currentCapacity,
        bottlenecks: this.identifyBottlenecks(usageForecasts, currentCapacity),
        scalingRecommendations: this.generateScalingRecommendations(
          projectedPeakUsage,
          currentCapacity,
          timeframe
        )
      };

      return forecast;
    } catch (error) {
      logger.error('Capacity prediction error:', error);
      throw new Error(`Capacity prediction failed: ${error.message}`);
    }
  }

  async identifySecurityRisks(lookAheadDays: number = 7): Promise<RiskPrediction[]> {
    try {
      const securityMetrics = await this.getSecurityMetrics();
      const riskFeatures = this.extractSecurityRiskFeatures(securityMetrics);
      
      const riskTypes = [
        'data_breach',
        'ddos_attack',
        'fraud_surge',
        'system_compromise',
        'insider_threat',
        'compliance_violation'
      ];

      const predictions: RiskPrediction[] = [];

      for (const riskType of riskTypes) {
        const features = [...riskFeatures, this.encodeRiskType(riskType)];
        const result = await aiService.predict('risk_predictor', features);
        
        const probability = result.prediction[0];
        
        if (probability > 0.3) { // Only include significant risks
          predictions.push({
            riskType,
            probability,
            impact: this.assessRiskImpact(riskType, probability),
            timeframe: this.estimateRiskTimeframe(riskType, probability),
            preventiveMeasures: await this.generatePreventiveMeasures(riskType, probability),
            monitoringMetrics: this.getMonitoringMetrics(riskType)
          });
        }
      }

      return predictions.sort((a, b) => b.probability - a.probability);
    } catch (error) {
      logger.error('Security risk prediction error:', error);
      throw new Error(`Security risk prediction failed: ${error.message}`);
    }
  }

  async predictStudentDropoutRisk(studentIds?: string[]): Promise<StudentDropoutPrediction[]> {
    try {
      const students = studentIds 
        ? await this.getStudentsByIds(studentIds)
        : await this.getAtRiskStudents();

      const predictions: StudentDropoutPrediction[] = [];

      for (const student of students) {
        const features = await this.extractDropoutRiskFeatures(student);
        const result = await aiService.predict('dropout_predictor', features);
        
        const dropoutProbability = result.prediction[0];
        
        if (dropoutProbability > 0.4) {
          const riskFactors = await this.analyzeDropoutRiskFactors(student, features);
          
          predictions.push({
            studentId: student.id,
            dropoutProbability,
            riskFactors,
            interventionRecommendations: await this.generateInterventionRecommendations(
              student,
              riskFactors
            ),
            timeframe: this.estimateDropoutTimeframe(dropoutProbability)
          });
        }
      }

      return predictions.sort((a, b) => b.dropoutProbability - a.dropoutProbability);
    } catch (error) {
      logger.error('Dropout prediction error:', error);
      throw new Error(`Dropout prediction failed: ${error.message}`);
    }
  }

  async detectAnomalies(
    metrics: string[] = ['application_volume', 'approval_rate', 'processing_time', 'error_rate']
  ): Promise<AnomalyDetection[]> {
    try {
      const anomalies: AnomalyDetection[] = [];
      
      for (const metric of metrics) {
        const historicalData = await this.getMetricHistory(metric);
        const features = this.prepareAnomalyDetectionFeatures(historicalData);
        
        const result = await aiService.predict('anomaly_detector', features);
        const anomalyScore = result.prediction[0];
        
        if (anomalyScore > 0.6) { // Anomaly threshold
          const currentValue = historicalData[historicalData.length - 1].value;
          const expectedValue = this.calculateExpectedValue(historicalData);
          
          anomalies.push({
            timestamp: new Date(),
            metric,
            actual_value: currentValue,
            expected_value: expectedValue,
            anomaly_score: anomalyScore,
            severity: this.classifyAnomalySeverity(anomalyScore),
            potential_causes: await this.identifyAnomalyCauses(metric, currentValue, expectedValue),
            recommended_actions: await this.generateAnomalyActions(metric, anomalyScore)
          });
        }
      }

      return anomalies.sort((a, b) => b.anomaly_score - a.anomaly_score);
    } catch (error) {
      logger.error('Anomaly detection error:', error);
      throw new Error(`Anomaly detection failed: ${error.message}`);
    }
  }

  async generateInsights(timeframe: 'daily' | 'weekly' | 'monthly'): Promise<{
    trends: any[];
    predictions: any[];
    recommendations: string[];
    alerts: any[];
  }> {
    try {
      const [
        peakPredictions,
        capacityForecast,
        riskPredictions,
        anomalies
      ] = await Promise.all([
        this.predictPeakApplicationPeriods(this.getDaysForTimeframe(timeframe)),
        this.predictCapacityNeeds(timeframe === 'daily' ? 'week' : timeframe === 'weekly' ? 'month' : 'quarter'),
        this.identifySecurityRisks(this.getDaysForTimeframe(timeframe)),
        this.detectAnomalies()
      ]);

      const trends = await this.analyzeTrends(timeframe);
      const recommendations = await this.generateActionableRecommendations(
        peakPredictions,
        capacityForecast,
        riskPredictions
      );

      const alerts = this.generateAlerts(anomalies, riskPredictions);

      return {
        trends,
        predictions: {
          peaks: peakPredictions,
          capacity: capacityForecast,
          risks: riskPredictions
        },
        recommendations,
        alerts
      };
    } catch (error) {
      logger.error('Insights generation error:', error);
      throw new Error(`Insights generation failed: ${error.message}`);
    }
  }

  // Private helper methods

  private async getHistoricalApplicationData(): Promise<any[]> {
    return await this.prisma.passApplication.findMany({
      where: {
        createdAt: {
          gte: subDays(new Date(), 365) // Last year of data
        }
      },
      select: {
        createdAt: true,
        status: true,
        passType: true,
        processingTime: true
      }
    });
  }

  private prepareTimeSeriesData(data: any[]): any[] {
    // Group by day and calculate metrics
    const dailyData = new Map();
    
    data.forEach(record => {
      const day = format(record.createdAt, 'yyyy-MM-dd');
      if (!dailyData.has(day)) {
        dailyData.set(day, { count: 0, approved: 0, avgProcessingTime: 0 });
      }
      
      const dayData = dailyData.get(day);
      dayData.count++;
      if (record.status === 'approved') dayData.approved++;
      dayData.avgProcessingTime += record.processingTime || 0;
    });

    return Array.from(dailyData.entries()).map(([date, metrics]) => ({
      date,
      ...metrics,
      avgProcessingTime: metrics.avgProcessingTime / metrics.count
    }));
  }

  private async createTimeSeriesModel(data: any[]): Promise<tf.LayersModel> {
    // Create a simple LSTM model for time series forecasting
    const model = tf.sequential({
      layers: [
        tf.layers.lstm({
          units: 50,
          returnSequences: true,
          inputShape: [7, 4] // 7 days window, 4 features
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.lstm({
          units: 50,
          returnSequences: false
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 25 }),
        tf.layers.dense({ units: 1 })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError'
    });

    return model;
  }

  private extractTimeSeriesFeatures(date: Date, historicalData: any[]): number[] {
    return [
      date.getHours() / 24,
      date.getDay() / 6,
      date.getMonth() / 11,
      this.isHoliday(date) ? 1 : 0,
      this.calculateSeasonalityFactor(date),
      this.calculateTrendFactor(historicalData),
      this.getWeekOfYear(date) / 52
    ];
  }

  private classifyPeakProbability(volume: number): 'low' | 'medium' | 'high' | 'critical' {
    const avgVolume = 100; // Baseline average volume
    
    if (volume > avgVolume * 3) return 'critical';
    if (volume > avgVolume * 2) return 'high';
    if (volume > avgVolume * 1.5) return 'medium';
    return 'low';
  }

  private calculateResourceRequirement(expectedVolume: number): {
    staff: number;
    servers: number;
    storage: number;
  } {
    const baseStaff = 5;
    const baseServers = 2;
    const baseStorage = 100; // GB
    
    const scaleFactor = Math.ceil(expectedVolume / 100);
    
    return {
      staff: baseStaff + scaleFactor,
      servers: baseServers + Math.ceil(scaleFactor / 2),
      storage: baseStorage + (scaleFactor * 50)
    };
  }

  private async generatePeakRecommendations(volume: number, date: Date): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (volume > 300) {
      recommendations.push('Scale up server infrastructure');
      recommendations.push('Increase staff allocation by 50%');
    }
    
    if (this.isWeekend(date)) {
      recommendations.push('Prepare weekend support team');
    }
    
    recommendations.push('Pre-load cache with common data');
    recommendations.push('Set up monitoring alerts');
    
    return recommendations;
  }

  private mergePeakPeriods(predictions: PeakPrediction[]): PeakPrediction[] {
    if (predictions.length === 0) return [];
    
    const merged: PeakPrediction[] = [];
    let current = { ...predictions[0] };
    
    for (let i = 1; i < predictions.length; i++) {
      const next = predictions[i];
      
      // If consecutive days, merge them
      if (isSameDay(addDays(current.endDate, 1), next.startDate)) {
        current.endDate = next.endDate;
        current.expectedVolume += next.expectedVolume;
        current.probabilityLevel = current.probabilityLevel === 'critical' || next.probabilityLevel === 'critical' 
          ? 'critical' 
          : current.probabilityLevel === 'high' || next.probabilityLevel === 'high' 
            ? 'high' : 'medium';
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    
    merged.push(current);
    return merged;
  }

  // Additional helper methods (simplified implementations)

  private async getSystemMetrics(metric: string): Promise<any[]> {
    // Mock implementation - would connect to monitoring system
    return [];
  }

  private prepareMetricsData(metrics: any[]): any[] {
    return metrics;
  }

  private extractMetricFeatures(time: Date, data: any[], metric: string): number[] {
    return [
      time.getHours() / 24,
      time.getDay() / 6,
      Math.random() * 0.8 + 0.1, // Current usage
      Math.random() * 0.1 // Trend
    ];
  }

  private calculateConfidenceInterval(value: number, confidence: number): { lower: number; upper: number } {
    const margin = value * (1 - confidence) * 0.5;
    return {
      lower: Math.max(0, value - margin),
      upper: value + margin
    };
  }

  private calculateSeasonalityFactor(date: Date): number {
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    // Higher activity during business hours and weekdays
    const hourFactor = hour >= 9 && hour <= 17 ? 1.0 : 0.5;
    const dayFactor = dayOfWeek >= 1 && dayOfWeek <= 5 ? 1.0 : 0.3;
    
    return hourFactor * dayFactor;
  }

  private calculateTrendFactor(data: any[]): number {
    if (data.length < 2) return 0;
    
    const recent = data.slice(-7); // Last 7 data points
    const older = data.slice(-14, -7); // Previous 7 data points
    
    const recentAvg = recent.reduce((sum, d) => sum + d.count, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.count, 0) / older.length;
    
    return olderAvg === 0 ? 0 : (recentAvg - olderAvg) / olderAvg;
  }

  private getHoursForTimeframe(timeframe: string): number {
    switch (timeframe) {
      case 'week': return 168;
      case 'month': return 720;
      case 'quarter': return 2160;
      default: return 24;
    }
  }

  private getDaysForTimeframe(timeframe: string): number {
    switch (timeframe) {
      case 'daily': return 7;
      case 'weekly': return 30;
      case 'monthly': return 90;
      default: return 7;
    }
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  private isHoliday(date: Date): boolean {
    // Implementation for holiday detection
    return false;
  }

  private getWeekOfYear(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  // Placeholder implementations for complex methods
  private async getCurrentSystemMetrics(): Promise<any> { return {}; }
  private calculatePeakUsage(forecasts: any[]): number { return 0.8; }
  private calculateCurrentCapacity(metrics: any): number { return 1.0; }
  private identifyBottlenecks(forecasts: any[], capacity: number): string[] { return []; }
  private generateScalingRecommendations(demand: number, capacity: number, timeframe: string): any[] { return []; }
  private async getSecurityMetrics(): Promise<any> { return {}; }
  private extractSecurityRiskFeatures(metrics: any): number[] { return [0.5, 0.3, 0.7]; }
  private encodeRiskType(riskType: string): number { return 0.5; }
  private assessRiskImpact(riskType: string, probability: number): 'low' | 'medium' | 'high' | 'critical' { return 'medium'; }
  private estimateRiskTimeframe(riskType: string, probability: number): number { return 7; }
  private async generatePreventiveMeasures(riskType: string, probability: number): Promise<string[]> { return []; }
  private getMonitoringMetrics(riskType: string): string[] { return []; }
  private async getStudentsByIds(ids: string[]): Promise<any[]> { return []; }
  private async getAtRiskStudents(): Promise<any[]> { return []; }
  private async extractDropoutRiskFeatures(student: any): Promise<number[]> { return [0.4, 0.6, 0.3]; }
  private async analyzeDropoutRiskFactors(student: any, features: number[]): Promise<any[]> { return []; }
  private async generateInterventionRecommendations(student: any, factors: any[]): Promise<string[]> { return []; }
  private estimateDropoutTimeframe(probability: number): number { return 30; }
  private async getMetricHistory(metric: string): Promise<any[]> { return []; }
  private prepareAnomalyDetectionFeatures(data: any[]): number[] { return [0.5, 0.7, 0.3]; }
  private calculateExpectedValue(data: any[]): number { return 0.5; }
  private classifyAnomalySeverity(score: number): 'low' | 'medium' | 'high' | 'critical' { return 'medium'; }
  private async identifyAnomalyCauses(metric: string, actual: number, expected: number): Promise<string[]> { return []; }
  private async generateAnomalyActions(metric: string, score: number): Promise<string[]> { return []; }
  private async analyzeTrends(timeframe: string): Promise<any[]> { return []; }
  private async generateActionableRecommendations(peaks: any[], capacity: any, risks: any[]): Promise<string[]> { return []; }
  private generateAlerts(anomalies: any[], risks: any[]): any[] { return []; }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService();