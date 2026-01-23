/**
 * AI Settings Modal
 *
 * Configure AI providers for test generation (Gemini, OpenAI, Anthropic)
 */

import { useState, useEffect } from 'react';

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
  { value: 'google/gemini-2.0-flash', label: 'Gemini 2.0 Flash (Recommended)' },
  { value: 'gemini-2.5-pro-preview-03-25', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.5-flash-preview-04-17', label: 'Gemini 2.5 Flash' },
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

export function AISettingsModal({ isOpen, onClose }: AISettingsModalProps): JSX.Element | null {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('google/gemini-2.0-flash');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [anthropicModel, setAnthropicModel] = useState('claude-sonnet-4-20250514');
  const [browserbaseApiKey, setBrowserbaseApiKey] = useState('');
  const [useBrowserbase, setUseBrowserbase] = useState(false);
  const [stagehandHeadless, setStagehandHeadless] = useState(true);

  // Show/hide API keys
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showBrowserbaseKey, setShowBrowserbaseKey] = useState(false);

  const API_URL = '/api';

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  async function fetchSettings(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/ai-settings`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setProvider(data.provider || 'gemini');
        setGeminiModel(data.geminiModel || 'google/gemini-2.0-flash');
        setOpenaiModel(data.openaiModel || 'gpt-4o');
        setAnthropicModel(data.anthropicModel || 'claude-sonnet-4-20250514');
        setUseBrowserbase(data.useBrowserbase || false);
        setStagehandHeadless(data.stagehandHeadless !== false);
      }
    } catch (err) {
      console.error('Failed to fetch AI settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/ai-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setGeminiApiKey('');
        setOpenaiApiKey('');
        setAnthropicApiKey('');
        setBrowserbaseApiKey('');
        setTestResult({ success: true, message: 'Settings saved successfully' });
        setTimeout(() => setTestResult(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Failed to save AI settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection(): Promise<void> {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(`${API_URL}/ai-settings/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ provider }),
      });
      const data = await response.json();
      setTestResult({
        success: data.success,
        message: data.message || data.error || 'Test completed',
      });
    } catch (err) {
      console.error('Failed to test connection:', err);
      setTestResult({ success: false, message: 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  }

  async function handleDeleteKey(keyProvider: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/ai-settings/key/${keyProvider}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        await fetchSettings();
      }
    } catch (err) {
      console.error('Failed to delete key:', err);
    }
  }

  if (!isOpen) return null;

  const providerConfig = {
    gemini: { name: 'Gemini', models: GEMINI_MODELS, color: 'blue' },
    openai: { name: 'OpenAI', models: OPENAI_MODELS, color: 'green' },
    anthropic: { name: 'Anthropic', models: ANTHROPIC_MODELS, color: 'orange' },
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-sky-400">auto_awesome</span>
            <h2 className="text-lg font-semibold text-white">AI Provider Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#30363d] rounded transition-colors"
          >
            <span className="material-symbols-outlined text-[#8b949e]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {error}
                </div>
              )}

              {/* Test Result */}
              {testResult && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  testResult.success
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  <span className="material-symbols-outlined text-sm">
                    {testResult.success ? 'check_circle' : 'error'}
                  </span>
                  {testResult.message}
                </div>
              )}

              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-[#e6edf3] mb-2">
                  AI Provider
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['gemini', 'openai', 'anthropic'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setProvider(p)}
                      className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                        provider === p
                          ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                          : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]'
                      }`}
                    >
                      {providerConfig[p].name}
                      {settings && (
                        <span className="ml-2">
                          {p === 'gemini' && settings.hasGeminiKey && (
                            <span className="text-green-400">*</span>
                          )}
                          {p === 'openai' && settings.hasOpenaiKey && (
                            <span className="text-green-400">*</span>
                          )}
                          {p === 'anthropic' && settings.hasAnthropicKey && (
                            <span className="text-green-400">*</span>
                          )}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider-specific settings */}
              <div className="space-y-4">
                {/* Gemini */}
                {provider === 'gemini' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#e6edf3] mb-2">
                        Gemini API Key
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type={showGeminiKey ? 'text' : 'password'}
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            placeholder={settings?.hasGeminiKey ? '(key configured)' : 'Enter API key'}
                            className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-[#6e7681] focus:outline-none focus:border-sky-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowGeminiKey(!showGeminiKey)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#30363d] rounded"
                          >
                            <span className="material-symbols-outlined text-sm text-[#8b949e]">
                              {showGeminiKey ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>
                        </div>
                        {settings?.hasGeminiKey && (
                          <button
                            onClick={() => handleDeleteKey('gemini')}
                            className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"
                            title="Delete key"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#e6edf3] mb-2">
                        Model
                      </label>
                      <select
                        value={geminiModel}
                        onChange={(e) => setGeminiModel(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-sky-500"
                      >
                        {GEMINI_MODELS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* OpenAI */}
                {provider === 'openai' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#e6edf3] mb-2">
                        OpenAI API Key
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type={showOpenaiKey ? 'text' : 'password'}
                            value={openaiApiKey}
                            onChange={(e) => setOpenaiApiKey(e.target.value)}
                            placeholder={settings?.hasOpenaiKey ? '(key configured)' : 'Enter API key'}
                            className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-[#6e7681] focus:outline-none focus:border-sky-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#30363d] rounded"
                          >
                            <span className="material-symbols-outlined text-sm text-[#8b949e]">
                              {showOpenaiKey ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>
                        </div>
                        {settings?.hasOpenaiKey && (
                          <button
                            onClick={() => handleDeleteKey('openai')}
                            className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"
                            title="Delete key"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#e6edf3] mb-2">
                        Model
                      </label>
                      <select
                        value={openaiModel}
                        onChange={(e) => setOpenaiModel(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-sky-500"
                      >
                        {OPENAI_MODELS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Anthropic */}
                {provider === 'anthropic' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#e6edf3] mb-2">
                        Anthropic API Key
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type={showAnthropicKey ? 'text' : 'password'}
                            value={anthropicApiKey}
                            onChange={(e) => setAnthropicApiKey(e.target.value)}
                            placeholder={settings?.hasAnthropicKey ? '(key configured)' : 'Enter API key'}
                            className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-[#6e7681] focus:outline-none focus:border-sky-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#30363d] rounded"
                          >
                            <span className="material-symbols-outlined text-sm text-[#8b949e]">
                              {showAnthropicKey ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>
                        </div>
                        {settings?.hasAnthropicKey && (
                          <button
                            onClick={() => handleDeleteKey('anthropic')}
                            className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"
                            title="Delete key"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#e6edf3] mb-2">
                        Model
                      </label>
                      <select
                        value={anthropicModel}
                        onChange={(e) => setAnthropicModel(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-sky-500"
                      >
                        {ANTHROPIC_MODELS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Browserbase Settings */}
              <div className="pt-4 border-t border-[#30363d]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-[#e6edf3]">Browserbase (Cloud Browser)</h3>
                    <p className="text-xs text-[#8b949e] mt-1">Use cloud browsers for test execution</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useBrowserbase}
                      onChange={(e) => setUseBrowserbase(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#30363d] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                {useBrowserbase && (
                  <div>
                    <label className="block text-sm font-medium text-[#e6edf3] mb-2">
                      Browserbase API Key
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showBrowserbaseKey ? 'text' : 'password'}
                          value={browserbaseApiKey}
                          onChange={(e) => setBrowserbaseApiKey(e.target.value)}
                          placeholder={settings?.hasBrowserbaseKey ? '(key configured)' : 'Enter API key'}
                          className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-[#6e7681] focus:outline-none focus:border-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowBrowserbaseKey(!showBrowserbaseKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#30363d] rounded"
                        >
                          <span className="material-symbols-outlined text-sm text-[#8b949e]">
                            {showBrowserbaseKey ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                      {settings?.hasBrowserbaseKey && (
                        <button
                          onClick={() => handleDeleteKey('browserbase')}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"
                          title="Delete key"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Browser Settings */}
              <div className="pt-4 border-t border-[#30363d]">
                <h3 className="text-sm font-medium text-[#e6edf3] mb-4">Browser Settings</h3>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stagehandHeadless}
                    onChange={(e) => setStagehandHeadless(e.target.checked)}
                    className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117] text-sky-500 focus:ring-sky-500"
                  />
                  <div>
                    <span className="text-sm text-[#e6edf3]">Headless Mode</span>
                    <p className="text-xs text-[#8b949e]">Run browser without visible window</p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#30363d]">
          <button
            onClick={handleTestConnection}
            disabled={testing || loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#21262d] border border-[#30363d] rounded-lg text-sm text-[#e6edf3] hover:bg-[#30363d] disabled:opacity-50 transition-colors"
          >
            {testing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Testing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">science</span>
                Test Connection
              </>
            )}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#8b949e] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">save</span>
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
