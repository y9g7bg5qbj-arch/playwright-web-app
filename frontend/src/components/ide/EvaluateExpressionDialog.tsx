import { useState, useRef, useEffect } from 'react';
import { Play, ChevronRight, ChevronDown } from 'lucide-react';
import { Modal, Button } from '@/components/ui';

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
    return <span className="text-text-secondary">null</span>;
  }
  if (value === undefined) {
    return <span className="text-text-secondary">undefined</span>;
  }
  if (typeof value === 'string') {
    return <span className="text-status-success">"{value}"</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-status-info">{value}</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="text-status-warning">{value.toString()}</span>;
  }
  if (typeof value === 'function') {
    return <span className="text-accent-purple">[Function]</span>;
  }
  if (typeof value === 'object') {
    const isArray = Array.isArray(value);
    const entries = Object.entries(value);
    const preview = isArray ? `Array(${entries.length})` : `Object`;

    if (entries.length === 0) {
      return <span className="text-text-secondary">{isArray ? '[]' : '{}'}</span>;
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
          <span className="text-accent-purple">{preview}</span>
        </button>
        {expanded && (
          <div className="ml-4 border-l border-border-default pl-2 mt-1">
            {entries.slice(0, 50).map(([key, val]) => (
              <div key={key} className="flex items-start gap-2">
                <span className="text-text-secondary">{key}:</span>
                <ValueDisplay value={val} depth={depth + 1} />
              </div>
            ))}
            {entries.length > 50 && (
              <div className="text-text-muted italic">
                ... {entries.length - 50} more items
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return <span className="text-text-secondary">{String(value)}</span>;
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Evaluate Expression"
      size="lg"
      bodyClassName="max-h-[70vh]"
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="flex flex-col gap-3">
        {!isPaused && (
          <div className="text-xs text-status-warning bg-status-warning/30 px-3 py-2 rounded">
            Evaluation is only available when paused at a breakpoint.
          </div>
        )}

        {/* Expression input */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-secondary">
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
              className="flex-1 bg-dark-card border border-border-default rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-status-info resize-none disabled:opacity-50"
            />
            <button
              onClick={handleEvaluate}
              disabled={!expression.trim() || isEvaluating || !isPaused}
              className="px-3 bg-brand-primary hover:bg-brand-primary/80 disabled:bg-dark-elevated disabled:text-text-secondary text-white rounded flex items-center gap-1 text-sm"
            >
              <Play className="w-3 h-3" />
              Evaluate
            </button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-secondary">Result</label>
            <div className="bg-dark-card border border-border-default rounded p-3 font-mono text-sm max-h-60 overflow-y-auto">
              {result.error ? (
                <span className="text-status-danger">{result.error}</span>
              ) : (
                <ValueDisplay value={result.value} />
              )}
            </div>
          </div>
        )}

        {/* History hint */}
        {history.length > 0 && (
          <div className="text-xs text-text-muted">
            Use ↑/↓ arrows to navigate expression history
          </div>
        )}
      </div>
    </Modal>
  );
}
