import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { runConfigTheme, cx } from './theme';

interface WorkflowFileSetupProps {
  status: 'unknown' | 'checking' | 'not-found' | 'found' | 'pushing' | 'error';
  error: string | null;
  onSetup: () => void;
}

export function WorkflowFileSetup({ status, error, onSetup }: WorkflowFileSetupProps) {
  if (status === 'unknown' || status === 'checking') {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking workflow file...
      </div>
    );
  }

  if (status === 'pushing') {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Setting up workflow file...
      </div>
    );
  }

  if (status === 'found') {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-md border border-status-success/20 bg-status-success/5 px-3 py-2">
        <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />
        <div className="flex-1">
          <span className="text-xs text-text-secondary">Workflow file ready</span>
          <p className="font-mono text-xs text-text-muted">.github/workflows/vero-tests.yml</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2 text-xs text-status-danger">
          <AlertCircle className="h-3.5 w-3.5" />
          {error || 'Failed to check workflow file'}
        </div>
        <button
          type="button"
          onClick={onSetup}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            'border border-border-default bg-dark-elevated text-text-secondary hover:bg-white/[0.06] hover:text-text-primary'
          )}
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  // not-found
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2 text-xs text-status-warning">
        <AlertCircle className="h-3.5 w-3.5" />
        Workflow file not found in repository
      </div>
      <button
        type="button"
        onClick={onSetup}
        className={cx(
          'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
          'bg-brand-primary text-white hover:bg-brand-hover'
        )}
      >
        Set up workflow file
      </button>
      <p className="text-xs text-text-muted">
        This will commit <code className={cx(runConfigTheme.code, 'px-1 py-0.5 text-[10px]')}>.github/workflows/vero-tests.yml</code> to your repository.
      </p>
    </div>
  );
}
