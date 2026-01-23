export const FoldingRangeKind = { Comment: 1, Imports: 2, Region: 3 } as const;

export interface FoldingRange {
    start: number;
    end: number;
    kind?: number;
}

const BLOCK_PATTERNS = [
    /^\s*page\s+\w+\s*\{/i,
    /^\s*feature\s+("[^"]+"|(\w+))\s*\{/i,
    /^\s*scenario\s+"[^"]+"\s*\{/i,
    /^\s*fixture\s+\w+\s*\{/i,
    /^\s*(before|after)\s+(each|all)\s*\{/i,
    /^\s*\w+\s+with\s+[\w,\s]+\s*\{/i,
    /^\s*\w+\s*\{/i,
];

export function provideFoldingRanges(code: string): FoldingRange[] {
    const ranges: FoldingRange[] = [];
    const lines = code.split('\n');
    const blockStack: Array<{ startLine: number; type: string }> = [];

    let commentStart: number | null = null;
    let useStart: number | null = null;
    let lastUseLine: number | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        const trimmed = line.trim();

        if (trimmed.startsWith('#')) {
            if (commentStart === null) commentStart = lineNumber;
        } else if (commentStart !== null) {
            if (lineNumber - 1 > commentStart) {
                ranges.push({ start: commentStart, end: lineNumber - 1, kind: FoldingRangeKind.Comment });
            }
            commentStart = null;
        }

        if (/^\s*use\s+\w+/i.test(trimmed)) {
            if (useStart === null) useStart = lineNumber;
            lastUseLine = lineNumber;
        } else if (useStart !== null && trimmed !== '' && !trimmed.startsWith('#')) {
            if (lastUseLine && lastUseLine > useStart) {
                ranges.push({ start: useStart, end: lastUseLine, kind: FoldingRangeKind.Imports });
            }
            useStart = null;
            lastUseLine = null;
        }

        if (!trimmed || trimmed.startsWith('#')) continue;

        for (const pattern of BLOCK_PATTERNS) {
            if (pattern.test(trimmed)) {
                blockStack.push({ startLine: lineNumber, type: 'block' });
                break;
            }
        }

        if (trimmed === '}' || trimmed.endsWith('}')) {
            const lastBlock = blockStack.pop();
            if (lastBlock && lineNumber > lastBlock.startLine) {
                ranges.push({ start: lastBlock.startLine, end: lineNumber, kind: FoldingRangeKind.Region });
            }
        }
    }

    if (commentStart !== null && lines.length > commentStart) {
        ranges.push({ start: commentStart, end: lines.length, kind: FoldingRangeKind.Comment });
    }

    if (useStart !== null && lastUseLine && lastUseLine > useStart) {
        ranges.push({ start: useStart, end: lastUseLine, kind: FoldingRangeKind.Imports });
    }

    ranges.sort((a, b) => a.start - b.start);
    return ranges;
}

export function getBlockTypeAtLine(code: string, lineNumber: number): string | null {
    const lines = code.split('\n');
    if (lineNumber < 1 || lineNumber > lines.length) return null;

    const line = lines[lineNumber - 1].trim();
    if (/^page\s+/i.test(line)) return 'page';
    if (/^feature\s+/i.test(line)) return 'feature';
    if (/^scenario\s+/i.test(line)) return 'scenario';
    if (/^fixture\s+/i.test(line)) return 'fixture';
    if (/^(before|after)\s+/i.test(line)) return 'hook';
    if (/^if\s+/i.test(line)) return 'if';
    if (/^for\s+each/i.test(line)) return 'foreach';
    if (/^repeat\s+/i.test(line)) return 'repeat';
    return null;
}
