/**
 * veroCodeLens - Monaco CodeLens provider for VDQL statements
 *
 * Shows inline "[Preview: N rows] [Edit Query]" decorations above
 * ROW/ROWS/NUMBER lines in the editor.
 */

import type { Monaco } from '@monaco-editor/react';
import type * as monacoEditor from 'monaco-editor';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

/**
 * Parse a VDQL line to extract the table name and basic filter info.
 */
function parseVDQLLine(line: string): { tableName: string; varName: string; shape: string } | null {
    const match = line.match(/^\s*(?:ROW|ROWS|NUMBER\s+\w+\s*=\s*COUNT)\s+(\w+)\s*(?:=|FROM)\s*(\w+)/i);
    if (!match) return null;

    // Detect shape from the keyword
    const keyword = line.trim().split(/\s+/)[0].toUpperCase();
    const shape = keyword === 'ROWS' ? 'ROWS' : keyword === 'NUMBER' ? 'COUNT' : 'ROW';

    return {
        varName: match[1],
        tableName: match[2],
        shape,
    };
}

/**
 * Register the VDQL CodeLens provider with Monaco.
 * Returns a disposable that can be used to unregister the provider.
 */
export function registerVDQLCodeLensProvider(
    monaco: Monaco,
    options: {
        applicationId?: string;
        onEditQuery?: (lineNumber: number, tableName: string) => void;
    } = {}
): monacoEditor.IDisposable {
    const provider = monaco.languages.registerCodeLensProvider('vero', {
        provideCodeLenses(model: monacoEditor.editor.ITextModel) {
            const lenses: monacoEditor.languages.CodeLens[] = [];
            const lineCount = model.getLineCount();

            for (let i = 1; i <= lineCount; i++) {
                const lineContent = model.getLineContent(i);
                const parsed = parseVDQLLine(lineContent);
                if (!parsed) continue;

                // "Preview" lens - will be resolved with actual row count
                lenses.push({
                    range: {
                        startLineNumber: i,
                        startColumn: 1,
                        endLineNumber: i,
                        endColumn: 1,
                    },
                    id: `vdql-preview-${i}`,
                    command: {
                        id: '',
                        title: `${parsed.shape} from ${parsed.tableName}`,
                    },
                });

                // "Edit Query" lens
                if (options.onEditQuery) {
                    lenses.push({
                        range: {
                            startLineNumber: i,
                            startColumn: 1,
                            endLineNumber: i,
                            endColumn: 1,
                        },
                        id: `vdql-edit-${i}`,
                        command: {
                            id: 'vero.editDataQuery',
                            title: 'Edit Query',
                            arguments: [i, parsed.tableName],
                        },
                    });
                }
            }

            return { lenses, dispose() {} };
        },

        async resolveCodeLens(_model: monacoEditor.editor.ITextModel, codeLens: monacoEditor.languages.CodeLens) {
            // Only resolve preview lenses
            if (!codeLens.id?.startsWith('vdql-preview-')) {
                return codeLens;
            }

            const lineNumber = codeLens.range.startLineNumber;
            const lineContent = _model.getLineContent(lineNumber);
            const parsed = parseVDQLLine(lineContent);
            if (!parsed || !options.applicationId) return codeLens;

            try {
                const response = await fetch(`${API_BASE}/api/test-data/preview-query`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tableName: parsed.tableName,
                        applicationId: options.applicationId,
                        limit: 0,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    codeLens.command = {
                        id: '',
                        title: `${parsed.shape} from ${parsed.tableName} \u2022 ${data.matchCount} rows`,
                    };
                }
            } catch {
                // Silently fail — show basic label
            }

            return codeLens;
        },
    });

    // Register the "Edit Query" command if handler provided
    let commandDisposable: monacoEditor.IDisposable | undefined;
    if (options.onEditQuery) {
        commandDisposable = monaco.editor.registerCommand(
            'vero.editDataQuery',
            (_accessor: unknown, lineNumber: number, tableName: string) => {
                options.onEditQuery?.(lineNumber, tableName);
            }
        );
    }

    return {
        dispose() {
            provider.dispose();
            commandDisposable?.dispose();
        },
    };
}
