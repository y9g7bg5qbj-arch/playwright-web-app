# Scheduling - Expert Skill

Auto-invoke when working with schedules, cron parsing, queue workers, or webhook triggers.

---

## Architecture Overview

```
Schedule Created (IDE)
    ↓
Stored in Database
    ↓
Scheduler Service (polls every minute)
    ↓
Due schedule found → Queue job dispatched
    ↓
┌─────────────────────────────────────────┐
│              Queue Worker               │
│  ┌─────────────────────────────────┐   │
│  │ executionTarget = 'local'       │   │
│  │ → Run Playwright directly       │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ executionTarget = 'github-actions'│  │
│  │ → Trigger workflow dispatch     │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
    ↓
Results stored → Notifications sent
```

---

## Key Files

| File | Purpose |
|------|---------|
| `/backend/src/services/schedule.service.ts` | Main CRUD & trigger logic |
| `/backend/src/services/scheduler/SchedulerService.ts` | In-memory scheduler |
| `/backend/src/services/scheduler/cronParser.ts` | Cron validation & calculation |
| `/backend/src/services/queue/QueueService.ts` | BullMQ wrapper |
| `/backend/src/services/queue/workers/scheduleRunWorker.ts` | Job processor |
| `/backend/src/routes/schedule.routes.ts` | REST endpoints |
| `/backend/src/validators/schedule.validators.ts` | Input validation |

---

## Schedule Model

```prisma
model Schedule {
    id                    String   @id
    userId                String
    workflowId            String?
    name                  String
    description           String?
    cronExpression        String
    timezone              String   @default("UTC")
    testSelector          Json     // { tags, folders, patterns, testFlowIds }
    notificationConfig    Json?
    isActive              Boolean  @default(true)
    nextRunAt             DateTime?
    lastRunAt             DateTime?
    webhookToken          String   // 64-char hex
    parameters            Json?    // ScheduleParameterDefinition[]
    defaultExecutionConfig Json?

    // Execution target
    executionTarget       String   @default("local")  // local | github-actions

    // GitHub Actions config (when target = github-actions)
    githubRepoFullName    String?
    githubBranch          String?
    githubWorkflowFile    String?
    githubInputs          Json?

    runs                  ScheduleRun[]
}
```

---

## Cron Expression Handling

### Standard 5-Field Format

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6, Sun=0)
│ │ │ │ │
* * * * *
```

### Supported Syntax

```
*        Any value
5        Specific value
1-5      Range
*/15     Step (every 15)
1,3,5    List
```

### Named Aliases

| Alias | Expression | Description |
|-------|------------|-------------|
| `@yearly` | `0 0 1 1 *` | Once a year (Jan 1) |
| `@monthly` | `0 0 1 * *` | Once a month (1st) |
| `@weekly` | `0 0 * * 0` | Once a week (Sunday) |
| `@daily` | `0 0 * * *` | Once a day (midnight) |
| `@hourly` | `0 * * * *` | Once an hour |
| `@midnight` | `0 0 * * *` | Same as @daily |

### Common Patterns

```typescript
const SCHEDULE_PRESETS = [
    { label: 'Every night at 2 AM', cron: '0 2 * * *' },
    { label: 'Every morning at 6 AM', cron: '0 6 * * *' },
    { label: 'Every hour', cron: '0 * * * *' },
    { label: 'Every Monday at 6 AM', cron: '0 6 * * 1' },
    { label: 'Every weekday at 8 AM', cron: '0 8 * * 1-5' },
    { label: 'Every 30 minutes', cron: '*/30 * * * *' },
];
```

### Cron Parser Functions

```typescript
// Validate expression
validateCronExpression(cron: string): { valid: boolean; error?: string }

// Parse into fields
parseCronExpression(cron: string): CronFields

// Calculate next run (with timezone)
getNextRunTime(cron: string, timezone: string): Date

// Get multiple upcoming runs
getNextRunTimes(cron: string, count: number, timezone: string): Date[]

// Human-readable description
describeCronExpression(cron: string): string
// "0 9 * * 1-5" → "At 9:00 AM, Monday through Friday"
```

---

## Jenkins-like Parameter System

### Parameter Definition

```typescript
interface ScheduleParameterDefinition {
    name: string;               // Variable key
    label: string;              // Display label
    type: 'string' | 'number' | 'boolean' | 'choice';
    required: boolean;
    defaultValue: string | number | boolean;
    description?: string;

    // Type-specific
    pattern?: string;           // Regex for string
    min?: number;               // For number
    max?: number;               // For number
    choices?: string[];         // For choice
}
```

### Example Parameters

```typescript
parameters: [
    {
        name: 'environment',
        label: 'Test Environment',
        type: 'choice',
        required: true,
        defaultValue: 'staging',
        choices: ['dev', 'staging', 'prod']
    },
    {
        name: 'browser',
        label: 'Browser',
        type: 'choice',
        defaultValue: 'chromium',
        choices: ['chromium', 'firefox', 'webkit']
    },
    {
        name: 'retries',
        label: 'Retry Count',
        type: 'number',
        defaultValue: 0,
        min: 0,
        max: 5
    },
    {
        name: 'baseUrl',
        label: 'Base URL Override',
        type: 'string',
        required: false,
        pattern: '^https?://.+'
    }
]
```

### Parameter Validation

```typescript
validateParameterValues(
    definitions: ScheduleParameterDefinition[],
    values: Record<string, any>
): { valid: boolean; errors: string[] }

// Checks:
// - Required parameters present
// - Type matches (string, number, boolean)
// - Number within min/max bounds
// - String matches pattern regex
// - Choice value in allowed list
```

---

## Trigger Types

| Type | Source | Priority |
|------|--------|----------|
| `scheduled` | Cron job | 1 (normal) |
| `manual` | User click in IDE | 2 (high) |
| `webhook` | External HTTP call | 1 (normal) |
| `api` | API call | 1 (normal) |

---

## Webhook System

### Token Generation

```typescript
// 64-character cryptographically secure hex token
const webhookToken = crypto.randomBytes(32).toString('hex');
// Example: "a1b2c3d4e5f6...64chars"
```

### Webhook URL

```
POST https://vero.example.com/api/schedules/webhook/{token}

# No authentication required - token IS the auth
```

### Webhook Trigger Flow

```typescript
// POST /api/schedules/webhook/:token
router.post('/webhook/:token', async (req, res) => {
    // 1. Validate token format
    if (!/^[a-f0-9]{64}$/i.test(token)) {
        return res.status(400).json({ error: 'Invalid token format' });
    }

    // 2. Find schedule by token
    const schedule = await prisma.schedule.findFirst({
        where: { webhookToken: token }
    });

    if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
    }

    // 3. Create run and dispatch to queue
    const run = await scheduleService.triggerRun(
        schedule.id,
        'webhook',
        req.body.parameterValues
    );

    return res.status(202).json({ runId: run.id });
});
```

### Token Regeneration

```typescript
// POST /api/schedules/:id/webhook/regenerate
await prisma.schedule.update({
    where: { id: scheduleId },
    data: { webhookToken: crypto.randomBytes(32).toString('hex') }
});
```

---

## Queue System

### BullMQ with Redis

```typescript
const queueService = new QueueService({
    redis: { host: 'localhost', port: 6379 }
});

// Fallback to in-memory if Redis unavailable
if (!redisAvailable) {
    queueService.useInMemoryFallback();
}
```

### Queue Names

```typescript
const QUEUE_NAMES = {
    SCHEDULE_RUN: 'schedule-run',
    EXECUTION: 'execution',
    GITHUB_WORKFLOW: 'github-workflow',
    NOTIFICATION: 'notification'
};
```

### Job Dispatch

```typescript
// scheduleService.triggerRun()
await queueService.add(QUEUE_NAMES.SCHEDULE_RUN, {
    scheduleId: schedule.id,
    runId: run.id,
    parameterValues,
    executionConfig,
    triggeredBy: userEmail || 'system'
}, {
    priority: triggerType === 'manual' ? 2 : 1,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }
});
```

### Worker Processing

```typescript
// scheduleRunWorker.ts
async function processScheduleRunJob(job: Job<ScheduleRunJobData>) {
    const { scheduleId, runId, parameterValues, executionConfig } = job.data;

    const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId }
    });

    if (schedule.executionTarget === 'local') {
        // Run tests directly via Playwright
        await executeLocalTests(schedule, runId, parameterValues);
    } else if (schedule.executionTarget === 'github-actions') {
        // Trigger GitHub workflow
        await executeViaGitHubActions(schedule, runId, parameterValues);
    }

    // Update run status
    await scheduleService.markRunComplete(runId, results);

    // Send notifications
    await notificationService.sendRunComplete(schedule, run);
}
```

---

## Dual Execution Target

### Local Execution

```typescript
executionTarget: 'local'
// → Run Playwright directly on host machine
// → Results stored in ScheduleRun
// → Artifacts saved locally
```

### GitHub Actions Execution

```typescript
executionTarget: 'github-actions'
githubRepoFullName: 'owner/repo'
githubBranch: 'main'
githubWorkflowFile: 'vero-tests.yml'
githubInputs: {
    shard_count: '2',
    browser: 'chromium'
}
// → Dispatch GitHub workflow
// → Poll for completion
// → Link githubRunId to ScheduleRun
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/schedules` | Create schedule |
| GET | `/api/schedules` | List schedules |
| GET | `/api/schedules/:id` | Get schedule details |
| PUT | `/api/schedules/:id` | Update schedule |
| DELETE | `/api/schedules/:id` | Delete schedule |
| POST | `/api/schedules/:id/toggle` | Enable/disable |
| POST | `/api/schedules/:id/trigger` | Manual trigger |
| GET | `/api/schedules/:id/runs` | Run history |
| GET | `/api/schedules/:id/webhook` | Get webhook info |
| POST | `/api/schedules/:id/webhook/regenerate` | Regenerate token |
| GET | `/api/schedules/runs/:runId` | Specific run details |
| POST | `/api/schedules/validate-cron` | Validate cron |
| POST | `/api/schedules/webhook/:token` | Webhook trigger |

---

## Notification Config

```typescript
interface ScheduleNotificationConfig {
    email?: string[];
    slack?: {
        webhook: string;
        channel?: string;
        onFailureOnly?: boolean;
    };
    webhook?: {
        url: string;
        method: 'POST' | 'PUT';
        includeResults?: boolean;
    };
}
```

---

## Common Tasks

### Adding New Parameter Type

1. Update type in `/shared/src/types.ts`:
   - Add to `ScheduleParameterType`
   - Add type-specific fields to `ScheduleParameterDefinition`

2. Update validation in `/backend/src/services/schedule.service.ts`:
   - Add case to `validateParameterValues()`

3. Update frontend parameter input component

### Modifying Queue Behavior

Update `/backend/src/services/queue/QueueService.ts`:
- Change retry logic
- Adjust backoff strategy
- Modify priority levels

### Adding New Trigger Type

1. Add to `ScheduleTriggerType` enum
2. Update `triggerRun()` to handle new type
3. Update queue priority if needed

---

## Gotchas

1. **Timezone Handling**: Always store in UTC, convert for display.
2. **Cron Parsing**: Use libraries like `croner` or `node-cron` for edge cases.
3. **Redis Fallback**: In-memory queue loses jobs on restart.
4. **Webhook Security**: Token IS the auth - keep it secret.
5. **Parameter Defaults**: Always merge defaults with provided values.
6. **Next Run Calculation**: Update `nextRunAt` after EVERY run (success or fail).
