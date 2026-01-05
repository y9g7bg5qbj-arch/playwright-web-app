/**
 * Tag-Based Sharding Strategy
 *
 * Distributes tests based on @tags in test files.
 * Allows grouping tests by feature, priority, or any custom category.
 */

import { TestFile, TestAllocation, ShardingStrategyType } from '../types';
import { BaseStrategy } from './BaseStrategy';

export interface TagConfig {
  /** Tags that should run together on the same worker */
  groupTags?: string[];
  /** Tags that should be distributed across all workers */
  distributeTags?: string[];
  /** Tags that require specific worker capabilities */
  capabilityTags?: Map<string, string[]>;
  /** Priority ordering of tags (higher index = higher priority) */
  priorityOrder?: string[];
}

export class TagBasedStrategy extends BaseStrategy {
  name = 'Tag Based';
  type: ShardingStrategyType = 'tag';

  private config: TagConfig;

  constructor(config: TagConfig = {}) {
    super();
    this.config = config;
  }

  /**
   * Distribute tests based on their tags
   *
   * @param tests - Tests to distribute
   * @param workerCount - Number of workers
   * @returns Array of test allocations grouped by tags
   */
  distribute(tests: TestFile[], workerCount: number): TestAllocation[] {
    this.validate(tests, workerCount);

    const allocations = this.createEmptyAllocations(workerCount);

    // First, assign priorities based on tags
    const prioritizedTests = this.assignPriorities(tests);

    // Group tests by their primary tag
    const groups = this.groupTestsByTag(prioritizedTests);

    // Sort groups by priority and size
    const sortedGroups = this.sortGroups(groups);

    // Distribute groups based on strategy
    for (const group of sortedGroups) {
      if (this.shouldDistribute(group.tag)) {
        // Distribute tests within this group across workers
        this.distributeAcrossWorkers(group.tests, allocations);
      } else {
        // Keep tests together on one worker
        this.assignToSingleWorker(group.tests, allocations);
      }
    }

    return allocations;
  }

  /**
   * Assign priorities based on tag configuration
   */
  private assignPriorities(tests: TestFile[]): TestFile[] {
    const priorityOrder = this.config.priorityOrder ?? [];

    return tests.map((test) => {
      const tags = test.tags ?? [];
      let priority = test.priority ?? 0;

      // Find highest priority tag
      for (const tag of tags) {
        const tagPriority = priorityOrder.indexOf(tag);
        if (tagPriority !== -1) {
          priority = Math.max(priority, priorityOrder.length - tagPriority);
        }
      }

      return { ...test, priority };
    });
  }

  /**
   * Group tests by their primary tag
   */
  private groupTestsByTag(tests: TestFile[]): Map<string, { tag: string; tests: TestFile[] }> {
    const groups = new Map<string, { tag: string; tests: TestFile[] }>();

    for (const test of tests) {
      const primaryTag = this.getPrimaryTag(test);

      if (!groups.has(primaryTag)) {
        groups.set(primaryTag, { tag: primaryTag, tests: [] });
      }

      groups.get(primaryTag)!.tests.push(test);
    }

    return groups;
  }

  /**
   * Get the primary tag for a test (first tag or 'untagged')
   */
  private getPrimaryTag(test: TestFile): string {
    const tags = test.tags ?? [];

    // Check for group tags first
    if (this.config.groupTags) {
      for (const groupTag of this.config.groupTags) {
        if (tags.includes(groupTag)) {
          return groupTag;
        }
      }
    }

    // Use first tag or 'untagged'
    return tags[0] ?? 'untagged';
  }

  /**
   * Sort groups by priority and estimated duration
   */
  private sortGroups(
    groups: Map<string, { tag: string; tests: TestFile[] }>
  ): Array<{ tag: string; tests: TestFile[] }> {
    return Array.from(groups.values()).sort((a, b) => {
      // First by priority
      const priorityA = Math.max(...a.tests.map((t) => t.priority ?? 0));
      const priorityB = Math.max(...b.tests.map((t) => t.priority ?? 0));

      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      // Then by duration (larger first for better balancing)
      const durationA = this.calculateEstimatedDuration(a.tests);
      const durationB = this.calculateEstimatedDuration(b.tests);

      return durationB - durationA;
    });
  }

  /**
   * Check if tests with this tag should be distributed across workers
   */
  private shouldDistribute(tag: string): boolean {
    // Distribute if explicitly configured or if it's 'untagged'
    if (this.config.distributeTags?.includes(tag)) {
      return true;
    }

    // Keep together if it's a group tag
    if (this.config.groupTags?.includes(tag)) {
      return false;
    }

    // Default: distribute
    return true;
  }

  /**
   * Distribute tests across all workers
   */
  private distributeAcrossWorkers(tests: TestFile[], allocations: TestAllocation[]): void {
    // Sort by duration for better balancing
    const sortedTests = this.sortByDuration(tests);

    for (const test of sortedTests) {
      const shortestAllocation = this.findShortestAllocation(allocations);
      this.addTestToAllocation(shortestAllocation, test);
    }
  }

  /**
   * Assign all tests to a single worker
   */
  private assignToSingleWorker(tests: TestFile[], allocations: TestAllocation[]): void {
    const shortestAllocation = this.findShortestAllocation(allocations);

    for (const test of tests) {
      this.addTestToAllocation(shortestAllocation, test);
    }
  }

  /**
   * Get all unique tags from tests
   */
  static extractTags(tests: TestFile[]): string[] {
    const tags = new Set<string>();

    for (const test of tests) {
      for (const tag of test.tags ?? []) {
        tags.add(tag);
      }
    }

    return Array.from(tags).sort();
  }

  /**
   * Get tag statistics
   */
  getTagStats(tests: TestFile[]): Map<string, { count: number; duration: number }> {
    const stats = new Map<string, { count: number; duration: number }>();

    for (const test of tests) {
      for (const tag of test.tags ?? ['untagged']) {
        if (!stats.has(tag)) {
          stats.set(tag, { count: 0, duration: 0 });
        }

        const stat = stats.get(tag)!;
        stat.count++;
        stat.duration += test.lastRunDuration ?? test.estimatedDuration ?? 30000;
      }
    }

    return stats;
  }
}

export const tagBasedStrategy = new TagBasedStrategy();
