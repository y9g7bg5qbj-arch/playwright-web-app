/**
 * RemoteEndpointConfig - Manage remote execution endpoints
 */
import React, { useState } from 'react';
import {
  Globe,
  Plus,
  X,
  Check,
  Eye,
  EyeOff,
  ChevronDown,
  Info,
} from 'lucide-react';
import type {
  RemoteEndpoint,
  RemoteAuth,
  SSLConfig,
  BrowserType,
} from '@/types/execution';
import { EndpointCard } from './EndpointCard';

interface RemoteEndpointConfigProps {
  endpoints: RemoteEndpoint[];
  onAdd: (endpoint: Omit<RemoteEndpoint, 'id' | 'status' | 'activeWorkers' | 'latency' | 'lastConnected'>) => void;
  onUpdate: (id: string, endpoint: Partial<RemoteEndpoint>) => void;
  onDelete: (id: string) => void;
  onTestConnection: (id: string) => Promise<boolean>;
  disabled?: boolean;
}

interface EndpointFormData {
  name: string;
  url: string;
  browsers: BrowserType[];
  workerCapacity: number;
  auth: RemoteAuth;
  ssl: SSLConfig;
}

const defaultFormData: EndpointFormData = {
  name: '',
  url: '',
  browsers: ['chromium'],
  workerCapacity: 4,
  auth: { type: 'none' },
  ssl: { enabled: true, rejectUnauthorized: true },
};

export const RemoteEndpointConfig: React.FC<RemoteEndpointConfigProps> = ({
  endpoints,
  onAdd,
  onUpdate,
  onDelete,
  onTestConnection,
  disabled = false,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EndpointFormData>(defaultFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    } else {
      try {
        new URL(formData.url);
      } catch {
        newErrors.url = 'Invalid URL format';
      }
    }

    if (formData.browsers.length === 0) {
      newErrors.browsers = 'Select at least one browser';
    }

    if (formData.workerCapacity < 1) {
      newErrors.workerCapacity = 'Must have at least 1 worker';
    }

    if (formData.auth.type === 'basic' && (!formData.auth.username || !formData.auth.password)) {
      newErrors.auth = 'Username and password are required for basic auth';
    }

    if (formData.auth.type === 'token' && !formData.auth.token) {
      newErrors.auth = 'Token is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    if (editingId) {
      onUpdate(editingId, formData);
      setEditingId(null);
    } else {
      onAdd(formData);
      setIsAdding(false);
    }
    setFormData(defaultFormData);
    setErrors({});
  };

  const handleEdit = (endpoint: RemoteEndpoint) => {
    setEditingId(endpoint.id);
    setFormData({
      name: endpoint.name,
      url: endpoint.url,
      browsers: endpoint.browsers,
      workerCapacity: endpoint.workerCapacity,
      auth: endpoint.auth || { type: 'none' },
      ssl: endpoint.ssl || { enabled: true, rejectUnauthorized: true },
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(defaultFormData);
    setErrors({});
  };

  const handleTestConnection = async (id: string) => {
    setTestingIds((prev) => new Set(prev).add(id));
    try {
      await onTestConnection(id);
    } finally {
      setTestingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleBrowser = (browser: BrowserType) => {
    if (formData.browsers.includes(browser)) {
      if (formData.browsers.length > 1) {
        setFormData({ ...formData, browsers: formData.browsers.filter((b) => b !== browser) });
      }
    } else {
      setFormData({ ...formData, browsers: [...formData.browsers, browser] });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          <h3 className="font-medium text-slate-200">Remote Endpoints</h3>
          <span className="px-2 py-0.5 text-xs bg-slate-800 text-slate-400 rounded-full">
            {endpoints.length}
          </span>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Endpoint
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-200">
              {editingId ? 'Edit Endpoint' : 'Add New Endpoint'}
            </h4>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-slate-700 rounded text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label className="block text-sm text-slate-400">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Production Grid"
              disabled={disabled}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {errors.name && (
              <span className="text-xs text-red-400">{errors.name}</span>
            )}
          </div>

          {/* URL */}
          <div className="space-y-1">
            <label className="block text-sm text-slate-400">URL</label>
            <input
              type="text"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://grid.example.com:4444"
              disabled={disabled}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
            />
            {errors.url && (
              <span className="text-xs text-red-400">{errors.url}</span>
            )}
          </div>

          {/* Browsers */}
          <div className="space-y-2">
            <label className="block text-sm text-slate-400">Browsers</label>
            <div className="flex gap-2">
              {(['chromium', 'firefox', 'webkit'] as BrowserType[]).map((browser) => (
                <button
                  key={browser}
                  onClick={() => toggleBrowser(browser)}
                  disabled={disabled}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    formData.browsers.includes(browser)
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {browser}
                </button>
              ))}
            </div>
            {errors.browsers && (
              <span className="text-xs text-red-400">{errors.browsers}</span>
            )}
          </div>

          {/* Worker Capacity */}
          <div className="space-y-1">
            <label className="block text-sm text-slate-400">Worker Capacity</label>
            <input
              type="number"
              value={formData.workerCapacity}
              onChange={(e) => setFormData({ ...formData, workerCapacity: parseInt(e.target.value, 10) || 1 })}
              min={1}
              max={100}
              disabled={disabled}
              className="w-32 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
            {errors.workerCapacity && (
              <span className="text-xs text-red-400">{errors.workerCapacity}</span>
            )}
          </div>

          {/* Authentication */}
          <div className="space-y-3">
            <label className="block text-sm text-slate-400">Authentication</label>
            <div className="relative">
              <select
                value={formData.auth.type}
                onChange={(e) => setFormData({ ...formData, auth: { ...formData.auth, type: e.target.value as any } })}
                disabled={disabled}
                className="w-full appearance-none bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 pr-10 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="none">None</option>
                <option value="basic">Basic Auth</option>
                <option value="token">API Token</option>
                <option value="oauth">OAuth 2.0</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>

            {formData.auth.type === 'basic' && (
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={formData.auth.username || ''}
                  onChange={(e) => setFormData({ ...formData, auth: { ...formData.auth, username: e.target.value } })}
                  placeholder="Username"
                  disabled={disabled}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.auth.password || ''}
                    onChange={(e) => setFormData({ ...formData, auth: { ...formData.auth, password: e.target.value } })}
                    placeholder="Password"
                    disabled={disabled}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 pr-10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {formData.auth.type === 'token' && (
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.auth.token || ''}
                  onChange={(e) => setFormData({ ...formData, auth: { ...formData.auth, token: e.target.value } })}
                  placeholder="API Token"
                  disabled={disabled}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 pr-10 text-sm text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {errors.auth && (
              <span className="text-xs text-red-400">{errors.auth}</span>
            )}
          </div>

          {/* SSL/TLS */}
          <div className="space-y-3">
            <label className="block text-sm text-slate-400">SSL/TLS Settings</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ssl.enabled}
                  onChange={(e) => setFormData({ ...formData, ssl: { ...formData.ssl, enabled: e.target.checked } })}
                  disabled={disabled}
                  className="w-4 h-4 rounded text-blue-500 bg-slate-700 border-slate-600 focus:ring-blue-500/50"
                />
                <span className="text-sm text-slate-300">Enable SSL/TLS</span>
              </label>
              {formData.ssl.enabled && (
                <label className="flex items-center gap-2 cursor-pointer pl-6">
                  <input
                    type="checkbox"
                    checked={formData.ssl.rejectUnauthorized}
                    onChange={(e) => setFormData({ ...formData, ssl: { ...formData.ssl, rejectUnauthorized: e.target.checked } })}
                    disabled={disabled}
                    className="w-4 h-4 rounded text-blue-500 bg-slate-700 border-slate-600 focus:ring-blue-500/50"
                  />
                  <span className="text-sm text-slate-300">Verify certificates</span>
                </label>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={disabled}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {editingId ? 'Update' : 'Add'} Endpoint
            </button>
          </div>
        </div>
      )}

      {/* Endpoint List */}
      {endpoints.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {endpoints.map((endpoint) => (
            <EndpointCard
              key={endpoint.id}
              endpoint={endpoint}
              onEdit={handleEdit}
              onDelete={onDelete}
              onTestConnection={handleTestConnection}
              isTestingConnection={testingIds.has(endpoint.id)}
            />
          ))}
        </div>
      ) : !isAdding ? (
        <div className="p-8 rounded-lg border border-dashed border-slate-700 bg-slate-800/30 text-center">
          <Globe className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="mt-3 text-slate-400">No remote endpoints configured</p>
          <p className="text-sm text-slate-500 mt-1">
            Add a remote endpoint to run tests on external infrastructure
          </p>
          <button
            onClick={() => setIsAdding(true)}
            disabled={disabled}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors mx-auto disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Your First Endpoint
          </button>
        </div>
      ) : null}

      {/* Info */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-300">
          <strong>Remote Execution:</strong> Connect to Selenium Grid, Playwright Grid, or cloud
          providers like BrowserStack and Sauce Labs. Tests will be distributed across available workers.
        </div>
      </div>
    </div>
  );
};

export default RemoteEndpointConfig;
