/**
 * Skill Interface
 *
 * Skills are modular components that handle specific aspects of test execution.
 * Each skill has four phases: detect, prepare, execute, verify.
 */

import type { Page, Locator } from 'playwright';
import type { PageObject, PageFieldRef } from '../../pageObjectRegistry';

/** Natural language step from user input */
export interface NaturalLanguageStep {
  raw: string;
  action: 'click' | 'fill' | 'select' | 'check' | 'uncheck' | 'hover' | 'navigate' | 'wait' | 'assert' | 'unknown';
  target?: string;        // e.g., "email field", "submit button"
  value?: string;         // e.g., "test@example.com" for fill actions
  originalIndex?: number; // Position in the step list
}

/** Selector with priority and type information */
export interface ResolvedSelector {
  selector: string;
  type: 'testId' | 'role' | 'label' | 'placeholder' | 'text' | 'css' | 'xpath';
  priority: number;       // Lower = better (1 = testId, 6 = css)
  confidence: number;     // 0-1 score
  locator?: Locator;      // Playwright locator if already resolved
}

/** Cache entry for selector lookups */
export interface SelectorCacheEntry {
  selector: string;
  selectorType: string;
  elementDescription: string;
  pageUrl: string;
  lastUsed: Date;
  successCount: number;
  failureCount: number;
}

/** Execution context passed to skills and hooks */
export interface ExecutionContext {
  /** The natural language step being executed */
  step: NaturalLanguageStep;

  /** Playwright page instance */
  page: Page;

  /** Current page URL */
  url: string;

  /** Associated page object (if found) */
  pageObject?: PageObject;

  /** Resolved selector for the action */
  resolvedSelector?: ResolvedSelector;

  /** Reference to an existing page field */
  existingFieldRef?: PageFieldRef;

  /** Arbitrary metadata for skills to share data */
  metadata: Record<string, unknown>;

  /** Session-level configuration */
  config: ExecutionConfig;
}

/** Configuration for execution session */
export interface ExecutionConfig {
  /** Whether to use cached selectors */
  useSelectorCache: boolean;

  /** Whether to store new selectors in cache */
  storeSelectorCache: boolean;

  /** Path to project for page object storage */
  projectPath: string;

  /** Timeout for actions in milliseconds */
  actionTimeout: number;

  /** Whether to take screenshots on failure */
  screenshotOnFailure: boolean;

  /** Whether to generate Vero code */
  generateVeroCode: boolean;

  /** Skill-specific configurations */
  skillConfigs?: Record<string, unknown>;
}

/** Result of skill detection phase */
export interface SkillDetection {
  /** Whether this skill should handle the current step */
  applies: boolean;

  /** Confidence that this skill is appropriate (0-1) */
  confidence: number;

  /** Reason for the detection result */
  reason?: string;

  /** Data gathered during detection for use in later phases */
  detectionData?: Record<string, unknown>;
}

/** Result of skill preparation phase */
export interface PrepareResult {
  /** Whether preparation was successful */
  success: boolean;

  /** Updated context with preparation data */
  context?: Partial<ExecutionContext>;

  /** Error message if preparation failed */
  error?: string;

  /** Whether to skip execution (e.g., cached result available) */
  skipExecution?: boolean;
}

/** Result of skill execution phase */
export interface ExecuteResult {
  /** Whether execution was successful */
  success: boolean;

  /** Generated Playwright code for this action */
  playwrightCode?: string;

  /** Generated Vero code for this action */
  veroCode?: string;

  /** Selector that was used */
  usedSelector?: ResolvedSelector;

  /** Error message if execution failed */
  error?: string;

  /** Screenshot path if captured */
  screenshotPath?: string;

  /** Duration of execution in milliseconds */
  durationMs?: number;
}

/** Result of skill verification phase */
export interface VerifyResult {
  /** Whether verification passed */
  verified: boolean;

  /** Confidence in the verification (0-1) */
  confidence: number;

  /** What was verified */
  verifiedCondition?: string;

  /** Error message if verification failed */
  error?: string;

  /** Suggestions for retry if verification failed */
  retrySuggestions?: string[];
}

/**
 * Skill Interface
 *
 * Skills are pluggable components that handle specific scenarios during execution.
 * Examples: SelectorGeneratorSkill, ShadowDOMSkill, IFrameSkill, SalesforceSkill
 */
export interface Skill {
  /** Unique name for this skill */
  name: string;

  /** Execution priority (lower = runs first) */
  priority: number;

  /** Description of what this skill handles */
  description: string;

  /**
   * Phase 1: Detection
   * Determines if this skill should handle the current step
   */
  detect(context: ExecutionContext): Promise<SkillDetection>;

  /**
   * Phase 2: Preparation
   * Gathers information and modifies context before execution
   */
  prepare(context: ExecutionContext): Promise<PrepareResult>;

  /**
   * Phase 3: Execution
   * Performs the actual action
   */
  execute(context: ExecutionContext): Promise<ExecuteResult>;

  /**
   * Phase 4: Verification
   * Confirms the action completed successfully
   */
  verify(context: ExecutionContext): Promise<VerifyResult>;
}

/** Base class for skills with default implementations */
export abstract class BaseSkill implements Skill {
  abstract name: string;
  abstract priority: number;
  abstract description: string;

  abstract detect(context: ExecutionContext): Promise<SkillDetection>;

  async prepare(context: ExecutionContext): Promise<PrepareResult> {
    // Default: no preparation needed
    return { success: true };
  }

  abstract execute(context: ExecutionContext): Promise<ExecuteResult>;

  async verify(context: ExecutionContext): Promise<VerifyResult> {
    // Default: assume success without verification
    return { verified: true, confidence: 0.5 };
  }

  /** Helper to parse action type from natural language */
  protected parseActionType(text: string): NaturalLanguageStep['action'] {
    const lower = text.toLowerCase();

    if (lower.match(/\b(click|tap|press)\b/)) return 'click';
    if (lower.match(/\b(fill|type|enter|input)\b/)) return 'fill';
    if (lower.match(/\b(select|choose|pick)\b/)) return 'select';
    if (lower.match(/\b(check|tick)\b/)) return 'check';
    if (lower.match(/\b(uncheck|untick|clear)\b/)) return 'uncheck';
    if (lower.match(/\b(hover|mouse\s*over)\b/)) return 'hover';
    if (lower.match(/\b(go\s*to|navigate|open|visit)\b/)) return 'navigate';
    if (lower.match(/\b(wait|pause|sleep)\b/)) return 'wait';
    if (lower.match(/\b(assert|verify|check\s*that|ensure|confirm)\b/)) return 'assert';

    return 'unknown';
  }

  /** Helper to extract target from natural language */
  protected extractTarget(text: string, action: NaturalLanguageStep['action']): string | undefined {
    // Common patterns for extracting targets
    const patterns: Record<string, RegExp[]> = {
      click: [
        /click\s+(?:on\s+)?(?:the\s+)?["']?(.+?)["']?\s*(?:button|link|element)?$/i,
        /click\s+(?:the\s+)?["'](.+?)["']/i,
        /tap\s+(?:on\s+)?(?:the\s+)?["']?(.+?)["']?/i,
      ],
      fill: [
        /fill\s+(?:in\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:with|field)/i,
        /type\s+.+?\s+(?:in(?:to)?|on)\s+(?:the\s+)?["']?(.+?)["']?/i,
        /enter\s+.+?\s+(?:in(?:to)?|on)\s+(?:the\s+)?["']?(.+?)["']?/i,
      ],
      select: [
        /select\s+.+?\s+(?:from|in)\s+(?:the\s+)?["']?(.+?)["']?/i,
        /choose\s+.+?\s+(?:from|in)\s+(?:the\s+)?["']?(.+?)["']?/i,
      ],
    };

    const actionPatterns = patterns[action] || [];
    for (const pattern of actionPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: try to extract quoted strings
    const quotedMatch = text.match(/["']([^"']+)["']/);
    if (quotedMatch) {
      return quotedMatch[1];
    }

    return undefined;
  }

  /** Helper to extract value from natural language */
  protected extractValue(text: string, action: NaturalLanguageStep['action']): string | undefined {
    if (action !== 'fill' && action !== 'select') return undefined;

    const patterns = [
      /with\s+["'](.+?)["']/i,
      /(?:type|enter|input)\s+["'](.+?)["']/i,
      /value\s+["'](.+?)["']/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }
}
