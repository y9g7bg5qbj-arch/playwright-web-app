/**
 * Data Storage Settings Modal
 *
 * Configure database backend for test data storage (MongoDB, PostgreSQL, MySQL).
 * GitHub dark theme aesthetic with blue accents.
 */

import { useState, useEffect } from 'react';
import {
  Database,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  TestTube,
  Leaf,
  CircleDot,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { IconButton, Modal, Button } from '@/components/ui';

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
    color: 'text-status-success',
    bgColor: 'bg-status-success/10',
    borderColor: 'border-status-success/30',
    requiresConfig: false,
  },
  {
    id: 'mongodb' as const,
    name: 'MongoDB',
    description: 'Document database for flexible test data',
    icon: Leaf,
    color: 'text-status-success',
    bgColor: 'bg-status-success/10',
    borderColor: 'border-status-success/30',
    requiresConfig: true,
    defaultPort: 27017,
  },
  {
    id: 'postgresql' as const,
    name: 'PostgreSQL',
    description: 'Powerful relational database',
    icon: CircleDot,
    color: 'text-status-info',
    bgColor: 'bg-status-info/10',
    borderColor: 'border-status-info/30',
    requiresConfig: true,
    defaultPort: 5432,
  },
  {
    id: 'mysql' as const,
    name: 'MySQL',
    description: 'Popular relational database',
    icon: Zap,
    color: 'text-status-warning',
    bgColor: 'bg-status-warning/10',
    borderColor: 'border-status-warning/30',
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

  const selectedProvider = PROVIDERS.find((p) => p.id === provider);
  const ProviderIcon = selectedProvider?.icon || Database;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Data Storage Settings"
      description={applicationName ? `Configure database for ${applicationName}` : 'Configure test data storage'}
      size="2xl"
      bodyClassName="max-h-[70vh]"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              leftIcon={testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
              disabled={testing || provider === 'sqlite'}
              onClick={testConnection}
            >
              Test Connection
            </Button>
            {provider !== 'sqlite' && config && !config.isDefault && (
              <IconButton
                icon={<RefreshCw className="w-4 h-4" />}
                variant="ghost"
                tooltip="Reset to SQLite"
                onClick={resetToDefault}
              />
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              variant="success"
              isLoading={saving}
              onClick={saveConfig}
            >
              Save Configuration
            </Button>
          </div>
        </div>
      }
    >
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-status-info" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">
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
                            : 'border-border-default bg-dark-card hover:border-border-default'
                        }`}
                      >
                        <div className={`mt-0.5 ${provider === p.id ? p.color : 'text-text-secondary'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium ${provider === p.id ? p.color : 'text-text-primary'}`}>
                            {p.name}
                          </div>
                          <div className="text-xs text-text-secondary mt-0.5">{p.description}</div>
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
                <div className="space-y-4 pt-4 border-t border-border-default">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                      <ProviderIcon className={`w-4 h-4 ${selectedProvider?.color}`} />
                      Connection Settings
                    </h3>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={useConnectionString}
                        onChange={(e) => setUseConnectionString(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-border-default bg-dark-canvas text-status-info focus:ring-status-info"
                      />
                      <span className="text-text-secondary">Use connection string</span>
                    </label>
                  </div>

                  {useConnectionString ? (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Connection String
                        {config?.hasConnectionString && (
                          <span className="ml-2 text-xs text-status-success">(configured)</span>
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
                          className="w-full px-4 py-2.5 bg-dark-canvas border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-status-info focus:border-transparent font-mono text-sm"
                        />
                        <IconButton
                          icon={showConnectionString ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          size="sm"
                          variant="ghost"
                          tooltip={showConnectionString ? 'Hide' : 'Show'}
                          onClick={() => setShowConnectionString(!showConnectionString)}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Host
                          </label>
                          <input
                            type="text"
                            value={host}
                            onChange={(e) => setHost(e.target.value)}
                            placeholder="localhost or hostname"
                            className="w-full px-4 py-2.5 bg-dark-canvas border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-status-info focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Port
                          </label>
                          <input
                            type="number"
                            value={port}
                            onChange={(e) => setPort(parseInt(e.target.value) || 0)}
                            placeholder={String(selectedProvider?.defaultPort || 27017)}
                            className="w-full px-4 py-2.5 bg-dark-canvas border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-status-info focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          Database Name
                        </label>
                        <input
                          type="text"
                          value={database}
                          onChange={(e) => setDatabase(e.target.value)}
                          placeholder="vero_test_data"
                          className="w-full px-4 py-2.5 bg-dark-canvas border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-status-info focus:border-transparent"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Username
                          </label>
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Database username"
                            className="w-full px-4 py-2.5 bg-dark-canvas border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-status-info focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Password
                            {config?.hasPassword && (
                              <span className="ml-2 text-xs text-status-success">(set)</span>
                            )}
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder={config?.hasPassword ? 'Enter new password' : 'Database password'}
                              className="w-full px-4 py-2.5 bg-dark-canvas border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-status-info focus:border-transparent"
                            />
                            <IconButton
                              icon={showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              size="sm"
                              variant="ghost"
                              tooltip={showPassword ? 'Hide' : 'Show'}
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2"
                            />
                          </div>
                        </div>
                      </div>

                      <label className="flex items-center gap-3 cursor-pointer mt-2">
                        <input
                          type="checkbox"
                          checked={useSSL}
                          onChange={(e) => setUseSSL(e.target.checked)}
                          className="w-4 h-4 rounded border-border-default bg-dark-canvas text-status-info focus:ring-status-info"
                        />
                        <div>
                          <span className="text-sm text-text-primary">Use SSL/TLS</span>
                          <p className="text-xs text-text-secondary">Encrypt connection (recommended)</p>
                        </div>
                      </label>
                    </>
                  )}
                </div>
              )}

              {/* SQLite Info */}
              {provider === 'sqlite' && (
                <div className="p-4 bg-status-success/5 border border-status-success/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Database className="w-5 h-5 text-status-success mt-0.5" />
                    <div>
                      <p className="text-sm text-text-primary font-medium">Built-in SQLite Database</p>
                      <p className="text-xs text-text-secondary mt-1">
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
                      ? 'bg-status-success/20 border border-status-success/30'
                      : 'bg-status-danger/20 border border-status-danger/30'
                  }`}
                >
                  {testResult.success ? (
                    <Check className="w-5 h-5 text-status-success mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-status-danger mt-0.5" />
                  )}
                  <div>
                    <span
                      className={`text-sm font-medium ${
                        testResult.success ? 'text-status-success' : 'text-status-danger'
                      }`}
                    >
                      {testResult.success ? testResult.message : testResult.error}
                    </span>
                    {testResult.serverInfo?.version && (
                      <p className="text-xs text-text-secondary mt-1">
                        Server version: {testResult.serverInfo.version}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-status-danger/20 border border-status-danger/30">
                  <AlertCircle className="w-5 h-5 text-status-danger" />
                  <span className="text-sm text-status-danger">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>
    </Modal>
  );
}

export default DataStorageSettingsModal;
