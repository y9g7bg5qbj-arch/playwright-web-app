import { useRef, useEffect } from 'react';

export interface ConsolePanelProps {
  output: string[];
  onClear: () => void;
  onClose: () => void;
}

function getLineColorClass(line: string): string {
  if (line.includes('[ERROR]') || line.includes('FAILED')) {
    return 'text-status-danger';
  }
  // Step-level errors: indented lines with "Step N" containing error details
  if (/^\s+Step \d+/.test(line.replace(/^\[\d{1,2}:\d{2}:\d{2}[^\]]*\]\s*/, ''))) {
    return 'text-status-danger';
  }
  if (line.includes('Failed') || line.includes('Error:')) {
    return 'text-status-danger';
  }
  if (line.includes('[WARN]') || line.includes('Warning')) {
    return 'text-status-warning';
  }
  if (line.includes('[SUCCESS]') || line.includes('passed') || line.includes('✓')) {
    return 'text-status-success';
  }
  if (line.includes('[INFO]') || line.includes('Running ')) {
    return 'text-status-info';
  }
  return 'text-text-secondary';
}

export function ConsolePanel({ output, onClear, onClose }: ConsolePanelProps): JSX.Element {
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="h-full flex flex-col bg-dark-canvas">
      {/* Header */}
      <div className="h-8 px-3 flex items-center justify-between border-b border-border-default bg-dark-primary shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-text-muted text-[14px]">terminal</span>
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
            Console
          </span>
          <span className="text-[10px] text-text-muted ml-1 tabular-nums">
            {output.length} {output.length === 1 ? 'line' : 'lines'}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onClear}
            className="p-1 rounded hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors duration-fast"
            title="Clear console"
          >
            <span className="material-symbols-outlined text-[14px]">delete</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors duration-fast"
            title="Close console"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        className="flex-1 overflow-auto p-2 font-mono text-[11px] leading-relaxed"
      >
        {output.length === 0 ? (
          <div className="text-text-muted italic">No output yet...</div>
        ) : (
          output.map((line, index) => (
            <div
              key={index}
              className={`whitespace-pre-wrap py-px flex ${getLineColorClass(line)}`}
            >
              <span className="w-8 text-text-muted/50 select-none shrink-0 text-right pr-2 tabular-nums">{index + 1}</span>
              <span>{line}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
