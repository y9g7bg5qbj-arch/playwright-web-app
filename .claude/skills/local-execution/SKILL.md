# Local Execution - Expert Skill

Auto-invoke when working with execution engine, sharding, workers, or parallel execution.

---

## Architecture Overview

```
API Request: POST /api/execution/parallel
         ↓
testCoordinator.createSession(tests, config)
         ↓
Select Sharding Strategy
         ↓
strategy.distribute(tests, workerCount)
         ↓
┌──────────────┬──────────────┬──────────────┐
│   Worker 1   │   Worker 2   │   Worker 3   │
│   Shard 1    │   Shard 2    │   Shard 3    │
└──────────────┴──────────────┴──────────────┘
         ↓
Results aggregation → Session complete
```

**Important**: Local execution runs directly on host machine via Playwright. Docker VNC containers are ONLY used for parallel workers (live browser viewing), NOT for basic local execution.

---

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `/backend/src/services/execution/engine.ts` | 816 | Core engine - browser lifecycle, context, artifacts |
| `/backend/src/services/execution/coordinator.ts` | 625 | Orchestrates workers, manages sessions |
| `/backend/src/services/execution/worker.ts` | 554 | Executes assigned tests, reports results |
| `/backend/src/services/sharding/types.ts` | 237 | Type definitions |
| `/backend/src/services/sharding/strategies/` | - | 5 strategy implementations |
| `/backend/src/routes/parallel.routes.ts` | 518 | REST API endpoints |
| `/backend/src/routes/sharding.routes.ts` | 150+ | VNC streaming, shard monitoring |

---

## Execution Session Model

```typescript
interface ExecutionSession {
    id: string;
    testFiles: TestFile[];
    allocations: TestAllocation[];    // Tests per shard
    config: ParallelExecutionConfig;
    status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
    progress: ExecutionProgress;
    shards: Map<string, ShardStatus>;
    results: TestResult[];
    startedAt: Date;
    finishedAt?: Date;
}

interface ExecutionProgress {
    total: number;
    completed: number;
    passed: number;
    failed: number;
    skipped: number;
    running: number;
    pending: number;
    percentage: number;
}
```

---

## 5 Sharding Strategies

### 1. Round-Robin (`RoundRobinStrategy`)

Distributes tests in order across workers by priority.

```typescript
// Tests: [A, B, C, D, E, F] → 3 workers
// Worker 1: [A, D]
// Worker 2: [B, E]
// Worker 3: [C, F]
```

**Best for**: Tests with similar duration.

### 2. Duration-Based (`DurationBasedStrategy`) - LPT Algorithm

Greedy assignment to least-loaded worker (Longest Processing Time first).

```typescript
distribute(tests, workerCount) {
    // 1. Sort tests by duration (longest first)
    const sorted = sortByDuration(tests);

    // 2. Assign each to worker with least total time
    for (const test of sorted) {
        const shortestWorker = findShortestAllocation(allocations);
        addTestToAllocation(shortestWorker, test);
    }
}
```

**Best for**: Minimizing total execution time.

### 3. File-Based (`FileBasedStrategy`)

Groups tests by folder structure, keeps related tests together.

```typescript
// /tests/auth/login.spec.ts → Worker 1
// /tests/auth/logout.spec.ts → Worker 1
// /tests/checkout/cart.spec.ts → Worker 2
```

**Best for**: Tests with directory isolation requirements.

### 4. Tag-Based (`TagBasedStrategy`)

Groups tests by @tags, supports grouping or distributing by tag.

```typescript
// @smoke tests → Worker 1
// @e2e tests → Worker 2
// @regression tests → Worker 3
```

**Best for**: Feature-based test organization.

### 5. Fail-First (`FailFirstStrategy`)

Runs previously failed tests first, then others by duration.

```typescript
distribute(tests, workerCount) {
    // 1. Separate failed vs passed tests
    const failed = tests.filter(t => t.lastResult === 'failed');
    const others = tests.filter(t => t.lastResult !== 'failed');

    // 2. Failed tests get priority
    // 3. Remaining distributed by duration
}
```

**Best for**: Fast CI/CD feedback (fail fast).

---

## Strategy Selection

```typescript
function createStrategy(type: string): ShardingStrategy {
    switch (type) {
        case 'round-robin': return new RoundRobinStrategy();
        case 'duration': return new DurationBasedStrategy();
        case 'file': return new FileBasedStrategy();
        case 'tag': return new TagBasedStrategy();
        case 'fail-first': return new FailFirstStrategy();
        default: return new RoundRobinStrategy();
    }
}
```

---

## Worker Management

### Worker Registration

```typescript
interface Worker {
    id: string;
    name: string;
    type: 'local' | 'remote';
    host: string;
    port: number;
    capabilities: {
        browsers: string[];        // chromium, firefox, webkit
        maxConcurrent: number;
        tags?: string[];
        memory?: number;           // MB
        cpu?: number;              // cores
    };
    status: 'idle' | 'busy' | 'offline' | 'error';
    lastHeartbeat: Date;
    currentTests?: string[];
}
```

### Heartbeat Protocol

- Workers send heartbeat every **30 seconds**
- Timeout threshold: **90 seconds**
- Health monitor runs every 30 seconds
- Failed workers trigger rebalancing

```typescript
startHealthMonitor() {
    setInterval(() => {
        for (const worker of this.workers.values()) {
            const elapsed = now - worker.lastHeartbeat.getTime();

            if (elapsed > HEARTBEAT_TIMEOUT) {
                worker.status = 'offline';
                this.handleWorkerFailure(worker.id);
            }
        }
    }, HEARTBEAT_INTERVAL);
}
```

---

## Rebalancing on Worker Failure

```typescript
rebalance(sessionId: string): TestAllocation[] | null {
    // 1. Get remaining tests (not yet completed)
    const completedTestIds = new Set(session.results.map(r => r.testId));
    const remainingTests = session.testFiles.filter(
        t => !completedTestIds.has(t.id)
    );

    // 2. Get available workers
    const availableWorkers = this.getAvailableWorkers();

    // 3. Create new allocations
    const newAllocations = strategy.distribute(remainingTests, availableWorkers);

    return newAllocations;
}
```

---

## Result Collection

### Per-Test Result

```typescript
interface TestResult {
    testId: string;
    testPath: string;
    testName: string;
    workerId: string;
    shardIndex: number;
    status: 'passed' | 'failed' | 'skipped' | 'timedOut';
    duration: number;
    error?: string;
    errorStack?: string;
    retryCount?: number;

    // Artifacts
    screenshots?: string[];
    traceUrl?: string;
    videoUrl?: string;

    startedAt: Date;
    finishedAt: Date;
}
```

### Result Reporting Flow

```typescript
reportTestResult(sessionId: string, result: TestResult) {
    // 1. Add result to session
    session.results.push(result);

    // 2. Update session progress
    session.progress.completed++;
    session.progress.pending--;

    // 3. Update shard progress
    shard.results.push(result);
    shard.progress.completed++;

    // 4. Check if shard complete
    if (shard.progress.completed === shard.progress.total) {
        shard.status = 'completed';
        markWorkerAsIdle(shard.workerId);
    }

    // 5. Check if session complete
    if (allShardsComplete()) {
        completeSession(sessionId);
    }
}
```

---

## Docker VNC Containers (Parallel Workers Only)

**Note**: VNC containers are for parallel worker visualization only, not for basic local execution.

```typescript
interface Worker {
    id: string;
    type: 'docker';
    vncPort: number;              // e.g., 6081, 6082
    vncUrl: string;               // http://localhost:6081/vnc.html
}

// VNC streams endpoint
GET /api/sharding/executions/:id/streams
    → Returns VNC URLs for all shards in execution
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/execution/parallel` | Start parallel execution |
| GET | `/api/execution/parallel/:sessionId/status` | Get progress |
| GET | `/api/execution/parallel/:sessionId/results` | Get results |
| POST | `/api/execution/parallel/:sessionId/cancel` | Cancel execution |
| POST | `/api/workers/register` | Register worker |
| POST | `/api/workers/:id/heartbeat` | Send heartbeat |
| POST | `/api/workers/:id/result` | Report test result |
| GET | `/api/sharding/workers` | List workers with VNC URLs |
| GET | `/api/sharding/executions/:id/streams` | Get VNC streams |
| POST | `/api/execution/parallel/strategies/preview` | Preview distribution |

---

## Common Tasks

### Adding a New Sharding Strategy

1. Create file: `/backend/src/services/sharding/strategies/NewStrategy.ts`
2. Extend `BaseStrategy`:

```typescript
export class NewStrategy extends BaseStrategy {
    distribute(tests: TestFile[], workerCount: number): TestAllocation[] {
        // Your distribution logic
    }
}
```

3. Register in `/backend/src/services/sharding/strategies/index.ts`
4. Add to `createStrategy()` switch statement

### Modifying Worker Heartbeat

Update `/backend/src/services/execution/coordinator.ts`:
- `HEARTBEAT_INTERVAL` - How often workers ping
- `HEARTBEAT_TIMEOUT` - When to mark offline
- `startHealthMonitor()` - Health check logic

### Adding Custom Worker Capabilities

Update `Worker` interface in `/backend/src/services/execution/types.ts`:
- Add new capability fields
- Update worker registration logic
- Update allocation filtering

---

## Gotchas

1. **Local vs Docker**: Basic execution = direct Playwright. Docker = parallel workers only.
2. **LPT Algorithm**: Duration-based is greedy, not optimal for all cases.
3. **Heartbeat Timing**: 30s interval, 90s timeout = 2 missed heartbeats = offline.
4. **Rebalancing**: Only redistributes remaining tests, completed results preserved.
5. **VNC Ports**: Auto-assigned, check for port conflicts.
6. **Stateless Workers**: Workers are ephemeral, no persistent state required.
