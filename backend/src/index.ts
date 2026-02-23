import http from 'http';
import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectMongoDB, closeMongoDB } from './db/mongodb';
import { WebSocketServer } from './websocket';
import {
  initializeQueueInfrastructure,
  startQueueWorkers,
  shutdownQueueWorkers,
} from './services/queue/bootstrap';
import { migrateSandboxLayoutOnStartup } from './services/sandboxLayoutMigration.service';
import { migrateRunConfigurationsToProjectScope } from './services/runConfigurationProjectScopeMigration.service';

type ProcessRole = 'api' | 'worker' | 'all';

const PROCESS_ROLE: ProcessRole = (() => {
  const raw = (process.env.PROCESS_ROLE || 'all').toLowerCase();
  if (raw === 'api' || raw === 'worker' || raw === 'all') {
    return raw;
  }
  logger.warn(`Unknown PROCESS_ROLE "${raw}", defaulting to "all"`);
  return 'all';
})();

// Global error handlers — prevent the server from crashing silently
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Exit so PM2 (or another process manager) can restart cleanly
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Exit so PM2 can restart cleanly — staying alive risks corrupt state
  process.exit(1);
});

const shouldRunAPI = PROCESS_ROLE === 'api' || PROCESS_ROLE === 'all';
const shouldRunWorker = PROCESS_ROLE === 'worker' || PROCESS_ROLE === 'all';

async function start() {
  try {
    logger.info(`Starting process with role: ${PROCESS_ROLE}`);

    // Connect to MongoDB Atlas (primary database) — needed by all roles.
    await connectMongoDB();
    logger.info('MongoDB Atlas connected');

    try {
      await migrateSandboxLayoutOnStartup();
    } catch (error) {
      logger.error('Sandbox layout migration failed at startup; continuing without blocking server boot', error);
    }

    try {
      await migrateRunConfigurationsToProjectScope();
    } catch (error) {
      logger.error('Run configuration project-scope migration failed at startup; continuing without blocking server boot', error);
    }

    // Queue infrastructure (Redis connection, queue producers) is needed by both
    // API (to enqueue jobs) and worker (to consume them).
    await initializeQueueInfrastructure();

    // Start workers and dispatch poller only in worker/all roles.
    if (shouldRunWorker) {
      await startQueueWorkers();
    }

    let httpServer: http.Server | undefined;

    // Start HTTP/WebSocket server only in api/all roles.
    if (shouldRunAPI) {
      const app = createApp();
      httpServer = http.createServer(app);

      const wsServer = new WebSocketServer(httpServer);
      logger.info('WebSocket server initialized');
      app.set('io', wsServer.getIO());

      httpServer.listen(config.port, '0.0.0.0', () => {
        logger.info(`Server started on port ${config.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`CORS enabled for: ${config.cors.origin}`);

        if (process.send) {
          process.send('ready');
        }
      });
    } else {
      // Worker-only mode: signal PM2 readiness immediately.
      logger.info('Worker process started (no HTTP server)');
      if (process.send) {
        process.send('ready');
      }
    }

    // Graceful shutdown — stop accepting new connections and drain in-flight requests
    let shuttingDown = false;
    const shutdown = async () => {
      if (shuttingDown) return;
      shuttingDown = true;
      logger.info('Shutting down gracefully...');

      if (httpServer) {
        const serverClosed = new Promise<void>((resolve) => {
          httpServer!.close(() => {
            logger.info('HTTP server closed');
            resolve();
          });
        });
        const drainTimeout = new Promise<void>((resolve) => {
          setTimeout(() => {
            logger.warn('Drain timeout reached, forcing shutdown');
            resolve();
          }, 15_000);
        });
        await Promise.race([serverClosed, drainTimeout]);
      }

      await shutdownQueueWorkers();
      await closeMongoDB();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
