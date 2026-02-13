import { useState, useCallback, useEffect, useRef } from 'react';
import {
    Play, Upload, FileText, ChevronDown, ChevronRight,
    Plus, RefreshCw, Check, X, Trash2, Edit3, ExternalLink,
    Loader2, AlertCircle, CheckCircle, RotateCcw, Eye,
    AlertTriangle, SkipForward, Video, StopCircle, History,
    FastForward, Square
} from 'lucide-react';
import { useAIRecorder, TestCaseInput } from '@/hooks/useAIRecorder';
import { checkHealth as checkAIRecorderHealth } from '@/api/aiRecorder';
import { AIStudioChat } from './AIStudioChat';
import './AITestRecorderPanel.css';

// API for vero-agent (alternative to Stagehand-based AI Recorder)
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

async function generateViaVeroAgent(steps: string, featureName: string, scenarioName: string): Promise<{ veroCode: string }> {
    const response = await fetch(`${API_BASE_URL}/vero/agent/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps, feature_name: featureName, scenario_name: scenarioName }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate test');
    }
    return { veroCode: data.veroCode };
}

interface Environment {
    name: string;
    color: string;
    baseUrl: string;
    value: string;
}

interface AITestRecorderPanelProps {
    onTestApproved?: (testId: string, veroCode: string, filePath: string) => void;
    projectPath?: string;
    /** Session ID to auto-load when specified (from ReviewSidePanel) */
    selectedSessionId?: string | null;
}

// Template chips for the quick-create modal
const QUICK_CREATE_TEMPLATES = [
    { icon: ExternalLink, label: 'Navigate', text: 'Navigate to the login page' },
    { icon: Edit3, label: 'Fill', text: "Fill the email field with 'test@example.com'" },
    { icon: Play, label: 'Click', text: 'Click the Submit button' },
    { icon: CheckCircle, label: 'Assert', text: 'Verify the success message is visible' },
    { icon: RefreshCw, label: 'Loop', text: 'Loop through each user in the list' },
];

const ENVIRONMENTS: Environment[] = [
    { name: 'Production', color: '#7cb342', baseUrl: 'https://app.example.com', value: 'production' },
    { name: 'Staging', color: '#ffb74d', baseUrl: 'https://staging.example.com', value: 'staging' },
    { name: 'Development', color: '#64b5f6', baseUrl: 'https://dev.example.com', value: 'development' },
    { name: 'Local', color: '#a0a0a0', baseUrl: 'http://localhost:3000', value: 'local' },
];

export function AITestRecorderPanel({ onTestApproved, projectPath, selectedSessionId }: AITestRecorderPanelProps) {
    const {
        session,
        capture,
        capturedActions,
        isConnected,
        isProcessing,
        isComplete,
        isStuck,
        importExcel,
        createAndStart,
        cancelSession,
        refreshProgress,
        loadSession,
        listSessions,
        // Recovery (Stuck State)
        resumeWithHint,
        skipStep,
        getStuckStep,
        // Browser Capture (Human Takeover)
        startCapture,
        stopCapture,
        // Human Review
        replayStep,
        updateStepCode,
        addStep,
        deleteStep,
        approveTestCase,
        // Run Test
        runTestCase,
        runTestCaseToStep,
        runSingleStep,
        stopRun,
        run,
        reset,
    } = useAIRecorder();

    // Get current stuck step for chat
    const stuckStep = getStuckStep();
    const stuckTestCase = session.testCases.find(tc => tc.status === 'stuck') || null;

    // State for resolving (when user sends hint)
    const [isResolving, setIsResolving] = useState(false);

    // Handle resume with hint from chat
    const handleResumeWithHint = useCallback((testCaseId: string, stepId: string, hint: string) => {
        setIsResolving(true);
        resumeWithHint(testCaseId, stepId, hint);
        // Reset after a delay - will be updated by WebSocket events
        setTimeout(() => setIsResolving(false), 5000);
    }, [resumeWithHint]);

    // Handle take over (manual browser interaction for single step)
    const handleTakeOver = useCallback((testCaseId: string, stepId: string) => {
        // Start browser capture in 'single' mode - capture one action to replace this step
        startCapture(testCaseId, 'single', stepId);
    }, [startCapture]);

    // Handle finish manually (record all remaining steps)
    const handleFinishManually = useCallback((testCaseId: string) => {
        // Start browser capture in 'manual' mode - capture multiple actions until stopped
        startCapture(testCaseId, 'manual');
    }, [startCapture]);

    // UI State
    const [selectedEnv, setSelectedEnv] = useState<Environment>(ENVIRONMENTS[1]);
    const [showEnvDropdown, setShowEnvDropdown] = useState(false);
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
    const [browserUrl, setBrowserUrl] = useState('');
    const [replayingStepId, setReplayingStepId] = useState<string | null>(null);
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState('');

    // Sessions list state
    const [showSessionsDropdown, setShowSessionsDropdown] = useState(false);
    const [availableSessions, setAvailableSessions] = useState<{ id: string; name: string; status: string; createdAt: string }[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);

    // Quick Create state
    const [qcTestName, setQcTestName] = useState('');
    const [qcSteps, setQcSteps] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Import state
    const [importedTests, setImportedTests] = useState<TestCaseInput[]>([]);
    const [isImporting, setIsImporting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Step selection state for debugger-style execution
    const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

    // Handle step checkbox click - cascade selection (select all steps up to clicked)
    const handleStepSelect = useCallback((testCaseId: string, stepNumber: number) => {
        const test = session.testCases.find(tc => tc.id === testCaseId);
        if (!test) return;

        // If clicking same step, deselect all
        if (selectedStepIndex === stepNumber) {
            setSelectedStepIndex(null);
        } else {
            // Select up to this step (cascade selection)
            setSelectedStepIndex(stepNumber);
        }
    }, [session.testCases, selectedStepIndex]);

    // Check if a step should be selected (cascade: all steps <= selectedStepIndex)
    const isStepSelected = useCallback((stepNumber: number): boolean => {
        if (selectedStepIndex === null) return false;
        return stepNumber <= selectedStepIndex;
    }, [selectedStepIndex]);

    useEffect(() => {
        setBrowserUrl(`${selectedEnv.baseUrl}/login`);
    }, [selectedEnv]);

    // Auto-expand first test case
    useEffect(() => {
        if (session.testCases.length > 0 && !expandedTestId) {
            setExpandedTestId(session.testCases[0].id);
        }
    }, [session.testCases, expandedTestId]);

    // Auto-load session when selectedSessionId prop changes (from ReviewSidePanel)
    useEffect(() => {
        if (selectedSessionId && selectedSessionId !== session.sessionId) {
            loadSession(selectedSessionId);
        }
    }, [selectedSessionId, session.sessionId, loadSession]);

    // Load sessions list when dropdown is opened
    const handleShowSessions = useCallback(async () => {
        if (showSessionsDropdown) {
            setShowSessionsDropdown(false);
            return;
        }
        setIsLoadingSessions(true);
        try {
            const sessions = await listSessions();
            setAvailableSessions(sessions);
            setShowSessionsDropdown(true);
        } catch (error) {
            alert('Failed to load sessions: ' + (error as Error).message);
        } finally {
            setIsLoadingSessions(false);
        }
    }, [showSessionsDropdown, listSessions]);

    const handleLoadSession = useCallback(async (sessionId: string) => {
        try {
            await loadSession(sessionId);
            setShowSessionsDropdown(false);
        } catch {
            alert('Failed to load session');
        }
    }, [loadSession]);

    // Handle file import
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsImporting(true);
            const testCases = await importExcel(file);
            setImportedTests(testCases);
        } catch (error: any) {
            console.error('Import failed:', error);
            alert(error.message || 'Failed to import Excel file');
        } finally {
            setIsImporting(false);
        }
    };

    // Start processing imported tests
    const handleStartImported = async () => {
        if (importedTests.length === 0) return;

        try {
            setIsCreating(true);
            await createAndStart(importedTests, {
                environment: selectedEnv.value,
                baseUrl: selectedEnv.baseUrl,
                sandboxPath: projectPath,
            });
            setShowImportModal(false);
            setImportedTests([]);
        } catch (error: any) {
            console.error('Failed to start:', error);
            alert(error.message || 'Failed to start processing');
        } finally {
            setIsCreating(false);
        }
    };

    // State for generated Vero code (when using vero-agent fallback)
    const [generatedVeroCode, setGeneratedVeroCode] = useState<string | null>(null);

    // Generate test from quick create
    const handleQuickCreate = useCallback(async () => {
        if (!qcSteps.trim()) return;

        const testName = qcTestName.trim() || 'New Test Case';
        const lines = qcSteps.split('\n').filter(l => l.trim());

        try {
            setIsCreating(true);

            // Check if AI Recorder (Stagehand) is available
            const health = await checkAIRecorderHealth();

            if (!health.available) {
                // Use vero-agent path as fallback
                console.log('Using vero-agent fallback for test generation');
                const result = await generateViaVeroAgent(
                    lines.join('\n'),
                    testName.replace(/\s+/g, ''),
                    testName
                );
                setGeneratedVeroCode(result.veroCode);
                setShowQuickCreate(false);
                setQcTestName('');
                setQcSteps('');
                return;
            }

            // Stagehand is available, use the full AI Recorder flow
            const testCase: TestCaseInput = {
                name: testName,
                steps: lines.map(l => l.trim()),
                targetUrl: selectedEnv.baseUrl,
            };

            await createAndStart([testCase], {
                environment: selectedEnv.value,
                baseUrl: selectedEnv.baseUrl,
                sandboxPath: projectPath,
            });
            setShowQuickCreate(false);
            setQcTestName('');
            setQcSteps('');
        } catch (error: any) {
            console.error('Quick create failed:', error);
            alert(error.message || 'Failed to create test');
        } finally {
            setIsCreating(false);
        }
    }, [qcTestName, qcSteps, selectedEnv, createAndStart]);

    // Handle step replay
    const handleReplayStep = useCallback((testCaseId: string, stepId: string) => {
        setReplayingStepId(stepId);
        replayStep(testCaseId, stepId);
        // Reset after a delay (would be controlled by WebSocket in real implementation)
        setTimeout(() => setReplayingStepId(null), 5000);
    }, [replayStep]);

    // Handle step code edit
    const handleStartEdit = useCallback((stepId: string, currentCode: string) => {
        setEditingStepId(stepId);
        setEditingCode(currentCode || '');
    }, []);

    const handleSaveEdit = useCallback(async () => {
        if (!editingStepId) return;
        await updateStepCode(editingStepId, editingCode);
        setEditingStepId(null);
        setEditingCode('');
    }, [editingStepId, editingCode, updateStepCode]);

    // Handle test approval
    const handleApprove = useCallback(async (testCaseId: string) => {
        // Validate projectPath to ensure files are created in the correct location
        if (!projectPath) {
            alert(
                'No project selected!\n\n' +
                'Please select a project folder in the Explorer panel before approving.\n\n' +
                'Files will be created in:\n' +
                '• Features/ folder for scenarios\n' +
                '• Pages/ folder for page objects\n' +
                '• PageActions/ folder for page actions'
            );
            console.error('Approval failed: No projectPath provided. User must select a project in Explorer.');
            return;
        }

        try {
            const filePath = await approveTestCase(testCaseId, projectPath);
            const testCase = session.testCases.find(tc => tc.id === testCaseId);
            const veroCode = testCase?.steps
                .filter(s => s.veroCode)
                .map(s => s.veroCode)
                .join('\n') || '';
            onTestApproved?.(testCaseId, veroCode, filePath);
        } catch (error: any) {
            console.error('Approval failed:', error);
            alert(error.message || 'Failed to approve test case');
        }
    }, [projectPath, approveTestCase, session.testCases, onTestApproved]);

    // Get status icon
    const getStatusIcon = (status: string, retryCount?: number) => {
        switch (status) {
            case 'success':
            case 'complete':
            case 'resolved':
            case 'captured':
                return <CheckCircle size={14} className="step-status-icon success" />;
            case 'human_review':
                return <Eye size={14} className="step-status-icon" style={{ color: '#ba68c8' }} />;
            case 'failed':
                return <AlertCircle size={14} className="step-status-icon error" />;
            case 'stuck':
                return <AlertTriangle size={14} className="step-status-icon" style={{ color: '#ffb74d' }} />;
            case 'skipped':
                return <SkipForward size={14} className="step-status-icon" style={{ color: '#78909c' }} />;
            case 'running':
            case 'retrying':
                return (
                    <span className="step-status-retry">
                        <Loader2 size={14} className="step-status-icon spin" />
                        {retryCount !== undefined && retryCount > 0 && (
                            <span className="retry-count">{retryCount}/10</span>
                        )}
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="ai-recorder">
            {/* Toolbar */}
            <div className="ai-recorder-toolbar">
                <div className="ai-recorder-logo">
                    <span className="logo-icon">🤖</span>
                    AI Test Recorder
                </div>

                <button
                    className="ai-btn ai-btn-secondary"
                    onClick={() => setShowImportModal(true)}
                    disabled={isProcessing}
                >
                    <Upload size={16} />
                    Import Excel
                </button>

                <button
                    className="ai-btn ai-btn-primary"
                    onClick={() => setShowQuickCreate(true)}
                    disabled={isProcessing}
                >
                    <Plus size={16} />
                    Quick Create
                </button>

                {/* Sessions History Dropdown */}
                <div className="sessions-dropdown-container" style={{ position: 'relative' }}>
                    <button
                        className="ai-btn ai-btn-secondary"
                        onClick={handleShowSessions}
                        disabled={isLoadingSessions}
                    >
                        {isLoadingSessions ? <Loader2 size={16} className="spin" /> : <History size={16} />}
                        Sessions
                        <ChevronDown size={14} />
                    </button>

                    {showSessionsDropdown && (
                        <div className="sessions-dropdown" style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            marginTop: '4px',
                            background: '#161b22',
                            border: '1px solid #30363d',
                            borderRadius: '8px',
                            minWidth: '300px',
                            maxHeight: '400px',
                            overflow: 'auto',
                            zIndex: 100,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                        }}>
                            <div style={{ padding: '8px 12px', borderBottom: '1px solid #30363d', color: '#8b949e', fontSize: '12px' }}>
                                Recent Sessions
                            </div>
                            {availableSessions.length === 0 ? (
                                <div style={{ padding: '16px', color: '#6e7681', textAlign: 'center' }}>
                                    No sessions found
                                </div>
                            ) : (
                                availableSessions.map((s) => (
                                    <div
                                        key={s.id}
                                        onClick={() => handleLoadSession(s.id)}
                                        style={{
                                            padding: '10px 12px',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid #21262d',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                        className="session-item"
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#21262d')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <div>
                                            <div style={{ color: '#c9d1d9', fontWeight: 500 }}>{s.name}</div>
                                            <div style={{ color: '#6e7681', fontSize: '11px' }}>
                                                {new Date(s.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                        <span className={`status-chip chip-${s.status}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                                            {s.status === 'human_review' && <Eye size={10} />}
                                            {s.status === 'completed' && <Check size={10} />}
                                            {s.status === 'failed' && <X size={10} />}
                                            {s.status === 'processing' && <Loader2 size={10} className="spin" />}
                                            {s.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {session.sessionId && (
                    <button
                        className="ai-btn ai-btn-secondary"
                        onClick={reset}
                        disabled={isProcessing}
                    >
                        <RotateCcw size={16} />
                        New Session
                    </button>
                )}

                <div className="toolbar-spacer" />

                {/* Environment Selector */}
                <div className="env-selector" onClick={() => setShowEnvDropdown(!showEnvDropdown)}>
                    <div className="env-dot" style={{ background: selectedEnv.color }} />
                    <span className="env-name">{selectedEnv.name}</span>
                    <ChevronDown size={16} />

                    {showEnvDropdown && (
                        <div className="env-dropdown">
                            {ENVIRONMENTS.map(env => (
                                <div
                                    key={env.name}
                                    className={`env-option ${env.name === selectedEnv.name ? 'active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setSelectedEnv(env); setShowEnvDropdown(false); }}
                                >
                                    <div className="env-option-dot" style={{ background: env.color }} />
                                    <div className="env-option-info">
                                        <div className="env-option-name">{env.name}</div>
                                        <div className="env-option-url">{env.baseUrl}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Connection Status */}
                <div className={`status-badge ${!isConnected ? 'status-disconnected' : isProcessing ? 'status-running' : 'status-idle'}`}>
                    <div className="status-dot" />
                    <span>
                        {!isConnected ? 'Disconnected' : isProcessing ? 'Processing...' : 'Ready'}
                    </span>
                </div>

                {/* Cancel button when processing */}
                {isProcessing && (
                    <button className="ai-btn ai-btn-secondary" onClick={cancelSession}>
                        <X size={16} />
                        Cancel
                    </button>
                )}
            </div>

            {/* Main Content */}
            <div className="ai-recorder-content">
                {/* Browser Panel */}
                <div className={`browser-panel ${capture.isCapturing ? 'capture-mode' : ''}`}>
                    <div className="browser-chrome">
                        <div className="browser-dots">
                            <span className="dot dot-red" />
                            <span className="dot dot-yellow" />
                            <span className="dot dot-green" />
                        </div>
                        <input
                            type="text"
                            className="url-bar"
                            value={browserUrl}
                            onChange={(e) => setBrowserUrl(e.target.value)}
                            readOnly
                        />
                    </div>

                    {/* Execution Controls Toolbar */}
                    {session.testCases.length > 0 && (
                        <div className="execution-controls">
                            <button
                                className="exec-btn exec-run-all"
                                onClick={() => {
                                    const firstTest = session.testCases[0];
                                    if (firstTest) runTestCase(firstTest.id);
                                }}
                                disabled={run.isRunning || session.testCases.length === 0}
                                title="Run all steps (Ctrl+Enter)"
                            >
                                <Play size={14} />
                                <span>Run All</span>
                            </button>
                            <button
                                className="exec-btn exec-run-selected"
                                onClick={() => {
                                    const firstTest = session.testCases[0];
                                    if (firstTest && selectedStepIndex) {
                                        runTestCaseToStep(firstTest.id, selectedStepIndex);
                                    }
                                }}
                                disabled={run.isRunning || selectedStepIndex === null}
                                title={selectedStepIndex ? `Run steps 1-${selectedStepIndex} (F5)` : 'Select steps first'}
                            >
                                <FastForward size={14} />
                                <span>Run to Step {selectedStepIndex || '?'}</span>
                            </button>
                            <button
                                className="exec-btn exec-step"
                                onClick={() => {
                                    const firstTest = session.testCases[0];
                                    if (firstTest) {
                                        // If a step is selected, run that specific step.
                                        // Otherwise, try to find the next pending step.
                                        const stepToRun = selectedStepIndex
                                            ? firstTest.steps.find(s => s.stepNumber === selectedStepIndex)
                                            : firstTest.steps.find(s => s.status !== 'success');

                                        if (stepToRun) {
                                            runSingleStep(firstTest.id, stepToRun.stepId);
                                        }
                                    }
                                }}
                                disabled={run.isRunning}
                                title="Execute next or selected step (F10)"
                            >
                                <SkipForward size={14} />
                                <span>Step</span>
                            </button>
                            {run.isRunning && (
                                <button
                                    className="exec-btn exec-stop"
                                    onClick={() => stopRun()}
                                    title="Stop execution (Escape)"
                                >
                                    <Square size={14} />
                                    <span>Stop</span>
                                </button>
                            )}
                        </div>
                    )}

                    <div className="browser-viewport">
                        {/* Capture Mode Overlay */}
                        {capture.isCapturing && (
                            <div className="capture-overlay">
                                <div className="capture-content">
                                    <div className="capture-indicator">
                                        <Video size={24} className="recording-icon" />
                                        <span className="capture-label">
                                            {capture.mode === 'single' ? 'Waiting for your action...' : 'Recording your actions...'}
                                        </span>
                                    </div>
                                    <p className="capture-hint">
                                        {capture.mode === 'single'
                                            ? 'Click on an element in the browser to capture the action'
                                            : `${capturedActions.length} action${capturedActions.length !== 1 ? 's' : ''} captured so far`
                                        }
                                    </p>
                                    {capturedActions.length > 0 && (
                                        <div className="captured-actions-list">
                                            {capturedActions.slice(-3).map((action, i) => (
                                                <div key={i} className="captured-action-item">
                                                    <CheckCircle size={12} className="success" />
                                                    <code>{action.veroCode}</code>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {capture.mode === 'manual' && (
                                        <button
                                            className="ai-btn ai-btn-primary capture-done-btn"
                                            onClick={stopCapture}
                                        >
                                            <StopCircle size={16} /> Done Recording
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Processing status */}
                        {isProcessing && (
                            <div className="processing-overlay">
                                <div className="processing-content">
                                    <Loader2 size={48} className="spin" />
                                    <h3>Processing Test Cases</h3>
                                    <p>
                                        {session.completedTests} / {session.totalTests} completed
                                        {session.failedTests > 0 && ` (${session.failedTests} failed)`}
                                    </p>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{
                                                width: `${session.totalTests > 0
                                                    ? (session.completedTests / session.totalTests) * 100
                                                    : 0}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Live run preview with screenshot streaming */}
                        {run.isRunning && run.screenshot && (
                            <div className="run-preview-overlay">
                                <div className="run-preview-content">
                                    <div className="run-header">
                                        <Loader2 size={16} className="spin" />
                                        <span>Running Step {run.currentStepNumber} / {run.totalSteps}</span>
                                    </div>
                                    <img
                                        src={`data:image/png;base64,${run.screenshot}`}
                                        alt="Live browser preview"
                                        className="run-screenshot"
                                    />
                                    {run.currentUrl && (
                                        <div className="run-url">{run.currentUrl}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Human review message */}
                        {isComplete && (
                            <div className="review-overlay">
                                <div className="review-content">
                                    <CheckCircle size={48} className="success" />
                                    <h3>Processing Complete</h3>
                                    <p>Review the generated steps and approve to save as .vero files</p>
                                    <p className="review-hint">
                                        Click <Eye size={14} /> Play on any step to replay it in the browser
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Idle state */}
                        {session.status === 'idle' && (
                            <div className="idle-overlay">
                                <div className="idle-content">
                                    <FileText size={48} />
                                    <h3>Ready to Record</h3>
                                    <p>Import Excel or use Quick Create to start generating tests</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Generated Tests Panel */}
                <div className="tests-panel">
                    <div className="tests-header">
                        <h3><FileText size={18} /> Generated Test Cases</h3>
                        {session.testCases.length > 0 && (
                            <button className="ai-btn ai-btn-icon" onClick={refreshProgress} title="Refresh">
                                <RefreshCw size={16} />
                            </button>
                        )}
                    </div>
                    <div className="tests-list">
                        {session.testCases.length === 0 ? (
                            <div className="empty-state">
                                <FileText size={48} />
                                <p>No test cases yet</p>
                                <span>Import Excel or use Quick Create to get started</span>
                            </div>
                        ) : (
                            session.testCases.map(test => (
                                <div
                                    key={test.id}
                                    className={`test-card ${expandedTestId === test.id ? 'expanded' : ''}`}
                                >
                                    <div className="test-card-header">
                                        <div className="test-card-info">
                                            <div
                                                className="test-card-name"
                                                onClick={() => setExpandedTestId(expandedTestId === test.id ? null : test.id)}
                                            >
                                                {test.name}
                                            </div>
                                            <button
                                                className="ai-btn ai-btn-sm ai-btn-run"
                                                onClick={() => runTestCase(test.id)}
                                                disabled={run.isRunning || test.steps.length === 0}
                                                title="Run all steps in browser"
                                            >
                                                {run.isRunning && run.testCaseId === test.id ? (
                                                    <><Loader2 size={14} className="spin" /> Running...</>
                                                ) : (
                                                    <><Play size={14} /> Run</>
                                                )}
                                            </button>
                                        </div>
                                        <span className={`status-chip chip-${test.status}`}>
                                            {test.status === 'complete' && <Check size={12} />}
                                            {test.status === 'approved' && <Check size={12} />}
                                            {test.status === 'human_review' && <Eye size={12} />}
                                            {test.status === 'failed' && <X size={12} />}
                                            {test.status === 'in_progress' && <Loader2 size={12} className="spin" />}
                                            {test.status === 'stuck' && <AlertTriangle size={12} />}
                                            {test.status === 'manual_recording' && <Edit3 size={12} />}
                                            {test.status === 'partially_complete' && <RefreshCw size={12} />}
                                            {test.status.replace(/_/g, ' ')}
                                        </span>
                                        <button
                                            className="expand-btn"
                                            onClick={() => setExpandedTestId(expandedTestId === test.id ? null : test.id)}
                                        >
                                            {expandedTestId === test.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        </button>
                                    </div>

                                    {expandedTestId === test.id && (
                                        <>
                                            <div className="test-steps">
                                                {test.steps.map((step) => (
                                                    <div
                                                        key={step.stepId}
                                                        className={`step-item step-${step.status} ${isStepSelected(step.stepNumber) ? 'step-selected' : ''} ${run.runningStepId === step.stepId ? 'step-executing' : ''}`}
                                                    >
                                                        <div className="step-header">
                                                            <input
                                                                type="checkbox"
                                                                className="step-checkbox"
                                                                checked={isStepSelected(step.stepNumber)}
                                                                onChange={() => handleStepSelect(test.id, step.stepNumber)}
                                                                title={`Select steps 1-${step.stepNumber} for execution`}
                                                            />
                                                            <span className="step-num">{step.stepNumber}</span>
                                                            {getStatusIcon(step.status, step.retryCount)}
                                                        </div>
                                                        <div className="step-desc">{step.description}</div>
                                                        {editingStepId === step.stepId ? (
                                                            <div className="step-edit-container">
                                                                <textarea
                                                                    value={editingCode}
                                                                    onChange={(e) => setEditingCode(e.target.value)}
                                                                    className="step-edit-textarea"
                                                                    rows={2}
                                                                    placeholder="Enter Vero code..."
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Escape') {
                                                                            setEditingStepId(null);
                                                                        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                                            handleSaveEdit();
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="step-edit-actions">
                                                                    <button
                                                                        className="ai-btn ai-btn-sm ai-btn-primary"
                                                                        onClick={handleSaveEdit}
                                                                        title="Save (Cmd+Enter)"
                                                                    >
                                                                        <Check size={12} /> Save
                                                                    </button>
                                                                    <button
                                                                        className="ai-btn ai-btn-sm"
                                                                        onClick={() => handleTakeOver(test.id, step.stepId)}
                                                                        title="Replace by clicking in browser"
                                                                    >
                                                                        <Video size={12} /> Record
                                                                    </button>
                                                                    <button
                                                                        className="ai-btn ai-btn-sm"
                                                                        onClick={() => setEditingStepId(null)}
                                                                        title="Cancel (Escape)"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                className="step-code"
                                                                onClick={() => handleStartEdit(step.stepId, step.veroCode || '')}
                                                                title="Click to edit"
                                                            >
                                                                {step.veroCode || '// Pending...'}
                                                            </div>
                                                        )}
                                                        {step.error && (
                                                            <div className="step-error">
                                                                <AlertCircle size={12} /> {step.error}
                                                            </div>
                                                        )}
                                                        <div className="step-actions">
                                                            <button
                                                                className="step-action"
                                                                onClick={() => handleStartEdit(step.stepId, step.veroCode || '')}
                                                                title="Edit Vero code"
                                                            >
                                                                <Edit3 size={12} /> Edit
                                                            </button>
                                                            <button
                                                                className="step-action"
                                                                onClick={() => handleReplayStep(test.id, step.stepId)}
                                                                disabled={replayingStepId === step.stepId}
                                                                title="Replay step in browser"
                                                            >
                                                                {replayingStepId === step.stepId ? (
                                                                    <Loader2 size={12} className="spin" />
                                                                ) : (
                                                                    <Eye size={12} />
                                                                )}
                                                                Play
                                                            </button>
                                                            <button
                                                                className="step-action"
                                                                onClick={() => handleTakeOver(test.id, step.stepId)}
                                                                disabled={capture.isCapturing}
                                                                title="Replace by recording a browser action"
                                                            >
                                                                <Video size={12} /> Record
                                                            </button>
                                                            <button
                                                                className="step-action danger"
                                                                onClick={() => {
                                                                    if (confirm('Delete this step?')) {
                                                                        deleteStep(step.stepId);
                                                                    }
                                                                }}
                                                                title="Delete step"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                        {/* Add step button */}
                                                        <button
                                                            className="add-step-btn"
                                                            onClick={() => {
                                                                const desc = prompt('Enter step description:');
                                                                if (desc) addStep(test.id, step.stepNumber, desc);
                                                            }}
                                                            title="Add step after this"
                                                        >
                                                            <Plus size={12} /> Add step
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="test-card-actions">
                                                <button
                                                    className="ai-btn ai-btn-primary"
                                                    onClick={() => handleApprove(test.id)}
                                                    disabled={test.status !== 'human_review' && test.status !== 'complete'}
                                                >
                                                    <Check size={16} /> Approve & Save
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Summary */}
                    {session.testCases.length > 0 && (
                        <div className="tests-summary">
                            Tests: {session.totalTests} Total, {' '}
                            <span className="success">{session.completedTests - session.failedTests} Passed</span>, {' '}
                            <span className="error">{session.failedTests} Failed</span>, {' '}
                            <span className="pending">{session.totalTests - session.completedTests} Pending</span>
                        </div>
                    )}

                    {/* AI Chat Panel for Recovery */}
                    {(isStuck || session.testCases.length > 0) && (
                        <AIStudioChat
                            testCase={stuckTestCase}
                            stuckStep={stuckStep}
                            onResumeWithHint={handleResumeWithHint}
                            onSkipStep={skipStep}
                            onTakeOver={handleTakeOver}
                            onFinishManually={handleFinishManually}
                            isResolving={isResolving}
                        />
                    )}

                    {/* Error display */}
                    {session.error && (
                        <div className="session-error">
                            <AlertCircle size={16} />
                            {session.error}
                        </div>
                    )}

                    {/* Generated Vero Code (from vero-agent fallback) */}
                    {generatedVeroCode && (
                        <div className="generated-vero-panel">
                            <div className="generated-vero-header">
                                <h4><CheckCircle size={16} className="success" /> Generated Vero Code</h4>
                                <div className="generated-vero-actions">
                                    <button
                                        className="ai-btn ai-btn-sm ai-btn-primary"
                                        onClick={() => {
                                            navigator.clipboard.writeText(generatedVeroCode);
                                            alert('Copied to clipboard!');
                                        }}
                                    >
                                        Copy
                                    </button>
                                    <button
                                        className="ai-btn ai-btn-sm"
                                        onClick={() => setGeneratedVeroCode(null)}
                                    >
                                        <X size={14} /> Clear
                                    </button>
                                </div>
                            </div>
                            <pre className="generated-vero-code">{generatedVeroCode}</pre>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Create Modal */}
            {showQuickCreate && (
                <div className="modal-overlay" onClick={() => !isCreating && setShowQuickCreate(false)}>
                    <div className="quick-create-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><Plus size={20} /> Quick Create Test</h2>
                            <button
                                className="close-btn"
                                onClick={() => setShowQuickCreate(false)}
                                disabled={isCreating}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="qc-hint">
                                <AlertCircle size={18} />
                                <span>Write your test steps in plain English, one step per line. The AI will convert them into executable Playwright scripts.</span>
                            </div>
                            <div className="input-group">
                                <label>Test Case Name</label>
                                <input
                                    type="text"
                                    className="qc-input"
                                    value={qcTestName}
                                    onChange={e => setQcTestName(e.target.value)}
                                    placeholder="e.g., User Login Flow"
                                    disabled={isCreating}
                                />
                            </div>
                            <div className="input-group">
                                <label>Test Steps</label>
                                <textarea
                                    className="qc-textarea"
                                    value={qcSteps}
                                    onChange={e => setQcSteps(e.target.value)}
                                    rows={8}
                                    placeholder="Navigate to the login page&#10;Fill the email field with 'test@example.com'&#10;Fill the password field with 'password123'&#10;Click the Sign In button&#10;Verify the dashboard is visible"
                                    disabled={isCreating}
                                />
                                <div className="qc-templates">
                                    {QUICK_CREATE_TEMPLATES.map(t => (
                                        <button
                                            key={t.label}
                                            className="template-chip"
                                            onClick={() => setQcSteps(prev => prev ? `${prev}\n${t.text}` : t.text)}
                                            disabled={isCreating}
                                        >
                                            <t.icon size={14} /> {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="ai-btn ai-btn-secondary"
                                onClick={() => setShowQuickCreate(false)}
                                disabled={isCreating}
                            >
                                Cancel
                            </button>
                            <button
                                className="ai-btn ai-btn-primary"
                                onClick={handleQuickCreate}
                                disabled={isCreating || !qcSteps.trim()}
                            >
                                {isCreating ? (
                                    <><Loader2 size={16} className="spin" /> Creating...</>
                                ) : (
                                    <><Play size={16} /> Generate Test</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="modal-overlay" onClick={() => !isImporting && !isCreating && setShowImportModal(false)}>
                    <div className="import-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><Upload size={20} /> Import Test Cases</h2>
                            <button
                                className="close-btn"
                                onClick={() => setShowImportModal(false)}
                                disabled={isImporting || isCreating}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".xlsx,.xls"
                                style={{ display: 'none' }}
                            />
                            <div
                                className="upload-zone"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {isImporting ? (
                                    <Loader2 size={48} className="spin" />
                                ) : (
                                    <Upload size={48} />
                                )}
                                <p>
                                    {isImporting && 'Importing...'}
                                    {!isImporting && importedTests.length > 0 && `${importedTests.length} test cases imported`}
                                    {!isImporting && importedTests.length === 0 && 'Drag & drop your Excel file here'}
                                </p>
                                <span>or click to browse</span>
                                <p className="upload-hint">Format: Test Case Name | Step 1 | Step 2 | ...</p>
                            </div>

                            {/* Preview imported tests */}
                            {importedTests.length > 0 && (
                                <div className="imported-preview">
                                    <h4>Preview:</h4>
                                    {importedTests.slice(0, 3).map((tc, i) => (
                                        <div key={i} className="preview-item">
                                            <strong>{tc.name}</strong>
                                            <span>{tc.steps.length} steps</span>
                                        </div>
                                    ))}
                                    {importedTests.length > 3 && (
                                        <div className="preview-more">
                                            +{importedTests.length - 3} more test cases
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                className="ai-btn ai-btn-secondary"
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportedTests([]);
                                }}
                                disabled={isCreating}
                            >
                                Cancel
                            </button>
                            <button
                                className="ai-btn ai-btn-primary"
                                onClick={handleStartImported}
                                disabled={importedTests.length === 0 || isCreating}
                            >
                                {isCreating ? (
                                    <><Loader2 size={16} className="spin" /> Starting...</>
                                ) : (
                                    <><Upload size={16} /> Import & Generate</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AITestRecorderPanel;
