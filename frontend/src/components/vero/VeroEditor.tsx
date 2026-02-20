import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';
import * as monacoEditor from 'monaco-editor';
import { registerVeroLanguage, registerVeroCompletionProvider, registerVeroLSPProviders, parseVeroCode, VeroCodeItem } from './veroLanguage';
import { registerVDQLCodeLensProvider } from './veroCodeLens';
import { useEditorErrors } from '../../errors/useEditorErrors';
import { ErrorPanel } from '../../errors/ErrorPanel';

interface DebugVariable {
    name: string;
    value: any;
    type: string;
}

interface VeroEditorProps {
    initialValue?: string;
    onChange?: (value: string) => void;
    onRunScenario?: (scenarioName: string) => void;
    onRunFeature?: (featureName: string) => void;
    onGutterContextMenu?: (info: { x: number; y: number; itemType: 'scenario' | 'feature'; itemName: string }) => void;
    onAddScenario?: () => void;
    onStartRecording?: (scenarioName: string) => void;
    isRecording?: boolean;
    readOnly?: boolean;
    theme?: 'vero-camel' | 'vero-light' | 'vero-intellij-dark';
    // Debug props
    breakpoints?: Set<number>;
    onToggleBreakpoint?: (line: number) => void;
    debugCurrentLine?: number | null;
    isDebugging?: boolean;
    // Variables for inline display
    debugVariables?: DebugVariable[];
    // Error panel props
    showErrorPanel?: boolean;
    errorPanelCollapsed?: boolean;
    token?: string | null;
    // Project path for validation context (loads Pages, PageActions)
    veroPath?: string | null;
    // File path for extracting project path if veroPath not provided
    filePath?: string | null;
    // Nested project ID for cross-file definition lookups
    projectId?: string | null;
    // Application ID for VDQL CodeLens row count resolution
    applicationId?: string | null;
    // Callback for cross-file "Go to Definition" navigation
    onNavigateToDefinition?: (filePath: string, line: number, column: number) => void;
    // Callback to open the Data Query builder modal (Ctrl+D)
    onInsertDataQuery?: () => void;
    // Failure translation line highlights (Phase B)
    failureLines?: Array<{
        line: number;
        category: string;
        userMessage: string;
    }>;
}

export interface VeroEditorHandle {
    goToLine: (line: number) => void;
    insertText: (text: string, position?: 'cursor' | 'newline') => void;
}

function formatDebugValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') {
        const truncated = value.length > 50 ? value.substring(0, 50) + '...' : value;
        return `"${truncated}"`;
    }
    if (typeof value === 'object') {
        try {
            const json = JSON.stringify(value);
            return json.length > 50 ? json.substring(0, 50) + '...' : json;
        } catch {
            return '[Object]';
        }
    }
    return String(value);
}

export const VeroEditor = forwardRef<VeroEditorHandle, VeroEditorProps>(function VeroEditor({
    initialValue = '',
    onChange,
    onRunScenario,
    onRunFeature,
    onGutterContextMenu,
    onAddScenario,
    onStartRecording,
    isRecording = false,
    readOnly = false,
    theme = 'vero-intellij-dark',
    // Debug props
    breakpoints = new Set(),
    onToggleBreakpoint,
    debugCurrentLine = null,
    isDebugging = false,
    debugVariables = [],
    // Error panel props
    showErrorPanel = true,
    errorPanelCollapsed = false,
    token = null,
    veroPath = null,
    filePath = null,
    projectId = null,
    applicationId = null,
    onNavigateToDefinition,
    onInsertDataQuery,
    failureLines = [],
}, ref) {
    const [code, setCode] = useState(initialValue);
    const [codeItems, setCodeItems] = useState<VeroCodeItem[]>([]);
    const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const decorationsRef = useRef<string[]>([]);
    const debugDecorationsRef = useRef<string[]>([]);
    const errorDecorationsRef = useRef<string[]>([]);
    const inlineValueDecorationsRef = useRef<string[]>([]);
    const failureDecorationsRef = useRef<string[]>([]);
    const editorOpenerDisposableRef = useRef<{ dispose: () => void } | null>(null);
    const projectIdRef = useRef(projectId);
    useEffect(() => { projectIdRef.current = projectId; }, [projectId]);

    // State for Monaco instance (needed for error validation hook - use state not ref to trigger re-render)
    const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null);
    // State for Monaco model (needed for error validation hook)
    const [editorModel, setEditorModel] = useState<monacoEditor.editor.ITextModel | null>(null);

    // Register VDQL CodeLens provider (re-registers when applicationId changes)
    const codeLensDisposableRef = useRef<{ dispose: () => void } | null>(null);
    useEffect(() => {
        const monaco = monacoRef.current;
        if (!monaco) return;

        codeLensDisposableRef.current?.dispose();
        codeLensDisposableRef.current = registerVDQLCodeLensProvider(monaco, {
            applicationId: applicationId ?? undefined,
            onEditQuery: (_lineNumber, _tableName) => {
                onInsertDataQueryRef.current?.();
            },
        });

        return () => {
            codeLensDisposableRef.current?.dispose();
            codeLensDisposableRef.current = null;
        };
    }, [applicationId, monacoInstance]); // monacoInstance state triggers after mount

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

    // Expose goToLine and insertText methods via ref
    useImperativeHandle(ref, () => ({
        goToLine: (lineNumber: number) => {
            const editor = editorRef.current;
            if (editor) {
                editor.revealLineInCenter(lineNumber);
                editor.setPosition({ lineNumber, column: 1 });
                editor.focus();
            }
        },
        insertText: (text: string, position: 'cursor' | 'newline' = 'cursor') => {
            const editor = editorRef.current;
            if (!editor) return;

            const currentPosition = editor.getPosition();
            if (!currentPosition) return;

            let insertLine = currentPosition.lineNumber;
            let insertCol = currentPosition.column;
            let insertText = text;

            if (position === 'newline') {
                // Insert on a new line after the current line
                const lineCount = editor.getModel()?.getLineCount() || 1;
                const targetLine = Math.min(currentPosition.lineNumber, lineCount);
                const lineContent = editor.getModel()?.getLineContent(targetLine) || '';
                insertLine = targetLine;
                insertCol = lineContent.length + 1;
                insertText = '\n' + text;
            }

            editor.executeEdits('vero.insertDataQuery', [{
                range: {
                    startLineNumber: insertLine,
                    startColumn: insertCol,
                    endLineNumber: insertLine,
                    endColumn: insertCol,
                },
                text: insertText,
                forceMoveMarkers: true,
            }]);
            editor.focus();
        },
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
        registerVeroLSPProviders(monaco, {
            getProjectId: () => projectIdRef.current ?? null,
        });
    }, []);

    // Store latest onNavigateToDefinition in a ref so the editor opener always sees the latest
    const onNavigateToDefinitionRef = useRef(onNavigateToDefinition);
    useEffect(() => {
        onNavigateToDefinitionRef.current = onNavigateToDefinition;
    }, [onNavigateToDefinition]);

    // Store latest onInsertDataQuery in a ref for the editor action
    const onInsertDataQueryRef = useRef(onInsertDataQuery);
    useEffect(() => {
        onInsertDataQueryRef.current = onInsertDataQuery;
    }, [onInsertDataQuery]);

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

        // Register editor opener to intercept cross-file "Go to Definition" navigation
        // When Monaco resolves a definition to a different file URI, this opener fires
        // the callback to VeroWorkspace instead of trying to open it in Monaco directly.
        // Dispose any previously registered opener to avoid duplicates across editor instances.
        editorOpenerDisposableRef.current?.dispose();
        editorOpenerDisposableRef.current = monaco.editor.registerEditorOpener({
            openCodeEditor(
                _source: monacoEditor.editor.ICodeEditor,
                resource: monacoEditor.Uri,
                selectionOrPosition?: monacoEditor.IRange | monacoEditor.IPosition
            ) {
                const currentUri = editor.getModel()?.uri?.toString();
                const targetUri = resource.toString();

                // Only intercept if navigating to a different file
                if (targetUri !== currentUri && onNavigateToDefinitionRef.current) {
                    // Extract the file path from the URI (strip scheme like file:// or inmemory://)
                    const targetPath = resource.path;

                    // Extract line/column from selectionOrPosition
                    let line = 1;
                    let column = 1;
                    if (selectionOrPosition) {
                        if ('startLineNumber' in selectionOrPosition) {
                            // IRange
                            line = selectionOrPosition.startLineNumber;
                            column = selectionOrPosition.startColumn;
                        } else if ('lineNumber' in selectionOrPosition) {
                            // IPosition
                            line = selectionOrPosition.lineNumber;
                            column = selectionOrPosition.column;
                        }
                    }

                    onNavigateToDefinitionRef.current(targetPath, line, column);
                    return true; // handled — prevent Monaco's default behavior
                }
                return false; // same-file navigation, let Monaco handle it
            },
        });

        // Register "Insert Data Query" action (Ctrl+D)
        editor.addAction({
            id: 'vero.insertDataQuery',
            label: 'Insert Data Query',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD],
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 1.5,
            run: () => {
                onInsertDataQueryRef.current?.();
            },
        });

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
        // Supports both quoted (scenario "Name") and unquoted (scenario Name) forms
        const emptyNames = items.filter(item => {
            if (item.type !== 'scenario') return false;
            // Try quoted form first, then unquoted
            let scenarioStart = value.indexOf(`scenario "${item.name}"`);
            if (scenarioStart === -1) {
                scenarioStart = value.indexOf(`SCENARIO "${item.name}"`);
            }
            if (scenarioStart === -1) {
                const unquotedRegex = new RegExp(`(?:scenario|SCENARIO)\\s+${item.name}(?=\\s|@|\\{)`);
                const match = unquotedRegex.exec(value);
                if (match) scenarioStart = match.index;
            }
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
                    if (onGutterContextMenu) {
                        // Position the context menu next to the gutter icon using the element's rect
                        // (more reliable than browserEvent coordinates across Monaco versions)
                        const glyphEl = e.target.element as HTMLElement | null;
                        const rect = glyphEl?.getBoundingClientRect();
                        onGutterContextMenu({
                            x: rect ? rect.right + 4 : e.event.browserEvent.clientX,
                            y: rect ? rect.top : e.event.browserEvent.clientY,
                            itemType: item.type as 'scenario' | 'feature',
                            itemName: item.name,
                        });
                    } else if (item.type === 'scenario') {
                        onRunScenario?.(item.name);
                    } else if (item.type === 'feature') {
                        onRunFeature?.(item.name);
                    }
                    return;
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
    }, [codeItems, onRunScenario, onRunFeature, onGutterContextMenu, onAddScenario, onStartRecording, onToggleBreakpoint]);

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

    // Failure line decorations (Phase B)
    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!editor || !monaco) return;

        const failureDecorations: monacoEditor.editor.IModelDeltaDecoration[] = failureLines.map((f) => ({
            range: new monaco.Range(f.line, 1, f.line, 1),
            options: {
                isWholeLine: true,
                className: 'vero-failure-line',
                glyphMarginClassName: 'vero-failure-glyph',
                glyphMarginHoverMessage: { value: `**${f.category}**: ${f.userMessage}` },
                overviewRuler: {
                    color: '#f44336',
                    position: monaco.editor.OverviewRulerLane.Right,
                },
            },
        }));

        failureDecorationsRef.current = editor.deltaDecorations(failureDecorationsRef.current, failureDecorations);
    }, [failureLines]);

    // Inline variable values when debugging and paused
    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!editor || !monaco) return;

        // Only show inline values when debugging and we have variables
        if (!isDebugging || debugVariables.length === 0 || debugCurrentLine === null) {
            inlineValueDecorationsRef.current = editor.deltaDecorations(
                inlineValueDecorationsRef.current,
                []
            );
            return;
        }

        const inlineDecorations: monacoEditor.editor.IModelDeltaDecoration[] = [];
        const model = editor.getModel();
        if (!model) return;

        // Get the content of the current line and surrounding lines
        const startLine = Math.max(1, debugCurrentLine - 2);
        const endLine = Math.min(model.getLineCount(), debugCurrentLine + 2);

        for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
            const lineContent = model.getLineContent(lineNum);

            // Find variable references in the line (e.g., $username, _pageUrl)
            for (const variable of debugVariables) {
                // Check for $variable or variable name directly
                const varPatterns = [
                    `$${variable.name}`,
                    variable.name,
                ];

                for (const pattern of varPatterns) {
                    const varIndex = lineContent.indexOf(pattern);
                    if (varIndex !== -1) {
                        const displayValue = formatDebugValue(variable.value);

                        // Add inline decoration at end of line
                        inlineDecorations.push({
                            range: new monaco.Range(lineNum, lineContent.length + 1, lineNum, lineContent.length + 1),
                            options: {
                                after: {
                                    content: `  = ${displayValue}`,
                                    inlineClassName: 'vero-inline-value',
                                },
                            },
                        });
                        break; // Only one decoration per line
                    }
                }
            }
        }

        inlineValueDecorationsRef.current = editor.deltaDecorations(
            inlineValueDecorationsRef.current,
            inlineDecorations
        );
    }, [isDebugging, debugVariables, debugCurrentLine]);

    return (
        <div className="vero-editor-container h-full flex flex-col">
            {/* Recording indicator - Signature element */}
            {isRecording && (
                <div className="recording-indicator flex items-center gap-2 px-3 py-1.5 bg-status-danger/15 border-b border-status-danger/30 text-status-danger text-xs">
                    <span className="w-2 h-2 rounded-full bg-status-danger animate-pulse-recording" />
                    <span className="font-medium">Recording</span>
                    <span className="text-status-danger/70 text-3xs">Actions will appear in editor</span>
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

        /* Debug current line highlight - Amber pause indicator */
        .vero-debug-current-line {
          background-color: rgba(234, 179, 8, 0.12) !important;
          border-left: 2px solid #eab308 !important;
        }

        /* Execution trace line - Terminal green glow (success state) */
        .vero-execution-trace {
          background: linear-gradient(90deg, rgba(63, 185, 80, 0.15) 0%, transparent 100%) !important;
          border-left: 2px solid #3fb950 !important;
          box-shadow: inset 0 0 8px rgba(63, 185, 80, 0.2);
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

        /* Failure line highlight (runtime test failure) */
        .vero-failure-line {
          background-color: rgba(244, 67, 54, 0.15) !important;
          border-left: 3px solid #f44336 !important;
        }
        .vero-failure-glyph {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23f44336'/%3E%3Ctext x='12' y='16' text-anchor='middle' font-size='14' font-weight='bold' fill='white'%3E✕%3C/text%3E%3C/svg%3E") center center no-repeat;
        }

        /* Inline debug values (shown after code on same line) */
        .vero-inline-value {
          color: #6F737A;
          font-style: italic;
          font-size: 0.9em;
          background-color: rgba(90, 149, 245, 0.1);
          padding: 0 4px;
          border-radius: 2px;
          margin-left: 8px;
          border: 1px solid rgba(90, 149, 245, 0.15);
        }

        /* Monaco editor refinements */
        .monaco-editor .line-numbers {
          color: #4B4D53 !important;
        }
        .monaco-editor .margin {
          background-color: #1E1F22 !important;
        }
        .monaco-editor .current-line ~ .line-numbers {
          color: #A9B0B7 !important;
        }
      `}</style>
        </div>
    );
});
