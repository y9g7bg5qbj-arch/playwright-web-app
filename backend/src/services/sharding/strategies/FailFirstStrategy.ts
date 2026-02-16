/**
 * Fail-First Sharding Strategy
 *
 * Prioritizes previously failed tests to get fast feedback.
 * Failed tests run first, then tests by duration for balance.
 */

import { TestFile, TestAllocation, ShardingStrategyType, TestHistoryStore } from '../types';
import { BaseStrategy } from './BaseStrategy';

export interface FailFirstConfig {
  /** Run failed tests on first N shards (default: 1) */
  failedTestShards?: number;
  /** Consider tests failed if failure rate is above this threshold (0-1) */
  failureRateThreshold?: number;
  /** Number of recent runs to consider for failure rate */
  recentRunsCount?: number;
  /** Maximum age of failure data to consider (in hours) */
  maxFailureAge?: number;
}

export class FailFirstStrategy extends BaseStrategy {
  name = 'Fail First';
  type: ShardingStrategyType = 'fail-first';

  private config: FailFirstConfig;
  private historyStore?: TestHistoryStore;

  constructor(config: FailFirstConfig = {}, historyStore?: TestHistoryStore) {
    super();
    this.config = {
      failedTestShards: 1,
      failureRateThreshold: 0,
      recentRunsCount: 5,
      maxFailureAge: 24,
      ...config,
    };
    this.historyStore = historyStore;
  }

  /**
   * Distribute tests with previously failed tests running first
   *
   * Strategy:
   * 1. Identify tests that failed in recent runs
   * 2. Assign failed tests to first N shards
   * 3. Distribute remaining tests by duration
   *
   * @param tests - Tests to distribute
   * @param workerCount - Number of workers
   * @returns Array of test allocations with failed tests first
   */
  distribute(tests: TestFile[], workerCount: number): TestAllocation[] {
    this.validate(tests, workerCount);

    const allocations = this.createEmptyAllocations(workerCount);

    // Separate tests into failed and non-failed groups
    const { failedTests, otherTests } = this.separateTests(tests);

    // Determine how many shards to use for failed tests
    const failedShards = Math.min(
      this.config.failedTestShards!,
      workerCount,
      failedTests.length > 0 ? Math.ceil(failedTests.length / 3) : 0
    );

    // Assign failed tests to first N shards
    if (failedTests.length > 0 && failedShards > 0) {
      const failedAllocations = allocations.slice(0, failedShards);
      this.distributeToShards(failedTests, failedAllocations);

      // Mark these allocations as high priority
      failedAllocations.forEach((a) => {
        a.priority = 100;
      });
    }

    // Distribute remaining tests across all workers by duration
    this.distributeByDuration(otherTests, allocations);

    return allocations;
  }

  /**
   * Separate tests into failed and other groups
   */
  private separateTests(tests: TestFile[]): {
    failedTests: TestFile[];
    otherTests: TestFile[];
  } {
    const failedTests: TestFile[] = [];
    const otherTests: TestFile[] = [];

    for (const test of tests) {
      if (this.isConsideredFailed(test)) {
        failedTests.push({ ...test, priority: (test.priority ?? 0) + 100 });
      } else {
        otherTests.push(test);
      }
    }

    // Sort failed tests by failure recency (most recent first)
    failedTests.sort((a, b) => {
      const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
      if (priorityDiff !== 0) return priorityDiff;

      // If same priority, sort by last run status
      if (a.lastRunStatus === 'failed' && b.lastRunStatus !== 'failed') return -1;
      if (b.lastRunStatus === 'failed' && a.lastRunStatus !== 'failed') return 1;

      return 0;
    });

    return { failedTests, otherTests };
  }

  /**
   * Check if a test should be considered failed
   */
  private isConsideredFailed(test: TestFile): boolean {
    // Simple check: last run was failed
    if (test.lastRunStatus === 'failed') {
      return true;
    }

    // Could be extended with history store for more sophisticated logic
    return false;
  }

  /**
   * Distribute tests to specific shards
   */
  private distributeToShards(tests: TestFile[], allocations: TestAllocation[]): void {
    const sortedTests = this.sortByDuration(tests);

    for (const test of sortedTests) {
      const shortestAllocation = this.findShortestAllocation(allocations);
      this.addTestToAllocation(shortestAllocation, test);
    }
  }

  /**
   * Distribute tests by duration across all allocations
   */
  private distributeByDuration(tests: TestFile[], allocations: TestAllocation[]): void {
    const sortedTests = this.sortByDuration(tests);

    for (const test of sortedTests) {
      const shortestAllocation = this.findShortestAllocation(allocations);
      this.addTestToAllocation(shortestAllocation, test);
    }
  }

  /**
   * Get failure statistics for tests
   */
  getFailureStats(tests: TestFile[]): {
    totalTests: number;
    failedTests: number;
    passedTests: number;
    unknownTests: number;
    failureRate: number;
  } {
    let failed = 0;
    let passed = 0;
    let unknown = 0;

    for (const test of tests) {
      switch (test.lastRunStatus) {
        case 'failed':
          failed++;
          break;
        case 'passed':
          passed++;
          break;
        default:
          unknown++;
      }
    }

    return {
      totalTests: tests.length,
      failedTests: failed,
      passedTests: passed,
      unknownTests: unknown,
      failureRate: tests.length > 0 ? failed / tests.length : 0,
    };
  }

  /**
   * Update test with history data for more accurate failure detection
   */
  async enrichWithHistory(tests: TestFile[]): Promise<TestFile[]> {
    if (!this.historyStore) {
      return tests;
    }

    const enrichedTests: TestFile[] = [];

    for (const test of tests) {
      const history = await this.historyStore.get(test.id);

      if (history) {
        // Calculate failure rate from recent runs
        const recentRuns = history.runs.slice(-this.config.recentRunsCount!);
        const failures = recentRuns.filter((r) => r.status === 'failed').length;
        const failureRate = recentRuns.length > 0 ? failures / recentRuns.length : 0;

        // Consider failed if above threshold
        const isFailed = failureRate > this.config.failureRateThreshold!;

        enrichedTests.push({
          ...test,
          lastRunStatus: isFailed ? 'failed' : test.lastRunStatus,
          lastRunDuration: history.averageDuration || test.lastRunDuration,
        });
      } else {
        enrichedTests.push(test);
      }
    }

    return enrichedTests;
  }
}

export const failFirstStrategy = new FailFirstStrategy();
