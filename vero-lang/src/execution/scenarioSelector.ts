import { type FeatureNode, type ProgramNode, type ScenarioNode } from '../parser/ast.js';

export interface ScenarioSelectionOptions {
    scenarioNames?: string[];
    namePatterns?: string[];
    tagExpression?: string;
}

export interface ScenarioSelectionDiagnostics {
    totalScenarios: number;
    selectedScenarios: number;
    selectedFeatures: number;
    hasFilters: boolean;
    filters: {
        scenarioNames: string[];
        namePatterns: string[];
        tagExpression?: string;
    };
}

export interface ScenarioSelectionResult {
    program: ProgramNode;
    diagnostics: ScenarioSelectionDiagnostics;
}

export class ScenarioSelectionError extends Error {
    readonly code = 'VERO-SELECTION';
}

type TagExpressionNode =
    | { type: 'tag'; value: string }
    | { type: 'not'; operand: TagExpressionNode }
    | { type: 'and'; left: TagExpressionNode; right: TagExpressionNode }
    | { type: 'or'; left: TagExpressionNode; right: TagExpressionNode };

interface NormalizedSelection {
    scenarioNamesExact: Set<string>;
    scenarioNamesComparable: Set<string>;
    nameRegexPatterns: RegExp[];
    tagExpressionAst?: TagExpressionNode;
    normalizedTagExpression?: string;
    hasFilters: boolean;
}

interface TagToken {
    type: 'LPAREN' | 'RPAREN' | 'AND' | 'OR' | 'NOT' | 'TAG' | 'EOF';
    value: string;
    index: number;
}

class TagExpressionParser {
    private readonly tokens: TagToken[];
    private index = 0;

    constructor(expression: string) {
        this.tokens = tokenizeTagExpression(expression);
    }

    parse(): TagExpressionNode {
        const result = this.parseOr();
        this.consume('EOF', 'Unexpected trailing content in tag expression');
        return result;
    }

    private parseOr(): TagExpressionNode {
        let left = this.parseAnd();
        while (this.match('OR')) {
            const right = this.parseAnd();
            left = { type: 'or', left, right };
        }
        return left;
    }

    private parseAnd(): TagExpressionNode {
        let left = this.parseUnary();
        while (this.match('AND')) {
            const right = this.parseUnary();
            left = { type: 'and', left, right };
        }
        return left;
    }

    private parseUnary(): TagExpressionNode {
        if (this.match('NOT')) {
            return { type: 'not', operand: this.parseUnary() };
        }
        return this.parsePrimary();
    }

    private parsePrimary(): TagExpressionNode {
        if (this.match('LPAREN')) {
            const expr = this.parseOr();
            this.consume('RPAREN', "Expected ')' to close tag expression group");
            return expr;
        }

        const token = this.peek();
        if (token.type === 'TAG') {
            this.advance();
            return { type: 'tag', value: normalizeTag(token.value) };
        }

        throw new ScenarioSelectionError(
            `Invalid tag expression near index ${token.index}: expected a tag or '('`
        );
    }

    private match(type: TagToken['type']): boolean {
        if (this.peek().type !== type) {
            return false;
        }
        this.advance();
        return true;
    }

    private consume(type: TagToken['type'], message: string): TagToken {
        const token = this.peek();
        if (token.type !== type) {
            throw new ScenarioSelectionError(`${message} at index ${token.index}`);
        }
        return this.advance();
    }

    private peek(): TagToken {
        return this.tokens[this.index] || this.tokens[this.tokens.length - 1];
    }

    private advance(): TagToken {
        const token = this.peek();
        this.index += 1;
        return token;
    }
}

export function applyScenarioSelection(program: ProgramNode, options?: ScenarioSelectionOptions): ScenarioSelectionResult {
    const totalScenarios = countScenarios(program.features);
    const normalized = normalizeSelection(options);

    if (!normalized.hasFilters) {
        return {
            program,
            diagnostics: {
                totalScenarios,
                selectedScenarios: totalScenarios,
                selectedFeatures: program.features.length,
                hasFilters: false,
                filters: {
                    scenarioNames: [],
                    namePatterns: [],
                    tagExpression: undefined,
                },
            },
        };
    }

    const selectedFeatures: FeatureNode[] = [];
    let selectedScenarios = 0;

    for (const feature of program.features) {
        const matchingScenarios = feature.scenarios.filter((scenario) =>
            scenarioMatchesSelection(scenario, normalized)
        );

        if (matchingScenarios.length === 0) {
            continue;
        }

        selectedFeatures.push({
            ...feature,
            scenarios: matchingScenarios,
        });
        selectedScenarios += matchingScenarios.length;
    }

    if (selectedScenarios === 0) {
        const filtersSummary = summarizeFilters(options);
        throw new ScenarioSelectionError(
            `No scenarios matched the provided selection${filtersSummary ? ` (${filtersSummary})` : ''}.`
        );
    }

    const selectedProgram: ProgramNode = {
        ...program,
        features: selectedFeatures,
    };

    return {
        program: selectedProgram,
        diagnostics: {
            totalScenarios,
            selectedScenarios,
            selectedFeatures: selectedFeatures.length,
            hasFilters: true,
            filters: {
                scenarioNames: [...normalized.scenarioNamesExact],
                namePatterns: normalized.nameRegexPatterns.map((pattern) => pattern.source),
                tagExpression: normalized.normalizedTagExpression,
            },
        },
    };
}

function normalizeSelection(options?: ScenarioSelectionOptions): NormalizedSelection {
    const scenarioNames = toStringArray(options?.scenarioNames);
    const namePatterns = toStringArray(options?.namePatterns);
    const tagExpression = normalizeOptionalString(options?.tagExpression);

    const scenarioNamesExact = new Set<string>();
    const scenarioNamesComparable = new Set<string>();
    for (const name of scenarioNames) {
        scenarioNamesExact.add(normalizeScenarioName(name));
        scenarioNamesComparable.add(normalizeComparableName(name));
    }

    const nameRegexPatterns = namePatterns.map((pattern) => {
        try {
            return new RegExp(pattern, 'i');
        } catch (error) {
            throw new ScenarioSelectionError(
                `Invalid name pattern '${pattern}': ${error instanceof Error ? error.message : String(error)}`
            );
        }
    });

    let tagExpressionAst: TagExpressionNode | undefined;
    if (tagExpression) {
        tagExpressionAst = new TagExpressionParser(tagExpression).parse();
    }

    return {
        scenarioNamesExact,
        scenarioNamesComparable,
        nameRegexPatterns,
        tagExpressionAst,
        normalizedTagExpression: tagExpression || undefined,
        hasFilters:
            scenarioNamesExact.size > 0 ||
            nameRegexPatterns.length > 0 ||
            Boolean(tagExpressionAst),
    };
}

function scenarioMatchesSelection(scenario: ScenarioNode, selection: NormalizedSelection): boolean {
    if (selection.scenarioNamesExact.size > 0) {
        const exactName = normalizeScenarioName(scenario.name);
        const comparableName = normalizeComparableName(scenario.name);
        const nameMatched =
            selection.scenarioNamesExact.has(exactName) ||
            selection.scenarioNamesComparable.has(comparableName);

        if (!nameMatched) {
            return false;
        }
    }

    if (selection.nameRegexPatterns.length > 0) {
        const readableName = toReadableScenarioName(scenario.name);
        const matched = selection.nameRegexPatterns.some((pattern) =>
            pattern.test(scenario.name) || pattern.test(readableName)
        );
        if (!matched) {
            return false;
        }
    }

    if (selection.tagExpressionAst) {
        const scenarioTags = new Set<string>(scenario.tags.map(normalizeTag));
        if (!evaluateTagExpression(selection.tagExpressionAst, scenarioTags)) {
            return false;
        }
    }

    return true;
}

function evaluateTagExpression(node: TagExpressionNode, tags: Set<string>): boolean {
    switch (node.type) {
        case 'tag':
            return tags.has(node.value);
        case 'not':
            return !evaluateTagExpression(node.operand, tags);
        case 'and':
            return evaluateTagExpression(node.left, tags) && evaluateTagExpression(node.right, tags);
        case 'or':
            return evaluateTagExpression(node.left, tags) || evaluateTagExpression(node.right, tags);
        default:
            return false;
    }
}

function tokenizeTagExpression(expression: string): TagToken[] {
    const tokens: TagToken[] = [];
    let index = 0;

    while (index < expression.length) {
        const char = expression[index];

        if (/\s/.test(char)) {
            index += 1;
            continue;
        }

        if (char === '(') {
            tokens.push({ type: 'LPAREN', value: char, index });
            index += 1;
            continue;
        }

        if (char === ')') {
            tokens.push({ type: 'RPAREN', value: char, index });
            index += 1;
            continue;
        }

        if (char === '@') {
            const { value, end } = readWord(expression, index + 1);
            if (!value) {
                throw new ScenarioSelectionError(`Invalid tag expression near index ${index}: expected tag after '@'`);
            }
            tokens.push({ type: 'TAG', value: `@${value}`, index });
            index = end;
            continue;
        }

        if (/[A-Za-z0-9_-]/.test(char)) {
            const { value, end } = readWord(expression, index);
            const normalized = value.toLowerCase();
            if (normalized === 'and') {
                tokens.push({ type: 'AND', value, index });
            } else if (normalized === 'or') {
                tokens.push({ type: 'OR', value, index });
            } else if (normalized === 'not') {
                tokens.push({ type: 'NOT', value, index });
            } else {
                tokens.push({ type: 'TAG', value, index });
            }
            index = end;
            continue;
        }

        throw new ScenarioSelectionError(`Invalid tag expression near index ${index}: unexpected character '${char}'`);
    }

    tokens.push({ type: 'EOF', value: '', index: expression.length });
    return tokens;
}

function readWord(input: string, start: number): { value: string; end: number } {
    let index = start;
    while (index < input.length && /[A-Za-z0-9_-]/.test(input[index])) {
        index += 1;
    }
    return {
        value: input.slice(start, index),
        end: index,
    };
}

function countScenarios(features: FeatureNode[]): number {
    return features.reduce((total, feature) => total + feature.scenarios.length, 0);
}

function normalizeTag(tag: string): string {
    return tag.trim().replace(/^@+/, '').toLowerCase();
}

function normalizeScenarioName(name: string): string {
    return name.trim().toLowerCase();
}

function normalizeComparableName(name: string): string {
    return splitScenarioTokens(name).join(' ');
}

function toReadableScenarioName(name: string): string {
    const tokens = splitScenarioTokens(name);
    if (tokens.length === 0) {
        return name;
    }
    return tokens.join(' ');
}

function splitScenarioTokens(name: string): string[] {
    return name
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .replace(/[^A-Za-z0-9]+/g, ' ')
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
}

function normalizeOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}

function summarizeFilters(options?: ScenarioSelectionOptions): string {
    if (!options) {
        return '';
    }
    const parts: string[] = [];
    const scenarioNames = toStringArray(options.scenarioNames);
    const namePatterns = toStringArray(options.namePatterns);
    const tagExpression = normalizeOptionalString(options.tagExpression);

    if (scenarioNames.length > 0) {
        parts.push(`scenarioNames=${scenarioNames.join(',')}`);
    }
    if (namePatterns.length > 0) {
        parts.push(`namePatterns=${namePatterns.join(',')}`);
    }
    if (tagExpression) {
        parts.push(`tagExpression=${tagExpression}`);
    }

    return parts.join('; ');
}
