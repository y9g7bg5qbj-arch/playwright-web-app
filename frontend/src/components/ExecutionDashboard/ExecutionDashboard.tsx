/**
 * ExecutionDashboard - Main canvas component for viewing all test executions
 *
 * Displays a list of executions with timestamps, triggered by info, and expandable
 * details showing either live execution view or Allure-style reports.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Filter,
  Activity,
  Clock,
} from 'lucide-react';
import { ExecutionCard } from './ExecutionCard';
// import { executionsApi } from '@/api/executions';
import type { ShardInfo } from '../execution/LiveExecutionViewer';

export interface ExecutionWithDetails {
  id: string;
  testFlowId: string;
  testFlowName: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
  target: 'local' | 'docker' | 'remote';
  triggeredBy: {
    type: 'user' | 'scheduled' | 'api' | 'webhook';
    name?: string;
  };
  startedAt: string;
  finishedAt?: string;
  stepCount: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  duration?: number;
  scenarios?: ExecutionScenario[];
  shards?: ShardInfo[];
}

export interface ExecutionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface ExecutionAttachment {
  id: string;
  name: string;
  type: 'screenshot' | 'file' | 'video';
  path: string;
  timestamp: string;
  description?: string;
}

export interface ExecutionStep {
  id: string;
  stepNumber: number;
  action: string;
  description?: string;
  selector?: string;
  selectorName?: string;
  page?: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  screenshot?: string;
  startedAt?: string;
  finishedAt?: string;
  logs?: ExecutionLog[];
}

export interface ExecutionScenario {
  id: string;
  name: string;
  tags?: string[];
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  screenshot?: string;
  traceUrl?: string;
  steps?: ExecutionStep[];
  logs?: ExecutionLog[];
  attachments?: ExecutionAttachment[];
}

export interface ExecutionDashboardProps {
  onViewLive: (executionId: string, mode: 'docker' | 'local', shards?: ShardInfo[]) => void;
  onViewTrace: (traceUrl: string, testName: string) => void;
  onBack: () => void;
}

type StatusFilter = 'all' | 'running' | 'passed' | 'failed';

export const ExecutionDashboard: React.FC<ExecutionDashboardProps> = ({
  onViewLive,
  onViewTrace,
  onBack,
}) => {
  const [executions, setExecutions] = useState<ExecutionWithDetails[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch executions from both local storage and Docker traces
  const fetchExecutions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      // Fetch Docker executions from API
      const dockerExecutions: ExecutionWithDetails[] = [];
      try {
        const response = await fetch('/api/executions/docker/list');
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            // Convert Docker executions to ExecutionWithDetails format
            const dockerExecs = data.data.map((exec: {
              id: string;
              name: string;
              shard: string;
              status: 'passed' | 'failed';
              traceUrl: string;
              timestamp: string;
            }) => ({
              id: exec.id,
              testFlowId: `docker-${exec.shard}`,
              testFlowName: exec.name,
              status: exec.status,
              target: 'docker' as const,
              triggeredBy: { type: 'api' as const, name: `Docker ${exec.shard}` },
              startedAt: exec.timestamp,
              finishedAt: exec.timestamp,
              stepCount: 1,
              passedCount: exec.status === 'passed' ? 1 : 0,
              failedCount: exec.status === 'failed' ? 1 : 0,
              skippedCount: 0,
              scenarios: [{
                id: exec.id,
                name: exec.name,
                tags: [`@${exec.shard}`, '@docker'],
                status: exec.status,
                traceUrl: exec.traceUrl,
              }],
            }));
            dockerExecutions.push(...dockerExecs);
          }
        }
      } catch (err) {
        console.log('Docker executions not available:', err);
      }

      // Combine Docker executions with mock data (or real local executions when available)
      const mockExecs = getMockExecutions();
      const allExecutions = [...dockerExecutions, ...mockExecs];

      // Sort by date, newest first
      allExecutions.sort((a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );

      setExecutions(allExecutions);
    } catch (error) {
      console.error('Failed to fetch executions:', error);
      // Fallback to mock data
      setExecutions(getMockExecutions());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExecutions();

    // Auto-refresh every 3 seconds if there are running executions
    const interval = setInterval(() => {
      const hasRunning = executions.some(e => e.status === 'running');
      if (hasRunning) {
        fetchExecutions();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchExecutions, executions]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredExecutions = executions.filter(exec => {
    if (filter === 'all') return true;
    return exec.status === filter;
  });

  const filterCounts = {
    all: executions.length,
    running: executions.filter(e => e.status === 'running').length,
    passed: executions.filter(e => e.status === 'passed').length,
    failed: executions.filter(e => e.status === 'failed').length,
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Editor</span>
          </button>
          <div className="h-6 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-semibold text-slate-100">Execution History</h1>
          </div>
        </div>

        <button
          onClick={() => fetchExecutions(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 py-3 border-b border-slate-800 flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-500" />
        {(['all', 'running', 'passed', 'failed'] as StatusFilter[]).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              filter === status
                ? status === 'running' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  status === 'passed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  status === 'failed' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  'bg-slate-700 text-slate-200 border border-slate-600'
                : 'bg-slate-800/50 text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="text-xs opacity-70">({filterCounts[status]})</span>
          </button>
        ))}
      </div>

      {/* Execution List */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 text-sm">Loading executions...</p>
            </div>
          </div>
        ) : filteredExecutions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">No executions found</p>
            <p className="text-sm text-slate-500 mt-1">
              {filter !== 'all' ? 'Try changing your filter' : 'Run a test to see execution history'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-5xl mx-auto">
            {filteredExecutions.map(execution => (
              <ExecutionCard
                key={execution.id}
                execution={execution}
                isExpanded={expandedIds.has(execution.id)}
                onToggle={() => toggleExpand(execution.id)}
                onViewLive={() => onViewLive(
                  execution.id,
                  execution.target === 'docker' ? 'docker' : 'local',
                  execution.shards
                )}
                onViewTrace={onViewTrace}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Mock data for development
function getMockExecutions(): ExecutionWithDetails[] {
  return [
    {
      id: 'exec-001',
      testFlowId: 'flow-1',
      testFlowName: 'Login Flow Test',
      status: 'running',
      target: 'docker',
      triggeredBy: { type: 'user', name: 'John Doe' },
      startedAt: new Date(Date.now() - 120000).toISOString(),
      stepCount: 8,
      passedCount: 3,
      failedCount: 0,
      skippedCount: 0,
      shards: [
        { id: 'shard-1', shardIndex: 0, totalShards: 3, vncUrl: 'http://localhost:6081/vnc.html', status: 'running', currentTest: 'Login with valid credentials', progress: { passed: 1, failed: 0, total: 3 } },
        { id: 'shard-2', shardIndex: 1, totalShards: 3, vncUrl: 'http://localhost:6082/vnc.html', status: 'running', currentTest: 'Login with invalid password', progress: { passed: 1, failed: 0, total: 2 } },
        { id: 'shard-3', shardIndex: 2, totalShards: 3, vncUrl: 'http://localhost:6083/vnc.html', status: 'pending', progress: { passed: 0, failed: 0, total: 3 } },
      ],
      scenarios: [
        {
          id: 'sc1',
          name: 'Login with valid credentials',
          tags: ['@smoke', '@auth'],
          status: 'passed',
          duration: 3245,
          screenshot: '/screenshots/login-valid.png',
          traceUrl: '/api/executions/exec-001/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to login page', page: 'LoginPage', status: 'passed', duration: 1234 },
            { id: 's2', stepNumber: 2, action: 'fill', description: 'Enter username', selector: '#username', page: 'LoginPage', status: 'passed', duration: 156 },
            { id: 's3', stepNumber: 3, action: 'fill', description: 'Enter password', selector: '#password', page: 'LoginPage', status: 'passed', duration: 142 },
            { id: 's4', stepNumber: 4, action: 'click', description: 'Click login button', selector: 'button[type="submit"]', page: 'LoginPage', status: 'passed', duration: 89 },
            { id: 's5', stepNumber: 5, action: 'expect', description: 'Verify dashboard visible', page: 'DashboardPage', status: 'passed', duration: 512 },
          ],
          logs: [
            { timestamp: new Date(Date.now() - 3000).toISOString(), level: 'info', message: 'Starting login test with valid credentials' },
            { timestamp: new Date(Date.now() - 2500).toISOString(), level: 'info', message: 'User: testuser@example.com' },
            { timestamp: new Date(Date.now() - 1800).toISOString(), level: 'debug', message: 'Form submitted, waiting for redirect...' },
            { timestamp: new Date(Date.now() - 1200).toISOString(), level: 'info', message: 'Login successful! Dashboard loaded.' },
          ],
          attachments: [
            { id: 'att1', name: 'login-form.png', type: 'screenshot', path: '/screenshots/login-form.png', timestamp: new Date(Date.now() - 2000).toISOString(), description: 'Login form before submission' },
            { id: 'att2', name: 'dashboard.png', type: 'screenshot', path: '/screenshots/dashboard.png', timestamp: new Date(Date.now() - 1000).toISOString(), description: 'Dashboard after successful login' },
          ],
        },
        {
          id: 'sc2',
          name: 'Login with invalid password',
          tags: ['@smoke', '@auth', '@negative'],
          status: 'passed',
          duration: 2100,
          screenshot: '/screenshots/login-invalid.png',
          traceUrl: '/api/executions/exec-001/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to login page', page: 'LoginPage', status: 'passed', duration: 800 },
            { id: 's2', stepNumber: 2, action: 'fill', description: 'Enter username', selector: '#username', page: 'LoginPage', status: 'passed', duration: 120 },
            { id: 's3', stepNumber: 3, action: 'fill', description: 'Enter wrong password', selector: '#password', page: 'LoginPage', status: 'passed', duration: 110 },
            { id: 's4', stepNumber: 4, action: 'click', description: 'Click login button', selector: 'button[type="submit"]', page: 'LoginPage', status: 'passed', duration: 95 },
            { id: 's5', stepNumber: 5, action: 'expect', description: 'Verify error message displayed', page: 'LoginPage', status: 'passed', duration: 475 },
          ],
        },
        {
          id: 'sc3',
          name: 'Login with empty credentials',
          tags: ['@auth', '@negative'],
          status: 'passed',
          duration: 1890,
          screenshot: '/screenshots/login-empty.png',
          traceUrl: '/api/executions/exec-001/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to login page', page: 'LoginPage', status: 'passed', duration: 750 },
            { id: 's2', stepNumber: 2, action: 'click', description: 'Click login without entering credentials', selector: 'button[type="submit"]', page: 'LoginPage', status: 'passed', duration: 85 },
            { id: 's3', stepNumber: 3, action: 'expect', description: 'Verify validation errors shown', page: 'LoginPage', status: 'passed', duration: 555 },
          ],
        },
        {
          id: 'sc4',
          name: 'Remember me functionality',
          tags: ['@auth'],
          status: 'running',
          duration: 0,
        },
        {
          id: 'sc5',
          name: 'Forgot password link',
          tags: ['@auth'],
          status: 'pending',
        },
      ],
    },
    {
      id: 'exec-002',
      testFlowId: 'flow-2',
      testFlowName: 'E-Commerce Checkout',
      status: 'failed',
      target: 'local',
      triggeredBy: { type: 'scheduled' },
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      finishedAt: new Date(Date.now() - 3540000).toISOString(),
      duration: 60000,
      stepCount: 6,
      passedCount: 4,
      failedCount: 1,
      skippedCount: 1,
      scenarios: [
        {
          id: 'sc1',
          name: 'Add single item to cart',
          tags: ['@smoke', '@cart'],
          status: 'passed',
          duration: 4500,
          screenshot: '/screenshots/cart-single.png',
          traceUrl: '/api/executions/exec-002/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to product page', page: 'ProductPage', status: 'passed', duration: 1200 },
            { id: 's2', stepNumber: 2, action: 'screenshot', description: 'Capture product page', page: 'ProductPage', status: 'passed', duration: 85, screenshot: '/screenshots/product-page.png' },
            { id: 's3', stepNumber: 3, action: 'click', description: 'Click Add to Cart button', selector: '.add-to-cart', page: 'ProductPage', status: 'passed', duration: 180 },
            { id: 's4', stepNumber: 4, action: 'screenshot', description: 'Capture after add to cart', page: 'ProductPage', status: 'passed', duration: 78, screenshot: '/screenshots/after-add.png' },
            { id: 's5', stepNumber: 5, action: 'expect', description: 'Verify cart badge shows 1 item', page: 'ProductPage', status: 'passed', duration: 320 },
            { id: 's6', stepNumber: 6, action: 'click', description: 'Open cart drawer', selector: '.cart-icon', page: 'CartDrawer', status: 'passed', duration: 150 },
            { id: 's7', stepNumber: 7, action: 'screenshot', description: 'Capture cart drawer open', page: 'CartDrawer', status: 'passed', duration: 92, screenshot: '/screenshots/cart-drawer.png' },
            { id: 's8', stepNumber: 8, action: 'expect', description: 'Verify product in cart', page: 'CartDrawer', status: 'passed', duration: 450 },
          ],
          logs: [
            { timestamp: new Date(Date.now() - 5000).toISOString(), level: 'info', message: 'Starting add to cart test' },
            { timestamp: new Date(Date.now() - 4500).toISOString(), level: 'info', message: 'Product: Blue T-Shirt ($29.99)' },
            { timestamp: new Date(Date.now() - 3000).toISOString(), level: 'debug', message: 'Screenshot captured: product-page.png' },
            { timestamp: new Date(Date.now() - 2000).toISOString(), level: 'info', message: 'Item added to cart successfully' },
            { timestamp: new Date(Date.now() - 1000).toISOString(), level: 'debug', message: 'Screenshot captured: cart-drawer.png' },
          ],
        },
        {
          id: 'sc2',
          name: 'Add multiple items to cart',
          tags: ['@cart'],
          status: 'passed',
          duration: 6200,
          screenshot: '/screenshots/cart-multiple.png',
          traceUrl: '/api/executions/exec-002/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to products listing', page: 'ProductListPage', status: 'passed', duration: 980 },
            { id: 's2', stepNumber: 2, action: 'click', description: 'Add first product to cart', selector: '[data-product="1"] .add-to-cart', page: 'ProductListPage', status: 'passed', duration: 220 },
            { id: 's3', stepNumber: 3, action: 'click', description: 'Add second product to cart', selector: '[data-product="2"] .add-to-cart', page: 'ProductListPage', status: 'passed', duration: 195 },
            { id: 's4', stepNumber: 4, action: 'click', description: 'Add third product to cart', selector: '[data-product="3"] .add-to-cart', page: 'ProductListPage', status: 'passed', duration: 210 },
            { id: 's5', stepNumber: 5, action: 'click', description: 'Open cart drawer', selector: '.cart-icon', page: 'CartDrawer', status: 'passed', duration: 160 },
            { id: 's6', stepNumber: 6, action: 'expect', description: 'Verify 3 items in cart', page: 'CartDrawer', status: 'passed', duration: 385 },
          ],
        },
        {
          id: 'sc3',
          name: 'Checkout with credit card',
          tags: ['@smoke', '@checkout', '@payment'],
          status: 'failed',
          duration: 8900,
          error: 'TimeoutError: Waiting for selector "#card-number" exceeded timeout of 30000ms',
          screenshot: '/screenshots/checkout-failed.png',
          traceUrl: '/api/executions/exec-002/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to cart page', page: 'CartPage', status: 'passed', duration: 1100 },
            { id: 's2', stepNumber: 2, action: 'click', description: 'Click checkout button', page: 'CartPage', status: 'passed', duration: 234 },
            { id: 's3', stepNumber: 3, action: 'fill', description: 'Enter shipping address', page: 'CheckoutPage', status: 'passed', duration: 789 },
            { id: 's4', stepNumber: 4, action: 'click', description: 'Select credit card payment', page: 'CheckoutPage', status: 'passed', duration: 123 },
            { id: 's5', stepNumber: 5, action: 'fill', description: 'Enter credit card number', selector: '#card-number', page: 'PaymentPage', status: 'failed', duration: 30000, error: 'TimeoutError: Waiting for selector "#card-number" exceeded timeout of 30000ms' },
          ],
          logs: [
            { timestamp: new Date(Date.now() - 35000).toISOString(), level: 'info', message: 'Starting checkout flow with credit card' },
            { timestamp: new Date(Date.now() - 33000).toISOString(), level: 'info', message: 'Cart total: $149.99' },
            { timestamp: new Date(Date.now() - 31000).toISOString(), level: 'info', message: 'Shipping address entered successfully' },
            { timestamp: new Date(Date.now() - 30000).toISOString(), level: 'warn', message: 'Payment form loading slowly...' },
            { timestamp: new Date(Date.now() - 10000).toISOString(), level: 'warn', message: 'Still waiting for #card-number element...' },
            { timestamp: new Date(Date.now() - 5000).toISOString(), level: 'error', message: 'Timeout! Payment iframe failed to load' },
          ],
          attachments: [
            { id: 'att1', name: 'checkout-step1.png', type: 'screenshot', path: '/screenshots/checkout-step1.png', timestamp: new Date(Date.now() - 33000).toISOString(), description: 'Cart review page' },
            { id: 'att2', name: 'checkout-shipping.png', type: 'screenshot', path: '/screenshots/checkout-shipping.png', timestamp: new Date(Date.now() - 31000).toISOString(), description: 'Shipping form filled' },
            { id: 'att3', name: 'payment-error.png', type: 'screenshot', path: '/screenshots/payment-error.png', timestamp: new Date(Date.now() - 5000).toISOString(), description: 'Payment form timeout state' },
          ],
        },
        {
          id: 'sc4',
          name: 'Checkout with PayPal',
          tags: ['@checkout', '@payment'],
          status: 'passed',
          duration: 7800,
          screenshot: '/screenshots/checkout-paypal.png',
          traceUrl: '/api/executions/exec-002/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to cart page', page: 'CartPage', status: 'passed', duration: 1050 },
            { id: 's2', stepNumber: 2, action: 'click', description: 'Click checkout button', selector: '.checkout-btn', page: 'CartPage', status: 'passed', duration: 200 },
            { id: 's3', stepNumber: 3, action: 'fill', description: 'Enter shipping address', page: 'CheckoutPage', status: 'passed', duration: 850 },
            { id: 's4', stepNumber: 4, action: 'click', description: 'Select PayPal payment', selector: '#paypal-option', page: 'CheckoutPage', status: 'passed', duration: 145 },
            { id: 's5', stepNumber: 5, action: 'click', description: 'Proceed to PayPal', selector: '.paypal-checkout', page: 'CheckoutPage', status: 'passed', duration: 2100 },
            { id: 's6', stepNumber: 6, action: 'expect', description: 'Verify PayPal redirect', page: 'PayPalPage', status: 'passed', duration: 1255 },
          ],
        },
        {
          id: 'sc5',
          name: 'Apply discount code',
          tags: ['@checkout'],
          status: 'passed',
          duration: 3200,
          screenshot: '/screenshots/checkout-discount.png',
          traceUrl: '/api/executions/exec-002/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to cart page', page: 'CartPage', status: 'passed', duration: 980 },
            { id: 's2', stepNumber: 2, action: 'click', description: 'Expand discount section', selector: '.discount-toggle', page: 'CartPage', status: 'passed', duration: 120 },
            { id: 's3', stepNumber: 3, action: 'fill', description: 'Enter discount code', selector: '#discount-code', page: 'CartPage', status: 'passed', duration: 250 },
            { id: 's4', stepNumber: 4, action: 'click', description: 'Apply discount', selector: '.apply-discount', page: 'CartPage', status: 'passed', duration: 180 },
            { id: 's5', stepNumber: 5, action: 'expect', description: 'Verify discount applied to total', page: 'CartPage', status: 'passed', duration: 420 },
          ],
        },
        {
          id: 'sc6',
          name: 'Order confirmation email',
          tags: ['@checkout', '@email'],
          status: 'skipped',
          duration: 0,
        },
      ],
    },
    {
      id: 'exec-003',
      testFlowId: 'flow-1',
      testFlowName: 'Login Flow Test',
      status: 'passed',
      target: 'docker',
      triggeredBy: { type: 'api' },
      startedAt: new Date(Date.now() - 7200000).toISOString(),
      finishedAt: new Date(Date.now() - 7140000).toISOString(),
      duration: 45000,
      stepCount: 5,
      passedCount: 5,
      failedCount: 0,
      skippedCount: 0,
      scenarios: [
        {
          id: 'sc1',
          name: 'Login with valid credentials',
          tags: ['@smoke', '@auth'],
          status: 'passed',
          duration: 3100,
          screenshot: '/screenshots/login-1.png',
          traceUrl: '/api/executions/exec-003/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to login page', page: 'LoginPage', status: 'passed', duration: 1100 },
            { id: 's2', stepNumber: 2, action: 'fill', description: 'Enter username', selector: '#username', page: 'LoginPage', status: 'passed', duration: 145 },
            { id: 's3', stepNumber: 3, action: 'fill', description: 'Enter password', selector: '#password', page: 'LoginPage', status: 'passed', duration: 130 },
            { id: 's4', stepNumber: 4, action: 'click', description: 'Click login button', selector: 'button[type="submit"]', page: 'LoginPage', status: 'passed', duration: 95 },
            { id: 's5', stepNumber: 5, action: 'expect', description: 'Verify dashboard visible', page: 'DashboardPage', status: 'passed', duration: 480 },
          ],
        },
        {
          id: 'sc2',
          name: 'Login with invalid password',
          tags: ['@smoke', '@auth', '@negative'],
          status: 'passed',
          duration: 2050,
          screenshot: '/screenshots/login-2.png',
          traceUrl: '/api/executions/exec-003/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to login page', page: 'LoginPage', status: 'passed', duration: 750 },
            { id: 's2', stepNumber: 2, action: 'fill', description: 'Enter username', selector: '#username', page: 'LoginPage', status: 'passed', duration: 110 },
            { id: 's3', stepNumber: 3, action: 'fill', description: 'Enter wrong password', selector: '#password', page: 'LoginPage', status: 'passed', duration: 105 },
            { id: 's4', stepNumber: 4, action: 'click', description: 'Click login button', selector: 'button[type="submit"]', page: 'LoginPage', status: 'passed', duration: 88 },
            { id: 's5', stepNumber: 5, action: 'expect', description: 'Verify error message displayed', page: 'LoginPage', status: 'passed', duration: 447 },
          ],
        },
        {
          id: 'sc3',
          name: 'Login with empty credentials',
          tags: ['@auth', '@negative'],
          status: 'passed',
          duration: 1800,
          screenshot: '/screenshots/login-3.png',
          traceUrl: '/api/executions/exec-003/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to login page', page: 'LoginPage', status: 'passed', duration: 680 },
            { id: 's2', stepNumber: 2, action: 'click', description: 'Click login without credentials', selector: 'button[type="submit"]', page: 'LoginPage', status: 'passed', duration: 92 },
            { id: 's3', stepNumber: 3, action: 'expect', description: 'Verify validation errors shown', page: 'LoginPage', status: 'passed', duration: 528 },
          ],
        },
        {
          id: 'sc4',
          name: 'Remember me functionality',
          tags: ['@auth'],
          status: 'passed',
          duration: 2500,
          screenshot: '/screenshots/login-4.png',
          traceUrl: '/api/executions/exec-003/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to login page', page: 'LoginPage', status: 'passed', duration: 820 },
            { id: 's2', stepNumber: 2, action: 'fill', description: 'Enter username', selector: '#username', page: 'LoginPage', status: 'passed', duration: 125 },
            { id: 's3', stepNumber: 3, action: 'fill', description: 'Enter password', selector: '#password', page: 'LoginPage', status: 'passed', duration: 118 },
            { id: 's4', stepNumber: 4, action: 'check', description: 'Check remember me box', selector: '#remember-me', page: 'LoginPage', status: 'passed', duration: 85 },
            { id: 's5', stepNumber: 5, action: 'click', description: 'Click login button', selector: 'button[type="submit"]', page: 'LoginPage', status: 'passed', duration: 102 },
            { id: 's6', stepNumber: 6, action: 'expect', description: 'Verify session persisted', page: 'DashboardPage', status: 'passed', duration: 650 },
          ],
        },
        {
          id: 'sc5',
          name: 'Forgot password link',
          tags: ['@auth'],
          status: 'passed',
          duration: 1900,
          screenshot: '/screenshots/login-5.png',
          traceUrl: '/api/executions/exec-003/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to login page', page: 'LoginPage', status: 'passed', duration: 720 },
            { id: 's2', stepNumber: 2, action: 'click', description: 'Click forgot password link', selector: '.forgot-password', page: 'LoginPage', status: 'passed', duration: 145 },
            { id: 's3', stepNumber: 3, action: 'expect', description: 'Verify password reset page', page: 'PasswordResetPage', status: 'passed', duration: 535 },
          ],
        },
      ],
    },
    {
      id: 'exec-004',
      testFlowId: 'flow-3',
      testFlowName: 'User Registration',
      status: 'passed',
      target: 'local',
      triggeredBy: { type: 'user', name: 'Jane Smith' },
      startedAt: new Date(Date.now() - 86400000).toISOString(),
      finishedAt: new Date(Date.now() - 86340000).toISOString(),
      duration: 52000,
      stepCount: 4,
      passedCount: 4,
      failedCount: 0,
      skippedCount: 0,
      scenarios: [
        {
          id: 'sc1',
          name: 'Register with valid email',
          tags: ['@smoke', '@registration'],
          status: 'passed',
          duration: 12000,
          screenshot: '/screenshots/register-1.png',
          traceUrl: '/api/executions/exec-004/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to registration page', page: 'RegisterPage', status: 'passed', duration: 1100 },
            { id: 's2', stepNumber: 2, action: 'fill', description: 'Enter full name', selector: '#fullName', page: 'RegisterPage', status: 'passed', duration: 180 },
            { id: 's3', stepNumber: 3, action: 'fill', description: 'Enter email address', selector: '#email', page: 'RegisterPage', status: 'passed', duration: 165 },
            { id: 's4', stepNumber: 4, action: 'fill', description: 'Enter password', selector: '#password', page: 'RegisterPage', status: 'passed', duration: 155 },
            { id: 's5', stepNumber: 5, action: 'fill', description: 'Confirm password', selector: '#confirmPassword', page: 'RegisterPage', status: 'passed', duration: 148 },
            { id: 's6', stepNumber: 6, action: 'check', description: 'Accept terms and conditions', selector: '#terms', page: 'RegisterPage', status: 'passed', duration: 92 },
            { id: 's7', stepNumber: 7, action: 'click', description: 'Click register button', selector: 'button[type="submit"]', page: 'RegisterPage', status: 'passed', duration: 2850 },
            { id: 's8', stepNumber: 8, action: 'expect', description: 'Verify success message', page: 'SuccessPage', status: 'passed', duration: 710 },
          ],
        },
        {
          id: 'sc2',
          name: 'Register with existing email',
          tags: ['@registration', '@negative'],
          status: 'passed',
          duration: 8500,
          screenshot: '/screenshots/register-2.png',
          traceUrl: '/api/executions/exec-004/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to registration page', page: 'RegisterPage', status: 'passed', duration: 920 },
            { id: 's2', stepNumber: 2, action: 'fill', description: 'Enter full name', selector: '#fullName', page: 'RegisterPage', status: 'passed', duration: 165 },
            { id: 's3', stepNumber: 3, action: 'fill', description: 'Enter existing email', selector: '#email', page: 'RegisterPage', status: 'passed', duration: 152 },
            { id: 's4', stepNumber: 4, action: 'fill', description: 'Enter password', selector: '#password', page: 'RegisterPage', status: 'passed', duration: 145 },
            { id: 's5', stepNumber: 5, action: 'fill', description: 'Confirm password', selector: '#confirmPassword', page: 'RegisterPage', status: 'passed', duration: 138 },
            { id: 's6', stepNumber: 6, action: 'click', description: 'Click register button', selector: 'button[type="submit"]', page: 'RegisterPage', status: 'passed', duration: 1480 },
            { id: 's7', stepNumber: 7, action: 'expect', description: 'Verify email exists error', page: 'RegisterPage', status: 'passed', duration: 620 },
          ],
        },
        {
          id: 'sc3',
          name: 'Password validation rules',
          tags: ['@registration', '@validation'],
          status: 'passed',
          duration: 15000,
          screenshot: '/screenshots/register-3.png',
          traceUrl: '/api/executions/exec-004/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to registration page', page: 'RegisterPage', status: 'passed', duration: 880 },
            { id: 's2', stepNumber: 2, action: 'fill', description: 'Enter short password', selector: '#password', page: 'RegisterPage', status: 'passed', duration: 125 },
            { id: 's3', stepNumber: 3, action: 'expect', description: 'Verify min length error', page: 'RegisterPage', status: 'passed', duration: 380 },
            { id: 's4', stepNumber: 4, action: 'fill', description: 'Enter password without number', selector: '#password', page: 'RegisterPage', status: 'passed', duration: 140 },
            { id: 's5', stepNumber: 5, action: 'expect', description: 'Verify number required error', page: 'RegisterPage', status: 'passed', duration: 365 },
            { id: 's6', stepNumber: 6, action: 'fill', description: 'Enter password without special char', selector: '#password', page: 'RegisterPage', status: 'passed', duration: 148 },
            { id: 's7', stepNumber: 7, action: 'expect', description: 'Verify special char error', page: 'RegisterPage', status: 'passed', duration: 352 },
            { id: 's8', stepNumber: 8, action: 'fill', description: 'Enter valid password', selector: '#password', page: 'RegisterPage', status: 'passed', duration: 155 },
            { id: 's9', stepNumber: 9, action: 'expect', description: 'Verify all validations pass', page: 'RegisterPage', status: 'passed', duration: 455 },
          ],
        },
        {
          id: 'sc4',
          name: 'Email verification flow',
          tags: ['@registration', '@email'],
          status: 'passed',
          duration: 16500,
          screenshot: '/screenshots/register-4.png',
          traceUrl: '/api/executions/exec-004/trace',
          steps: [
            { id: 's1', stepNumber: 1, action: 'navigate', description: 'Go to registration page', page: 'RegisterPage', status: 'passed', duration: 950 },
            { id: 's2', stepNumber: 2, action: 'fill', description: 'Complete registration form', page: 'RegisterPage', status: 'passed', duration: 1850 },
            { id: 's3', stepNumber: 3, action: 'click', description: 'Submit registration', selector: 'button[type="submit"]', page: 'RegisterPage', status: 'passed', duration: 2200 },
            { id: 's4', stepNumber: 4, action: 'expect', description: 'Verify email sent message', page: 'VerifyEmailPage', status: 'passed', duration: 580 },
            { id: 's5', stepNumber: 5, action: 'navigate', description: 'Open verification link', page: 'EmailVerificationPage', status: 'passed', duration: 3200 },
            { id: 's6', stepNumber: 6, action: 'expect', description: 'Verify account activated', page: 'EmailVerificationPage', status: 'passed', duration: 720 },
            { id: 's7', stepNumber: 7, action: 'navigate', description: 'Go to login page', page: 'LoginPage', status: 'passed', duration: 880 },
            { id: 's8', stepNumber: 8, action: 'fill', description: 'Login with new account', page: 'LoginPage', status: 'passed', duration: 420 },
            { id: 's9', stepNumber: 9, action: 'expect', description: 'Verify successful login', page: 'DashboardPage', status: 'passed', duration: 650 },
          ],
        },
      ],
    },
  ];
}

export default ExecutionDashboard;
