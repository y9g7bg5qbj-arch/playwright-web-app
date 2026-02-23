/**
 * Data Storage Settings Routes
 *
 * Manage per-application database configuration for test data.
 * Supports MongoDB (default), PostgreSQL, MySQL.
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { testConnection, clearAdapterCache, SUPPORTED_PROVIDERS } from '../services/data-adapters';
import { applicationRepository, dataStorageConfigRepository } from '../db/repositories/mongo';
import { logger } from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/data-storage/providers
 * Get list of supported database providers
 */
router.get('/providers', async (_req: Request, res: Response) => {
  try {
    res.json({ providers: SUPPORTED_PROVIDERS });
  } catch (error: any) {
    logger.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

/**
 * GET /api/data-storage/:applicationId
 * Get data storage configuration for an application
 */
router.get('/:applicationId', requirePermission('manage:projects'), async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;

    // Verify user has access to this application
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;

    const application = await applicationRepository.findByIdAndUserId(applicationId, userId);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    let config = await dataStorageConfigRepository.findByApplicationId(applicationId);

    // Return default config if none exists
    if (!config) {
      return res.json({
        applicationId,
        provider: 'mongodb',
        isActive: true,
        isDefault: true,
      });
    }

    // Mask sensitive data
    const maskedConfig = {
      ...config,
      password: config.password ? '********' : null,
      connectionString: config.connectionString
        ? maskConnectionString(config.connectionString)
        : null,
      hasPassword: !!config.password,
      hasConnectionString: !!config.connectionString,
    };

    res.json(maskedConfig);
  } catch (error: any) {
    logger.error('Error fetching data storage config:', error);
    res.status(500).json({ error: 'Failed to fetch data storage configuration' });
  }
});

/**
 * PUT /api/data-storage/:applicationId
 * Update data storage configuration for an application
 */
router.put('/:applicationId', requirePermission('manage:projects'), async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;

    // Verify user has access to this application
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;

    const application = await applicationRepository.findByIdAndUserId(applicationId, userId);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const {
      provider,
      connectionString,
      host,
      port,
      database,
      username,
      password,
      useSSL,
      options,
      isActive,
    } = req.body;

    // Build update data
    const updateData: any = {};

    if (provider !== undefined) updateData.provider = provider;
    if (host !== undefined) updateData.host = host;
    if (port !== undefined) updateData.port = port;
    if (database !== undefined) updateData.database = database;
    if (username !== undefined) updateData.username = username;
    if (useSSL !== undefined) updateData.useSSL = useSSL;
    if (options !== undefined) {
      updateData.options = typeof options === 'string' ? options : JSON.stringify(options);
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    // Only update sensitive fields if not masked
    if (password && password !== '********') {
      updateData.password = password;
    }
    if (connectionString && !connectionString.includes('********')) {
      updateData.connectionString = connectionString;
    }

    const config = await dataStorageConfigRepository.upsert(
      applicationId,
      updateData,
      { provider: provider || 'mongodb', ...updateData }
    );

    // Clear cached adapter so next request uses new config
    await clearAdapterCache(applicationId);

    // Mask sensitive data in response
    const maskedConfig = {
      ...config,
      password: config.password ? '********' : null,
      connectionString: config.connectionString
        ? maskConnectionString(config.connectionString)
        : null,
      hasPassword: !!config.password,
      hasConnectionString: !!config.connectionString,
    };

    res.json(maskedConfig);
  } catch (error: any) {
    logger.error('Error updating data storage config:', error);
    res.status(500).json({ error: 'Failed to update data storage configuration' });
  }
});

/**
 * POST /api/data-storage/:applicationId/test
 * Test database connection
 */
router.post('/:applicationId/test', requirePermission('manage:projects'), async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;

    // Verify user has access to this application
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;

    const application = await applicationRepository.findByIdAndUserId(applicationId, userId);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Get existing config or use request body for testing new config
    const {
      provider,
      connectionString,
      host,
      port,
      database,
      username,
      password,
      useSSL,
      options,
    } = req.body;

    // If no config provided, load from database
    let testConfig: any;

    if (provider) {
      testConfig = {
        provider,
        connectionString,
        host,
        port,
        database,
        username,
        password,
        useSSL,
        options,
      };
    } else {
      const existingConfig = await dataStorageConfigRepository.findByApplicationId(applicationId);

      if (!existingConfig) {
        // Test MongoDB (default)
        testConfig = { provider: 'mongodb' };
      } else {
        testConfig = existingConfig;
      }
    }

    // Test the connection
    const result = await testConnection(testConfig);

    // Update last tested info
    if (testConfig.provider) {
      await dataStorageConfigRepository.update(applicationId, {
        lastTestedAt: new Date(),
        lastError: result.success ? undefined : result.error,
      }).catch(() => {
        // Ignore if config doesn't exist yet
      });
    }

    res.json({
      success: result.success,
      error: result.error,
      latency: result.latency,
      serverInfo: result.serverInfo,
      provider: testConfig.provider,
    });
  } catch (error: any) {
    logger.error('Error testing connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

/**
 * DELETE /api/data-storage/:applicationId
 * Reset to default MongoDB storage
 */
router.delete('/:applicationId', requirePermission('manage:projects'), async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;

    // Verify user has access to this application
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;

    const application = await applicationRepository.findByIdAndUserId(applicationId, userId);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Delete the config (reverts to MongoDB default)
    await dataStorageConfigRepository.delete(applicationId).catch(() => {
      // Ignore if config doesn't exist
    });

    // Clear cached adapter
    await clearAdapterCache(applicationId);

    res.json({
      success: true,
      message: 'Data storage configuration reset to default (MongoDB)',
    });
  } catch (error: any) {
    logger.error('Error resetting data storage config:', error);
    res.status(500).json({ error: 'Failed to reset data storage configuration' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Mask sensitive parts of a connection string.
 */
function maskConnectionString(connectionString: string): string {
  try {
    // Mask password in mongodb:// or postgresql:// URLs
    return connectionString.replace(
      /(:\/\/[^:]+:)([^@]+)(@)/,
      '$1********$3'
    );
  } catch {
    return '********';
  }
}

export default router;
