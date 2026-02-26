/**
 * useEditorErrors - React hook for real-time Vero code validation
 *
 * Handles:
 * - Debounced validation as user types
 * - Converting errors to Monaco markers
 * - Error/warning statistics
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Monaco } from '@monaco-editor/react';
import type * as monacoEditor from 'monaco-editor';
import debounce from 'lodash/debounce';
import { getRegisteredTestDataSheets } from '@/components/vero/veroLanguage';

// API endpoint for validation - use relative URL to go through Vite proxy
const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

/**
 * VeroError type (matches backend VeroError)
 */
export interface VeroError {
    code: string;
    category: string;
    severity: 'error' | 'warning' | 'info' | 'hint';
    location?: {
        line: number;
        column?: number;
        endLine?: number;
        endColumn?: number;
    };
    title: string;
    whatWentWrong: string;
    howToFix: string;
    suggestions: Array<{ text: string; action?: string }>;
    veroStatement?: string;
    selector?: string;
}

/**
 * Validation result from backend
 */
interface ValidationResult {
    success: boolean;
    errors: VeroError[];
    warnings: VeroError[];
}

/**
 * Error statistics
 */
export interface ErrorStats {
    errors: number;
    warnings: number;
    total: number;
}

/**
 * Hook options
 */
export interface UseEditorErrorsOptions {
    /** Debounce delay in milliseconds (default: 300) */
    debounceMs?: number;
    /** Enable validation (default: true) */
    enableValidation?: boolean;
    /** Auth token for API requests */
    token?: string | null;
    /** Vero project path for loading context (Pages, PageActions) */
    veroPath?: string | null;
    /** File path for extracting project path if veroPath not provided */
    filePath?: string | null;
    /** Active application ID for validation context */
    applicationId?: string | null;
    /** Active nested project ID for validation context */
    projectId?: string | null;
}

/**
 * Hook return type
 */
export interface UseEditorErrorsReturn {
    /** All validation errors */
    errors: VeroError[];
    /** All validation warnings */
    warnings: VeroError[];
    /** Combined errors and warnings */
    allIssues: VeroError[];
    /** Error statistics */
    stats: ErrorStats;
    /** Whether validation is currently running */
    isValidating: boolean;
    /** Last validation error (network/parse error) */
    validationError: string | null;
    /** Manually trigger revalidation */
    revalidate: () => void;
    /** Clear all errors */
    clearErrors: () => void;
}

/**
 * Convert severity to Monaco MarkerSeverity
 */
function severityToMonaco(
    monaco: Monaco,
    severity: VeroError['severity']
): monacoEditor.MarkerSeverity {
    switch (severity) {
        case 'error':
            return monaco.MarkerSeverity.Error;
        case 'warning':
            return monaco.MarkerSeverity.Warning;
        case 'info':
            return monaco.MarkerSeverity.Info;
        case 'hint':
            return monaco.MarkerSeverity.Hint;
        default:
            return monaco.MarkerSeverity.Error;
    }
}

/**
 * Convert VeroError to Monaco marker
 */
function errorToMarker(
    monaco: Monaco,
    error: VeroError,
    model: monacoEditor.editor.ITextModel
): monacoEditor.editor.IMarkerData {
    const location = error.location || { line: 1, column: 1 };
    const lineLength = model.getLineLength(location.line);

    let startColumn: number;
    let endColumn: number;

    if (location.column && location.endColumn) {
        // Exact range provided
        startColumn = location.column;
        endColumn = location.endColumn;
    } else if (location.column) {
        // Start column provided, mark to end of line
        startColumn = location.column;
        endColumn = lineLength + 1;
    } else {
        // No column info — mark the entire line content (skip leading whitespace)
        const lineContent = model.getLineContent(location.line);
        const trimmedStart = lineContent.search(/\S/);
        startColumn = trimmedStart >= 0 ? trimmedStart + 1 : 1;
        endColumn = lineLength + 1;
    }

    // Build user-friendly message
    let message = `${error.title}\n\n${error.whatWentWrong}\n\nHow to fix: ${error.howToFix}`;

    if (error.suggestions.length > 0) {
        message += '\n\nSuggestions:';
        for (const s of error.suggestions) {
            message += `\n• ${s.text}`;
        }
    }

    return {
        severity: severityToMonaco(monaco, error.severity),
        startLineNumber: location.line,
        startColumn,
        endLineNumber: location.endLine || location.line,
        endColumn,
        message,
        code: error.code,
        source: 'vero',
    };
}

/**
 * Fast local pre-check for VDQL data references.
 * Scans code for ROW/ROWS/COUNT statements and checks table/column names
 * against the locally cached testDataRegistry. Returns instant warnings
 * while the debounced backend validation is still in flight.
 */
function localDataReferenceCheck(code: string): VeroError[] {
    const sheets = getRegisteredTestDataSheets();
    if (sheets.length === 0) return []; // No registry loaded yet

    const sheetNames = new Set(sheets.map(s => s.name));
    const warnings: VeroError[] = [];
    const lines = code.split('\n');

    // Match: ROW varName =/FROM TableName WHERE ...
    //        ROWS varName =/FROM TableName WHERE ...
    //        COUNT varName = TableName WHERE ...
    const dataRefPattern = /^\s*(?:ROW|ROWS|COUNT)\s+\w+\s*(?:=|FROM)\s*(\w+)/i;
    // Match column refs in WHERE/AND/OR clauses: ... WHERE colName = / ... AND colName !=
    const wherePattern = /\b(?:WHERE|AND|OR)\s+(\w+)\s*(?:=|!=|>|<|>=|<=|CONTAINS|STARTS\s+WITH|ENDS\s+WITH)/gi;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const tableMatch = dataRefPattern.exec(line);
        if (!tableMatch) continue;

        const tableName = tableMatch[1];
        const lineNum = i + 1;

        if (!sheetNames.has(tableName)) {
            // Check for close matches
            const closest = findClosestName(tableName, Array.from(sheetNames));
            const suggestions: Array<{ text: string; action?: string }> = [];
            if (closest) {
                suggestions.push({ text: `Did you mean "${closest}"?` });
            }
            suggestions.push({ text: 'Open Test Data view to create this table', action: 'openTestData' });

            warnings.push({
                code: 'VERO-401',
                category: 'validation',
                severity: 'warning',
                location: { line: lineNum, column: line.indexOf(tableName) + 1 },
                title: `Unknown table "${tableName}"`,
                whatWentWrong: `The data table "${tableName}" was not found in this project.`,
                howToFix: closest
                    ? `Check the table name. Did you mean "${closest}"?`
                    : 'Create the table in the Test Data view, or check the spelling.',
                suggestions,
            });
            continue; // Skip column check for unknown tables
        }

        // Table exists — check columns in WHERE clauses
        const sheet = sheets.find(s => s.name === tableName);
        if (!sheet) continue;
        const colNames = new Set(sheet.columns.map(c => c.name));

        let colMatch: RegExpExecArray | null;
        wherePattern.lastIndex = 0;
        while ((colMatch = wherePattern.exec(line)) !== null) {
            const colName = colMatch[1];
            if (!colNames.has(colName)) {
                const closestCol = findClosestName(colName, Array.from(colNames));
                warnings.push({
                    code: 'VERO-402',
                    category: 'validation',
                    severity: 'warning',
                    location: { line: lineNum, column: colMatch.index + colMatch[0].indexOf(colName) + 1 },
                    title: `Unknown column "${colName}" in table "${tableName}"`,
                    whatWentWrong: `The column "${colName}" does not exist in table "${tableName}".`,
                    howToFix: closestCol
                        ? `Did you mean "${closestCol}"? Available columns: ${Array.from(colNames).join(', ')}`
                        : `Available columns: ${Array.from(colNames).join(', ')}`,
                    suggestions: closestCol ? [{ text: `Did you mean "${closestCol}"?` }] : [],
                });
            }
        }
    }

    return warnings;
}

/**
 * Simple closest-name finder using case-insensitive prefix/substring matching.
 * (Full Levenshtein is on the backend; this is a fast approximation.)
 */
function findClosestName(input: string, candidates: string[]): string | null {
    const lower = input.toLowerCase();
    // Exact case-insensitive match
    const exact = candidates.find(c => c.toLowerCase() === lower);
    if (exact) return exact;
    // Prefix match
    const prefix = candidates.find(c => c.toLowerCase().startsWith(lower) || lower.startsWith(c.toLowerCase()));
    if (prefix) return prefix;
    // Substring match
    const sub = candidates.find(c => c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase()));
    return sub || null;
}

/**
 * useEditorErrors hook
 *
 * @param monaco - Monaco instance from @monaco-editor/react
 * @param model - Monaco text model (editor.getModel())
 * @param options - Hook options
 */
export function useEditorErrors(
    monaco: Monaco | null,
    model: monacoEditor.editor.ITextModel | null,
    options: UseEditorErrorsOptions = {}
): UseEditorErrorsReturn {
    const {
        debounceMs = 300,
        enableValidation = true,
        token,
        veroPath,
        filePath,
        applicationId,
        projectId,
    } = options;

    const [errors, setErrors] = useState<VeroError[]>([]);
    const [warnings, setWarnings] = useState<VeroError[]>([]);
    const [isValidating, setIsValidating] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Ref to track if component is mounted
    const mountedRef = useRef(true);

    /**
     * Run fast local data-reference pre-check and show instant warnings
     * while the backend validation is still in flight.
     */
    const runLocalPreCheck = useCallback(
        (code: string) => {
            if (!monaco || !model) return;

            const localWarnings = localDataReferenceCheck(code);
            if (localWarnings.length > 0) {
                // Set local warnings immediately (will be replaced by backend results)
                setWarnings(localWarnings);
                const markers = localWarnings.map((w) => errorToMarker(monaco, w, model));
                monaco.editor.setModelMarkers(model, 'vero-local', markers);
            } else {
                // Clear local markers if no local issues
                monaco.editor.setModelMarkers(model, 'vero-local', []);
            }
        },
        [monaco, model]
    );

    /**
     * Validate code against backend API
     */
    const validateCode = useCallback(
        async (code: string) => {
            if (!monaco || !model || !enableValidation) return;

            setIsValidating(true);
            setValidationError(null);

            try {
                const response = await fetch(`${API_BASE}/api/vero/validate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ code, veroPath, filePath, applicationId, projectId }),
                });

                if (!response.ok) {
                    throw new Error(`Validation failed: ${response.status}`);
                }

                const result: ValidationResult = await response.json();

                if (!mountedRef.current) return;

                // Update state — backend results replace local pre-check
                setErrors(result.errors || []);
                setWarnings(result.warnings || []);

                // Clear local pre-check markers now that backend has responded
                monaco.editor.setModelMarkers(model, 'vero-local', []);

                // Convert to Monaco markers
                const allIssues = [...(result.errors || []), ...(result.warnings || [])];
                const markers = allIssues.map((err) => errorToMarker(monaco, err, model));
                monaco.editor.setModelMarkers(model, 'vero', markers);
            } catch (err) {
                if (!mountedRef.current) return;

                const errorMsg = err instanceof Error ? err.message : 'Validation failed';
                setValidationError(errorMsg);

                // Clear markers on error (don't show stale errors)
                monaco.editor.setModelMarkers(model, 'vero', []);
                // Keep local pre-check markers as fallback when backend fails
            } finally {
                if (mountedRef.current) {
                    setIsValidating(false);
                }
            }
        },
        [monaco, model, enableValidation, token, veroPath, filePath, applicationId, projectId]
    );

    /**
     * Debounced validation - use a ref to always call the latest validateCode
     */
    const validateCodeRef = useRef(validateCode);
    validateCodeRef.current = validateCode;

    const debouncedValidate = useRef(
        debounce((code: string) => validateCodeRef.current(code), debounceMs)
    ).current;

    /**
     * Listen for model content changes
     */
    useEffect(() => {
        if (!model || !enableValidation) return;

        const code = model.getValue();
        // Instant local pre-check for data references
        runLocalPreCheck(code);
        // Debounced full backend validation
        debouncedValidate(code);

        // Subscribe to content changes
        const disposable = model.onDidChangeContent(() => {
            const newCode = model.getValue();
            // Instant local pre-check (synchronous, no network)
            runLocalPreCheck(newCode);
            // Debounced backend validation
            debouncedValidate(newCode);
        });

        return () => {
            disposable.dispose();
            debouncedValidate.cancel();
        };
    }, [model, debouncedValidate, enableValidation, runLocalPreCheck]);

    /**
     * Clear markers on unmount
     */
    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            if (monaco && model) {
                monaco.editor.setModelMarkers(model, 'vero', []);
                monaco.editor.setModelMarkers(model, 'vero-local', []);
            }
        };
    }, [monaco, model]);

    /**
     * Manual revalidation
     */
    const revalidate = useCallback(() => {
        if (model) {
            validateCode(model.getValue());
        }
    }, [model, validateCode]);

    /**
     * Clear all errors
     */
    const clearErrors = useCallback(() => {
        setErrors([]);
        setWarnings([]);
        setValidationError(null);
        if (monaco && model) {
            monaco.editor.setModelMarkers(model, 'vero', []);
            monaco.editor.setModelMarkers(model, 'vero-local', []);
        }
    }, [monaco, model]);

    // Compute statistics
    const stats: ErrorStats = {
        errors: errors.length,
        warnings: warnings.length,
        total: errors.length + warnings.length,
    };

    return {
        errors,
        warnings,
        allIssues: [...errors, ...warnings],
        stats,
        isValidating,
        validationError,
        revalidate,
        clearErrors,
    };
}
