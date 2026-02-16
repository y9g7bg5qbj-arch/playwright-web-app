import path from 'path';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Routes
import { authRoutes } from './routes/auth.routes';
import { executionRoutes } from './routes/execution.routes';
import agentRoutes from './routes/agent.routes';
import recorderRoutes from './routes/recorder.routes';
import codegenRoutes from './routes/codegen.routes';
import repositoryRoutes from './routes/repository.routes';
import variablesRoutes from './routes/variables.routes';
import veroRoutes from './routes/vero.routes';
import dataRoutes from './routes/data.routes';
import scheduleRoutes from './routes/schedule.routes';
import shardingRoutes from './routes/sharding.routes';
import testDataRoutes from './routes/test-data';
import proxyRoutes from './routes/proxy.routes';
import previewRoutes from './routes/preview.routes';
import applicationRoutes from './routes/application.routes';
import { runConfigurationRoutes } from './routes/runConfiguration.routes';
import { githubRoutes } from './routes/github.routes';
import aiSettingsRoutes from './routes/ai-settings.routes';
import sandboxRoutes from './routes/sandbox.routes';
import pullRequestRoutes from './routes/pullRequest.routes';
import dataStorageRoutes from './routes/data-storage.routes';
import testDataTablesRoutes from './routes/test-data/tables.routes';
import testDataVersionsRoutes from './routes/test-data/versions.routes';
import settingsRoutes from './routes/settings.routes';
import runParametersRoutes from './routes/runParameters.routes';

export function createApp() {
  const app = express();

  // Middleware - Allow CORS from frontend and trace.playwright.dev
  const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
  const privateNetworkOriginPattern = /^https?:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/i;
  const allowedOrigins = [
    config.cors.origin,
    'https://trace.playwright.dev',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'http://localhost:5176',
    'http://127.0.0.1:5176',
  ];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      const isExplicitlyAllowed = allowedOrigins.includes(origin);
      const isLocalhostOrigin = localhostOriginPattern.test(origin);
      const isPrivateNetworkOrigin = config.nodeEnv !== 'production' && privateNetworkOriginPattern.test(origin);

      if (isExplicitlyAllowed || isLocalhostOrigin || isPrivateNetworkOrigin) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      query: req.query,
      ip: req.ip,
    });
    next();
  });

  // Health check — verifies MongoDB connectivity
  app.get('/health', async (_req, res) => {
    try {
      const { getDb } = await import('./db/mongodb');
      const db = getDb();
      await db.command({ ping: 1 });
      res.json({
        success: true,
        data: {
          status: 'healthy',
          database: 'connected',
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          database: 'disconnected',
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  // Static file serving for Allure reports
  const allureReportsPath = path.resolve(config.storage.path, 'allure-reports');
  app.use('/allure-reports', express.static(allureReportsPath, {
    setHeaders: (res) => {
      // Allow embedding in iframes
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self' http://localhost:*");
    }
  }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/executions', executionRoutes);
  app.use('/api/agents', agentRoutes);
  app.use('/api/recorder', recorderRoutes);
  app.use('/api/flows', codegenRoutes);
  app.use('/api/codegen', codegenRoutes);
  app.use('/api/repositories', repositoryRoutes);
  app.use('/api/variables', variablesRoutes);
  app.use('/api/vero', veroRoutes);
  app.use('/api/data-tables', dataRoutes);
  app.use('/api/schedules', scheduleRoutes);
  app.use('/api/sharding', shardingRoutes);
  app.use('/api/test-data/tables', testDataTablesRoutes); // Runtime table endpoints (vero-lang)
  app.use('/api/test-data', testDataVersionsRoutes); // Runtime versions + bulk endpoints
  app.use('/api/test-data', testDataRoutes);
  app.use('/api/proxy', proxyRoutes);
  app.use('/api/preview', previewRoutes);
  app.use('/api/applications', applicationRoutes);
  // Keep /api/projects as alias for backwards compatibility (redirects to applications)
  app.use('/api/projects', applicationRoutes);
  app.use('/api', runConfigurationRoutes);
  app.use('/api/github', githubRoutes);
  app.use('/api/ai-settings', aiSettingsRoutes);
  app.use('/api/data-storage', dataStorageRoutes); // Data storage configuration
  app.use('/api/settings', settingsRoutes); // Application settings including DB config
  app.use('/api', sandboxRoutes); // Sandbox collaboration routes
  app.use('/api', pullRequestRoutes); // Pull request routes
  app.use('/api/applications', runParametersRoutes); // Run parameter definitions & sets

  // Error handlers (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
