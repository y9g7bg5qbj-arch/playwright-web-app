// ============================================
// LOCATOR TYPES - Dynamic Locator System
// ============================================

// Base locator strategy types
export interface RoleLocator {
    type: 'role';
    role: string;
    name?: string;
    exact?: boolean;
    checked?: boolean;
    disabled?: boolean;
    expanded?: boolean;
    includeHidden?: boolean;
    level?: number;
    pressed?: boolean;
    selected?: boolean;
}

export interface TextLocator {
    type: 'text';
    text: string;
    exact?: boolean;
}

export interface TestIdLocator {
    type: 'testId';
    testId: string;
}

export interface LabelLocator {
    type: 'label';
    label: string;
    exact?: boolean;
}

export interface PlaceholderLocator {
    type: 'placeholder';
    placeholder: string;
    exact?: boolean;
}

export interface AltTextLocator {
    type: 'altText';
    altText: string;
    exact?: boolean;
}

export interface TitleLocator {
    type: 'title';
    title: string;
    exact?: boolean;
}

export interface CssLocator {
    type: 'css';
    selector: string;
}

export interface XPathLocator {
    type: 'xpath';
    xpath: string;
}

export interface IdLocator {
    type: 'id';
    id: string;
}

// Composite locator types
export interface ChainLocator {
    type: 'chain';
    locators: LocatorStrategy[];
}

export interface FilterLocator {
    type: 'filter';
    base: LocatorStrategy;
    hasText?: string;
    hasNotText?: string;
    has?: LocatorStrategy;
    hasNot?: LocatorStrategy;
}

export interface NthLocator {
    type: 'nth';
    base: LocatorStrategy;
    index: number;
}

export interface FirstLocator {
    type: 'first';
    base: LocatorStrategy;
}

export interface LastLocator {
    type: 'last';
    base: LocatorStrategy;
}

// Reference locator - points to Object Repository
export interface RefLocator {
    type: 'ref';
    page: string;      // Page name in repository
    element: string;   // Element name in the page
}

// Union of all locator strategy types
export type LocatorStrategy =
    | RoleLocator
    | TextLocator
    | TestIdLocator
    | LabelLocator
    | PlaceholderLocator
    | AltTextLocator
    | TitleLocator
    | CssLocator
    | XPathLocator
    | IdLocator
    | ChainLocator
    | FilterLocator
    | NthLocator
    | FirstLocator
    | LastLocator
    | RefLocator;

// Locator configuration with fallback support
export interface LocatorConfig {
    strategy: LocatorStrategy;
    fallback?: LocatorConfig;
    timeout?: number;
    description?: string;
}

// ============================================
// PAGE OBJECT MODEL TYPES
// ============================================

// Individual element within a page
export interface PageElement {
    id: string;
    name: string;              // Human-readable name (e.g., "submitButton")
    description?: string;      // Optional description
    locator: LocatorConfig;    // The actual locator configuration
    tags?: string[];           // For filtering/search (e.g., ["form", "button"])
    createdAt?: Date;
    updatedAt?: Date;
}

// Page object representing a page in the application
export interface PageObject {
    id: string;
    repositoryId?: string;     // Parent repository ID
    name: string;              // e.g., "Login Page", "Product Catalog"
    description?: string;
    urlPattern?: string;       // Regex to match URLs for this page
    baseUrl?: string;          // Optional base URL
    elements: PageElement[];   // All elements on this page
    order?: number;            // Display order
    createdAt?: Date;
    updatedAt?: Date;
}

// Object Repository - container for all page objects in a workflow
export interface ObjectRepository {
    id: string;
    workflowId: string;        // Repository belongs to a workflow
    name: string;              // e.g., "Main Repository"
    description?: string;
    pages: PageObject[];       // All pages in this repository
    globalElements?: PageElement[];  // Elements shared across all pages
    createdAt?: Date;
    updatedAt?: Date;
}

// ============================================
// REPOSITORY CRUD TYPES
// ============================================

export interface ObjectRepositoryCreate {
    workflowId: string;
    name?: string;
    description?: string;
}

export interface ObjectRepositoryUpdate {
    name?: string;
    description?: string;
    globalElements?: PageElement[];
}

export interface PageObjectCreate {
    repositoryId: string;
    name: string;
    description?: string;
    urlPattern?: string;
    baseUrl?: string;
    elements?: PageElement[];
    order?: number;
}

export interface PageObjectUpdate {
    name?: string;
    description?: string;
    urlPattern?: string;
    baseUrl?: string;
    elements?: PageElement[];
    order?: number;
}

export interface PageElementCreate {
    name: string;
    description?: string;
    locator: LocatorConfig;
    tags?: string[];
}

export interface PageElementUpdate {
    name?: string;
    description?: string;
    locator?: LocatorConfig;
    tags?: string[];
}

// ============================================
// LOCATOR RESOLUTION TYPES
// ============================================

// Variables for parameterized locators
export type LocatorVariables = Record<string, string | number | boolean>;

// Result of locator resolution
export interface LocatorResolutionResult {
    success: boolean;
    usedFallback: boolean;
    fallbackLevel?: number;    // 0 = primary, 1 = first fallback, etc.
    resolvedSelector?: string; // The final selector used
    error?: string;
}

// Ranked locator for smart suggestions
export interface RankedLocator {
    strategy: LocatorStrategy;
    priority: number;          // 1 = highest priority
    confidence: number;        // 0-100 confidence score
    selector: string;          // Human-readable representation
    description?: string;
}

// ============================================
// CODE GENERATION TYPES
// ============================================

export interface CodeGenerationOptions {
    language: 'typescript' | 'javascript' | 'python';
    style: 'playwright-test' | 'standalone';
    includeComments: boolean;
    variablePrefix?: string;
}

export interface GeneratedPageObjectClass {
    className: string;
    fileName: string;
    code: string;
    imports: string[];
}

export interface GeneratedFixtures {
    fileName: string;
    code: string;
    pageObjects: string[];     // Names of page object classes included
}
