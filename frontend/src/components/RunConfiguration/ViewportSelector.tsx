/**
 * ViewportSelector - Select viewport dimensions with presets and device emulation
 */
import React, { useState } from 'react';
import {
  Monitor,
  Smartphone,
  Tablet,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import type { Viewport, DeviceDescriptor } from '@playwright-web-app/shared';

// Define presets locally to avoid ESM/CJS compatibility issues
const VIEWPORT_PRESETS: Record<string, Viewport> = {
  'Desktop 1920×1080': { width: 1920, height: 1080 },
  'Desktop 1280×720': { width: 1280, height: 720 },
  'Laptop 1440×900': { width: 1440, height: 900 },
  'Tablet 1024×768': { width: 1024, height: 768 },
  'Tablet 768×1024': { width: 768, height: 1024 },
  'Mobile 414×896': { width: 414, height: 896 },
  'Mobile 375×812': { width: 375, height: 812 },
  'Mobile 360×640': { width: 360, height: 640 },
};

const DEVICE_PRESETS: Record<string, DeviceDescriptor> = {
  'Desktop Chrome': {
    name: 'Desktop Chrome',
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    defaultBrowserType: 'chromium',
  },
  'iPhone 14 Pro': {
    name: 'iPhone 14 Pro',
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'webkit',
  },
  'iPhone 14': {
    name: 'iPhone 14',
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'webkit',
  },
  'iPad Pro 12.9': {
    name: 'iPad Pro 12.9',
    viewport: { width: 1024, height: 1366 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'webkit',
  },
  'iPad Mini': {
    name: 'iPad Mini',
    viewport: { width: 768, height: 1024 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'webkit',
  },
  'Pixel 7': {
    name: 'Pixel 7',
    viewport: { width: 412, height: 915 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'chromium',
  },
  'Galaxy S23': {
    name: 'Galaxy S23',
    viewport: { width: 360, height: 780 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'chromium',
  },
};

interface ViewportSelectorProps {
  viewport: Viewport;
  deviceName?: string;
  onViewportChange: (viewport: Viewport) => void;
  onDeviceChange?: (deviceName: string | undefined, device?: DeviceDescriptor) => void;
  disabled?: boolean;
}

type PresetCategory = 'desktop' | 'tablet' | 'mobile' | 'custom';

const DEFAULT_VIEWPORT: Viewport = { width: 1280, height: 720 };

const getPresetCategory = (viewport: Viewport | undefined): PresetCategory => {
  const vp = viewport || DEFAULT_VIEWPORT;
  if (vp.width >= 1024) return 'desktop';
  if (vp.width >= 768) return 'tablet';
  if (vp.width < 768) return 'mobile';
  return 'custom';
};

export const ViewportSelector: React.FC<ViewportSelectorProps> = ({
  viewport: viewportProp,
  deviceName,
  onViewportChange,
  onDeviceChange,
  disabled = false,
}) => {
  // Ensure viewport is always defined
  const viewport = viewportProp || DEFAULT_VIEWPORT;

  const [showPresets, setShowPresets] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PresetCategory>(getPresetCategory(viewport));

  const handlePresetSelect = (_name: string, preset: Viewport) => {
    onViewportChange(preset);
    if (onDeviceChange) {
      onDeviceChange(undefined);
    }
    setShowPresets(false);
  };

  const handleDeviceSelect = (name: string, device: DeviceDescriptor) => {
    onViewportChange(device.viewport);
    if (onDeviceChange) {
      onDeviceChange(name, device);
    }
    setShowDevices(false);
  };

  const handleDimensionChange = (dimension: 'width' | 'height', value: number) => {
    const newViewport = { ...viewport, [dimension]: Math.max(1, value) };
    onViewportChange(newViewport);
    if (onDeviceChange && deviceName) {
      onDeviceChange(undefined);
    }
  };

  const handleReset = () => {
    onViewportChange({ width: 1280, height: 720 });
    if (onDeviceChange) {
      onDeviceChange(undefined);
    }
  };

  const categories: { id: PresetCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'desktop', label: 'Desktop', icon: <Monitor className="w-4 h-4" /> },
    { id: 'tablet', label: 'Tablet', icon: <Tablet className="w-4 h-4" /> },
    { id: 'mobile', label: 'Mobile', icon: <Smartphone className="w-4 h-4" /> },
  ];

  const filteredPresets = Object.entries(VIEWPORT_PRESETS).filter(([name]) => {
    if (activeCategory === 'desktop') return name.includes('Desktop') || name.includes('Laptop');
    if (activeCategory === 'tablet') return name.includes('Tablet');
    if (activeCategory === 'mobile') return name.includes('Mobile');
    return true;
  });

  const devicesByCategory = {
    desktop: Object.entries(DEVICE_PRESETS).filter(([, d]) => !d.isMobile),
    mobile: Object.entries(DEVICE_PRESETS).filter(([, d]) => d.isMobile && d.viewport.width < 500),
    tablet: Object.entries(DEVICE_PRESETS).filter(([, d]) => d.isMobile && d.viewport.width >= 500),
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-300">Viewport</label>
        <button
          type="button"
          onClick={handleReset}
          disabled={disabled}
          className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 disabled:opacity-50"
          title="Reset to default (1280×720)"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Device/Preset indicator */}
      {deviceName && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg">
          <Smartphone className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-blue-300">Emulating: {deviceName}</span>
          <button
            type="button"
            onClick={() => onDeviceChange?.(undefined)}
            disabled={disabled}
            className="ml-auto text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      )}

      {/* Dimension inputs */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs text-slate-500 mb-1">Width</label>
          <input
            type="number"
            value={viewport.width}
            onChange={(e) => handleDimensionChange('width', parseInt(e.target.value) || 1280)}
            min={320}
            max={3840}
            disabled={disabled}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
        </div>
        <span className="text-slate-500 mt-5">×</span>
        <div className="flex-1">
          <label className="block text-xs text-slate-500 mb-1">Height</label>
          <input
            type="number"
            value={viewport.height}
            onChange={(e) => handleDimensionChange('height', parseInt(e.target.value) || 720)}
            min={240}
            max={2160}
            disabled={disabled}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="flex gap-2">
        {/* Viewport Presets Dropdown */}
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => {
              setShowPresets(!showPresets);
              setShowDevices(false);
            }}
            disabled={disabled}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-slate-600 disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Presets
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
          </button>

          {showPresets && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-64 overflow-hidden">
              {/* Category tabs */}
              <div className="flex border-b border-slate-700">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                      activeCategory === cat.id
                        ? 'text-blue-400 bg-blue-600/10 border-b-2 border-blue-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.icon}
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Preset list */}
              <div className="max-h-48 overflow-y-auto">
                {filteredPresets.map(([name, preset]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handlePresetSelect(name, preset)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                  >
                    <span>{name}</span>
                    <span className="text-xs text-slate-500">
                      {preset.width}×{preset.height}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Device Emulation Dropdown */}
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => {
              setShowDevices(!showDevices);
              setShowPresets(false);
            }}
            disabled={disabled}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-slate-600 disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Devices
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showDevices ? 'rotate-180' : ''}`} />
          </button>

          {showDevices && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
              {/* Clear device option */}
              <button
                type="button"
                onClick={() => {
                  onDeviceChange?.(undefined);
                  setShowDevices(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 border-b border-slate-700"
              >
                <RotateCcw className="w-4 h-4" />
                No device emulation
              </button>

              <div className="max-h-64 overflow-y-auto">
                {/* Desktop devices */}
                <div className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-800/50">
                  Desktop
                </div>
                {devicesByCategory.desktop.map(([name, device]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleDeviceSelect(name, device)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-700 ${
                      deviceName === name ? 'text-blue-400 bg-blue-600/10' : 'text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      {name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {device.viewport.width}×{device.viewport.height}
                    </span>
                  </button>
                ))}

                {/* Tablet devices */}
                <div className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-800/50">
                  Tablet
                </div>
                {devicesByCategory.tablet.map(([name, device]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleDeviceSelect(name, device)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-700 ${
                      deviceName === name ? 'text-blue-400 bg-blue-600/10' : 'text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Tablet className="w-4 h-4" />
                      {name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {device.viewport.width}×{device.viewport.height}
                    </span>
                  </button>
                ))}

                {/* Mobile devices */}
                <div className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-800/50">
                  Mobile
                </div>
                {devicesByCategory.mobile.map(([name, device]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleDeviceSelect(name, device)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-700 ${
                      deviceName === name ? 'text-blue-400 bg-blue-600/10' : 'text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      {name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {device.viewport.width}×{device.viewport.height}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visual preview */}
      <div className="flex items-center justify-center p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <div
          className="bg-slate-700 border border-slate-600 rounded relative"
          style={{
            width: Math.min(viewport.width / 10, 150),
            height: Math.min(viewport.height / 10, 100),
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
            {viewport.width}×{viewport.height}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewportSelector;
