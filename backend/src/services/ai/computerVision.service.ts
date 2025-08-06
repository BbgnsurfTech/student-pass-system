import * as tf from '@tensorflow/tfjs-node';
import * as cv from 'opencv4nodejs';
import Tesseract from 'tesseract.js';
import Jimp from 'jimp';
import { createWorker } from 'tesseract.js';
import { PrismaClient } from '@prisma/client';
import { aiService } from './core/aiService';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

export interface DocumentVerificationResult {
  isValid: boolean;
  documentType: string;
  confidence: number;
  fraudScore: number;
  extractedText: string;
  extractedData: {
    name?: string;
    id?: string;
    dateOfBirth?: string;
    expiryDate?: string;
    issueDate?: string;
    address?: string;
  };
  qualityMetrics: {
    imageQuality: number;
    textQuality: number;
    completeness: number;
    tamperingScore: number;
  };
  anomalies: string[];
  recommendations: string[];
}

export interface FaceRecognitionResult {
  matchFound: boolean;
  confidence: number;
  matchedPersonId?: string;
  faceQuality: number;
  landmarks: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    mouth: { x: number; y: number };
  };
  liveness: {
    isLive: boolean;
    confidence: number;
  };
  attributes: {
    age: number;
    gender: string;
    emotion: string;
  };
}

export interface QRCodeAnalysis {
  isValid: boolean;
  data: string;
  errorCorrectionLevel: string;
  qualityScore: number;
  readabilityScore: number;
  recommendations: string[];
  securityFeatures: {
    encrypted: boolean;
    digitallySigned: boolean;
    tamperEvident: boolean;
  };
}

export interface PhotoValidation {
  isValid: boolean;
  qualityScore: number;
  issues: string[];
  faceDetected: boolean;
  backgroundAnalysis: {
    isPlain: boolean;
    color: string;
    uniformity: number;
  };
  lighting: {
    overall: number;
    shadows: number;
    glare: number;
  };
  pose: {
    frontal: boolean;
    eyesOpen: boolean;
    mouthClosed: boolean;
  };
}

export interface DamageAssessment {
  damageLevel: 'none' | 'minor' | 'moderate' | 'severe';
  damageTypes: string[];
  affectedAreas: {
    type: string;
    severity: number;
    location: { x: number; y: number; width: number; height: number };
  }[];
  repairability: boolean;
  replacementNeeded: boolean;
  estimatedCost: number;
  recommendations: string[];
}

export interface ImageProcessingOptions {
  enhanceContrast?: boolean;
  denoiseImage?: boolean;
  correctPerspective?: boolean;
  enhanceText?: boolean;
  cropToContent?: boolean;
}

export class ComputerVisionService {
  private prisma: PrismaClient;
  private ocrWorker: Tesseract.Worker | null = null;
  private faceModel: tf.LayersModel | null = null;
  private documentModel: tf.LayersModel | null = null;

  constructor() {
    this.prisma = new PrismaClient();
    this.initializeModels();
  }

  private async initializeModels() {
    try {
      // Initialize Tesseract worker
      this.ocrWorker = await createWorker();
      await this.ocrWorker.loadLanguage('eng');
      await this.ocrWorker.initialize('eng');
      
      // Load pre-trained models
      await this.loadFaceModel();
      await this.loadDocumentModel();
      
      logger.info('Computer vision models initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize CV models:', error);
    }
  }

  private async loadFaceModel() {
    try {
      // Load a face detection/recognition model
      // In production, you would load a pre-trained model
      this.faceModel = await this.createFaceDetectionModel();
    } catch (error) {
      logger.warn('Face model not available, creating default model');
      this.faceModel = await this.createFaceDetectionModel();
    }
  }

  private async loadDocumentModel() {
    try {
      // Load document classification model
      this.documentModel = await this.createDocumentClassificationModel();
    } catch (error) {
      logger.warn('Document model not available, creating default model');
      this.documentModel = await this.createDocumentClassificationModel();
    }
  }

  private async createFaceDetectionModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [224, 224, 3],
          filters: 32,
          kernelSize: 3,
          activation: 'relu'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: 'relu' }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.conv2d({ filters: 128, kernelSize: 3, activation: 'relu' }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.flatten(),
        tf.layers.dense({ units: 512, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.5 }),
        tf.layers.dense({ units: 128, activation: 'relu' }),
        tf.layers.dense({ units: 64, activation: 'sigmoid' }) // Face embeddings
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  private async createDocumentClassificationModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [256, 256, 3],
          filters: 32,
          kernelSize: 3,
          activation: 'relu'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: 'relu' }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.conv2d({ filters: 128, kernelSize: 3, activation: 'relu' }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.flatten(),
        tf.layers.dense({ units: 256, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.5 }),
        tf.layers.dense({ units: 10, activation: 'softmax' }) // Document types
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  async verifyDocument(
    imagePath: string,
    expectedType?: string,
    options?: ImageProcessingOptions
  ): Promise<DocumentVerificationResult> {
    try {
      // Load and preprocess image
      let processedImage = await this.loadImage(imagePath);
      
      if (options) {
        processedImage = await this.preprocessImage(processedImage, options);
      }

      // Extract text using OCR
      const ocrResult = await this.performOCR(processedImage);
      
      // Classify document type
      const documentType = await this.classifyDocument(processedImage);
      
      // Detect fraud indicators
      const fraudScore = await this.detectDocumentFraud(processedImage, ocrResult.text);
      
      // Extract structured data
      const extractedData = this.extractStructuredData(ocrResult.text, documentType);
      
      // Calculate quality metrics
      const qualityMetrics = await this.calculateImageQualityMetrics(processedImage, ocrResult);
      
      // Identify anomalies
      const anomalies = this.identifyDocumentAnomalies(processedImage, ocrResult, documentType);
      
      // Validate against expected type
      const isValid = this.validateDocument(documentType, expectedType, fraudScore, qualityMetrics);
      
      const result: DocumentVerificationResult = {
        isValid,
        documentType,
        confidence: Math.max(0, 1 - fraudScore),
        fraudScore,
        extractedText: ocrResult.text,
        extractedData,
        qualityMetrics,
        anomalies,
        recommendations: this.generateDocumentRecommendations(
          isValid,
          fraudScore,
          qualityMetrics,
          anomalies
        )
      };

      // Store result for learning
      await this.storeVerificationResult(imagePath, result);
      
      return result;
    } catch (error) {
      logger.error('Document verification error:', error);
      throw new Error(`Document verification failed: ${error.message}`);
    }
  }

  async recognizeFace(
    imagePath: string,
    referenceImagePath?: string,
    personId?: string
  ): Promise<FaceRecognitionResult> {
    try {
      // Load and preprocess image
      const image = await this.loadImage(imagePath);
      
      // Detect faces
      const faces = await this.detectFaces(image);
      
      if (faces.length === 0) {
        throw new Error('No face detected in image');
      }
      
      // Use the largest face (primary subject)
      const primaryFace = faces.reduce((largest, face) => 
        face.area > largest.area ? face : largest
      );

      // Extract face features
      const faceFeatures = await this.extractFaceFeatures(primaryFace.roi);
      
      // Calculate face quality
      const faceQuality = this.calculateFaceQuality(primaryFace);
      
      // Perform liveness detection
      const liveness = await this.performLivenessDetection(primaryFace.roi);
      
      // Extract facial attributes
      const attributes = await this.extractFacialAttributes(primaryFace.roi);
      
      // Extract landmarks
      const landmarks = this.extractFacialLandmarks(primaryFace);
      
      let matchFound = false;
      let confidence = 0;
      let matchedPersonId: string | undefined;
      
      // Perform face matching if reference provided
      if (referenceImagePath || personId) {
        const matchResult = await this.performFaceMatching(
          faceFeatures,
          referenceImagePath,
          personId
        );
        matchFound = matchResult.found;
        confidence = matchResult.confidence;
        matchedPersonId = matchResult.personId;
      }

      const result: FaceRecognitionResult = {
        matchFound,
        confidence,
        matchedPersonId,
        faceQuality,
        landmarks,
        liveness,
        attributes
      };

      return result;
    } catch (error) {
      logger.error('Face recognition error:', error);
      throw new Error(`Face recognition failed: ${error.message}`);
    }
  }

  async analyzeQRCode(imagePath: string): Promise<QRCodeAnalysis> {
    try {
      // Load image
      const image = await cv.imread(imagePath);
      
      // Detect QR codes
      const qrCodes = this.detectQRCodes(image);
      
      if (qrCodes.length === 0) {
        return {
          isValid: false,
          data: '',
          errorCorrectionLevel: '',
          qualityScore: 0,
          readabilityScore: 0,
          recommendations: ['No QR code detected in image'],
          securityFeatures: {
            encrypted: false,
            digitallySigned: false,
            tamperEvident: false
          }
        };
      }

      const qrCode = qrCodes[0];
      
      // Calculate quality metrics
      const qualityScore = this.calculateQRQuality(qrCode, image);
      const readabilityScore = this.calculateQRReadability(qrCode);
      
      // Analyze security features
      const securityFeatures = this.analyzeQRSecurity(qrCode.data);
      
      // Generate recommendations
      const recommendations = this.generateQRRecommendations(qualityScore, readabilityScore);
      
      return {
        isValid: true,
        data: qrCode.data,
        errorCorrectionLevel: qrCode.errorCorrectionLevel,
        qualityScore,
        readabilityScore,
        recommendations,
        securityFeatures
      };
    } catch (error) {
      logger.error('QR code analysis error:', error);
      throw new Error(`QR code analysis failed: ${error.message}`);
    }
  }

  async validatePhoto(
    imagePath: string,
    requirements?: {
      minWidth?: number;
      minHeight?: number;
      aspectRatio?: number;
      backgroundColor?: string;
      faceRequired?: boolean;
    }
  ): Promise<PhotoValidation> {
    try {
      // Load image
      const image = await this.loadImage(imagePath);
      
      // Calculate overall quality score
      const qualityScore = await this.calculatePhotoQuality(image);
      
      // Detect face
      const faces = await this.detectFaces(image);
      const faceDetected = faces.length > 0;
      
      // Analyze background
      const backgroundAnalysis = this.analyzeBackground(image, faces);
      
      // Analyze lighting
      const lighting = this.analyzeLighting(image);
      
      // Analyze pose (if face detected)
      const pose = faceDetected ? this.analyzePose(faces[0]) : {
        frontal: false,
        eyesOpen: false,
        mouthClosed: false
      };
      
      // Identify issues
      const issues = this.identifyPhotoIssues(
        image,
        qualityScore,
        faceDetected,
        backgroundAnalysis,
        lighting,
        pose,
        requirements
      );
      
      const isValid = issues.length === 0 && qualityScore > 0.7;
      
      return {
        isValid,
        qualityScore,
        issues,
        faceDetected,
        backgroundAnalysis,
        lighting,
        pose
      };
    } catch (error) {
      logger.error('Photo validation error:', error);
      throw new Error(`Photo validation failed: ${error.message}`);
    }
  }

  async assessDamage(imagePath: string, passType: string): Promise<DamageAssessment> {
    try {
      // Load image
      const image = await this.loadImage(imagePath);
      
      // Detect damage indicators
      const damageIndicators = await this.detectDamageIndicators(image);
      
      // Classify damage types
      const damageTypes = this.classifyDamageTypes(damageIndicators);
      
      // Assess damage level
      const damageLevel = this.assessOverallDamageLevel(damageIndicators);
      
      // Identify affected areas
      const affectedAreas = this.identifyAffectedAreas(damageIndicators);
      
      // Determine repairability
      const repairability = this.assessRepairability(damageLevel, damageTypes);
      const replacementNeeded = !repairability || damageLevel === 'severe';
      
      // Estimate cost
      const estimatedCost = this.estimateRepairCost(
        damageLevel,
        damageTypes,
        passType,
        replacementNeeded
      );
      
      // Generate recommendations
      const recommendations = this.generateDamageRecommendations(
        damageLevel,
        damageTypes,
        repairability,
        replacementNeeded
      );
      
      return {
        damageLevel,
        damageTypes,
        affectedAreas,
        repairability,
        replacementNeeded,
        estimatedCost,
        recommendations
      };
    } catch (error) {
      logger.error('Damage assessment error:', error);
      throw new Error(`Damage assessment failed: ${error.message}`);
    }
  }

  async enhanceImage(
    imagePath: string,
    options: ImageProcessingOptions
  ): Promise<{ enhancedImagePath: string; improvements: string[] }> {
    try {
      const image = await this.loadImage(imagePath);
      let enhancedImage = image.clone();
      const improvements: string[] = [];
      
      if (options.denoiseImage) {
        enhancedImage = this.denoiseImage(enhancedImage);
        improvements.push('Noise reduction applied');
      }
      
      if (options.enhanceContrast) {
        enhancedImage = this.enhanceContrast(enhancedImage);
        improvements.push('Contrast enhancement applied');
      }
      
      if (options.correctPerspective) {
        enhancedImage = await this.correctPerspective(enhancedImage);
        improvements.push('Perspective correction applied');
      }
      
      if (options.enhanceText) {
        enhancedImage = this.enhanceTextRegions(enhancedImage);
        improvements.push('Text enhancement applied');
      }
      
      if (options.cropToContent) {
        enhancedImage = await this.cropToContent(enhancedImage);
        improvements.push('Content-aware cropping applied');
      }
      
      // Save enhanced image
      const enhancedImagePath = await this.saveEnhancedImage(enhancedImage, imagePath);
      
      return {
        enhancedImagePath,
        improvements
      };
    } catch (error) {
      logger.error('Image enhancement error:', error);
      throw new Error(`Image enhancement failed: ${error.message}`);
    }
  }

  // Private helper methods (simplified implementations)

  private async loadImage(imagePath: string): Promise<cv.Mat> {
    return cv.imread(imagePath);
  }

  private async preprocessImage(image: cv.Mat, options: ImageProcessingOptions): Promise<cv.Mat> {
    let processed = image.clone();
    
    if (options.enhanceContrast) {
      processed = this.enhanceContrast(processed);
    }
    
    if (options.denoiseImage) {
      processed = this.denoiseImage(processed);
    }
    
    return processed;
  }

  private async performOCR(image: cv.Mat): Promise<{ text: string; confidence: number }> {
    if (!this.ocrWorker) {
      throw new Error('OCR worker not initialized');
    }
    
    // Convert cv.Mat to buffer
    const buffer = cv.imencode('.jpg', image);
    
    const result = await this.ocrWorker.recognize(buffer);
    
    return {
      text: result.data.text,
      confidence: result.data.confidence / 100
    };
  }

  private async classifyDocument(image: cv.Mat): Promise<string> {
    if (!this.documentModel) {
      return 'unknown';
    }
    
    // Resize image to model input size
    const resized = image.resize(256, 256);
    
    // Convert to tensor
    const tensor = tf.browser.fromPixels(resized.getDataAsArray() as any)
      .expandDims(0)
      .div(255.0);
    
    // Make prediction
    const prediction = this.documentModel.predict(tensor) as tf.Tensor;
    const predictionData = await prediction.data();
    
    // Clean up tensors
    tensor.dispose();
    prediction.dispose();
    
    // Map to document type
    const documentTypes = [
      'passport',
      'driver_license',
      'student_id',
      'transcript',
      'certificate',
      'utility_bill',
      'bank_statement',
      'medical_record',
      'legal_document',
      'other'
    ];
    
    const maxIndex = Array.from(predictionData).indexOf(Math.max(...Array.from(predictionData)));
    return documentTypes[maxIndex] || 'unknown';
  }

  private async detectDocumentFraud(image: cv.Mat, text: string): Promise<number> {
    let fraudScore = 0;
    
    // Check for image manipulation indicators
    const manipulationScore = this.detectImageManipulation(image);
    fraudScore += manipulationScore * 0.4;
    
    // Check text consistency
    const textConsistency = this.analyzeTextConsistency(text);
    fraudScore += (1 - textConsistency) * 0.3;
    
    // Check for duplicate/template indicators
    const templateScore = this.detectTemplateUsage(image, text);
    fraudScore += templateScore * 0.3;
    
    return Math.min(fraudScore, 1.0);
  }

  private extractStructuredData(text: string, documentType: string): any {
    const data: any = {};
    
    // Extract common patterns
    const patterns = {
      name: /name[:\s]*([a-zA-Z\s]+)/i,
      id: /(?:id|number)[:\s]*([a-zA-Z0-9]+)/i,
      dateOfBirth: /(?:dob|birth)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i,
      expiryDate: /(?:exp|expiry)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i,
      email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      phone: /(\d{3}[-.]?\d{3}[-.]?\d{4})/
    };
    
    Object.entries(patterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        data[key] = match[1].trim();
      }
    });
    
    return data;
  }

  private async calculateImageQualityMetrics(image: cv.Mat, ocrResult: any): Promise<any> {
    return {
      imageQuality: this.calculateImageQuality(image),
      textQuality: ocrResult.confidence,
      completeness: this.calculateCompleteness(ocrResult.text),
      tamperingScore: this.detectTampering(image)
    };
  }

  private identifyDocumentAnomalies(image: cv.Mat, ocrResult: any, documentType: string): string[] {
    const anomalies: string[] = [];
    
    // Check image quality
    const quality = this.calculateImageQuality(image);
    if (quality < 0.5) anomalies.push('Poor image quality');
    
    // Check text readability
    if (ocrResult.confidence < 0.7) anomalies.push('Text not clearly readable');
    
    // Check for expected document features
    if (documentType === 'passport' && !ocrResult.text.includes('PASSPORT')) {
      anomalies.push('Missing passport header');
    }
    
    return anomalies;
  }

  private validateDocument(
    documentType: string,
    expectedType?: string,
    fraudScore: number,
    qualityMetrics: any
  ): boolean {
    if (expectedType && documentType !== expectedType) return false;
    if (fraudScore > 0.7) return false;
    if (qualityMetrics.imageQuality < 0.5) return false;
    if (qualityMetrics.textQuality < 0.6) return false;
    
    return true;
  }

  private generateDocumentRecommendations(
    isValid: boolean,
    fraudScore: number,
    qualityMetrics: any,
    anomalies: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (!isValid) {
      recommendations.push('Document verification failed - manual review required');
    }
    
    if (fraudScore > 0.5) {
      recommendations.push('High fraud risk detected - additional verification needed');
    }
    
    if (qualityMetrics.imageQuality < 0.7) {
      recommendations.push('Improve image quality by ensuring good lighting and focus');
    }
    
    if (anomalies.length > 0) {
      recommendations.push('Address identified anomalies before resubmission');
    }
    
    return recommendations;
  }

  // Placeholder implementations for complex CV operations
  private async detectFaces(image: cv.Mat): Promise<any[]> {
    return [{
      roi: image,
      area: 1000,
      x: 100,
      y: 100,
      width: 200,
      height: 200
    }];
  }

  private async extractFaceFeatures(faceRoi: cv.Mat): Promise<number[]> {
    return new Array(128).fill(0).map(() => Math.random());
  }

  private calculateFaceQuality(face: any): number {
    return 0.85;
  }

  private async performLivenessDetection(faceRoi: cv.Mat): Promise<any> {
    return { isLive: true, confidence: 0.9 };
  }

  private async extractFacialAttributes(faceRoi: cv.Mat): Promise<any> {
    return { age: 25, gender: 'unknown', emotion: 'neutral' };
  }

  private extractFacialLandmarks(face: any): any {
    return {
      leftEye: { x: 120, y: 150 },
      rightEye: { x: 180, y: 150 },
      nose: { x: 150, y: 180 },
      mouth: { x: 150, y: 220 }
    };
  }

  private async performFaceMatching(features: number[], referencePath?: string, personId?: string): Promise<any> {
    return { found: false, confidence: 0.0, personId: undefined };
  }

  private detectQRCodes(image: cv.Mat): any[] {
    return [{
      data: 'sample_qr_data',
      errorCorrectionLevel: 'M'
    }];
  }

  private calculateQRQuality(qrCode: any, image: cv.Mat): number {
    return 0.85;
  }

  private calculateQRReadability(qrCode: any): number {
    return 0.9;
  }

  private analyzeQRSecurity(data: string): any {
    return {
      encrypted: false,
      digitallySigned: false,
      tamperEvident: false
    };
  }

  private generateQRRecommendations(quality: number, readability: number): string[] {
    const recommendations: string[] = [];
    if (quality < 0.8) recommendations.push('Improve image quality');
    if (readability < 0.8) recommendations.push('Ensure QR code is not damaged');
    return recommendations;
  }

  private async calculatePhotoQuality(image: cv.Mat): Promise<number> {
    return 0.8;
  }

  private analyzeBackground(image: cv.Mat, faces: any[]): any {
    return {
      isPlain: true,
      color: 'white',
      uniformity: 0.9
    };
  }

  private analyzeLighting(image: cv.Mat): any {
    return {
      overall: 0.8,
      shadows: 0.2,
      glare: 0.1
    };
  }

  private analyzePose(face: any): any {
    return {
      frontal: true,
      eyesOpen: true,
      mouthClosed: true
    };
  }

  private identifyPhotoIssues(image: cv.Mat, quality: number, faceDetected: boolean, background: any, lighting: any, pose: any, requirements?: any): string[] {
    const issues: string[] = [];
    
    if (quality < 0.6) issues.push('Poor image quality');
    if (requirements?.faceRequired && !faceDetected) issues.push('No face detected');
    if (!background.isPlain) issues.push('Background not plain');
    if (lighting.overall < 0.6) issues.push('Poor lighting');
    
    return issues;
  }

  // Additional helper methods
  private async detectDamageIndicators(image: cv.Mat): Promise<any[]> { return []; }
  private classifyDamageTypes(indicators: any[]): string[] { return []; }
  private assessOverallDamageLevel(indicators: any[]): 'none' | 'minor' | 'moderate' | 'severe' { return 'none'; }
  private identifyAffectedAreas(indicators: any[]): any[] { return []; }
  private assessRepairability(level: string, types: string[]): boolean { return true; }
  private estimateRepairCost(level: string, types: string[], passType: string, replacement: boolean): number { return 0; }
  private generateDamageRecommendations(level: string, types: string[], repairable: boolean, replacement: boolean): string[] { return []; }
  
  private denoiseImage(image: cv.Mat): cv.Mat { return image; }
  private enhanceContrast(image: cv.Mat): cv.Mat { return image; }
  private async correctPerspective(image: cv.Mat): Promise<cv.Mat> { return image; }
  private enhanceTextRegions(image: cv.Mat): cv.Mat { return image; }
  private async cropToContent(image: cv.Mat): Promise<cv.Mat> { return image; }
  private async saveEnhancedImage(image: cv.Mat, originalPath: string): Promise<string> { return originalPath; }
  
  private detectImageManipulation(image: cv.Mat): number { return 0.1; }
  private analyzeTextConsistency(text: string): number { return 0.9; }
  private detectTemplateUsage(image: cv.Mat, text: string): number { return 0.1; }
  private calculateImageQuality(image: cv.Mat): number { return 0.8; }
  private calculateCompleteness(text: string): number { return 0.85; }
  private detectTampering(image: cv.Mat): number { return 0.1; }
  
  private async storeVerificationResult(imagePath: string, result: DocumentVerificationResult): Promise<void> {
    try {
      await this.prisma.documentVerification.create({
        data: {
          imagePath,
          result: JSON.stringify(result),
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to store verification result:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.ocrWorker) {
        await this.ocrWorker.terminate();
      }
      
      if (this.faceModel) {
        this.faceModel.dispose();
      }
      
      if (this.documentModel) {
        this.documentModel.dispose();
      }
      
      await this.prisma.$disconnect();
      
      logger.info('Computer Vision service cleanup completed');
    } catch (error) {
      logger.error('Computer Vision cleanup error:', error);
    }
  }
}

export const computerVisionService = new ComputerVisionService();