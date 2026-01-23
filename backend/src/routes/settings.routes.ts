/**
 * Settings API Routes
 *
 * Endpoints for managing application settings including database configuration.
 */

import { Router, Response, NextFunction } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import settingsService, {
  getDatabaseConfig,
  updateDatabaseConfig,
  testDatabaseConnection,
  getAllSettings,
  getSetting,
  setSetting,
  getSettingsByCategory
} from '../services/settings.service';
import {
  exportData,
  importData,
  copyToDatabase,
  validateExportData,
  getMigrationInfo
} from '../services/dataMigration.service';

const router = Router();

// ============= DATABASE CONFIGURATION =============

/**
 * GET /api/settings/database
 * Get current database configuration
 */
router.get('/database', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const config = await getDatabaseConfig();

    // Mask the password in the URI for security
    let maskedUri = config.uri;
    if (maskedUri) {
      // Mask password in connection string
      maskedUri = maskedUri.replace(/:([^:@]+)@/, ':****@');
    }

    res.json({
      success: true,
      data: {
        ...config,
        uri: maskedUri,
        // Include full URI only if specifically requested (for forms)
        fullUri: undefined
      }
    });
  } catch (error) {
    console.error('[Settings] Failed to get database config:', error);
    res.status(500).json({ success: false, error: 'Failed to get database configuration' });
  }
});

/**
 * PUT /api/settings/database
 * Update database configuration
 */
router.put('/database', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { uri, database } = req.body;

    if (!uri || !database) {
      return res.status(400).json({
        success: false,
        error: 'URI and database name are required'
      });
    }

    await updateDatabaseConfig({
      uri,
      database,
      provider: 'mongodb'
    });

    res.json({
      success: true,
      message: 'Database configuration updated'
    });
  } catch (error) {
    console.error('[Settings] Failed to update database config:', error);
    res.status(500).json({ success: false, error: 'Failed to update database configuration' });
  }
});

/**
 * POST /api/settings/database/test
 * Test database connection
 */
router.post('/database/test', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { uri, database } = req.body;

    if (!uri || !database) {
      return res.status(400).json({
        success: false,
        error: 'URI and database name are required'
      });
    }

    const result = await testDatabaseConnection(uri, database);

    res.json({
      success: result.success,
      message: result.success ? 'Connection successful' : 'Connection failed',
      error: result.error
    });
  } catch (error) {
    console.error('[Settings] Failed to test database connection:', error);
    res.status(500).json({ success: false, error: 'Failed to test database connection' });
  }
});

// ============= GENERAL SETTINGS =============

/**
 * GET /api/settings
 * Get all settings
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const category = req.query.category as string | undefined;

    let settings;
    if (category) {
      settings = await getSettingsByCategory(category as any);
    } else {
      settings = await getAllSettings();
    }

    // Mask sensitive values
    const safeSettings = settings.map(s => {
      if (s.key === 'database.config' && s.value?.uri) {
        return {
          ...s,
          value: {
            ...s.value,
            uri: s.value.uri.replace(/:([^:@]+)@/, ':****@')
          }
        };
      }
      return s;
    });

    res.json({
      success: true,
      data: safeSettings
    });
  } catch (error) {
    console.error('[Settings] Failed to get settings:', error);
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

/**
 * GET /api/settings/:key
 * Get a specific setting
 */
router.get('/:key', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const value = await getSetting(key);

    if (value === null) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found'
      });
    }

    res.json({
      success: true,
      data: { key, value }
    });
  } catch (error) {
    console.error('[Settings] Failed to get setting:', error);
    res.status(500).json({ success: false, error: 'Failed to get setting' });
  }
});

/**
 * PUT /api/settings/:key
 * Update a specific setting
 */
router.put('/:key', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Value is required'
      });
    }

    await setSetting(key, value, description);

    res.json({
      success: true,
      message: 'Setting updated'
    });
  } catch (error) {
    console.error('[Settings] Failed to update setting:', error);
    res.status(500).json({ success: false, error: 'Failed to update setting' });
  }
});

// ============= DATA MIGRATION =============

/**
 * GET /api/settings/migration/info
 * Get migration info for current database
 */
router.get('/migration/info', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const info = await getMigrationInfo();
    res.json({ success: true, data: info });
  } catch (error) {
    console.error('[Migration] Failed to get migration info:', error);
    res.status(500).json({ success: false, error: 'Failed to get migration info' });
  }
});

/**
 * POST /api/settings/migration/export
 * Export all data from current database
 */
router.post('/migration/export', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('[Migration] Starting data export...');
    const data = await exportData();

    res.json({
      success: true,
      data,
      message: `Exported ${data.metadata.totalDocuments} documents from ${Object.keys(data.collections).length} collections`
    });
  } catch (error) {
    console.error('[Migration] Failed to export data:', error);
    res.status(500).json({ success: false, error: 'Failed to export data' });
  }
});

/**
 * POST /api/settings/migration/import
 * Import data into a target database
 */
router.post('/migration/import', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { targetUri, targetDatabase, data, overwrite, merge } = req.body;

    if (!targetUri || !targetDatabase) {
      return res.status(400).json({
        success: false,
        error: 'Target URI and database are required'
      });
    }

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Export data is required'
      });
    }

    // Validate export data format
    const validation = validateExportData(data);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export data format',
        details: validation.errors
      });
    }

    console.log('[Migration] Starting data import...');
    const result = await importData(targetUri, targetDatabase, data, { overwrite, merge });

    res.json({
      success: result.success,
      data: result,
      message: result.success
        ? `Imported data to ${targetDatabase}`
        : 'Import completed with errors'
    });
  } catch (error) {
    console.error('[Migration] Failed to import data:', error);
    res.status(500).json({ success: false, error: 'Failed to import data' });
  }
});

/**
 * POST /api/settings/migration/copy
 * Copy all data from current database to target database
 */
router.post('/migration/copy', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { targetUri, targetDatabase, overwrite, merge } = req.body;

    if (!targetUri || !targetDatabase) {
      return res.status(400).json({
        success: false,
        error: 'Target URI and database are required'
      });
    }

    console.log('[Migration] Starting database copy...');
    const result = await copyToDatabase(targetUri, targetDatabase, { overwrite, merge });

    res.json({
      success: result.success,
      data: result,
      message: result.success
        ? `Copied data to ${targetDatabase}`
        : 'Copy completed with errors'
    });
  } catch (error) {
    console.error('[Migration] Failed to copy database:', error);
    res.status(500).json({ success: false, error: 'Failed to copy database' });
  }
});

export default router;
