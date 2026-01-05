/**
 * Trace Analyzer
 * Provides analysis capabilities for Playwright traces
 */

import {
    TraceData,
    TraceAction,
    FailureInfo,
    SlowAction,
    NetworkStats,
    TraceDiff,
    TraceNetworkRequest,
} from '../execution/types';
import { logger } from '../../utils/logger';

/**
 * Trace Analyzer
 * Analyzes Playwright traces for insights and comparisons
 */
export class TraceAnalyzer {
    /**
     * Get failure point from a trace
     */
    getFailurePoint(trace: TraceData): FailureInfo | null {
        // Find the first failed action
        const failedAction = trace.actions.find(a => a.status === 'failed');

        if (!failedAction) {
            // Check for errors
            if (trace.errors.length > 0) {
                const error = trace.errors[0];
                return {
                    actionId: error.actionId || '',
                    actionType: 'error',
                    error: error.message,
                    timestamp: error.timestamp,
                    suggestion: this.generateSuggestion(error.message, 'error'),
                };
            }
            return null;
        }

        // Find screenshot near failure time
        const screenshotPath = this.findNearestScreenshot(trace, failedAction.endTime);

        return {
            actionId: failedAction.id,
            actionType: failedAction.type,
            selector: failedAction.selector,
            error: failedAction.error || 'Unknown error',
            timestamp: failedAction.endTime,
            screenshotPath,
            suggestion: this.generateSuggestion(failedAction.error || '', failedAction.type, failedAction.selector),
        };
    }

    /**
     * Get slow actions from a trace
     */
    getSlowActions(trace: TraceData, threshold: number = 5000): SlowAction[] {
        const slowActions: SlowAction[] = [];

        // Calculate action durations and percentiles
        const durations = trace.actions.map(a => a.duration).sort((a, b) => a - b);
        const p95 = durations[Math.floor(durations.length * 0.95)] || threshold;

        for (const action of trace.actions) {
            if (action.duration >= threshold) {
                // Calculate percentile rank
                const rank = durations.filter(d => d < action.duration).length / durations.length;

                slowActions.push({
                    actionId: action.id,
                    type: action.type,
                    selector: action.selector,
                    duration: action.duration,
                    threshold,
                    percentileRank: Math.round(rank * 100),
                });
            }
        }

        // Sort by duration descending
        return slowActions.sort((a, b) => b.duration - a.duration);
    }

    /**
     * Get network statistics from a trace
     */
    getNetworkStats(trace: TraceData): NetworkStats {
        const requests = trace.networkRequests;

        // Calculate basic stats
        const totalRequests = requests.length;
        const successfulRequests = requests.filter(r => r.status && r.status >= 200 && r.status < 400).length;
        const failedRequests = requests.filter(r => r.failure || (r.status && r.status >= 400)).length;

        // Calculate sizes
        let totalSize = 0;
        let totalTransferSize = 0;
        let totalResponseTime = 0;
        let requestsWithDuration = 0;

        for (const request of requests) {
            if (request.size) totalSize += request.size;
            if (request.transferSize) totalTransferSize += request.transferSize;
            if (request.duration) {
                totalResponseTime += request.duration;
                requestsWithDuration++;
            }
        }

        const averageResponseTime = requestsWithDuration > 0
            ? Math.round(totalResponseTime / requestsWithDuration)
            : 0;

        // Find slowest requests
        const slowestRequests = [...requests]
            .filter(r => r.duration)
            .sort((a, b) => (b.duration || 0) - (a.duration || 0))
            .slice(0, 10)
            .map(r => ({
                url: r.url,
                duration: r.duration || 0,
                status: r.status,
            }));

        // Group by resource type
        const requestsByType: Record<string, number> = {};
        for (const request of requests) {
            const type = request.resourceType || 'other';
            requestsByType[type] = (requestsByType[type] || 0) + 1;
        }

        // Group by status code
        const requestsByStatus: Record<string, number> = {};
        for (const request of requests) {
            const status = request.status?.toString() || 'pending';
            requestsByStatus[status] = (requestsByStatus[status] || 0) + 1;
        }

        return {
            totalRequests,
            successfulRequests,
            failedRequests,
            totalSize,
            totalTransferSize,
            averageResponseTime,
            slowestRequests,
            requestsByType,
            requestsByStatus,
        };
    }

    /**
     * Compare two traces
     */
    compareTraces(trace1: TraceData, trace2: TraceData): TraceDiff {
        const actionDiffs: TraceDiff['actionDiffs'] = [];
        const timingDiffs: TraceDiff['timingDiffs'] = [];

        // Build action maps by type and selector
        const actions1 = this.groupActionsByKey(trace1.actions);
        const actions2 = this.groupActionsByKey(trace2.actions);

        // Find added, removed, and modified actions
        const allKeys = new Set([...actions1.keys(), ...actions2.keys()]);

        for (const key of allKeys) {
            const a1 = actions1.get(key);
            const a2 = actions2.get(key);

            if (!a1) {
                actionDiffs.push({
                    type: 'added',
                    action2: a2,
                });
            } else if (!a2) {
                actionDiffs.push({
                    type: 'removed',
                    action1: a1,
                });
            } else {
                // Check for differences
                const changes = this.compareActions(a1, a2);
                if (changes.length > 0) {
                    actionDiffs.push({
                        type: 'modified',
                        action1: a1,
                        action2: a2,
                        changes,
                    });
                }

                // Add timing diff
                if (a1.duration !== a2.duration) {
                    const percentChange = a1.duration > 0
                        ? Math.round(((a2.duration - a1.duration) / a1.duration) * 100)
                        : 0;

                    timingDiffs.push({
                        actionType: a1.type,
                        duration1: a1.duration,
                        duration2: a2.duration,
                        percentChange,
                    });
                }
            }
        }

        // Compare network requests
        const networkDiffs = this.compareNetworkRequests(
            trace1.networkRequests,
            trace2.networkRequests
        );

        return {
            trace1Id: trace1.traceId,
            trace2Id: trace2.traceId,
            actionDiffs,
            timingDiffs,
            networkDiffs,
        };
    }

    /**
     * Group actions by a unique key
     */
    private groupActionsByKey(actions: TraceAction[]): Map<string, TraceAction> {
        const map = new Map<string, TraceAction>();

        for (const action of actions) {
            // Create a key based on type, selector, and position
            const key = `${action.type}:${action.selector || 'none'}:${action.value || 'none'}`;
            map.set(key, action);
        }

        return map;
    }

    /**
     * Compare two actions for differences
     */
    private compareActions(a1: TraceAction, a2: TraceAction): string[] {
        const changes: string[] = [];

        if (a1.status !== a2.status) {
            changes.push(`Status: ${a1.status} -> ${a2.status}`);
        }

        if (a1.error !== a2.error) {
            changes.push(`Error: ${a1.error || 'none'} -> ${a2.error || 'none'}`);
        }

        // Check for significant duration change (more than 50%)
        const durationChange = Math.abs(a2.duration - a1.duration) / (a1.duration || 1);
        if (durationChange > 0.5) {
            changes.push(`Duration: ${a1.duration}ms -> ${a2.duration}ms`);
        }

        return changes;
    }

    /**
     * Compare network requests between traces
     */
    private compareNetworkRequests(
        requests1: TraceNetworkRequest[],
        requests2: TraceNetworkRequest[]
    ): TraceDiff['networkDiffs'] {
        const urls1 = new Set(requests1.map(r => r.url));
        const urls2 = new Set(requests2.map(r => r.url));

        const addedRequests: string[] = [];
        const removedRequests: string[] = [];
        const changedResponses: Array<{ url: string; oldStatus: number; newStatus: number }> = [];

        // Find added and removed
        for (const url of urls2) {
            if (!urls1.has(url)) {
                addedRequests.push(url);
            }
        }

        for (const url of urls1) {
            if (!urls2.has(url)) {
                removedRequests.push(url);
            }
        }

        // Find changed responses
        for (const r1 of requests1) {
            const r2 = requests2.find(r => r.url === r1.url);
            if (r2 && r1.status && r2.status && r1.status !== r2.status) {
                changedResponses.push({
                    url: r1.url,
                    oldStatus: r1.status,
                    newStatus: r2.status,
                });
            }
        }

        return {
            addedRequests,
            removedRequests,
            changedResponses,
        };
    }

    /**
     * Find the nearest screenshot to a timestamp
     */
    private findNearestScreenshot(trace: TraceData, timestamp: number): string | undefined {
        if (trace.screenshots.length === 0) {
            return undefined;
        }

        let nearest = trace.screenshots[0];
        let minDiff = Math.abs(timestamp - nearest.timestamp);

        for (const screenshot of trace.screenshots) {
            const diff = Math.abs(timestamp - screenshot.timestamp);
            if (diff < minDiff) {
                minDiff = diff;
                nearest = screenshot;
            }
        }

        return nearest.sha1;
    }

    /**
     * Generate a suggestion for fixing an error
     */
    private generateSuggestion(error: string, actionType: string, selector?: string): string {
        const lowerError = error.toLowerCase();
        const suggestions: string[] = [];

        // Timeout errors
        if (lowerError.includes('timeout') || lowerError.includes('waiting')) {
            suggestions.push('Consider increasing the timeout value');
            suggestions.push('Add a waitFor before this action');
            if (selector) {
                suggestions.push(`Verify the element "${selector}" exists on the page`);
            }
        }

        // Selector not found
        if (lowerError.includes('not found') || lowerError.includes('no element')) {
            if (selector) {
                suggestions.push(`Check if the selector "${selector}" is correct`);
                suggestions.push('The element may have been removed or hidden');
                suggestions.push('Try using a more specific or stable selector');
            }
        }

        // Element not visible
        if (lowerError.includes('not visible') || lowerError.includes('hidden')) {
            suggestions.push('The element may be outside the viewport - try scrolling');
            suggestions.push('The element may be covered by another element');
            suggestions.push('Check if the element has display:none or visibility:hidden');
        }

        // Element not enabled
        if (lowerError.includes('not enabled') || lowerError.includes('disabled')) {
            suggestions.push('Wait for the element to become enabled');
            suggestions.push('Check if a prerequisite action is needed first');
        }

        // Navigation errors
        if (lowerError.includes('navigation') || lowerError.includes('net::')) {
            suggestions.push('Check the URL is correct and accessible');
            suggestions.push('The server may be slow or unresponsive');
            suggestions.push('Check for network connectivity issues');
        }

        // Assertion failures
        if (lowerError.includes('expect') || lowerError.includes('assertion')) {
            suggestions.push('Verify the expected value is correct');
            suggestions.push('The page content may have changed');
            suggestions.push('Add a wait to ensure the content has loaded');
        }

        if (suggestions.length === 0) {
            return 'Review the error message and check the test implementation';
        }

        return suggestions.join('. ');
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary(trace: TraceData): {
        totalDuration: number;
        actionCount: number;
        averageActionDuration: number;
        slowestAction: TraceAction | null;
        fastestAction: TraceAction | null;
        networkTime: number;
        idleTime: number;
    } {
        const actions = trace.actions;

        if (actions.length === 0) {
            return {
                totalDuration: 0,
                actionCount: 0,
                averageActionDuration: 0,
                slowestAction: null,
                fastestAction: null,
                networkTime: 0,
                idleTime: 0,
            };
        }

        const totalDuration = trace.metadata.endTime - trace.metadata.startTime;
        const actionDurations = actions.map(a => a.duration);
        const totalActionTime = actionDurations.reduce((sum, d) => sum + d, 0);
        const averageActionDuration = totalActionTime / actions.length;

        // Find slowest and fastest
        const sorted = [...actions].sort((a, b) => b.duration - a.duration);
        const slowestAction = sorted[0];
        const fastestAction = sorted[sorted.length - 1];

        // Calculate network time
        const networkTime = trace.networkRequests.reduce((sum, r) => sum + (r.duration || 0), 0);

        // Calculate idle time (gaps between actions)
        let idleTime = 0;
        for (let i = 1; i < actions.length; i++) {
            const gap = actions[i].startTime - actions[i - 1].endTime;
            if (gap > 0) {
                idleTime += gap;
            }
        }

        return {
            totalDuration,
            actionCount: actions.length,
            averageActionDuration: Math.round(averageActionDuration),
            slowestAction,
            fastestAction,
            networkTime,
            idleTime,
        };
    }

    /**
     * Get console summary
     */
    getConsoleSummary(trace: TraceData): {
        total: number;
        byType: Record<string, number>;
        errors: string[];
        warnings: string[];
    } {
        const messages = trace.consoleMessages;
        const byType: Record<string, number> = {};
        const errors: string[] = [];
        const warnings: string[] = [];

        for (const msg of messages) {
            byType[msg.type] = (byType[msg.type] || 0) + 1;

            if (msg.type === 'error') {
                errors.push(msg.text);
            } else if (msg.type === 'warn') {
                warnings.push(msg.text);
            }
        }

        return {
            total: messages.length,
            byType,
            errors: errors.slice(0, 10),  // Limit to first 10
            warnings: warnings.slice(0, 10),
        };
    }
}

// Export singleton instance
export const traceAnalyzer = new TraceAnalyzer();
