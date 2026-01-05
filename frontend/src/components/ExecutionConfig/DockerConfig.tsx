/**
 * DockerConfig - Configuration panel for Docker-based execution with sharding
 */
import React, { useState, useEffect } from 'react';
import {
  Container,
  Play,
  Square,
  RefreshCw,
  Monitor,
  Cpu,
  HardDrive,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import type { DockerConfig as DockerConfigType } from '@/types/execution';

interface ShardInfo {
  id: string;
  name: string;
  index: number;
  status: 'starting' | 'running' | 'stopped' | 'error';
  health?: 'healthy' | 'unhealthy' | 'unknown';
  vncUrl?: string;
  browsers: string[];
}

interface ClusterStatus {
  isRunning: boolean;
  coordinatorStatus: 'running' | 'stopped' | 'starting' | 'error';
  redisStatus: 'running' | 'stopped' | 'starting' | 'error';
  shards: ShardInfo[];
  totalShards: number;
  healthyShards: number;
}

interface DockerConfigProps {
  config: DockerConfigType;
  onChange: (config: DockerConfigType) => void;
  disabled?: boolean;
  onClusterStatusChange?: (status: ClusterStatus | null) => void;
}

export const DockerConfig: React.FC<DockerConfigProps> = ({
  config,
  onChange,
  disabled = false,
  onClusterStatusChange,
}) => {
  const [isDockerAvailable, setIsDockerAvailable] = useState<boolean | null>(null);
  const [dockerError, setDockerError] = useState<string | null>(null);
  const [clusterStatus, setClusterStatus] = useState<ClusterStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Check Docker availability on mount
  useEffect(() => {
    checkDockerStatus();
  }, []);

  // Poll cluster status when running
  useEffect(() => {
    if (clusterStatus?.isRunning) {
      const interval = setInterval(checkClusterStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [clusterStatus?.isRunning]);

  // Notify parent of cluster status changes
  useEffect(() => {
    onClusterStatusChange?.(clusterStatus);
  }, [clusterStatus, onClusterStatusChange]);

  const checkDockerStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/docker/status');
      const data = await response.json();

      if (data.success) {
        setIsDockerAvailable(data.docker.available);
        setDockerError(data.docker.error || null);
        setClusterStatus(data.cluster);
      } else {
        setIsDockerAvailable(false);
        setDockerError(data.error);
      }
    } catch (error) {
      setIsDockerAvailable(false);
      setDockerError('Failed to connect to backend');
    } finally {
      setIsChecking(false);
    }
  };

  const checkClusterStatus = async () => {
    try {
      const response = await fetch('/api/docker/status');
      const data = await response.json();
      if (data.success) {
        setClusterStatus(data.cluster);
      }
    } catch (error) {
      console.error('Failed to check cluster status:', error);
    }
  };

  const startCluster = async () => {
    setIsStarting(true);
    try {
      const response = await fetch('/api/docker/cluster/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shardCount: config.scaleMin,
          vncEnabled: true,
          browsers: ['chromium'], // Could be made configurable
          maxConcurrentPerShard: 2,
          memory: '2G',
          cpus: '1.0',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setClusterStatus(data.cluster);
      } else {
        setDockerError(data.error);
      }
    } catch (error: any) {
      setDockerError(error.message);
    } finally {
      setIsStarting(false);
    }
  };

  const stopCluster = async () => {
    setIsStopping(true);
    try {
      const response = await fetch('/api/docker/cluster/stop', {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        setClusterStatus(null);
      } else {
        setDockerError(data.error);
      }
    } catch (error: any) {
      setDockerError(error.message);
    } finally {
      setIsStopping(false);
    }
  };

  const updateConfig = <K extends keyof DockerConfigType>(
    key: K,
    value: DockerConfigType[K]
  ) => {
    onChange({ ...config, [key]: value });
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'running':
      case 'healthy':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'error':
      case 'unhealthy':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'starting':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Docker Availability Status */}
      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex items-center gap-3">
          <Container className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-sm font-medium text-slate-200">Docker Status</div>
            <div className="text-xs text-slate-400">
              {isChecking ? (
                'Checking...'
              ) : isDockerAvailable === null ? (
                'Unknown'
              ) : isDockerAvailable ? (
                <span className="text-green-400">Available</span>
              ) : (
                <span className="text-red-400">{dockerError || 'Not available'}</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={checkDockerStatus}
          disabled={isChecking}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
          title="Refresh status"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Shard Count Configuration */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">
          Number of Shards (Workers)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={16}
            value={config.scaleMin}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              updateConfig('scaleMin', value);
              updateConfig('scaleMax', value);
            }}
            disabled={disabled || !isDockerAvailable || clusterStatus?.isRunning}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
          />
          <div className="flex items-center gap-2 min-w-[80px]">
            <input
              type="number"
              min={1}
              max={16}
              value={config.scaleMin}
              onChange={(e) => {
                const value = Math.min(16, Math.max(1, parseInt(e.target.value, 10) || 1));
                updateConfig('scaleMin', value);
                updateConfig('scaleMax', value);
              }}
              disabled={disabled || !isDockerAvailable || clusterStatus?.isRunning}
              className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-center text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <span className="text-sm text-slate-400">shards</span>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Each shard runs tests in parallel. More shards = faster execution but more resources.
        </p>
      </div>

      {/* Resource Limits */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <HardDrive className="w-4 h-4" />
            Memory per Shard
          </label>
          <select
            value={config.environment?.MEMORY || '2G'}
            onChange={(e) => {
              const env = { ...(config.environment || {}), MEMORY: e.target.value };
              updateConfig('environment', env);
            }}
            disabled={disabled || !isDockerAvailable || clusterStatus?.isRunning}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          >
            <option value="1G">1 GB</option>
            <option value="2G">2 GB</option>
            <option value="4G">4 GB</option>
            <option value="8G">8 GB</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Cpu className="w-4 h-4" />
            CPUs per Shard
          </label>
          <select
            value={config.environment?.CPUS || '1.0'}
            onChange={(e) => {
              const env = { ...(config.environment || {}), CPUS: e.target.value };
              updateConfig('environment', env);
            }}
            disabled={disabled || !isDockerAvailable || clusterStatus?.isRunning}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          >
            <option value="0.5">0.5 CPU</option>
            <option value="1.0">1.0 CPU</option>
            <option value="2.0">2.0 CPUs</option>
            <option value="4.0">4.0 CPUs</option>
          </select>
        </div>
      </div>

      {/* Cluster Control Buttons */}
      {isDockerAvailable && (
        <div className="flex items-center gap-3 pt-2">
          {!clusterStatus?.isRunning ? (
            <button
              onClick={startCluster}
              disabled={disabled || isStarting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting Cluster...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Docker Cluster
                </>
              )}
            </button>
          ) : (
            <button
              onClick={stopCluster}
              disabled={disabled || isStopping}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStopping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" />
                  Stop Cluster
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Cluster Status Display */}
      {clusterStatus?.isRunning && (
        <div className="space-y-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-200">Cluster Status</span>
            <span className="flex items-center gap-2 text-xs text-green-400">
              <CheckCircle2 className="w-3 h-3" />
              Running
            </span>
          </div>

          {/* Component Status */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <StatusIcon status={clusterStatus.coordinatorStatus} />
              <span>Coordinator</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <StatusIcon status={clusterStatus.redisStatus} />
              <span>Redis</span>
            </div>
          </div>

          {/* Shards Grid */}
          <div className="space-y-2">
            <div className="text-xs text-slate-400">
              Shards: {clusterStatus.healthyShards}/{clusterStatus.totalShards} healthy
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {clusterStatus.shards.map((shard) => (
                <div
                  key={shard.id}
                  className="flex flex-col gap-1 p-2 bg-slate-800 rounded border border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-200">{shard.name}</span>
                    <StatusIcon status={shard.health || shard.status} />
                  </div>
                  {shard.vncUrl && (
                    <a
                      href={shard.vncUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <Monitor className="w-3 h-3" />
                      View
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {dockerError && (
        <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-300">{dockerError}</div>
        </div>
      )}
    </div>
  );
};

export default DockerConfig;
