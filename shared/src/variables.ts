/**
 * Variable System Types
 * 
 * Implements Postman-style variable scopes with precedence:
 * Runtime > Data > Flow > Workflow > Environment > Global
 */

// ============================================
// VARIABLE SCOPES
// ============================================

export enum VariableScope {
    GLOBAL = 'global',           // User-wide, lowest precedence
    ENVIRONMENT = 'environment', // Switchable sets (dev/staging/prod)
    WORKFLOW = 'workflow',       // Shared across flows in workflow
    FLOW = 'flow',               // Specific to single flow
    DATA = 'data',               // From CSV/JSON iteration
    RUNTIME = 'runtime'          // Extracted during execution, highest precedence
}

export const SCOPE_PRECEDENCE: VariableScope[] = [
    VariableScope.RUNTIME,
    VariableScope.DATA,
    VariableScope.FLOW,
    VariableScope.WORKFLOW,
    VariableScope.ENVIRONMENT,
    VariableScope.GLOBAL
];

// ============================================
// VARIABLE TYPES
// ============================================

export type VariableType = 'string' | 'number' | 'boolean' | 'json';

export interface Variable {
    id: string;
    key: string;
    value: any;
    type: VariableType;
    scope: VariableScope;
    sensitive?: boolean;      // Mask value in UI
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface VariableCreate {
    key: string;
    value: any;
    type?: VariableType;
    sensitive?: boolean;
    description?: string;
}

export interface VariableUpdate {
    key?: string;
    value?: any;
    type?: VariableType;
    sensitive?: boolean;
    description?: string;
}

// ============================================
// ENVIRONMENT
// ============================================

export interface Environment {
    id: string;
    userId: string;
    name: string;
    description?: string;
    isActive: boolean;
    variables: Variable[];
    createdAt: Date;
    updatedAt: Date;
}

export interface EnvironmentCreate {
    name: string;
    description?: string;
    variables?: VariableCreate[];
}

export interface EnvironmentUpdate {
    name?: string;
    description?: string;
    isActive?: boolean;
}

// ============================================
// DATA SOURCE
// ============================================

export type DataSourceType = 'csv' | 'json' | 'excel' | 'inline';

// Named differently from execution.ts DataSourceConfig to avoid conflict
// This version has additional fields specific to variable iteration
export interface VariableDataSourceConfig {
    type: DataSourceType;
    path?: string;                      // File path for csv/json/excel
    data?: Record<string, any>[];       // Inline data array
    iterateAs: string;                  // Variable name for current row
    sheet?: string;                     // Sheet name for Excel
    hasHeaders?: boolean;               // For CSV, default true
    encoding?: string;                  // File encoding, default 'utf-8'
}

// ============================================
// EXTRACTION (RUNTIME VARIABLES)
// ============================================

export type ExtractionAttribute =
    | 'textContent'
    | 'innerText'
    | 'value'
    | 'href'
    | 'src'
    | 'id'
    | 'className'
    | string;  // Custom attribute

export type ExtractionTransform =
    | 'none'
    | 'trim'
    | 'number'
    | 'boolean'
    | 'json'
    | 'regex'
    | 'uppercase'
    | 'lowercase';

export interface ExtractionConfig {
    selector: string;
    locatorStrategy?: string;
    attribute: ExtractionAttribute;
    storeAs: string;                    // Variable name in RUNTIME scope
    transform?: ExtractionTransform;
    regex?: string;                     // Pattern for regex transform
    regexGroup?: number;                // Capture group index
    defaultValue?: any;                 // Fallback if extraction fails
}

// ============================================
// FLOW VARIABLE CONFIGURATION
// ============================================

export interface FlowVariableConfig {
    variables?: Record<string, any>;    // Flow-level inline variables
    dataSource?: VariableDataSourceConfig;  // External data source for iteration
    env?: Record<string, string>;       // Environment variable mappings
}

// ============================================
// VARIABLE REFERENCE (Parsed from {{...}})
// ============================================

export interface VariableReference {
    raw: string;                        // Original: "{{user.email}}"
    path: string;                       // Parsed: "user.email"
    scope?: VariableScope;              // Explicit scope if prefixed
    isExpression?: boolean;             // Contains operators
}

// ============================================
// VARIABLE CONTEXT (Runtime Resolution)
// ============================================

export interface VariableContextState {
    global: Record<string, any>;
    environment: Record<string, any>;
    workflow: Record<string, any>;
    flow: Record<string, any>;
    data: Record<string, any>;
    runtime: Record<string, any>;
}

export interface ResolvedVariable {
    key: string;
    value: any;
    scope: VariableScope;
    type: VariableType;
    sensitive?: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface VariablesResponse {
    global: Variable[];
    environment?: Variable[];
    workflow?: Variable[];
    flow?: Variable[];
}

export interface ResolvedVariablesResponse {
    variables: ResolvedVariable[];
    activeEnvironment?: string;
}

// ============================================
// TEMPLATE SYNTAX CONSTANTS
// ============================================

export const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;
export const VARIABLE_PATTERN_SINGLE = /\{\{([^}]+)\}\}/;
export const ENV_PREFIX = 'env.';
export const GLOBAL_PREFIX = 'global.';
export const EXTRACT_PREFIX = 'extracted.';
