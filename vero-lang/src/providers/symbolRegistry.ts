export interface VeroPageDefinition {
    name: string;
    fields: string[];
    actions: string[];
    filePath?: string;
    line?: number;
}

export interface VeroFieldDefinition {
    name: string;
    selector: string;
    page: string;
    line: number;
    filePath?: string;
}

export interface VeroActionDefinition {
    name: string;
    parameters: string[];
    page: string;
    line: number;
    endLine?: number;
    filePath?: string;
}

export interface VeroVariableDefinition {
    name: string;
    type: 'load' | 'data' | 'list' | 'number' | 'loop';
    source?: string;
    line: number;
    filePath?: string;
}

export interface VeroFeatureDefinition {
    name: string;
    scenarios: string[];
    uses: string[];
    line: number;
    endLine?: number;
    filePath?: string;
}

export interface SymbolLocation {
    filePath: string;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
}

export interface SymbolReference {
    symbolName: string;
    symbolType: 'page' | 'field' | 'action' | 'variable' | 'feature';
    location: SymbolLocation;
    context?: string;
}

class VeroSymbolRegistry {
    private pages = new Map<string, VeroPageDefinition>();
    private fields = new Map<string, VeroFieldDefinition[]>();
    private actions = new Map<string, VeroActionDefinition[]>();
    private variables = new Map<string, VeroVariableDefinition[]>();
    private features = new Map<string, VeroFeatureDefinition>();
    private references = new Map<string, SymbolReference[]>();
    private fileIndex = new Map<string, Set<string>>();

    clear(): void {
        this.pages.clear();
        this.fields.clear();
        this.actions.clear();
        this.variables.clear();
        this.features.clear();
        this.references.clear();
        this.fileIndex.clear();
    }

    clearFile(filePath: string): void {
        const symbols = this.fileIndex.get(filePath);
        if (!symbols) return;

        for (const sym of symbols) {
            this.pages.delete(sym);
            this.fields.delete(sym);
            this.actions.delete(sym);
            this.features.delete(sym);
        }
        this.fileIndex.delete(filePath);
    }

    registerPage(page: VeroPageDefinition): void {
        this.pages.set(page.name, page);
        if (page.filePath) this.addToFileIndex(page.filePath, page.name);
    }

    registerField(field: VeroFieldDefinition): void {
        const key = `${field.page}.${field.name}`;
        const existing = this.fields.get(key) || [];
        existing.push(field);
        this.fields.set(key, existing);
        if (field.filePath) this.addToFileIndex(field.filePath, key);
    }

    registerAction(action: VeroActionDefinition): void {
        const key = `${action.page}.${action.name}`;
        const existing = this.actions.get(key) || [];
        existing.push(action);
        this.actions.set(key, existing);
        if (action.filePath) this.addToFileIndex(action.filePath, key);
    }

    registerFeature(feature: VeroFeatureDefinition): void {
        this.features.set(feature.name, feature);
        if (feature.filePath) this.addToFileIndex(feature.filePath, feature.name);
    }

    registerReference(ref: SymbolReference): void {
        const existing = this.references.get(ref.symbolName) || [];
        existing.push(ref);
        this.references.set(ref.symbolName, existing);
    }

    getPage(name: string): VeroPageDefinition | undefined {
        return this.pages.get(name);
    }

    getAllPages(): VeroPageDefinition[] {
        return Array.from(this.pages.values());
    }

    getField(pageName: string, fieldName: string): VeroFieldDefinition | undefined {
        return this.fields.get(`${pageName}.${fieldName}`)?.[0];
    }

    getAction(pageName: string, actionName: string): VeroActionDefinition | undefined {
        return this.actions.get(`${pageName}.${actionName}`)?.[0];
    }

    getFeature(name: string): VeroFeatureDefinition | undefined {
        return this.features.get(name);
    }

    getReferences(symbolName: string): SymbolReference[] {
        return this.references.get(symbolName) || [];
    }

    findDefinition(symbolName: string, symbolType?: string): SymbolLocation | null {
        if (!symbolType || symbolType === 'page') {
            const page = this.pages.get(symbolName);
            if (page?.filePath && page?.line) {
                return { filePath: page.filePath, line: page.line, column: 1 };
            }
        }

        if ((!symbolType || symbolType === 'field') && symbolName.includes('.')) {
            const fields = this.fields.get(symbolName);
            if (fields?.[0]?.filePath) {
                return { filePath: fields[0].filePath, line: fields[0].line, column: 1 };
            }
        }

        if ((!symbolType || symbolType === 'action') && symbolName.includes('.')) {
            const actions = this.actions.get(symbolName);
            if (actions?.[0]?.filePath) {
                return { filePath: actions[0].filePath, line: actions[0].line, column: 1 };
            }
        }

        if (!symbolType || symbolType === 'feature') {
            const feature = this.features.get(symbolName);
            if (feature?.filePath) {
                return { filePath: feature.filePath, line: feature.line, column: 1 };
            }
        }

        return null;
    }

    private addToFileIndex(filePath: string, symbol: string): void {
        const symbols = this.fileIndex.get(filePath) || new Set();
        symbols.add(symbol);
        this.fileIndex.set(filePath, symbols);
    }
}

export const symbolRegistry = new VeroSymbolRegistry();

const PAGE_REGEX = /\bpage\s+(\w+)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gi;
const FIELD_REGEX = /\bfield\s+(\w+)\s*=/gi;
const ACTION_REGEX = /^[ \t]*(\w+)(?:\s+with\s+[\w,\s]+)?\s*\{/gim;
const RESERVED_WORDS = new Set(['field', 'text', 'number', 'flag', 'list']);

export function parseVeroPages(code: string): VeroPageDefinition[] {
    const pages: VeroPageDefinition[] = [];
    let match;

    while ((match = PAGE_REGEX.exec(code)) !== null) {
        const pageName = match[1];
        const pageBody = match[2];
        const fields: string[] = [];
        const actions: string[] = [];

        let fieldMatch;
        while ((fieldMatch = FIELD_REGEX.exec(pageBody)) !== null) {
            fields.push(fieldMatch[1]);
        }

        let actionMatch;
        while ((actionMatch = ACTION_REGEX.exec(pageBody)) !== null) {
            const actionName = actionMatch[1].toLowerCase();
            if (!RESERVED_WORDS.has(actionName)) {
                actions.push(actionMatch[1]);
            }
        }

        pages.push({ name: pageName, fields, actions });
    }

    PAGE_REGEX.lastIndex = 0;
    return pages;
}

const KEYWORDS = new Set(['page', 'feature', 'scenario', 'field', 'if', 'for', 'repeat', 'before', 'after']);

export function indexFile(filePath: string, code: string): void {
    const lines = code.split('\n');
    symbolRegistry.clearFile(filePath);

    let currentPage: string | null = null;
    let currentPageLine = 0;
    const pageFields: string[] = [];
    const pageActions: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        const pageMatch = line.match(/^\s*page\s+(\w+)\s*\{/i);
        if (pageMatch) {
            if (currentPage) {
                symbolRegistry.registerPage({
                    name: currentPage,
                    fields: [...pageFields],
                    actions: [...pageActions],
                    filePath,
                    line: currentPageLine,
                });
            }
            currentPage = pageMatch[1];
            currentPageLine = lineNumber;
            pageFields.length = 0;
            pageActions.length = 0;
            continue;
        }

        if (currentPage) {
            const fieldMatch = line.match(/^\s*field\s+(\w+)\s*=\s*"([^"]*)"/i);
            if (fieldMatch) {
                pageFields.push(fieldMatch[1]);
                symbolRegistry.registerField({
                    name: fieldMatch[1],
                    selector: fieldMatch[2],
                    page: currentPage,
                    line: lineNumber,
                    filePath,
                });
                continue;
            }

            const actionMatch = line.match(/^\s*(\w+)(?:\s+with\s+([\w,\s]+))?\s*\{/i);
            if (actionMatch && !KEYWORDS.has(actionMatch[1].toLowerCase())) {
                pageActions.push(actionMatch[1]);
                symbolRegistry.registerAction({
                    name: actionMatch[1],
                    parameters: actionMatch[2]?.split(',').map(p => p.trim()) || [],
                    page: currentPage,
                    line: lineNumber,
                    filePath,
                });
            }
        }

        if (currentPage && line.trim() === '}') {
            symbolRegistry.registerPage({
                name: currentPage,
                fields: [...pageFields],
                actions: [...pageActions],
                filePath,
                line: currentPageLine,
            });
            currentPage = null;
            pageFields.length = 0;
            pageActions.length = 0;
        }

        const featureMatch = line.match(/^\s*feature\s+(?:"([^"]+)"|(\w+))\s*\{/i);
        if (featureMatch) {
            symbolRegistry.registerFeature({
                name: featureMatch[1] || featureMatch[2],
                scenarios: [],
                uses: [],
                line: lineNumber,
                filePath,
            });
        }

        const useMatch = line.match(/^\s*use\s+(\w+)/i);
        if (useMatch) {
            symbolRegistry.registerReference({
                symbolName: useMatch[1],
                symbolType: 'page',
                location: { filePath, line: lineNumber, column: line.indexOf(useMatch[1]) + 1 },
                context: 'use',
            });
        }

        const doMatch = line.match(/\bdo\s+(\w+)\.(\w+)/i);
        if (doMatch) {
            symbolRegistry.registerReference({
                symbolName: `${doMatch[1]}.${doMatch[2]}`,
                symbolType: 'action',
                location: { filePath, line: lineNumber, column: line.indexOf(doMatch[1]) + 1 },
                context: 'do',
            });
        }

        if (!/^\s*(page|feature)/i.test(line)) {
            const memberRefRegex = /\b([A-Z]\w*)\.(\w+)\b/g;
            let memberMatch;
            while ((memberMatch = memberRefRegex.exec(line)) !== null) {
                symbolRegistry.registerReference({
                    symbolName: `${memberMatch[1]}.${memberMatch[2]}`,
                    symbolType: 'field',
                    location: { filePath, line: lineNumber, column: memberMatch.index + 1 },
                    context: 'reference',
                });
            }
        }
    }

    if (currentPage) {
        symbolRegistry.registerPage({
            name: currentPage,
            fields: [...pageFields],
            actions: [...pageActions],
            filePath,
            line: currentPageLine,
        });
    }
}
