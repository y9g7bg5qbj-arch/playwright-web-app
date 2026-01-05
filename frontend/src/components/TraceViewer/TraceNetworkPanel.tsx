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
import { Search, Filter, ChevronDown, ChevronRight, Copy, Check, ExternalLink } from 'lucide-react';

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
  if (status >= 200 && status < 300) return 'text-green-400';
  if (status >= 300 && status < 400) return 'text-blue-400';
  if (status >= 400 && status < 500) return 'text-yellow-400';
  if (status >= 500) return 'text-red-400';
  return 'text-slate-400';
};

const getMethodColor = (method: string): string => {
  switch (method) {
    case 'GET': return 'bg-green-500/20 text-green-400';
    case 'POST': return 'bg-blue-500/20 text-blue-400';
    case 'PUT': return 'bg-yellow-500/20 text-yellow-400';
    case 'DELETE': return 'bg-red-500/20 text-red-400';
    case 'PATCH': return 'bg-purple-500/20 text-purple-400';
    default: return 'bg-slate-500/20 text-slate-400';
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
      <div className="p-2 border-b border-slate-700/50 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Filter requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          {filterOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setActiveFilter(option.value)}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                activeFilter === option.value
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-slate-800/50 text-slate-500 border border-transparent hover:text-slate-300'
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
          <div className="p-4 text-center text-slate-500 text-sm">
            No requests match your filter
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {filteredRequests.map(request => {
              const isExpanded = expandedRequest === request.id;
              const waterfallStart = ((request.timestamp - minTimestamp) / totalDuration) * 100;
              const waterfallWidth = (request.duration / totalDuration) * 100;

              return (
                <div key={request.id} className="bg-slate-900/30">
                  {/* Request row */}
                  <button
                    onClick={() => setExpandedRequest(isExpanded ? null : request.id)}
                    className="w-full px-2 py-1.5 flex items-center gap-2 hover:bg-slate-800/50 transition-colors text-left"
                  >
                    {/* Expand icon */}
                    <div className="w-4 text-slate-500">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Method */}
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${getMethodColor(request.method)}`}>
                      {request.method}
                    </span>

                    {/* Status */}
                    <span className={`w-8 text-xs font-mono ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>

                    {/* URL */}
                    <span className="flex-1 text-xs text-slate-300 truncate font-mono" title={request.url}>
                      {getFileName(request.url)}
                    </span>

                    {/* Size */}
                    <span className="text-[10px] text-slate-500 w-14 text-right">
                      {formatSize(request.size)}
                    </span>

                    {/* Waterfall */}
                    <div className="w-24 h-3 bg-slate-800 rounded overflow-hidden">
                      <div
                        className={`h-full rounded ${
                          request.status >= 400 ? 'bg-red-500/60' : 'bg-blue-500/60'
                        }`}
                        style={{
                          marginLeft: `${waterfallStart}%`,
                          width: `${Math.max(waterfallWidth, 2)}%`,
                        }}
                      />
                    </div>

                    {/* Duration */}
                    <span className="text-[10px] text-slate-500 w-12 text-right">
                      {formatDuration(request.duration)}
                    </span>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/30 space-y-3">
                      {/* Full URL */}
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] text-slate-500 w-16 shrink-0 pt-0.5">URL:</span>
                        <div className="flex-1 flex items-start gap-2">
                          <code className="text-[11px] text-slate-300 font-mono break-all">
                            {request.url}
                          </code>
                          <button
                            onClick={() => handleCopyUrl(request.id, request.url)}
                            className="shrink-0 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                            title="Copy URL"
                          >
                            {copiedId === request.id ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <a
                            href={request.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                            title="Open URL"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Content Type */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 w-16 shrink-0">Type:</span>
                        <span className="text-[11px] text-slate-400">{request.contentType}</span>
                      </div>

                      {/* Headers preview */}
                      {request.responseHeaders && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500">Response Headers:</span>
                          <div className="bg-slate-900/50 rounded p-2 max-h-32 overflow-auto">
                            <pre className="text-[10px] text-slate-400 font-mono">
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
      <div className="px-3 py-2 border-t border-slate-700/50 text-[10px] text-slate-500 flex items-center justify-between">
        <span>{filteredRequests.length} requests</span>
        <span>{formatSize(filteredRequests.reduce((sum, r) => sum + r.size, 0))} transferred</span>
      </div>
    </div>
  );
};

export default TraceNetworkPanel;
