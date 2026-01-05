/**
 * File-Based Sharding Strategy
 *
 * Distributes tests based on file/folder structure.
 * Keeps related tests together on the same worker for better isolation.
 */

import { TestFile, TestAllocation, ShardingStrategyType } from '../types';
import { BaseStrategy } from './BaseStrategy';
import * as path from 'path';

export class FileBasedStrategy extends BaseStrategy {
  name = 'File Based';
  type: ShardingStrategyType = 'file';

  private groupingLevel: number;

  /**
   * @param groupingLevel - Directory depth for grouping (1 = top-level folder, 2 = second-level, etc.)
   */
  constructor(groupingLevel: number = 1) {
    super();
    this.groupingLevel = groupingLevel;
  }

  /**
   * Distribute tests based on file/folder grouping
   *
   * @param tests - Tests to distribute
   * @param workerCount - Number of workers
   * @returns Array of test allocations grouped by folder
   */
  distribute(tests: TestFile[], workerCount: number): TestAllocation[] {
    this.validate(tests, workerCount);

    const allocations = this.createEmptyAllocations(workerCount);

    // Group tests by folder
    const groups = this.groupTestsByFolder(tests);

    // Sort groups by total duration (largest first)
    const sortedGroups = this.sortGroupsByDuration(groups);

    // Assign groups to workers using greedy algorithm
    for (const group of sortedGroups) {
      const shortestAllocation = this.findShortestAllocation(allocations);

      // Add all tests in the group to the same worker
      for (const test of group.tests) {
        this.addTestToAllocation(shortestAllocation, test);
      }
    }

    return allocations;
  }

  /**
   * Group tests by their folder path
   */
  private groupTestsByFolder(tests: TestFile[]): Map<string, { folder: string; tests: TestFile[] }> {
    const groups = new Map<string, { folder: string; tests: TestFile[] }>();

    for (const test of tests) {
      const folder = this.getGroupKey(test.path);

      if (!groups.has(folder)) {
        groups.set(folder, { folder, tests: [] });
      }

      groups.get(folder)!.tests.push(test);
    }

    return groups;
  }

  /**
   * Get the grouping key for a test path
   */
  private getGroupKey(testPath: string): string {
    const parts = testPath.split(path.sep).filter(Boolean);

    // Remove the filename
    const dirParts = parts.slice(0, -1);

    // Take only up to groupingLevel directories
    const groupParts = dirParts.slice(0, this.groupingLevel);

    return groupParts.join(path.sep) || 'root';
  }

  /**
   * Sort groups by their total estimated duration
   */
  private sortGroupsByDuration(
    groups: Map<string, { folder: string; tests: TestFile[] }>
  ): Array<{ folder: string; tests: TestFile[] }> {
    return Array.from(groups.values()).sort((a, b) => {
      const durationA = this.calculateEstimatedDuration(a.tests);
      const durationB = this.calculateEstimatedDuration(b.tests);
      return durationB - durationA; // Largest first
    });
  }

  /**
   * Get folder distribution statistics
   */
  getFolderStats(tests: TestFile[]): Map<string, { count: number; duration: number }> {
    const stats = new Map<string, { count: number; duration: number }>();

    for (const test of tests) {
      const folder = this.getGroupKey(test.path);

      if (!stats.has(folder)) {
        stats.set(folder, { count: 0, duration: 0 });
      }

      const stat = stats.get(folder)!;
      stat.count++;
      stat.duration += test.lastRunDuration ?? test.estimatedDuration ?? 30000;
    }

    return stats;
  }
}

export const fileBasedStrategy = new FileBasedStrategy();
