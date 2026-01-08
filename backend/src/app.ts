import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Routes
import { authRoutes } from './routes/auth.routes';
import { workflowRoutes } from './routes/workflow.routes';
import { testFlowRoutes } from './routes/testFlow.routes';
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
import testDataRoutes from './routes/test-data.routes';
import parallelRoutes from './routes/parallel.routes';
import { executionEngineRoutes } from './routes/executionEngine.routes';
import proxyRoutes from './routes/proxy.routes';
import previewRoutes from './routes/preview.routes';
import applicationRoutes from './routes/application.routes';
import { runConfigurationRoutes } from './routes/runConfiguration.routes';
import { githubRoutes } from './routes/github.routes';
import copilotRoutes from './routes/copilot.routes';
import aiSettingsRoutes from './routes/ai-settings.routes';


export function createApp() {
  const app = express();

  // Middleware - Allow CORS from frontend and trace.playwright.dev
  const allowedOrigins = [
    config.cors.origin,
    'https://trace.playwright.dev',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
  ];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
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
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      query: req.query,
      ip: req.ip,
    });
    next();
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Static file serving for Allure reports
  const path = require('path');
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
  app.use('/api/workflows', workflowRoutes);
  app.use('/api/test-flows', testFlowRoutes);
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
  app.use('/api/test-data', testDataRoutes);
  app.use('/api/execution/parallel', parallelRoutes);
  app.use('/api/workers', parallelRoutes);
  app.use('/api/execution/engine', executionEngineRoutes);
  app.use('/api/proxy', proxyRoutes);
  app.use('/api/preview', previewRoutes);
  app.use('/api/applications', applicationRoutes);
  // Keep /api/projects as alias for backwards compatibility (redirects to applications)
  app.use('/api/projects', applicationRoutes);
  app.use('/api', runConfigurationRoutes);
  app.use('/api/github', githubRoutes);
  app.use('/api/copilot', copilotRoutes);
  app.use('/api/ai-settings', aiSettingsRoutes);

  // Error handlers (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
