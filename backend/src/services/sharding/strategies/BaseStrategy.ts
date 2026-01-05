/**
 * Base Sharding Strategy
 *
 * Abstract base class for all sharding strategies.
 */

import {
  TestFile,
  TestAllocation,
  ShardingStrategy,
  ShardingStrategyType,
} from '../types';

export abstract class BaseStrategy implements ShardingStrategy {
  abstract name: string;
  abstract type: ShardingStrategyType;

  /**
   * Distribute tests across workers
   */
  abstract distribute(tests: TestFile[], workerCount: number): TestAllocation[];

  /**
   * Create empty allocations for each worker
   */
  protected createEmptyAllocations(workerCount: number): TestAllocation[] {
    return Array.from({ length: workerCount }, (_, i) => ({
      workerId: `worker-${i + 1}`,
      shardIndex: i + 1,
      totalShards: workerCount,
      tests: [],
      estimatedDuration: 0,
      priority: 0,
    }));
  }

  /**
   * Calculate estimated duration for a set of tests
   */
  protected calculateEstimatedDuration(tests: TestFile[]): number {
    return tests.reduce((sum, test) => {
      // Use last run duration, then estimated duration, then default 30 seconds
      return sum + (test.lastRunDuration ?? test.estimatedDuration ?? 30000);
    }, 0);
  }

  /**
   * Find the allocation with the shortest estimated duration
   */
  protected findShortestAllocation(allocations: TestAllocation[]): TestAllocation {
    return allocations.reduce((shortest, current) =>
      current.estimatedDuration < shortest.estimatedDuration ? current : shortest
    );
  }

  /**
   * Add a test to an allocation and update its duration
   */
  protected addTestToAllocation(allocation: TestAllocation, test: TestFile): void {
    allocation.tests.push(test);
    allocation.estimatedDuration += test.lastRunDuration ?? test.estimatedDuration ?? 30000;
    allocation.priority = Math.max(allocation.priority, test.priority ?? 0);
  }

  /**
   * Sort tests by priority (higher first)
   */
  protected sortByPriority(tests: TestFile[]): TestFile[] {
    return [...tests].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Sort tests by duration (longest first)
   */
  protected sortByDuration(tests: TestFile[]): TestFile[] {
    return [...tests].sort((a, b) => {
      const durationA = b.lastRunDuration ?? b.estimatedDuration ?? 30000;
      const durationB = a.lastRunDuration ?? a.estimatedDuration ?? 30000;
      return durationA - durationB;
    });
  }

  /**
   * Validate inputs before distribution
   */
  protected validate(tests: TestFile[], workerCount: number): void {
    if (!tests || tests.length === 0) {
      throw new Error('No tests to distribute');
    }
    if (workerCount < 1) {
      throw new Error('Worker count must be at least 1');
    }
  }
}
