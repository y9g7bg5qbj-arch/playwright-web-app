import { useRef, useEffect } from 'react';

export interface ConsolePanelProps {
  output: string[];
  onClear: () => void;
  onClose: () => void;
}

function getLineColorClass(line: string): string {
  if (line.includes('[ERROR]') || line.includes('Failed')) {
    return 'text-[#f85149]';
  }
  if (line.includes('[WARN]')) {
    return 'text-[#d29922]';
  }
  if (line.includes('[SUCCESS]') || line.includes('passed')) {
    return 'text-[#3fb950]';
  }
  return '';
}

export function ConsolePanel({ output, onClear, onClose }: ConsolePanelProps): JSX.Element {
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      {/* Header */}
      <div className="h-9 px-4 flex items-center justify-between border-b border-[#30363d] bg-[#161b22] shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#8b949e] text-lg">terminal</span>
          <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
            Console Output
          </span>
          <span className="text-xs text-[#6e7681] ml-2">
            {output.length} {output.length === 1 ? 'line' : 'lines'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClear}
            className="p-1.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors"
            title="Clear console"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors"
            title="Close console"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        className="flex-1 overflow-auto p-3 font-mono text-xs text-[#e6edf3]"
      >
        {output.length === 0 ? (
          <div className="text-[#6e7681] italic">No output yet...</div>
        ) : (
          output.map((line, index) => (
            <div
              key={index}
              className={`whitespace-pre-wrap py-0.5 ${getLineColorClass(line)}`}
            >
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
