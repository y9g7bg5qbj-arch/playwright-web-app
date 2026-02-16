import http from 'http';
import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectMongoDB, closeMongoDB } from './db/mongodb';
import { WebSocketServer } from './websocket';
import { initializeQueueWorkers, shutdownQueueWorkers } from './services/queue/bootstrap';
import { migrateSandboxLayoutOnStartup } from './services/sandboxLayoutMigration.service';
import { migrateRunConfigurationsToProjectScope } from './services/runConfigurationProjectScopeMigration.service';

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

async function start() {
  try {
    // Connect to MongoDB Atlas (primary database)
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

    // Initialize queue infrastructure and workers before serving traffic.
    await initializeQueueWorkers();

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize WebSocket server
    const wsServer = new WebSocketServer(httpServer);
    logger.info('WebSocket server initialized');

    // Make io available to routes via app.get('io')
    app.set('io', wsServer.getIO());

    // Start server
    httpServer.listen(config.port, '0.0.0.0', () => {
      logger.info(`Server started on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`CORS enabled for: ${config.cors.origin}`);

      // Signal PM2 that the app is ready to receive traffic
      if (process.send) {
        process.send('ready');
      }
    });

    // Graceful shutdown — stop accepting new connections and drain in-flight requests
    let shuttingDown = false;
    const shutdown = async () => {
      if (shuttingDown) return; // Prevent double-shutdown
      shuttingDown = true;
      logger.info('Shutting down gracefully...');

      // Stop accepting new connections; wait up to 15s for in-flight requests
      const serverClosed = new Promise<void>((resolve) => {
        httpServer.close(() => {
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
