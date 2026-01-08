/**
 * ExecutionModeSelector - Toggle between Local and Remote execution modes
 */
import React from 'react';
import { Monitor, Globe, Check } from 'lucide-react';
import type { ExecutionMode } from '@/types/execution';

interface ExecutionModeSelectorProps {
  value: ExecutionMode;
  onChange: (mode: ExecutionMode) => void;
  disabled?: boolean;
}

const modes: { value: ExecutionMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'local',
    label: 'Local',
    description: 'Run tests on this machine',
    icon: <Monitor className="w-5 h-5" />,
  },
  {
    value: 'remote',
    label: 'Remote',
    description: 'Run on remote grid/cloud',
    icon: <Globe className="w-5 h-5" />,
  },
];

export const ExecutionModeSelector: React.FC<ExecutionModeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        Execution Mode
      </label>
      <div className="grid grid-cols-2 gap-3">
        {modes.map((mode) => {
          const isSelected = value === mode.value;
          return (
            <button
              key={mode.value}
              onClick={() => onChange(mode.value)}
              disabled={disabled}
              className={`
                relative flex flex-col items-center p-4 rounded-lg border-2 transition-all
                ${isSelected
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              aria-pressed={isSelected}
              aria-label={`${mode.label} execution mode: ${mode.description}`}
            >
              {isSelected && (
                <span className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-blue-400" />
                </span>
              )}
              <span className={`mb-2 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`}>
                {mode.icon}
              </span>
              <span className="font-medium text-sm">{mode.label}</span>
              <span className="text-xs text-slate-500 mt-1 text-center">
                {mode.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ExecutionModeSelector;
