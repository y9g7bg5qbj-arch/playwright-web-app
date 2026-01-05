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
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    label: 'Connected',
  },
  disconnected: {
    icon: <WifiOff className="w-4 h-4" />,
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    label: 'Disconnected',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    label: 'Error',
  },
  connecting: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
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
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${status.bg} ${status.color}`}>
            {status.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-200">{endpoint.name}</span>
              {endpoint.ssl?.enabled && (
                <Lock className="w-3.5 h-3.5 text-green-400" title="SSL/TLS enabled" />
              )}
            </div>
            <div className="text-xs text-slate-500 font-mono truncate max-w-[200px]" title={endpoint.url}>
              {endpoint.url}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onTestConnection && (
            <button
              onClick={() => onTestConnection(endpoint.id)}
              disabled={isTestingConnection}
              className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
              aria-label="Test connection"
              title="Test connection"
            >
              {isTestingConnection ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(endpoint)}
              className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Edit endpoint"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(endpoint.id)}
              className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-red-400 transition-colors"
              aria-label="Delete endpoint"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-slate-700/50">
        <span className={`flex items-center gap-1.5 text-xs font-medium ${status.color}`}>
          {status.icon}
          {status.label}
        </span>
        {endpoint.latency !== undefined && endpoint.status === 'connected' && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            {endpoint.latency}ms
          </span>
        )}
      </div>

      {/* Browsers */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-slate-500">Available Browsers</span>
        </div>
        <div className="flex items-center gap-2">
          {endpoint.browsers.map((browser) => (
            <span
              key={browser}
              className="flex items-center gap-1.5 px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300"
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
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Users className="w-3.5 h-3.5" />
            Worker Capacity
          </span>
          <span className="text-xs text-slate-400">
            {endpoint.activeWorkers} / {endpoint.workerCapacity}
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              utilizationPercent > 80 ? 'bg-red-500' :
              utilizationPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${utilizationPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 text-xs">
          <span className="text-slate-600">
            {utilizationPercent}% utilized
          </span>
          {endpoint.lastConnected && (
            <span className="text-slate-600">
              Last: {new Date(endpoint.lastConnected).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Auth indicator */}
      {endpoint.auth && endpoint.auth.type !== 'none' && (
        <div className="px-4 py-2 bg-slate-800/30 border-t border-slate-700/50">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Shield className="w-3.5 h-3.5" />
            Auth: <span className="text-slate-400 capitalize">{endpoint.auth.type}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default EndpointCard;
