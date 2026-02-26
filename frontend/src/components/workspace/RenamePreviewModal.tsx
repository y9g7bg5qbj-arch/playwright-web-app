import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ChevronDown, ChevronRight, FileText, ArrowRight } from 'lucide-react';
import type { RenamePreviewResult } from '@/api/vero';

interface RenamePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isApplying: boolean;
  preview: RenamePreviewResult | null;
}

export function RenamePreviewModal({
  isOpen,
  onClose,
  onConfirm,
  isApplying,
  preview,
}: RenamePreviewModalProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  if (!preview) return null;

  const toggleFile = (path: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedFiles(new Set(preview.affectedFiles.map(f => f.relativePath)));
  };

  const collapseAll = () => {
    setExpandedFiles(new Set());
  };

  const fileCount = preview.affectedFiles.length;
  const hasPageChange = preview.pageFile.oldContent !== preview.pageFile.newContent;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rename Page References"
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isApplying}
            className="px-3 py-1.5 text-xs font-medium text-text-secondary bg-dark-elevated border border-border-default rounded hover:border-border-emphasis hover:text-text-primary transition-colors duration-fast disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isApplying}
            className="px-3 py-1.5 text-xs font-medium text-white bg-brand-primary rounded hover:brightness-110 transition-all duration-fast disabled:opacity-50"
          >
            {isApplying ? 'Applying...' : 'Apply Changes'}
          </button>
        </>
      }
    >
      {/* Summary */}
      <div className="mb-3 p-2.5 bg-dark-elevated rounded border border-border-default">
        <div className="flex items-center gap-2 text-sm text-text-primary">
          <span className="font-mono text-status-danger">{preview.oldPageName}</span>
          <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
          <span className="font-mono text-status-success">{preview.newPageName}</span>
        </div>
        <p className="mt-1 text-xs text-text-secondary">
          {preview.totalOccurrences} reference{preview.totalOccurrences !== 1 ? 's' : ''} in{' '}
          {fileCount} file{fileCount !== 1 ? 's' : ''}
          {hasPageChange ? ' + PAGE declaration update' : ''}
        </p>
      </div>

      {/* Expand/Collapse controls */}
      {fileCount > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={expandAll}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Expand all
          </button>
          <span className="text-text-muted text-xs">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Collapse all
          </button>
        </div>
      )}

      {/* PAGE declaration change */}
      {hasPageChange && (
        <div className="mb-2 border border-border-default rounded overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-elevated text-xs">
            <FileText className="w-3.5 h-3.5 text-brand-primary" />
            <span className="text-text-primary font-medium">{preview.pageFile.relativePath}</span>
            <span className="ml-auto text-text-muted">PAGE declaration</span>
          </div>
        </div>
      )}

      {/* Affected files */}
      {preview.affectedFiles.map(file => {
        const isExpanded = expandedFiles.has(file.relativePath);

        return (
          <div
            key={file.relativePath}
            className="mb-1.5 border border-border-default rounded overflow-hidden"
          >
            {/* File header */}
            <button
              onClick={() => toggleFile(file.relativePath)}
              className="w-full flex items-center gap-2 px-3 py-1.5 bg-dark-elevated text-xs hover:bg-white/[0.04] transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-text-muted" />
              ) : (
                <ChevronRight className="w-3 h-3 text-text-muted" />
              )}
              <FileText className="w-3.5 h-3.5 text-text-secondary" />
              <span className="text-text-primary font-medium flex-1 text-left truncate">
                {file.relativePath}
              </span>
              <span className="text-text-muted whitespace-nowrap">
                {file.occurrences} change{file.occurrences !== 1 ? 's' : ''}
              </span>
            </button>

            {/* Line-level diffs */}
            {isExpanded && (
              <div className="border-t border-border-default bg-dark-canvas">
                {file.preview.map((change, idx) => (
                  <div key={idx} className="border-b border-border-default last:border-b-0">
                    {/* Old line */}
                    <div className="flex items-start text-xs font-mono">
                      <span className="w-10 shrink-0 text-right pr-2 py-0.5 text-text-muted bg-status-danger/5 select-none">
                        {change.line}
                      </span>
                      <span className="flex-1 py-0.5 px-2 bg-status-danger/5 text-status-danger/80 whitespace-pre-wrap break-all line-through">
                        {change.oldText.trim()}
                      </span>
                    </div>
                    {/* New line */}
                    <div className="flex items-start text-xs font-mono">
                      <span className="w-10 shrink-0 text-right pr-2 py-0.5 text-text-muted bg-status-success/5 select-none">
                        {change.line}
                      </span>
                      <span className="flex-1 py-0.5 px-2 bg-status-success/5 text-status-success/80 whitespace-pre-wrap break-all">
                        {change.newText.trim()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {fileCount === 0 && !hasPageChange && (
        <p className="text-sm text-text-secondary text-center py-4">
          No references found to update.
        </p>
      )}
    </Modal>
  );
}

export default RenamePreviewModal;
