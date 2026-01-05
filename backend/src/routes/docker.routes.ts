/**
 * Docker Cluster Management Routes
 *
 * API endpoints for starting, stopping, and managing Docker-based test execution clusters.
 */

import { Router, Request, Response } from 'express';
import { dockerService, DockerClusterConfig } from '../services/docker.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/docker/status
 * Get current Docker availability and cluster status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const [dockerAvailable, clusterStatus] = await Promise.all([
      dockerService.isDockerAvailable(),
      dockerService.getClusterStatus()
    ]);

    res.json({
      success: true,
      docker: dockerAvailable,
      cluster: clusterStatus
    });
  } catch (error: any) {
    logger.error('Failed to get Docker status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/docker/cluster/start
 * Start a Docker cluster with specified configuration
 */
router.post('/cluster/start', async (req: Request, res: Response) => {
  try {
    const config: DockerClusterConfig = {
      shardCount: req.body.shardCount || 2,
      vncEnabled: req.body.vncEnabled !== false,
      browsers: req.body.browsers || ['chromium'],
      maxConcurrentPerShard: req.body.maxConcurrentPerShard || 2,
      memory: req.body.memory,
      cpus: req.body.cpus,
      network: req.body.network
    };

    // Validate shard count
    if (config.shardCount < 1 || config.shardCount > 16) {
      return res.status(400).json({
        success: false,
        error: 'Shard count must be between 1 and 16'
      });
    }

    // Validate browsers
    const validBrowsers = ['chromium', 'firefox', 'webkit'];
    for (const browser of config.browsers) {
      if (!validBrowsers.includes(browser)) {
        return res.status(400).json({
          success: false,
          error: `Invalid browser: ${browser}. Must be one of: ${validBrowsers.join(', ')}`
        });
      }
    }

    logger.info('Starting Docker cluster with config:', config);

    const status = await dockerService.startCluster(config);

    res.status(201).json({
      success: true,
      message: `Docker cluster started with ${status.healthyShards} healthy shards`,
      cluster: status
    });
  } catch (error: any) {
    logger.error('Failed to start Docker cluster:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/docker/cluster/stop
 * Stop the running Docker cluster
 */
router.post('/cluster/stop', async (req: Request, res: Response) => {
  try {
    await dockerService.stopCluster();

    res.json({
      success: true,
      message: 'Docker cluster stopped successfully'
    });
  } catch (error: any) {
    logger.error('Failed to stop Docker cluster:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/docker/cluster/scale
 * Scale the cluster to a different number of shards
 */
router.post('/cluster/scale', async (req: Request, res: Response) => {
  try {
    const { shardCount } = req.body;

    if (!shardCount || shardCount < 1 || shardCount > 16) {
      return res.status(400).json({
        success: false,
        error: 'Shard count must be between 1 and 16'
      });
    }

    logger.info(`Scaling Docker cluster to ${shardCount} shards`);

    const status = await dockerService.scaleCluster(shardCount);

    res.json({
      success: true,
      message: `Cluster scaled to ${status.healthyShards} shards`,
      cluster: status
    });
  } catch (error: any) {
    logger.error('Failed to scale Docker cluster:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/docker/cluster/health
 * Get health status of all cluster components
 */
router.get('/cluster/health', async (req: Request, res: Response) => {
  try {
    const health = await dockerService.checkHealth();

    res.json({
      success: true,
      health
    });
  } catch (error: any) {
    logger.error('Failed to check cluster health:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/docker/cluster/shards
 * Get list of all shards with their VNC URLs
 */
router.get('/cluster/shards', async (req: Request, res: Response) => {
  try {
    const status = await dockerService.getClusterStatus();

    res.json({
      success: true,
      shards: status.shards.map(shard => ({
        id: shard.id,
        name: shard.name,
        index: shard.index,
        status: shard.status,
        health: shard.health,
        vncUrl: shard.vncUrl,
        browsers: shard.browsers
      }))
    });
  } catch (error: any) {
    logger.error('Failed to get shards:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/docker/cluster/shards/:index/logs
 * Get logs from a specific shard
 */
router.get('/cluster/shards/:index/logs', async (req: Request, res: Response) => {
  try {
    const shardIndex = parseInt(req.params.index, 10);
    const lines = parseInt(req.query.lines as string, 10) || 100;

    if (isNaN(shardIndex) || shardIndex < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid shard index'
      });
    }

    const logs = await dockerService.getShardLogs(shardIndex, lines);

    res.json({
      success: true,
      shardIndex,
      logs
    });
  } catch (error: any) {
    logger.error(`Failed to get logs for shard ${req.params.index}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/docker/available
 * Check if Docker is available on the system
 */
router.get('/available', async (req: Request, res: Response) => {
  try {
    const result = await dockerService.isDockerAvailable();

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      available: false,
      error: error.message
    });
  }
});

export default router;
