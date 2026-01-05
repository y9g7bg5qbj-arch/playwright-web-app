/**
 * Docker Orchestration Service
 *
 * Manages Docker containers for distributed test execution with configurable sharding.
 */

import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import path from 'path';

const execAsync = promisify(exec);

export interface DockerClusterConfig {
  shardCount: number;
  vncEnabled: boolean;
  browsers: ('chromium' | 'firefox' | 'webkit')[];
  maxConcurrentPerShard: number;
  memory?: string;
  cpus?: string;
  network?: string;
}

export interface ShardInfo {
  id: string;
  name: string;
  index: number;
  status: 'starting' | 'running' | 'stopped' | 'error';
  containerId?: string;
  vncPort?: number;
  vncUrl?: string;
  browsers: string[];
  health?: 'healthy' | 'unhealthy' | 'unknown';
}

export interface ClusterStatus {
  isRunning: boolean;
  coordinatorStatus: 'running' | 'stopped' | 'starting' | 'error';
  redisStatus: 'running' | 'stopped' | 'starting' | 'error';
  shards: ShardInfo[];
  totalShards: number;
  healthyShards: number;
  config: DockerClusterConfig;
}

class DockerService extends EventEmitter {
  private dockerPath: string = 'docker';
  private composePath: string = 'docker-compose';
  private projectRoot: string;
  private dockerDir: string;
  private currentConfig: DockerClusterConfig | null = null;
  private clusterProcess: ChildProcess | null = null;

  constructor() {
    super();
    this.projectRoot = path.resolve(__dirname, '../../..');
    this.dockerDir = path.join(this.projectRoot, 'docker');
    this.detectDockerPaths();
  }

  private async detectDockerPaths(): Promise<void> {
    // Try different Docker paths (macOS with Docker Desktop)
    const possiblePaths = [
      '/Applications/Docker.app/Contents/Resources/bin/docker',
      '/opt/homebrew/bin/docker',
      '/usr/local/bin/docker',
      'docker',
    ];

    for (const dockerPath of possiblePaths) {
      try {
        await execAsync(`${dockerPath} --version`);
        this.dockerPath = dockerPath;
        this.composePath = dockerPath.replace('docker', 'docker-compose');
        logger.info(`Docker found at: ${dockerPath}`);
        return;
      } catch {
        // Try next path
      }
    }

    // Also try docker compose (v2) vs docker-compose (v1)
    try {
      await execAsync(`${this.dockerPath} compose version`);
      // Use docker compose (v2 syntax)
    } catch {
      // Fall back to docker-compose
    }
  }

  /**
   * Check if Docker is available and running
   */
  async isDockerAvailable(): Promise<{ available: boolean; version?: string; error?: string }> {
    try {
      const { stdout } = await execAsync(`${this.dockerPath} --version`);
      // Also check if Docker daemon is running
      await execAsync(`${this.dockerPath} info`);
      return { available: true, version: stdout.trim() };
    } catch (error: any) {
      return {
        available: false,
        error: error.message.includes('daemon')
          ? 'Docker daemon is not running. Please start Docker Desktop.'
          : 'Docker is not installed or not in PATH.'
      };
    }
  }

  /**
   * Start Docker cluster with specified number of shards
   */
  async startCluster(config: DockerClusterConfig): Promise<ClusterStatus> {
    logger.info(`Starting Docker cluster with ${config.shardCount} shards`, config);

    const dockerCheck = await this.isDockerAvailable();
    if (!dockerCheck.available) {
      throw new Error(dockerCheck.error || 'Docker is not available');
    }

    this.currentConfig = config;
    this.emit('cluster:starting', config);

    try {
      // Generate dynamic docker-compose override for custom shard count
      const composeOverride = this.generateComposeOverride(config);
      const overridePath = path.join(this.dockerDir, 'docker-compose.dynamic.yml');

      // Write the dynamic compose file
      const fs = await import('fs').then(m => m.promises);
      await fs.writeFile(overridePath, composeOverride);

      // Build images first
      logger.info('Building Docker images...');
      this.emit('cluster:building', { message: 'Building Docker images...' });

      await execAsync(
        `cd "${this.dockerDir}" && ${this.dockerPath} compose -f docker-compose.yml -f docker-compose.dynamic.yml build`,
        { timeout: 300000 } // 5 minute timeout for build
      );

      // Start the cluster
      logger.info('Starting containers...');
      this.emit('cluster:containers-starting', { message: 'Starting containers...' });

      await execAsync(
        `cd "${this.dockerDir}" && ${this.dockerPath} compose -f docker-compose.yml -f docker-compose.dynamic.yml up -d`,
        { timeout: 120000 }
      );

      // Wait for containers to be healthy
      await this.waitForHealthyCluster(config.shardCount);

      const status = await this.getClusterStatus();
      this.emit('cluster:started', status);

      logger.info('Docker cluster started successfully', {
        shards: status.healthyShards,
        totalShards: status.totalShards
      });

      return status;
    } catch (error: any) {
      logger.error('Failed to start Docker cluster:', error);
      this.emit('cluster:error', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate dynamic docker-compose override for custom shard count
   */
  private generateComposeOverride(config: DockerClusterConfig): string {
    const services: Record<string, any> = {
      // Disable default worker
      worker: {
        deploy: { replicas: 0 }
      }
    };

    // Generate shard services
    for (let i = 1; i <= config.shardCount; i++) {
      const vncPort = 6080 + i;
      const vncDirectPort = 5900 + i;

      services[`shard-${i}`] = {
        build: {
          context: '..',
          dockerfile: 'docker/Dockerfile.worker'
        },
        container_name: `vero-shard-${i}`,
        environment: [
          `WORKER_ID=shard-${i}`,
          `WORKER_NAME=Shard ${i}`,
          `SHARD_INDEX=${i}`,
          `TOTAL_SHARDS=${config.shardCount}`,
          'COORDINATOR_URL=http://coordinator:3001',
          'REDIS_URL=redis://redis:6379',
          `WORKER_MAX_CONCURRENT=${config.maxConcurrentPerShard}`,
          `WORKER_BROWSERS=${config.browsers.join(',')}`,
          'DISPLAY=:99',
          'SCREEN_WIDTH=1280',
          'SCREEN_HEIGHT=720',
          `VNC_ENABLED=${config.vncEnabled}`
        ],
        ports: config.vncEnabled ? [
          `${vncPort}:6080`,
          `${vncDirectPort}:5900`
        ] : [],
        depends_on: {
          coordinator: { condition: 'service_healthy' }
        },
        networks: ['vero-network'],
        volumes: [
          `shard${i}-traces:/app/traces`,
          `shard${i}-screenshots:/app/screenshots`,
          `shard${i}-reports:/app/blob-report`
        ],
        ...(config.memory || config.cpus ? {
          deploy: {
            resources: {
              limits: {
                ...(config.memory && { memory: config.memory }),
                ...(config.cpus && { cpus: config.cpus })
              }
            }
          }
        } : {}),
        restart: 'unless-stopped'
      };
    }

    // Generate volumes
    const volumes: Record<string, any> = {};
    for (let i = 1; i <= config.shardCount; i++) {
      volumes[`shard${i}-traces`] = {};
      volumes[`shard${i}-screenshots`] = {};
      volumes[`shard${i}-reports`] = {};
    }

    const compose = {
      version: '3.8',
      services,
      volumes
    };

    // Convert to YAML-like format (simple version)
    return this.objectToYaml(compose);
  }

  /**
   * Simple object to YAML converter
   */
  private objectToYaml(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            yaml += `${spaces}  -\n${this.objectToYaml(item, indent + 2).replace(/^/gm, '  ')}`;
          } else {
            yaml += `${spaces}  - "${item}"\n`;
          }
        }
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n`;
        yaml += this.objectToYaml(value, indent + 1);
      } else if (typeof value === 'string') {
        yaml += `${spaces}${key}: "${value}"\n`;
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }

  /**
   * Wait for cluster to be healthy
   */
  private async waitForHealthyCluster(shardCount: number, timeoutMs: number = 120000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getClusterStatus();

      if (status.coordinatorStatus === 'running' && status.healthyShards >= shardCount) {
        return;
      }

      this.emit('cluster:waiting', {
        healthyShards: status.healthyShards,
        totalShards: shardCount,
        elapsed: Date.now() - startTime
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error(`Cluster failed to become healthy within ${timeoutMs}ms`);
  }

  /**
   * Stop the Docker cluster
   */
  async stopCluster(): Promise<void> {
    logger.info('Stopping Docker cluster...');
    this.emit('cluster:stopping', {});

    try {
      await execAsync(
        `cd "${this.dockerDir}" && ${this.dockerPath} compose -f docker-compose.yml -f docker-compose.dynamic.yml down`,
        { timeout: 60000 }
      );

      this.currentConfig = null;
      this.emit('cluster:stopped', {});
      logger.info('Docker cluster stopped');
    } catch (error: any) {
      logger.error('Failed to stop Docker cluster:', error);
      this.emit('cluster:error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get current cluster status
   */
  async getClusterStatus(): Promise<ClusterStatus> {
    const defaultStatus: ClusterStatus = {
      isRunning: false,
      coordinatorStatus: 'stopped',
      redisStatus: 'stopped',
      shards: [],
      totalShards: 0,
      healthyShards: 0,
      config: this.currentConfig || {
        shardCount: 0,
        vncEnabled: false,
        browsers: ['chromium'],
        maxConcurrentPerShard: 2
      }
    };

    try {
      // Get container list
      const { stdout } = await execAsync(
        `${this.dockerPath} ps --filter "name=vero-" --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"`,
        { timeout: 10000 }
      );

      if (!stdout.trim()) {
        return defaultStatus;
      }

      const lines = stdout.trim().split('\n');
      const shards: ShardInfo[] = [];
      let coordinatorStatus: ClusterStatus['coordinatorStatus'] = 'stopped';
      let redisStatus: ClusterStatus['redisStatus'] = 'stopped';

      for (const line of lines) {
        const [name, status, ports] = line.split('\t');
        const isHealthy = status.toLowerCase().includes('healthy') || status.toLowerCase().includes('up');

        if (name === 'vero-coordinator') {
          coordinatorStatus = isHealthy ? 'running' : 'error';
        } else if (name === 'vero-redis') {
          redisStatus = isHealthy ? 'running' : 'error';
        } else if (name.startsWith('vero-shard-')) {
          const shardIndex = parseInt(name.replace('vero-shard-', ''), 10);

          // Extract VNC port from ports string (e.g., "0.0.0.0:6081->6080/tcp")
          const vncPortMatch = ports.match(/0\.0\.0\.0:(\d+)->6080/);
          const vncPort = vncPortMatch ? parseInt(vncPortMatch[1], 10) : undefined;

          shards.push({
            id: name,
            name: `Shard ${shardIndex}`,
            index: shardIndex,
            status: isHealthy ? 'running' : 'error',
            containerId: name,
            vncPort,
            vncUrl: vncPort ? `http://localhost:${vncPort}/vnc.html` : undefined,
            browsers: this.currentConfig?.browsers || ['chromium'],
            health: isHealthy ? 'healthy' : 'unhealthy'
          });
        }
      }

      // Sort shards by index
      shards.sort((a, b) => a.index - b.index);

      return {
        isRunning: coordinatorStatus === 'running' && shards.length > 0,
        coordinatorStatus,
        redisStatus,
        shards,
        totalShards: shards.length,
        healthyShards: shards.filter(s => s.health === 'healthy').length,
        config: this.currentConfig || defaultStatus.config
      };
    } catch (error: any) {
      logger.error('Failed to get cluster status:', error);
      return defaultStatus;
    }
  }

  /**
   * Get logs from a specific shard
   */
  async getShardLogs(shardIndex: number, lines: number = 100): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `${this.dockerPath} logs --tail ${lines} vero-shard-${shardIndex}`,
        { timeout: 10000 }
      );
      return stdout;
    } catch (error: any) {
      logger.error(`Failed to get logs for shard ${shardIndex}:`, error);
      return `Error getting logs: ${error.message}`;
    }
  }

  /**
   * Scale cluster to a new shard count (restart with new config)
   */
  async scaleCluster(newShardCount: number): Promise<ClusterStatus> {
    if (!this.currentConfig) {
      throw new Error('No cluster is currently running');
    }

    const newConfig = { ...this.currentConfig, shardCount: newShardCount };
    await this.stopCluster();
    return this.startCluster(newConfig);
  }

  /**
   * Check container health
   */
  async checkHealth(): Promise<{
    coordinator: boolean;
    redis: boolean;
    shards: { index: number; healthy: boolean }[]
  }> {
    const status = await this.getClusterStatus();

    return {
      coordinator: status.coordinatorStatus === 'running',
      redis: status.redisStatus === 'running',
      shards: status.shards.map(s => ({
        index: s.index,
        healthy: s.health === 'healthy'
      }))
    };
  }
}

// Export singleton instance
export const dockerService = new DockerService();
