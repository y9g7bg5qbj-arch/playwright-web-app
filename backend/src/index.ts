import http from 'http';
import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './db/prisma';
import { WebSocketServer } from './websocket';

async function start() {
  try {
    // Connect to database
    await connectDatabase();

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
    httpServer.listen(config.port, () => {
      logger.info(`Server started on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`CORS enabled for: ${config.cors.origin}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');

      httpServer.close(() => {
        logger.info('HTTP server closed');
      });

      await disconnectDatabase();
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
