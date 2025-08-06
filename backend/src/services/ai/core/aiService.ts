import OpenAI from 'openai';
import * as tf from '@tensorflow/tfjs-node';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { cacheService } from '../cache.service';
import { metricsService } from '../metrics.service';

export interface AIModelConfig {
  name: string;
  version: string;
  type: 'tensorflow' | 'openai' | 'custom';
  endpoint?: string;
  cache: boolean;
  cacheTTL: number;
}

export interface PredictionResult {
  prediction: any;
  confidence: number;
  modelUsed: string;
  timestamp: Date;
  processingTime: number;
  cached?: boolean;
}

export interface TrainingData {
  features: number[][];
  labels: number[];
  validationSplit?: number;
  epochs?: number;
  batchSize?: number;
}

export class AIService {
  private openai: OpenAI;
  private models: Map<string, tf.LayersModel> = new Map();
  private prisma: PrismaClient;
  private modelConfigs: Map<string, AIModelConfig> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.prisma = new PrismaClient();
    this.initializeModels();
  }

  private async initializeModels() {
    try {
      // Initialize TensorFlow models
      await this.loadModel('fraud_detection', '/models/fraud_detection/model.json');
      await this.loadModel('approval_predictor', '/models/approval_predictor/model.json');
      await this.loadModel('risk_assessment', '/models/risk_assessment/model.json');
      await this.loadModel('anomaly_detector', '/models/anomaly_detector/model.json');
      
      logger.info('AI models initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI models:', error);
    }
  }

  private async loadModel(name: string, path: string): Promise<void> {
    try {
      // Try to load existing model
      const model = await tf.loadLayersModel(`file://.${path}`);
      this.models.set(name, model);
      logger.info(`Model ${name} loaded successfully`);
    } catch (error) {
      logger.warn(`Model ${name} not found, will create when training data is available`);
      // Create a simple neural network as fallback
      await this.createDefaultModel(name);
    }
  }

  private async createDefaultModel(name: string): Promise<void> {
    let inputShape: number[];
    let outputShape: number;

    switch (name) {
      case 'fraud_detection':
        inputShape = [20]; // 20 features
        outputShape = 1; // Binary classification
        break;
      case 'approval_predictor':
        inputShape = [15]; // 15 features
        outputShape = 1; // Probability score
        break;
      case 'risk_assessment':
        inputShape = [25]; // 25 features
        outputShape = 5; // Risk categories
        break;
      case 'anomaly_detector':
        inputShape = [30]; // 30 features
        outputShape = 1; // Anomaly score
        break;
      default:
        inputShape = [10];
        outputShape = 1;
    }

    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: inputShape,
          units: 64,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: outputShape,
          activation: outputShape === 1 ? 'sigmoid' : 'softmax'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: outputShape === 1 ? 'binaryCrossentropy' : 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    this.models.set(name, model);
    logger.info(`Default model ${name} created`);
  }

  async predict(
    modelName: string,
    features: number[],
    useCache: boolean = true
  ): Promise<PredictionResult> {
    const startTime = Date.now();
    const cacheKey = `ai_prediction:${modelName}:${JSON.stringify(features)}`;

    // Check cache first
    if (useCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        const result = JSON.parse(cached);
        result.cached = true;
        result.processingTime = Date.now() - startTime;
        
        await metricsService.recordPrediction(modelName, result.confidence, true);
        return result;
      }
    }

    try {
      const model = this.models.get(modelName);
      if (!model) {
        throw new Error(`Model ${modelName} not found`);
      }

      // Prepare input tensor
      const input = tf.tensor2d([features]);
      
      // Make prediction
      const prediction = model.predict(input) as tf.Tensor;
      const predictionArray = await prediction.data();
      
      // Clean up tensors
      input.dispose();
      prediction.dispose();

      const result: PredictionResult = {
        prediction: Array.from(predictionArray),
        confidence: this.calculateConfidence(predictionArray),
        modelUsed: modelName,
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
        cached: false
      };

      // Cache the result
      if (useCache) {
        await cacheService.set(
          cacheKey,
          JSON.stringify(result),
          300 // 5 minutes TTL
        );
      }

      await metricsService.recordPrediction(modelName, result.confidence, false);
      
      return result;
    } catch (error) {
      logger.error(`Prediction error for model ${modelName}:`, error);
      throw new Error(`Prediction failed: ${error.message}`);
    }
  }

  async trainModel(
    modelName: string,
    trainingData: TrainingData
  ): Promise<void> {
    try {
      const model = this.models.get(modelName);
      if (!model) {
        throw new Error(`Model ${modelName} not found`);
      }

      const { features, labels, validationSplit = 0.2, epochs = 100, batchSize = 32 } = trainingData;

      // Prepare training data
      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels.map(l => [l]));

      // Train the model
      const history = await model.fit(xs, ys, {
        epochs,
        batchSize,
        validationSplit,
        shuffle: true,
        callbacks: {
          onEpochEnd: async (epoch, logs) => {
            logger.info(`Epoch ${epoch + 1}/${epochs} - loss: ${logs.loss.toFixed(4)}, accuracy: ${logs.acc?.toFixed(4)}`);
          }
        }
      });

      // Save the trained model
      await model.save(`file://./models/${modelName}`);
      
      // Clean up tensors
      xs.dispose();
      ys.dispose();

      logger.info(`Model ${modelName} training completed`);
      
      // Store training metrics
      await this.saveTrainingMetrics(modelName, history);

    } catch (error) {
      logger.error(`Training error for model ${modelName}:`, error);
      throw new Error(`Training failed: ${error.message}`);
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Embedding generation error:', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  async generateCompletion(
    prompt: string,
    maxTokens: number = 150,
    temperature: number = 0.7
  ): Promise<string> {
    try {
      const response = await this.openai.completions.create({
        model: 'gpt-3.5-turbo-instruct',
        prompt,
        max_tokens: maxTokens,
        temperature,
        stop: ['\n\n']
      });

      return response.choices[0].text.trim();
    } catch (error) {
      logger.error('Completion generation error:', error);
      throw new Error(`Completion generation failed: ${error.message}`);
    }
  }

  async chatCompletion(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    maxTokens: number = 150,
    temperature: number = 0.7
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: maxTokens,
        temperature,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      logger.error('Chat completion error:', error);
      throw new Error(`Chat completion failed: ${error.message}`);
    }
  }

  private calculateConfidence(predictions: Float32Array): number {
    if (predictions.length === 1) {
      // Binary classification: confidence is distance from 0.5
      return Math.abs(predictions[0] - 0.5) * 2;
    } else {
      // Multi-class: confidence is the max probability
      return Math.max(...Array.from(predictions));
    }
  }

  private async saveTrainingMetrics(modelName: string, history: tf.History) {
    try {
      const metrics = {
        modelName,
        finalLoss: history.history.loss[history.history.loss.length - 1],
        finalAccuracy: history.history.acc?.[history.history.acc.length - 1] || 0,
        epochs: history.history.loss.length,
        timestamp: new Date()
      };

      await this.prisma.aITrainingMetrics.create({
        data: metrics
      });
    } catch (error) {
      logger.error('Failed to save training metrics:', error);
    }
  }

  async getModelPerformance(modelName: string): Promise<any> {
    try {
      const metrics = await this.prisma.aITrainingMetrics.findMany({
        where: { modelName },
        orderBy: { timestamp: 'desc' },
        take: 10
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to get model performance:', error);
      return [];
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Dispose all models
      for (const [name, model] of this.models) {
        model.dispose();
        logger.info(`Model ${name} disposed`);
      }
      
      this.models.clear();
      await this.prisma.$disconnect();
      
      logger.info('AI Service cleanup completed');
    } catch (error) {
      logger.error('AI Service cleanup error:', error);
    }
  }
}

export const aiService = new AIService();