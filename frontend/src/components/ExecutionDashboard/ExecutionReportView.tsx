/**
 * ExecutionReportView - Matching Google Stitch design exactly
 *
 * Structure:
 * - Session cards with expand/collapse
 * - "View Full Allure Report" button at session level
 * - Scenarios with progress bars
 * - Steps as rounded cards with hover effects
 * - Console/Network/DOM Map tabs for expanded steps
 * - Screenshot panel with selector highlight
 * - Right sidebar with VERTICAL TEXT scenario tabs
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useGitHubExecutionStore, GitHubExecution } from '@/store/useGitHubExecutionStore';
import { useLocalExecutionStore } from '@/store/useLocalExecutionStore';
import type { ExecutionWithDetails } from './ExecutionDashboard';

interface ExecutionReportViewProps {
  onJumpToEditor?: (line: number) => void;
  onViewTrace?: (traceUrl: string, testName: string) => void;
  onOpenAllure?: (executionId: string) => void;
}

type ExecutionSource = 'local' | 'github';
type LogTab = 'console' | 'network' | 'dommap';

interface SessionData {
  id: string;
  date: string;
  time: string;
  status: 'passed' | 'failed' | 'running' | 'pending';
  triggeredBy: string;
  triggerType: 'Manual' | 'Scheduled' | 'API' | 'Webhook';
  duration: string;
  environment: string;
  allureUrl?: string;
  scenarios: ScenarioData[];
  source: ExecutionSource;
  runId?: number;
  owner?: string;
  repo?: string;
}

interface ScenarioData {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'running' | 'pending' | 'skipped';
  duration: string;
  durationMs: number;
  progress: number;
  traceUrl?: string;
  steps: StepData[];
  error?: string;
  screenshot?: string;
}

interface StepData {
  id: string;
  number: number;
  name: string;
  status: 'passed' | 'failed' | 'running' | 'pending' | 'skipped';
  duration?: string;
  error?: string;
  line?: number;
  screenshot?: string;
}

export const ExecutionReportView: React.FC<ExecutionReportViewProps> = ({
  onJumpToEditor: _onJumpToEditor,
  onViewTrace: _onViewTrace,
  onOpenAllure,
}) => {
  const [activeSource, setActiveSource] = useState<ExecutionSource>('github');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());
  const [_expandedSteps, _setExpandedSteps] = useState<Set<string>>(new Set());
  const [activeLogTab, setActiveLogTab] = useState<LogTab>('console');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [sessionStatusFilter, setSessionStatusFilter] = useState<Record<string, 'all' | 'passed' | 'failed' | 'flaky' | 'skipped' | null>>({});

  // Local executions from store
  const localExecutions = useLocalExecutionStore((state) => state.executions);
  const fetchLocalExecutions = useLocalExecutionStore((state) => state.fetchExecutions);

  // GitHub executions from store
  const githubExecutions = useGitHubExecutionStore((state) => state.executions);
  const addExecution = useGitHubExecutionStore((state) => state.addExecution);
  const updateExecution = useGitHubExecutionStore((state) => state.updateExecution);

  // Fetch GitHub runs
  const fetchGitHubRuns = useCallback(async () => {
    try {
      const authToken = localStorage.getItem('auth_token');
      const headers: Record<string, string> = authToken
        ? { 'Authorization': `Bearer ${authToken}` }
        : {};

      const savedSettings = localStorage.getItem('github-settings');
      let owner = 'y9g7bg5qbj-arch';
      let repo = 'playwright-web-app';

      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        owner = settings.owner || owner;
        repo = settings.repo || repo;
      }

      const response = await fetch(`/api/github/runs?owner=${owner}&repo=${repo}&limit=20`, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch runs: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        for (const run of data.data) {
          const newId = `github-${run.id}`;
          const existingRun = githubExecutions.find(e =>
            e.runId === run.id || e.id === newId
          );

          const mapStatus = (status: string): 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled' => {
            if (status === 'completed') return 'completed';
            if (status === 'in_progress') return 'in_progress';
            if (status === 'queued') return 'queued';
            if (status === 'failure') return 'failed';
            if (status === 'cancelled') return 'cancelled';
            return 'completed';
          };

          const execution: Partial<GitHubExecution> = {
            id: newId,
            runId: run.id,
            runNumber: run.runNumber,
            workflowName: run.name,
            status: mapStatus(run.status),
            conclusion: run.conclusion,
            browsers: ['chromium'],
            workers: run.jobs?.length || 2,
            shards: run.jobs?.length || 1,
            triggeredAt: run.createdAt,
            startedAt: run.createdAt,
            completedAt: run.updatedAt,
            totalTests: existingRun?.totalTests || 0,
            passedTests: existingRun?.passedTests || 0,
            failedTests: existingRun?.failedTests || 0,
            skippedTests: existingRun?.skippedTests || 0,
            scenarios: existingRun?.scenarios,
            htmlUrl: run.htmlUrl,
            owner,
            repo,
          };

          if (existingRun) {
            updateExecution(existingRun.id, execution);
          } else {
            addExecution(execution as GitHubExecution);
          }

          // Fetch report data for completed runs
          const isCompleted = run.status === 'completed' || run.conclusion;
          const needsReport = isCompleted && (!existingRun?.scenarios || existingRun.scenarios.length === 0);

          if (needsReport) {
            fetch(`/api/github/runs/${run.id}/report?owner=${owner}&repo=${repo}`, { headers })
              .then(res => res.json())
              .then(reportData => {
                if (reportData.success && reportData.data) {
                  const { summary, scenarios } = reportData.data;
                  updateExecution(newId, {
                    totalTests: summary.total,
                    passedTests: summary.passed,
                    failedTests: summary.failed,
                    skippedTests: summary.skipped,
                    scenarios: scenarios?.map((s: any) => ({
                      id: s.id,
                      name: s.name,
                      status: s.status,
                      duration: s.duration,
                      error: s.error,
                      traceUrl: s.traceUrl,
                      screenshot: s.screenshot, // Evidence or failure screenshot
                      steps: s.steps?.map((step: any) => ({
                        ...step,
                        screenshot: step.screenshot, // Step-level screenshot
                      })),
                    })),
                  });
                }
              })
              .catch(err => console.warn(`[ExecutionReportView] Failed to fetch report for run ${run.id}:`, err));
          }
        }
      }
    } catch (error) {
      console.error('[ExecutionReportView] Failed to fetch GitHub runs:', error);
    }
  }, [githubExecutions, addExecution, updateExecution]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (activeSource === 'github') {
        await fetchGitHubRuns();
      } else {
        await fetchLocalExecutions();
      }
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [activeSource, fetchGitHubRuns, fetchLocalExecutions]);

  useEffect(() => {
    handleRefresh();
  }, [activeSource]);

  // Convert local executions to session data
  const convertLocalToSession = (exec: ExecutionWithDetails): SessionData => {
    const date = new Date(exec.startedAt);
    const duration = exec.duration
      ? `${Math.floor(exec.duration / 1000)}s`
      : exec.finishedAt
        ? `${Math.floor((new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime()) / 1000)}s`
        : 'Running...';

    return {
      id: exec.id,
      date: date.toLocaleDateString('en-CA'),
      time: date.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' }),
      status: exec.status as 'passed' | 'failed' | 'running' | 'pending',
      triggeredBy: exec.triggeredBy.name || 'System',
      triggerType: exec.triggeredBy.type === 'user' ? 'Manual' :
        exec.triggeredBy.type === 'scheduled' ? 'Scheduled' :
          exec.triggeredBy.type === 'api' ? 'API' : 'Webhook',
      duration,
      environment: 'Local',
      source: 'local',
      scenarios: (exec.scenarios || []).map((s, idx) => ({
        id: s.id || `scenario-${idx}`,
        name: extractVeroScenarioName(s.name),
        status: s.status as ScenarioData['status'],
        duration: s.duration ? `${(s.duration / 1000).toFixed(1)}s` : '0s',
        durationMs: s.duration || 0,
        progress: s.status === 'passed' ? 100 : s.status === 'failed' ? 100 : 50,
        traceUrl: s.traceUrl,
        error: s.error,
        screenshot: s.screenshot,
        steps: (s.steps || []).map((step, stepIdx) => ({
          id: step.id || `step-${stepIdx}`,
          number: step.stepNumber,
          name: step.action || step.description || `Step ${step.stepNumber}`,
          status: step.status as StepData['status'],
          duration: step.duration ? `${step.duration}ms` : undefined,
          error: step.error,
          line: stepIdx + 1,
          screenshot: step.screenshot,
        })),
      })),
    };
  };

  // Convert GitHub executions to session data
  const convertGitHubToSession = (exec: GitHubExecution): SessionData => {
    const date = new Date(exec.triggeredAt || exec.startedAt || Date.now());
    const duration = exec.completedAt && exec.startedAt
      ? formatDuration(new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime())
      : exec.status === 'in_progress' || exec.status === 'queued'
        ? 'Running...'
        : '0s';

    const status: SessionData['status'] =
      exec.status === 'completed'
        ? exec.conclusion === 'success' ? 'passed' : 'failed'
        : exec.status === 'in_progress' || exec.status === 'queued'
          ? 'running'
          : exec.status === 'failed'
            ? 'failed'
            : 'pending';

    return {
      id: exec.id,
      date: date.toLocaleDateString('en-CA'),
      time: date.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' }),
      status,
      triggeredBy: 'GitHub Actions',
      triggerType: 'API',
      duration,
      environment: 'Production',
      allureUrl: exec.htmlUrl,
      source: 'github',
      runId: exec.runId,
      owner: exec.owner,
      repo: exec.repo,
      scenarios: (exec.scenarios || []).map((s, idx) => {
        // Generate steps - use actual steps if available, otherwise create synthetic steps
        let steps: StepData[] = [];

        if (s.steps && s.steps.length > 0) {
          // Use actual Playwright steps
          steps = s.steps.map((step, stepIdx) => ({
            id: step.id || `step-${stepIdx}`,
            number: step.stepNumber || stepIdx + 1,
            name: step.action || `Step ${stepIdx + 1}`,
            status: step.status as StepData['status'],
            duration: step.duration ? `${step.duration}ms` : undefined,
            error: step.error,
            line: stepIdx + 1,
            screenshot: step.screenshot,
          }));
        } else {
          // Create synthetic steps based on scenario info
          const scenarioName = extractVeroScenarioName(s.name);
          steps = [
            {
              id: `synthetic-step-1-${idx}`,
              number: 1,
              name: `Execute "${scenarioName}"`,
              status: s.status as StepData['status'],
              duration: s.duration ? formatDuration(s.duration) : undefined,
              error: s.error,
              line: 1,
              screenshot: s.screenshot,
            },
          ];

          // If there's an error, add it as context
          if (s.error) {
            steps[0].name = `Execute "${scenarioName}" - ${s.status === 'failed' ? 'Failed' : s.status}`;
          }
        }

        return {
          id: s.id || `scenario-${idx}`,
          name: extractVeroScenarioName(s.name),
          status: s.status as ScenarioData['status'],
          duration: s.duration ? formatDuration(s.duration) : '0s',
          durationMs: s.duration || 0,
          progress: s.status === 'passed' ? 100 : s.status === 'failed' ? 100 : 50,
          traceUrl: s.traceUrl,
          error: s.error,
          screenshot: s.screenshot,
          steps,
        };
      }),
    };
  };

  // Format duration in human-readable format
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Extract Vero scenario name from Playwright test name
  // Input: "guaranteed-pass.spec.ts > Super Simple Pass Tests > basic math works correctly"
  // Output: "Basic Math Works Correctly" (the actual test/scenario name)
  const extractVeroScenarioName = (playwrightName: string): string => {
    // Check if there's a .vero file path in the name - use that scenario
    const veroFileMatch = playwrightName.match(/([a-zA-Z0-9_-]+\.vero)/i);
    if (veroFileMatch) {
      // If we have parts after the .vero file, use the last part as scenario name
      const parts = playwrightName.split('>').map(p => p.trim());
      if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        // Title case the scenario name
        return toTitleCase(lastPart);
      }
      return veroFileMatch[1];
    }

    // Split by ">" to get parts: [file, suite, test]
    const parts = playwrightName.split('>').map(p => p.trim());

    if (parts.length >= 2) {
      // Get the last part (actual test/scenario name)
      const scenarioName = parts[parts.length - 1];
      return toTitleCase(scenarioName);
    }

    // If no ">", just clean up the name
    if (playwrightName.endsWith('.vero')) {
      return playwrightName;
    }

    // For single names, title case them
    return toTitleCase(playwrightName.replace(/[._-]/g, ' '));
  };

  // Helper to convert string to Title Case
  const toTitleCase = (str: string): string => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get sessions based on active source
  const sessions: SessionData[] = activeSource === 'local'
    ? localExecutions.map(convertLocalToSession)
    : githubExecutions.map(convertGitHubToSession);

  // Sort sessions by date (newest first), running first
  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.status === 'running' && b.status !== 'running') return -1;
    if (a.status !== 'running' && b.status === 'running') return 1;
    return new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime();
  });

  // Get all scenarios from expanded sessions for sidebar
  const allScenariosForSidebar = sortedSessions
    .filter(s => expandedSessions.has(s.id))
    .flatMap(s => s.scenarios);

  const toggleSession = (id: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Auto-select first scenario
        const session = sortedSessions.find(s => s.id === id);
        if (session?.scenarios.length) {
          setSelectedScenarioId(session.scenarios[0].id);
        }
      }
      return next;
    });
  };

  const toggleScenario = (id: string) => {
    setSelectedScenarioId(id);
    setExpandedScenarios(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleStep = (_id: string) => {
    // Step expansion is handled automatically for last step
    // This function is kept for future use if needed
  };

  const toggleStatusFilter = (sessionId: string, status: 'all' | 'passed' | 'failed' | 'flaky' | 'skipped') => {
    setSessionStatusFilter(prev => {
      const currentFilter = prev[sessionId];
      // If clicking 'all' or the same filter, clear the filter
      if (status === 'all' || currentFilter === status) {
        return { ...prev, [sessionId]: null };
      }
      // Otherwise, set the new filter
      return { ...prev, [sessionId]: status };
    });
  };

  const getFilteredScenarios = (sessionId: string, scenarios: ScenarioData[]) => {
    const filter = sessionStatusFilter[sessionId];
    if (!filter || filter === 'all') return scenarios;
    if (filter === 'flaky') {
      // Flaky tests are those that have been retried
      return scenarios.filter(s => s.status === 'passed' && (s as any).retries > 0);
    }
    return scenarios.filter(s => s.status === filter);
  };

  const getScenarioCounts = (scenarios: ScenarioData[]) => {
    const flaky = scenarios.filter(s => s.status === 'passed' && (s as any).retries > 0).length;
    return {
      all: scenarios.length,
      passed: scenarios.filter(s => s.status === 'passed').length - flaky,
      failed: scenarios.filter(s => s.status === 'failed').length,
      flaky,
      skipped: scenarios.filter(s => s.status === 'skipped' || s.status === 'pending').length,
    };
  };

  const [preparingAllure, setPreparingAllure] = useState<string | null>(null);

  const handleOpenAllure = async (session: SessionData) => {
    const authToken = localStorage.getItem('auth_token');
    const headers: Record<string, string> = authToken
      ? { 'Authorization': `Bearer ${authToken}` }
      : {};

    if (session.source === 'github' && session.runId && session.owner && session.repo) {
      // GitHub execution - download and extract artifact
      try {
        // First check if Allure report is already prepared
        const statusResponse = await fetch(
          `/api/github/runs/${session.runId}/allure/status`,
          { headers }
        );
        const statusData = await statusResponse.json();

        if (statusData.success && statusData.data?.ready && statusData.data?.reportUrl) {
          // Report is ready, open it
          window.open(statusData.data.reportUrl, '_blank');
          return;
        }

        // Report not ready, need to prepare it
        setPreparingAllure(session.id);

        const prepareResponse = await fetch(
          `/api/github/runs/${session.runId}/allure/prepare`,
          {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              owner: session.owner,
              repo: session.repo,
            }),
          }
        );
        const prepareData = await prepareResponse.json();

        setPreparingAllure(null);

        if (prepareData.success && prepareData.data?.reportUrl) {
          window.open(prepareData.data.reportUrl, '_blank');
        } else {
          console.error('Failed to prepare Allure report:', prepareData.error);
          // Fallback to GitHub Actions URL
          if (session.allureUrl) {
            window.open(session.allureUrl, '_blank');
          }
        }
      } catch (error) {
        setPreparingAllure(null);
        console.error('Failed to open Allure report:', error);
        if (session.allureUrl) {
          window.open(session.allureUrl, '_blank');
        }
      }
    } else if (session.source === 'local') {
      // Local execution - generate Allure report from local results
      try {
        // First check if Allure report is already generated
        const statusResponse = await fetch('/api/executions/local/allure/status');
        const statusData = await statusResponse.json();

        if (statusData.success && statusData.data?.ready && statusData.data?.reportUrl) {
          // Report is ready, open it
          window.open(statusData.data.reportUrl, '_blank');
          return;
        }

        // Report not ready, need to generate it
        setPreparingAllure(session.id);

        const generateResponse = await fetch('/api/executions/local/allure/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const generateData = await generateResponse.json();

        setPreparingAllure(null);

        if (generateData.success && generateData.data?.reportUrl) {
          window.open(generateData.data.reportUrl, '_blank');
        } else {
          console.error('Failed to generate Allure report:', generateData.error);
          alert('Failed to generate Allure report: ' + (generateData.error || 'Unknown error'));
        }
      } catch (error) {
        setPreparingAllure(null);
        console.error('Failed to open Allure report:', error);
        alert('Failed to open Allure report. Please check that tests have been run.');
      }
    } else if (onOpenAllure) {
      onOpenAllure(session.id);
    }
  };

  return (
    <div className="flex-1 flex bg-[#0d1117] overflow-hidden h-full font-['Inter']">
      {/* Main Content Area */}
      <aside className="flex-1 bg-[#161b22] flex flex-col min-w-0">
        {/* Header */}
        <div className="h-9 px-4 flex items-center border-b border-[#30363d]/50 bg-[#0d1117] shrink-0">
          {/* Left - Title */}
          <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Executions Report</span>

          {/* Center - Source Toggle */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1 bg-[#161b22] rounded p-0.5 border border-[#30363d]">
              <button
                onClick={() => setActiveSource('local')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${activeSource === 'local'
                  ? 'bg-[#21262d] text-[#c9d1d9]'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
                  }`}
              >
                <span className="material-symbols-outlined text-[14px]">computer</span>
                Local
              </button>
              <button
                onClick={() => setActiveSource('github')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${activeSource === 'github'
                  ? 'bg-[#21262d] text-[#c9d1d9]'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
                  }`}
              >
                <span className="material-symbols-outlined text-[14px]">cloud</span>
                GitHub Actions
              </button>
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleRefresh}
              className="text-[#8b949e] hover:text-white text-xs flex items-center gap-1"
            >
              <span className={`material-symbols-outlined text-[16px] ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
            </button>
            <button className="text-[#8b949e] hover:text-white text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">filter_list</span> Filter
            </button>
            <button className="text-[#8b949e] hover:text-white text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">download</span> Export
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-[#21262d] rounded-full flex items-center justify-center mb-4 border border-[#30363d]">
                <span className="material-symbols-outlined text-[32px] text-[#8b949e]">play_circle</span>
              </div>
              <p className="text-[#c9d1d9] font-medium">No executions found</p>
              <p className="text-[13px] text-[#8b949e] mt-1">
                {activeSource === 'github'
                  ? 'Run tests with GitHub Actions to see execution history'
                  : 'Run a test locally to see execution history'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedSessions.map((session) => (
                <div key={session.id} className="bg-[#0d1117] rounded-xl border border-[#30363d] shadow-xl overflow-hidden">
                  {/* Session Header */}
                  <div className="p-5 border-b border-[#30363d]/60">
                    <div className="flex items-center justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="material-symbols-outlined text-[24px] text-[#8b949e] cursor-pointer hover:text-white"
                            onClick={() => toggleSession(session.id)}
                          >
                            {expandedSessions.has(session.id) ? 'expand_more' : 'chevron_right'}
                          </span>
                          <h2 className="text-xl font-bold text-[#c9d1d9] tracking-tight">Session {session.date}</h2>
                          {session.status === 'passed' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#238636]/10 text-[#238636] text-[11px] font-bold border border-[#238636]/30 uppercase tracking-wider">
                              Passed
                            </span>
                          )}
                          {session.status === 'failed' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#da3633]/10 text-[#da3633] text-[11px] font-bold border border-[#da3633]/30 uppercase tracking-wider">
                              Failed
                            </span>
                          )}
                          {session.status === 'running' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#2f81f7]/10 text-[#2f81f7] text-[11px] font-bold border border-[#2f81f7]/30 uppercase tracking-wider flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px] animate-spin">progress_activity</span>
                              Running
                            </span>
                          )}
                        </div>
                        <div className="pl-9 text-xs font-mono text-[#8b949e] flex items-center gap-6">
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                            Triggered by: {session.triggerType}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">timer</span>
                            Duration: {session.duration}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">computer</span>
                            Environment: {session.environment}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <span className="text-sm text-[#8b949e] font-mono">{session.time}</span>
                        <div className="flex items-center gap-2">
                          {/* View on GitHub button - only for GitHub source sessions */}
                          {session.source === 'github' && session.allureUrl && (
                            <a
                              href={session.allureUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-all shadow-lg active:scale-95"
                            >
                              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                              </svg>
                              View on GitHub
                            </a>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAllure(session);
                            }}
                            disabled={preparingAllure === session.id}
                            className={`w-[200px] flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white rounded transition-all shadow-lg ${preparingAllure === session.id
                              ? 'bg-[#2f81f7]/60 cursor-wait'
                              : 'bg-[#2f81f7] hover:bg-[#2f81f7]/90 active:scale-95'
                              }`}
                          >
                            {preparingAllure === session.id ? (
                              <>
                                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                Preparing Report...
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[18px]">bar_chart_4_bars</span>
                                View Full Allure Report
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Session Content (expanded) */}
                  {expandedSessions.has(session.id) && (
                    <div className="p-4 space-y-4">
                      {session.scenarios.length === 0 ? (
                        <div className="text-center py-8 text-[#8b949e]">
                          <p className="text-sm">No scenario data available</p>
                          <p className="text-xs mt-1 text-[#6e7681]">Run completed but no test details were captured</p>
                        </div>
                      ) : (
                        <>
                          {/* Status Summary Bar */}
                          {(() => {
                            const counts = getScenarioCounts(session.scenarios);
                            const currentFilter = sessionStatusFilter[session.id];
                            return (
                              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#30363d]/50 flex-wrap">
                                <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Filter:</span>

                                {/* All Icon */}
                                <button
                                  onClick={() => toggleStatusFilter(session.id, 'all')}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${!currentFilter || currentFilter === 'all'
                                    ? 'bg-[#58a6ff]/20 border-2 border-[#58a6ff] shadow-[0_0_12px_rgba(88,166,255,0.4)]'
                                    : 'bg-[#58a6ff]/10 border border-[#58a6ff]/30 hover:bg-[#58a6ff]/20 hover:shadow-[0_4px_12px_rgba(88,166,255,0.3)]'
                                    }`}
                                >
                                  <span className="material-symbols-outlined text-[24px] text-[#58a6ff]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    apps
                                  </span>
                                  <div className="flex flex-col items-start">
                                    <span className="text-xl font-bold text-[#58a6ff] leading-none">{counts.all}</span>
                                    <span className="text-[10px] font-semibold text-[#58a6ff]/80 uppercase tracking-wider">All</span>
                                  </div>
                                </button>

                                {/* Passed Icon */}
                                <button
                                  onClick={() => toggleStatusFilter(session.id, 'passed')}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${currentFilter === 'passed'
                                    ? 'bg-[#238636]/20 border-2 border-[#238636] shadow-[0_0_12px_rgba(35,134,54,0.4)]'
                                    : 'bg-[#238636]/10 border border-[#238636]/30 hover:bg-[#238636]/20 hover:shadow-[0_4px_12px_rgba(35,134,54,0.3)]'
                                    } ${counts.passed === 0 ? 'opacity-60' : ''}`}
                                >
                                  <span className="material-symbols-outlined text-[24px] text-[#238636]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    check_circle
                                  </span>
                                  <div className="flex flex-col items-start">
                                    <span className="text-xl font-bold text-[#238636] leading-none">{counts.passed}</span>
                                    <span className="text-[10px] font-semibold text-[#238636]/80 uppercase tracking-wider">Passed</span>
                                  </div>
                                </button>

                                {/* Failed Icon */}
                                <button
                                  onClick={() => toggleStatusFilter(session.id, 'failed')}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${currentFilter === 'failed'
                                    ? 'bg-[#da3633]/20 border-2 border-[#da3633] shadow-[0_0_12px_rgba(218,54,51,0.4)]'
                                    : 'bg-[#da3633]/10 border border-[#da3633]/30 hover:bg-[#da3633]/20 hover:shadow-[0_4px_12px_rgba(218,54,51,0.3)]'
                                    } ${counts.failed === 0 ? 'opacity-60' : ''}`}
                                >
                                  <span className="material-symbols-outlined text-[24px] text-[#da3633]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    cancel
                                  </span>
                                  <div className="flex flex-col items-start">
                                    <span className="text-xl font-bold text-[#da3633] leading-none">{counts.failed}</span>
                                    <span className="text-[10px] font-semibold text-[#da3633]/80 uppercase tracking-wider">Failed</span>
                                  </div>
                                </button>

                                {/* Flaky Icon */}
                                <button
                                  onClick={() => toggleStatusFilter(session.id, 'flaky')}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${currentFilter === 'flaky'
                                    ? 'bg-[#a371f7]/20 border-2 border-[#a371f7] shadow-[0_0_12px_rgba(163,113,247,0.4)]'
                                    : 'bg-[#a371f7]/10 border border-[#a371f7]/30 hover:bg-[#a371f7]/20 hover:shadow-[0_4px_12px_rgba(163,113,247,0.3)]'
                                    } ${counts.flaky === 0 ? 'opacity-60' : ''}`}
                                >
                                  <span className="material-symbols-outlined text-[24px] text-[#a371f7]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    autorenew
                                  </span>
                                  <div className="flex flex-col items-start">
                                    <span className="text-xl font-bold text-[#a371f7] leading-none">{counts.flaky}</span>
                                    <span className="text-[10px] font-semibold text-[#a371f7]/80 uppercase tracking-wider">Flaky</span>
                                  </div>
                                </button>

                                {/* Skipped Icon */}
                                <button
                                  onClick={() => toggleStatusFilter(session.id, 'skipped')}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${currentFilter === 'skipped'
                                    ? 'bg-[#d29922]/20 border-2 border-[#d29922] shadow-[0_0_12px_rgba(210,153,34,0.4)]'
                                    : 'bg-[#d29922]/10 border border-[#d29922]/30 hover:bg-[#d29922]/20 hover:shadow-[0_4px_12px_rgba(210,153,34,0.3)]'
                                    } ${counts.skipped === 0 ? 'opacity-60' : ''}`}
                                >
                                  <span className="material-symbols-outlined text-[24px] text-[#d29922]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    block
                                  </span>
                                  <div className="flex flex-col items-start">
                                    <span className="text-xl font-bold text-[#d29922] leading-none">{counts.skipped}</span>
                                    <span className="text-[10px] font-semibold text-[#d29922]/80 uppercase tracking-wider">Skipped</span>
                                  </div>
                                </button>


                                {/* Clear Filter Button */}
                                {currentFilter && (
                                  <button
                                    onClick={() => setSessionStatusFilter(prev => ({ ...prev, [session.id]: null }))}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#30363d] transition-all text-xs font-medium"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                    Clear Filter
                                  </button>
                                )}

                                {/* Total count */}
                                <div className="ml-auto text-xs text-[#8b949e]">
                                  {currentFilter ? (
                                    <span>Showing {getFilteredScenarios(session.id, session.scenarios).length} of {session.scenarios.length} scenarios</span>
                                  ) : (
                                    <span>Total: {session.scenarios.length} scenarios</span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Scenarios List */}
                          {getFilteredScenarios(session.id, session.scenarios).map((scenario) => (
                            <div key={scenario.id} className="bg-[#161b22] rounded-lg border border-[#30363d] overflow-hidden">
                              {/* Scenario Header */}
                              <div
                                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 border-b border-[#30363d]/30 bg-[#161b22]"
                                onClick={() => toggleScenario(scenario.id)}
                              >
                                <span className="material-symbols-outlined text-[20px] text-[#8b949e]">
                                  {expandedScenarios.has(scenario.id) ? 'expand_more' : 'chevron_right'}
                                </span>
                                <span className={`material-symbols-outlined text-[18px] ${scenario.status === 'passed' ? 'text-[#238636]' :
                                  scenario.status === 'failed' ? 'text-[#da3633]' : 'text-[#8b949e]'
                                  }`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                  {scenario.status === 'passed' ? 'check_circle' :
                                    scenario.status === 'failed' ? 'cancel' : 'pending'}
                                </span>
                                <span className="text-base font-semibold text-[#c9d1d9]">{scenario.name}</span>
                                <div className="ml-auto flex items-center gap-4">
                                  <span className="text-xs text-[#8b949e] font-mono">{scenario.duration}</span>
                                  <div className="h-1.5 w-20 bg-[#30363d] rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${scenario.status === 'passed' ? 'bg-[#238636]' :
                                        scenario.status === 'failed' ? 'bg-[#da3633]' : 'bg-[#2f81f7]'
                                        }`}
                                      style={{ width: `${scenario.progress}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Scenario Steps (expanded) */}
                              {expandedScenarios.has(scenario.id) && (
                                <div className="p-4 space-y-3 bg-[#0d1117]/40">
                                  {/* Trace Viewer Button - Show for local executions */}
                                  {session.source === 'local' && (
                                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#30363d]/50">
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          // For local executions, open Playwright's built-in trace viewer locally
                                          // This avoids the HTTPS mixed content issue with trace.playwright.dev
                                          const scenarioSlug = scenario.name.toLowerCase().replace(/\s+/g, '-');
                                          try {
                                            const response = await fetch(`/api/executions/local/trace/${encodeURIComponent(scenarioSlug)}/open`, {
                                              method: 'POST',
                                            });
                                            const data = await response.json();
                                            if (data.success && data.traceUrl) {
                                              console.log('Trace viewer opened:', data.tracePath);
                                              // Open the trace URL in a new tab as backup
                                              window.open(data.traceUrl, '_blank');
                                            } else {
                                              console.error('Failed to open trace:', data.error);
                                              alert(`Failed to open trace: ${data.error}`);
                                            }
                                          } catch (err) {
                                            console.error('Failed to open trace viewer:', err);
                                            alert('Failed to open trace viewer. Check console for details.');
                                          }
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#8957e5] hover:bg-[#8957e5]/90 rounded transition-all shadow-lg active:scale-95"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">bug_report</span>
                                        Open Trace Viewer
                                      </button>
                                      <span className="text-xs text-[#8b949e]">
                                        Opens Playwright's trace viewer locally at http://localhost:9323
                                      </span>
                                    </div>
                                  )}
                                  {/* Trace Viewer Button - Show for GitHub executions with trace URL */}
                                  {session.source === 'github' && scenario.traceUrl && (
                                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#30363d]/50">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!scenario.traceUrl) return;
                                          const fullTraceUrl = scenario.traceUrl.startsWith('http')
                                            ? scenario.traceUrl
                                            : `${window.location.origin}${scenario.traceUrl}`;
                                          window.open(`https://trace.playwright.dev/?trace=${encodeURIComponent(fullTraceUrl)}`, '_blank');
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#8957e5] hover:bg-[#8957e5]/90 rounded transition-all shadow-lg active:scale-95"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">bug_report</span>
                                        Open Trace Viewer
                                      </button>
                                      <span className="text-xs text-[#8b949e]">
                                        View detailed execution timeline, network calls, and DOM snapshots
                                      </span>
                                    </div>
                                  )}

                                  {scenario.steps.length === 0 ? (
                                    <div className="text-center py-4 text-[#8b949e] text-sm">
                                      No step details available
                                    </div>
                                  ) : (
                                    scenario.steps.map((step, stepIdx) => {
                                      const isLast = stepIdx === scenario.steps.length - 1;

                                      return (
                                        <div key={step.id}>
                                          {/* Regular step */}
                                          {!isLast && (
                                            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#21262d] border border-[#30363d]/40 hover:bg-[#21262d]/80 transition-colors group">
                                              <span className={`material-symbols-outlined text-[18px] ${step.status === 'passed' ? 'text-[#238636]' :
                                                step.status === 'failed' ? 'text-[#da3633]' : 'text-[#8b949e]'
                                                }`}>
                                                {step.status === 'passed' ? 'check_circle' :
                                                  step.status === 'failed' ? 'cancel' : 'radio_button_unchecked'}
                                              </span>
                                              <span className="text-sm text-[#c9d1d9] font-medium">
                                                Step {step.number}: {step.name}
                                              </span>
                                              <span className="ml-auto text-[10px] text-[#8b949e] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                                {step.duration}
                                              </span>
                                            </div>
                                          )}

                                          {/* Last step with expanded details */}
                                          {isLast && (
                                            <div className={`rounded-lg overflow-hidden ${step.status === 'passed'
                                              ? 'bg-[#238636]/5 border border-[#238636]/30'
                                              : 'bg-[#da3633]/5 border border-[#da3633]/30'
                                              }`}>
                                              <div
                                                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer ${step.status === 'passed'
                                                  ? 'bg-[#238636]/10 border-b border-[#238636]/20'
                                                  : 'bg-[#da3633]/10 border-b border-[#da3633]/20'
                                                  }`}
                                                onClick={() => toggleStep(step.id)}
                                              >
                                                <span className={`material-symbols-outlined text-[18px] ${step.status === 'passed' ? 'text-[#238636]' : 'text-[#da3633]'
                                                  }`}>
                                                  {step.status === 'passed' ? 'check_circle' : 'cancel'}
                                                </span>
                                                <span className="text-sm font-bold text-[#c9d1d9]">
                                                  Step {step.number}: {step.name}
                                                </span>
                                                <span className={`ml-auto text-xs font-mono font-medium ${step.status === 'passed' ? 'text-[#238636]' : 'text-[#da3633]'
                                                  }`}>
                                                  {step.status === 'passed' ? 'Success' : 'Failed'} ({step.duration})
                                                </span>
                                              </div>

                                              {/* Step Details Panel */}
                                              <div className="p-4 grid grid-cols-12 gap-6">
                                                {/* Left: Console/Network/DOM tabs */}
                                                <div className="col-span-7 flex flex-col gap-3">
                                                  <div className="flex-1 bg-[#161b22] rounded-lg border border-[#30363d] flex flex-col min-h-[180px]">
                                                    <div className="flex border-b border-[#30363d] bg-[#0d1117]">
                                                      <button
                                                        onClick={() => setActiveLogTab('console')}
                                                        className={`px-4 py-2 text-[11px] font-bold ${activeLogTab === 'console'
                                                          ? 'text-[#c9d1d9] border-b-2 border-[#58a6ff]'
                                                          : 'text-[#8b949e] hover:text-[#c9d1d9]'
                                                          }`}
                                                      >
                                                        Console
                                                      </button>
                                                      <button
                                                        onClick={() => setActiveLogTab('network')}
                                                        className={`px-4 py-2 text-[11px] font-medium ${activeLogTab === 'network'
                                                          ? 'text-[#c9d1d9] border-b-2 border-[#58a6ff]'
                                                          : 'text-[#8b949e] hover:text-[#c9d1d9]'
                                                          }`}
                                                      >
                                                        Network
                                                      </button>
                                                      <button
                                                        onClick={() => setActiveLogTab('dommap')}
                                                        className={`px-4 py-2 text-[11px] font-medium ${activeLogTab === 'dommap'
                                                          ? 'text-[#c9d1d9] border-b-2 border-[#58a6ff]'
                                                          : 'text-[#8b949e] hover:text-[#c9d1d9]'
                                                          }`}
                                                      >
                                                        Details
                                                      </button>
                                                    </div>
                                                    <div className="p-3 font-mono text-[11px] space-y-1 overflow-y-auto max-h-[140px]">
                                                      {activeLogTab === 'console' && (
                                                        <>
                                                          <div className="text-[#8b949e]">[{session.time}] <span className="text-[#58a6ff]">INFO</span> Starting scenario: <span className="text-orange-400">{scenario.name}</span></div>
                                                          <div className="text-[#8b949e]">[{session.time}] <span className="text-[#58a6ff]">INFO</span> Executing step: {step.name}</div>
                                                          {step.status === 'passed' ? (
                                                            <>
                                                              <div className="text-[#8b949e]">[{session.time}] <span className="text-[#238636]">OK</span> All assertions passed</div>
                                                              <div className="text-[#238636] font-bold">[{session.time}] SUCCESS Test completed in {step.duration}</div>
                                                            </>
                                                          ) : (
                                                            <>
                                                              <div className="text-[#8b949e]">[{session.time}] <span className="text-[#da3633]">ERROR</span> {step.error || scenario.error || 'Test assertion failed'}</div>
                                                              <div className="text-[#da3633] font-bold">[{session.time}] FAILED Test failed after {step.duration}</div>
                                                            </>
                                                          )}
                                                        </>
                                                      )}
                                                      {activeLogTab === 'network' && (
                                                        <div className="flex flex-col items-center justify-center h-full py-4 text-center">
                                                          <span className="material-symbols-outlined text-[24px] text-[#30363d] mb-2">wifi_off</span>
                                                          <span className="text-[#6e7681]">No network activity recorded</span>
                                                          <span className="text-[#484f58] text-[10px] mt-1">Network logs require browser automation tests</span>
                                                        </div>
                                                      )}
                                                      {activeLogTab === 'dommap' && (
                                                        <>
                                                          <div className="text-[#c9d1d9] font-bold mb-2">Test Details</div>
                                                          <div className="text-[#8b949e]">Scenario: <span className="text-[#c9d1d9]">{scenario.name}</span></div>
                                                          <div className="text-[#8b949e]">Status: <span className={step.status === 'passed' ? 'text-[#238636]' : 'text-[#da3633]'}>{step.status.toUpperCase()}</span></div>
                                                          <div className="text-[#8b949e]">Duration: <span className="text-[#c9d1d9]">{scenario.duration}</span></div>
                                                          {scenario.error && (
                                                            <div className="text-[#8b949e] mt-2">Error: <span className="text-[#da3633]">{scenario.error}</span></div>
                                                          )}
                                                        </>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Right: Screenshot */}
                                                <div className="col-span-5 flex flex-col gap-2">
                                                  <div className="flex items-center justify-between text-[11px] text-[#8b949e] px-1">
                                                    <span className="font-bold uppercase tracking-wider">
                                                      {step.status === 'passed' ? 'Evidence Screenshot' : 'Failure Screenshot'}
                                                    </span>
                                                    {step.screenshot && (
                                                      <button className="hover:text-[#58a6ff] flex items-center gap-1 transition-colors">
                                                        <span className="material-symbols-outlined text-[14px]">zoom_in</span> View Large
                                                      </button>
                                                    )}
                                                  </div>
                                                  <div className="relative w-full aspect-video bg-black rounded border border-[#30363d] overflow-hidden group shadow-xl">
                                                    {step.screenshot || scenario.screenshot ? (
                                                      <>
                                                        <img src={step.screenshot || scenario.screenshot} alt="Screenshot" className="w-full h-full object-cover" />
                                                        {/* Selector highlight overlay - only show with real screenshot */}
                                                        <div className={`absolute top-[20%] left-[30%] w-[40%] h-[15%] border-2 rounded-sm shadow-[0_0_15px_rgba(35,134,54,0.4)] z-10 ${step.status === 'passed'
                                                          ? 'bg-[#238636]/10 border-[#238636]'
                                                          : 'bg-[#da3633]/10 border-[#da3633]'
                                                          }`} />
                                                        {/* Badge */}
                                                        <div className="absolute top-[8%] left-[30%] z-20 flex flex-col items-start">
                                                          <div className={`text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg flex items-center gap-1 uppercase tracking-tighter ${step.status === 'passed' ? 'bg-[#238636]' : 'bg-[#da3633]'
                                                            }`}>
                                                            <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                              {step.status === 'passed' ? 'verified' : 'error'}
                                                            </span>
                                                            {step.status === 'passed' ? 'Test Passed' : 'Test Failed'}
                                                          </div>
                                                          <div className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] ml-3 ${step.status === 'passed' ? 'border-t-[#238636]' : 'border-t-[#da3633]'
                                                            }`} />
                                                        </div>
                                                        {/* Hover overlay */}
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-30 cursor-pointer">
                                                          <span className="bg-[#0d1117]/80 text-white px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border border-[#30363d]">
                                                            Open Full Resolution
                                                          </span>
                                                        </div>
                                                      </>
                                                    ) : (
                                                      <div className="absolute inset-0 bg-gradient-to-br from-[#161b22] to-[#0d1117] flex flex-col items-center justify-center text-center p-4">
                                                        <span className={`material-symbols-outlined text-[40px] mb-2 ${step.status === 'passed' ? 'text-[#238636]' : 'text-[#da3633]'
                                                          }`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                                          {step.status === 'passed' ? 'check_circle' : 'cancel'}
                                                        </span>
                                                        <span className={`text-sm font-bold ${step.status === 'passed' ? 'text-[#238636]' : 'text-[#da3633]'
                                                          }`}>
                                                          {step.status === 'passed' ? 'Test Passed' : 'Test Failed'}
                                                        </span>
                                                        <span className="text-[10px] text-[#6e7681] mt-2">
                                                          No screenshot captured
                                                        </span>
                                                        <span className="text-[9px] text-[#484f58] mt-1">
                                                          Browser tests automatically capture screenshots
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                  <div className="text-[9px] text-[#8b949e] text-center font-mono">
                                                    {step.screenshot || scenario.screenshot ? (
                                                      <>1920x1080 • {session.time}</>
                                                    ) : (
                                                      <>Duration: {scenario.duration}</>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Right Sidebar - Vertical Text Scenario Tabs */}
      <aside className="w-12 bg-[#0d1117] border-l border-[#30363d] flex flex-col shrink-0 z-10">
        <button className="h-10 w-full flex items-center justify-center text-[#8b949e] hover:text-white hover:bg-[#161b22] transition-colors border-b border-[#30363d]" title="Show Editor">
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>

        <div className="flex-1 flex flex-col items-center py-4 gap-2 overflow-hidden">
          {allScenariosForSidebar.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] text-[#30363d]">playlist_remove</span>
            </div>
          ) : (
            allScenariosForSidebar.map((scenario) => (
              <div
                key={scenario.id}
                onClick={() => {
                  setSelectedScenarioId(scenario.id);
                  setExpandedScenarios(prev => {
                    const next = new Set(prev);
                    next.add(scenario.id);
                    return next;
                  });
                }}
                className={`w-full py-6 flex flex-col items-center justify-center gap-3 relative cursor-pointer group transition-colors ${selectedScenarioId === scenario.id
                  ? 'bg-[#161b22]/50 border-l-2 border-[#58a6ff]'
                  : 'hover:bg-[#161b22]/30 text-[#8b949e] hover:text-[#c9d1d9] border-l-2 border-transparent'
                  }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${selectedScenarioId === scenario.id ? 'text-[#58a6ff]' : ''
                  }`}>
                  {scenario.status === 'passed' ? 'check_circle' :
                    scenario.status === 'failed' ? 'cancel' : 'code'}
                </span>
                <div
                  className={`text-[11px] font-bold tracking-widest whitespace-nowrap uppercase ${selectedScenarioId === scenario.id ? 'text-[#c9d1d9]' : 'font-medium'
                    }`}
                  style={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    transform: 'rotate(180deg)',
                    maxHeight: '80px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {scenario.name.length > 12 ? scenario.name.substring(0, 12) + '...' : scenario.name}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-[#30363d] w-full py-4 flex flex-col items-center gap-4 text-[#8b949e]">
          <span className="material-symbols-outlined text-[20px] hover:text-[#58a6ff] cursor-pointer" title="Quality Metrics">analytics</span>
          <div className={`size-2 rounded-full ${sortedSessions.some(s => s.status === 'running')
            ? 'bg-[#2f81f7] shadow-[0_0_8px_rgba(47,129,247,0.6)]'
            : sortedSessions.some(s => s.status === 'failed')
              ? 'bg-[#da3633] shadow-[0_0_8px_rgba(218,54,51,0.6)]'
              : 'bg-[#238636] shadow-[0_0_8px_rgba(35,134,54,0.6)]'
            }`} />
        </div>
      </aside>
    </div>
  );
};

export default ExecutionReportView;
