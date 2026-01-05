import { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';
import * as monacoEditor from 'monaco-editor';
import { registerVeroLanguage, registerVeroCompletionProvider, parseVeroCode, VeroCodeItem } from './veroLanguage';
import { Circle, Plus } from 'lucide-react';

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
}

export function VeroEditor({
    initialValue = '',
    onChange,
    onRunScenario,
    onRunFeature,
    onAddScenario,
    onStartRecording,
    isRecording = false,
    activeRecordingScenario = null,
    readOnly = false,
    theme = 'vero-camel',
}: VeroEditorProps) {
    const [code, setCode] = useState(initialValue);
    const [codeItems, setCodeItems] = useState<VeroCodeItem[]>([]);
    const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const decorationsRef = useRef<string[]>([]);

    // Sync code state when initialValue prop changes (file selection)
    useEffect(() => {
        console.log('[VeroEditor] initialValue changed, length:', initialValue.length);
        setCode(initialValue);
        updateCodeItems(initialValue);
        // Also update the Monaco editor model directly if it exists
        if (editorRef.current) {
            const model = editorRef.current.getModel();
            if (model && model.getValue() !== initialValue) {
                console.log('[VeroEditor] Updating Monaco model directly');
                model.setValue(initialValue);
            }
        }
    }, [initialValue]);

    // Register language on mount
    const handleEditorWillMount = useCallback((monaco: Monaco) => {
        monacoRef.current = monaco;
        registerVeroLanguage(monaco);
        registerVeroCompletionProvider(monaco);
    }, []);

    // Setup editor after mount
    const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

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

            // Glyph margin click = run
            if (e.target.type === monacoEditor.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
                if (item) {
                    if (item.type === 'scenario') {
                        onRunScenario?.(item.name);
                    } else if (item.type === 'feature') {
                        onRunFeature?.(item.name);
                    }
                }
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
    }, [codeItems, onRunScenario, onRunFeature, onAddScenario, onStartRecording]);

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

    // Track which line is hovered for showing add/record buttons
    const [hoveredLine, setHoveredLine] = useState<number | null>(null);

    // Add mouse move handler to track hovered line
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const disposable = editor.onMouseMove((e) => {
            if (e.target.position?.lineNumber) {
                setHoveredLine(e.target.position.lineNumber);
            }
        });

        const leaveDisposable = editor.onMouseLeave(() => {
            // Small delay before hiding to allow clicking the button
            setTimeout(() => setHoveredLine(null), 200);
        });

        return () => {
            disposable.dispose();
            leaveDisposable.dispose();
        };
    }, []);

    // Find the feature line and last scenario line for + button placement
    const featureItem = codeItems.find(item => item.type === 'feature');
    const lastScenarioItem = codeItems.filter(item => item.type === 'scenario').pop();
    const addButtonLine = lastScenarioItem?.line || featureItem?.line;

    // Find empty scenarios (for showing record button)
    const emptyScenarios = codeItems.filter(item => {
        if (item.type !== 'scenario') return false;
        const scenarioStart = code.indexOf(`scenario "${item.name}"`);
        if (scenarioStart === -1) return false;
        const scenarioContent = code.slice(scenarioStart);
        const braceStart = scenarioContent.indexOf('{');
        const braceEnd = scenarioContent.indexOf('}');
        if (braceStart === -1 || braceEnd === -1) return false;
        const body = scenarioContent.slice(braceStart + 1, braceEnd).trim();
        return body === '' || body.startsWith('#') || body.includes('Click Record to start');
    });

    // Determine what action to show based on hovered line
    const getHoverAction = () => {
        if (!hoveredLine) return null;

        // Check if hovering near feature line - show + Add Scenario
        if (featureItem && Math.abs(hoveredLine - featureItem.line) <= 1) {
            return { type: 'add', line: featureItem.line };
        }

        // Check if hovering on an empty scenario - show Record
        const emptyScenario = emptyScenarios.find(s => Math.abs(hoveredLine - s.line) <= 1);
        if (emptyScenario) {
            return { type: 'record', line: emptyScenario.line, name: emptyScenario.name };
        }

        // Check if hovering near end of scenarios - show + Add Scenario
        if (addButtonLine && hoveredLine >= addButtonLine) {
            return { type: 'add', line: addButtonLine };
        }

        return null;
    };

    const hoverAction = getHoverAction();

    return (
        <div className="vero-editor-container h-full flex flex-col">
            {/* Recording indicator */}
            {isRecording && (
                <div className="recording-indicator flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm">
                    <Circle className="w-3 h-3 fill-current animate-pulse" />
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
      `}</style>
        </div>
    );
}
