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

// API endpoint for validation
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

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
    const endColumn = location.endColumn ||
        (location.column ? model.getLineLength(location.line) + 1 : 2);

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
        startColumn: location.column || 1,
        endLineNumber: location.endLine || location.line,
        endColumn,
        message,
        code: error.code,
        source: 'vero',
    };
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
    const { debounceMs = 300, enableValidation = true, token } = options;

    const [errors, setErrors] = useState<VeroError[]>([]);
    const [warnings, setWarnings] = useState<VeroError[]>([]);
    const [isValidating, setIsValidating] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Ref to track if component is mounted
    const mountedRef = useRef(true);

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
                    body: JSON.stringify({ code }),
                });

                if (!response.ok) {
                    throw new Error(`Validation failed: ${response.status}`);
                }

                const result: ValidationResult = await response.json();

                if (!mountedRef.current) return;

                // Update state
                setErrors(result.errors || []);
                setWarnings(result.warnings || []);

                // Convert to Monaco markers
                const allIssues = [...(result.errors || []), ...(result.warnings || [])];
                const markers = allIssues.map((err) => errorToMarker(monaco, err, model));

                // Set markers on the model
                monaco.editor.setModelMarkers(model, 'vero', markers);
            } catch (err) {
                if (!mountedRef.current) return;

                const errorMsg = err instanceof Error ? err.message : 'Validation failed';
                setValidationError(errorMsg);

                // Clear markers on error (don't show stale errors)
                monaco.editor.setModelMarkers(model, 'vero', []);
            } finally {
                if (mountedRef.current) {
                    setIsValidating(false);
                }
            }
        },
        [monaco, model, enableValidation, token]
    );

    /**
     * Debounced validation
     */
    const debouncedValidate = useRef(
        debounce((code: string) => validateCode(code), debounceMs)
    ).current;

    /**
     * Listen for model content changes
     */
    useEffect(() => {
        if (!model || !enableValidation) return;

        // Initial validation
        debouncedValidate(model.getValue());

        // Subscribe to content changes
        const disposable = model.onDidChangeContent(() => {
            debouncedValidate(model.getValue());
        });

        return () => {
            disposable.dispose();
            debouncedValidate.cancel();
        };
    }, [model, debouncedValidate, enableValidation]);

    /**
     * Clear markers on unmount
     */
    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            if (monaco && model) {
                monaco.editor.setModelMarkers(model, 'vero', []);
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
