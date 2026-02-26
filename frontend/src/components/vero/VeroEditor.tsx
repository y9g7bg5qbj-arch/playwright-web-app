import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';
import * as monacoEditor from 'monaco-editor';
import { registerVeroLanguage, registerVeroCompletionProvider, registerVeroLSPProviders, parseVeroCode, VeroCodeItem } from './veroLanguage';
import { registerVDQLCodeLensProvider } from './veroCodeLens';
import { useEditorErrors } from '../../errors/useEditorErrors';
import { ErrorPanel } from '../../errors/ErrorPanel';
import { useSlashBuilder } from './slash-builder/useSlashBuilder';
import { SlashPalette } from './slash-builder/SlashPalette';
import { TargetPopup } from './slash-builder/TargetPopup';
import { SlotPopup } from './slash-builder/SlotPopup';
import { createPlaceholderDecorations, clearPlaceholderDecorations, markPlaceholderFilled, findPlaceholderAtPosition, getNextUnfilledPlaceholder, PLACEHOLDER_STYLES } from './slash-builder/placeholderDecorations';
import { formatTarget } from './slash-builder/buildSnippet';
import type { ActionDef, TargetValue, PlaceholderRange } from './slash-builder/types';

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
    applySnippet: (request: {
        text: string;
        mode: 'replace-line' | 'insert-below';
        lineNumber?: number;
    }) => void;
    openSlashBuilder: (request?: {
        lineNumber?: number;
        seedQuery?: string;
    }) => void;
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

type SlashHookType = 'BEFORE_ALL' | 'BEFORE_EACH' | 'AFTER_EACH' | 'AFTER_ALL';

const SLASH_HOOK_ACTION_TO_TYPE: Record<string, SlashHookType> = {
    'hook-before-all': 'BEFORE_ALL',
    'hook-before-each': 'BEFORE_EACH',
    'hook-after-each': 'AFTER_EACH',
    'hook-after-all': 'AFTER_ALL',
};

const SLASH_HOOK_TEXT: Record<SlashHookType, string> = {
    BEFORE_ALL: 'BEFORE ALL',
    BEFORE_EACH: 'BEFORE EACH',
    AFTER_EACH: 'AFTER EACH',
    AFTER_ALL: 'AFTER ALL',
};

interface FeatureBounds {
    declarationLine: number;
    openBraceLine: number;
    openBraceColumn: number;
    closeBraceLine: number;
    featureIndent: string;
}

interface HookBlock {
    type: SlashHookType;
    startLine: number;
    openBraceLine: number;
    openBraceColumn: number;
    closeLine: number;
    bodyLine: number;
}

interface FeatureHookAnalysis {
    bounds: FeatureBounds;
    memberIndent: string;
    hooks: Partial<Record<SlashHookType, HookBlock>>;
    firstScenarioLine: number | null;
}

function findFirstBraceFromLine(
    model: monacoEditor.editor.ITextModel,
    startLine: number,
): { line: number; column: number } | null {
    for (let line = startLine; line <= model.getLineCount(); line++) {
        const content = model.getLineContent(line);
        const braceIndex = content.indexOf('{');
        if (braceIndex >= 0) {
            return { line, column: braceIndex + 1 };
        }
    }
    return null;
}

function findMatchingBrace(
    model: monacoEditor.editor.ITextModel,
    openBraceLine: number,
    openBraceColumn: number,
): { line: number; column: number } | null {
    let depth = 0;
    for (let line = openBraceLine; line <= model.getLineCount(); line++) {
        const content = model.getLineContent(line);
        const startIdx = line === openBraceLine ? openBraceColumn - 1 : 0;

        for (let i = startIdx; i < content.length; i++) {
            const ch = content[i];
            if (ch === '{') {
                depth += 1;
            } else if (ch === '}') {
                depth -= 1;
                if (depth === 0) {
                    return { line, column: i + 1 };
                }
            }
        }
    }
    return null;
}

function findFeatureBoundsAtOrFirst(
    model: monacoEditor.editor.ITextModel,
    cursorLine: number,
): FeatureBounds | null {
    let firstFeature: FeatureBounds | null = null;
    const lineCount = model.getLineCount();

    for (let line = 1; line <= lineCount; line++) {
        const content = model.getLineContent(line);
        if (!/^\s*(?:FEATURE|feature)\b/.test(content)) continue;

        const inlineBrace = content.indexOf('{');
        const opening = inlineBrace >= 0
            ? { line, column: inlineBrace + 1 }
            : findFirstBraceFromLine(model, line + 1);
        if (!opening) continue;

        const closing = findMatchingBrace(model, opening.line, opening.column);
        if (!closing) continue;

        const featureIndentMatch = content.match(/^(\s*)/);
        const feature: FeatureBounds = {
            declarationLine: line,
            openBraceLine: opening.line,
            openBraceColumn: opening.column,
            closeBraceLine: closing.line,
            featureIndent: featureIndentMatch ? featureIndentMatch[1] : '',
        };

        if (!firstFeature) {
            firstFeature = feature;
        }

        if (cursorLine >= feature.declarationLine && cursorLine <= feature.closeBraceLine) {
            return feature;
        }
    }

    return firstFeature;
}

function resolveHookType(kind: string, scope: string | undefined): SlashHookType {
    const upperKind = kind.toUpperCase();
    const upperScope = scope?.toUpperCase();
    if (upperKind === 'BEFORE') {
        return upperScope === 'ALL' ? 'BEFORE_ALL' : 'BEFORE_EACH';
    }
    return upperScope === 'ALL' ? 'AFTER_ALL' : 'AFTER_EACH';
}

function analyzeFeatureHooks(
    model: monacoEditor.editor.ITextModel,
    bounds: FeatureBounds,
): FeatureHookAnalysis {
    const hooks: Partial<Record<SlashHookType, HookBlock>> = {};
    let firstScenarioLine: number | null = null;
    let memberIndent: string | null = null;
    let depth = 1;

    for (let line = bounds.openBraceLine; line <= bounds.closeBraceLine; line++) {
        const content = model.getLineContent(line);

        if (line > bounds.openBraceLine && line < bounds.closeBraceLine && depth === 1) {
            if (!memberIndent && content.trim() !== '') {
                const indentMatch = content.match(/^(\s*)/);
                memberIndent = indentMatch ? indentMatch[1] : '';
            }

            if (firstScenarioLine === null && /^\s*(?:SCENARIO|scenario)\b/.test(content)) {
                firstScenarioLine = line;
            }

            const hookMatch = content.match(/^\s*(BEFORE|AFTER)\s*(?:\s+(ALL|EACH))?\s*\{/i);
            if (hookMatch) {
                const hookType = resolveHookType(hookMatch[1], hookMatch[2]);
                if (!hooks[hookType]) {
                    const openBraceColumn = content.indexOf('{') + 1;
                    const close = findMatchingBrace(model, line, openBraceColumn);
                    const closeLine = close?.line ?? line;
                    hooks[hookType] = {
                        type: hookType,
                        startLine: line,
                        openBraceLine: line,
                        openBraceColumn,
                        closeLine,
                        bodyLine: closeLine > line ? line + 1 : line,
                    };
                }
            }
        }

        const charStart = line === bounds.openBraceLine ? bounds.openBraceColumn - 1 : 0;
        for (let i = charStart; i < content.length; i++) {
            const ch = content[i];
            if (ch === '{') {
                depth += 1;
            } else if (ch === '}') {
                depth -= 1;
            }
        }
    }

    return {
        bounds,
        hooks,
        firstScenarioLine,
        memberIndent: memberIndent ?? `${bounds.featureIndent}  `,
    };
}

function minLine(lines: number[]): number {
    let min = Number.POSITIVE_INFINITY;
    for (const line of lines) {
        if (line < min) min = line;
    }
    return min;
}

function computeHookInsertLine(
    analysis: FeatureHookAnalysis,
    target: SlashHookType,
): number {
    const hooks = analysis.hooks;
    const featureEndLine = analysis.bounds.closeBraceLine;
    const firstScenarioLine = analysis.firstScenarioLine ?? featureEndLine;

    const hookStart = (type: SlashHookType): number =>
        hooks[type]?.startLine ?? Number.POSITIVE_INFINITY;
    const hookClose = (type: SlashHookType): number =>
        hooks[type]?.closeLine ?? 0;

    if (target === 'BEFORE_ALL') {
        return minLine([
            hookStart('BEFORE_EACH'),
            hookStart('AFTER_EACH'),
            hookStart('AFTER_ALL'),
            firstScenarioLine,
            featureEndLine,
        ]);
    }

    if (target === 'BEFORE_EACH') {
        const candidate = minLine([
            hookStart('AFTER_EACH'),
            hookStart('AFTER_ALL'),
            firstScenarioLine,
            featureEndLine,
        ]);
        const earliest = hooks.BEFORE_ALL ? hookClose('BEFORE_ALL') + 1 : analysis.bounds.openBraceLine + 1;
        return Math.max(candidate, earliest);
    }

    if (target === 'AFTER_EACH') {
        const candidate = minLine([
            hookStart('AFTER_ALL'),
            firstScenarioLine,
            featureEndLine,
        ]);
        const earliest = Math.max(hookClose('BEFORE_ALL'), hookClose('BEFORE_EACH')) + 1;
        return Math.max(candidate, earliest);
    }

    const candidate = minLine([firstScenarioLine, featureEndLine]);
    const earliest = Math.max(
        hookClose('BEFORE_ALL'),
        hookClose('BEFORE_EACH'),
        hookClose('AFTER_EACH'),
    ) + 1;
    return Math.max(candidate, earliest);
}

function placeCursorInHook(
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    model: monacoEditor.editor.ITextModel,
    hook: HookBlock,
    memberIndent: string,
): void {
    const bodyIndentColumn = `${memberIndent}    `.length + 1;
    const line = hook.bodyLine;
    const maxColumn = model.getLineMaxColumn(line);
    const column = hook.bodyLine === hook.openBraceLine
        ? Math.min(maxColumn, hook.openBraceColumn + 1)
        : Math.min(maxColumn, bodyIndentColumn);
    editor.revealLineInCenter(line);
    editor.setPosition({ lineNumber: line, column });
    editor.focus();
}

function applyFeatureHookSlashAction(
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    model: monacoEditor.editor.ITextModel,
    cursorLine: number,
    targetHookType: SlashHookType,
): void {
    const bounds = findFeatureBoundsAtOrFirst(model, cursorLine);
    if (!bounds) return;

    const analysis = analyzeFeatureHooks(model, bounds);
    const existing = analysis.hooks[targetHookType];
    if (existing) {
        placeCursorInHook(editor, model, existing, analysis.memberIndent);
        return;
    }

    const insertLine = computeHookInsertLine(analysis, targetHookType);
    const hookText = SLASH_HOOK_TEXT[targetHookType];
    const trailingGap = insertLine === analysis.bounds.closeBraceLine ? '\n' : '\n\n';
    const block = `${analysis.memberIndent}${hookText} {\n${analysis.memberIndent}    \n${analysis.memberIndent}}${trailingGap}`;

    editor.executeEdits('vero.slashBuilder.hook', [{
        range: {
            startLineNumber: insertLine,
            startColumn: 1,
            endLineNumber: insertLine,
            endColumn: 1,
        },
        text: block,
        forceMoveMarkers: true,
    }]);

    const bodyLine = insertLine + 1;
    const column = `${analysis.memberIndent}    `.length + 1;
    editor.revealLineInCenter(bodyLine);
    editor.setPosition({
        lineNumber: bodyLine,
        column: Math.min(model.getLineMaxColumn(bodyLine), column),
    });
    editor.focus();
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

    // ─── Slash Builder ──────────────────────────────────────────────
    const slashBuilder = useSlashBuilder({
        onInsertDataQuery: () => onInsertDataQueryRef.current?.(),
    });
    const slashBuilderRef = useRef(slashBuilder);
    slashBuilderRef.current = slashBuilder;
    const slashPlaceholdersRef = useRef<PlaceholderRange[]>([]);

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
        applicationId,
        projectId,
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
        applySnippet: (request: { text: string; mode: 'replace-line' | 'insert-below'; lineNumber?: number }) => {
            const editor = editorRef.current;
            if (!editor) return;
            const model = editor.getModel();
            if (!model) return;

            const line = request.lineNumber ?? editor.getPosition()?.lineNumber ?? 1;

            if (request.mode === 'replace-line') {
                const lineContent = model.getLineContent(line);
                editor.executeEdits('vero.slashBuilder', [{
                    range: {
                        startLineNumber: line,
                        startColumn: 1,
                        endLineNumber: line,
                        endColumn: lineContent.length + 1,
                    },
                    text: request.text,
                    forceMoveMarkers: true,
                }]);
            } else {
                const lineContent = model.getLineContent(line);
                editor.executeEdits('vero.slashBuilder', [{
                    range: {
                        startLineNumber: line,
                        startColumn: lineContent.length + 1,
                        endLineNumber: line,
                        endColumn: lineContent.length + 1,
                    },
                    text: '\n' + request.text,
                    forceMoveMarkers: true,
                }]);
            }
            editor.focus();
        },
        openSlashBuilder: (request?: { lineNumber?: number; seedQuery?: string }) => {
            const editor = editorRef.current;
            if (!editor || readOnly) return;
            const line = request?.lineNumber ?? editor.getPosition()?.lineNumber ?? 1;
            const scrolledPos = editor.getScrolledVisiblePosition({ lineNumber: line, column: 1 });
            const editorDom = editor.getDomNode();
            if (scrolledPos && editorDom) {
                const editorRect = editorDom.getBoundingClientRect();
                slashBuilder.openPalette(
                    { x: editorRect.left + scrolledPos.left, y: editorRect.top + scrolledPos.top + scrolledPos.height },
                    line,
                );
            }
        },
    }), [readOnly, slashBuilder]);

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

        // Update code items when content changes + slash detection
        editor.onDidChangeModelContent((e) => {
            const value = editor.getValue();
            setCode(value);
            onChange?.(value);
            updateCodeItems(value);

            // ─── Slash detection ─────────────────────────────────
            if (readOnly) return;
            const changes = e.changes;
            if (changes.length !== 1) return;
            const change = changes[0];
            if (change.text !== '/') return;

            const model = editor.getModel();
            if (!model) return;

            const lineNumber = change.range.startLineNumber;
            const lineContent = model.getLineContent(lineNumber);

            // Check if line is blank except for the "/"
            const withoutSlash = lineContent.replace('/', '').trim();
            if (withoutSlash !== '') return;

            // Remove the "/" character but preserve leading whitespace
            const indentMatch = lineContent.match(/^(\s*)/);
            const indent = indentMatch ? indentMatch[1] : '';
            editor.executeEdits('vero.slashDetect', [{
                range: {
                    startLineNumber: lineNumber,
                    startColumn: 1,
                    endLineNumber: lineNumber,
                    endColumn: lineContent.length + 1,
                },
                text: indent,
            }]);

            // Get cursor position for palette placement
            const scrolledPos = editor.getScrolledVisiblePosition({ lineNumber, column: 1 });
            const editorDom = editor.getDomNode();
            if (scrolledPos && editorDom) {
                const editorRect = editorDom.getBoundingClientRect();
                slashBuilderRef.current.openPalette(
                    { x: editorRect.left + scrolledPos.left + 40, y: editorRect.top + scrolledPos.top + scrolledPos.height },
                    lineNumber,
                );
            }
        });

        // ─── Pill click detection ────────────────────────────────
        editor.onMouseDown((e) => {
            if (slashBuilderRef.current.state.phase !== 'filling') return;
            const target = e.target;
            if (!target.position) return;

            const { lineNumber, column } = target.position;
            const placeholder = findPlaceholderAtPosition(
                slashPlaceholdersRef.current,
                lineNumber,
                column,
            );

            if (placeholder) {
                const scrolledPos = editor.getScrolledVisiblePosition(target.position);
                const editorDom = editor.getDomNode();
                if (scrolledPos && editorDom) {
                    const editorRect = editorDom.getBoundingClientRect();
                    slashBuilderRef.current.openSlotPopup(placeholder.slotId, {
                        x: editorRect.left + scrolledPos.left,
                        y: editorRect.top + scrolledPos.top + scrolledPos.height,
                    });
                }
            }
        });

        // Initial parse
        updateCodeItems(initialValue);
    }, [initialValue, onChange, readOnly]);

    // ─── Slash Builder: action selection handler ────────────────────
    const handleSlashActionSelect = useCallback((action: ActionDef) => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!editor || !monaco) return;

        const lineNumber = slashBuilder.state.phase === 'palette'
            ? slashBuilder.state.lineNumber
            : editor.getPosition()?.lineNumber ?? 1;

        const hookType = SLASH_HOOK_ACTION_TO_TYPE[action.id];
        if (hookType) {
            const model = editor.getModel();
            if (!model) return;
            applyFeatureHookSlashAction(editor, model, lineNumber, hookType);
            slashBuilder.close();
            return;
        }

        slashBuilder.selectAction(action, lineNumber);

        // If it's a data query handoff, selectAction already handles it
        if (action.id === 'data-query') return;

        // Insert the snippet template text
        const model = editor.getModel();
        if (!model) return;

        // Get current indentation on the line
        const existingContent = model.getLineContent(lineNumber);
        const indentMatch = existingContent.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';

        // Convert snippet template placeholders to ‹label› text
        // e.g. 'FILL ${1:‹target›} WITH "${2:‹value›}"' → 'FILL ‹target› WITH "‹value›"'
        const plainText = action.snippetTemplate.replace(/\$\{\d+:([^}]+)\}/g, '$1');

        editor.executeEdits('vero.slashBuilder', [{
            range: {
                startLineNumber: lineNumber,
                startColumn: 1,
                endLineNumber: lineNumber,
                endColumn: existingContent.length + 1,
            },
            text: indent + plainText,
        }]);

        // Create placeholder decorations for ‹...› markers
        const placeholders = createPlaceholderDecorations(editor, monaco, lineNumber, action);
        slashPlaceholdersRef.current = placeholders;
        slashBuilder.setPlaceholders(placeholders);

        // Open popup for the first placeholder automatically
        if (placeholders.length > 0) {
            const first = placeholders[0];
            const scrolledPos = editor.getScrolledVisiblePosition({
                lineNumber: first.lineNumber,
                column: first.startColumn,
            });
            const editorDom = editor.getDomNode();
            if (scrolledPos && editorDom) {
                const editorRect = editorDom.getBoundingClientRect();
                slashBuilder.openSlotPopup(first.slotId, {
                    x: editorRect.left + scrolledPos.left,
                    y: editorRect.top + scrolledPos.top + scrolledPos.height,
                });
            }
        }

        editor.focus();
    }, [slashBuilder]);

    // ─── Slash Builder: slot fill handler ─────────────────────────
    const handleSlotFill = useCallback((slotId: string, textValue: string) => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!editor || !monaco) return;

        const placeholder = slashPlaceholdersRef.current.find(p => p.slotId === slotId);
        if (!placeholder) return;

        // Replace the placeholder marker text with the filled value
        editor.executeEdits('vero.slashBuilder.fill', [{
            range: {
                startLineNumber: placeholder.lineNumber,
                startColumn: placeholder.startColumn,
                endLineNumber: placeholder.lineNumber,
                endColumn: placeholder.endColumn,
            },
            text: textValue,
        }]);

        // Calculate new range after edit
        const newEndCol = placeholder.startColumn + textValue.length;

        // Update decoration to "filled" style
        markPlaceholderFilled(editor, monaco, placeholder, placeholder.startColumn, newEndCol);

        // Update placeholder tracking with new range
        placeholder.startColumn = placeholder.startColumn;
        placeholder.endColumn = newEndCol;
        placeholder.filled = true;

        // Adjust other placeholders on same line — re-read positions from Monaco decorations
        for (const p of slashPlaceholdersRef.current) {
            if (p.slotId !== slotId && p.lineNumber === placeholder.lineNumber && p.startColumn > placeholder.startColumn) {
                // This line was already processed by Monaco's executeEdits which adjusts ranges,
                // but our manual tracking needs updating. Re-read from decoration.
                const model = editor.getModel();
                if (model) {
                    const range = model.getDecorationRange(p.decorationId);
                    if (range) {
                        p.startColumn = range.startColumn;
                        p.endColumn = range.endColumn;
                    }
                }
            }
        }

        // Notify state machine
        slashBuilder.fillSlot(slotId, placeholder.startColumn, newEndCol);

        // Auto-open next unfilled popup
        const next = getNextUnfilledPlaceholder(slashPlaceholdersRef.current, slotId);
        if (next) {
            const scrolledPos = editor.getScrolledVisiblePosition({
                lineNumber: next.lineNumber,
                column: next.startColumn,
            });
            const editorDom = editor.getDomNode();
            if (scrolledPos && editorDom) {
                const editorRect = editorDom.getBoundingClientRect();
                slashBuilder.openSlotPopup(next.slotId, {
                    x: editorRect.left + scrolledPos.left,
                    y: editorRect.top + scrolledPos.top + scrolledPos.height,
                });
            }
        }
    }, [slashBuilder]);

    // ─── Slash Builder: target fill handler ───────────────────────
    const handleTargetFill = useCallback((slotId: string, target: TargetValue) => {
        const textValue = formatTarget(target);
        handleSlotFill(slotId, textValue);
    }, [handleSlotFill]);

    // Clean up placeholders when slash builder closes
    useEffect(() => {
        if (slashBuilder.state.phase === 'closed') {
            const editor = editorRef.current;
            if (editor && slashPlaceholdersRef.current.length > 0) {
                clearPlaceholderDecorations(editor, slashPlaceholdersRef.current);
                slashPlaceholdersRef.current = [];
            }
        }
    }, [slashBuilder.state.phase]);

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

            {/* ─── Slash Builder Overlays ──────────────────────────── */}
            {slashBuilder.state.phase === 'palette' && (
                <SlashPalette
                    x={slashBuilder.state.position.x}
                    y={slashBuilder.state.position.y}
                    onSelect={handleSlashActionSelect}
                    onClose={slashBuilder.close}
                />
            )}

            {slashBuilder.state.phase === 'filling' && slashBuilder.state.activeSlotId && slashBuilder.state.popupPosition && (() => {
                const fillingState = slashBuilder.state;
                const activeSlot = fillingState.action.slots.find(
                    s => s.id === fillingState.activeSlotId
                );
                if (!activeSlot) return null;

                if (activeSlot.kind === 'page-field' || activeSlot.kind === 'page-action') {
                    return (
                        <TargetPopup
                            x={fillingState.popupPosition!.x}
                            y={fillingState.popupPosition!.y}
                            onApply={(target) => handleTargetFill(activeSlot.id, target)}
                            onClose={slashBuilder.closeSlotPopup}
                        />
                    );
                }

                return (
                    <SlotPopup
                        x={fillingState.popupPosition!.x}
                        y={fillingState.popupPosition!.y}
                        slot={activeSlot}
                        onApply={(value) => handleSlotFill(activeSlot.id, value)}
                        onClose={slashBuilder.closeSlotPopup}
                    />
                );
            })()}

            {/* Inline styles for glyph margin icons + slash pills */}
            <style>{PLACEHOLDER_STYLES}</style>
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
