import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';
import * as monacoEditor from 'monaco-editor';
import { registerVeroLanguage, registerVeroCompletionProvider, registerVeroLSPProviders, parseVeroCode, VeroCodeItem } from './veroLanguage';
import { useEditorErrors } from '../../errors/useEditorErrors';
import { ErrorPanel } from '../../errors/ErrorPanel';

interface VeroEditorProps {
    initialValue?: string;
    onChange?: (value: string) => void;
    onRunScenario?: (scenarioName: string) => void;
    onRunFeature?: (featureName: string) => void;
    onAddScenario?: () => void;
    onStartRecording?: (scenarioName: string) => void;
    isRecording?: boolean;
    activeRecordingScenario?: string | null;
    onAppendCode?: (code: string) => void;
    readOnly?: boolean;
    theme?: 'vero-camel' | 'vero-light';
    // Debug props
    breakpoints?: Set<number>;
    onToggleBreakpoint?: (line: number) => void;
    debugCurrentLine?: number | null;
    isDebugging?: boolean;
    // Error panel props
    showErrorPanel?: boolean;
    errorPanelCollapsed?: boolean;
    token?: string | null;
    // Project path for validation context (loads Pages, PageActions)
    veroPath?: string | null;
    // File path for extracting project path if veroPath not provided
    filePath?: string | null;
}

export interface VeroEditorHandle {
    goToLine: (line: number) => void;
}

export const VeroEditor = forwardRef<VeroEditorHandle, VeroEditorProps>(function VeroEditor({
    initialValue = '',
    onChange,
    onRunScenario,
    onRunFeature,
    onAddScenario,
    onStartRecording,
    isRecording = false,
    activeRecordingScenario: _activeRecordingScenario = null,
    readOnly = false,
    theme = 'vero-camel',
    // Debug props
    breakpoints = new Set(),
    onToggleBreakpoint,
    debugCurrentLine = null,
    isDebugging = false,
    // Error panel props
    showErrorPanel = true,
    errorPanelCollapsed = false,
    token = null,
    veroPath = null,
    filePath = null,
}, ref) {
    const [code, setCode] = useState(initialValue);
    const [codeItems, setCodeItems] = useState<VeroCodeItem[]>([]);
    const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const decorationsRef = useRef<string[]>([]);
    const debugDecorationsRef = useRef<string[]>([]);
    const errorDecorationsRef = useRef<string[]>([]);

    // State for Monaco instance (needed for error validation hook - use state not ref to trigger re-render)
    const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null);
    // State for Monaco model (needed for error validation hook)
    const [editorModel, setEditorModel] = useState<monacoEditor.editor.ITextModel | null>(null);

    // Use error validation hook
    const {
        errors,
        warnings,
        stats,
        isValidating,
    } = useEditorErrors(monacoInstance, editorModel, {
        debounceMs: 500,
        enableValidation: true,
        token,
        veroPath,
        filePath,
    });

    // Error/warning line decorations (IntelliJ-style red/yellow background + gutter icon)
    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!editor || !monaco) return;

        const errorDecorations: monacoEditor.editor.IModelDeltaDecoration[] = [];

        // Add error line decorations
        for (const error of errors) {
            const line = error.location?.line || 1;
            errorDecorations.push({
                range: new monaco.Range(line, 1, line, 1),
                options: {
                    isWholeLine: true,
                    className: 'vero-error-line',
                    glyphMarginClassName: 'vero-error-glyph',
                    overviewRuler: {
                        color: '#f85149',
                        position: monaco.editor.OverviewRulerLane.Full,
                    },
                },
            });
        }

        // Add warning line decorations
        for (const warning of warnings) {
            const line = warning.location?.line || 1;
            errorDecorations.push({
                range: new monaco.Range(line, 1, line, 1),
                options: {
                    isWholeLine: true,
                    className: 'vero-warning-line',
                    glyphMarginClassName: 'vero-warning-glyph',
                    overviewRuler: {
                        color: '#d29922',
                        position: monaco.editor.OverviewRulerLane.Full,
                    },
                },
            });
        }

        errorDecorationsRef.current = editor.deltaDecorations(
            errorDecorationsRef.current,
            errorDecorations
        );
    }, [errors, warnings]);

    // Navigate to error location
    const handleNavigateToError = useCallback((line: number, column?: number) => {
        const editor = editorRef.current;
        if (editor) {
            editor.revealLineInCenter(line);
            editor.setPosition({ lineNumber: line, column: column || 1 });
            editor.focus();
        }
    }, []);

    // Expose goToLine method via ref
    useImperativeHandle(ref, () => ({
        goToLine: (lineNumber: number) => {
            const editor = editorRef.current;
            if (editor) {
                editor.revealLineInCenter(lineNumber);
                editor.setPosition({ lineNumber, column: 1 });
                editor.focus();
            }
        }
    }), []);

    // Sync code state when initialValue prop changes (e.g., switching tabs/files)
    useEffect(() => {
        setCode(initialValue);
        updateCodeItems(initialValue);
        if (editorRef.current) {
            const model = editorRef.current.getModel();
            if (model && model.getValue() !== initialValue) {
                model.setValue(initialValue);
            }
        }
    }, [initialValue]);

    // Register language on mount
    const handleEditorWillMount = useCallback((monaco: Monaco) => {
        monacoRef.current = monaco;
        registerVeroLanguage(monaco);
        registerVeroCompletionProvider(monaco);
        registerVeroLSPProviders(monaco);  // Register LSP features: hover, definition, references, outline, folding
    }, []);

    // Setup editor after mount
    const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Set monaco instance and editor model for error validation (use state to trigger re-render)
        setMonacoInstance(monaco);
        const model = editor.getModel();
        if (model) {
            setEditorModel(model);
        }

        // Update code items when content changes
        editor.onDidChangeModelContent(() => {
            const value = editor.getValue();
            setCode(value);
            onChange?.(value);
            updateCodeItems(value);
        });

        // Initial parse
        updateCodeItems(initialValue);
    }, [initialValue, onChange]);

    // Create glyph margin decorations for run buttons + action icons
    const updateDecorations = useCallback((items: VeroCodeItem[], emptyScenarioNames: string[] = []) => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!editor || !monaco) return;

        const newDecorations: monacoEditor.editor.IModelDeltaDecoration[] = [];

        items.forEach((item) => {
            const isEmptyScenario = item.type === 'scenario' && emptyScenarioNames.includes(item.name);

            // Play button (glyph margin)
            newDecorations.push({
                range: new monaco.Range(item.line, 1, item.line, 1),
                options: {
                    isWholeLine: true,
                    glyphMarginClassName: item.type === 'feature' ? 'vero-run-feature' : 'vero-run-scenario',
                    glyphMarginHoverMessage: {
                        value: item.type === 'feature'
                            ? `▶ Run Feature: ${item.name}`
                            : `▶ Run: ${item.name}`,
                    },
                    // Add + icon for features in line decoration area
                    ...(item.type === 'feature' ? { linesDecorationsClassName: 'vero-add-scenario' } : {}),
                    // Add record icon for empty scenarios
                    ...(isEmptyScenario ? { linesDecorationsClassName: 'vero-record-scenario' } : {}),
                },
            });
        });

        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
    }, []);

    // Parse code and create decorations for run buttons
    const updateCodeItems = useCallback((value: string) => {
        const items = parseVeroCode(value);
        setCodeItems(items);

        // Find empty scenarios for record icon
        const emptyNames = items.filter(item => {
            if (item.type !== 'scenario') return false;
            const scenarioStart = value.indexOf(`scenario "${item.name}"`);
            if (scenarioStart === -1) return false;
            const scenarioContent = value.slice(scenarioStart);
            const braceStart = scenarioContent.indexOf('{');
            const braceEnd = scenarioContent.indexOf('}');
            if (braceStart === -1 || braceEnd === -1) return false;
            const body = scenarioContent.slice(braceStart + 1, braceEnd).trim();
            return body === '' || body.startsWith('#') || body.includes('Click Record to start');
        }).map(item => item.name);

        updateDecorations(items, emptyNames);
    }, [updateDecorations]);

    // Handle glyph margin click (run button) and line decoration click (add/record)
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const disposable = editor.onMouseDown((e) => {
            const lineNumber = e.target.position?.lineNumber;
            if (!lineNumber) return;

            const item = codeItems.find((i) => i.line === lineNumber);

            // Glyph margin click = run or toggle breakpoint
            if (e.target.type === monacoEditor.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
                // Check if click is on breakpoint area (left side of glyph margin)
                const element = e.target.element as HTMLElement;
                if (element?.classList.contains('vero-breakpoint') ||
                    element?.classList.contains('vero-breakpoint-active')) {
                    onToggleBreakpoint?.(lineNumber);
                    return;
                }

                if (item) {
                    if (item.type === 'scenario') {
                        onRunScenario?.(item.name);
                    } else if (item.type === 'feature') {
                        onRunFeature?.(item.name);
                    }
                }
            }

            // Line number click = toggle breakpoint
            if (e.target.type === monacoEditor.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
                onToggleBreakpoint?.(lineNumber);
                return;
            }

            // Line decoration click = add or record
            if (e.target.type === monacoEditor.editor.MouseTargetType.GUTTER_LINE_DECORATIONS) {
                const element = e.target.element as HTMLElement;
                if (element?.classList.contains('vero-add-scenario')) {
                    onAddScenario?.();
                } else if (element?.classList.contains('vero-record-scenario') && item) {
                    onStartRecording?.(item.name);
                }
            }
        });

        return () => disposable.dispose();
    }, [codeItems, onRunScenario, onRunFeature, onAddScenario, onStartRecording, onToggleBreakpoint]);

    // Update debug decorations (breakpoints and current line)
    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!editor || !monaco) return;

        const debugDecorations: monacoEditor.editor.IModelDeltaDecoration[] = [];

        // Add breakpoint decorations
        breakpoints.forEach((line) => {
            debugDecorations.push({
                range: new monaco.Range(line, 1, line, 1),
                options: {
                    isWholeLine: true,
                    glyphMarginClassName: 'vero-breakpoint-active',
                    glyphMarginHoverMessage: { value: 'Breakpoint (click to remove)' },
                },
            });
        });

        // Add current debug line decoration
        if (debugCurrentLine !== null && isDebugging) {
            debugDecorations.push({
                range: new monaco.Range(debugCurrentLine, 1, debugCurrentLine, 1),
                options: {
                    isWholeLine: true,
                    className: 'vero-debug-current-line',
                    glyphMarginClassName: 'vero-debug-arrow',
                },
            });

            // Scroll to current line
            editor.revealLineInCenter(debugCurrentLine);
        }

        debugDecorationsRef.current = editor.deltaDecorations(debugDecorationsRef.current, debugDecorations);
    }, [breakpoints, debugCurrentLine, isDebugging]);

    // Append code at cursor position (for live recording)
    const appendAtCursor = useCallback((newCode: string) => {
        const editor = editorRef.current;
        if (!editor) return;

        const position = editor.getPosition();
        if (position) {
            const lineContent = editor.getModel()?.getLineContent(position.lineNumber) || '';
            const endOfLine = lineContent.length + 1;

            editor.executeEdits('vero-recording', [{
                range: new monacoEditor.Range(
                    position.lineNumber,
                    endOfLine,
                    position.lineNumber,
                    endOfLine
                ),
                text: '\n' + newCode,
            }]);

            // Move cursor to end of inserted text
            const newLines = newCode.split('\n').length;
            editor.setPosition({
                lineNumber: position.lineNumber + newLines,
                column: 1,
            });
        }
    }, []);

    // Expose appendAtCursor for external use
    useEffect(() => {
        if (editorRef.current) {
            (editorRef.current as any).appendAtCursor = appendAtCursor;
        }
    }, [appendAtCursor]);

    return (
        <div className="vero-editor-container h-full flex flex-col">
            {/* Recording indicator */}
            {isRecording && (
                <div className="recording-indicator flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm">
                    <span className="w-3 h-3 rounded-full bg-current animate-pulse" />
                    <span>Recording...</span>
                    <span className="text-red-200 text-xs">Actions will appear in editor</span>
                </div>
            )}

            {/* Editor */}
            <div className="flex-1 min-h-0">
                <Editor
                    height="100%"
                    language="vero"
                    theme={theme}
                    value={code}
                    beforeMount={handleEditorWillMount}
                    onMount={handleEditorDidMount}
                    options={{
                        readOnly,
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        glyphMargin: true,
                        folding: true,
                        lineDecorationsWidth: 16,
                        lineNumbersMinChars: 3,
                        renderLineHighlight: 'line',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 4,
                        insertSpaces: true,
                        wordWrap: 'on',
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on',
                    }}
                />
            </div>

            {/* Error Panel */}
            {showErrorPanel && (
                <ErrorPanel
                    errors={errors}
                    warnings={warnings}
                    stats={stats}
                    isValidating={isValidating}
                    onNavigateToError={handleNavigateToError}
                    defaultCollapsed={errorPanelCollapsed}
                    maxHeight={180}
                />
            )}

            {/* Inline styles for glyph margin icons */}
            <style>{`
        .vero-run-scenario {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='%2322c55e'%3E%3Cpolygon points='5 3 19 12 5 21 5 3'/%3E%3C/svg%3E") center center no-repeat;
          cursor: pointer;
        }
        .vero-run-scenario:hover {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='%2316a34a'%3E%3Cpolygon points='5 3 19 12 5 21 5 3'/%3E%3C/svg%3E") center center no-repeat;
        }
        .vero-run-feature {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpolygon points='5 3 19 12 5 21 5 3'/%3E%3C/svg%3E") center center no-repeat;
          cursor: pointer;
        }
        .vero-run-feature:hover {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='%232563eb'%3E%3Cpolygon points='5 3 19 12 5 21 5 3'/%3E%3C/svg%3E") center center no-repeat;
        }
        .vero-add-scenario {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2322c55e' stroke-width='2.5' stroke-linecap='round'%3E%3Cline x1='12' y1='5' x2='12' y2='19'/%3E%3Cline x1='5' y1='12' x2='19' y2='12'/%3E%3C/svg%3E") center center no-repeat;
          cursor: pointer;
          width: 14px !important;
        }
        .vero-add-scenario:hover {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2316a34a' stroke-width='3' stroke-linecap='round'%3E%3Cline x1='12' y1='5' x2='12' y2='19'/%3E%3Cline x1='5' y1='12' x2='19' y2='12'/%3E%3C/svg%3E") center center no-repeat;
        }
        .vero-record-scenario {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23ef4444'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3C/svg%3E") center center no-repeat;
          cursor: pointer;
          width: 14px !important;
          animation: pulse 1.5s infinite;
        }
        .vero-record-scenario:hover {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='%23dc2626'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3C/svg%3E") center center no-repeat;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Breakpoint styles */
        .vero-breakpoint-active {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23ef4444'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3C/svg%3E") center center no-repeat;
          cursor: pointer;
        }
        .vero-breakpoint-active:hover {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='%23dc2626'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3C/svg%3E") center center no-repeat;
        }

        /* Debug current line indicator (yellow arrow) */
        .vero-debug-arrow {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='%23eab308'%3E%3Cpolygon points='4 4 20 12 4 20 4 4'/%3E%3C/svg%3E") center center no-repeat;
        }

        /* Debug current line highlight */
        .vero-debug-current-line {
          background-color: rgba(234, 179, 8, 0.15) !important;
          border-left: 2px solid #eab308 !important;
        }

        /* Error line highlight (IntelliJ-style) */
        .vero-error-line {
          background-color: rgba(248, 81, 73, 0.22) !important;
          border-left: 3px solid #f85149 !important;
        }
        .vero-error-glyph {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23f85149'/%3E%3Ctext x='12' y='16' text-anchor='middle' font-size='14' font-weight='bold' fill='white'%3E!%3C/text%3E%3C/svg%3E") center center no-repeat;
        }

        /* Warning line highlight */
        .vero-warning-line {
          background-color: rgba(210, 153, 34, 0.10) !important;
          border-left: 3px solid #d29922 !important;
        }
        .vero-warning-glyph {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Cpolygon points='12 2 22 22 2 22' fill='%23d29922'/%3E%3Ctext x='12' y='19' text-anchor='middle' font-size='12' font-weight='bold' fill='white'%3E!%3C/text%3E%3C/svg%3E") center center no-repeat;
        }
      `}</style>
        </div>
    );
});
