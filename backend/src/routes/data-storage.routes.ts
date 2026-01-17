/**
 * Data Storage Settings Routes
 *
 * Manage per-application database configuration for test data.
 * Allows users to configure MongoDB, PostgreSQL, MySQL instead of default SQLite.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { testConnection, clearAdapterCache, SUPPORTED_PROVIDERS } from '../services/data-adapters';

const router = Router();
const prisma = new PrismaClient();

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
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

/**
 * GET /api/data-storage/:applicationId
 * Get data storage configuration for an application
 */
router.get('/:applicationId', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;

    // Verify user has access to this application
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;

    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
      },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    let config = await prisma.dataStorageConfig.findUnique({
      where: { applicationId },
    });

    // Return default config if none exists
    if (!config) {
      return res.json({
        applicationId,
        provider: 'sqlite',
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
    console.error('Error fetching data storage config:', error);
    res.status(500).json({ error: 'Failed to fetch data storage configuration' });
  }
});

/**
 * PUT /api/data-storage/:applicationId
 * Update data storage configuration for an application
 */
router.put('/:applicationId', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;

    // Verify user has access to this application
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;

    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
      },
    });

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

    const config = await prisma.dataStorageConfig.upsert({
      where: { applicationId },
      update: updateData,
      create: {
        applicationId,
        provider: provider || 'sqlite',
        ...updateData,
      },
    });

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
    console.error('Error updating data storage config:', error);
    res.status(500).json({ error: 'Failed to update data storage configuration' });
  }
});

/**
 * POST /api/data-storage/:applicationId/test
 * Test database connection
 */
router.post('/:applicationId/test', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;

    // Verify user has access to this application
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;

    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
      },
    });

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
      const existingConfig = await prisma.dataStorageConfig.findUnique({
        where: { applicationId },
      });

      if (!existingConfig) {
        // Test SQLite (default)
        testConfig = { provider: 'sqlite' };
      } else {
        testConfig = existingConfig;
      }
    }

    // Test the connection
    const result = await testConnection(testConfig);

    // Update last tested info
    if (testConfig.provider !== 'sqlite') {
      await prisma.dataStorageConfig.update({
        where: { applicationId },
        data: {
          lastTestedAt: new Date(),
          lastError: result.success ? null : result.error,
        },
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
    console.error('Error testing connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

/**
 * DELETE /api/data-storage/:applicationId
 * Reset to default SQLite storage
 */
router.delete('/:applicationId', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;

    // Verify user has access to this application
    const authReq = req as AuthRequest;
    const userId = authReq.userId!;

    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
      },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Delete the config (reverts to SQLite default)
    await prisma.dataStorageConfig.delete({
      where: { applicationId },
    }).catch(() => {
      // Ignore if config doesn't exist
    });

    // Clear cached adapter
    await clearAdapterCache(applicationId);

    res.json({
      success: true,
      message: 'Data storage configuration reset to default (SQLite)',
    });
  } catch (error: any) {
    console.error('Error resetting data storage config:', error);
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
