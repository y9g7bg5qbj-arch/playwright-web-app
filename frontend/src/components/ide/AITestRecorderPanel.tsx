import { useState, useCallback, useEffect, useRef } from 'react';
import {
    Play, Upload, FileText, ChevronDown, ChevronRight,
    Plus, RefreshCw, Check, X, Trash2, Edit3, ExternalLink,
    Loader2, AlertCircle, CheckCircle, RotateCcw, Eye
} from 'lucide-react';
import { useAIRecorder, TestCaseInput } from '@/hooks/useAIRecorder';
import './AITestRecorderPanel.css';

interface Environment {
    name: string;
    color: string;
    baseUrl: string;
    value: string;
}

interface AITestRecorderPanelProps {
    onClose?: () => void;
    onTestApproved?: (testId: string, veroCode: string, filePath: string) => void;
    projectPath?: string;
}

const ENVIRONMENTS: Environment[] = [
    { name: 'Production', color: '#7cb342', baseUrl: 'https://app.example.com', value: 'production' },
    { name: 'Staging', color: '#ffb74d', baseUrl: 'https://staging.example.com', value: 'staging' },
    { name: 'Development', color: '#64b5f6', baseUrl: 'https://dev.example.com', value: 'development' },
    { name: 'Local', color: '#a0a0a0', baseUrl: 'http://localhost:3000', value: 'local' },
];

export function AITestRecorderPanel({ onClose: _onClose, onTestApproved, projectPath }: AITestRecorderPanelProps) {
    const {
        session,
        isConnected,
        isProcessing,
        isComplete,
        importExcel,
        createAndStart,
        cancelSession,
        refreshProgress,
        replayStep,
        updateStepCode,
        addStep,
        deleteStep,
        approveTestCase,
        reset,
    } = useAIRecorder();

    // UI State
    const [selectedEnv, setSelectedEnv] = useState<Environment>(ENVIRONMENTS[1]);
    const [showEnvDropdown, setShowEnvDropdown] = useState(false);
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
    const [replaceMode, setReplaceMode] = useState<{ testId: string; stepIndex: number } | null>(null);
    const [browserUrl, setBrowserUrl] = useState('');
    const [replayingStepId, setReplayingStepId] = useState<string | null>(null);
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState('');

    // Quick Create state
    const [qcTestName, setQcTestName] = useState('');
    const [qcSteps, setQcSteps] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Import state
    const [importedTests, setImportedTests] = useState<TestCaseInput[]>([]);
    const [isImporting, setIsImporting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setBrowserUrl(`${selectedEnv.baseUrl}/login`);
    }, [selectedEnv]);

    // Auto-expand first test case
    useEffect(() => {
        if (session.testCases.length > 0 && !expandedTestId) {
            setExpandedTestId(session.testCases[0].id);
        }
    }, [session.testCases, expandedTestId]);

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

    // Generate test from quick create
    const handleQuickCreate = useCallback(async () => {
        if (!qcSteps.trim()) return;

        const lines = qcSteps.split('\n').filter(l => l.trim());
        const testCase: TestCaseInput = {
            name: qcTestName.trim() || 'New Test Case',
            steps: lines.map(l => l.trim()),
            targetUrl: selectedEnv.baseUrl,
        };

        try {
            setIsCreating(true);
            await createAndStart([testCase], {
                environment: selectedEnv.value,
                baseUrl: selectedEnv.baseUrl,
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
        const targetPath = projectPath || './tests';
        try {
            const filePath = await approveTestCase(testCaseId, targetPath);
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
            case 'human_review':
                return <CheckCircle size={14} className="step-status-icon success" />;
            case 'failed':
            case 'needs_review':
                return <AlertCircle size={14} className="step-status-icon error" />;
            case 'running':
                return (
                    <span className="step-status-retry">
                        <Loader2 size={14} className="step-status-icon spin" />
                        {retryCount !== undefined && retryCount > 1 && (
                            <span className="retry-count">{retryCount}/10</span>
                        )}
                    </span>
                );
            default:
                return null;
        }
    };

    // Template chips for quick create
    const templates = [
        { icon: ExternalLink, label: 'Navigate', text: 'Navigate to the login page' },
        { icon: Edit3, label: 'Fill', text: "Fill the email field with 'test@example.com'" },
        { icon: Play, label: 'Click', text: 'Click the Submit button' },
        { icon: CheckCircle, label: 'Assert', text: 'Verify the success message is visible' },
        { icon: RefreshCw, label: 'Loop', text: 'Loop through each user in the list' },
    ];

    return (
        <div className="ai-recorder">
            {/* Toolbar */}
            <div className="ai-recorder-toolbar">
                <div className="ai-recorder-logo">
                    <span className="logo-icon">🤖</span>
                    AI Test Recorder
                </div>

                <button
                    className="btn btn-secondary"
                    onClick={() => setShowImportModal(true)}
                    disabled={isProcessing}
                >
                    <Upload size={16} />
                    Import Excel
                </button>

                <button
                    className="btn btn-primary"
                    onClick={() => setShowQuickCreate(true)}
                    disabled={isProcessing}
                >
                    <Plus size={16} />
                    Quick Create
                </button>

                {session.sessionId && (
                    <button
                        className="btn btn-secondary"
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
                    <button className="btn btn-secondary" onClick={cancelSession}>
                        <X size={16} />
                        Cancel
                    </button>
                )}
            </div>

            {/* Main Content */}
            <div className="ai-recorder-content">
                {/* Browser Panel */}
                <div className={`browser-panel ${replaceMode ? 'replace-mode' : ''}`}>
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
                    <div className="browser-viewport">
                        {replaceMode && (
                            <div className="replace-hint">
                                <Edit3 size={16} />
                                Click on an element to replace the step
                                <button className="cancel-replace" onClick={() => setReplaceMode(null)}>
                                    <X size={14} /> Cancel
                                </button>
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
                            <button className="btn btn-icon" onClick={refreshProgress} title="Refresh">
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
                                        <div
                                            className="test-card-info"
                                            onClick={() => setExpandedTestId(expandedTestId === test.id ? null : test.id)}
                                        >
                                            <div className="test-card-name">{test.name}</div>
                                        </div>
                                        <span className={`status-chip chip-${test.status}`}>
                                            {test.status === 'complete' && <Check size={12} />}
                                            {test.status === 'human_review' && <Eye size={12} />}
                                            {test.status === 'failed' && <X size={12} />}
                                            {test.status === 'in_progress' && <Loader2 size={12} className="spin" />}
                                            {test.status.replace('_', ' ')}
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
                                                {test.steps.map((step, i) => (
                                                    <div key={step.stepId} className={`step-item step-${step.status}`}>
                                                        <div className="step-header">
                                                            <span className="step-num">{step.stepNumber}</span>
                                                            {getStatusIcon(step.status, step.retryCount)}
                                                        </div>
                                                        <div className="step-desc">{step.description}</div>
                                                        {editingStepId === step.stepId ? (
                                                            <div className="step-edit">
                                                                <input
                                                                    type="text"
                                                                    value={editingCode}
                                                                    onChange={(e) => setEditingCode(e.target.value)}
                                                                    className="step-edit-input"
                                                                />
                                                                <button className="btn btn-sm" onClick={handleSaveEdit}>
                                                                    <Check size={12} />
                                                                </button>
                                                                <button className="btn btn-sm" onClick={() => setEditingStepId(null)}>
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                className="step-code"
                                                                onClick={() => step.veroCode && handleStartEdit(step.stepId, step.veroCode)}
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
                                                                onClick={() => handleReplayStep(test.id, step.stepId)}
                                                                disabled={replayingStepId === step.stepId}
                                                                title="Replay step"
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
                                                                onClick={() => setReplaceMode({ testId: test.id, stepIndex: i })}
                                                                title="Replace step"
                                                            >
                                                                <RefreshCw size={12} /> Replace
                                                            </button>
                                                            <button
                                                                className="step-action danger"
                                                                onClick={() => deleteStep(step.stepId)}
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
                                                    className="btn btn-primary"
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

                    {/* Error display */}
                    {session.error && (
                        <div className="session-error">
                            <AlertCircle size={16} />
                            {session.error}
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
                                    {templates.map(t => (
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
                                className="btn btn-secondary"
                                onClick={() => setShowQuickCreate(false)}
                                disabled={isCreating}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
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
                                    {isImporting
                                        ? 'Importing...'
                                        : importedTests.length > 0
                                            ? `${importedTests.length} test cases imported`
                                            : 'Drag & drop your Excel file here'
                                    }
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
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportedTests([]);
                                }}
                                disabled={isCreating}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
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
