import React, { useEffect, useState } from 'react';
import { FileText, Columns2, List, Plus, Minus } from 'lucide-react';
import { useSandboxStore } from '@/store/sandboxStore';
import type { DiffHunk, DiffLine } from '@/api/pullRequest';

interface DiffViewerProps {
  prId: string;
  filePath: string;
}

type ViewMode = 'split' | 'unified';

export const DiffViewer: React.FC<DiffViewerProps> = ({ prId, filePath }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('unified');

  const { currentFileDiff, fetchFileDiff, isLoading } = useSandboxStore();

  useEffect(() => {
    if (prId && filePath) {
      fetchFileDiff(prId, filePath);
    }
  }, [prId, filePath, fetchFileDiff]);

  if (isLoading || !currentFileDiff) {
    return (
      <div className="bg-dark-card border border-border-default rounded-lg overflow-hidden">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-blue"></div>
        </div>
      </div>
    );
  }

  const diff = currentFileDiff;

  const getChangeTypeColor = () => {
    switch (diff.changeType) {
      case 'added': return 'text-status-success';
      case 'deleted': return 'text-status-danger';
      default: return 'text-status-warning';
    }
  };

  const getChangeTypeLabel = () => {
    switch (diff.changeType) {
      case 'added': return 'Added';
      case 'deleted': return 'Deleted';
      default: return 'Modified';
    }
  };

  return (
    <div className="bg-dark-card border border-border-default rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-dark-elevated border-b border-border-default">
        <div className="flex items-center gap-3">
          <FileText className={`w-4 h-4 ${getChangeTypeColor()}`} />
          <span className="text-sm font-mono text-text-primary">{diff.filePath}</span>
          <span className={`text-xs ${getChangeTypeColor()}`}>{getChangeTypeLabel()}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-status-success">
              <Plus className="w-3 h-3" />
              {diff.additions}
            </span>
            <span className="flex items-center gap-1 text-status-danger">
              <Minus className="w-3 h-3" />
              {diff.deletions}
            </span>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center bg-dark-bg rounded-md overflow-hidden border border-border-default">
            <button
              onClick={() => setViewMode('unified')}
              className={`px-2 py-1 text-xs flex items-center gap-1 ${
                viewMode === 'unified'
                  ? 'bg-accent-blue text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Unified view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-1 text-xs flex items-center gap-1 ${
                viewMode === 'split'
                  ? 'bg-accent-blue text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Split view"
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Diff content */}
      <div className="overflow-x-auto">
        {diff.hunks.length === 0 ? (
          <div className="p-4 text-sm text-text-muted text-center">
            No changes to display
          </div>
        ) : viewMode === 'unified' ? (
          <UnifiedDiffView hunks={diff.hunks} />
        ) : (
          <SplitDiffView hunks={diff.hunks} />
        )}
      </div>
    </div>
  );
};

// Unified diff view (GitHub-style)
const UnifiedDiffView: React.FC<{ hunks: DiffHunk[] }> = ({ hunks }) => {
  return (
    <table className="w-full text-sm font-mono">
      <tbody>
        {hunks.map((hunk, hunkIdx) => (
          <React.Fragment key={hunkIdx}>
            {/* Hunk header */}
            <tr className="bg-status-info/10">
              <td
                colSpan={3}
                className="px-4 py-1 text-xs text-status-info"
              >
                @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
              </td>
            </tr>

            {/* Lines */}
            {hunk.lines.map((line, lineIdx) => (
              <DiffLineRow key={lineIdx} line={line} unified />
            ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
};

// Split diff view (side-by-side)
const SplitDiffView: React.FC<{ hunks: DiffHunk[] }> = ({ hunks }) => {
  // Process hunks into paired lines for split view
  const processHunksForSplit = (hunks: DiffHunk[]) => {
    const rows: { left: DiffLine | null; right: DiffLine | null }[] = [];

    hunks.forEach((hunk) => {
      // Add hunk separator
      rows.push({ left: null, right: null });

      let i = 0;
      while (i < hunk.lines.length) {
        const line = hunk.lines[i];

        if (line.type === 'context') {
          rows.push({ left: line, right: line });
          i++;
        } else if (line.type === 'delete') {
          // Look ahead for corresponding addition
          let j = i + 1;
          while (j < hunk.lines.length && hunk.lines[j].type === 'delete') {
            j++;
          }

          // Collect all deletions
          const deletions = hunk.lines.slice(i, j);

          // Collect corresponding additions
          let k = j;
          while (k < hunk.lines.length && hunk.lines[k].type === 'add') {
            k++;
          }
          const additions = hunk.lines.slice(j, k);

          // Pair them up
          const maxLen = Math.max(deletions.length, additions.length);
          for (let m = 0; m < maxLen; m++) {
            rows.push({
              left: deletions[m] || null,
              right: additions[m] || null,
            });
          }

          i = k;
        } else if (line.type === 'add') {
          // Addition without deletion
          rows.push({ left: null, right: line });
          i++;
        }
      }
    });

    return rows;
  };

  const rows = processHunksForSplit(hunks);

  return (
    <div className="flex">
      {/* Left side (old) */}
      <table className="w-1/2 text-sm font-mono border-r border-border-default">
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {row.left === null && row.right === null ? (
                <td colSpan={2} className="h-6 bg-status-info/10"></td>
              ) : row.left ? (
                <DiffLineRow line={row.left} unified={false} side="left" />
              ) : (
                <td colSpan={2} className="h-6"></td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Right side (new) */}
      <table className="w-1/2 text-sm font-mono">
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {row.left === null && row.right === null ? (
                <td colSpan={2} className="h-6 bg-status-info/10"></td>
              ) : row.right ? (
                <DiffLineRow line={row.right} unified={false} side="right" />
              ) : (
                <td colSpan={2} className="h-6"></td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Single diff line
interface DiffLineRowProps {
  line: DiffLine;
  unified?: boolean;
  side?: 'left' | 'right';
}

const DiffLineRow: React.FC<DiffLineRowProps> = ({ line, unified = true, side }) => {
  const getBgColor = () => {
    if (line.type === 'add') return 'bg-status-success/10';
    if (line.type === 'delete') return 'bg-status-danger/10';
    return '';
  };

  const getTextColor = () => {
    if (line.type === 'add') return 'text-status-success';
    if (line.type === 'delete') return 'text-status-danger';
    return 'text-text-secondary';
  };

  const getPrefix = () => {
    if (line.type === 'add') return '+';
    if (line.type === 'delete') return '-';
    return ' ';
  };

  const lineNumber = unified
    ? (line.type === 'delete' ? line.oldLineNumber : line.newLineNumber)
    : (side === 'left' ? line.oldLineNumber : line.newLineNumber);

  if (unified) {
    return (
      <tr className={getBgColor()}>
        <td className="px-2 py-0.5 text-right text-text-muted select-none w-12 border-r border-border-default">
          {line.oldLineNumber || ''}
        </td>
        <td className="px-2 py-0.5 text-right text-text-muted select-none w-12 border-r border-border-default">
          {line.newLineNumber || ''}
        </td>
        <td className={`px-4 py-0.5 whitespace-pre ${getTextColor()}`}>
          <span className="select-none">{getPrefix()}</span>
          {line.content}
        </td>
      </tr>
    );
  }

  return (
    <>
      <td className="px-2 py-0.5 text-right text-text-muted select-none w-12 border-r border-border-default">
        {lineNumber || ''}
      </td>
      <td className={`px-4 py-0.5 whitespace-pre ${getBgColor()} ${getTextColor()}`}>
        {line.content}
      </td>
    </>
  );
};

export default DiffViewer;
