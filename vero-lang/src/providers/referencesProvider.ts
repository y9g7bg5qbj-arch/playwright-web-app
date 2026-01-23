import { parseVeroPages, VeroPageDefinition } from './symbolRegistry.js';

export interface Location {
    uri: string;
    range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
}

export interface ReferencesContext {
    code: string;
    filePath: string;
    lineNumber: number;
    column: number;
    wordAtPosition: string;
    lineContent: string;
    includeDeclaration?: boolean;
    registeredPages?: VeroPageDefinition[];
}

export interface ReferenceLocation extends Location {
    kind?: 'definition' | 'use' | 'do' | 'click' | 'fill' | 'verify' | 'reference';
    context?: string;
}

function makeRef(filePath: string, lineNum: number, col: number, length: number, kind: ReferenceLocation['kind'], context: string): ReferenceLocation {
    return {
        uri: filePath,
        range: { startLineNumber: lineNum, startColumn: col, endLineNumber: lineNum, endColumn: col + length },
        kind,
        context,
    };
}

function findPageReferences(pageName: string, code: string, filePath: string, includeDeclaration: boolean): ReferenceLocation[] {
    const refs: ReferenceLocation[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        if (includeDeclaration) {
            const defMatch = line.match(new RegExp(`^\\s*page\\s+(${pageName})\\s*\\{`, 'i'));
            if (defMatch) refs.push(makeRef(filePath, lineNum, line.indexOf(defMatch[1]) + 1, pageName.length, 'definition', line.trim()));
        }

        const useMatch = line.match(new RegExp(`\\buse\\s+(${pageName})\\b`, 'i'));
        if (useMatch) refs.push(makeRef(filePath, lineNum, line.indexOf(useMatch[1]) + 1, pageName.length, 'use', line.trim()));

        const memberRegex = new RegExp(`\\b(${pageName})\\.(\\w+)\\b`, 'gi');
        let memberMatch;
        while ((memberMatch = memberRegex.exec(line)) !== null) {
            refs.push(makeRef(filePath, lineNum, memberMatch.index + 1, pageName.length, 'reference', line.trim()));
        }
    }
    return refs;
}

function findFieldReferences(pageName: string, fieldName: string, code: string, filePath: string, includeDeclaration: boolean): ReferenceLocation[] {
    const refs: ReferenceLocation[] = [];
    const lines = code.split('\n');
    let inPage = false;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        const pageMatch = line.match(/^\s*page\s+(\w+)\s*\{/i);
        if (pageMatch) {
            inPage = pageMatch[1] === pageName;
            braceDepth = 1;
        }

        if (inPage) {
            braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
            if (braceDepth <= 0) inPage = false;

            if (includeDeclaration) {
                const defMatch = line.match(new RegExp(`^\\s*field\\s+(${fieldName})\\s*=`, 'i'));
                if (defMatch) refs.push(makeRef(filePath, lineNum, line.indexOf(defMatch[1]) + 1, fieldName.length, 'definition', line.trim()));
            }
        }

        const refRegex = new RegExp(`\\b${pageName}\\.(${fieldName})\\b`, 'gi');
        let refMatch;
        while ((refMatch = refRegex.exec(line)) !== null) {
            if (/^\s*field\s+/i.test(line)) continue;

            let kind: ReferenceLocation['kind'] = 'reference';
            if (/^\s*click\b/i.test(line)) kind = 'click';
            else if (/^\s*fill\b/i.test(line)) kind = 'fill';
            else if (/^\s*verify\b/i.test(line)) kind = 'verify';

            refs.push(makeRef(filePath, lineNum, refMatch.index + pageName.length + 2, fieldName.length, kind, line.trim()));
        }
    }
    return refs;
}

function findActionReferences(pageName: string, actionName: string, code: string, filePath: string, includeDeclaration: boolean): ReferenceLocation[] {
    const refs: ReferenceLocation[] = [];
    const lines = code.split('\n');
    const keywords = new Set(['field', 'if', 'for', 'repeat', 'before', 'after']);
    let inPage = false;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        const pageMatch = line.match(/^\s*page\s+(\w+)\s*\{/i);
        if (pageMatch) {
            inPage = pageMatch[1] === pageName;
            braceDepth = 1;
        }

        if (inPage) {
            braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
            if (braceDepth <= 0) inPage = false;

            if (includeDeclaration && braceDepth === 1) {
                const defMatch = line.match(new RegExp(`^\\s*(${actionName})(?:\\s+with\\s+[\\w,\\s]+)?\\s*\\{`, 'i'));
                if (defMatch && !keywords.has(defMatch[1].toLowerCase())) {
                    refs.push(makeRef(filePath, lineNum, line.indexOf(defMatch[1]) + 1, actionName.length, 'definition', line.trim()));
                }
            }
        }

        const doMatch = line.match(new RegExp(`\\bdo\\s+${pageName}\\.(${actionName})\\b`, 'i'));
        if (doMatch) {
            const col = line.toLowerCase().indexOf(actionName.toLowerCase(), line.toLowerCase().indexOf('do ')) + 1;
            refs.push(makeRef(filePath, lineNum, col, actionName.length, 'do', line.trim()));
        }
    }
    return refs;
}

function findVariableReferences(varName: string, code: string, filePath: string, includeDeclaration: boolean): ReferenceLocation[] {
    const refs: ReferenceLocation[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        if (includeDeclaration) {
            const loadMatch = line.match(new RegExp(`\\bload\\s+\\$?(${varName})\\s+from`, 'i'));
            if (loadMatch) { refs.push(makeRef(filePath, lineNum, line.indexOf(loadMatch[1]) + 1, varName.length, 'definition', line.trim())); continue; }

            const vdqlMatch = line.match(new RegExp(`\\b(data|list|number)\\s+\\$?(${varName})\\s*=`, 'i'));
            if (vdqlMatch) { refs.push(makeRef(filePath, lineNum, line.indexOf(vdqlMatch[2]) + 1, varName.length, 'definition', line.trim())); continue; }

            const forEachMatch = line.match(new RegExp(`\\bfor\\s+each\\s+\\$(${varName})\\s+in`, 'i'));
            if (forEachMatch) { refs.push(makeRef(filePath, lineNum, line.indexOf('$' + forEachMatch[1]) + 2, varName.length, 'definition', line.trim())); continue; }
        }

        const refRegex = new RegExp(`\\$(${varName})\\b`, 'gi');
        let refMatch;
        while ((refMatch = refRegex.exec(line)) !== null) {
            if (includeDeclaration && /\b(load|data|list|number|for\s+each)\b/i.test(line)) continue;
            refs.push(makeRef(filePath, lineNum, refMatch.index + 2, varName.length, 'reference', line.trim()));
        }
    }
    return refs;
}

export function provideReferences(ctx: ReferencesContext): ReferenceLocation[] {
    const { code, filePath, wordAtPosition, lineContent, includeDeclaration = true, registeredPages } = ctx;
    if (!wordAtPosition) return [];

    const pages = registeredPages || parseVeroPages(code);

    const memberMatch = lineContent.match(new RegExp(`(\\w+)\\.${wordAtPosition}\\b`));
    if (memberMatch) {
        const pageName = memberMatch[1];
        const page = pages.find(p => p.name === pageName);
        if (page?.fields.includes(wordAtPosition)) return findFieldReferences(pageName, wordAtPosition, code, filePath, includeDeclaration);
        if (page?.actions.includes(wordAtPosition)) return findActionReferences(pageName, wordAtPosition, code, filePath, includeDeclaration);
    }

    if (/^[A-Z][a-zA-Z0-9]*$/.test(wordAtPosition)) {
        const page = pages.find(p => p.name === wordAtPosition);
        if (page) return findPageReferences(wordAtPosition, code, filePath, includeDeclaration);
    }

    if (lineContent.includes('$' + wordAtPosition) || wordAtPosition.startsWith('$')) {
        return findVariableReferences(wordAtPosition.replace(/^\$/, ''), code, filePath, includeDeclaration);
    }

    if (new RegExp(`\\buse\\s+${wordAtPosition}\\b`, 'i').test(lineContent)) {
        return findPageReferences(wordAtPosition, code, filePath, includeDeclaration);
    }

    if (new RegExp(`\\b${wordAtPosition}\\.(\\w+)`).test(lineContent)) {
        return findPageReferences(wordAtPosition, code, filePath, includeDeclaration);
    }

    return [];
}

interface ReferencesAPIRef {
    filePath: string;
    line: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
    kind?: ReferenceLocation['kind'];
    context?: string;
}

interface ReferencesAPIResponse {
    references?: ReferencesAPIRef[];
}

export async function provideReferencesAsync(ctx: ReferencesContext, apiBase: string, token?: string): Promise<ReferenceLocation[]> {
    const localRefs = provideReferences(ctx);

    try {
        const response = await fetch(`${apiBase}/api/vero/references`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({
                filePath: ctx.filePath, line: ctx.lineNumber, column: ctx.column,
                word: ctx.wordAtPosition, includeDeclaration: ctx.includeDeclaration,
            }),
        });

        if (response.ok) {
            const result = await response.json() as ReferencesAPIResponse;
            if (result.references?.length) {
                const allRefs = [...localRefs];
                for (const ref of result.references) {
                    const exists = allRefs.some(r => r.uri === ref.filePath && r.range.startLineNumber === ref.line && r.range.startColumn === ref.column);
                    if (!exists) {
                        allRefs.push({
                            uri: ref.filePath,
                            range: { startLineNumber: ref.line, startColumn: ref.column || 1, endLineNumber: ref.endLine || ref.line, endColumn: ref.endColumn || 100 },
                            kind: ref.kind,
                            context: ref.context,
                        });
                    }
                }
                return allRefs;
            }
        }
    } catch (err) {
        console.warn('References lookup via API failed:', err);
    }

    return localRefs;
}

export function countReferences(symbolName: string, code: string, filePath: string): number {
    return provideReferences({
        code, filePath, lineNumber: 1, column: 1,
        wordAtPosition: symbolName, lineContent: '', includeDeclaration: false,
    }).length;
}
