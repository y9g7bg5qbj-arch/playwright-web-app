import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { RunConfiguration } from '@/store/runConfigStore';

interface AdvancedTabProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
}

export function AdvancedTab({ config, onChange }: AdvancedTabProps) {
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  // Handle adding new environment variable
  const handleAddEnvVar = () => {
    if (newEnvKey.trim()) {
      onChange('envVars', {
        ...config.envVars,
        [newEnvKey.trim()]: newEnvValue,
      });
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };

  // Handle removing environment variable
  const handleRemoveEnvVar = (key: string) => {
    const newEnvVars = { ...config.envVars };
    delete newEnvVars[key];
    onChange('envVars', Object.keys(newEnvVars).length > 0 ? newEnvVars : undefined);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Viewport */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[#c9d1d9]">Viewport</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!config.viewport}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange('viewport', { width: 1280, height: 720 });
                } else {
                  onChange('viewport', undefined);
                }
              }}
              className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117] text-sky-500 focus:ring-sky-500 focus:ring-offset-[#161b22]"
            />
            <span className="text-sm text-[#8b949e]">Custom viewport</span>
          </label>
        </div>

        {config.viewport && (
          <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs text-[#8b949e]">Width (px)</label>
                <input
                  type="number"
                  min={320}
                  max={3840}
                  value={config.viewport.width}
                  onChange={(e) => onChange('viewport', {
                    ...config.viewport!,
                    width: parseInt(e.target.value) || 1280
                  })}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-[#8b949e]">Height (px)</label>
                <input
                  type="number"
                  min={240}
                  max={2160}
                  value={config.viewport.height}
                  onChange={(e) => onChange('viewport', {
                    ...config.viewport!,
                    height: parseInt(e.target.value) || 720
                  })}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Viewport presets */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Desktop', width: 1920, height: 1080 },
                { label: 'Laptop', width: 1280, height: 720 },
                { label: 'Tablet', width: 768, height: 1024 },
                { label: 'Mobile', width: 375, height: 667 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChange('viewport', { width: preset.width, height: preset.height })}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    config.viewport?.width === preset.width && config.viewport?.height === preset.height
                      ? 'bg-sky-500 text-white'
                      : 'bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d]'
                  }`}
                >
                  {preset.label} ({preset.width}x{preset.height})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Locale */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Locale
        </label>
        <select
          value={config.locale || ''}
          onChange={(e) => onChange('locale', e.target.value || undefined)}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
        >
          <option value="">Default</option>
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="de-DE">German</option>
          <option value="fr-FR">French</option>
          <option value="es-ES">Spanish</option>
          <option value="it-IT">Italian</option>
          <option value="ja-JP">Japanese</option>
          <option value="ko-KR">Korean</option>
          <option value="zh-CN">Chinese (Simplified)</option>
          <option value="zh-TW">Chinese (Traditional)</option>
          <option value="pt-BR">Portuguese (Brazil)</option>
          <option value="ru-RU">Russian</option>
        </select>
        <p className="text-xs text-[#6e7681]">
          Browser locale for number formatting, date, and navigation Accept-Language header
        </p>
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Timezone
        </label>
        <select
          value={config.timezoneId || ''}
          onChange={(e) => onChange('timezoneId', e.target.value || undefined)}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
        >
          <option value="">Default (System)</option>
          <option value="America/New_York">Eastern Time (US)</option>
          <option value="America/Chicago">Central Time (US)</option>
          <option value="America/Denver">Mountain Time (US)</option>
          <option value="America/Los_Angeles">Pacific Time (US)</option>
          <option value="Europe/London">London (GMT/BST)</option>
          <option value="Europe/Paris">Paris (CET/CEST)</option>
          <option value="Europe/Berlin">Berlin (CET/CEST)</option>
          <option value="Asia/Tokyo">Tokyo (JST)</option>
          <option value="Asia/Shanghai">Shanghai (CST)</option>
          <option value="Asia/Singapore">Singapore (SGT)</option>
          <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
          <option value="UTC">UTC</option>
        </select>
        <p className="text-xs text-[#6e7681]">
          Emulate browser timezone for consistent test behavior
        </p>
      </div>

      {/* Geolocation */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[#c9d1d9]">Geolocation</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!config.geolocation}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange('geolocation', { latitude: 37.7749, longitude: -122.4194 });
                } else {
                  onChange('geolocation', undefined);
                }
              }}
              className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117] text-sky-500 focus:ring-sky-500 focus:ring-offset-[#161b22]"
            />
            <span className="text-sm text-[#8b949e]">Mock geolocation</span>
          </label>
        </div>

        {config.geolocation && (
          <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs text-[#8b949e]">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  min={-90}
                  max={90}
                  value={config.geolocation.latitude}
                  onChange={(e) => onChange('geolocation', {
                    ...config.geolocation!,
                    latitude: parseFloat(e.target.value) || 0
                  })}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-[#8b949e]">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  min={-180}
                  max={180}
                  value={config.geolocation.longitude}
                  onChange={(e) => onChange('geolocation', {
                    ...config.geolocation!,
                    longitude: parseFloat(e.target.value) || 0
                  })}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Location presets */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'San Francisco', lat: 37.7749, lng: -122.4194 },
                { label: 'New York', lat: 40.7128, lng: -74.0060 },
                { label: 'London', lat: 51.5074, lng: -0.1278 },
                { label: 'Tokyo', lat: 35.6762, lng: 139.6503 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChange('geolocation', { latitude: preset.lat, longitude: preset.lng })}
                  className="px-3 py-1 rounded text-xs bg-[#21262d] text-[#8b949e] hover:text-white hover:bg-[#30363d] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Environment Variables */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[#c9d1d9]">
          Environment Variables
        </label>
        <p className="text-xs text-[#6e7681]">
          Set environment variables available during test execution
        </p>

        {/* Existing env vars */}
        {config.envVars && Object.entries(config.envVars).length > 0 && (
          <div className="space-y-2">
            {Object.entries(config.envVars).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <input
                  type="text"
                  value={key}
                  readOnly
                  className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white font-mono"
                />
                <span className="text-[#6e7681]">=</span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => onChange('envVars', {
                    ...config.envVars,
                    [key]: e.target.value
                  })}
                  className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveEnvVar(key)}
                  className="p-2 text-[#8b949e] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new env var */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newEnvKey}
            onChange={(e) => setNewEnvKey(e.target.value)}
            placeholder="KEY"
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500 placeholder-[#6e7681]"
          />
          <span className="text-[#6e7681]">=</span>
          <input
            type="text"
            value={newEnvValue}
            onChange={(e) => setNewEnvValue(e.target.value)}
            placeholder="value"
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500 placeholder-[#6e7681]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddEnvVar();
              }
            }}
          />
          <button
            type="button"
            onClick={handleAddEnvVar}
            disabled={!newEnvKey.trim()}
            className={`p-2 rounded transition-colors ${
              newEnvKey.trim()
                ? 'text-[#8b949e] hover:text-white hover:bg-[#30363d]'
                : 'text-[#484f58] cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
