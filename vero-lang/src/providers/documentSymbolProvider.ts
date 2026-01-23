export const SymbolKind = {
    File: 0, Module: 1, Namespace: 2, Package: 3, Class: 4, Method: 5, Property: 6,
    Field: 7, Constructor: 8, Enum: 9, Interface: 10, Function: 11, Variable: 12,
    Constant: 13, String: 14, Number: 15, Boolean: 16, Array: 17, Object: 18,
    Key: 19, Null: 20, EnumMember: 21, Struct: 22, Event: 23, Operator: 24, TypeParameter: 25,
} as const;

export interface DocumentSymbol {
    name: string;
    detail: string;
    kind: number;
    tags?: number[];
    range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
    selectionRange: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
    children?: DocumentSymbol[];
}

interface BlockEntry {
    type: string;
    startLine: number;
    symbol: DocumentSymbol;
}

const KEYWORDS = new Set(['page', 'feature', 'scenario', 'field', 'if', 'else', 'for', 'repeat', 'before', 'after', 'fixture']);

function makeRange(lineNumber: number, startCol: number, endCol: number): DocumentSymbol['range'] {
    return { startLineNumber: lineNumber, startColumn: startCol, endLineNumber: lineNumber, endColumn: endCol };
}

export function provideDocumentSymbols(code: string): DocumentSymbol[] {
    const symbols: DocumentSymbol[] = [];
    const lines = code.split('\n');
    const blockStack: BlockEntry[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) continue;

        const pageMatch = line.match(/^(\s*)page\s+(\w+)\s*\{/i);
        if (pageMatch) {
            const indent = pageMatch[1].length;
            const name = pageMatch[2];
            blockStack.push({
                type: 'page',
                startLine: lineNumber,
                symbol: {
                    name,
                    detail: 'page',
                    kind: SymbolKind.Class,
                    range: makeRange(lineNumber, indent + 1, line.length + 1),
                    selectionRange: makeRange(lineNumber, indent + 6, indent + 6 + name.length),
                    children: [],
                },
            });
            continue;
        }

        const featureMatch = line.match(/^(\s*)feature\s+(?:"([^"]+)"|(\w+))\s*\{/i);
        if (featureMatch) {
            const indent = featureMatch[1].length;
            const name = featureMatch[2] || featureMatch[3];
            blockStack.push({
                type: 'feature',
                startLine: lineNumber,
                symbol: {
                    name,
                    detail: 'feature',
                    kind: SymbolKind.Module,
                    range: makeRange(lineNumber, indent + 1, line.length + 1),
                    selectionRange: makeRange(lineNumber, line.indexOf(name) + 1, line.indexOf(name) + 1 + name.length),
                    children: [],
                },
            });
            continue;
        }

        const scenarioMatch = line.match(/^(\s*)scenario\s+"([^"]+)"\s*\{/i);
        if (scenarioMatch) {
            const indent = scenarioMatch[1].length;
            const name = scenarioMatch[2];
            const symbol: DocumentSymbol = {
                name,
                detail: 'scenario',
                kind: SymbolKind.Function,
                range: makeRange(lineNumber, indent + 1, line.length + 1),
                selectionRange: makeRange(lineNumber, line.indexOf(name) + 1, line.indexOf(name) + 1 + name.length),
                children: [],
            };

            const parentFeature = blockStack.find(b => b.type === 'feature');
            parentFeature?.symbol.children?.push(symbol);
            blockStack.push({ type: 'scenario', startLine: lineNumber, symbol });
            continue;
        }

        const fieldMatch = line.match(/^(\s*)field\s+(\w+)\s*=\s*"([^"]*)"/i);
        if (fieldMatch) {
            const indent = fieldMatch[1].length;
            const name = fieldMatch[2];
            const selector = fieldMatch[3];
            const parentPage = blockStack.find(b => b.type === 'page');
            parentPage?.symbol.children?.push({
                name,
                detail: selector.length > 30 ? selector.substring(0, 27) + '...' : selector,
                kind: SymbolKind.Field,
                range: makeRange(lineNumber, indent + 1, line.length + 1),
                selectionRange: makeRange(lineNumber, line.indexOf(name) + 1, line.indexOf(name) + 1 + name.length),
            });
            continue;
        }

        const hookMatch = line.match(/^(\s*)(before|after)\s+(each|all)\s*\{/i);
        if (hookMatch) {
            const indent = hookMatch[1].length;
            const name = `${hookMatch[2]} ${hookMatch[3]}`;
            const symbol: DocumentSymbol = {
                name,
                detail: 'hook',
                kind: SymbolKind.Event,
                range: makeRange(lineNumber, indent + 1, line.length + 1),
                selectionRange: makeRange(lineNumber, indent + 1, indent + 1 + name.length),
            };

            const parentFeature = blockStack.find(b => b.type === 'feature');
            parentFeature?.symbol.children?.push(symbol);
            blockStack.push({ type: 'hook', startLine: lineNumber, symbol });
            continue;
        }

        const fixtureMatch = line.match(/^(\s*)fixture\s+(\w+)\s*\{/i);
        if (fixtureMatch) {
            const indent = fixtureMatch[1].length;
            const name = fixtureMatch[2];
            blockStack.push({
                type: 'fixture',
                startLine: lineNumber,
                symbol: {
                    name,
                    detail: 'fixture',
                    kind: SymbolKind.Struct,
                    range: makeRange(lineNumber, indent + 1, line.length + 1),
                    selectionRange: makeRange(lineNumber, line.indexOf(name) + 1, line.indexOf(name) + 1 + name.length),
                    children: [],
                },
            });
            continue;
        }

        const useMatch = line.match(/^(\s*)use\s+(\w+)/i);
        if (useMatch) {
            const indent = useMatch[1].length;
            const name = useMatch[2];
            const parentFeature = blockStack.find(b => b.type === 'feature');
            parentFeature?.symbol.children?.push({
                name,
                detail: 'import',
                kind: SymbolKind.Namespace,
                range: makeRange(lineNumber, indent + 1, line.length + 1),
                selectionRange: makeRange(lineNumber, line.indexOf(name) + 1, line.indexOf(name) + 1 + name.length),
            });
            continue;
        }

        const parentPage = blockStack.find(b => b.type === 'page');
        if (parentPage) {
            const actionMatch = line.match(/^(\s*)(\w+)(?:\s+with\s+([\w,\s]+))?\s*\{/i);
            if (actionMatch && !KEYWORDS.has(actionMatch[2].toLowerCase())) {
                const indent = actionMatch[1].length;
                const name = actionMatch[2];
                const params = actionMatch[3];
                const symbol: DocumentSymbol = {
                    name,
                    detail: params ? `with ${params}` : 'action',
                    kind: SymbolKind.Method,
                    range: makeRange(lineNumber, indent + 1, line.length + 1),
                    selectionRange: makeRange(lineNumber, indent + 1, indent + 1 + name.length),
                };
                parentPage.symbol.children?.push(symbol);
                blockStack.push({ type: 'action', startLine: lineNumber, symbol });
            }
            continue;
        }

        if (trimmed === '}') {
            const lastBlock = blockStack.pop();
            if (lastBlock) {
                lastBlock.symbol.range.endLineNumber = lineNumber;
                lastBlock.symbol.range.endColumn = line.length + 1;

                if (['page', 'feature', 'fixture'].includes(lastBlock.type)) {
                    const hasParent = blockStack.some(b => ['page', 'feature', 'fixture'].includes(b.type));
                    if (!hasParent) symbols.push(lastBlock.symbol);
                }
            }
        }
    }

    while (blockStack.length > 0) {
        const block = blockStack.pop();
        if (block && ['page', 'feature', 'fixture'].includes(block.type)) {
            block.symbol.range.endLineNumber = lines.length;
            block.symbol.range.endColumn = (lines[lines.length - 1]?.length || 0) + 1;
            symbols.push(block.symbol);
        }
    }

    return symbols;
}

export function getFlatSymbols(symbols: DocumentSymbol[]): DocumentSymbol[] {
    const flat: DocumentSymbol[] = [];
    function traverse(syms: DocumentSymbol[]): void {
        for (const sym of syms) {
            flat.push(sym);
            if (sym.children) traverse(sym.children);
        }
    }
    traverse(symbols);
    return flat;
}

export function findSymbolAtPosition(symbols: DocumentSymbol[], lineNumber: number, column: number): DocumentSymbol | null {
    const flat = getFlatSymbols(symbols);
    let bestMatch: DocumentSymbol | null = null;

    for (const sym of flat) {
        const inRange =
            lineNumber >= sym.range.startLineNumber &&
            lineNumber <= sym.range.endLineNumber &&
            (lineNumber > sym.range.startLineNumber || column >= sym.range.startColumn) &&
            (lineNumber < sym.range.endLineNumber || column <= sym.range.endColumn);

        if (inRange) {
            const rangeSize = sym.range.endLineNumber - sym.range.startLineNumber;
            const bestRangeSize = bestMatch ? bestMatch.range.endLineNumber - bestMatch.range.startLineNumber : Infinity;
            if (rangeSize < bestRangeSize) bestMatch = sym;
        }
    }

    return bestMatch;
}
