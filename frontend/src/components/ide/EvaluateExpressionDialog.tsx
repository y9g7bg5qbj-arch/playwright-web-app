import { useState, useRef, useEffect } from 'react';
import { X, Play, Terminal, ChevronRight, ChevronDown } from 'lucide-react';

interface EvaluateExpressionDialogProps {
  isOpen: boolean;
  isPaused: boolean;
  onClose: () => void;
  onEvaluate: (expression: string) => Promise<{ value?: any; error?: string }>;
}

/**
 * Recursive component for displaying object/array values
 */
function ValueDisplay({ value, depth = 0 }: { value: any; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (value === null) {
    return <span className="text-gray-500">null</span>;
  }
  if (value === undefined) {
    return <span className="text-gray-500">undefined</span>;
  }
  if (typeof value === 'string') {
    return <span className="text-green-400">"{value}"</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-blue-400">{value}</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="text-yellow-400">{value.toString()}</span>;
  }
  if (typeof value === 'function') {
    return <span className="text-purple-400">[Function]</span>;
  }
  if (typeof value === 'object') {
    const isArray = Array.isArray(value);
    const entries = Object.entries(value);
    const preview = isArray ? `Array(${entries.length})` : `Object`;

    if (entries.length === 0) {
      return <span className="text-gray-400">{isArray ? '[]' : '{}'}</span>;
    }

    return (
      <div className="inline">
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-0.5 hover:text-white"
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <span className="text-purple-400">{preview}</span>
        </button>
        {expanded && (
          <div className="ml-4 border-l border-gray-700 pl-2 mt-1">
            {entries.slice(0, 50).map(([key, val]) => (
              <div key={key} className="flex items-start gap-2">
                <span className="text-gray-500">{key}:</span>
                <ValueDisplay value={val} depth={depth + 1} />
              </div>
            ))}
            {entries.length > 50 && (
              <div className="text-gray-600 italic">
                ... {entries.length - 50} more items
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return <span className="text-gray-400">{String(value)}</span>;
}

/**
 * Evaluate Expression Dialog
 * Similar to IntelliJ's Alt+F8 evaluate expression
 */
export function EvaluateExpressionDialog({
  isOpen,
  isPaused,
  onClose,
  onEvaluate,
}: EvaluateExpressionDialogProps) {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState<{ value?: any; error?: string } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // Reset history index when expression changes
  useEffect(() => {
    setHistoryIndex(-1);
  }, [expression]);

  const handleEvaluate = async () => {
    if (!expression.trim() || isEvaluating) return;

    setIsEvaluating(true);
    setResult(null);

    try {
      const evalResult = await onEvaluate(expression.trim());
      setResult(evalResult);
      // Add to history if not already the last entry
      if (history[0] !== expression.trim()) {
        setHistory(prev => [expression.trim(), ...prev.slice(0, 19)]);
      }
    } catch (error: any) {
      setResult({ error: error.message || 'Evaluation failed' });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEvaluate();
    } else if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowUp' && history.length > 0) {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIndex);
      setExpression(history[newIndex]);
    } else if (e.key === 'ArrowDown' && historyIndex > -1) {
      e.preventDefault();
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setExpression(newIndex >= 0 ? history[newIndex] : '');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
            <Terminal className="w-4 h-4" />
            Evaluate Expression
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3">
          {!isPaused && (
            <div className="text-xs text-yellow-400 bg-yellow-900/30 px-3 py-2 rounded">
              Evaluation is only available when paused at a breakpoint.
            </div>
          )}

          {/* Expression input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">
              Expression (Enter to evaluate, Shift+Enter for newline)
            </label>
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="page.url(), $username, 1 + 2, etc."
                disabled={!isPaused}
                rows={2}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-gray-200 focus:outline-none focus:border-blue-500 resize-none disabled:opacity-50"
              />
              <button
                onClick={handleEvaluate}
                disabled={!expression.trim() || isEvaluating || !isPaused}
                className="px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded flex items-center gap-1 text-sm"
              >
                <Play className="w-3 h-3" />
                Evaluate
              </button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Result</label>
              <div className="bg-gray-800 border border-gray-700 rounded p-3 font-mono text-sm max-h-60 overflow-y-auto">
                {result.error ? (
                  <span className="text-red-400">{result.error}</span>
                ) : (
                  <ValueDisplay value={result.value} />
                )}
              </div>
            </div>
          )}

          {/* History hint */}
          {history.length > 0 && (
            <div className="text-xs text-gray-600">
              Use ↑/↓ arrows to navigate expression history
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
