import { useState, useEffect } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X,
  GitBranch,
  Box,
  RefreshCw,
} from 'lucide-react';
import { Tooltip } from '@/components/ui';
import {
  compareApi,
  type CompareEnvironment,
  type FileComparisonResult,
  type FileDiffLine,
} from '@/api/sandbox';

export interface CompareTabProps {
  projectId: string;
  filePath: string;
  initialSource?: string;
  initialTarget?: string;
  onClose?: () => void;
  onApplyChanges?: (content: string) => void;
}

export function CompareTab({
  projectId,
  filePath,
  initialSource = 'dev',
  initialTarget,
  onClose,
  onApplyChanges,
}: CompareTabProps) {
  const [environments, setEnvironments] = useState<CompareEnvironment[]>([]);
  const [source, setSource] = useState(initialSource);
  const [target, setTarget] = useState(initialTarget || '');
  const [comparison, setComparison] = useState<FileComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentHunkIndex, setCurrentHunkIndex] = useState(0);

  // Fetch environments on mount
  useEffect(() => {
    const fetchEnvironments = async () => {
      try {
        const envs = await compareApi.getEnvironments(projectId);
        setEnvironments(envs);

        // Set default target if not provided
        if (!initialTarget && envs.length > 1) {
          // Find a different environment than source
          const defaultTarget = envs.find(e => e.id !== initialSource);
          if (defaultTarget) {
            setTarget(defaultTarget.id);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load environments');
      }
    };
    fetchEnvironments();
  }, [projectId, initialSource, initialTarget]);

  // Fetch comparison when source/target change
  useEffect(() => {
    if (!source || !target) return;

    const fetchComparison = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await compareApi.compareFile(projectId, source, target, filePath);
        setComparison(result);
        setCurrentHunkIndex(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to compare files');
      } finally {
        setIsLoading(false);
      }
    };
    fetchComparison();
  }, [projectId, source, target, filePath]);

  const getEnvironmentIcon = (envId: string) => {
    if (envId === 'dev' || envId === 'master') {
      return <GitBranch className="w-4 h-4" />;
    }
    return <Box className="w-4 h-4" />;
  };

  const getEnvironmentColor = (envId: string) => {
    if (envId === 'master') return 'text-status-success';
    if (envId === 'dev') return 'text-status-info';
    return 'text-accent-purple';
  };

  const getEnvironmentName = (envId: string) => {
    const env = environments.find(e => e.id === envId);
    return env?.name || envId;
  };

  const totalHunks = comparison?.diff.hunks.length || 0;

  const navigateHunk = (direction: 'prev' | 'next') => {
    if (direction === 'next' && currentHunkIndex < totalHunks - 1) {
      setCurrentHunkIndex(currentHunkIndex + 1);
    } else if (direction === 'prev' && currentHunkIndex > 0) {
      setCurrentHunkIndex(currentHunkIndex - 1);
    }
  };

  const handleCopyToTarget = () => {
    if (comparison?.source.content && onApplyChanges) {
      onApplyChanges(comparison.source.content);
    }
  };

  const handleSwap = () => {
    const temp = source;
    setSource(target);
    setTarget(temp);
  };

  return (
    <div className="h-full flex flex-col bg-dark-canvas">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-dark-card border-b border-border-default">
        <div className="flex items-center gap-4">
          {/* Source selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary uppercase">Source</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={`px-2 py-1 text-sm bg-dark-elevated border border-border-default rounded ${getEnvironmentColor(source)}`}
            >
              {environments.map(env => (
                <option key={env.id} value={env.id}>{env.name}</option>
              ))}
            </select>
          </div>

          {/* Swap button */}
          <Tooltip content="Swap source and target" showDelayMs={0} hideDelayMs={0}>
            <button
              onClick={handleSwap}
              className="p-1 text-text-secondary hover:text-white hover:bg-dark-elevated rounded"
              aria-label="Swap source and target"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </Tooltip>

          {/* Target selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary uppercase">Target</span>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={`px-2 py-1 text-sm bg-dark-elevated border border-border-default rounded ${getEnvironmentColor(target)}`}
            >
              {environments.map(env => (
                <option key={env.id} value={env.id}>{env.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation and actions */}
        <div className="flex items-center gap-2">
          {totalHunks > 0 && (
            <>
              <Tooltip content="Previous change" showDelayMs={0} hideDelayMs={0}>
                <button
                  onClick={() => navigateHunk('prev')}
                  disabled={currentHunkIndex === 0}
                  className="p-1 text-text-secondary hover:text-white hover:bg-dark-elevated rounded disabled:opacity-50"
                  aria-label="Previous change"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </Tooltip>
              <span className="text-xs text-text-secondary">
                {currentHunkIndex + 1} / {totalHunks}
              </span>
              <Tooltip content="Next change" showDelayMs={0} hideDelayMs={0}>
                <button
                  onClick={() => navigateHunk('next')}
                  disabled={currentHunkIndex >= totalHunks - 1}
                  className="p-1 text-text-secondary hover:text-white hover:bg-dark-elevated rounded disabled:opacity-50"
                  aria-label="Next change"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </Tooltip>
            </>
          )}

          {onApplyChanges && comparison?.source.content && (
            <button
              onClick={handleCopyToTarget}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-status-success hover:bg-status-success/90 text-white rounded"
              title="Apply source content to current file"
            >
              <ArrowRight className="w-3 h-3" />
              Apply
            </button>
          )}

          {onClose && (
            <Tooltip content="Close comparison" showDelayMs={0} hideDelayMs={0}>
              <button
                onClick={onClose}
                className="p-1 text-text-secondary hover:text-white hover:bg-dark-elevated rounded"
                aria-label="Close comparison"
              >
                <X className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* File path */}
      <div className="px-4 py-1 text-xs text-text-secondary bg-dark-card border-b border-border-default">
        <span className="font-mono">{filePath}</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-status-danger mb-2">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-brand-secondary hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      ) : comparison ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Source panel */}
          <div className="flex-1 flex flex-col border-r border-border-default">
            <div className={`px-3 py-1.5 text-sm font-medium border-b border-border-default bg-dark-card ${getEnvironmentColor(source)}`}>
              {getEnvironmentIcon(source)}
              <span className="ml-2">{getEnvironmentName(source)}</span>
              {!comparison.source.exists && (
                <span className="ml-2 text-xs text-status-danger">(File does not exist)</span>
              )}
            </div>
            <div className="flex-1 overflow-auto font-mono text-sm">
              {comparison.source.exists ? (
                <DiffContent
                  content={comparison.source.content || ''}
                  hunks={comparison.diff.hunks}
                  side="source"
                  highlightHunk={currentHunkIndex}
                />
              ) : (
                <div className="p-4 text-text-secondary text-center">
                  File does not exist in {getEnvironmentName(source)}
                </div>
              )}
            </div>
          </div>

          {/* Target panel */}
          <div className="flex-1 flex flex-col">
            <div className={`px-3 py-1.5 text-sm font-medium border-b border-border-default bg-dark-card ${getEnvironmentColor(target)}`}>
              {getEnvironmentIcon(target)}
              <span className="ml-2">{getEnvironmentName(target)}</span>
              {!comparison.target.exists && (
                <span className="ml-2 text-xs text-status-danger">(File does not exist)</span>
              )}
            </div>
            <div className="flex-1 overflow-auto font-mono text-sm">
              {comparison.target.exists ? (
                <DiffContent
                  content={comparison.target.content || ''}
                  hunks={comparison.diff.hunks}
                  side="target"
                  highlightHunk={currentHunkIndex}
                />
              ) : (
                <div className="p-4 text-text-secondary text-center">
                  File does not exist in {getEnvironmentName(target)}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-secondary">
          Select source and target environments to compare
        </div>
      )}
    </div>
  );
}

// Diff content renderer
interface DiffContentProps {
  content: string;
  hunks: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: FileDiffLine[];
  }>;
  side: 'source' | 'target';
  highlightHunk: number;
}

function DiffContent({ content, hunks, side, highlightHunk }: DiffContentProps) {
  const lines = content.split('\n');

  // Build a map of line numbers to diff status
  const lineStatus = new Map<number, { type: 'add' | 'delete' | 'context'; hunkIndex: number }>();

  hunks.forEach((hunk, hunkIndex) => {
    hunk.lines.forEach(line => {
      const lineNum = side === 'source' ? line.oldLineNumber : line.newLineNumber;
      if (lineNum !== undefined) {
        lineStatus.set(lineNum, { type: line.type as 'add' | 'delete' | 'context', hunkIndex });
      }
    });
  });

  return (
    <table className="w-full border-collapse">
      <tbody>
        {lines.map((line, idx) => {
          const lineNum = idx + 1;
          const status = lineStatus.get(lineNum);
          const isHighlighted = status?.hunkIndex === highlightHunk;

          let bgClass = '';
          let textClass = 'text-text-primary';

          if (status) {
            if (side === 'source' && status.type === 'delete') {
              bgClass = isHighlighted ? 'bg-[var(--bg-danger)]' : 'bg-status-danger/10';
              textClass = 'text-status-danger';
            } else if (side === 'target' && status.type === 'add') {
              bgClass = isHighlighted ? 'bg-[var(--bg-success)]' : 'bg-status-success/10';
              textClass = 'text-status-success';
            }
          }

          return (
            <tr key={lineNum} className={bgClass}>
              <td className="px-2 py-0 text-right text-text-muted select-none w-12 border-r border-border-default">
                {lineNum}
              </td>
              <td className={`px-3 py-0 whitespace-pre ${textClass}`}>
                {line}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default CompareTab;
