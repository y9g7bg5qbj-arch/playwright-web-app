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
    if (envId === 'master') return 'text-green-400';
    if (envId === 'dev') return 'text-blue-400';
    return 'text-purple-400';
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
    <div className="h-full flex flex-col bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-4">
          {/* Source selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8b949e] uppercase">Source</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={`px-2 py-1 text-sm bg-[#21262d] border border-[#30363d] rounded ${getEnvironmentColor(source)}`}
            >
              {environments.map(env => (
                <option key={env.id} value={env.id}>{env.name}</option>
              ))}
            </select>
          </div>

          {/* Swap button */}
          <button
            onClick={handleSwap}
            className="p-1 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded"
            title="Swap source and target"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Target selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8b949e] uppercase">Target</span>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={`px-2 py-1 text-sm bg-[#21262d] border border-[#30363d] rounded ${getEnvironmentColor(target)}`}
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
              <button
                onClick={() => navigateHunk('prev')}
                disabled={currentHunkIndex === 0}
                className="p-1 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded disabled:opacity-50"
                title="Previous change"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className="text-xs text-[#8b949e]">
                {currentHunkIndex + 1} / {totalHunks}
              </span>
              <button
                onClick={() => navigateHunk('next')}
                disabled={currentHunkIndex >= totalHunks - 1}
                className="p-1 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded disabled:opacity-50"
                title="Next change"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </>
          )}

          {onApplyChanges && comparison?.source.content && (
            <button
              onClick={handleCopyToTarget}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-[#238636] hover:bg-[#2ea043] text-white rounded"
              title="Apply source content to current file"
            >
              <ArrowRight className="w-3 h-3" />
              Apply
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded"
              title="Close comparison"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* File path */}
      <div className="px-4 py-1 text-xs text-[#8b949e] bg-[#161b22] border-b border-[#30363d]">
        <span className="font-mono">{filePath}</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#58a6ff]"></div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[#f85149] mb-2">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-[#58a6ff] hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      ) : comparison ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Source panel */}
          <div className="flex-1 flex flex-col border-r border-[#30363d]">
            <div className={`px-3 py-1.5 text-sm font-medium border-b border-[#30363d] bg-[#161b22] ${getEnvironmentColor(source)}`}>
              {getEnvironmentIcon(source)}
              <span className="ml-2">{getEnvironmentName(source)}</span>
              {!comparison.source.exists && (
                <span className="ml-2 text-xs text-[#f85149]">(File does not exist)</span>
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
                <div className="p-4 text-[#8b949e] text-center">
                  File does not exist in {getEnvironmentName(source)}
                </div>
              )}
            </div>
          </div>

          {/* Target panel */}
          <div className="flex-1 flex flex-col">
            <div className={`px-3 py-1.5 text-sm font-medium border-b border-[#30363d] bg-[#161b22] ${getEnvironmentColor(target)}`}>
              {getEnvironmentIcon(target)}
              <span className="ml-2">{getEnvironmentName(target)}</span>
              {!comparison.target.exists && (
                <span className="ml-2 text-xs text-[#f85149]">(File does not exist)</span>
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
                <div className="p-4 text-[#8b949e] text-center">
                  File does not exist in {getEnvironmentName(target)}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[#8b949e]">
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
          let textClass = 'text-[#c9d1d9]';

          if (status) {
            if (side === 'source' && status.type === 'delete') {
              bgClass = isHighlighted ? 'bg-[#3d1f1f]' : 'bg-[#2d1515]';
              textClass = 'text-[#f85149]';
            } else if (side === 'target' && status.type === 'add') {
              bgClass = isHighlighted ? 'bg-[#1f3d1f]' : 'bg-[#152d15]';
              textClass = 'text-[#3fb950]';
            }
          }

          return (
            <tr key={lineNum} className={bgClass}>
              <td className="px-2 py-0 text-right text-[#484f58] select-none w-12 border-r border-[#30363d]">
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
