import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface Problem {
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line: number;
  column?: number;
}

interface ProblemsPanelProps {
  problems: Problem[];
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (file: string, line: number) => void;
}

export function ProblemsPanel({ problems, isOpen, onClose, onNavigate }: ProblemsPanelProps) {
  if (!isOpen) return null;

  const errors = problems.filter(p => p.severity === 'error').length;
  const warnings = problems.filter(p => p.severity === 'warning').length;

  const getIcon = (severity: Problem['severity']) => {
    switch (severity) {
      case 'error': return <AlertCircle size={14} className="text-red-400 shrink-0" />;
      case 'warning': return <AlertTriangle size={14} className="text-yellow-400 shrink-0" />;
      case 'info': return <Info size={14} className="text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="border-t border-border-primary bg-bg-primary" style={{ height: 200 }}>
      <div className="flex items-center justify-between px-3 py-1 border-b border-border-primary bg-bg-secondary">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-medium text-text-primary uppercase tracking-wide">
            Problems
          </span>
          {errors > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertCircle size={12} /> {errors}
            </span>
          )}
          {warnings > 0 && (
            <span className="flex items-center gap-1 text-yellow-400">
              <AlertTriangle size={12} /> {warnings}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-0.5">
          <X size={14} />
        </button>
      </div>
      <div className="overflow-y-auto" style={{ height: 'calc(100% - 28px)' }}>
        {problems.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-text-tertiary">
            No problems detected
          </div>
        )}
        {problems.map((problem, i) => (
          <div
            key={i}
            className="flex items-start gap-2 px-3 py-1 text-xs cursor-pointer hover:bg-bg-secondary"
            onClick={() => onNavigate(problem.file, problem.line)}
          >
            {getIcon(problem.severity)}
            <span className="flex-1 text-text-secondary">{problem.message}</span>
            <span className="text-text-tertiary shrink-0">
              {problem.file}:{problem.line}
              {problem.column != null ? `:${problem.column}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
