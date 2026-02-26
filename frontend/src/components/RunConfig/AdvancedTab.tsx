import { MapPin, MonitorSmartphone, Languages, Clock3 } from 'lucide-react';
import type { RunConfiguration } from '@/store/runConfigStore';
import { runConfigTheme, chipClass, cx } from './theme';

interface AdvancedTabProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
}

export function AdvancedTab({ config, onChange }: AdvancedTabProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className={runConfigTheme.section}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="h-4 w-4 text-brand-secondary" />
            <p className={runConfigTheme.label}>Viewport</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={Boolean(config.viewport)}
              onChange={(event) => {
                if (event.target.checked) {
                  onChange('viewport', { width: 1280, height: 720 });
                  return;
                }
                onChange('viewport', undefined);
              }}
              className={runConfigTheme.toggle}
            />
            Custom viewport
          </label>
        </div>

        {config.viewport ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className={runConfigTheme.label}>Width (px)</label>
                <input
                  type="number"
                  min={320}
                  max={3840}
                  value={config.viewport.width}
                  onChange={(event) =>
                    onChange('viewport', {
                      ...config.viewport!,
                      width: parseInt(event.target.value, 10) || 1280,
                    })
                  }
                  className={cx(runConfigTheme.input, 'mt-2')}
                />
              </div>
              <div>
                <label className={runConfigTheme.label}>Height (px)</label>
                <input
                  type="number"
                  min={240}
                  max={2160}
                  value={config.viewport.height}
                  onChange={(event) =>
                    onChange('viewport', {
                      ...config.viewport!,
                      height: parseInt(event.target.value, 10) || 720,
                    })
                  }
                  className={cx(runConfigTheme.input, 'mt-2')}
                />
              </div>
            </div>
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
                  className={chipClass(
                    config.viewport?.width === preset.width && config.viewport?.height === preset.height
                  )}
                >
                  {preset.label} ({preset.width}×{preset.height})
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-text-muted">Use the default viewport from your Playwright configuration.</p>
        )}
      </section>

      <section className={runConfigTheme.section}>
        <div className="mb-2 flex items-center gap-2">
          <Languages className="h-4 w-4 text-brand-secondary" />
          <label className={runConfigTheme.label}>Locale</label>
        </div>
        <select
          value={config.locale || ''}
          onChange={(event) => onChange('locale', event.target.value || undefined)}
          className={runConfigTheme.select}
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
      </section>

      <section className={runConfigTheme.section}>
        <div className="mb-2 flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-brand-secondary" />
          <label className={runConfigTheme.label}>Timezone</label>
        </div>
        <select
          value={config.timezoneId || ''}
          onChange={(event) => onChange('timezoneId', event.target.value || undefined)}
          className={runConfigTheme.select}
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
      </section>

      <section className={runConfigTheme.section}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-secondary" />
            <p className={runConfigTheme.label}>Geolocation</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={Boolean(config.geolocation)}
              onChange={(event) => {
                if (event.target.checked) {
                  onChange('geolocation', { latitude: 37.7749, longitude: -122.4194 });
                  return;
                }
                onChange('geolocation', undefined);
              }}
              className={runConfigTheme.toggle}
            />
            Mock location
          </label>
        </div>

        {config.geolocation ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className={runConfigTheme.label}>Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  min={-90}
                  max={90}
                  value={config.geolocation.latitude}
                  onChange={(event) =>
                    onChange('geolocation', {
                      ...config.geolocation!,
                      latitude: parseFloat(event.target.value) || 0,
                    })
                  }
                  className={cx(runConfigTheme.input, 'mt-2')}
                />
              </div>
              <div>
                <label className={runConfigTheme.label}>Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  min={-180}
                  max={180}
                  value={config.geolocation.longitude}
                  onChange={(event) =>
                    onChange('geolocation', {
                      ...config.geolocation!,
                      longitude: parseFloat(event.target.value) || 0,
                    })
                  }
                  className={cx(runConfigTheme.input, 'mt-2')}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'San Francisco', latitude: 37.7749, longitude: -122.4194 },
                { label: 'New York', latitude: 40.7128, longitude: -74.006 },
                { label: 'London', latitude: 51.5074, longitude: -0.1278 },
                { label: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
              ].map((location) => (
                <button
                  key={location.label}
                  type="button"
                  onClick={() =>
                    onChange('geolocation', {
                      latitude: location.latitude,
                      longitude: location.longitude,
                    })
                  }
                  className={chipClass(
                    config.geolocation?.latitude === location.latitude &&
                      config.geolocation?.longitude === location.longitude
                  )}
                >
                  {location.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-text-muted">Uses browser/system geolocation defaults.</p>
        )}
      </section>

    </div>
  );
}
