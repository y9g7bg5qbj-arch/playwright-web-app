/**
 * TestResultCard - Individual test result display
 *
 * Features:
 * - Status badge
 * - Duration
 * - Error preview
 * - Link to trace viewer
 */
import React from 'react';
import {
  CheckCircle2,
  XCircle,
  SkipForward,
  AlertTriangle,
  Clock,
  Play,
  Eye,
  Image,
} from 'lucide-react';

export interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  browser: string;
  worker?: number;
  retries?: number;
  isFlaky?: boolean;
  error?: {
    message: string;
    stack?: string;
  };
  traceUrl?: string;
  screenshotUrl?: string;
  videoUrl?: string;
}

export interface TestResultCardProps {
  result: TestResult;
  onViewTrace?: (testId: string, traceUrl: string) => void;
  onViewVideo?: (testId: string, videoUrl: string) => void;
  onViewScreenshot?: (testId: string, screenshotUrl: string) => void;
}

const getStatusIcon = (status: TestResult['status']) => {
  switch (status) {
    case 'passed':
      return <CheckCircle2 className="w-4 h-4 text-status-success" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-status-danger" />;
    case 'skipped':
      return <SkipForward className="w-4 h-4 text-text-secondary" />;
    default:
      return <Clock className="w-4 h-4 text-status-info animate-pulse" />;
  }
};

const getStatusColor = (status: TestResult['status']): string => {
  switch (status) {
    case 'passed': return 'bg-status-success/10 border-status-success/30';
    case 'failed': return 'bg-status-danger/10 border-status-danger/30';
    case 'skipped': return 'bg-text-secondary/10 border-text-secondary/30';
    default: return 'bg-status-info/10 border-status-info/30';
  }
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
};

export const TestResultCard: React.FC<TestResultCardProps> = ({
  result,
  onViewTrace,
  onViewVideo,
  onViewScreenshot,
}) => {
  const hasArtifacts = result.traceUrl || result.videoUrl || result.screenshotUrl;

  return (
    <div className={`rounded-lg border p-3 transition-all hover:shadow-lg ${getStatusColor(result.status)}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {getStatusIcon(result.status)}
          <span className="font-medium text-sm text-text-primary truncate" title={result.name}>
            {result.name}
          </span>
        </div>
        {result.isFlaky && (
          <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-status-warning/20 text-status-warning text-3xs font-medium rounded">
            <AlertTriangle className="w-3 h-3" />
            Flaky
          </span>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-3 text-xs text-text-secondary mb-2">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(result.duration)}
        </span>
        <span className="text-text-muted">{result.browser}</span>
        {result.worker !== undefined && (
          <span className="text-text-muted">Worker {result.worker}</span>
        )}
        {result.retries !== undefined && result.retries > 0 && (
          <span className="text-status-warning/80">
            {result.retries} {result.retries === 1 ? 'retry' : 'retries'}
          </span>
        )}
      </div>

      {/* Error preview */}
      {result.error && (
        <div className="mt-2 p-2 bg-status-danger/20 border border-status-danger/30 rounded text-xs">
          <p className="text-status-danger font-mono line-clamp-2" title={result.error.message}>
            {result.error.message}
          </p>
        </div>
      )}

      {/* Artifacts */}
      {hasArtifacts && (
        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border-default/50">
          {result.traceUrl && (
            <button
              onClick={() => onViewTrace?.(result.id, result.traceUrl!)}
              className="flex items-center gap-1 px-2 py-1 bg-dark-card/50 hover:bg-dark-elevated/50 text-text-secondary hover:text-status-info rounded text-xs transition-colors"
              title="View trace"
            >
              <Eye className="w-3 h-3" />
              Trace
            </button>
          )}
          {result.videoUrl && (
            <button
              onClick={() => onViewVideo?.(result.id, result.videoUrl!)}
              className="flex items-center gap-1 px-2 py-1 bg-dark-card/50 hover:bg-dark-elevated/50 text-text-secondary hover:text-status-success rounded text-xs transition-colors"
              title="View video"
            >
              <Play className="w-3 h-3" />
              Video
            </button>
          )}
          {result.screenshotUrl && (
            <button
              onClick={() => onViewScreenshot?.(result.id, result.screenshotUrl!)}
              className="flex items-center gap-1 px-2 py-1 bg-dark-card/50 hover:bg-dark-elevated/50 text-text-secondary hover:text-accent-purple rounded text-xs transition-colors"
              title="View screenshot"
            >
              <Image className="w-3 h-3" />
              Screenshot
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TestResultCard;
