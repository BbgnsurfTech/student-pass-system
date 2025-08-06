#!/usr/bin/env ts-node
import 'dotenv/config';
import { getCacheService } from '../services/cache.service';
import { logger } from '../utils/logger';

async function clearCache() {
  try {
    logger.info('🧹 Clearing cache...');

    const cacheService = getCacheService();
    
    // Get cache stats before clearing
    const statsBefore = cacheService.getStats();
    logger.info('📊 Cache stats before clearing:', statsBefore);

    // Clear all cache
    const pattern = process.argv[2]; // Optional pattern argument
    if (pattern) {
      const deletedKeys = await cacheService.invalidatePattern(pattern);
      logger.info(`✅ Cleared ${deletedKeys} cache keys matching pattern: ${pattern}`);
    } else {
      const success = await cacheService.flushAll();
      if (success) {
        logger.info('✅ All cache cleared successfully');
      } else {
        throw new Error('Failed to clear cache');
      }
    }

    // Reset stats
    cacheService.resetStats();
    logger.info('📊 Cache stats reset');

    logger.info('🎉 Cache clearing completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Cache clearing failed:', error);
    process.exit(1);
  }
}

clearCache();