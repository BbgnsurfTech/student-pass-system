import { Client } from '@elastic/elasticsearch';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { getCacheService } from './cache.service';

interface SearchResult {
  id: string;
  type: string;
  score: number;
  highlight?: Record<string, string[]>;
  data: any;
}

interface SearchQuery {
  query: string;
  filters?: Record<string, any>;
  sort?: Array<{ field: string; order: 'asc' | 'desc' }>;
  size?: number;
  from?: number;
  includeTypes?: string[];
  excludeTypes?: string[];
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  took: number;
  aggregations?: Record<string, any>;
  suggestions?: Array<{ text: string; score: number }>;
}

interface IndexableDocument {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  institutionId?: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SearchService {
  private client: Client;
  private indexName: string;
  private cacheService = getCacheService();
  private isConnected = false;

  constructor() {
    this.indexName = process.env.ELASTICSEARCH_INDEX || 'student-pass-system';
    
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD 
        ? {
            username: process.env.ELASTICSEARCH_USERNAME,
            password: process.env.ELASTICSEARCH_PASSWORD
          }
        : undefined,
      requestTimeout: 30000,
      sniffOnStart: true,
      sniffInterval: 300000,
      maxRetries: 3
    });

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Test connection
      await this.client.ping();
      this.isConnected = true;
      logger.info('Elasticsearch client connected');

      // Check if index exists, create if not
      const indexExists = await this.client.indices.exists({
        index: this.indexName
      });

      if (!indexExists.body) {
        await this.createIndex();
      }

      // Setup index mappings and settings
      await this.updateMappings();

    } catch (error) {
      logger.error('Failed to initialize Elasticsearch:', error);
      this.isConnected = false;
    }
  }

  private async createIndex(): Promise<void> {
    try {
      await this.client.indices.create({
        index: this.indexName,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                standard_analyzer: {
                  type: 'standard',
                  stopwords: '_english_'
                },
                autocomplete_analyzer: {
                  tokenizer: 'autocomplete_tokenizer',
                  filter: ['lowercase']
                },
                search_analyzer: {
                  tokenizer: 'keyword',
                  filter: ['lowercase']
                }
              },
              tokenizer: {
                autocomplete_tokenizer: {
                  type: 'edge_ngram',
                  min_gram: 2,
                  max_gram: 20,
                  token_chars: ['letter', 'digit']
                }
              }
            }
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              type: { type: 'keyword' },
              title: {
                type: 'text',
                analyzer: 'standard_analyzer',
                fields: {
                  keyword: { type: 'keyword' },
                  autocomplete: {
                    type: 'text',
                    analyzer: 'autocomplete_analyzer',
                    search_analyzer: 'search_analyzer'
                  }
                }
              },
              content: {
                type: 'text',
                analyzer: 'standard_analyzer'
              },
              institutionId: { type: 'keyword' },
              userId: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              metadata: {
                type: 'object',
                dynamic: true
              }
            }
          }
        }
      });

      logger.info(`Elasticsearch index '${this.indexName}' created`);
    } catch (error) {
      logger.error('Failed to create Elasticsearch index:', error);
      throw error;
    }
  }

  private async updateMappings(): Promise<void> {
    try {
      // Add field mappings for different document types
      const mappings = {
        properties: {
          // User fields
          email: { type: 'keyword' },
          name: {
            type: 'text',
            analyzer: 'standard_analyzer',
            fields: {
              keyword: { type: 'keyword' },
              autocomplete: {
                type: 'text',
                analyzer: 'autocomplete_analyzer',
                search_analyzer: 'search_analyzer'
              }
            }
          },
          phone: { type: 'keyword' },
          role: { type: 'keyword' },

          // Student fields
          studentId: { type: 'keyword' },
          department: { type: 'keyword' },
          course: { type: 'text' },
          year: { type: 'integer' },

          // Application fields
          applicationNumber: { type: 'keyword' },
          status: { type: 'keyword' },
          applicationDate: { type: 'date' },

          // Pass fields
          passId: { type: 'keyword' },
          validFrom: { type: 'date' },
          validUntil: { type: 'date' },
          qrCode: { type: 'keyword', index: false },

          // Institution fields
          institutionName: {
            type: 'text',
            analyzer: 'standard_analyzer',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          address: { type: 'text' },
          city: { type: 'keyword' },
          state: { type: 'keyword' },
          country: { type: 'keyword' }
        }
      };

      await this.client.indices.putMapping({
        index: this.indexName,
        body: mappings
      });

      logger.debug('Elasticsearch mappings updated');
    } catch (error) {
      logger.error('Failed to update Elasticsearch mappings:', error);
    }
  }

  public async indexDocument(document: IndexableDocument): Promise<boolean> {
    if (!this.isConnected) {
      logger.warn('Elasticsearch not connected, skipping document indexing');
      return false;
    }

    try {
      await this.client.index({
        index: this.indexName,
        id: `${document.type}_${document.id}`,
        body: document,
        refresh: 'wait_for'
      });

      logger.debug(`Document indexed: ${document.type}_${document.id}`);
      return true;
    } catch (error) {
      logger.error('Failed to index document:', error);
      return false;
    }
  }

  public async bulkIndex(documents: IndexableDocument[]): Promise<number> {
    if (!this.isConnected || documents.length === 0) {
      return 0;
    }

    try {
      const body: any[] = [];

      documents.forEach(doc => {
        body.push({
          index: {
            _index: this.indexName,
            _id: `${doc.type}_${doc.id}`
          }
        });
        body.push(doc);
      });

      const response = await this.client.bulk({
        body,
        refresh: 'wait_for'
      });

      let successCount = 0;
      let errorCount = 0;

      if (response.body.items) {
        response.body.items.forEach((item: any) => {
          if (item.index && item.index.error) {
            errorCount++;
            logger.error('Bulk index error:', item.index.error);
          } else {
            successCount++;
          }
        });
      }

      logger.info(`Bulk indexed ${successCount} documents, ${errorCount} errors`);
      return successCount;
    } catch (error) {
      logger.error('Failed to bulk index documents:', error);
      return 0;
    }
  }

  public async search(searchQuery: SearchQuery): Promise<SearchResponse> {
    if (!this.isConnected) {
      return { results: [], total: 0, took: 0 };
    }

    try {
      // Check cache first
      const cacheKey = `search:${JSON.stringify(searchQuery)}`;
      const cachedResult = await this.cacheService.get<SearchResponse>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      const { query, filters, sort, size = 20, from = 0, includeTypes, excludeTypes } = searchQuery;

      // Build Elasticsearch query
      const esQuery: any = {
        bool: {
          must: [],
          filter: [],
          must_not: []
        }
      };

      // Main search query
      if (query && query.trim()) {
        esQuery.bool.must.push({
          multi_match: {
            query: query.trim(),
            fields: [
              'title^3',
              'title.autocomplete^2',
              'content^1',
              'name^3',
              'name.autocomplete^2',
              'email^2',
              'studentId^2',
              'applicationNumber^2',
              'passId^2'
            ],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      } else {
        esQuery.bool.must.push({ match_all: {} });
      }

      // Type filters
      if (includeTypes && includeTypes.length > 0) {
        esQuery.bool.filter.push({
          terms: { type: includeTypes }
        });
      }

      if (excludeTypes && excludeTypes.length > 0) {
        esQuery.bool.must_not.push({
          terms: { type: excludeTypes }
        });
      }

      // Additional filters
      if (filters) {
        Object.entries(filters).forEach(([field, value]) => {
          if (Array.isArray(value)) {
            esQuery.bool.filter.push({
              terms: { [field]: value }
            });
          } else if (typeof value === 'object' && value !== null) {
            // Range queries
            if (value.gte || value.lte || value.gt || value.lt) {
              esQuery.bool.filter.push({
                range: { [field]: value }
              });
            }
          } else {
            esQuery.bool.filter.push({
              term: { [field]: value }
            });
          }
        });
      }

      // Build sort criteria
      const sortCriteria: any[] = [];
      if (sort && sort.length > 0) {
        sort.forEach(({ field, order }) => {
          sortCriteria.push({ [field]: { order } });
        });
      } else if (query && query.trim()) {
        sortCriteria.push('_score');
      } else {
        sortCriteria.push({ createdAt: { order: 'desc' } });
      }

      const searchBody: any = {
        query: esQuery,
        sort: sortCriteria,
        size,
        from,
        highlight: {
          fields: {
            title: {},
            content: {},
            name: {},
            email: {}
          },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>']
        },
        _source: true
      };

      // Add aggregations for faceted search
      searchBody.aggs = {
        types: {
          terms: { field: 'type', size: 10 }
        },
        institutions: {
          terms: { field: 'institutionId', size: 20 }
        },
        status: {
          terms: { field: 'status', size: 10 }
        }
      };

      const response = await this.client.search({
        index: this.indexName,
        body: searchBody
      });

      const results: SearchResult[] = response.body.hits.hits.map((hit: any) => ({
        id: hit._source.id,
        type: hit._source.type,
        score: hit._score,
        highlight: hit.highlight,
        data: hit._source
      }));

      const searchResponse: SearchResponse = {
        results,
        total: response.body.hits.total.value,
        took: response.body.took,
        aggregations: response.body.aggregations
      };

      // Cache results for 5 minutes
      await this.cacheService.set(cacheKey, searchResponse, { ttl: 300 });

      return searchResponse;
    } catch (error) {
      logger.error('Search query failed:', error);
      return { results: [], total: 0, took: 0 };
    }
  }

  public async suggest(query: string, size = 5): Promise<string[]> {
    if (!this.isConnected || !query.trim()) {
      return [];
    }

    try {
      const cacheKey = `suggest:${query}:${size}`;
      const cachedResult = await this.cacheService.get<string[]>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      const response = await this.client.search({
        index: this.indexName,
        body: {
          suggest: {
            title_suggest: {
              text: query,
              completion: {
                field: 'title.autocomplete',
                size,
                skip_duplicates: true
              }
            },
            name_suggest: {
              text: query,
              completion: {
                field: 'name.autocomplete',
                size,
                skip_duplicates: true
              }
            }
          },
          _source: false
        }
      });

      const suggestions: string[] = [];
      
      if (response.body.suggest?.title_suggest?.[0]?.options) {
        response.body.suggest.title_suggest[0].options.forEach((option: any) => {
          if (!suggestions.includes(option._source?.title)) {
            suggestions.push(option._source?.title);
          }
        });
      }

      if (response.body.suggest?.name_suggest?.[0]?.options) {
        response.body.suggest.name_suggest[0].options.forEach((option: any) => {
          if (!suggestions.includes(option._source?.name)) {
            suggestions.push(option._source?.name);
          }
        });
      }

      const uniqueSuggestions = [...new Set(suggestions)].slice(0, size);
      
      // Cache suggestions for 10 minutes
      await this.cacheService.set(cacheKey, uniqueSuggestions, { ttl: 600 });

      return uniqueSuggestions;
    } catch (error) {
      logger.error('Suggestion query failed:', error);
      return [];
    }
  }

  // Index specific entity types
  public async indexUser(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          institution: true,
          student: true
        }
      });

      if (!user) {
        return false;
      }

      const document: IndexableDocument = {
        id: user.id,
        type: 'user',
        title: user.name,
        content: `${user.name} ${user.email} ${user.phone || ''} ${user.student?.studentId || ''}`,
        metadata: {
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          studentId: user.student?.studentId,
          department: user.student?.department,
          course: user.student?.course,
          year: user.student?.year,
          institutionName: user.institution?.name
        },
        institutionId: user.institutionId,
        userId: user.id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      return await this.indexDocument(document);
    } catch (error) {
      logger.error(`Failed to index user ${userId}:`, error);
      return false;
    }
  }

  public async indexApplication(applicationId: string): Promise<boolean> {
    try {
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          student: {
            include: { user: true }
          },
          institution: true
        }
      });

      if (!application) {
        return false;
      }

      const document: IndexableDocument = {
        id: application.id,
        type: 'application',
        title: `Application by ${application.student.user.name}`,
        content: `Application ${application.applicationNumber || application.id} by ${application.student.user.name} ${application.student.user.email}`,
        metadata: {
          applicationNumber: application.applicationNumber,
          status: application.status,
          applicationDate: application.createdAt,
          studentName: application.student.user.name,
          studentEmail: application.student.user.email,
          studentId: application.student.studentId,
          institutionName: application.institution.name
        },
        institutionId: application.institutionId,
        userId: application.student.userId,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt
      };

      return await this.indexDocument(document);
    } catch (error) {
      logger.error(`Failed to index application ${applicationId}:`, error);
      return false;
    }
  }

  public async indexPass(passId: string): Promise<boolean> {
    try {
      const pass = await prisma.pass.findUnique({
        where: { id: passId },
        include: {
          student: {
            include: { user: true }
          },
          institution: true
        }
      });

      if (!pass) {
        return false;
      }

      const document: IndexableDocument = {
        id: pass.id,
        type: 'pass',
        title: `Pass for ${pass.student.user.name}`,
        content: `Student pass ${pass.id} for ${pass.student.user.name} ${pass.student.user.email}`,
        metadata: {
          passId: pass.id,
          status: pass.status,
          validFrom: pass.validFrom,
          validUntil: pass.validUntil,
          studentName: pass.student.user.name,
          studentEmail: pass.student.user.email,
          studentId: pass.student.studentId,
          institutionName: pass.institution.name
        },
        institutionId: pass.institutionId,
        userId: pass.student.userId,
        createdAt: pass.createdAt,
        updatedAt: pass.updatedAt
      };

      return await this.indexDocument(document);
    } catch (error) {
      logger.error(`Failed to index pass ${passId}:`, error);
      return false;
    }
  }

  public async deleteDocument(type: string, id: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.delete({
        index: this.indexName,
        id: `${type}_${id}`,
        refresh: 'wait_for'
      });

      logger.debug(`Document deleted: ${type}_${id}`);
      return true;
    } catch (error) {
      if (error.statusCode !== 404) {
        logger.error('Failed to delete document:', error);
      }
      return false;
    }
  }

  public async reindexAll(institutionId?: string): Promise<{ total: number; indexed: number }> {
    if (!this.isConnected) {
      return { total: 0, indexed: 0 };
    }

    try {
      logger.info('Starting full reindex...');

      const whereClause = institutionId ? { institutionId } : {};
      let totalIndexed = 0;

      // Index users
      const users = await prisma.user.findMany({
        where: whereClause,
        include: {
          institution: true,
          student: true
        }
      });

      const userDocs: IndexableDocument[] = users.map(user => ({
        id: user.id,
        type: 'user',
        title: user.name,
        content: `${user.name} ${user.email} ${user.phone || ''} ${user.student?.studentId || ''}`,
        metadata: {
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          studentId: user.student?.studentId,
          department: user.student?.department,
          course: user.student?.course,
          year: user.student?.year,
          institutionName: user.institution?.name
        },
        institutionId: user.institutionId,
        userId: user.id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      totalIndexed += await this.bulkIndex(userDocs);

      // Index applications
      const applications = await prisma.application.findMany({
        where: whereClause,
        include: {
          student: { include: { user: true } },
          institution: true
        }
      });

      const applicationDocs: IndexableDocument[] = applications.map(application => ({
        id: application.id,
        type: 'application',
        title: `Application by ${application.student.user.name}`,
        content: `Application ${application.applicationNumber || application.id} by ${application.student.user.name}`,
        metadata: {
          applicationNumber: application.applicationNumber,
          status: application.status,
          applicationDate: application.createdAt,
          studentName: application.student.user.name,
          studentEmail: application.student.user.email,
          studentId: application.student.studentId,
          institutionName: application.institution.name
        },
        institutionId: application.institutionId,
        userId: application.student.userId,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt
      }));

      totalIndexed += await this.bulkIndex(applicationDocs);

      // Index passes
      const passes = await prisma.pass.findMany({
        where: whereClause,
        include: {
          student: { include: { user: true } },
          institution: true
        }
      });

      const passDocs: IndexableDocument[] = passes.map(pass => ({
        id: pass.id,
        type: 'pass',
        title: `Pass for ${pass.student.user.name}`,
        content: `Student pass ${pass.id} for ${pass.student.user.name}`,
        metadata: {
          passId: pass.id,
          status: pass.status,
          validFrom: pass.validFrom,
          validUntil: pass.validUntil,
          studentName: pass.student.user.name,
          studentEmail: pass.student.user.email,
          studentId: pass.student.studentId,
          institutionName: pass.institution.name
        },
        institutionId: pass.institutionId,
        userId: pass.student.userId,
        createdAt: pass.createdAt,
        updatedAt: pass.updatedAt
      }));

      totalIndexed += await this.bulkIndex(passDocs);

      const totalDocuments = users.length + applications.length + passes.length;
      logger.info(`Reindex completed: ${totalIndexed}/${totalDocuments} documents indexed`);

      return { total: totalDocuments, indexed: totalIndexed };
    } catch (error) {
      logger.error('Reindex failed:', error);
      return { total: 0, indexed: 0 };
    }
  }

  public async getIndexStats(): Promise<any> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const response = await this.client.indices.stats({
        index: this.indexName
      });

      return response.body.indices[this.indexName];
    } catch (error) {
      logger.error('Failed to get index stats:', error);
      return null;
    }
  }

  public async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected' };
      }

      const health = await this.client.cluster.health();
      const indexExists = await this.client.indices.exists({
        index: this.indexName
      });

      return {
        status: health.body.status,
        details: {
          cluster: health.body,
          indexExists: indexExists.body
        }
      };
    } catch (error) {
      logger.error('Elasticsearch health check failed:', error);
      return { status: 'error', details: error.message };
    }
  }

  public async close(): Promise<void> {
    await this.client.close();
    this.isConnected = false;
    logger.info('Elasticsearch client disconnected');
  }
}

let searchService: SearchService | null = null;

export const getSearchService = (): SearchService => {
  if (!searchService) {
    searchService = new SearchService();
  }
  return searchService;
};