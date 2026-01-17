import { useState, useCallback, useRef, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monacoEditor from 'monaco-editor';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Copy, Check } from 'lucide-react';
import { type ConflictFile, type DiffHunk } from '@/api/sandbox';
import { type HunkResolution } from './MergeConflictModal';

export interface MergeConflictEditorProps {
  conflict: ConflictFile;
  resolvedContent: string;
  hunkResolutions: Map<string, HunkResolution>;
  onResolveHunk: (hunk: DiffHunk, resolution: 'theirs' | 'yours' | 'both', customContent?: string) => void;
  onContentEdit: (newContent: string) => void;
}

export function MergeConflictEditor({
  conflict,
  resolvedContent,
  hunkResolutions,
  onResolveHunk,
  onContentEdit,
}: MergeConflictEditorProps) {
  const [currentHunkIndex, setCurrentHunkIndex] = useState(0);
  const theirsEditorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const yoursEditorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const resultEditorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const theirsDecorationsRef = useRef<string[]>([]);
  const yoursDecorationsRef = useRef<string[]>([]);

  const currentHunk = conflict.hunks[currentHunkIndex];
  const isHunkResolved = currentHunk ? hunkResolutions.has(currentHunk.id) : false;

  // Navigate to current hunk
  const scrollToHunk = useCallback((hunk: DiffHunk) => {
    if (theirsEditorRef.current) {
      theirsEditorRef.current.revealLineInCenter(hunk.theirsStart);
    }
    if (yoursEditorRef.current) {
      yoursEditorRef.current.revealLineInCenter(hunk.yoursStart);
    }
  }, []);

  // Update decorations to highlight hunks
  const updateDecorations = useCallback(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    // Update theirs editor decorations
    if (theirsEditorRef.current) {
      const theirsDecos: monacoEditor.editor.IModelDeltaDecoration[] = conflict.hunks.map((hunk, idx) => ({
        range: new monaco.Range(hunk.theirsStart, 1, hunk.theirsEnd || hunk.theirsStart, 1),
        options: {
          isWholeLine: true,
          className: idx === currentHunkIndex
            ? 'merge-hunk-highlight-active'
            : hunkResolutions.has(hunk.id)
            ? 'merge-hunk-highlight-resolved'
            : 'merge-hunk-highlight',
          marginClassName: idx === currentHunkIndex ? 'merge-hunk-margin-active' : '',
        },
      }));
      theirsDecorationsRef.current = theirsEditorRef.current.deltaDecorations(
        theirsDecorationsRef.current,
        theirsDecos
      );
    }

    // Update yours editor decorations
    if (yoursEditorRef.current) {
      const yoursDecos: monacoEditor.editor.IModelDeltaDecoration[] = conflict.hunks.map((hunk, idx) => ({
        range: new monaco.Range(hunk.yoursStart, 1, hunk.yoursEnd || hunk.yoursStart, 1),
        options: {
          isWholeLine: true,
          className: idx === currentHunkIndex
            ? 'merge-hunk-highlight-active'
            : hunkResolutions.has(hunk.id)
            ? 'merge-hunk-highlight-resolved'
            : 'merge-hunk-highlight',
          marginClassName: idx === currentHunkIndex ? 'merge-hunk-margin-active' : '',
        },
      }));
      yoursDecorationsRef.current = yoursEditorRef.current.deltaDecorations(
        yoursDecorationsRef.current,
        yoursDecos
      );
    }
  }, [conflict.hunks, currentHunkIndex, hunkResolutions]);

  // Update decorations when hunks or current index changes
  useEffect(() => {
    updateDecorations();
    if (currentHunk) {
      scrollToHunk(currentHunk);
    }
  }, [currentHunk, updateDecorations, scrollToHunk]);

  // Navigate between hunks
  const goToPreviousHunk = () => {
    setCurrentHunkIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextHunk = () => {
    setCurrentHunkIndex(prev => Math.min(conflict.hunks.length - 1, prev + 1));
  };

  // Handle resolution actions
  const handleAcceptTheirs = () => {
    if (currentHunk) {
      onResolveHunk(currentHunk, 'theirs');
      // Auto-advance to next unresolved hunk
      const nextUnresolved = conflict.hunks.findIndex((h, i) => i > currentHunkIndex && !hunkResolutions.has(h.id));
      if (nextUnresolved !== -1) {
        setCurrentHunkIndex(nextUnresolved);
      }
    }
  };

  const handleAcceptYours = () => {
    if (currentHunk) {
      onResolveHunk(currentHunk, 'yours');
      // Auto-advance to next unresolved hunk
      const nextUnresolved = conflict.hunks.findIndex((h, i) => i > currentHunkIndex && !hunkResolutions.has(h.id));
      if (nextUnresolved !== -1) {
        setCurrentHunkIndex(nextUnresolved);
      }
    }
  };

  const handleAcceptBoth = () => {
    if (currentHunk) {
      onResolveHunk(currentHunk, 'both');
      // Auto-advance to next unresolved hunk
      const nextUnresolved = conflict.hunks.findIndex((h, i) => i > currentHunkIndex && !hunkResolutions.has(h.id));
      if (nextUnresolved !== -1) {
        setCurrentHunkIndex(nextUnresolved);
      }
    }
  };

  // Handle center pane edits
  const handleResultChange = (value: string | undefined) => {
    if (value !== undefined) {
      onContentEdit(value);
    }
  };

  const handleEditorWillMount = (monaco: Monaco) => {
    monacoRef.current = monaco;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Hunk Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d1117] border-b border-[#30363d]">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousHunk}
            disabled={currentHunkIndex === 0}
            className="p-1.5 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous conflict"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <span className="text-sm text-[#c9d1d9]">
            Conflict {currentHunkIndex + 1} of {conflict.hunks.length}
          </span>
          <button
            onClick={goToNextHunk}
            disabled={currentHunkIndex === conflict.hunks.length - 1}
            className="p-1.5 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next conflict"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Resolution Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAcceptTheirs}
            disabled={!currentHunk}
            className="px-3 py-1.5 text-sm bg-[#1f6feb] hover:bg-[#388bfd] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Accept Theirs
          </button>
          <button
            onClick={handleAcceptBoth}
            disabled={!currentHunk}
            className="px-3 py-1.5 text-sm bg-[#6e40c9] hover:bg-[#8957e5] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Copy className="w-4 h-4" />
            Both
          </button>
          <button
            onClick={handleAcceptYours}
            disabled={!currentHunk}
            className="px-3 py-1.5 text-sm bg-[#238636] hover:bg-[#2ea043] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Accept Yours
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          {isHunkResolved && (
            <span className="flex items-center gap-1 text-sm text-[#3fb950]">
              <Check className="w-4 h-4" />
              Resolved
            </span>
          )}
        </div>
      </div>

      {/* Three-Pane Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Theirs (Left) */}
        <div className="flex-1 flex flex-col border-r border-[#30363d] min-w-0">
          <div className="px-3 py-2 bg-[#161b22] border-b border-[#30363d]">
            <span className="text-xs font-semibold text-[#58a6ff] uppercase tracking-wide">
              Theirs (Source)
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language="vero"
              theme="vs-dark"
              value={conflict.theirsContent}
              beforeMount={handleEditorWillMount}
              onMount={(editor) => {
                theirsEditorRef.current = editor;
                updateDecorations();
              }}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                renderLineHighlight: 'none',
                domReadOnly: true,
              }}
            />
          </div>
        </div>

        {/* Result (Center - Editable) */}
        <div className="flex-1 flex flex-col border-r border-[#30363d] min-w-0">
          <div className="px-3 py-2 bg-[#161b22] border-b border-[#30363d]">
            <span className="text-xs font-semibold text-[#f0883e] uppercase tracking-wide">
              Result (Editable)
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language="vero"
              theme="vs-dark"
              value={resolvedContent}
              onChange={handleResultChange}
              onMount={(editor) => {
                resultEditorRef.current = editor;
              }}
              options={{
                readOnly: false,
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                renderLineHighlight: 'line',
              }}
            />
          </div>
        </div>

        {/* Yours (Right) */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-3 py-2 bg-[#161b22] border-b border-[#30363d]">
            <span className="text-xs font-semibold text-[#3fb950] uppercase tracking-wide">
              Yours (Sandbox)
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language="vero"
              theme="vs-dark"
              value={conflict.yoursContent}
              onMount={(editor) => {
                yoursEditorRef.current = editor;
                updateDecorations();
              }}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                renderLineHighlight: 'none',
                domReadOnly: true,
              }}
            />
          </div>
        </div>
      </div>

      {/* Inline styles for hunk highlighting */}
      <style>{`
        .merge-hunk-highlight {
          background-color: rgba(139, 148, 158, 0.1) !important;
        }
        .merge-hunk-highlight-active {
          background-color: rgba(240, 136, 62, 0.2) !important;
          border-left: 3px solid #f0883e !important;
        }
        .merge-hunk-highlight-resolved {
          background-color: rgba(63, 185, 80, 0.1) !important;
        }
        .merge-hunk-margin-active {
          background-color: #f0883e !important;
          width: 3px !important;
        }
      `}</style>
    </div>
  );
}

export default MergeConflictEditor;
