/**
 * EndpointCard - Display and manage a remote endpoint
 */
import React from 'react';
import {
  Globe,
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
  Edit2,
  Trash2,
  RefreshCw,
  Users,
  Chrome,
  Compass,
  Clock,
  Lock,
  Shield,
} from 'lucide-react';
import { IconButton } from '@/components/ui';
import type { RemoteEndpoint, BrowserType } from '@/types/execution';

interface EndpointCardProps {
  endpoint: RemoteEndpoint;
  onEdit?: (endpoint: RemoteEndpoint) => void;
  onDelete?: (id: string) => void;
  onTestConnection?: (id: string) => void;
  isTestingConnection?: boolean;
}

const browserIcons: Record<BrowserType, React.ReactNode> = {
  chromium: <Chrome className="w-3.5 h-3.5" />,
  firefox: <Compass className="w-3.5 h-3.5" />,
  webkit: <Globe className="w-3.5 h-3.5" />,
};

const statusConfig = {
  connected: {
    icon: <Wifi className="w-4 h-4" />,
    color: 'text-status-success',
    bg: 'bg-status-success/10',
    border: 'border-status-success/30',
    label: 'Connected',
  },
  disconnected: {
    icon: <WifiOff className="w-4 h-4" />,
    color: 'text-text-secondary',
    bg: 'bg-text-secondary/10',
    border: 'border-border-default/30',
    label: 'Disconnected',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-status-danger',
    bg: 'bg-status-danger/10',
    border: 'border-status-danger/30',
    label: 'Error',
  },
  connecting: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    color: 'text-status-info',
    bg: 'bg-status-info/10',
    border: 'border-status-info/30',
    label: 'Connecting...',
  },
};

export const EndpointCard: React.FC<EndpointCardProps> = ({
  endpoint,
  onEdit,
  onDelete,
  onTestConnection,
  isTestingConnection = false,
}) => {
  const status = statusConfig[endpoint.status];
  const utilizationPercent = endpoint.workerCapacity > 0
    ? Math.round((endpoint.activeWorkers / endpoint.workerCapacity) * 100)
    : 0;

  return (
    <div className={`rounded-lg border ${status.border} ${status.bg} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-dark-card/50 border-b border-border-default/50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${status.bg} ${status.color}`}>
            {status.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-text-primary">{endpoint.name}</span>
              {endpoint.ssl?.enabled && (
                <span title="SSL/TLS enabled">
                  <Lock className="w-3.5 h-3.5 text-status-success" />
                </span>
              )}
            </div>
            <div className="text-xs text-text-secondary font-mono truncate max-w-[200px]" title={endpoint.url}>
              {endpoint.url}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onTestConnection && (
            <IconButton
              icon={isTestingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              variant="ghost"
              tooltip="Test connection"
              disabled={isTestingConnection}
              onClick={() => onTestConnection(endpoint.id)}
            />
          )}
          {onEdit && (
            <IconButton
              icon={<Edit2 className="w-4 h-4" />}
              variant="ghost"
              tooltip="Edit"
              onClick={() => onEdit(endpoint)}
            />
          )}
          {onDelete && (
            <IconButton
              icon={<Trash2 className="w-4 h-4" />}
              variant="ghost"
              tone="danger"
              tooltip="Delete"
              onClick={() => onDelete(endpoint.id)}
            />
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-border-default/50">
        <span className={`flex items-center gap-1.5 text-xs font-medium ${status.color}`}>
          {status.icon}
          {status.label}
        </span>
        {endpoint.latency !== undefined && endpoint.status === 'connected' && (
          <span className="flex items-center gap-1 text-xs text-text-secondary">
            <Clock className="w-3 h-3" />
            {endpoint.latency}ms
          </span>
        )}
      </div>

      {/* Browsers */}
      <div className="px-4 py-3 border-b border-border-default/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-text-secondary">Available Browsers</span>
        </div>
        <div className="flex items-center gap-2">
          {endpoint.browsers.map((browser) => (
            <span
              key={browser}
              className="flex items-center gap-1.5 px-2 py-1 bg-dark-elevated/50 rounded text-xs text-text-primary"
            >
              {browserIcons[browser]}
              <span className="capitalize">{browser}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Workers */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Users className="w-3.5 h-3.5" />
            Worker Capacity
          </span>
          <span className="text-xs text-text-secondary">
            {endpoint.activeWorkers} / {endpoint.workerCapacity}
          </span>
        </div>
        <div className="h-2 bg-dark-elevated rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              utilizationPercent > 80 ? 'bg-status-danger' :
              utilizationPercent > 50 ? 'bg-status-warning' : 'bg-status-success'
            }`}
            style={{ width: `${utilizationPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 text-xs">
          <span className="text-text-muted">
            {utilizationPercent}% utilized
          </span>
          {endpoint.lastConnected && (
            <span className="text-text-muted">
              Last: {new Date(endpoint.lastConnected).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Auth indicator */}
      {endpoint.auth && endpoint.auth.type !== 'none' && (
        <div className="px-4 py-2 bg-dark-card/30 border-t border-border-default/50">
          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Shield className="w-3.5 h-3.5" />
            Auth: <span className="text-text-secondary capitalize">{endpoint.auth.type}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default EndpointCard;
