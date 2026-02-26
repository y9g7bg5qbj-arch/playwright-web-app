import { symbolRegistry, parseVeroPages, VeroPageDefinition } from './symbolRegistry.js';

export interface Location {
    uri: string;
    range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
}

export interface LocationLink {
    originSelectionRange?: Location['range'];
    targetUri: string;
    targetRange: Location['range'];
    targetSelectionRange: Location['range'];
}

export interface DefinitionContext {
    code: string;
    filePath: string;
    lineNumber: number;
    column: number;
    wordAtPosition: string;
    lineContent: string;
    registeredPages?: VeroPageDefinition[];
}

export interface DefinitionResult {
    locations: Location[];
    links?: LocationLink[];
}

const KEYWORDS = new Set(['field', 'if', 'for', 'repeat', 'before', 'after']);

function makeLocation(filePath: string, line: number, col: number, length: number): Location {
    return { uri: filePath, range: { startLineNumber: line, startColumn: col, endLineNumber: line, endColumn: col + length } };
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countParameters(parameterList: string | undefined): number {
    if (!parameterList) return 0;
    return parameterList
        .split(',')
        .map((parameter) => parameter.trim())
        .filter(Boolean)
        .length;
}

function inferActionCallArity(lineContent: string, actionName: string): number | null {
    const escapedAction = escapeRegex(actionName);
    const callMatch = lineContent.match(
        new RegExp(`\\b(?:perform|do)\\s+(?:\\w+\\.)?${escapedAction}\\b(?:\\s+with\\s+(.+))?`, 'i')
    );
    if (!callMatch) return null;

    const rawArgs = callMatch[1]?.replace(/\s*#.*$/, '').trim();
    if (!rawArgs) return 0;
    return rawArgs.split(',').map((arg) => arg.trim()).filter(Boolean).length;
}

function findEnclosingPageOrPageActionsName(code: string, lineNumber: number): string | null {
    const lines = code.split('\n');
    const targetLine = Math.max(1, Math.min(lineNumber, lines.length));

    let activeBlockName: string | null = null;
    let activeBraceDepth = 0;
    let pendingBlockName: string | null = null;

    for (let i = 0; i < targetLine; i++) {
        const line = lines[i];
        const headerMatch = line.match(/^\s*(page|pageactions)\s+(\w+)\b/i);

        if (!activeBlockName && headerMatch) {
            pendingBlockName = headerMatch[2];
        }

        if (!activeBlockName && pendingBlockName) {
            const opens = (line.match(/\{/g) || []).length;
            const closes = (line.match(/\}/g) || []).length;
            if (opens > 0) {
                activeBlockName = pendingBlockName;
                pendingBlockName = null;
                activeBraceDepth = opens - closes;
                if (activeBraceDepth <= 0) {
                    activeBlockName = null;
                    activeBraceDepth = 0;
                }
                continue;
            }
        }

        if (activeBlockName) {
            activeBraceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
            if (activeBraceDepth <= 0) {
                activeBlockName = null;
                activeBraceDepth = 0;
            }
        }
    }

    return activeBlockName;
}

function findPageDefinition(pageName: string, code: string, filePath: string): Location | null {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const pageMatch = line.match(new RegExp(`^\\s*page\\s+(${pageName})\\s*\\{`, 'i'));
        if (pageMatch) return makeLocation(filePath, i + 1, line.indexOf(pageMatch[1]) + 1, pageName.length);

        const pageActionsMatch = line.match(new RegExp(`^\\s*pageactions\\s+(${pageName})\\b(?:\\s+for\\s+\\w+)?`, 'i'));
        if (pageActionsMatch) return makeLocation(filePath, i + 1, line.indexOf(pageActionsMatch[1]) + 1, pageName.length);
    }
    return null;
}

function findFieldDefinition(pageName: string, fieldName: string, code: string, filePath: string): Location | null {
    const lines = code.split('\n');
    let inPage = false;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const pageMatch = line.match(/^\s*page\s+(\w+)\s*\{/i);
        if (pageMatch) {
            inPage = pageMatch[1] === pageName;
            braceDepth = 1;
            continue;
        }

        if (inPage) {
            braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
            if (braceDepth <= 0) { inPage = false; continue; }

            const match = line.match(new RegExp(`^\\s*field\\s+(${fieldName})\\s*=`, 'i'));
            if (match) return makeLocation(filePath, i + 1, line.indexOf(match[1]) + 1, fieldName.length);
        }
    }
    return null;
}

function findActionDefinition(
    pageName: string,
    actionName: string,
    code: string,
    filePath: string,
    expectedArity?: number | null
): Location | null {
    const lines = code.split('\n');
    const escapedActionName = escapeRegex(actionName);
    let inBlock = false;
    let braceDepth = 0;
    let fallbackLocation: Location | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const blockMatch = line.match(/^\s*(page|pageactions)\s+(\w+)\b/i);
        if (blockMatch) {
            inBlock = blockMatch[2] === pageName;
            braceDepth = inBlock
                ? (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length
                : 0;
            continue;
        }

        if (inBlock) {
            if (braceDepth === 1) {
                const match = line.match(new RegExp(`^\\s*(${escapedActionName})(?:\\s+with\\s+([\\w,\\s]+))?\\s*\\{`, 'i'));
                if (match && !KEYWORDS.has(match[1].toLowerCase())) {
                    const location = makeLocation(filePath, i + 1, line.indexOf(match[1]) + 1, actionName.length);
                    const definitionArity = countParameters(match[2]);
                    if (expectedArity === undefined || expectedArity === null || definitionArity === expectedArity) {
                        return location;
                    }
                    if (!fallbackLocation) {
                        fallbackLocation = location;
                    }
                }
            }

            braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
            if (braceDepth <= 0) {
                inBlock = false;
                continue;
            }
        }
    }
    return fallbackLocation;
}

function findVariableDefinition(varName: string, code: string, filePath: string, beforeLine?: number): Location | null {
    const lines = code.split('\n');
    const maxLine = beforeLine || lines.length;

    for (let i = maxLine - 1; i >= 0; i--) {
        const line = lines[i];

        const loadMatch = line.match(new RegExp(`\\bload\\s+\\$?(${varName})\\s+from`, 'i'));
        if (loadMatch) return makeLocation(filePath, i + 1, line.indexOf(loadMatch[1]) + 1, varName.length);

        const vdqlMatch = line.match(new RegExp(`\\b(data|list|number)\\s+\\$?(${varName})\\s*=`, 'i'));
        if (vdqlMatch) return makeLocation(filePath, i + 1, line.indexOf(vdqlMatch[2]) + 1, varName.length);

        const forEachMatch = line.match(new RegExp(`\\bfor\\s+each\\s+\\$(${varName})\\s+in`, 'i'));
        if (forEachMatch) return makeLocation(filePath, i + 1, line.indexOf('$' + forEachMatch[1]) + 2, varName.length);
    }
    return null;
}

export function provideDefinition(ctx: DefinitionContext): DefinitionResult {
    const { code, filePath, lineNumber, wordAtPosition, lineContent, registeredPages } = ctx;
    if (!wordAtPosition) return { locations: [] };

    const pages = registeredPages || parseVeroPages(code);

    const memberMatch = lineContent.match(new RegExp(`(\\w+)\\.${wordAtPosition}\\b`));
    if (memberMatch) {
        const pageName = memberMatch[1];
        const fieldDef = findFieldDefinition(pageName, wordAtPosition, code, filePath);
        if (fieldDef) return { locations: [fieldDef] };

        const expectedArity = inferActionCallArity(lineContent, wordAtPosition);
        const actionDef = findActionDefinition(pageName, wordAtPosition, code, filePath, expectedArity);
        if (actionDef) return { locations: [actionDef] };

        const regDef = symbolRegistry.findDefinition(`${pageName}.${wordAtPosition}`, 'field') ||
                       symbolRegistry.findDefinition(`${pageName}.${wordAtPosition}`, 'action');
        if (regDef) {
            return { locations: [makeLocation(regDef.filePath, regDef.line, regDef.column, wordAtPosition.length)] };
        }
    }

    const escapedWord = escapeRegex(wordAtPosition);
    const bareActionCallPattern = new RegExp(`\\b(?:perform|do)\\s+${escapedWord}\\b`, 'i');
    const dottedActionCallPattern = new RegExp(`\\b(?:perform|do)\\s+\\w+\\.${escapedWord}\\b`, 'i');
    if (bareActionCallPattern.test(lineContent) && !dottedActionCallPattern.test(lineContent)) {
        const containerName = findEnclosingPageOrPageActionsName(code, lineNumber);
        if (containerName) {
            const expectedArity = inferActionCallArity(lineContent, wordAtPosition);
            const actionDef = findActionDefinition(containerName, wordAtPosition, code, filePath, expectedArity);
            if (actionDef) return { locations: [actionDef] };

            const regDef = symbolRegistry.findDefinition(`${containerName}.${wordAtPosition}`, 'action');
            if (regDef) {
                return { locations: [makeLocation(regDef.filePath, regDef.line, regDef.column, wordAtPosition.length)] };
            }
        }
    }

    if (/^[A-Z][a-zA-Z0-9]*$/.test(wordAtPosition)) {
        const pageDef = findPageDefinition(wordAtPosition, code, filePath);
        if (pageDef) return { locations: [pageDef] };

        const regDef = symbolRegistry.findDefinition(wordAtPosition, 'page');
        if (regDef) return { locations: [makeLocation(regDef.filePath, regDef.line, regDef.column, wordAtPosition.length)] };
    }

    if (lineContent.includes('$' + wordAtPosition) || wordAtPosition.startsWith('$')) {
        const varName = wordAtPosition.replace(/^\$/, '');
        const varDef = findVariableDefinition(varName, code, filePath, lineNumber);
        if (varDef) return { locations: [varDef] };
    }

    if (new RegExp(`\\buse\\s+${wordAtPosition}\\b`, 'i').test(lineContent)) {
        const pageDef = findPageDefinition(wordAtPosition, code, filePath);
        if (pageDef) return { locations: [pageDef] };

        const regDef = symbolRegistry.findDefinition(wordAtPosition, 'page');
        if (regDef) return { locations: [makeLocation(regDef.filePath, regDef.line, regDef.column, wordAtPosition.length)] };
    }

    return { locations: [] };
}

interface DefinitionAPIResponse {
    location?: { filePath: string; line: number; column?: number; endLine?: number; endColumn?: number };
}

export async function provideDefinitionAsync(ctx: DefinitionContext, apiBase: string, token?: string): Promise<DefinitionResult> {
    const localResult = provideDefinition(ctx);
    if (localResult.locations.length > 0) return localResult;

    try {
        const response = await fetch(`${apiBase}/api/vero/definition`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ filePath: ctx.filePath, line: ctx.lineNumber, column: ctx.column, word: ctx.wordAtPosition }),
        });

        if (response.ok) {
            const result = await response.json() as DefinitionAPIResponse;
            if (result.location) {
                return {
                    locations: [{
                        uri: result.location.filePath,
                        range: {
                            startLineNumber: result.location.line,
                            startColumn: result.location.column || 1,
                            endLineNumber: result.location.endLine || result.location.line,
                            endColumn: result.location.endColumn || 100,
                        },
                    }],
                };
            }
        }
    } catch (err) {
        console.warn('Definition lookup via API failed:', err);
    }

    return { locations: [] };
}
