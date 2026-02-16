import { FileCode, Check, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui';
import { type ConflictFile } from '@/api/sandbox';

export interface ConflictFileListProps {
  conflicts: ConflictFile[];
  selectedIndex: number;
  onSelectFile: (index: number) => void;
  getResolvedCount: (filePath: string) => number;
}

export function ConflictFileList({
  conflicts,
  selectedIndex,
  onSelectFile,
  getResolvedCount,
}: ConflictFileListProps) {
  return (
    <div className="w-64 border-r border-border-default bg-dark-canvas flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border-default bg-dark-card">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Files ({conflicts.length})
        </h3>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto py-1">
        {conflicts.map((conflict, index) => {
          const fileName = conflict.filePath.split('/').pop() || conflict.filePath;
          const dirPath = conflict.filePath.split('/').slice(0, -1).join('/');
          const totalHunks = conflict.hunks.length;
          const resolvedCount = getResolvedCount(conflict.filePath);
          const isFullyResolved = resolvedCount >= totalHunks;
          const isSelected = index === selectedIndex;

          return (
            <button
              key={conflict.filePath}
              onClick={() => onSelectFile(index)}
              className={`w-full px-3 py-2 flex items-start gap-2 text-left transition-colors ${
                isSelected
                  ? 'bg-brand-primary/20 border-l-2 border-brand-secondary'
                  : 'hover:bg-dark-elevated border-l-2 border-transparent'
              }`}
            >
              {/* Status indicator */}
              <div className="mt-0.5 flex-shrink-0">
                {isFullyResolved ? (
                  <Check className="w-4 h-4 text-status-success" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-status-warning" />
                )}
              </div>

              {/* File icon */}
              <FileCode className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                isSelected ? 'text-brand-secondary' : 'text-text-secondary'
              }`} />

              {/* File info */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${
                  isSelected ? 'text-white' : 'text-text-primary'
                }`}>
                  {fileName}
                </div>
                {dirPath && (
                  <div className="text-xs text-text-muted truncate">
                    {dirPath}
                  </div>
                )}
                <div className="mt-1">
                  <Badge variant={isFullyResolved ? 'green' : 'yellow'} size="sm">
                    {resolvedCount}/{totalHunks} resolved
                  </Badge>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="px-3 py-2 border-t border-border-default bg-dark-card">
        <div className="text-xs text-text-secondary">
          {conflicts.filter(c => getResolvedCount(c.filePath) >= c.hunks.length).length} of {conflicts.length} files resolved
        </div>
      </div>
    </div>
  );
}

export default ConflictFileList;
