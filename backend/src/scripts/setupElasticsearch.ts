#!/usr/bin/env ts-node
import 'dotenv/config';
import { getSearchService } from '../services/search.service';
import { connectDB } from '../config/database';
import { logger } from '../utils/logger';

async function setupElasticsearch() {
  try {
    logger.info('🔍 Setting up Elasticsearch...');

    // Connect to database first
    await connectDB();
    logger.info('✅ Database connected');

    // Initialize search service
    const searchService = getSearchService();
    
    // Check Elasticsearch health
    const health = await searchService.healthCheck();
    logger.info(`📊 Elasticsearch health: ${health.status}`);
    
    if (health.status === 'error' || health.status === 'disconnected') {
      throw new Error('Elasticsearch is not available');
    }

    // Get index stats
    const stats = await searchService.getIndexStats();
    if (stats) {
      logger.info('📈 Current index stats:', {
        docs: stats.primaries?.docs?.count || 0,
        size: stats.primaries?.store?.size_in_bytes || 0
      });
    }

    // Optionally reindex all data
    const reindexAll = process.argv.includes('--reindex');
    if (reindexAll) {
      logger.info('🔄 Starting full reindex...');
      const result = await searchService.reindexAll();
      logger.info(`✅ Reindex completed: ${result.indexed}/${result.total} documents indexed`);
    }

    logger.info('🎉 Elasticsearch setup completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Elasticsearch setup failed:', error);
    process.exit(1);
  }
}

setupElasticsearch();