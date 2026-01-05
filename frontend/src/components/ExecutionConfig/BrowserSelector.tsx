/**
 * BrowserSelector - Multi-select for browser types
 */
import React from 'react';
import { Chrome, Compass, Globe } from 'lucide-react';
import type { BrowserType } from '@/types/execution';

interface BrowserSelectorProps {
  value: BrowserType[];
  onChange: (browsers: BrowserType[]) => void;
  disabled?: boolean;
}

const browsers: { value: BrowserType; label: string; icon: React.ReactNode }[] = [
  {
    value: 'chromium',
    label: 'Chromium',
    icon: <Chrome className="w-5 h-5" />,
  },
  {
    value: 'firefox',
    label: 'Firefox',
    icon: <Compass className="w-5 h-5" />,
  },
  {
    value: 'webkit',
    label: 'WebKit',
    icon: <Globe className="w-5 h-5" />,
  },
];

export const BrowserSelector: React.FC<BrowserSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const toggleBrowser = (browser: BrowserType) => {
    if (disabled) return;

    if (value.includes(browser)) {
      // Don't allow deselecting all browsers
      if (value.length > 1) {
        onChange(value.filter((b) => b !== browser));
      }
    } else {
      onChange([...value, browser]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        Browsers
      </label>
      <div className="flex gap-2">
        {browsers.map((browser) => {
          const isSelected = value.includes(browser.value);
          return (
            <button
              key={browser.value}
              onClick={() => toggleBrowser(browser.value)}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
                ${isSelected
                  ? 'border-green-500 bg-green-500/10 text-green-400'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              aria-pressed={isSelected}
              aria-label={`${browser.label} browser`}
            >
              <span className={isSelected ? 'text-green-400' : 'text-slate-500'}>
                {browser.icon}
              </span>
              <span className="font-medium text-sm">{browser.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Tests will run on all selected browsers
      </p>
    </div>
  );
};

export default BrowserSelector;
