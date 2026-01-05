/**
 * ExecutionTargetSelector - Simple toggle between local and GitHub Actions execution
 * Detailed configuration is handled separately in GitHubSettingsModal
 */
import React from 'react';
import { Monitor, Cloud, Settings2 } from 'lucide-react';
import type { ExecutionTarget } from '@playwright-web-app/shared';
import { useGitHubStore } from '@/store/useGitHubStore';

interface ExecutionTargetSelectorProps {
  value: ExecutionTarget;
  onChange: (target: ExecutionTarget) => void;
  onOpenSettings?: () => void;
  disabled?: boolean;
}

const targets: { value: ExecutionTarget; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'local',
    label: 'Local',
    icon: <Monitor className="w-5 h-5" />,
    description: 'Run on this machine',
  },
  {
    value: 'github-actions',
    label: 'GitHub Actions',
    icon: <Cloud className="w-5 h-5" />,
    description: 'Run on GitHub runners',
  },
];

export const ExecutionTargetSelector: React.FC<ExecutionTargetSelectorProps> = ({
  value,
  onChange,
  onOpenSettings,
  disabled = false,
}) => {
  const { integration, isConnected } = useGitHubStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-300">Run Location</label>
        {onOpenSettings && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSettings();
            }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            title="Configure execution settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Settings
          </button>
        )}
      </div>

      {/* Target toggle */}
      <div className="grid grid-cols-2 gap-2">
        {targets.map((target) => (
          <button
            key={target.value}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                onChange(target.value);
              }
            }}
            disabled={disabled}
            className={`
              flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${
                value === target.value
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }
            `}
          >
            {target.icon}
            <span className="text-sm font-medium">{target.label}</span>
            <span className="text-[10px] text-slate-500">{target.description}</span>
          </button>
        ))}
      </div>

      {/* GitHub connection status - compact display */}
      {value === 'github-actions' && (
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg">
          {isConnected() ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-slate-300">
                  Connected as <strong>{integration?.login}</strong>
                </span>
              </div>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenSettings();
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Configure
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-xs text-slate-400">Not connected to GitHub</span>
              </div>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenSettings();
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Connect
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ExecutionTargetSelector;
