/**
 * Sharding Strategies Index
 *
 * Export all sharding strategies and factory function.
 */

export * from './BaseStrategy';
export * from './RoundRobinStrategy';
export * from './DurationBasedStrategy';
export * from './FileBasedStrategy';
export * from './TagBasedStrategy';
export * from './FailFirstStrategy';

import { ShardingStrategy, ShardingStrategyType } from '../types';
import { RoundRobinStrategy } from './RoundRobinStrategy';
import { DurationBasedStrategy } from './DurationBasedStrategy';
import { FileBasedStrategy } from './FileBasedStrategy';
import { TagBasedStrategy, TagConfig } from './TagBasedStrategy';
import { FailFirstStrategy, FailFirstConfig } from './FailFirstStrategy';

/**
 * Strategy configuration options
 */
export interface StrategyOptions {
  /** File-based strategy: directory depth for grouping */
  fileGroupingLevel?: number;
  /** Tag-based strategy: tag configuration */
  tagConfig?: TagConfig;
  /** Fail-first strategy: configuration */
  failFirstConfig?: FailFirstConfig;
}

/**
 * Create a sharding strategy by type
 */
export function createStrategy(
  type: ShardingStrategyType,
  options: StrategyOptions = {}
): ShardingStrategy {
  switch (type) {
    case 'round-robin':
      return new RoundRobinStrategy();

    case 'duration':
      return new DurationBasedStrategy();

    case 'file':
      return new FileBasedStrategy(options.fileGroupingLevel);

    case 'tag':
      return new TagBasedStrategy(options.tagConfig);

    case 'fail-first':
      return new FailFirstStrategy(options.failFirstConfig);

    default:
      throw new Error(`Unknown sharding strategy: ${type}`);
  }
}

/**
 * Get all available strategy types
 */
export function getAvailableStrategies(): ShardingStrategyType[] {
  return ['round-robin', 'duration', 'file', 'tag', 'fail-first'];
}

/**
 * Get strategy description
 */
export function getStrategyDescription(type: ShardingStrategyType): string {
  const descriptions: Record<ShardingStrategyType, string> = {
    'round-robin': 'Distributes tests evenly in round-robin order. Good for similar-duration tests.',
    'duration':
      'Balances execution time based on historical durations. Best for minimizing total time.',
    'file': 'Groups tests by file/folder structure. Keeps related tests together.',
    'tag': 'Groups tests by @tags. Allows custom grouping by feature or category.',
    'fail-first':
      'Runs previously failed tests first for fast feedback. Best for CI/CD pipelines.',
  };

  return descriptions[type] ?? 'Unknown strategy';
}
