/**
 * Hook Interface
 *
 * Hooks are callbacks that run before or after skill execution.
 * Used for cross-cutting concerns like caching, logging, and verification.
 */

import type { ExecutionContext, ExecuteResult } from './Skill';

/** Result of hook execution */
export interface HookResult {
  /** Whether to continue with execution */
  continue: boolean;

  /** Updated context data */
  contextUpdates?: Partial<ExecutionContext>;

  /** Message describing what the hook did */
  message?: string;

  /** Error if hook failed */
  error?: string;

  /** Skip remaining hooks of the same type */
  skipRemainingHooks?: boolean;

  /** Data to pass to subsequent hooks */
  hookData?: Record<string, unknown>;
}

/** Hook timing */
export type HookType = 'before' | 'after';

/**
 * Hook Interface
 *
 * Hooks provide extension points for before/after action processing.
 * Examples: SelectorCacheBeforeHook, SelectorCacheAfterHook
 */
export interface Hook {
  /** Unique name for this hook */
  name: string;

  /** Whether this is a before or after hook */
  type: HookType;

  /** Execution priority (lower = runs first) */
  priority: number;

  /** Description of what this hook does */
  description: string;

  /**
   * Determine if this hook should run for the current context
   */
  shouldRun(context: ExecutionContext): boolean;

  /**
   * Execute the hook
   * @param context Current execution context
   * @param executeResult For 'after' hooks, the result of skill execution
   */
  execute(context: ExecutionContext, executeResult?: ExecuteResult): Promise<HookResult>;
}

/** Base class for hooks with default implementations */
export abstract class BaseHook implements Hook {
  abstract name: string;
  abstract type: HookType;
  abstract priority: number;
  abstract description: string;

  shouldRun(_context: ExecutionContext): boolean {
    // Default: always run
    return true;
  }

  abstract execute(context: ExecutionContext, executeResult?: ExecuteResult): Promise<HookResult>;
}

/** Before hook base class */
export abstract class BeforeHook extends BaseHook {
  type: HookType = 'before';

  abstract execute(context: ExecutionContext): Promise<HookResult>;
}

/** After hook base class */
export abstract class AfterHook extends BaseHook {
  type: HookType = 'after';

  abstract execute(context: ExecutionContext, executeResult: ExecuteResult): Promise<HookResult>;
}
