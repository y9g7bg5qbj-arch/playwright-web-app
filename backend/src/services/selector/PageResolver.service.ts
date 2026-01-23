/**
 * PageResolver Service
 *
 * Integrates the AI Recorder with the PageObjectRegistry to:
 * 1. Find or create PAGE objects based on URL
 * 2. Find or create FIELD definitions based on extracted selectors
 * 3. Prevent duplicate PAGE/FIELD creation
 *
 * Usage:
 *   const resolver = new PageResolver(projectPath);
 *   await resolver.initialize();
 *
 *   // For each recorded action:
 *   const ref = await resolver.resolveField(url, selectors, actionType);
 *   // ref = { pageName: "LoginPage", fieldName: "loginButton", isNew: false }
 *
 *   // At end of recording:
 *   await resolver.persistAll();
 */

import {
  PageObjectRegistry,
  PageFieldRef,
  ElementInfo,
  DuplicateCheckResult,
} from '../pageObjectRegistry';
import { ExtractedSelectors } from './selectorExtractor';
import { logger } from '../../utils/logger';

export interface ResolvedFieldRef {
  pageName: string;
  fieldName: string;
  selector: string;
  selectorType: string;
  isNew: boolean;
  matchInfo?: {
    matchType: 'exact' | 'fuzzy' | 'semantic' | 'none';
    similarity: number;
    existingSelector?: string;
  };
}

export interface PageResolution {
  pageName: string;
  isNew: boolean;
  existingFields: number;
}

export class PageResolver {
  private registry: PageObjectRegistry;
  private initialized = false;
  private modifiedPages: Set<string> = new Set();

  constructor(projectPath: string) {
    this.registry = new PageObjectRegistry(projectPath);
  }

  /**
   * Initialize the resolver by loading existing pages
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.registry.loadFromDisk();
    this.initialized = true;

    logger.info('[PageResolver] Initialized with existing pages');
  }

  /**
   * Ensure initialized before any operation
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('PageResolver not initialized. Call initialize() first.');
    }
  }

  /**
   * Resolve the PAGE for a given URL
   * Returns existing page if found, creates new if not
   */
  resolvePage(url: string): PageResolution {
    this.ensureInitialized();

    const page = this.registry.getOrCreatePage(url);
    const isNew = page.fields.size === 0 && !page.rawContent.includes('field ');

    return {
      pageName: page.name,
      isNew,
      existingFields: page.fields.size,
    };
  }

  /**
   * Resolve a FIELD for the given selectors
   * Checks for existing matches, creates new field if needed
   */
  resolveField(
    url: string,
    selectors: ExtractedSelectors,
    actionType: string
  ): ResolvedFieldRef {
    this.ensureInitialized();

    // First resolve the page
    const pageResolution = this.resolvePage(url);
    const pageName = pageResolution.pageName;

    // Build selector string with type prefix
    const selectorString = this.buildSelectorString(selectors);
    const selectorType = this.getSelectorType(selectors);

    // Convert ExtractedSelectors to ElementInfo for registry lookup
    const elementInfo = this.toElementInfo(selectors);

    // Check for existing field that matches
    const duplicateCheck = this.registry.checkForDuplicate(
      elementInfo,
      selectorString,
      pageName
    );

    if (duplicateCheck.isDuplicate && duplicateCheck.existingRef) {
      // Found existing field - reuse it
      logger.info(
        `[PageResolver] Reusing existing field: ${duplicateCheck.existingRef.pageName}.${duplicateCheck.existingRef.fieldName}`
      );

      return {
        pageName: duplicateCheck.existingRef.pageName,
        fieldName: duplicateCheck.existingRef.fieldName,
        selector: duplicateCheck.existingRef.selector,
        selectorType,
        isNew: false,
        matchInfo: {
          matchType: duplicateCheck.matchType,
          similarity: duplicateCheck.similarity,
          existingSelector: duplicateCheck.existingRef.selector,
        },
      };
    }

    // Need to create new field
    const fieldName = this.generateFieldName(selectors, actionType);
    const newRef = this.registry.addField(pageName, fieldName, selectorString);

    // Track that this page was modified
    this.modifiedPages.add(pageName);

    logger.info(
      `[PageResolver] Created new field: ${pageName}.${newRef.fieldName}`
    );

    return {
      pageName: newRef.pageName,
      fieldName: newRef.fieldName,
      selector: selectorString,
      selectorType,
      isNew: true,
    };
  }

  /**
   * Build a Vero selector string from ExtractedSelectors
   */
  private buildSelectorString(selectors: ExtractedSelectors): string {
    const type = selectors.recommendedType;
    const value = selectors.recommended;

    if (!value) {
      return 'text "unknown"';
    }

    const escapedValue = this.escapeString(value);

    switch (type) {
      case 'testId':
        return `testid "${escapedValue}"`;
      case 'role':
        const roleType = selectors.role || 'element';
        return `role "${roleType}" name "${escapedValue}"`;
      case 'label':
        return `label "${escapedValue}"`;
      case 'placeholder':
        return `placeholder "${escapedValue}"`;
      case 'text':
        return `text "${escapedValue}"`;
      case 'alt':
        return `alt "${escapedValue}"`;
      case 'title':
        return `title "${escapedValue}"`;
      case 'css':
        return `css "${escapedValue}"`;
      default:
        // Determine type from available selectors
        if (selectors.testId) return `testid "${this.escapeString(selectors.testId)}"`;
        if (selectors.role) {
          const name = selectors.roleWithName?.match(/name="([^"]+)"/)?.[1] || value;
          return `role "${selectors.role}" name "${this.escapeString(name)}"`;
        }
        if (selectors.label) return `label "${this.escapeString(selectors.label)}"`;
        if (selectors.placeholder) return `placeholder "${this.escapeString(selectors.placeholder)}"`;
        if (selectors.text) return `text "${this.escapeString(selectors.text)}"`;
        return `text "${escapedValue}"`;
    }
  }

  /**
   * Get the selector type string
   */
  private getSelectorType(selectors: ExtractedSelectors): string {
    const type = selectors.recommendedType;

    switch (type) {
      case 'testId':
        return 'testid';
      case 'role':
        return 'role';
      case 'label':
        return 'label';
      case 'placeholder':
        return 'placeholder';
      case 'text':
        return 'text';
      case 'alt':
        return 'alt';
      case 'title':
        return 'title';
      case 'css':
        return 'css';
      default:
        if (selectors.testId) return 'testid';
        if (selectors.role) return 'role';
        if (selectors.label) return 'label';
        if (selectors.placeholder) return 'placeholder';
        if (selectors.text) return 'text';
        return 'text';
    }
  }

  /**
   * Convert ExtractedSelectors to ElementInfo for registry lookup
   */
  private toElementInfo(selectors: ExtractedSelectors): ElementInfo {
    return {
      tagName: selectors.tagName || 'element',
      role: selectors.role || undefined,
      testId: selectors.testId || undefined,
      ariaLabel: selectors.label || undefined,
      placeholder: selectors.placeholder || undefined,
      text: selectors.text || undefined,
    };
  }

  /**
   * Generate a field name from selectors and action type
   */
  private generateFieldName(selectors: ExtractedSelectors, actionType: string): string {
    const tagName = selectors.tagName || 'element';
    const text = selectors.text?.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    const label = selectors.label?.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    const placeholder = selectors.placeholder?.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    const testId = selectors.testId?.replace(/[^a-zA-Z0-9]/g, '');

    let baseName = '';

    // Priority: testId > label > text (for buttons/links) > placeholder
    if (testId) {
      baseName = this.toCamelCase(testId);
    } else if (label) {
      baseName = this.toCamelCase(label);
    } else if (text && (tagName === 'button' || tagName === 'a')) {
      baseName = this.toCamelCase(text) + (tagName === 'button' ? 'Button' : 'Link');
    } else if (text && tagName === 'button') {
      baseName = this.toCamelCase(text) + 'Button';
    } else if (text && tagName === 'a') {
      baseName = this.toCamelCase(text) + 'Link';
    } else if (placeholder) {
      baseName = this.toCamelCase(placeholder) + 'Input';
    } else if (text) {
      baseName = this.toCamelCase(text.substring(0, 30));
    } else {
      // Fallback based on action type
      switch (actionType) {
        case 'click':
          baseName = tagName === 'button' ? 'button' : tagName === 'a' ? 'link' : 'element';
          break;
        case 'fill':
          baseName = 'input';
          break;
        default:
          baseName = 'element';
      }
    }

    return baseName || 'element';
  }

  /**
   * Convert string to camelCase
   */
  private toCamelCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map((word, i) =>
        i === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('');
  }

  /**
   * Escape string for Vero syntax
   */
  private escapeString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  /**
   * Persist all modified pages to disk
   */
  async persistAll(): Promise<string[]> {
    this.ensureInitialized();

    const persistedFiles: string[] = [];

    for (const pageName of this.modifiedPages) {
      try {
        const filePath = await this.registry.persist(pageName);
        persistedFiles.push(filePath);
        logger.info(`[PageResolver] Persisted: ${filePath}`);
      } catch (error) {
        logger.error(`[PageResolver] Failed to persist ${pageName}:`, error);
      }
    }

    this.modifiedPages.clear();
    return persistedFiles;
  }

  /**
   * Get all pages in the registry
   */
  getPages(): string[] {
    this.ensureInitialized();
    return this.registry.getPageNames();
  }

  /**
   * Get the fields for a specific page
   */
  getPageFields(pageName: string): Map<string, { name: string; selector: string }> | null {
    this.ensureInitialized();
    return this.registry.getPage(pageName)?.fields || null;
  }

  /**
   * Check if a specific page exists
   */
  hasPage(pageName: string): boolean {
    this.ensureInitialized();
    return this.registry.hasPage(pageName);
  }

  /**
   * Get page content for preview/display
   */
  getPageContent(pageName: string): string | null {
    this.ensureInitialized();
    return this.registry.getPageContent(pageName);
  }
}

export default PageResolver;
