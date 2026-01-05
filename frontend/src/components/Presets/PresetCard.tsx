/**
 * PresetCard - Individual preset display with quick actions
 */
import React from 'react';
import {
  Bookmark,
  Play,
  Edit2,
  Trash2,
  Star,
  Users,
  Layers,
  Monitor,
  Container,
  Globe,
  Check,
} from 'lucide-react';
import type { ExecutionPreset, ExecutionMode } from '@/types/execution';

interface PresetCardProps {
  preset: ExecutionPreset;
  isActive?: boolean;
  onApply: (preset: ExecutionPreset) => void;
  onEdit?: (preset: ExecutionPreset) => void;
  onDelete?: (id: string) => void;
  onSetDefault?: (id: string) => void;
  disabled?: boolean;
}

const modeIcons: Record<ExecutionMode, React.ReactNode> = {
  local: <Monitor className="w-4 h-4" />,
  docker: <Container className="w-4 h-4" />,
  remote: <Globe className="w-4 h-4" />,
};

export const PresetCard: React.FC<PresetCardProps> = ({
  preset,
  isActive = false,
  onApply,
  onEdit,
  onDelete,
  onSetDefault,
  disabled = false,
}) => {
  const { config } = preset;

  return (
    <div
      className={`
        rounded-lg border overflow-hidden transition-all
        ${isActive
          ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/50 text-slate-400'}`}>
            <Bookmark className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-200">{preset.name}</span>
              {preset.isDefault && (
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              )}
              {isActive && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                  <Check className="w-3 h-3" />
                  Active
                </span>
              )}
            </div>
            {preset.description && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {preset.description}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => onApply(preset)}
          disabled={disabled || isActive}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors
            ${isActive
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-500 text-white'
            }
            disabled:opacity-50
          `}
        >
          <Play className="w-3.5 h-3.5" />
          Apply
        </button>
      </div>

      {/* Config Summary */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          {/* Mode */}
          <div className="text-center p-2 rounded bg-slate-800/50">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
              {modeIcons[config.mode]}
            </div>
            <span className="text-xs text-slate-500 capitalize">{config.mode}</span>
          </div>

          {/* Workers */}
          <div className="text-center p-2 rounded bg-slate-800/50">
            <div className="flex items-center justify-center gap-1 text-slate-300">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="font-medium">{config.workerCount}</span>
            </div>
            <span className="text-xs text-slate-500">Workers</span>
          </div>

          {/* Sharding */}
          <div className="text-center p-2 rounded bg-slate-800/50">
            <div className="flex items-center justify-center gap-1 text-slate-300">
              <Layers className="w-4 h-4 text-slate-400" />
              <span className="font-medium">
                {config.sharding.enabled ? config.sharding.shardCount : 'Off'}
              </span>
            </div>
            <span className="text-xs text-slate-500">Shards</span>
          </div>
        </div>

        {/* Browsers */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-500">Browsers:</span>
          <div className="flex gap-1">
            {config.browsers.map((browser) => (
              <span
                key={browser}
                className="px-1.5 py-0.5 text-xs bg-slate-700 text-slate-400 rounded capitalize"
              >
                {browser}
              </span>
            ))}
          </div>
        </div>

        {/* Additional Config */}
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
          <span>Timeout: {config.timeout / 1000}s</span>
          <span>Retries: {config.maxRetries}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/30 border-t border-slate-700/50">
        <span className="text-xs text-slate-600">
          Updated {new Date(preset.updatedAt).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-1">
          {onSetDefault && !preset.isDefault && (
            <button
              onClick={() => onSetDefault(preset.id)}
              disabled={disabled}
              className="p-1.5 rounded hover:bg-slate-700/50 text-slate-500 hover:text-yellow-400 transition-colors disabled:opacity-50"
              title="Set as default"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(preset)}
              disabled={disabled}
              className="p-1.5 rounded hover:bg-slate-700/50 text-slate-500 hover:text-slate-200 transition-colors disabled:opacity-50"
              title="Edit preset"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && !preset.isDefault && (
            <button
              onClick={() => onDelete(preset.id)}
              disabled={disabled}
              className="p-1.5 rounded hover:bg-slate-700/50 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
              title="Delete preset"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PresetCard;
