import type { ReactNode } from 'react';
import { Database, HardDrive, Plus, RefreshCw, Settings, Upload } from 'lucide-react';
import { Tooltip } from '@/components/ui';

interface CanvasUtilityRailProps {
  onCreateTable: () => void;
  onImportExcel: () => void;
  onRefresh: () => void;
  onOpenEnvironments: () => void;
  onOpenDataStorage: () => void;
  loading?: boolean;
  className?: string;
}

interface RailButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'primary';
  disabled?: boolean;
}

function RailButton({ icon, label, onClick, tone = 'default', disabled = false }: RailButtonProps) {
  const toneClass =
    tone === 'primary'
      ? 'border-brand-primary/45 bg-brand-primary/15 text-brand-secondary hover:bg-brand-primary/20 hover:text-text-primary'
      : 'border-border-default bg-dark-elevated/55 text-text-secondary hover:border-border-emphasis hover:bg-dark-elevated/75 hover:text-text-primary';

  return (
    <Tooltip content={label} showDelayMs={0} hideDelayMs={0} disabled={disabled}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`inline-flex h-7 w-7 items-center justify-center rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/45 disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

export function CanvasUtilityRail({
  onCreateTable,
  onImportExcel,
  onRefresh,
  onOpenEnvironments,
  onOpenDataStorage,
  loading = false,
  className = '',
}: CanvasUtilityRailProps) {
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <Tooltip content="Database Workspace" showDelayMs={0} hideDelayMs={0}>
        <span
          aria-label="Database Workspace"
          className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-default bg-dark-elevated/50 text-text-muted"
        >
          <Database className="h-3.5 w-3.5" />
        </span>
      </Tooltip>
      <RailButton
        icon={<Plus className="h-3.5 w-3.5" />}
        label="New Table"
        onClick={onCreateTable}
        tone="primary"
      />
      <RailButton
        icon={<Upload className="h-3.5 w-3.5" />}
        label="Import Excel"
        onClick={onImportExcel}
      />
      <RailButton
        icon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
        label="Refresh"
        onClick={onRefresh}
        disabled={loading}
      />
      <RailButton
        icon={<Settings className="h-3.5 w-3.5" />}
        label="Environment Manager"
        onClick={onOpenEnvironments}
      />
      <RailButton
        icon={<HardDrive className="h-3.5 w-3.5" />}
        label="Data Storage Settings"
        onClick={onOpenDataStorage}
      />
    </div>
  );
}

export default CanvasUtilityRail;
