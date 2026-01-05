/**
 * Round Robin Sharding Strategy
 *
 * Distributes tests evenly across workers in a round-robin fashion.
 * Simple and predictable, good for tests with similar durations.
 */

import { TestFile, TestAllocation, ShardingStrategyType } from '../types';
import { BaseStrategy } from './BaseStrategy';

export class RoundRobinStrategy extends BaseStrategy {
  name = 'Round Robin';
  type: ShardingStrategyType = 'round-robin';

  /**
   * Distribute tests in round-robin order
   *
   * @param tests - Tests to distribute
   * @param workerCount - Number of workers
   * @returns Array of test allocations
   */
  distribute(tests: TestFile[], workerCount: number): TestAllocation[] {
    this.validate(tests, workerCount);

    const allocations = this.createEmptyAllocations(workerCount);

    // Sort tests by priority first, then distribute
    const sortedTests = this.sortByPriority(tests);

    // Simple round-robin distribution
    sortedTests.forEach((test, index) => {
      const workerIndex = index % workerCount;
      this.addTestToAllocation(allocations[workerIndex], test);
    });

    return allocations;
  }
}

export const roundRobinStrategy = new RoundRobinStrategy();
