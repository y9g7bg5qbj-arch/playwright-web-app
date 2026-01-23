/**
 * Skill Registry
 *
 * Central registry for managing skills and hooks.
 * Handles registration, priority ordering, and execution coordination.
 */

import type {
  Skill,
  Hook,
  ExecutionContext,
  SkillDetection,
  ExecuteResult,
  VerifyResult,
} from './interfaces';
import type { HookResult } from './interfaces/Hook';

/** Result of running all applicable skills */
export interface SkillExecutionResult {
  success: boolean;
  skillsExecuted: string[];
  executeResult?: ExecuteResult;
  verifyResult?: VerifyResult;
  error?: string;
  totalDurationMs: number;
}

/** Result of running hooks */
export interface HooksExecutionResult {
  success: boolean;
  hooksExecuted: string[];
  contextUpdates: Partial<ExecutionContext>;
  shouldContinue: boolean;
  error?: string;
}

/**
 * Skill Registry
 *
 * Manages skill and hook registration, discovery, and execution.
 */
export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  private beforeHooks: Map<string, Hook> = new Map();
  private afterHooks: Map<string, Hook> = new Map();

  /**
   * Register a skill
   */
  registerSkill(skill: Skill): void {
    if (this.skills.has(skill.name)) {
      console.warn(`[SkillRegistry] Overwriting existing skill: ${skill.name}`);
    }
    this.skills.set(skill.name, skill);
    console.log(`[SkillRegistry] Registered skill: ${skill.name} (priority: ${skill.priority})`);
  }

  /**
   * Register multiple skills
   */
  registerSkills(skills: Skill[]): void {
    for (const skill of skills) {
      this.registerSkill(skill);
    }
  }

  /**
   * Unregister a skill
   */
  unregisterSkill(name: string): boolean {
    return this.skills.delete(name);
  }

  /**
   * Get a skill by name
   */
  getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /**
   * Get all skills sorted by priority
   */
  getSkillsByPriority(): Skill[] {
    return Array.from(this.skills.values())
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Register a hook
   */
  registerHook(hook: Hook): void {
    const hookMap = hook.type === 'before' ? this.beforeHooks : this.afterHooks;

    if (hookMap.has(hook.name)) {
      console.warn(`[SkillRegistry] Overwriting existing ${hook.type} hook: ${hook.name}`);
    }

    hookMap.set(hook.name, hook);
    console.log(`[SkillRegistry] Registered ${hook.type} hook: ${hook.name} (priority: ${hook.priority})`);
  }

  /**
   * Register multiple hooks
   */
  registerHooks(hooks: Hook[]): void {
    for (const hook of hooks) {
      this.registerHook(hook);
    }
  }

  /**
   * Unregister a hook
   */
  unregisterHook(name: string, type: 'before' | 'after'): boolean {
    const hookMap = type === 'before' ? this.beforeHooks : this.afterHooks;
    return hookMap.delete(name);
  }

  /**
   * Get hooks by type, sorted by priority
   */
  getHooksByType(type: 'before' | 'after'): Hook[] {
    const hookMap = type === 'before' ? this.beforeHooks : this.afterHooks;
    return Array.from(hookMap.values())
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Detect which skills apply to the current context
   */
  async detectApplicableSkills(context: ExecutionContext): Promise<Array<{ skill: Skill; detection: SkillDetection }>> {
    const applicable: Array<{ skill: Skill; detection: SkillDetection }> = [];
    const sortedSkills = this.getSkillsByPriority();

    for (const skill of sortedSkills) {
      try {
        const detection = await skill.detect(context);
        if (detection.applies) {
          applicable.push({ skill, detection });
          console.log(`[SkillRegistry] Skill ${skill.name} applies (confidence: ${detection.confidence})`);
        }
      } catch (error) {
        console.error(`[SkillRegistry] Error detecting skill ${skill.name}:`, error);
      }
    }

    return applicable;
  }

  /**
   * Run before hooks
   */
  async runBeforeHooks(context: ExecutionContext): Promise<HooksExecutionResult> {
    const hooks = this.getHooksByType('before');
    const hooksExecuted: string[] = [];
    let contextUpdates: Partial<ExecutionContext> = {};

    for (const hook of hooks) {
      if (!hook.shouldRun(context)) {
        continue;
      }

      try {
        console.log(`[SkillRegistry] Running before hook: ${hook.name}`);
        const result = await hook.execute(context);
        hooksExecuted.push(hook.name);

        if (result.contextUpdates) {
          contextUpdates = { ...contextUpdates, ...result.contextUpdates };
          // Apply updates to context for subsequent hooks
          Object.assign(context, result.contextUpdates);
        }

        if (!result.continue) {
          console.log(`[SkillRegistry] Hook ${hook.name} stopped execution`);
          return {
            success: true,
            hooksExecuted,
            contextUpdates,
            shouldContinue: false,
            error: result.error,
          };
        }

        if (result.skipRemainingHooks) {
          console.log(`[SkillRegistry] Hook ${hook.name} skipped remaining hooks`);
          break;
        }
      } catch (error) {
        console.error(`[SkillRegistry] Error in before hook ${hook.name}:`, error);
        return {
          success: false,
          hooksExecuted,
          contextUpdates,
          shouldContinue: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return {
      success: true,
      hooksExecuted,
      contextUpdates,
      shouldContinue: true,
    };
  }

  /**
   * Run after hooks
   */
  async runAfterHooks(context: ExecutionContext, executeResult: ExecuteResult): Promise<HooksExecutionResult> {
    const hooks = this.getHooksByType('after');
    const hooksExecuted: string[] = [];
    let contextUpdates: Partial<ExecutionContext> = {};

    for (const hook of hooks) {
      if (!hook.shouldRun(context)) {
        continue;
      }

      try {
        console.log(`[SkillRegistry] Running after hook: ${hook.name}`);
        const result = await hook.execute(context, executeResult);
        hooksExecuted.push(hook.name);

        if (result.contextUpdates) {
          contextUpdates = { ...contextUpdates, ...result.contextUpdates };
          Object.assign(context, result.contextUpdates);
        }

        if (!result.continue) {
          console.log(`[SkillRegistry] After hook ${hook.name} stopped execution`);
          return {
            success: true,
            hooksExecuted,
            contextUpdates,
            shouldContinue: false,
            error: result.error,
          };
        }

        if (result.skipRemainingHooks) {
          break;
        }
      } catch (error) {
        console.error(`[SkillRegistry] Error in after hook ${hook.name}:`, error);
        return {
          success: false,
          hooksExecuted,
          contextUpdates,
          shouldContinue: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return {
      success: true,
      hooksExecuted,
      contextUpdates,
      shouldContinue: true,
    };
  }

  /**
   * Execute skills in priority order
   *
   * Skills go through phases: detect -> prepare -> execute -> verify
   */
  async executeSkills(context: ExecutionContext): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    const skillsExecuted: string[] = [];

    // 1. Run before hooks
    const beforeResult = await this.runBeforeHooks(context);
    if (!beforeResult.shouldContinue) {
      return {
        success: beforeResult.success,
        skillsExecuted: [],
        error: beforeResult.error,
        totalDurationMs: Date.now() - startTime,
      };
    }

    // 2. Detect applicable skills
    const applicableSkills = await this.detectApplicableSkills(context);

    if (applicableSkills.length === 0) {
      return {
        success: false,
        skillsExecuted: [],
        error: 'No applicable skills found for the current step',
        totalDurationMs: Date.now() - startTime,
      };
    }

    // 3. Prepare and execute skills
    let lastExecuteResult: ExecuteResult | undefined;
    let lastVerifyResult: VerifyResult | undefined;

    for (const { skill, detection } of applicableSkills) {
      try {
        // Merge detection data into context metadata
        if (detection.detectionData) {
          context.metadata = { ...context.metadata, ...detection.detectionData };
        }

        // Prepare phase
        console.log(`[SkillRegistry] Preparing skill: ${skill.name}`);
        const prepareResult = await skill.prepare(context);

        if (!prepareResult.success) {
          console.error(`[SkillRegistry] Skill ${skill.name} prepare failed:`, prepareResult.error);
          continue;
        }

        if (prepareResult.context) {
          Object.assign(context, prepareResult.context);
        }

        if (prepareResult.skipExecution) {
          console.log(`[SkillRegistry] Skill ${skill.name} skipped execution`);
          skillsExecuted.push(skill.name);
          continue;
        }

        // Execute phase
        console.log(`[SkillRegistry] Executing skill: ${skill.name}`);
        const executeResult = await skill.execute(context);
        skillsExecuted.push(skill.name);

        if (!executeResult.success) {
          console.error(`[SkillRegistry] Skill ${skill.name} execute failed:`, executeResult.error);

          // Run after hooks even on failure
          await this.runAfterHooks(context, executeResult);

          return {
            success: false,
            skillsExecuted,
            executeResult,
            error: executeResult.error,
            totalDurationMs: Date.now() - startTime,
          };
        }

        lastExecuteResult = executeResult;

        // Update context with used selector
        if (executeResult.usedSelector) {
          context.resolvedSelector = executeResult.usedSelector;
        }

        // Verify phase
        console.log(`[SkillRegistry] Verifying skill: ${skill.name}`);
        const verifyResult = await skill.verify(context);
        lastVerifyResult = verifyResult;

        if (!verifyResult.verified) {
          console.warn(`[SkillRegistry] Skill ${skill.name} verification failed:`, verifyResult.error);
          // Continue despite verification failure - might need retry logic
        }

      } catch (error) {
        console.error(`[SkillRegistry] Error executing skill ${skill.name}:`, error);
        return {
          success: false,
          skillsExecuted,
          error: error instanceof Error ? error.message : String(error),
          totalDurationMs: Date.now() - startTime,
        };
      }
    }

    // 4. Run after hooks
    if (lastExecuteResult) {
      await this.runAfterHooks(context, lastExecuteResult);
    }

    return {
      success: true,
      skillsExecuted,
      executeResult: lastExecuteResult,
      verifyResult: lastVerifyResult,
      totalDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Get registry statistics
   */
  getStats(): { skills: number; beforeHooks: number; afterHooks: number } {
    return {
      skills: this.skills.size,
      beforeHooks: this.beforeHooks.size,
      afterHooks: this.afterHooks.size,
    };
  }

  /**
   * Clear all registered skills and hooks
   */
  clear(): void {
    this.skills.clear();
    this.beforeHooks.clear();
    this.afterHooks.clear();
  }
}

// Default singleton instance
let defaultRegistry: SkillRegistry | null = null;

// Import core skills and hooks for default registration
import { SelectorGeneratorSkill, ActionVerifierSkill } from './skills';
import { SelectorCacheBeforeHook, SelectorCacheAfterHook } from './hooks';

export function getDefaultRegistry(): SkillRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new SkillRegistry();

    // Register core skills
    defaultRegistry.registerSkill(new SelectorGeneratorSkill());
    defaultRegistry.registerSkill(new ActionVerifierSkill());

    // Register core hooks
    defaultRegistry.registerHook(new SelectorCacheBeforeHook());
    defaultRegistry.registerHook(new SelectorCacheAfterHook());

    console.log('[SkillRegistry] Default registry initialized with core skills and hooks');
  }
  return defaultRegistry;
}

export function resetDefaultRegistry(): void {
  defaultRegistry = null;
}

