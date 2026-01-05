/**
 * BrowserConfigPanel - Configure browser settings including advanced options
 */
import React, { useState } from 'react';
import {
  Globe,
  Eye,
  EyeOff,
  Shield,
  ShieldOff,
  Download,
  Code,
  MapPin,
  Palette,
  ChevronDown,
  ChevronUp,
  Settings,
  FileText,
} from 'lucide-react';
import type { BrowserConfig, BrowserType, ColorScheme, ReducedMotion, Geolocation } from '@playwright-web-app/shared';
import { ViewportSelector } from './ViewportSelector';

interface BrowserConfigPanelProps {
  config: BrowserConfig;
  onChange: (config: BrowserConfig) => void;
  disabled?: boolean;
}

const BROWSERS: { value: BrowserType; label: string; icon: string }[] = [
  { value: 'chromium', label: 'Chromium', icon: '🌐' },
  { value: 'firefox', label: 'Firefox', icon: '🦊' },
  { value: 'webkit', label: 'WebKit', icon: '🧭' },
];

const LOCALES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'fr-FR', label: 'French (France)' },
  { value: 'de-DE', label: 'German (Germany)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'it-IT', label: 'Italian' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'UTC', label: 'UTC' },
];

const COLOR_SCHEMES: { value: ColorScheme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'no-preference', label: 'No Preference' },
];

const REDUCED_MOTION_OPTIONS: { value: ReducedMotion; label: string }[] = [
  { value: 'no-preference', label: 'No Preference' },
  { value: 'reduce', label: 'Reduce' },
];

const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  type: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 720 },
  javaScriptEnabled: true,
};

export const BrowserConfigPanel: React.FC<BrowserConfigPanelProps> = ({
  config: configProp,
  onChange,
  disabled = false,
}) => {
  // Ensure config is always defined with defaults
  const config = { ...DEFAULT_BROWSER_CONFIG, ...configProp };

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);

  const updateConfig = <K extends keyof BrowserConfig>(key: K, value: BrowserConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const handleGeolocationChange = (field: keyof Geolocation, value: number) => {
    const geo = config.geolocation || { latitude: 0, longitude: 0 };
    updateConfig('geolocation', { ...geo, [field]: value });
  };

  const handleClearGeolocation = () => {
    updateConfig('geolocation', undefined);
  };

  const handleAddHeader = () => {
    const headers = config.extraHTTPHeaders || {};
    const key = prompt('Header name:');
    if (key) {
      const value = prompt('Header value:') || '';
      updateConfig('extraHTTPHeaders', { ...headers, [key]: value });
    }
  };

  const handleRemoveHeader = (key: string) => {
    const headers = { ...config.extraHTTPHeaders };
    delete headers[key];
    updateConfig('extraHTTPHeaders', Object.keys(headers).length > 0 ? headers : undefined);
  };

  return (
    <div className="space-y-4">
      {/* Browser Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">Browser</label>
        <div className="flex gap-2">
          {BROWSERS.map((browser) => (
            <button
              key={browser.value}
              type="button"
              onClick={() => updateConfig('type', browser.value)}
              disabled={disabled}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors disabled:opacity-50 ${
                config.type === browser.value
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span>{browser.icon}</span>
              <span className="text-sm font-medium">{browser.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Headless Mode */}
      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex items-center gap-3">
          {config.headless ? (
            <EyeOff className="w-5 h-5 text-slate-400" />
          ) : (
            <Eye className="w-5 h-5 text-blue-400" />
          )}
          <div>
            <p className="text-sm font-medium text-slate-300">
              {config.headless ? 'Headless Mode' : 'Headed Mode'}
            </p>
            <p className="text-xs text-slate-500">
              {config.headless
                ? 'Faster execution, no visible browser'
                : 'Visible browser window for debugging'}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!config.headless}
          onClick={() => updateConfig('headless', !config.headless)}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
            !config.headless ? 'bg-blue-600' : 'bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              !config.headless ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Viewport Selector */}
      <ViewportSelector
        viewport={config.viewport}
        deviceName={config.deviceName}
        onViewportChange={(viewport) => updateConfig('viewport', viewport)}
        onDeviceChange={(deviceName, device) => {
          updateConfig('deviceName', deviceName);
          if (device) {
            updateConfig('deviceScaleFactor', device.deviceScaleFactor);
            updateConfig('isMobile', device.isMobile);
            updateConfig('hasTouch', device.hasTouch);
            updateConfig('userAgent', device.userAgent);
          } else {
            updateConfig('deviceScaleFactor', undefined);
            updateConfig('isMobile', undefined);
            updateConfig('hasTouch', undefined);
            updateConfig('userAgent', undefined);
          }
        }}
        disabled={disabled}
      />

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Advanced Browser Options</span>
        </div>
        {showAdvanced ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {showAdvanced && (
        <div className="space-y-4 pl-4 border-l-2 border-slate-700">
          {/* Security Options */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
              Security
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.ignoreHTTPSErrors || false}
                  onChange={(e) => updateConfig('ignoreHTTPSErrors', e.target.checked)}
                  disabled={disabled}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
                <ShieldOff className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-300">Ignore HTTPS errors</p>
                  <p className="text-xs text-slate-500">Accept invalid SSL certificates</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.bypassCSP || false}
                  onChange={(e) => updateConfig('bypassCSP', e.target.checked)}
                  disabled={disabled}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
                <Shield className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-300">Bypass CSP</p>
                  <p className="text-xs text-slate-500">Bypass Content Security Policy</p>
                </div>
              </label>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
              Features
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.javaScriptEnabled !== false}
                  onChange={(e) => updateConfig('javaScriptEnabled', e.target.checked)}
                  disabled={disabled}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
                <Code className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-300">JavaScript enabled</p>
                  <p className="text-xs text-slate-500">Enable JavaScript execution</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.acceptDownloads || false}
                  onChange={(e) => updateConfig('acceptDownloads', e.target.checked)}
                  disabled={disabled}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
                <Download className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-300">Accept downloads</p>
                  <p className="text-xs text-slate-500">Allow file downloads during tests</p>
                </div>
              </label>
            </div>
          </div>

          {/* Locale & Timezone */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
              Locale & Time
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Locale</label>
                <select
                  value={config.locale || 'en-US'}
                  onChange={(e) => updateConfig('locale', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  {LOCALES.map((locale) => (
                    <option key={locale.value} value={locale.value}>
                      {locale.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Timezone</label>
                <select
                  value={config.timezoneId || 'America/New_York'}
                  onChange={(e) => updateConfig('timezoneId', e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Geolocation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                Geolocation
              </label>
              {config.geolocation && (
                <button
                  type="button"
                  onClick={handleClearGeolocation}
                  disabled={disabled}
                  className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-slate-500" />
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Latitude</label>
                  <input
                    type="number"
                    value={config.geolocation?.latitude || ''}
                    onChange={(e) => handleGeolocationChange('latitude', parseFloat(e.target.value) || 0)}
                    placeholder="40.7128"
                    step="0.0001"
                    min={-90}
                    max={90}
                    disabled={disabled}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Longitude</label>
                  <input
                    type="number"
                    value={config.geolocation?.longitude || ''}
                    onChange={(e) => handleGeolocationChange('longitude', parseFloat(e.target.value) || 0)}
                    placeholder="-74.0060"
                    step="0.0001"
                    min={-180}
                    max={180}
                    disabled={disabled}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
              Appearance
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  Color Scheme
                </label>
                <select
                  value={config.colorScheme || 'no-preference'}
                  onChange={(e) => updateConfig('colorScheme', e.target.value as ColorScheme)}
                  disabled={disabled}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  {COLOR_SCHEMES.map((cs) => (
                    <option key={cs.value} value={cs.value}>
                      {cs.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Reduced Motion</label>
                <select
                  value={config.reducedMotion || 'no-preference'}
                  onChange={(e) => updateConfig('reducedMotion', e.target.value as ReducedMotion)}
                  disabled={disabled}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  {REDUCED_MOTION_OPTIONS.map((rm) => (
                    <option key={rm.value} value={rm.value}>
                      {rm.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Extra HTTP Headers */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowHeaders(!showHeaders)}
              className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider hover:text-slate-300"
            >
              <Globe className="w-3 h-3" />
              Extra HTTP Headers
              {showHeaders ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {showHeaders && (
              <div className="space-y-2">
                {config.extraHTTPHeaders &&
                  Object.entries(config.extraHTTPHeaders).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="flex-1 px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 truncate">
                        {key}: {value}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveHeader(key)}
                        disabled={disabled}
                        className="text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                <button
                  type="button"
                  onClick={handleAddHeader}
                  disabled={disabled}
                  className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                >
                  + Add Header
                </button>
              </div>
            )}
          </div>

          {/* Storage State */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Storage State
            </label>
            <input
              type="text"
              value={config.storageState || ''}
              onChange={(e) => updateConfig('storageState', e.target.value || undefined)}
              placeholder="path/to/storageState.json"
              disabled={disabled}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-slate-500">
              Path to a file with saved authentication state (cookies, localStorage)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowserConfigPanel;
