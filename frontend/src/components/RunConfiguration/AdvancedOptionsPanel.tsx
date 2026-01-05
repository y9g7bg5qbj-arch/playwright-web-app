/**
 * AdvancedOptionsPanel - Configure reporters, debug options, and CI/CD integrations
 */
import React, { useState } from 'react';
import {
  FileText,
  Bug,
  Bell,
  Github,
  Slack,
  Webhook,
  Mail,
  FolderOpen,
  Calendar,
  Filter,
  Pause,
  Search,
  Terminal,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import type { AdvancedConfig, ReporterConfig, NotificationConfig, DebugConfig } from '@playwright-web-app/shared';

interface AdvancedOptionsPanelProps {
  config: AdvancedConfig;
  onChange: (config: AdvancedConfig) => void;
  disabled?: boolean;
}

const REPORTER_OPTIONS: { key: keyof ReporterConfig; label: string; description: string }[] = [
  { key: 'html', label: 'HTML Report', description: 'Interactive HTML report with screenshots' },
  { key: 'json', label: 'JSON', description: 'Machine-readable JSON output' },
  { key: 'junit', label: 'JUnit XML', description: 'Standard JUnit format for CI systems' },
  { key: 'github', label: 'GitHub Actions', description: 'Annotations for GitHub Actions' },
  { key: 'allure', label: 'Allure', description: 'Allure framework compatible report' },
  { key: 'list', label: 'List', description: 'Simple list output to console' },
];

const DEFAULT_ADVANCED_CONFIG: AdvancedConfig = {
  reporters: {
    html: true,
    json: false,
    junit: false,
    github: false,
    allure: false,
    list: true,
  },
  notifications: {},
  debug: {},
  fullyParallel: false,
  forbidOnly: false,
  maxFailures: 0,
  grep: '',
  grepInvert: '',
  outputDir: './test-results',
  retentionDays: 30,
};

export const AdvancedOptionsPanel: React.FC<AdvancedOptionsPanelProps> = ({
  config,
  onChange,
  disabled = false,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['reporters']));

  const effectiveConfig = { ...DEFAULT_ADVANCED_CONFIG, ...config };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const updateReporter = (key: keyof ReporterConfig, value: boolean) => {
    onChange({
      ...effectiveConfig,
      reporters: { ...effectiveConfig.reporters, [key]: value },
    });
  };

  const updateNotification = <K extends keyof NotificationConfig>(
    key: K,
    value: NotificationConfig[K]
  ) => {
    onChange({
      ...effectiveConfig,
      notifications: { ...effectiveConfig.notifications, [key]: value },
    });
  };

  const updateDebug = <K extends keyof DebugConfig>(key: K, value: DebugConfig[K]) => {
    onChange({
      ...effectiveConfig,
      debug: { ...effectiveConfig.debug, [key]: value },
    });
  };

  const updateField = <K extends keyof AdvancedConfig>(key: K, value: AdvancedConfig[K]) => {
    onChange({ ...effectiveConfig, [key]: value });
  };

  const SectionHeader: React.FC<{
    id: string;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
  }> = ({ id, icon, title, subtitle }) => (
    <button
      type="button"
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-slate-400">{icon}</span>
        <div className="text-left">
          <p className="text-sm font-medium text-slate-300">{title}</p>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {expandedSections.has(id) ? (
        <ChevronUp className="w-4 h-4 text-slate-400" />
      ) : (
        <ChevronDown className="w-4 h-4 text-slate-400" />
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Reporters Section */}
      <div className="space-y-2">
        <SectionHeader
          id="reporters"
          icon={<FileText className="w-4 h-4" />}
          title="Reporters"
          subtitle="Configure output formats"
        />
        {expandedSections.has('reporters') && (
          <div className="pl-4 border-l-2 border-slate-700 space-y-2">
            {REPORTER_OPTIONS.map((reporter) => (
              <label
                key={reporter.key}
                className="flex items-start gap-3 p-2 rounded hover:bg-slate-800/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={effectiveConfig.reporters[reporter.key]}
                  onChange={(e) => updateReporter(reporter.key, e.target.checked)}
                  disabled={disabled}
                  className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
                <div>
                  <p className="text-sm text-slate-300">{reporter.label}</p>
                  <p className="text-xs text-slate-500">{reporter.description}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* CI/CD Notifications Section */}
      <div className="space-y-2">
        <SectionHeader
          id="notifications"
          icon={<Bell className="w-4 h-4" />}
          title="Notifications & CI/CD"
          subtitle="Configure integrations"
        />
        {expandedSections.has('notifications') && (
          <div className="pl-4 border-l-2 border-slate-700 space-y-3">
            {/* GitHub PR Status */}
            <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/50 cursor-pointer">
              <input
                type="checkbox"
                checked={effectiveConfig.notifications.updateGitHubPR || false}
                onChange={(e) => updateNotification('updateGitHubPR', e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
              />
              <Github className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-sm text-slate-300">Update GitHub PR status</p>
                <p className="text-xs text-slate-500">Post check results to pull requests</p>
              </div>
            </label>

            {/* Slack Notification */}
            <div className="p-3 bg-slate-800/30 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Slack className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-300">Slack Notification</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={effectiveConfig.notifications.slackWebhook || ''}
                  onChange={(e) => updateNotification('slackWebhook', e.target.value || undefined)}
                  placeholder="Webhook URL"
                  disabled={disabled}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
                <input
                  type="text"
                  value={effectiveConfig.notifications.slackChannel || ''}
                  onChange={(e) => updateNotification('slackChannel', e.target.value || undefined)}
                  placeholder="#channel"
                  disabled={disabled}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Webhook */}
            <div className="p-3 bg-slate-800/30 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-300">Custom Webhook</span>
              </div>
              <input
                type="text"
                value={effectiveConfig.notifications.webhookUrl || ''}
                onChange={(e) => updateNotification('webhookUrl', e.target.value || undefined)}
                placeholder="https://your-webhook.com/endpoint"
                disabled={disabled}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            {/* Email on Failure */}
            <div className="p-3 bg-slate-800/30 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-300">Email on Failure</span>
              </div>
              <input
                type="text"
                value={effectiveConfig.notifications.emailOnFailure?.join(', ') || ''}
                onChange={(e) => {
                  const emails = e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                  updateNotification('emailOnFailure', emails.length > 0 ? emails : undefined);
                }}
                placeholder="email1@example.com, email2@example.com"
                disabled={disabled}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>
          </div>
        )}
      </div>

      {/* Debug Options Section */}
      <div className="space-y-2">
        <SectionHeader
          id="debug"
          icon={<Bug className="w-4 h-4" />}
          title="Debug Options"
          subtitle="Configure debugging behavior"
        />
        {expandedSections.has('debug') && (
          <div className="pl-4 border-l-2 border-slate-700 space-y-3">
            {/* Slow Motion */}
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-300">Slow Motion</p>
                  <p className="text-xs text-slate-500">Delay between actions (ms)</p>
                </div>
              </div>
              <input
                type="number"
                value={effectiveConfig.debug.slowMo || 0}
                onChange={(e) => updateDebug('slowMo', parseInt(e.target.value) || undefined)}
                min={0}
                max={5000}
                step={100}
                disabled={disabled}
                className="w-24 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 text-right focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            {/* Pause on Failure */}
            <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/50 cursor-pointer">
              <input
                type="checkbox"
                checked={effectiveConfig.debug.pauseOnFailure || false}
                onChange={(e) => updateDebug('pauseOnFailure', e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
              />
              <Pause className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-sm text-slate-300">Pause on Failure</p>
                <p className="text-xs text-slate-500">Stop execution when a test fails</p>
              </div>
            </label>

            {/* Enable Inspector */}
            <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/50 cursor-pointer">
              <input
                type="checkbox"
                checked={effectiveConfig.debug.enableInspector || false}
                onChange={(e) => updateDebug('enableInspector', e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
              />
              <Search className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-sm text-slate-300">Enable Playwright Inspector</p>
                <p className="text-xs text-slate-500">Open inspector on test start</p>
              </div>
            </label>

            {/* Preserve Output */}
            <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/50 cursor-pointer">
              <input
                type="checkbox"
                checked={effectiveConfig.debug.preserveOutput || false}
                onChange={(e) => updateDebug('preserveOutput', e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
              />
              <FolderOpen className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-sm text-slate-300">Preserve Output on Pass</p>
                <p className="text-xs text-slate-500">Keep artifacts even for passing tests</p>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Test Filtering Section */}
      <div className="space-y-2">
        <SectionHeader
          id="filtering"
          icon={<Filter className="w-4 h-4" />}
          title="Test Filtering"
          subtitle="Filter tests by pattern"
        />
        {expandedSections.has('filtering') && (
          <div className="pl-4 border-l-2 border-slate-700 space-y-3">
            {/* Grep Pattern */}
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Include Pattern (grep)</label>
              <input
                type="text"
                value={effectiveConfig.grep || ''}
                onChange={(e) => updateField('grep', e.target.value || undefined)}
                placeholder="login|checkout|payment"
                disabled={disabled}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <p className="text-xs text-slate-500">
                Only run tests matching this regex pattern
              </p>
            </div>

            {/* Grep Invert Pattern */}
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Exclude Pattern (grep-invert)</label>
              <input
                type="text"
                value={effectiveConfig.grepInvert || ''}
                onChange={(e) => updateField('grepInvert', e.target.value || undefined)}
                placeholder="@slow|@manual"
                disabled={disabled}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <p className="text-xs text-slate-500">
                Skip tests matching this regex pattern
              </p>
            </div>

            {/* Fully Parallel */}
            <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/50 cursor-pointer">
              <input
                type="checkbox"
                checked={effectiveConfig.fullyParallel || false}
                onChange={(e) => updateField('fullyParallel', e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
              />
              <div>
                <p className="text-sm text-slate-300">Fully Parallel</p>
                <p className="text-xs text-slate-500">Run tests within files in parallel</p>
              </div>
            </label>

            {/* Forbid Only */}
            <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/50 cursor-pointer">
              <input
                type="checkbox"
                checked={effectiveConfig.forbidOnly || false}
                onChange={(e) => updateField('forbidOnly', e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
              />
              <div>
                <p className="text-sm text-slate-300">Forbid test.only</p>
                <p className="text-xs text-slate-500">Fail if test.only is present (for CI)</p>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Output Section */}
      <div className="space-y-2">
        <SectionHeader
          id="output"
          icon={<FolderOpen className="w-4 h-4" />}
          title="Output & Storage"
          subtitle="Configure artifact storage"
        />
        {expandedSections.has('output') && (
          <div className="pl-4 border-l-2 border-slate-700 space-y-3">
            {/* Output Directory */}
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Output Directory</label>
              <input
                type="text"
                value={effectiveConfig.outputDir || './test-results'}
                onChange={(e) => updateField('outputDir', e.target.value)}
                placeholder="./test-results"
                disabled={disabled}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            {/* Retention Days */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-300">Retention Period</p>
                  <p className="text-xs text-slate-500">How long to keep artifacts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={effectiveConfig.retentionDays || 30}
                  onChange={(e) => updateField('retentionDays', parseInt(e.target.value) || 30)}
                  min={1}
                  max={365}
                  disabled={disabled}
                  className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 text-right focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
                <span className="text-xs text-slate-500">days</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info tip */}
      <div className="flex items-start gap-2 p-3 bg-blue-600/10 border border-blue-500/30 rounded-lg">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-300">
          Advanced options allow fine-tuning of test execution. Most users can use the default
          settings. Changes here override project-level Playwright configuration.
        </p>
      </div>
    </div>
  );
};

export default AdvancedOptionsPanel;
