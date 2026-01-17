# Reports - Trace Viewer & Artifacts Expert Skill

Auto-invoke when working with execution dashboard, trace viewer, artifact storage, or report generation.

---

## Architecture Overview

```
Test Execution
    ↓
ExecutionEngine collects artifacts
    ↓
ArtifactManager stores (local/S3/GCS)
    ↓
ResultManager aggregates results
    ↓
┌─────────────────────────────────────────┐
│           Execution Dashboard           │
│  ┌─────────────────────────────────┐   │
│  │ ExecutionCard (metadata)        │   │
│  │   → ExecutionReport (summary)   │   │
│  │     → ScenarioRow (per test)    │   │
│  │       → View Trace button       │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
    ↓
TraceViewerPanel (embedded/local)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `/backend/src/services/traceViewer/TraceServer.ts` | Serves traces to trace.playwright.dev |
| `/backend/src/services/traceViewer/TraceAnalyzer.ts` | Analyzes traces for insights |
| `/backend/src/services/results/ResultManager.ts` | Result aggregation & export |
| `/backend/src/services/artifacts/ArtifactManager.ts` | Artifact storage |
| `/backend/src/services/artifacts/StorageBackend.ts` | Storage abstraction |
| `/backend/src/services/screenshotService.ts` | Screenshot handling |
| `/frontend/src/components/ExecutionDashboard/` | Dashboard UI |
| `/frontend/src/components/TraceViewer/TraceViewerPanel.tsx` | Viewer UI |

---

## Trace Server

### Session Management

```typescript
interface TraceSession {
    id: string;
    traceRef: ArtifactRef;
    createdAt: Date;
    expiresAt: Date;       // Default: 60 minutes
    accessCount: number;
}

// Create session for trace access
const session = traceServer.createSession(traceRef);
// Returns URL: /api/executions/{id}/trace
```

### Routes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| HEAD | `/:id/trace` | Check trace exists |
| GET | `/:id/trace` | Download trace file (CORS-enabled) |
| POST | `/:id/trace/view` | Launch local Playwright viewer |

### Trace Viewer URL

```typescript
// For trace.playwright.dev embedding
const traceUrl = `https://trace.playwright.dev/?trace=${encodeURIComponent(absoluteTraceUrl)}`;

// For local viewer
await spawn('npx', ['playwright', 'show-trace', tracePath]);
```

---

## Trace Analyzer

### Analysis Methods

```typescript
class TraceAnalyzer {
    // Find first failure with context
    async getFailurePoint(traceRef: ArtifactRef): Promise<{
        action: string;
        error: string;
        screenshot?: string;
        line?: number;
    }>;

    // Performance bottlenecks
    async getSlowActions(
        traceRef: ArtifactRef,
        threshold: number = 1000
    ): Promise<SlowAction[]>;

    // Network statistics
    async getNetworkStats(traceRef: ArtifactRef): Promise<{
        totalRequests: number;
        successCount: number;
        failureCount: number;
        totalTransferSize: number;
        avgResponseTime: number;
        slowestRequests: NetworkRequest[];
        byResourceType: Record<string, number>;
        byStatusCode: Record<number, number>;
    }>;

    // Compare two traces
    async compareTraces(
        trace1: ArtifactRef,
        trace2: ArtifactRef
    ): Promise<TraceDiff>;

    // Overall metrics
    async getPerformanceSummary(traceRef: ArtifactRef): Promise<{
        totalDuration: number;
        actionCount: number;
        slowestAction: Action;
        fastestAction: Action;
        networkTime: number;
        idleTime: number;
    }>;

    // Console output
    async getConsoleSummary(traceRef: ArtifactRef): Promise<{
        logs: ConsoleMessage[];
        errorCount: number;
        warningCount: number;
    }>;

    // AI-friendly error analysis
    async generateSuggestion(failure: FailurePoint): Promise<string>;
}
```

---

## Artifact Manager

### Storage Structure

```
storage/
├── artifacts/
│   ├── traces/{testId}/trace-{testId}.zip
│   ├── screenshots/{testId}/{name-timestamp}.png
│   ├── videos/{testId}/video-{testId}.webm
│   ├── reports/{testId}/{name}.html
│   ├── data/{testId}/{name}.json
│   ├── logs/{testId}/{name}.log
│   └── .artifact-index.json
└── {executionId}/
    ├── trace/trace.zip
    ├── test-results/
    └── results/{resultId}.json
```

### Artifact Reference

```typescript
interface ArtifactRef {
    id: string;
    testId: string;
    runId?: string;
    type: 'trace' | 'screenshot' | 'video' | 'html' | 'json' | 'log';
    name: string;
    path: string;
    size: number;
    mimeType: string;
    createdAt: Date;
    metadata?: Record<string, any>;
}
```

### Core Methods

```typescript
class ArtifactManager {
    // Store artifact
    async store(
        testId: string,
        type: ArtifactType,
        name: string,
        content: Buffer | Readable,
        metadata?: Record<string, any>
    ): Promise<ArtifactRef>;

    // Retrieve
    async getArtifactsForTest(testId: string): Promise<ArtifactRef[]>;
    async getArtifactsForRun(runId: string): Promise<ArtifactRef[]>;
    async getArtifactById(artifactId: string): Promise<ArtifactRef | null>;
    async getArtifactStream(artifactId: string): Promise<Readable>;

    // Cleanup
    async cleanup(olderThan: Date): Promise<number>;
    async deleteArtifactsForTest(testId: string): Promise<void>;

    // Stats
    async getStorageStats(): Promise<{
        totalSize: number;
        byType: Record<ArtifactType, number>;
    }>;
}
```

### Storage Backends

```typescript
// Local file system
class LocalStorageBackend implements StorageBackend {
    async store(path: string, content: Buffer): Promise<void>;
    async retrieve(path: string): Promise<Buffer>;
    async delete(path: string): Promise<void>;
    async exists(path: string): Promise<boolean>;
    async getStream(path: string): Promise<Readable>;
}

// Extensible for cloud
// - S3StorageBackend
// - GCSStorageBackend
```

---

## Result Manager

### Test Result Model

```typescript
interface TestResult {
    id: string;
    testId: string;
    testPath: string;
    testName: string;
    runId: string;
    status: 'passed' | 'failed' | 'skipped' | 'timedOut';
    duration: number;
    error?: {
        message: string;
        stack?: string;
        screenshot?: string;
        diff?: string;
    };
    artifacts: ArtifactRef[];
    retryCount?: number;
    retriedBy?: string;
    startedAt: Date;
    finishedAt: Date;
}
```

### Aggregation Methods

```typescript
class ResultManager {
    // Store result
    async saveResult(result: TestResult): Promise<void>;

    // Query
    async getResultsForRun(runId: string): Promise<TestResult[]>;
    async getResultsForTest(testFile: string): Promise<TestResult[]>;
    async getRunSummary(runId: string): Promise<RunSummary>;

    // History & Trends
    async getHistory(testFile: string, limit: number): Promise<TestResult[]>;
    async getTrends(testFile: string, days: number): Promise<TrendData>;
    async getFlaky(timeRange: { start: Date; end: Date }): Promise<FlakyTest[]>;

    // Failures
    async getFailures(runId: string): Promise<TestResult[]>;

    // Export
    async exportToJUnit(runId: string): Promise<string>;  // XML
    async exportToHTML(runId: string): Promise<string>;   // Styled HTML
}
```

### Run Summary

```typescript
interface RunSummary {
    runId: string;
    status: string;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    duration: number;
    passRate: number;      // 0-100
    failedTests: string[];
    flakyTests: string[];
}
```

### Trend Analysis

```typescript
interface TrendData {
    testFile: string;
    testName: string;
    dataPoints: Array<{
        date: Date;
        status: string;
        duration: number;
        runId: string;
    }>;
    averageDuration: number;
    passRate: number;
    trendDirection: 'improving' | 'stable' | 'degrading';
}
```

---

## Screenshot Service

### Storage & Retrieval

```typescript
class ScreenshotService {
    // Save step screenshot
    async saveStepScreenshot(
        sessionId: string,
        stepNumber: number,
        buffer: Buffer,
        options?: { format: 'png' | 'jpeg'; quality?: number }
    ): Promise<ScreenshotRef>;

    // Retrieve
    async getSessionScreenshots(sessionId: string): Promise<ScreenshotRef[]>;
    async getStepScreenshot(sessionId: string, stepNumber: number): Promise<Buffer>;

    // Cleanup
    async cleanupSession(sessionId: string): Promise<void>;
    async cleanupOldSessions(olderThanDays: number): Promise<number>;

    // URL generation
    getScreenshotUrl(sessionId: string, filename: string): string;

    // Conversion
    bufferToDataUrl(buffer: Buffer, mimeType: string): string;
}
```

### File Naming

```
step-001-1704067200000.png
step-002-1704067201000.png
...
```

---

## Frontend Components

### ExecutionDashboard

```typescript
// Lists all executions with metadata
<ExecutionDashboard>
    <ExecutionCard execution={execution}>
        <ExecutionReport>
            <ScenarioRow scenario={scenario}>
                <ViewTraceButton onClick={onViewTrace} />
            </ScenarioRow>
        </ExecutionReport>
    </ExecutionCard>
</ExecutionDashboard>
```

### ExecutionReport

```typescript
// Allure-style summary
interface ExecutionReportProps {
    execution: Execution;
    scenarios: ScenarioResult[];
}

// Displays:
// - Progress bar (passed/failed/skipped %)
// - Stats summary
// - Scenario list
// - Quick actions (download, re-run)
```

### ScenarioRow

```typescript
// Individual test display
interface ScenarioRowProps {
    scenario: ScenarioResult;
    onViewTrace: () => void;
}

// Shows:
// - Status icon (pass/fail/skip)
// - Duration
// - Screenshot thumbnails
// - Error message (if failed)
// - Step-by-step breakdown
// - Logs panel
// - Attachments panel
// - "View Trace" button
```

### TraceViewerPanel

```typescript
// Display modes:
// 1. Embedded (iframe to trace.playwright.dev)
// 2. Local (launch npx playwright show-trace)

interface TraceViewerPanelProps {
    traceUrl: string;
    executionId: string;
}

// Actions:
// - Open Local Viewer
// - Open External (new tab)
// - Download Trace (.zip)
// - Toggle Embedded/Local
// - Fullscreen
```

---

## Export Formats

### JUnit XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Vero Tests" tests="10" failures="2" time="45.5">
    <testsuite name="Login" tests="3" failures="1">
        <testcase name="User can login" time="5.2" />
        <testcase name="Invalid credentials" time="3.1">
            <failure message="Expected error message">
                Stack trace...
            </failure>
        </testcase>
    </testsuite>
</testsuites>
```

### HTML Report

```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Report - Run #123</title>
    <style>/* Styled with progress bars, colors */</style>
</head>
<body>
    <h1>Test Report</h1>
    <div class="summary">
        <div class="progress-bar">
            <div class="passed" style="width: 80%"></div>
            <div class="failed" style="width: 20%"></div>
        </div>
        <p>8 passed, 2 failed, 0 skipped</p>
    </div>
    <table class="results">
        <tr class="passed"><td>Login Test</td><td>5.2s</td></tr>
        <tr class="failed"><td>Checkout Test</td><td>Error: ...</td></tr>
    </table>
</body>
</html>
```

---

## Common Tasks

### Adding New Artifact Type

1. Update `ArtifactType` in types
2. Update `ArtifactManager.store()` to handle new type
3. Update storage path pattern
4. Add retrieval method if needed

### Customizing HTML Report

Update `ResultManager.exportToHTML()`:
- Modify template structure
- Add new sections/metrics
- Update styling

### Adding Storage Backend

1. Create class implementing `StorageBackend`:

```typescript
class S3StorageBackend implements StorageBackend {
    async store(path, content): Promise<void>;
    async retrieve(path): Promise<Buffer>;
    async delete(path): Promise<void>;
    async exists(path): Promise<boolean>;
    async getStream(path): Promise<Readable>;
}
```

2. Update `ArtifactManager` to use backend based on config

---

## Gotchas

1. **Trace Expiration**: Sessions expire after 60 minutes by default.
2. **CORS Required**: trace.playwright.dev needs CORS headers on trace endpoint.
3. **Large Files**: Use streams for videos/large traces.
4. **Cleanup**: Run artifact cleanup periodically (cron job).
5. **Base64 Size**: Screenshot base64 can bloat responses - consider URLs instead.
6. **Local vs Embedded**: Embedded viewer only works with public URLs.
