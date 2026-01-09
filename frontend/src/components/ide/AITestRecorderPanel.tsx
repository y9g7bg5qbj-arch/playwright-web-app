import { useState, useCallback, useEffect, useRef } from 'react';
import {
    Play, Upload, FileText, Settings, ChevronDown, ChevronRight,
    Plus, RefreshCw, Check, X, Trash2, Edit3, ExternalLink,
    Loader2, AlertCircle, CheckCircle, Clock
} from 'lucide-react';
import './AITestRecorderPanel.css';

// Types
interface TestStep {
    id: string;
    type: 'navigate' | 'fill' | 'click' | 'assert' | 'loop' | 'wait';
    description: string;
    code: string;
    status: 'pending' | 'running' | 'success' | 'failed';
    error?: string;
}

interface GeneratedTest {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'complete' | 'failed' | 'incomplete';
    steps: TestStep[];
    createdAt: string;
}

interface Environment {
    name: string;
    color: string;
    baseUrl: string;
}

interface AITestRecorderPanelProps {
    onClose?: () => void;
    onTestApproved?: (testId: string, veroCode: string) => void;
}

const ENVIRONMENTS: Environment[] = [
    { name: 'Production', color: '#7cb342', baseUrl: 'https://app.example.com' },
    { name: 'Staging', color: '#ffb74d', baseUrl: 'https://staging.example.com' },
    { name: 'Development', color: '#64b5f6', baseUrl: 'https://dev.example.com' },
    { name: 'Local', color: '#a0a0a0', baseUrl: 'http://localhost:3000' },
];

export function AITestRecorderPanel({ onClose, onTestApproved }: AITestRecorderPanelProps) {
    // State
    const [selectedEnv, setSelectedEnv] = useState<Environment>(ENVIRONMENTS[0]);
    const [showEnvDropdown, setShowEnvDropdown] = useState(false);
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [generatedTests, setGeneratedTests] = useState<GeneratedTest[]>([]);
    const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [replaceMode, setReplaceMode] = useState<{ testId: string; stepIndex: number } | null>(null);
    const [browserUrl, setBrowserUrl] = useState('');

    // Quick Create state
    const [qcTestName, setQcTestName] = useState('');
    const [qcSteps, setQcSteps] = useState('');

    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        setBrowserUrl(`${selectedEnv.baseUrl}/login`);
    }, [selectedEnv]);

    // Parse step type from description
    const parseStepType = (text: string): TestStep['type'] => {
        const lower = text.toLowerCase();
        if (lower.includes('navigate') || lower.includes('go to') || lower.includes('open')) return 'navigate';
        if (lower.includes('fill') || lower.includes('enter') || lower.includes('type')) return 'fill';
        if (lower.includes('click') || lower.includes('press') || lower.includes('tap')) return 'click';
        if (lower.includes('assert') || lower.includes('verify') || lower.includes('check')) return 'assert';
        if (lower.includes('loop') || lower.includes('each') || lower.includes('iterate')) return 'loop';
        if (lower.includes('wait')) return 'wait';
        return 'click';
    };

    // Generate test from quick create
    const handleQuickCreate = useCallback(() => {
        if (!qcSteps.trim()) return;

        const lines = qcSteps.split('\n').filter(l => l.trim());
        const steps: TestStep[] = lines.map((line, i) => ({
            id: `step-${Date.now()}-${i}`,
            type: parseStepType(line),
            description: line.trim(),
            code: `// ${line.trim()}`,
            status: 'pending' as const,
        }));

        const newTest: GeneratedTest = {
            id: `TC-${String(generatedTests.length + 1).padStart(3, '0')}`,
            name: qcTestName.trim() || 'New Test Case',
            status: 'pending',
            steps,
            createdAt: new Date().toISOString(),
        };

        setGeneratedTests(prev => [newTest, ...prev]);
        setExpandedTestId(newTest.id);
        setShowQuickCreate(false);
        setQcTestName('');
        setQcSteps('');
    }, [qcTestName, qcSteps, generatedTests.length]);

    // Run generated script (not AI - just the Playwright script)
    const runGeneratedScript = useCallback(async (testId: string) => {
        const test = generatedTests.find(t => t.id === testId);
        if (!test) return;

        setIsExecuting(true);
        setGeneratedTests(prev => prev.map(t =>
            t.id === testId ? { ...t, status: 'running' as const } : t
        ));

        // Simulate running each step
        for (let i = 0; i < test.steps.length; i++) {
            setGeneratedTests(prev => prev.map(t => {
                if (t.id !== testId) return t;
                const steps = [...t.steps];
                steps[i] = { ...steps[i], status: 'running' };
                return { ...t, steps };
            }));

            await new Promise(r => setTimeout(r, 800));

            setGeneratedTests(prev => prev.map(t => {
                if (t.id !== testId) return t;
                const steps = [...t.steps];
                steps[i] = { ...steps[i], status: 'success' };
                return { ...t, steps };
            }));
        }

        setGeneratedTests(prev => prev.map(t =>
            t.id === testId ? { ...t, status: 'complete' as const } : t
        ));
        setIsExecuting(false);
    }, [generatedTests]);

    // Approve and save as .vero
    const approveTest = useCallback((testId: string) => {
        const test = generatedTests.find(t => t.id === testId);
        if (!test) return;

        // Generate Vero code
        const veroCode = `Feature: ${test.name}

Scenario: ${test.name}
${test.steps.map(s => `    ${s.code}`).join('\n')}
`;

        onTestApproved?.(testId, veroCode);

        setGeneratedTests(prev => prev.map(t =>
            t.id === testId ? { ...t, status: 'complete' as const } : t
        ));
    }, [generatedTests, onTestApproved]);

    // Delete test
    const deleteTest = useCallback((testId: string) => {
        setGeneratedTests(prev => prev.filter(t => t.id !== testId));
    }, []);

    // Delete step
    const deleteStep = useCallback((testId: string, stepIndex: number) => {
        setGeneratedTests(prev => prev.map(t => {
            if (t.id !== testId) return t;
            const steps = t.steps.filter((_, i) => i !== stepIndex);
            return { ...t, steps };
        }));
    }, []);

    // Add step
    const addStep = useCallback((testId: string, afterIndex: number, step: Omit<TestStep, 'id' | 'status'>) => {
        setGeneratedTests(prev => prev.map(t => {
            if (t.id !== testId) return t;
            const steps = [...t.steps];
            steps.splice(afterIndex + 1, 0, {
                ...step,
                id: `step-${Date.now()}`,
                status: 'pending',
            });
            return { ...t, steps };
        }));
    }, []);

    // Start replace mode
    const startReplaceMode = useCallback((testId: string, stepIndex: number) => {
        setReplaceMode({ testId, stepIndex });
    }, []);

    // Cancel replace mode
    const cancelReplaceMode = useCallback(() => {
        setReplaceMode(null);
    }, []);

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

                <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
                    <Upload size={16} />
                    Import Excel
                </button>

                <button className="btn btn-primary" onClick={() => setShowQuickCreate(true)}>
                    <Plus size={16} />
                    Quick Create
                </button>

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

                {/* Status */}
                <div className={`status-badge ${isExecuting ? 'status-running' : 'status-idle'}`}>
                    <div className="status-dot" />
                    <span>{isExecuting ? 'Executing...' : 'Ready'}</span>
                </div>
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
                                <button className="cancel-replace" onClick={cancelReplaceMode}>
                                    <X size={14} /> Cancel
                                </button>
                            </div>
                        )}
                        {/* Mock login form for demo */}
                        <div className="mock-site">
                            <div className="mock-logo">✨ DemoApp</div>
                            <div className="mock-card">
                                <h2>Sign In to Your Account</h2>
                                <input
                                    type="text"
                                    className="mock-input"
                                    placeholder="Email"
                                    data-element="email"
                                />
                                <input
                                    type="password"
                                    className="mock-input"
                                    placeholder="Password"
                                    data-element="password"
                                />
                                <button className="mock-btn" data-element="login">Sign In</button>
                                <a className="mock-link" data-element="forgot">Forgot password?</a>
                                <div className="mock-signup">Don't have an account? <a>Sign up</a></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Generated Tests Panel */}
                <div className="tests-panel">
                    <div className="tests-header">
                        <h3><FileText size={18} /> Generated Test Cases</h3>
                    </div>
                    <div className="tests-list">
                        {generatedTests.length === 0 ? (
                            <div className="empty-state">
                                <FileText size={48} />
                                <p>No test cases yet</p>
                                <span>Import Excel or use Quick Create to get started</span>
                            </div>
                        ) : (
                            generatedTests.map(test => (
                                <div
                                    key={test.id}
                                    className={`test-card ${expandedTestId === test.id ? 'expanded' : ''}`}
                                >
                                    <div className="test-card-header">
                                        <button
                                            className="play-fab"
                                            onClick={() => runGeneratedScript(test.id)}
                                            disabled={isExecuting}
                                        >
                                            {test.status === 'running' ? (
                                                <Loader2 size={20} className="spin" />
                                            ) : (
                                                <Play size={20} />
                                            )}
                                        </button>
                                        <div
                                            className="test-card-info"
                                            onClick={() => setExpandedTestId(expandedTestId === test.id ? null : test.id)}
                                        >
                                            <div className="test-card-id">{test.id}</div>
                                            <div className="test-card-name">{test.name}</div>
                                        </div>
                                        <span className={`status-chip chip-${test.status}`}>
                                            {test.status === 'complete' && <Check size={12} />}
                                            {test.status === 'failed' && <X size={12} />}
                                            {test.status === 'running' && <Loader2 size={12} className="spin" />}
                                            {test.status}
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
                                                    <div key={step.id} className={`step-item step-${step.status}`}>
                                                        <div className="step-header">
                                                            <span className="step-num">{i + 1}</span>
                                                            <span className={`step-type type-${step.type}`}>{step.type}</span>
                                                            {step.status === 'success' && <CheckCircle size={14} className="step-status-icon success" />}
                                                            {step.status === 'failed' && <AlertCircle size={14} className="step-status-icon error" />}
                                                            {step.status === 'running' && <Loader2 size={14} className="step-status-icon spin" />}
                                                        </div>
                                                        <div className="step-desc">{step.description}</div>
                                                        <div className="step-code">{step.code}</div>
                                                        <div className="step-actions">
                                                            <button className="step-action" onClick={() => startReplaceMode(test.id, i)}>
                                                                <RefreshCw size={12} /> Replace
                                                            </button>
                                                            <button className="step-action" onClick={() => deleteStep(test.id, i)}>
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="test-card-actions">
                                                <button className="btn btn-secondary" onClick={() => runGeneratedScript(test.id)}>
                                                    <Play size={16} /> Run Script
                                                </button>
                                                <button className="btn btn-primary" onClick={() => approveTest(test.id)}>
                                                    <Check size={16} /> Approve
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Summary */}
                    {generatedTests.length > 0 && (
                        <div className="tests-summary">
                            Tests: {generatedTests.length} Total, {' '}
                            <span className="success">{generatedTests.filter(t => t.status === 'complete').length} Passed</span>, {' '}
                            <span className="error">{generatedTests.filter(t => t.status === 'failed').length} Failed</span>, {' '}
                            <span className="pending">{generatedTests.filter(t => t.status === 'pending').length} Pending</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Create Modal */}
            {showQuickCreate && (
                <div className="modal-overlay" onClick={() => setShowQuickCreate(false)}>
                    <div className="quick-create-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><Plus size={20} /> Quick Create Test</h2>
                            <button className="close-btn" onClick={() => setShowQuickCreate(false)}>
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
                                />
                                <div className="qc-templates">
                                    {templates.map(t => (
                                        <button
                                            key={t.label}
                                            className="template-chip"
                                            onClick={() => setQcSteps(prev => prev ? `${prev}\n${t.text}` : t.text)}
                                        >
                                            <t.icon size={14} /> {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowQuickCreate(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleQuickCreate}>
                                <Play size={16} /> Generate Test
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
                    <div className="import-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><Upload size={20} /> Import Test Cases</h2>
                            <button className="close-btn" onClick={() => setShowImportModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="upload-zone">
                                <Upload size={48} />
                                <p>Drag & drop your Excel file here</p>
                                <span>or click to browse</span>
                                <p className="upload-hint">Format: Test Case Name | Step 1 | Step 2 | ...</p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary">
                                <Upload size={16} /> Import & Generate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AITestRecorderPanel;
