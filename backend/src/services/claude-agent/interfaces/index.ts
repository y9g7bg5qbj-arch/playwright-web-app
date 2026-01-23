/**
 * Claude Agent Interfaces
 *
 * Core types and interfaces for the skill-based agent architecture.
 */

export type {
  NaturalLanguageStep,
  ResolvedSelector,
  SelectorCacheEntry,
  ExecutionContext,
  ExecutionConfig,
  SkillDetection,
  PrepareResult,
  ExecuteResult,
  VerifyResult,
  Skill,
} from './Skill';

export { BaseSkill } from './Skill';

export type {
  HookResult,
  HookType,
  Hook,
} from './Hook';

export { BaseHook, BeforeHook, AfterHook } from './Hook';

export type {
  PlaywrightActionResult,
  ElementInfo,
  ClickOptions,
  FillOptions,
  SelectOptions,
  ScreenshotOptions,
  PlaywrightClient,
} from './PlaywrightClient';

export { toLocatorString } from './PlaywrightClient';
