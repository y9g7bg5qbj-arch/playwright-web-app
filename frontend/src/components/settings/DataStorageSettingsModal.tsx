/**
 * Data Storage Settings Modal
 *
 * Configure database backend for test data storage (MongoDB, PostgreSQL, MySQL).
 * GitHub dark theme aesthetic with blue accents.
 */

import { useState, useEffect } from 'react';
import {
  X,
  Database,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  TestTube,
  Server,
  Leaf,
  CircleDot,
  Zap,
  RefreshCw,
} from 'lucide-react';

interface DataStorageConfig {
  id?: string;
  applicationId: string;
  provider: 'sqlite' | 'mongodb' | 'postgresql' | 'mysql';
  connectionString?: string | null;
  host?: string | null;
  port?: number | null;
  database?: string | null;
  username?: string | null;
  password?: string | null;
  useSSL?: boolean;
  isActive?: boolean;
  lastTestedAt?: string | null;
  lastError?: string | null;
  hasPassword?: boolean;
  hasConnectionString?: boolean;
  isDefault?: boolean;
}

interface DataStorageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  applicationName?: string;
}

const PROVIDERS = [
  {
    id: 'sqlite' as const,
    name: 'SQLite',
    description: 'Built-in local database, no setup required',
    icon: Database,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    requiresConfig: false,
  },
  {
    id: 'mongodb' as const,
    name: 'MongoDB',
    description: 'Document database for flexible test data',
    icon: Leaf,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    requiresConfig: true,
    defaultPort: 27017,
  },
  {
    id: 'postgresql' as const,
    name: 'PostgreSQL',
    description: 'Powerful relational database',
    icon: CircleDot,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    requiresConfig: true,
    defaultPort: 5432,
  },
  {
    id: 'mysql' as const,
    name: 'MySQL',
    description: 'Popular relational database',
    icon: Zap,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    requiresConfig: true,
    defaultPort: 3306,
  },
];

export function DataStorageSettingsModal({
  isOpen,
  onClose,
  applicationId,
  applicationName,
}: DataStorageSettingsModalProps) {
  const [config, setConfig] = useState<DataStorageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    latency?: number;
    serverInfo?: { version?: string };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [provider, setProvider] = useState<'sqlite' | 'mongodb' | 'postgresql' | 'mysql'>('sqlite');
  const [useConnectionString, setUseConnectionString] = useState(false);
  const [connectionString, setConnectionString] = useState('');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(27017);
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [useSSL, setUseSSL] = useState(true);

  // Show/hide sensitive fields
  const [showConnectionString, setShowConnectionString] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (isOpen && applicationId) {
      fetchConfig();
    }
  }, [isOpen, applicationId]);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/data-storage/${applicationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch configuration');
      }

      const data = await response.json();
      setConfig(data);

      // Update form state
      setProvider(data.provider || 'sqlite');
      setHost(data.host || 'localhost');
      setPort(data.port || getDefaultPort(data.provider));
      setDatabase(data.database || '');
      setUsername(data.username || '');
      setUseSSL(data.useSSL ?? true);
      setUseConnectionString(!!data.hasConnectionString);

      // Clear sensitive fields
      setPassword('');
      setConnectionString('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPort = (p: string) => {
    const prov = PROVIDERS.find((pr) => pr.id === p);
    return prov?.defaultPort || 27017;
  };

  const saveConfig = async () => {
    setSaving(true);
    setError(null);
    setTestResult(null);
    try {
      const token = localStorage.getItem('auth_token');

      const payload: any = { provider };

      if (provider !== 'sqlite') {
        if (useConnectionString && connectionString) {
          payload.connectionString = connectionString;
        } else {
          payload.host = host;
          payload.port = port;
          payload.database = database;
          payload.username = username;
          if (password) payload.password = password;
          payload.useSSL = useSSL;
        }
      }

      const response = await fetch(`${API_URL}/api/data-storage/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      const data = await response.json();
      setConfig(data);

      // Clear sensitive inputs after save
      setPassword('');
      setConnectionString('');

      setTestResult({ success: true, message: 'Configuration saved successfully!' });
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

      const payload: any = { provider };

      if (provider !== 'sqlite') {
        if (useConnectionString && connectionString) {
          payload.connectionString = connectionString;
        } else {
          payload.host = host;
          payload.port = port;
          payload.database = database;
          payload.username = username;
          if (password) payload.password = password;
          payload.useSSL = useSSL;
        }
      }

      const response = await fetch(`${API_URL}/api/data-storage/${applicationId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setTestResult({
        success: data.success,
        message: data.success
          ? `Connected successfully! ${data.latency ? `(${data.latency}ms)` : ''}`
          : undefined,
        error: data.error,
        latency: data.latency,
        serverInfo: data.serverInfo,
      });
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const resetToDefault = async () => {
    if (!confirm('Reset to SQLite? This will disconnect from the current database.')) return;

    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_URL}/api/data-storage/${applicationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchConfig();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  const selectedProvider = PROVIDERS.find((p) => p.id === provider);
  const ProviderIcon = selectedProvider?.icon || Database;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#0d1117] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-[#30363d] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] bg-[#161b22]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#58a6ff] to-[#1f6feb] flex items-center justify-center">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#e6edf3]">Data Storage Settings</h2>
              <p className="text-sm text-[#8b949e]">
                {applicationName ? `Configure database for ${applicationName}` : 'Configure test data storage'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#58a6ff]" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-[#8b949e] mb-3">
                  Database Provider
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {PROVIDERS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setProvider(p.id);
                          setPort(p.defaultPort || 27017);
                          setTestResult(null);
                        }}
                        className={`flex items-start gap-3 px-4 py-3 rounded-lg border transition-all text-left ${
                          provider === p.id
                            ? `${p.borderColor} ${p.bgColor}`
                            : 'border-[#30363d] bg-[#161b22] hover:border-[#484f58]'
                        }`}
                      >
                        <div className={`mt-0.5 ${provider === p.id ? p.color : 'text-[#8b949e]'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium ${provider === p.id ? p.color : 'text-[#e6edf3]'}`}>
                            {p.name}
                          </div>
                          <div className="text-xs text-[#8b949e] mt-0.5">{p.description}</div>
                        </div>
                        {provider === p.id && (
                          <Check className={`w-4 h-4 ${p.color}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Connection Settings (for non-SQLite providers) */}
              {provider !== 'sqlite' && (
                <div className="space-y-4 pt-4 border-t border-[#30363d]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#8b949e] flex items-center gap-2">
                      <ProviderIcon className={`w-4 h-4 ${selectedProvider?.color}`} />
                      Connection Settings
                    </h3>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={useConnectionString}
                        onChange={(e) => setUseConnectionString(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-[#30363d] bg-[#0d1117] text-[#58a6ff] focus:ring-[#58a6ff]"
                      />
                      <span className="text-[#8b949e]">Use connection string</span>
                    </label>
                  </div>

                  {useConnectionString ? (
                    <div>
                      <label className="block text-sm font-medium text-[#8b949e] mb-2">
                        Connection String
                        {config?.hasConnectionString && (
                          <span className="ml-2 text-xs text-[#3fb950]">(configured)</span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type={showConnectionString ? 'text' : 'password'}
                          value={connectionString}
                          onChange={(e) => setConnectionString(e.target.value)}
                          placeholder={
                            provider === 'mongodb'
                              ? 'mongodb://user:password@host:27017/database'
                              : provider === 'postgresql'
                              ? 'postgresql://user:password@host:5432/database'
                              : 'mysql://user:password@host:3306/database'
                          }
                          className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConnectionString(!showConnectionString)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#e6edf3]"
                        >
                          {showConnectionString ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#8b949e] mb-2">
                            Host
                          </label>
                          <input
                            type="text"
                            value={host}
                            onChange={(e) => setHost(e.target.value)}
                            placeholder="localhost or hostname"
                            className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#8b949e] mb-2">
                            Port
                          </label>
                          <input
                            type="number"
                            value={port}
                            onChange={(e) => setPort(parseInt(e.target.value) || 0)}
                            placeholder={String(selectedProvider?.defaultPort || 27017)}
                            className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#8b949e] mb-2">
                          Database Name
                        </label>
                        <input
                          type="text"
                          value={database}
                          onChange={(e) => setDatabase(e.target.value)}
                          placeholder="vero_test_data"
                          className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#8b949e] mb-2">
                            Username
                          </label>
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Database username"
                            className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#8b949e] mb-2">
                            Password
                            {config?.hasPassword && (
                              <span className="ml-2 text-xs text-[#3fb950]">(set)</span>
                            )}
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder={config?.hasPassword ? 'Enter new password' : 'Database password'}
                              className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#e6edf3]"
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <label className="flex items-center gap-3 cursor-pointer mt-2">
                        <input
                          type="checkbox"
                          checked={useSSL}
                          onChange={(e) => setUseSSL(e.target.checked)}
                          className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117] text-[#58a6ff] focus:ring-[#58a6ff]"
                        />
                        <div>
                          <span className="text-sm text-[#e6edf3]">Use SSL/TLS</span>
                          <p className="text-xs text-[#8b949e]">Encrypt connection (recommended)</p>
                        </div>
                      </label>
                    </>
                  )}
                </div>
              )}

              {/* SQLite Info */}
              {provider === 'sqlite' && (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Database className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-[#e6edf3] font-medium">Built-in SQLite Database</p>
                      <p className="text-xs text-[#8b949e] mt-1">
                        SQLite is the default storage option. Your test data is stored locally with no
                        additional configuration required. Perfect for development and small teams.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Result / Error */}
              {testResult && (
                <div
                  className={`flex items-start gap-3 px-4 py-3 rounded-lg ${
                    testResult.success
                      ? 'bg-[#238636]/20 border border-[#238636]/30'
                      : 'bg-[#da3633]/20 border border-[#da3633]/30'
                  }`}
                >
                  {testResult.success ? (
                    <Check className="w-5 h-5 text-[#3fb950] mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-[#f85149] mt-0.5" />
                  )}
                  <div>
                    <span
                      className={`text-sm font-medium ${
                        testResult.success ? 'text-[#3fb950]' : 'text-[#f85149]'
                      }`}
                    >
                      {testResult.success ? testResult.message : testResult.error}
                    </span>
                    {testResult.serverInfo?.version && (
                      <p className="text-xs text-[#8b949e] mt-1">
                        Server version: {testResult.serverInfo.version}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#da3633]/20 border border-[#da3633]/30">
                  <AlertCircle className="w-5 h-5 text-[#f85149]" />
                  <span className="text-sm text-[#f85149]">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#30363d] bg-[#161b22]">
          <div className="flex gap-2">
            <button
              onClick={testConnection}
              disabled={testing || provider === 'sqlite'}
              className="flex items-center gap-2 px-4 py-2 bg-[#21262d] text-[#e6edf3] rounded-lg hover:bg-[#30363d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4" />
              )}
              Test Connection
            </button>
            {provider !== 'sqlite' && config && !config.isDefault && (
              <button
                onClick={resetToDefault}
                className="flex items-center gap-2 px-4 py-2 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg transition-colors"
                title="Reset to SQLite"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[#8b949e] hover:text-[#e6edf3] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#238636] text-white rounded-lg hover:bg-[#2ea043] disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataStorageSettingsModal;
