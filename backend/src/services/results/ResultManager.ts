/**
 * Result Manager
 * Manages test execution results, history, and analytics
 */

import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import {
    TestResult,
    TestRun,
    RunSummary,
    FlakyTest,
    TrendData,
    DateRange,
    TestStatus,
    ArtifactRef,
} from '../execution/types';
import { executionStepRepository, executionRepository, executionLogRepository } from '../../db/repositories/mongo';
import { logger } from '../../utils/logger';

const STORAGE_PATH = path.resolve(process.env.STORAGE_PATH || './storage');

/**
 * Result Manager Interface
 */
export interface IResultManager {
    // CRUD
    saveResult(result: TestResult): Promise<string>;
    getResult(resultId: string): Promise<TestResult | null>;
    getResultsForRun(runId: string): Promise<TestResult[]>;
    getResultsForTest(testFile: string): Promise<TestResult[]>;

    // Queries
    getHistory(testFile: string, limit: number): Promise<TestResult[]>;
    getFailures(runId: string): Promise<TestResult[]>;
    getFlaky(timeRange: DateRange): Promise<FlakyTest[]>;

    // Aggregation
    getRunSummary(runId: string): Promise<RunSummary | null>;
    getTrends(testFile: string, days: number): Promise<TrendData>;

    // Export
    exportToJUnit(runId: string): Promise<string>;
    exportToHTML(runId: string): Promise<string>;
}

/**
 * Result Manager Implementation
 */
export class ResultManager implements IResultManager {
    private resultsCache: Map<string, TestResult> = new Map();
    private runsCache: Map<string, TestRun> = new Map();

    /**
     * Save a test result
     */
    async saveResult(result: TestResult): Promise<string> {
        const resultId = result.id || uuidv4();

        // Save to database if execution exists
        try {
            await executionStepRepository.create({
                executionId: result.runId,
                stepNumber: 0,  // Single result
                action: 'test',
                description: result.testName,
                selector: result.testFile,
                status: result.status as any,
                duration: result.duration,
                error: result.error?.message,
                screenshot: result.error?.screenshot,
                startedAt: result.startedAt,
                finishedAt: result.completedAt,
            });
        } catch (error: any) {
            // If execution doesn't exist, log but don't fail
            logger.debug(`Could not save result to database: ${error.message}`);
        }

        // Save to cache
        this.resultsCache.set(resultId, { ...result, id: resultId });

        // Save to file system as well
        await this.saveResultToFile(result);

        logger.debug(`Saved result ${resultId} for test ${result.testName}`);
        return resultId;
    }

    /**
     * Get a test result by ID
     */
    async getResult(resultId: string): Promise<TestResult | null> {
        // Check cache first
        if (this.resultsCache.has(resultId)) {
            return this.resultsCache.get(resultId)!;
        }

        // Try database
        try {
            const dbResult = await executionStepRepository.findById(resultId);

            if (dbResult) {
                const result = this.mapDbResultToTestResult(dbResult);
                this.resultsCache.set(resultId, result);
                return result;
            }
        } catch (error) {
            logger.warn(`Failed to get result from database: ${resultId}`);
        }

        // Try file system
        return this.loadResultFromFile(resultId);
    }

    /**
     * Get all results for a run
     */
    async getResultsForRun(runId: string): Promise<TestResult[]> {
        const results: TestResult[] = [];

        // Try database
        try {
            const dbResults = await executionStepRepository.findByExecutionId(runId);

            for (const dbResult of dbResults) {
                results.push(this.mapDbResultToTestResult(dbResult));
            }
        } catch (error) {
            logger.warn(`Failed to get results from database for run: ${runId}`);
        }

        // Check cache for additional results
        for (const result of this.resultsCache.values()) {
            if (result.runId === runId && !results.find(r => r.id === result.id)) {
                results.push(result);
            }
        }

        return results;
    }

    /**
     * Get all results for a test file
     */
    async getResultsForTest(testFile: string): Promise<TestResult[]> {
        const results: TestResult[] = [];

        // Search in cache
        for (const result of this.resultsCache.values()) {
            if (result.testFile === testFile) {
                results.push(result);
            }
        }

        // Try database
        try {
            const dbResults = await executionStepRepository.findBySelector(testFile);

            for (const dbResult of dbResults) {
                const result = this.mapDbResultToTestResult(dbResult);
                if (!results.find(r => r.id === result.id)) {
                    results.push(result);
                }
            }
        } catch (error) {
            logger.warn(`Failed to get results from database for test: ${testFile}`);
        }

        return results.sort((a, b) =>
            b.completedAt.getTime() - a.completedAt.getTime()
        );
    }

    /**
     * Get test history
     */
    async getHistory(testFile: string, limit: number = 50): Promise<TestResult[]> {
        const results = await this.getResultsForTest(testFile);
        return results.slice(0, limit);
    }

    /**
     * Get failures for a run
     */
    async getFailures(runId: string): Promise<TestResult[]> {
        const results = await this.getResultsForRun(runId);
        return results.filter(r => r.status === 'failed');
    }

    /**
     * Get flaky tests within a time range
     */
    async getFlaky(timeRange: DateRange): Promise<FlakyTest[]> {
        const flakyTests: Map<string, FlakyTest> = new Map();

        // Get all results in the time range from cache
        for (const result of this.resultsCache.values()) {
            if (result.completedAt >= timeRange.from && result.completedAt <= timeRange.to) {
                if (result.status === 'flaky' || (result.retries > 0 && result.status === 'passed')) {
                    const key = `${result.testFile}:${result.testName}`;
                    const existing = flakyTests.get(key);

                    if (existing) {
                        existing.flakyCount++;
                        existing.totalRuns++;
                        if (result.error?.message) {
                            existing.recentErrors.push(result.error.message);
                        }
                        if (result.completedAt > existing.lastOccurrence) {
                            existing.lastOccurrence = result.completedAt;
                        }
                    } else {
                        flakyTests.set(key, {
                            testFile: result.testFile,
                            testName: result.testName,
                            flakyCount: 1,
                            totalRuns: 1,
                            flakyRate: 0,
                            lastOccurrence: result.completedAt,
                            recentErrors: result.error?.message ? [result.error.message] : [],
                        });
                    }
                }
            }
        }

        // Calculate flaky rates
        for (const flaky of flakyTests.values()) {
            flaky.flakyRate = Math.round((flaky.flakyCount / flaky.totalRuns) * 100);
            flaky.recentErrors = flaky.recentErrors.slice(0, 5);  // Keep only 5 recent errors
        }

        return Array.from(flakyTests.values()).sort((a, b) => b.flakyRate - a.flakyRate);
    }

    /**
     * Get run summary
     */
    async getRunSummary(runId: string): Promise<RunSummary | null> {
        const results = await this.getResultsForRun(runId);

        if (results.length === 0) {
            // Try to get from database execution
            try {
                const execution = await executionRepository.findById(runId);

                if (execution) {
                    const [logs, steps] = await Promise.all([
                        executionLogRepository.findByExecutionId(runId),
                        executionStepRepository.findByExecutionId(runId),
                    ]);
                    return this.mapExecutionToSummary({ ...execution, logs, steps });
                }
            } catch (error) {
                logger.warn(`Failed to get run summary from database: ${runId}`);
            }
            return null;
        }

        const passed = results.filter(r => r.status === 'passed').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const skipped = results.filter(r => r.status === 'skipped').length;
        const flaky = results.filter(r => r.status === 'flaky').length;
        const total = results.length;

        const startedAt = results.reduce(
            (min, r) => (r.startedAt < min ? r.startedAt : min),
            results[0].startedAt
        );
        const completedAt = results.reduce(
            (max, r) => (r.completedAt > max ? r.completedAt : max),
            results[0].completedAt
        );

        const duration = completedAt.getTime() - startedAt.getTime();

        const status: TestStatus = failed > 0 ? 'failed' : 'passed';

        const failedTests = results
            .filter(r => r.status === 'failed')
            .map(r => ({
                testFile: r.testFile,
                testName: r.testName,
                error: r.error?.message || 'Unknown error',
            }));

        const flakyTests = results
            .filter(r => r.status === 'flaky' || r.retries > 0)
            .map(r => ({
                testFile: r.testFile,
                testName: r.testName,
                retriesNeeded: r.retries,
            }));

        return {
            runId,
            status,
            duration,
            total,
            passed,
            failed,
            skipped,
            flaky,
            passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
            startedAt,
            completedAt,
            failedTests,
            flakyTests,
        };
    }

    /**
     * Get trends for a test
     */
    async getTrends(testFile: string, days: number = 30): Promise<TrendData> {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const results = await this.getResultsForTest(testFile);

        const filteredResults = results.filter(r => r.completedAt >= cutoffDate);

        const dataPoints = filteredResults.map(r => ({
            date: r.completedAt,
            status: r.status,
            duration: r.duration,
            runId: r.runId,
        }));

        // Calculate average duration
        const durations = filteredResults.map(r => r.duration);
        const averageDuration = durations.length > 0
            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
            : 0;

        // Calculate pass rate
        const passed = filteredResults.filter(r => r.status === 'passed').length;
        const passRate = filteredResults.length > 0
            ? Math.round((passed / filteredResults.length) * 100)
            : 0;

        // Determine trend direction
        const recentResults = filteredResults.slice(0, 10);
        const olderResults = filteredResults.slice(10, 20);

        const recentPassRate = recentResults.length > 0
            ? recentResults.filter(r => r.status === 'passed').length / recentResults.length
            : 0;
        const olderPassRate = olderResults.length > 0
            ? olderResults.filter(r => r.status === 'passed').length / olderResults.length
            : 0;

        let trendDirection: 'improving' | 'stable' | 'degrading';
        if (recentPassRate > olderPassRate + 0.1) {
            trendDirection = 'improving';
        } else if (recentPassRate < olderPassRate - 0.1) {
            trendDirection = 'degrading';
        } else {
            trendDirection = 'stable';
        }

        return {
            testFile,
            testName: path.basename(testFile),
            dataPoints,
            averageDuration,
            passRate,
            trendDirection,
        };
    }

    /**
     * Export results to JUnit XML format
     */
    async exportToJUnit(runId: string): Promise<string> {
        const results = await this.getResultsForRun(runId);
        const summary = await this.getRunSummary(runId);

        if (!summary) {
            throw new Error(`Run not found: ${runId}`);
        }

        const testCases = results.map(r => {
            let caseXml = `    <testcase name="${this.escapeXml(r.testName)}" classname="${this.escapeXml(r.testFile)}" time="${r.duration / 1000}">`;

            if (r.status === 'failed') {
                caseXml += `
      <failure message="${this.escapeXml(r.error?.message || 'Unknown error')}">
${this.escapeXml(r.error?.stack || '')}
      </failure>`;
            } else if (r.status === 'skipped') {
                caseXml += `
      <skipped/>`;
            }

            caseXml += `
    </testcase>`;
            return caseXml;
        }).join('\n');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Run ${runId}" tests="${summary.total}" failures="${summary.failed}" skipped="${summary.skipped}" time="${summary.duration / 1000}">
  <testsuite name="Test Suite" tests="${summary.total}" failures="${summary.failed}" skipped="${summary.skipped}" time="${summary.duration / 1000}">
${testCases}
  </testsuite>
</testsuites>`;

        // Save to file
        const reportPath = path.join(STORAGE_PATH, runId, 'junit-report.xml');
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, xml);

        logger.info(`Exported JUnit report: ${reportPath}`);
        return xml;
    }

    /**
     * Export results to HTML format
     */
    async exportToHTML(runId: string): Promise<string> {
        const results = await this.getResultsForRun(runId);
        const summary = await this.getRunSummary(runId);

        if (!summary) {
            throw new Error(`Run not found: ${runId}`);
        }

        const testRows = results.map(r => {
            const statusClass = r.status === 'passed' ? 'passed' : r.status === 'failed' ? 'failed' : 'skipped';
            const statusIcon = r.status === 'passed' ? '&#10004;' : r.status === 'failed' ? '&#10006;' : '&#10148;';

            return `
        <tr class="${statusClass}">
          <td>${statusIcon} ${this.escapeHtml(r.testName)}</td>
          <td>${this.escapeHtml(r.testFile)}</td>
          <td><span class="status ${statusClass}">${r.status}</span></td>
          <td>${(r.duration / 1000).toFixed(2)}s</td>
          <td>${r.error ? this.escapeHtml(r.error.message) : '-'}</td>
        </tr>`;
        }).join('\n');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report - ${runId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
    header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; }
    h1 { font-size: 24px; margin-bottom: 10px; }
    .summary { display: flex; gap: 20px; margin-top: 20px; }
    .stat { background: rgba(255,255,255,0.2); padding: 15px 25px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { font-size: 12px; opacity: 0.9; margin-top: 5px; }
    .progress-bar { height: 8px; background: rgba(255,255,255,0.3); border-radius: 4px; margin-top: 20px; overflow: hidden; }
    .progress-fill { height: 100%; background: #4ade80; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; color: #666; }
    tr:hover { background: #f8f9fa; }
    .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .status.passed { background: #d1fae5; color: #059669; }
    .status.failed { background: #fee2e2; color: #dc2626; }
    .status.skipped { background: #fef3c7; color: #d97706; }
    tr.passed td:first-child { border-left: 3px solid #4ade80; }
    tr.failed td:first-child { border-left: 3px solid #f87171; }
    tr.skipped td:first-child { border-left: 3px solid #fbbf24; }
    footer { padding: 20px; text-align: center; color: #999; font-size: 14px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Test Report</h1>
      <p>Run ID: ${runId}</p>
      <div class="summary">
        <div class="stat">
          <div class="stat-value">${summary.total}</div>
          <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat">
          <div class="stat-value">${summary.passed}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="stat">
          <div class="stat-value">${summary.failed}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat">
          <div class="stat-value">${summary.skipped}</div>
          <div class="stat-label">Skipped</div>
        </div>
        <div class="stat">
          <div class="stat-value">${(summary.duration / 1000).toFixed(1)}s</div>
          <div class="stat-label">Duration</div>
        </div>
        <div class="stat">
          <div class="stat-value">${summary.passRate}%</div>
          <div class="stat-label">Pass Rate</div>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${summary.passRate}%"></div>
      </div>
    </header>

    <table>
      <thead>
        <tr>
          <th>Test Name</th>
          <th>File</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody>
${testRows}
      </tbody>
    </table>

    <footer>
      Generated by Vero Test Automation IDE on ${new Date().toISOString()}
    </footer>
  </div>
</body>
</html>`;

        // Save to file
        const reportPath = path.join(STORAGE_PATH, runId, 'report.html');
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, html);

        logger.info(`Exported HTML report: ${reportPath}`);
        return html;
    }

    /**
     * Save result to file system
     */
    private async saveResultToFile(result: TestResult): Promise<void> {
        const resultPath = path.join(STORAGE_PATH, result.runId, 'results', `${result.id}.json`);
        await fs.mkdir(path.dirname(resultPath), { recursive: true });
        await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
    }

    /**
     * Load result from file system
     */
    private async loadResultFromFile(resultId: string): Promise<TestResult | null> {
        // Try to find the result file
        try {
            const storageDirs = await fs.readdir(STORAGE_PATH);

            for (const dir of storageDirs) {
                const resultPath = path.join(STORAGE_PATH, dir, 'results', `${resultId}.json`);
                try {
                    const content = await fs.readFile(resultPath, 'utf-8');
                    const result = JSON.parse(content);
                    result.startedAt = new Date(result.startedAt);
                    result.completedAt = new Date(result.completedAt);
                    return result;
                } catch {
                    // File doesn't exist in this dir
                }
            }
        } catch {
            // Storage dir doesn't exist
        }

        return null;
    }

    /**
     * Map database result to TestResult
     */
    private mapDbResultToTestResult(dbResult: any): TestResult {
        return {
            id: dbResult.id,
            runId: dbResult.executionId,
            testFile: dbResult.selector || '',
            testName: dbResult.description || dbResult.action,
            status: dbResult.status as TestStatus,
            duration: dbResult.duration || 0,
            startedAt: dbResult.startedAt || new Date(),
            completedAt: dbResult.finishedAt || new Date(),
            error: dbResult.error ? {
                message: dbResult.error,
                screenshot: dbResult.screenshot,
            } : undefined,
            artifacts: [],
            retries: 0,
            browser: 'chromium',
        };
    }

    /**
     * Map execution to run summary
     */
    private mapExecutionToSummary(execution: any): RunSummary {
        const steps = execution.steps || [];
        const passed = steps.filter((s: any) => s.status === 'passed').length;
        const failed = steps.filter((s: any) => s.status === 'failed').length;
        const skipped = steps.filter((s: any) => s.status === 'skipped').length;
        const total = steps.length;

        return {
            runId: execution.id,
            status: execution.status as TestStatus,
            duration: execution.finishedAt && execution.startedAt
                ? new Date(execution.finishedAt).getTime() - new Date(execution.startedAt).getTime()
                : 0,
            total,
            passed,
            failed,
            skipped,
            flaky: 0,
            passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
            startedAt: execution.startedAt || new Date(),
            completedAt: execution.finishedAt,
            failedTests: steps
                .filter((s: any) => s.status === 'failed')
                .map((s: any) => ({
                    testFile: s.selector || '',
                    testName: s.description || s.action,
                    error: s.error || 'Unknown error',
                })),
            flakyTests: [],
        };
    }

    /**
     * Escape XML special characters
     */
    private escapeXml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Escape HTML special characters
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Clear results cache
     */
    clearCache(): void {
        this.resultsCache.clear();
        this.runsCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { results: number; runs: number } {
        return {
            results: this.resultsCache.size,
            runs: this.runsCache.size,
        };
    }
}

// Export singleton instance
export const resultManager = new ResultManager();
