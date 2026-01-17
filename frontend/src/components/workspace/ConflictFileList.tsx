import { FileCode, Check, AlertCircle } from 'lucide-react';
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
    <div className="w-64 border-r border-[#30363d] bg-[#0d1117] flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#30363d] bg-[#161b22]">
        <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wide">
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
                  ? 'bg-[#1f6feb]/20 border-l-2 border-[#58a6ff]'
                  : 'hover:bg-[#21262d] border-l-2 border-transparent'
              }`}
            >
              {/* Status indicator */}
              <div className="mt-0.5 flex-shrink-0">
                {isFullyResolved ? (
                  <Check className="w-4 h-4 text-[#3fb950]" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#f0883e]" />
                )}
              </div>

              {/* File icon */}
              <FileCode className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                isSelected ? 'text-[#58a6ff]' : 'text-[#8b949e]'
              }`} />

              {/* File info */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${
                  isSelected ? 'text-white' : 'text-[#c9d1d9]'
                }`}>
                  {fileName}
                </div>
                {dirPath && (
                  <div className="text-xs text-[#6e7681] truncate">
                    {dirPath}
                  </div>
                )}
                <div className="text-xs mt-1">
                  <span className={isFullyResolved ? 'text-[#3fb950]' : 'text-[#f0883e]'}>
                    {resolvedCount}/{totalHunks} resolved
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="px-3 py-2 border-t border-[#30363d] bg-[#161b22]">
        <div className="text-xs text-[#8b949e]">
          {conflicts.filter(c => getResolvedCount(c.filePath) >= c.hunks.length).length} of {conflicts.length} files resolved
        </div>
      </div>
    </div>
  );
}

export default ConflictFileList;
