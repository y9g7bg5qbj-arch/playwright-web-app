// design-lint-ignore NO_HARDCODED_MODAL — full-screen 95vw/90vh layout exceeds Modal's max-w-4xl; interior controls use shared primitives
import { useState, useEffect, useCallback } from 'react';
import { X, GitMerge, ChevronLeft, ChevronRight, AlertCircle, Check } from 'lucide-react';
import { IconButton, Button, Badge } from '@/components/ui';
import { type ConflictFile, type DiffHunk } from '@/api/sandbox';
import { ConflictFileList } from './ConflictFileList';
import { MergeConflictEditor } from './MergeConflictEditor';

export interface MergeConflictModalProps {
  isOpen: boolean;
  sandboxName: string;
  sourceBranch: string;
  conflicts: ConflictFile[];
  onClose: () => void;
  onResolve: (resolutions: Record<string, string>) => void;
}

export interface HunkResolution {
  hunkId: string;
  resolution: 'theirs' | 'yours' | 'both' | 'custom';
  customContent?: string;
}

export interface FileResolution {
  filePath: string;
  resolvedContent: string;
  hunkResolutions: Map<string, HunkResolution>;
  isFullyResolved: boolean;
}

export function MergeConflictModal({
  isOpen,
  sandboxName,
  sourceBranch,
  conflicts,
  onClose,
  onResolve,
}: MergeConflictModalProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [fileResolutions, setFileResolutions] = useState<Map<string, FileResolution>>(new Map());
  const [isApplying, setIsApplying] = useState(false);

  // Initialize file resolutions when conflicts change
  useEffect(() => {
    if (!conflicts.length) return;

    const initialResolutions = new Map<string, FileResolution>();
    for (const conflict of conflicts) {
      initialResolutions.set(conflict.filePath, {
        filePath: conflict.filePath,
        resolvedContent: conflict.yoursContent, // Start with "yours" as base
        hunkResolutions: new Map(),
        isFullyResolved: false,
      });
    }
    setFileResolutions(initialResolutions);
    setSelectedFileIndex(0);
  }, [conflicts]);

  const selectedConflict = conflicts[selectedFileIndex];
  const selectedResolution = selectedConflict
    ? fileResolutions.get(selectedConflict.filePath)
    : undefined;

  // Count resolved hunks for a file
  const getResolvedHunkCount = useCallback((filePath: string): number => {
    const resolution = fileResolutions.get(filePath);
    return resolution ? resolution.hunkResolutions.size : 0;
  }, [fileResolutions]);

  // Check if all files are fully resolved
  const allFilesResolved = useCallback((): boolean => {
    for (const conflict of conflicts) {
      const resolution = fileResolutions.get(conflict.filePath);
      if (!resolution || resolution.hunkResolutions.size < conflict.hunks.length) {
        return false;
      }
    }
    return true;
  }, [conflicts, fileResolutions]);

  // Handle hunk resolution
  const handleHunkResolution = useCallback((
    hunk: DiffHunk,
    resolution: 'theirs' | 'yours' | 'both',
    customContent?: string
  ) => {
    if (!selectedConflict) return;

    setFileResolutions(prev => {
      const newMap = new Map(prev);
      const fileRes = newMap.get(selectedConflict.filePath);

      if (!fileRes) return prev;

      const newHunkResolutions = new Map(fileRes.hunkResolutions);
      newHunkResolutions.set(hunk.id, {
        hunkId: hunk.id,
        resolution: customContent ? 'custom' : resolution,
        customContent,
      });

      // Recalculate resolved content
      let newContent = selectedConflict.yoursContent;
      const lines = newContent.split('\n');

      // Apply resolutions in reverse order to preserve line numbers
      const sortedHunks = [...selectedConflict.hunks].sort((a, b) => b.yoursStart - a.yoursStart);

      for (const h of sortedHunks) {
        const hunkRes = newHunkResolutions.get(h.id);
        if (hunkRes) {
          let newLines: string[];
          if (hunkRes.resolution === 'theirs') {
            newLines = h.theirsLines;
          } else if (hunkRes.resolution === 'yours') {
            newLines = h.yoursLines;
          } else if (hunkRes.resolution === 'both') {
            newLines = [...h.theirsLines, ...h.yoursLines];
          } else if (hunkRes.customContent !== undefined) {
            newLines = hunkRes.customContent.split('\n');
          } else {
            continue;
          }

          const startIdx = h.yoursStart - 1;
          const deleteCount = h.yoursEnd - h.yoursStart + 1;
          lines.splice(startIdx, deleteCount, ...newLines);
        }
      }

      newContent = lines.join('\n');

      newMap.set(selectedConflict.filePath, {
        ...fileRes,
        resolvedContent: newContent,
        hunkResolutions: newHunkResolutions,
        isFullyResolved: newHunkResolutions.size >= selectedConflict.hunks.length,
      });

      return newMap;
    });
  }, [selectedConflict]);

  // Handle content edit in center pane
  const handleContentEdit = useCallback((newContent: string) => {
    if (!selectedConflict) return;

    setFileResolutions(prev => {
      const newMap = new Map(prev);
      const fileRes = newMap.get(selectedConflict.filePath);

      if (!fileRes) return prev;

      // Mark all hunks as resolved with custom content
      const newHunkResolutions = new Map<string, HunkResolution>();
      for (const hunk of selectedConflict.hunks) {
        newHunkResolutions.set(hunk.id, {
          hunkId: hunk.id,
          resolution: 'custom',
          customContent: undefined, // Content is managed at file level
        });
      }

      newMap.set(selectedConflict.filePath, {
        ...fileRes,
        resolvedContent: newContent,
        hunkResolutions: newHunkResolutions,
        isFullyResolved: true,
      });

      return newMap;
    });
  }, [selectedConflict]);

  // Navigate between files
  const goToPreviousFile = () => {
    setSelectedFileIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextFile = () => {
    setSelectedFileIndex(prev => Math.min(conflicts.length - 1, prev + 1));
  };

  // Apply all resolutions
  const handleApplyAll = async () => {
    setIsApplying(true);
    try {
      const resolutions: Record<string, string> = {};
      for (const [filePath, resolution] of fileResolutions) {
        resolutions[filePath] = resolution.resolvedContent;
      }
      await onResolve(resolutions);
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  const totalHunks = conflicts.reduce((sum, c) => sum + c.hunks.length, 0);
  const resolvedHunks = conflicts.reduce((sum, c) => sum + getResolvedHunkCount(c.filePath), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-[95vw] h-[90vh] max-w-[1600px] bg-dark-canvas border border-border-default rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-dark-card">
          <div className="flex items-center gap-3">
            <GitMerge className="w-5 h-5 text-accent-orange" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                Sync Conflicts: {sandboxName}
              </h2>
              <p className="text-xs text-text-secondary">
                Syncing from: <span className="text-brand-secondary">{sourceBranch}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Progress indicator */}
            <Badge variant={allFilesResolved() ? 'green' : 'yellow'}>
              {allFilesResolved() ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              {resolvedHunks}/{totalHunks} hunks resolved
            </Badge>
            <IconButton
              icon={<X className="w-5 h-5" />}
              variant="ghost"
              tooltip="Close"
              onClick={onClose}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* File List Sidebar */}
          <ConflictFileList
            conflicts={conflicts}
            selectedIndex={selectedFileIndex}
            onSelectFile={setSelectedFileIndex}
            getResolvedCount={getResolvedHunkCount}
          />

          {/* Merge Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* File Navigation */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-dark-card">
              <div className="flex items-center gap-2">
                <IconButton
                  icon={<ChevronLeft className="w-5 h-5" />}
                  variant="ghost"
                  tooltip="Previous file"
                  disabled={selectedFileIndex === 0}
                  onClick={goToPreviousFile}
                />
                <span className="text-sm text-text-primary font-mono">
                  {selectedConflict?.filePath.split('/').pop()}
                </span>
                <IconButton
                  icon={<ChevronRight className="w-5 h-5" />}
                  variant="ghost"
                  tooltip="Next file"
                  disabled={selectedFileIndex === conflicts.length - 1}
                  onClick={goToNextFile}
                />
              </div>
              <span className="text-sm text-text-secondary">
                {selectedFileIndex + 1} / {conflicts.length}
              </span>
            </div>

            {/* Three-Pane Editor */}
            {selectedConflict && (
              <MergeConflictEditor
                conflict={selectedConflict}
                resolvedContent={selectedResolution?.resolvedContent || selectedConflict.yoursContent}
                hunkResolutions={selectedResolution?.hunkResolutions || new Map()}
                onResolveHunk={handleHunkResolution}
                onContentEdit={handleContentEdit}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-default bg-dark-card">
          <div className="text-sm text-text-secondary">
            {allFilesResolved() ? (
              <span className="text-status-success flex items-center gap-1">
                <Check className="w-4 h-4" />
                All conflicts resolved
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-accent-orange" />
                Resolve all hunks to apply
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="success"
              leftIcon={<GitMerge className="w-4 h-4" />}
              isLoading={isApplying}
              disabled={!allFilesResolved()}
              onClick={handleApplyAll}
            >
              Apply & Sync
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MergeConflictModal;
