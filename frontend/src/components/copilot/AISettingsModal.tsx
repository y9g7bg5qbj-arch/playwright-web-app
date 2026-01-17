/**
 * AI Settings Modal
 *
 * Configure AI providers for Copilot (Gemini, OpenAI, Anthropic)
 */

import { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  TestTube,
  Sparkles,
  Brain,
  Cpu,
  Globe,
  Monitor,
} from 'lucide-react';

interface AISettings {
  id: string;
  provider: 'gemini' | 'openai' | 'anthropic';
  geminiApiKey: string | null;
  geminiModel: string;
  openaiApiKey: string | null;
  openaiModel: string;
  anthropicApiKey: string | null;
  anthropicModel: string;
  browserbaseApiKey: string | null;
  useBrowserbase: boolean;
  stagehandHeadless: boolean;
  stagehandDebug: boolean;
  hasGeminiKey: boolean;
  hasOpenaiKey: boolean;
  hasAnthropicKey: boolean;
  hasBrowserbaseKey: boolean;
}

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GEMINI_MODELS = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Recommended)' },
  { value: 'gemini-2.5-pro-preview-03-25', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.5-flash-preview-04-17', label: 'Gemini 2.5 Flash (Fast)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
];

const OPENAI_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Faster)' },
];

const ANTHROPIC_MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Recommended)' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
];

export function AISettingsModal({ isOpen, onClose }: AISettingsModalProps) {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('google/gemini-3-flash-preview');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [anthropicModel, setAnthropicModel] = useState('claude-sonnet-4-20250514');
  const [browserbaseApiKey, setBrowserbaseApiKey] = useState('');
  const [useBrowserbase, setUseBrowserbase] = useState(false);
  const [stagehandHeadless, setStagehandHeadless] = useState(true);
  const [stagehandDebug, setStagehandDebug] = useState(false);

  // Show/hide API keys
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showBrowserbaseKey, setShowBrowserbaseKey] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/ai-settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data);

      // Update form state
      setProvider(data.provider);
      setGeminiModel(data.geminiModel);
      setOpenaiModel(data.openaiModel);
      setAnthropicModel(data.anthropicModel);
      setUseBrowserbase(data.useBrowserbase);
      setStagehandHeadless(data.stagehandHeadless);
      setStagehandDebug(data.stagehandDebug);

      // Clear API key inputs (they show masked values)
      setGeminiApiKey('');
      setOpenaiApiKey('');
      setAnthropicApiKey('');
      setBrowserbaseApiKey('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setTestResult(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/ai-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider,
          geminiApiKey: geminiApiKey || undefined,
          geminiModel,
          openaiApiKey: openaiApiKey || undefined,
          openaiModel,
          anthropicApiKey: anthropicApiKey || undefined,
          anthropicModel,
          browserbaseApiKey: browserbaseApiKey || undefined,
          useBrowserbase,
          stagehandHeadless,
          stagehandDebug,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const data = await response.json();
      setSettings(data);

      // Clear API key inputs after save
      setGeminiApiKey('');
      setOpenaiApiKey('');
      setAnthropicApiKey('');
      setBrowserbaseApiKey('');

      setTestResult({ success: true, message: 'Settings saved successfully!' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/ai-settings/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider }),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const deleteApiKey = async (keyProvider: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/api/ai-settings/key/${keyProvider}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchSettings();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  const getProviderIcon = (p: string) => {
    switch (p) {
      case 'gemini':
        return <Sparkles className="w-5 h-5" />;
      case 'openai':
        return <Brain className="w-5 h-5" />;
      case 'anthropic':
        return <Cpu className="w-5 h-5" />;
      default:
        return <Settings className="w-5 h-5" />;
    }
  };

  const hasCurrentProviderKey = () => {
    if (!settings) return false;
    switch (provider) {
      case 'gemini':
        return settings.hasGeminiKey;
      case 'openai':
        return settings.hasOpenaiKey;
      case 'anthropic':
        return settings.hasAnthropicKey;
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-dark-bg rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-border-default shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">AI Settings</h2>
              <p className="text-sm text-text-muted">Configure AI providers for Copilot</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-dark-card rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  AI Provider
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['gemini', 'openai', 'anthropic'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setProvider(p)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                        provider === p
                          ? 'border-accent-purple bg-accent-purple/20 text-accent-purple'
                          : 'border-border-default bg-dark-card text-text-muted hover:border-border-muted'
                      }`}
                    >
                      {getProviderIcon(p)}
                      <span className="capitalize">{p}</span>
                      {settings &&
                        ((p === 'gemini' && settings.hasGeminiKey) ||
                          (p === 'openai' && settings.hasOpenaiKey) ||
                          (p === 'anthropic' && settings.hasAnthropicKey)) && (
                          <Check className="w-4 h-4 text-accent-green ml-auto" />
                        )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider-specific settings */}
              <div className="space-y-4">
                {provider === 'gemini' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Gemini API Key
                        {settings?.hasGeminiKey && (
                          <span className="ml-2 text-xs text-accent-green">(configured)</span>
                        )}
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showGeminiKey ? 'text' : 'password'}
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            placeholder={
                              settings?.hasGeminiKey
                                ? 'Enter new key to update...'
                                : 'Enter your Gemini API key'
                            }
                            className="w-full px-4 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-purple"
                          />
                          <button
                            type="button"
                            onClick={() => setShowGeminiKey(!showGeminiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                          >
                            {showGeminiKey ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {settings?.hasGeminiKey && (
                          <button
                            onClick={() => deleteApiKey('gemini')}
                            className="px-3 py-2 bg-accent-red/20 text-accent-red rounded-lg hover:bg-accent-red/30"
                            title="Delete API key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-text-muted">
                        Get your API key from{' '}
                        <a
                          href="https://aistudio.google.com/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-purple hover:underline"
                        >
                          Google AI Studio
                        </a>
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Model
                      </label>
                      <select
                        value={geminiModel}
                        onChange={(e) => setGeminiModel(e.target.value)}
                        className="w-full px-4 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple"
                      >
                        {GEMINI_MODELS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {provider === 'openai' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        OpenAI API Key
                        {settings?.hasOpenaiKey && (
                          <span className="ml-2 text-xs text-accent-green">(configured)</span>
                        )}
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showOpenaiKey ? 'text' : 'password'}
                            value={openaiApiKey}
                            onChange={(e) => setOpenaiApiKey(e.target.value)}
                            placeholder={
                              settings?.hasOpenaiKey
                                ? 'Enter new key to update...'
                                : 'Enter your OpenAI API key'
                            }
                            className="w-full px-4 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-purple"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                          >
                            {showOpenaiKey ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {settings?.hasOpenaiKey && (
                          <button
                            onClick={() => deleteApiKey('openai')}
                            className="px-3 py-2 bg-accent-red/20 text-accent-red rounded-lg hover:bg-accent-red/30"
                            title="Delete API key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-text-muted">
                        Get your API key from{' '}
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-purple hover:underline"
                        >
                          OpenAI Platform
                        </a>
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Model
                      </label>
                      <select
                        value={openaiModel}
                        onChange={(e) => setOpenaiModel(e.target.value)}
                        className="w-full px-4 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple"
                      >
                        {OPENAI_MODELS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {provider === 'anthropic' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Anthropic API Key
                        {settings?.hasAnthropicKey && (
                          <span className="ml-2 text-xs text-accent-green">(configured)</span>
                        )}
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showAnthropicKey ? 'text' : 'password'}
                            value={anthropicApiKey}
                            onChange={(e) => setAnthropicApiKey(e.target.value)}
                            placeholder={
                              settings?.hasAnthropicKey
                                ? 'Enter new key to update...'
                                : 'Enter your Anthropic API key'
                            }
                            className="w-full px-4 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-purple"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                          >
                            {showAnthropicKey ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {settings?.hasAnthropicKey && (
                          <button
                            onClick={() => deleteApiKey('anthropic')}
                            className="px-3 py-2 bg-accent-red/20 text-accent-red rounded-lg hover:bg-accent-red/30"
                            title="Delete API key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-text-muted">
                        Get your API key from{' '}
                        <a
                          href="https://console.anthropic.com/settings/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-purple hover:underline"
                        >
                          Anthropic Console
                        </a>
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Model
                      </label>
                      <select
                        value={anthropicModel}
                        onChange={(e) => setAnthropicModel(e.target.value)}
                        className="w-full px-4 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple"
                      >
                        {ANTHROPIC_MODELS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Browser Settings */}
              <div className="pt-4 border-t border-border-default">
                <h3 className="text-sm font-medium text-text-secondary mb-4 flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Browser Settings
                </h3>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stagehandHeadless}
                      onChange={(e) => setStagehandHeadless(e.target.checked)}
                      className="w-4 h-4 rounded border-border-default bg-dark-card text-accent-purple focus:ring-accent-purple"
                    />
                    <div>
                      <span className="text-sm text-text-secondary">Headless Mode</span>
                      <p className="text-xs text-text-muted">Run browser without visible window</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stagehandDebug}
                      onChange={(e) => setStagehandDebug(e.target.checked)}
                      className="w-4 h-4 rounded border-border-default bg-dark-card text-accent-purple focus:ring-accent-purple"
                    />
                    <div>
                      <span className="text-sm text-text-secondary">Debug Mode</span>
                      <p className="text-xs text-text-muted">Show detailed AI reasoning in logs</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Browserbase (Cloud Browser) */}
              <div className="pt-4 border-t border-border-default">
                <h3 className="text-sm font-medium text-text-secondary mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Cloud Browser (Optional)
                </h3>

                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={useBrowserbase}
                    onChange={(e) => setUseBrowserbase(e.target.checked)}
                    className="w-4 h-4 rounded border-border-default bg-dark-card text-accent-purple focus:ring-accent-purple"
                  />
                  <div>
                    <span className="text-sm text-text-secondary">Use Browserbase</span>
                    <p className="text-xs text-text-muted">
                      Run browser in cloud instead of locally
                    </p>
                  </div>
                </label>

                {useBrowserbase && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Browserbase API Key
                      {settings?.hasBrowserbaseKey && (
                        <span className="ml-2 text-xs text-accent-green">(configured)</span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showBrowserbaseKey ? 'text' : 'password'}
                          value={browserbaseApiKey}
                          onChange={(e) => setBrowserbaseApiKey(e.target.value)}
                          placeholder="Enter your Browserbase API key"
                          className="w-full px-4 py-2 bg-dark-card border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-purple"
                        />
                        <button
                          type="button"
                          onClick={() => setShowBrowserbaseKey(!showBrowserbaseKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                        >
                          {showBrowserbaseKey ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {settings?.hasBrowserbaseKey && (
                        <button
                          onClick={() => deleteApiKey('browserbase')}
                          className="px-3 py-2 bg-accent-red/20 text-accent-red rounded-lg hover:bg-accent-red/30"
                          title="Delete API key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      Get your API key from{' '}
                      <a
                        href="https://www.browserbase.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-purple hover:underline"
                      >
                        Browserbase
                      </a>
                    </p>
                  </div>
                )}
              </div>

              {/* Test Result / Error */}
              {testResult && (
                <div
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
                    testResult.success
                      ? 'bg-accent-green/20 text-accent-green'
                      : 'bg-accent-red/20 text-accent-red'
                  }`}
                >
                  {testResult.success ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span className="text-sm">{testResult.message}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-accent-red/20 text-accent-red">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-default bg-dark-card/50">
          <button
            onClick={testConnection}
            disabled={testing || !hasCurrentProviderKey()}
            className="flex items-center gap-2 px-4 py-2 bg-dark-elevated text-text-secondary rounded-lg hover:bg-dark-card disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4" />
            )}
            Test Connection
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AISettingsModal;
