/**
 * Duration-Based Sharding Strategy
 *
 * Distributes tests based on historical run times to balance execution time.
 * Uses a greedy algorithm to minimize the longest shard duration.
 */

import { TestFile, TestAllocation, ShardingStrategyType } from '../types';
import { BaseStrategy } from './BaseStrategy';

export class DurationBasedStrategy extends BaseStrategy {
  name = 'Duration Based';
  type: ShardingStrategyType = 'duration';

  /**
   * Distribute tests to balance total execution time across workers
   *
   * Uses a greedy algorithm:
   * 1. Sort tests by duration (longest first)
   * 2. Assign each test to the worker with the smallest current load
   *
   * This is similar to the multiprocessor scheduling problem (LPT algorithm).
   *
   * @param tests - Tests to distribute
   * @param workerCount - Number of workers
   * @returns Array of test allocations with balanced durations
   */
  distribute(tests: TestFile[], workerCount: number): TestAllocation[] {
    this.validate(tests, workerCount);

    const allocations = this.createEmptyAllocations(workerCount);

    // Sort tests by duration (longest first) for LPT algorithm
    const sortedTests = this.sortByDuration(tests);

    // Greedy assignment: always add to the worker with least total time
    for (const test of sortedTests) {
      const shortestAllocation = this.findShortestAllocation(allocations);
      this.addTestToAllocation(shortestAllocation, test);
    }

    // Sort allocations by estimated duration for consistent ordering
    allocations.sort((a, b) => b.estimatedDuration - a.estimatedDuration);

    // Update shard indices after sorting
    allocations.forEach((allocation, index) => {
      allocation.shardIndex = index + 1;
    });

    return allocations;
  }

  /**
   * Calculate the balance score (0-1, higher is better)
   * A perfectly balanced distribution would have a score of 1.
   */
  calculateBalanceScore(allocations: TestAllocation[]): number {
    if (allocations.length === 0) return 1;

    const durations = allocations.map((a) => a.estimatedDuration);
    const maxDuration = Math.max(...durations);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    if (maxDuration === 0) return 1;

    // Score based on how close max is to average
    return avgDuration / maxDuration;
  }

  /**
   * Get statistics about the distribution
   */
  getDistributionStats(allocations: TestAllocation[]): {
    maxDuration: number;
    minDuration: number;
    avgDuration: number;
    balanceScore: number;
    estimatedTotalTime: number;
  } {
    const durations = allocations.map((a) => a.estimatedDuration);
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    return {
      maxDuration,
      minDuration,
      avgDuration,
      balanceScore: this.calculateBalanceScore(allocations),
      estimatedTotalTime: maxDuration, // Total time is limited by slowest shard
    };
  }
}

export const durationBasedStrategy = new DurationBasedStrategy();
