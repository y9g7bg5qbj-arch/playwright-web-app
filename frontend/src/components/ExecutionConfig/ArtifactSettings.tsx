/**
 * ArtifactSettings - Configure trace, video, and screenshot capture
 */
import React from 'react';
import { Film, Video, Camera, Clock, ChevronDown } from 'lucide-react';
import type { ArtifactConfig } from '@/types/execution';

interface ArtifactSettingsProps {
  value: ArtifactConfig;
  onChange: (config: ArtifactConfig) => void;
  disabled?: boolean;
}

type CaptureMode = 'always' | 'on-failure' | 'never';

const captureModes: { value: CaptureMode; label: string }[] = [
  { value: 'always', label: 'Always' },
  { value: 'on-failure', label: 'On Failure' },
  { value: 'never', label: 'Never' },
];

const artifacts: {
  key: keyof Pick<ArtifactConfig, 'traces' | 'videos' | 'screenshots'>;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    key: 'traces',
    label: 'Traces',
    description: 'Playwright trace files for debugging',
    icon: <Film className="w-4 h-4" />,
  },
  {
    key: 'videos',
    label: 'Videos',
    description: 'Video recordings of test execution',
    icon: <Video className="w-4 h-4" />,
  },
  {
    key: 'screenshots',
    label: 'Screenshots',
    description: 'Capture screenshots during tests',
    icon: <Camera className="w-4 h-4" />,
  },
];

export const ArtifactSettings: React.FC<ArtifactSettingsProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const updateArtifact = (
    key: keyof Pick<ArtifactConfig, 'traces' | 'videos' | 'screenshots'>,
    mode: CaptureMode
  ) => {
    onChange({ ...value, [key]: mode });
  };

  const updateRetention = (days: number) => {
    onChange({ ...value, retentionDays: days });
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-300">
        Artifact Capture
      </label>

      <div className="space-y-3">
        {artifacts.map((artifact) => (
          <div
            key={artifact.key}
            className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700"
          >
            <div className="flex items-center gap-3">
              <span className="text-slate-500">{artifact.icon}</span>
              <div>
                <span className="text-sm font-medium text-slate-300">{artifact.label}</span>
                <span className="block text-xs text-slate-500">{artifact.description}</span>
              </div>
            </div>
            <div className="relative">
              <select
                value={value[artifact.key]}
                onChange={(e) => updateArtifact(artifact.key, e.target.value as CaptureMode)}
                disabled={disabled}
                className="appearance-none bg-slate-700 border border-slate-600 rounded px-3 py-1.5 pr-8 text-sm text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`${artifact.label} capture mode`}
              >
                {captureModes.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-slate-500">
            <Clock className="w-4 h-4" />
          </span>
          <div>
            <span className="text-sm font-medium text-slate-300">Retention Period</span>
            <span className="block text-xs text-slate-500">How long to keep artifacts</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value.retentionDays}
            onChange={(e) => updateRetention(parseInt(e.target.value, 10) || 7)}
            min={1}
            max={365}
            disabled={disabled}
            className="w-16 text-center bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Retention days"
          />
          <span className="text-sm text-slate-400">days</span>
        </div>
      </div>
    </div>
  );
};

export default ArtifactSettings;
