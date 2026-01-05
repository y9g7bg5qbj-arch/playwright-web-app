// Code Generation Types for Visual IDE
// Extends existing execution types with code generation specific types

import {
    FlowNode,
    FlowEdge,
    FlowNodeData,
    DataSourceConfig
} from './execution';
import {
    ConditionConfig as BaseConditionConfig,
    ConditionType as BaseConditionType
} from './controlFlowTypes';
import {
    LocatorStrategy as NewLocatorStrategy,
    LocatorConfig as NewLocatorConfig,
} from './locators';

// Re-export base types for convenience in codegen
export type { FlowNode, FlowEdge, FlowNodeData, DataSourceConfig };

// ============================================
// FLOW STRUCTURE FOR CODE GENERATION
// ============================================

export interface Flow {
    nodes: FlowNode[];
    edges: FlowEdge[];
    name: string;
    description?: string;
    dataSource?: DataSourceConfig;
    variables?: Record<string, any>;
}

// ============================================
// LOCATOR TYPES (for code generation)
// ============================================

// Legacy simple locator strategy (for backward compatibility)
export type LegacyLocatorStrategy =
    | 'css'
    | 'xpath'
    | 'text'
    | 'text-exact'
    | 'role'
    | 'test-id'
    | 'label'
    | 'placeholder'
    | 'alt-text'
    | 'title';

// Legacy simple locator config (for backward compatibility)
export interface LegacyLocatorConfig {
    locatorStrategy: LegacyLocatorStrategy;
    selector: string;
    role?: string;
    name?: string;
    hasText?: string;
    nth?: number;
}

// New comprehensive types from locators.ts
export type LocatorStrategy = NewLocatorStrategy;
export type LocatorConfig = NewLocatorConfig;

// ============================================
// CODE GENERATION OPTIONS
// ============================================

export type ExportMode = 'basic' | 'pom' | 'fixtures' | 'pom-fixtures';

export interface GenerateOptions {
    /** Export mode: basic, pom, fixtures, or pom-fixtures (recommended) */
    mode: ExportMode;
    /** Include descriptive comments in generated code */
    includeComments?: boolean;
    /** Custom test name (defaults to flow name) */
    testName?: string;
    /** Base URL for the application under test */
    baseUrl?: string;
    /** Default timeout in milliseconds */
    timeout?: number;
    /** Number of retries on failure */
    retries?: number;
    /** Browsers to include in projects */
    browsers?: ('chromium' | 'firefox' | 'webkit')[];
    /** Generate playwright.config.ts */
    generateConfig?: boolean;
}

// ============================================
// GENERATED CODE STRUCTURE
// ============================================

export interface GeneratedCode {
    /** Main test file content */
    testFile: string;
    /** Fixtures file content (when mode includes fixtures) */
    fixturesFile?: string;
    /** Playwright config file content */
    configFile?: string;
    /** Page Object class files (pageName -> code) */
    pageObjects?: Record<string, string>;
    /** Data files for data-driven tests */
    dataFiles?: Record<string, string>;
}

// ============================================
// GENERATOR CONTEXT (Internal)
// ============================================

export interface LocatorInfo {
    name: string;
    strategy: LocatorStrategy;
    selector: string;
    pageName: string;
    config: Record<string, any>;
}

export interface PageAction {
    name: string;
    params: { name: string; type: string }[];
    body: string[];
    description?: string;
}

export interface GeneratorContext {
    /** Current indentation level */
    indent: number;
    /** Variables declared in the test */
    variables: Map<string, string>;
    /** Locators used in the test (for POM generation) */
    usedLocators: Map<string, LocatorInfo>;
    /** Current page context name */
    currentPage: string;
    /** Generation options */
    options: GenerateOptions;
    /** Actions grouped by page (for POM generation) */
    pageActions: Map<string, PageAction[]>;
    /** Visited node IDs (to prevent infinite loops) */
    visitedNodes: Set<string>;
}

// ============================================
// NODE GENERATOR INTERFACE
// ============================================

export interface NodeGenerator {
    /** Generate code lines for this node */
    generate(node: FlowNode, context: GeneratorContext): string[];
    /** Collect locator information for POM generation */
    collectLocators?(node: FlowNode, context: GeneratorContext): void;
    /** Check if this node type creates a block (if, for, try, etc.) */
    isBlockStart?: boolean;
    /** Check if this node type ends a block */
    isBlockEnd?: boolean;
}

// ============================================
// VARIABLE OPERATORS (for code generation)
// ============================================

export type VariableOperator =
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'greaterThan'
    | 'lessThan'
    | 'greaterOrEqual'
    | 'lessOrEqual'
    | 'isEmpty'
    | 'isNotEmpty'
    | 'isTrue'
    | 'isFalse';

export type ElementCondition =
    | 'visible'
    | 'hidden'
    | 'enabled'
    | 'disabled'
    | 'checked'
    | 'exists';
