/**
 * TraceNetworkPanel - Network waterfall view for trace viewer
 *
 * Features:
 * - Network waterfall view
 * - Request/response details
 * - Filtering by type, status
 * - Search functionality
 */
import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Copy, Check, ExternalLink } from 'lucide-react';
import { IconButton, EmptyState, Toolbar } from '@/components/ui';

export interface NetworkRequest {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  status: number;
  contentType: string;
  size: number;
  duration: number;
  timestamp: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
}

export interface TraceNetworkPanelProps {
  requests: NetworkRequest[];
}

type FilterType = 'all' | 'xhr' | 'js' | 'css' | 'img' | 'doc' | 'font' | 'other';

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'xhr', label: 'XHR/Fetch' },
  { value: 'js', label: 'JS' },
  { value: 'css', label: 'CSS' },
  { value: 'img', label: 'Images' },
  { value: 'doc', label: 'Doc' },
  { value: 'font', label: 'Font' },
  { value: 'other', label: 'Other' },
];

const getRequestType = (contentType: string, url: string): FilterType => {
  if (contentType.includes('json') || contentType.includes('xml') || url.includes('/api/')) {
    return 'xhr';
  }
  if (contentType.includes('javascript') || url.endsWith('.js')) {
    return 'js';
  }
  if (contentType.includes('css') || url.endsWith('.css')) {
    return 'css';
  }
  if (contentType.includes('image') || /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url)) {
    return 'img';
  }
  if (contentType.includes('html') || url.endsWith('.html')) {
    return 'doc';
  }
  if (contentType.includes('font') || /\.(woff|woff2|ttf|otf|eot)$/i.test(url)) {
    return 'font';
  }
  return 'other';
};

const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return 'text-status-success';
  if (status >= 300 && status < 400) return 'text-status-info';
  if (status >= 400 && status < 500) return 'text-status-warning';
  if (status >= 500) return 'text-status-danger';
  return 'text-text-secondary';
};

const getMethodColor = (method: string): string => {
  switch (method) {
    case 'GET': return 'bg-status-success/20 text-status-success';
    case 'POST': return 'bg-status-info/20 text-status-info';
    case 'PUT': return 'bg-status-warning/20 text-status-warning';
    case 'DELETE': return 'bg-status-danger/20 text-status-danger';
    case 'PATCH': return 'bg-accent-purple/20 text-accent-purple';
    default: return 'bg-dark-elevated/20 text-text-secondary';
  }
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const getFileName = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    return pathParts[pathParts.length - 1] || urlObj.hostname;
  } catch {
    return url;
  }
};

export const TraceNetworkPanel: React.FC<TraceNetworkPanelProps> = ({ requests }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter and search requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Apply type filter
      if (activeFilter !== 'all') {
        const type = getRequestType(req.contentType, req.url);
        if (type !== activeFilter) return false;
      }

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          req.url.toLowerCase().includes(query) ||
          req.method.toLowerCase().includes(query) ||
          req.status.toString().includes(query)
        );
      }

      return true;
    });
  }, [requests, activeFilter, searchQuery]);

  // Calculate waterfall scale
  const minTimestamp = Math.min(...requests.map(r => r.timestamp));
  const maxTimestamp = Math.max(...requests.map(r => r.timestamp + r.duration));
  const totalDuration = maxTimestamp - minTimestamp || 1;

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search & Filters */}
      <div className="p-2 border-b border-border-default/50 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            placeholder="Filter requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-dark-card/50 border border-border-default/50 rounded text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-status-info/50"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          {filterOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setActiveFilter(option.value)}
              className={`px-2 py-0.5 text-3xs font-medium rounded transition-colors ${
                activeFilter === option.value
                  ? 'bg-status-info/20 text-status-info border border-status-info/30'
                  : 'bg-dark-card/50 text-text-secondary border border-transparent hover:text-text-primary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Request List */}
      <div className="flex-1 overflow-auto">
        {filteredRequests.length === 0 ? (
          <EmptyState
            title="No requests match your filter"
            compact
          />
        ) : (
          <div className="divide-y divide-border-default/30">
            {filteredRequests.map(request => {
              const isExpanded = expandedRequest === request.id;
              const waterfallStart = ((request.timestamp - minTimestamp) / totalDuration) * 100;
              const waterfallWidth = (request.duration / totalDuration) * 100;

              return (
                <div key={request.id} className="bg-dark-bg/30">
                  {/* Request row */}
                  <button
                    onClick={() => setExpandedRequest(isExpanded ? null : request.id)}
                    className="w-full px-2 py-1.5 flex items-center gap-2 hover:bg-dark-card/50 transition-colors text-left"
                  >
                    {/* Expand icon */}
                    <div className="w-4 text-text-secondary">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Method */}
                    <span className={`px-1.5 py-0.5 text-3xs font-bold rounded ${getMethodColor(request.method)}`}>
                      {request.method}
                    </span>

                    {/* Status */}
                    <span className={`w-8 text-xs font-mono ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>

                    {/* URL */}
                    <span className="flex-1 text-xs text-text-primary truncate font-mono" title={request.url}>
                      {getFileName(request.url)}
                    </span>

                    {/* Size */}
                    <span className="text-3xs text-text-secondary w-14 text-right">
                      {formatSize(request.size)}
                    </span>

                    {/* Waterfall */}
                    <div className="w-24 h-3 bg-dark-card rounded overflow-hidden">
                      <div
                        className={`h-full rounded ${
                          request.status >= 400 ? 'bg-status-danger/60' : 'bg-status-info/60'
                        }`}
                        style={{
                          marginLeft: `${waterfallStart}%`,
                          width: `${Math.max(waterfallWidth, 2)}%`,
                        }}
                      />
                    </div>

                    {/* Duration */}
                    <span className="text-3xs text-text-secondary w-12 text-right">
                      {formatDuration(request.duration)}
                    </span>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-dark-card/30 border-t border-border-default/30 space-y-3">
                      {/* Full URL */}
                      <div className="flex items-start gap-2">
                        <span className="text-3xs text-text-secondary w-16 shrink-0 pt-0.5">URL:</span>
                        <div className="flex-1 flex items-start gap-2">
                          <code className="text-xxs text-text-primary font-mono break-all">
                            {request.url}
                          </code>
                          <IconButton
                            icon={copiedId === request.id ? <Check className="w-3 h-3 text-status-success" /> : <Copy className="w-3 h-3" />}
                            size="sm"
                            variant="ghost"
                            tooltip="Copy URL"
                            onClick={() => handleCopyUrl(request.id, request.url)}
                            className="h-auto w-auto p-1 shrink-0"
                          />
                          <a
                            href={request.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 p-1 text-text-secondary hover:text-text-primary transition-colors"
                            title="Open URL"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Content Type */}
                      <div className="flex items-center gap-2">
                        <span className="text-3xs text-text-secondary w-16 shrink-0">Type:</span>
                        <span className="text-xxs text-text-secondary">{request.contentType}</span>
                      </div>

                      {/* Headers preview */}
                      {request.responseHeaders && (
                        <div className="space-y-1">
                          <span className="text-3xs text-text-secondary">Response Headers:</span>
                          <div className="bg-dark-bg/50 rounded p-2 max-h-32 overflow-auto">
                            <pre className="text-3xs text-text-secondary font-mono">
                              {JSON.stringify(request.responseHeaders, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      <Toolbar position="bottom" size="sm" className="text-3xs text-text-secondary justify-between">
        <span>{filteredRequests.length} requests</span>
        <span>{formatSize(filteredRequests.reduce((sum, r) => sum + r.size, 0))} transferred</span>
      </Toolbar>
    </div>
  );
};

export default TraceNetworkPanel;
