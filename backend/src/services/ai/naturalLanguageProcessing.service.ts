import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import natural from 'natural';
import Sentiment from 'sentiment';
import nlp from 'compromise';
import { aiService } from './core/aiService';
import { logger } from '../utils/logger';
import { cacheService } from '../cache.service';

export interface ChatBotResponse {
  message: string;
  intent: string;
  confidence: number;
  suggested_actions?: string[];
  escalate_to_human?: boolean;
  context?: any;
  followup_questions?: string[];
}

export interface SupportTicketClassification {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  department: string;
  estimated_resolution_time: number;
  auto_responses?: string[];
  required_information?: string[];
  similar_tickets?: string[];
}

export interface SentimentAnalysis {
  score: number; // -1 to 1
  comparative: number;
  tokens: string[];
  positive: string[];
  negative: string[];
  overall: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface DocumentExtraction {
  text: string;
  entities: {
    type: string;
    value: string;
    confidence: number;
    start: number;
    end: number;
  }[];
  key_information: {
    student_id?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    pass_type?: string;
    dates?: string[];
    amounts?: number[];
  };
  document_type: string;
  quality_score: number;
  errors?: string[];
}

export interface MultiLanguageSupport {
  detected_language: string;
  confidence: number;
  translated_text?: string;
  original_text: string;
  supported_languages: string[];
}

export interface ConversationContext {
  conversation_id: string;
  user_id: string;
  session_start: Date;
  messages: {
    timestamp: Date;
    sender: 'user' | 'bot';
    message: string;
    intent?: string;
    confidence?: number;
  }[];
  resolved: boolean;
  satisfaction_score?: number;
}

export class NaturalLanguageProcessingService {
  private openai: OpenAI;
  private prisma: PrismaClient;
  private sentiment: Sentiment;
  private conversations: Map<string, ConversationContext> = new Map();
  
  // Predefined intents and their training data
  private intents = {
    'application_status': {
      patterns: [
        'check my application status',
        'where is my pass application',
        'application status update',
        'has my application been approved',
        'when will my pass be ready'
      ],
      responses: [
        'Let me check your application status for you.',
        'I can help you track your pass application.',
        'Please provide your application ID or student ID.'
      ]
    },
    'application_help': {
      patterns: [
        'how to apply for pass',
        'pass application process',
        'what documents needed',
        'application requirements',
        'how to submit application'
      ],
      responses: [
        'I can guide you through the pass application process.',
        'Here are the required documents for your pass application.',
        'Let me walk you through the application steps.'
      ]
    },
    'technical_support': {
      patterns: [
        'website not working',
        'login problems',
        'upload error',
        'system error',
        'technical issue'
      ],
      responses: [
        'I understand you\'re experiencing technical difficulties.',
        'Let me help troubleshoot this technical issue.',
        'I can guide you through some common solutions.'
      ]
    },
    'pass_renewal': {
      patterns: [
        'renew my pass',
        'pass expiring',
        'extend pass validity',
        'pass renewal process',
        'renew student pass'
      ],
      responses: [
        'I can help you with pass renewal.',
        'Let me check your pass expiration details.',
        'Here\'s how to renew your student pass.'
      ]
    },
    'complaints': {
      patterns: [
        'complaint about service',
        'not satisfied',
        'poor service',
        'staff behavior',
        'long waiting time'
      ],
      responses: [
        'I\'m sorry to hear about your experience.',
        'Let me escalate this to the appropriate department.',
        'Your feedback is important to us.'
      ]
    }
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.prisma = new PrismaClient();
    this.sentiment = new Sentiment();
    
    this.initializeNLP();
  }

  private async initializeNLP() {
    try {
      // Train classifier with intents
      this.trainIntentClassifier();
      logger.info('NLP service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize NLP service:', error);
    }
  }

  private trainIntentClassifier() {
    // Use natural.js to train a Naive Bayes classifier
    const classifier = new natural.BayesClassifier();
    
    Object.entries(this.intents).forEach(([intent, data]) => {
      data.patterns.forEach(pattern => {
        classifier.addDocument(pattern, intent);
      });
    });
    
    classifier.train();
    this.intentClassifier = classifier;
  }

  private intentClassifier: any;

  async processChatMessage(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<ChatBotResponse> {
    try {
      // Get or create conversation context
      const context = this.getConversationContext(userId, conversationId);
      
      // Add user message to context
      context.messages.push({
        timestamp: new Date(),
        sender: 'user',
        message,
        intent: undefined,
        confidence: undefined
      });

      // Detect language
      const language = await this.detectLanguage(message);
      let processedMessage = message;
      
      // Translate if not English
      if (language.detected_language !== 'en' && language.confidence > 0.8) {
        processedMessage = await this.translateToEnglish(message);
      }

      // Analyze sentiment
      const sentimentResult = this.analyzeSentiment(processedMessage);
      
      // Classify intent
      const intent = this.intentClassifier.classify(processedMessage);
      const confidence = this.intentClassifier.getClassifications(processedMessage)[0].value;
      
      // Generate response based on intent and context
      let response: ChatBotResponse;
      
      if (confidence > 0.7) {
        response = await this.generateIntentBasedResponse(intent, processedMessage, context, sentimentResult);
      } else {
        response = await this.generateAIResponse(processedMessage, context);
      }
      
      // Add bot response to context
      context.messages.push({
        timestamp: new Date(),
        sender: 'bot',
        message: response.message,
        intent: response.intent,
        confidence: response.confidence
      });

      // Check if escalation is needed
      if (sentimentResult.score < -0.5 || intent === 'complaints') {
        response.escalate_to_human = true;
      }

      // Store conversation
      await this.storeConversation(context);
      
      return response;
    } catch (error) {
      logger.error('Chat processing error:', error);
      return {
        message: 'I apologize, but I\'m experiencing some technical difficulties. Please try again or contact support.',
        intent: 'error',
        confidence: 1.0,
        escalate_to_human: true
      };
    }
  }

  private async generateIntentBasedResponse(
    intent: string,
    message: string,
    context: ConversationContext,
    sentiment: SentimentAnalysis
  ): Promise<ChatBotResponse> {
    const intentData = this.intents[intent];
    let response = intentData.responses[0];
    const suggested_actions: string[] = [];
    const followup_questions: string[] = [];

    switch (intent) {
      case 'application_status':
        response = await this.handleStatusInquiry(message, context);
        suggested_actions.push('Check application details', 'Download receipt');
        followup_questions.push('Would you like me to notify you of any updates?');
        break;

      case 'application_help':
        response = await this.handleApplicationHelp(message, context);
        suggested_actions.push('Start new application', 'View requirements', 'Download forms');
        followup_questions.push('Do you need help with document preparation?');
        break;

      case 'technical_support':
        response = await this.handleTechnicalSupport(message, context);
        suggested_actions.push('Clear browser cache', 'Try different browser', 'Contact IT support');
        followup_questions.push('Are you still experiencing the issue?');
        break;

      case 'pass_renewal':
        response = await this.handlePassRenewal(message, context);
        suggested_actions.push('Start renewal process', 'Check eligibility', 'View fees');
        followup_questions.push('When does your current pass expire?');
        break;

      case 'complaints':
        response = await this.handleComplaint(message, context);
        suggested_actions.push('File formal complaint', 'Speak to supervisor', 'Provide feedback');
        break;

      default:
        response = await this.generateAIResponse(message, context);
    }

    return {
      message: response,
      intent,
      confidence: 0.8,
      suggested_actions,
      followup_questions,
      escalate_to_human: intent === 'complaints' || sentiment.score < -0.5
    };
  }

  private async generateAIResponse(message: string, context: ConversationContext): Promise<ChatBotResponse> {
    try {
      // Build context from conversation history
      const conversationHistory = context.messages.slice(-5).map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.message
      }));

      const systemPrompt = `
        You are a helpful AI assistant for a student pass management system. 
        You help students with:
        - Pass applications and renewals
        - Application status inquiries
        - Document requirements
        - Technical support
        - General guidance
        
        Be concise, helpful, and professional. If you cannot help with something specific,
        suggest contacting human support.
      `;

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory,
        { role: 'user' as const, content: message }
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 200,
        temperature: 0.7
      });

      const botResponse = response.choices[0].message.content || 'I apologize, but I couldn\'t process your request.';

      return {
        message: botResponse,
        intent: 'general_inquiry',
        confidence: 0.6
      };
    } catch (error) {
      logger.error('AI response generation error:', error);
      throw error;
    }
  }

  async classifySupportTicket(
    title: string,
    description: string,
    attachments?: string[]
  ): Promise<SupportTicketClassification> {
    try {
      const fullText = `${title} ${description}`;
      
      // Extract features from text
      const features = this.extractTicketFeatures(fullText);
      
      // Use AI to classify
      const classification = await aiService.predict('ticket_classifier', features);
      
      // Analyze priority based on keywords and sentiment
      const sentiment = this.analyzeSentiment(fullText);
      const priority = this.determinePriority(fullText, sentiment, attachments);
      
      // Determine department
      const department = this.determineDepartment(fullText);
      
      // Estimate resolution time
      const estimatedTime = this.estimateResolutionTime(priority, department);
      
      // Find similar tickets
      const similarTickets = await this.findSimilarTickets(fullText);
      
      return {
        category: this.mapCategory(classification.prediction[0]),
        priority,
        department,
        estimated_resolution_time: estimatedTime,
        auto_responses: await this.generateAutoResponses(fullText, priority),
        required_information: this.identifyRequiredInfo(fullText),
        similar_tickets: similarTickets
      };
    } catch (error) {
      logger.error('Ticket classification error:', error);
      throw new Error(`Ticket classification failed: ${error.message}`);
    }
  }

  analyzeSentiment(text: string): SentimentAnalysis {
    try {
      const result = this.sentiment.analyze(text);
      
      return {
        score: result.score / Math.abs(result.score) || 0, // Normalize to -1 to 1
        comparative: result.comparative,
        tokens: result.tokens || [],
        positive: result.positive || [],
        negative: result.negative || [],
        overall: result.comparative > 0.1 ? 'positive' : 
                result.comparative < -0.1 ? 'negative' : 'neutral',
        confidence: Math.abs(result.comparative)
      };
    } catch (error) {
      logger.error('Sentiment analysis error:', error);
      return {
        score: 0,
        comparative: 0,
        tokens: [],
        positive: [],
        negative: [],
        overall: 'neutral',
        confidence: 0
      };
    }
  }

  async extractDocumentInformation(
    documentText: string,
    documentType?: string
  ): Promise<DocumentExtraction> {
    try {
      // Use NLP to extract entities
      const doc = nlp(documentText);
      const entities = this.extractEntities(doc);
      
      // Extract key information based on document type
      const keyInfo = this.extractKeyInformation(documentText, documentType);
      
      // Determine document type if not provided
      const detectedType = documentType || this.detectDocumentType(documentText);
      
      // Calculate quality score
      const qualityScore = this.calculateDocumentQuality(documentText, entities);
      
      // Identify potential errors
      const errors = this.identifyDocumentErrors(documentText, detectedType);
      
      return {
        text: documentText,
        entities,
        key_information: keyInfo,
        document_type: detectedType,
        quality_score: qualityScore,
        errors
      };
    } catch (error) {
      logger.error('Document extraction error:', error);
      throw new Error(`Document extraction failed: ${error.message}`);
    }
  }

  async detectLanguage(text: string): Promise<MultiLanguageSupport> {
    try {
      // Use OpenAI for language detection
      const prompt = `Detect the language of this text and return only the ISO 639-1 code: "${text}"`;
      
      const response = await this.openai.completions.create({
        model: 'gpt-3.5-turbo-instruct',
        prompt,
        max_tokens: 10,
        temperature: 0
      });

      const detectedLang = response.choices[0].text.trim().toLowerCase();
      
      return {
        detected_language: detectedLang,
        confidence: 0.9, // OpenAI typically has high confidence
        original_text: text,
        supported_languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar']
      };
    } catch (error) {
      logger.error('Language detection error:', error);
      return {
        detected_language: 'en',
        confidence: 0.5,
        original_text: text,
        supported_languages: ['en']
      };
    }
  }

  async translateToEnglish(text: string): Promise<string> {
    try {
      const messages = [
        {
          role: 'system' as const,
          content: 'You are a translator. Translate the given text to English. Return only the translation, no explanations.'
        },
        {
          role: 'user' as const,
          content: text
        }
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 200,
        temperature: 0
      });

      return response.choices[0].message.content || text;
    } catch (error) {
      logger.error('Translation error:', error);
      return text;
    }
  }

  private getConversationContext(userId: string, conversationId?: string): ConversationContext {
    const id = conversationId || `${userId}_${Date.now()}`;
    
    if (!this.conversations.has(id)) {
      this.conversations.set(id, {
        conversation_id: id,
        user_id: userId,
        session_start: new Date(),
        messages: [],
        resolved: false
      });
    }
    
    return this.conversations.get(id)!;
  }

  private extractTicketFeatures(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const wordCount = words.length;
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / wordCount;
    
    // Technical keywords
    const technicalKeywords = ['error', 'bug', 'crash', 'login', 'password', 'system', 'website'];
    const technicalScore = technicalKeywords.filter(keyword => text.includes(keyword)).length / technicalKeywords.length;
    
    // Urgency keywords
    const urgencyKeywords = ['urgent', 'asap', 'immediately', 'critical', 'emergency'];
    const urgencyScore = urgencyKeywords.filter(keyword => text.includes(keyword)).length / urgencyKeywords.length;
    
    // Question indicators
    const questionWords = ['how', 'what', 'when', 'where', 'why', 'can', 'could', 'would'];
    const questionScore = questionWords.filter(word => text.includes(word)).length / questionWords.length;
    
    return [
      wordCount / 100, // Normalized word count
      avgWordLength / 10, // Normalized average word length
      technicalScore,
      urgencyScore,
      questionScore,
      this.analyzeSentiment(text).comparative // Sentiment
    ];
  }

  private determinePriority(text: string, sentiment: SentimentAnalysis, attachments?: string[]): 'low' | 'medium' | 'high' | 'critical' {
    let score = 0;
    
    // Urgency keywords
    if (text.match(/urgent|critical|emergency|asap|immediately/i)) score += 3;
    if (text.match(/soon|quick|fast/i)) score += 2;
    
    // Negative sentiment
    if (sentiment.overall === 'negative') score += 2;
    if (sentiment.score < -0.5) score += 2;
    
    // System issues
    if (text.match(/down|broken|not working|error|crash/i)) score += 2;
    
    // Multiple attachments might indicate complex issue
    if (attachments && attachments.length > 2) score += 1;
    
    if (score >= 6) return 'critical';
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  private determineDepartment(text: string): string {
    if (text.match(/technical|system|login|password|error|bug/i)) return 'IT Support';
    if (text.match(/application|pass|document|approval/i)) return 'Pass Services';
    if (text.match(/payment|fee|refund|billing/i)) return 'Finance';
    if (text.match(/complaint|feedback|service/i)) return 'Customer Service';
    return 'General Support';
  }

  private estimateResolutionTime(priority: string, department: string): number {
    const baseTimes = {
      'IT Support': 4,
      'Pass Services': 24,
      'Finance': 48,
      'Customer Service': 8,
      'General Support': 12
    };
    
    const priorityMultipliers = {
      'critical': 0.25,
      'high': 0.5,
      'medium': 1,
      'low': 2
    };
    
    const baseTime = baseTimes[department] || 12;
    const multiplier = priorityMultipliers[priority] || 1;
    
    return Math.round(baseTime * multiplier);
  }

  private mapCategory(prediction: number): string {
    // Map prediction to category
    const categories = [
      'Technical Issue',
      'Application Support',
      'Account Problem',
      'General Inquiry',
      'Complaint',
      'Feature Request'
    ];
    
    const index = Math.floor(prediction * categories.length);
    return categories[Math.min(index, categories.length - 1)];
  }

  private extractEntities(doc: any): any[] {
    const entities: any[] = [];
    
    // Extract people
    doc.people().forEach((person: any) => {
      entities.push({
        type: 'PERSON',
        value: person.text(),
        confidence: 0.8,
        start: person.offset().start,
        end: person.offset().end
      });
    });
    
    // Extract organizations
    doc.organizations().forEach((org: any) => {
      entities.push({
        type: 'ORGANIZATION',
        value: org.text(),
        confidence: 0.8,
        start: org.offset().start,
        end: org.offset().end
      });
    });
    
    // Extract dates
    doc.dates().forEach((date: any) => {
      entities.push({
        type: 'DATE',
        value: date.text(),
        confidence: 0.9,
        start: date.offset().start,
        end: date.offset().end
      });
    });
    
    return entities;
  }

  private extractKeyInformation(text: string, documentType?: string): any {
    const keyInfo: any = {};
    
    // Extract common patterns
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    const studentIdRegex = /\b\d{6,10}\b/g;
    
    const emails = text.match(emailRegex);
    if (emails) keyInfo.email = emails[0];
    
    const phones = text.match(phoneRegex);
    if (phones) keyInfo.phone = phones[0];
    
    const studentIds = text.match(studentIdRegex);
    if (studentIds) keyInfo.student_id = studentIds[0];
    
    return keyInfo;
  }

  private detectDocumentType(text: string): string {
    if (text.match(/transcript|grade|academic/i)) return 'academic_transcript';
    if (text.match(/application|apply|request/i)) return 'application_form';
    if (text.match(/identity|id|license|passport/i)) return 'identity_document';
    if (text.match(/receipt|payment|fee/i)) return 'payment_receipt';
    return 'general_document';
  }

  private calculateDocumentQuality(text: string, entities: any[]): number {
    let score = 0.5; // Base score
    
    // Text length indicates completeness
    if (text.length > 100) score += 0.2;
    if (text.length > 500) score += 0.2;
    
    // Number of entities indicates information richness
    if (entities.length > 3) score += 0.2;
    if (entities.length > 6) score += 0.1;
    
    // Check for common OCR errors
    const ocrErrors = text.match(/\b[0-9][a-z]{2,}|[a-z][0-9]{2,}\b/gi);
    if (ocrErrors && ocrErrors.length > 3) score -= 0.2;
    
    return Math.min(Math.max(score, 0), 1);
  }

  private identifyDocumentErrors(text: string, documentType: string): string[] {
    const errors: string[] = [];
    
    // Check for missing required information
    if (documentType === 'application_form') {
      if (!text.match(/name/i)) errors.push('Missing applicant name');
      if (!text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)) {
        errors.push('Missing or invalid email address');
      }
    }
    
    // Check for OCR issues
    if (text.match(/[^\x00-\x7F]/g)) {
      errors.push('Possible character encoding issues detected');
    }
    
    return errors;
  }

  // Placeholder implementations for complex methods
  private async handleStatusInquiry(message: string, context: ConversationContext): Promise<string> {
    return 'Let me check your application status. Please provide your application ID or student ID.';
  }

  private async handleApplicationHelp(message: string, context: ConversationContext): Promise<string> {
    return 'I can help you with the pass application process. What specific information do you need?';
  }

  private async handleTechnicalSupport(message: string, context: ConversationContext): Promise<string> {
    return 'I understand you\'re having technical difficulties. Can you describe the specific issue you\'re experiencing?';
  }

  private async handlePassRenewal(message: string, context: ConversationContext): Promise<string> {
    return 'I can assist you with pass renewal. When does your current pass expire?';
  }

  private async handleComplaint(message: string, context: ConversationContext): Promise<string> {
    return 'I\'m sorry to hear about your concern. Let me escalate this to the appropriate department for resolution.';
  }

  private async storeConversation(context: ConversationContext): Promise<void> {
    try {
      await this.prisma.conversation.upsert({
        where: { id: context.conversation_id },
        update: {
          messages: JSON.stringify(context.messages),
          resolved: context.resolved,
          satisfaction_score: context.satisfaction_score
        },
        create: {
          id: context.conversation_id,
          user_id: context.user_id,
          session_start: context.session_start,
          messages: JSON.stringify(context.messages),
          resolved: context.resolved
        }
      });
    } catch (error) {
      logger.error('Failed to store conversation:', error);
    }
  }

  private async findSimilarTickets(text: string): Promise<string[]> {
    // Implement similarity search
    return [];
  }

  private async generateAutoResponses(text: string, priority: string): Promise<string[]> {
    // Generate automatic responses based on ticket content
    return ['Thank you for contacting support. We are reviewing your request.'];
  }

  private identifyRequiredInfo(text: string): string[] {
    const required: string[] = [];
    
    if (!text.match(/\b\d{6,10}\b/)) required.push('Student ID');
    if (!text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)) required.push('Email address');
    
    return required;
  }
}

export const nlpService = new NaturalLanguageProcessingService();