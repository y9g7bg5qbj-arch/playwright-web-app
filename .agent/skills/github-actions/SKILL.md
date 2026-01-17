# GitHub Actions - Remote Execution Expert Skill

Auto-invoke when working with GitHub integration, workflow generation, or remote execution.

---

## Architecture Overview

```
Vero IDE (Frontend)
    ↓ Click "Run on GitHub Actions"
Backend: GitHub Service
    ↓ Trigger workflow dispatch
GitHub Actions (Remote)
    ↓ Execute tests in parallel
    ↓ Generate artifacts
Vero Backend: Polling/Webhooks
    ↓ Fetch results
Frontend: Display Results
```

---

## Key Files

| File | Purpose |
|------|---------|
| `/backend/src/services/github.service.ts` | Core GitHub API (encrypted tokens) |
| `/backend/src/services/workflowGenerator.service.ts` | YAML workflow generation |
| `/backend/src/routes/github.routes.ts` | REST endpoints |
| `/backend/templates/github-workflow.yml` | Workflow template |
| `/frontend/src/api/github.ts` | Frontend API client |

---

## Token Management

### Encryption

Tokens encrypted using **AES-256-CBC** with scrypt key derivation before storage.

```typescript
// Encryption on save
const encrypted = encrypt(accessToken);  // AES-256-CBC
await prisma.gitHubIntegration.create({
    data: { accessToken: encrypted, ... }
});

// Decryption on use
const token = decrypt(integration.accessToken);
```

### Database Models

```prisma
model GitHubIntegration {
    id          String   @id
    userId      String   @unique
    accessToken String   // Encrypted
    tokenType   String   // 'oauth' | 'pat'
    login       String   // GitHub username
    scopes      String[] // Token scopes
}

model GitHubRepositoryConfig {
    workflowId      String
    repoFullName    String   // "owner/repo"
    workflowPath    String   // ".github/workflows/vero-tests.yml"
    defaultBranch   String   // "main"
}
```

---

## Workflow Generation

### Configuration Options

```typescript
interface WorkflowConfig {
    shardCount: number;         // 1-50
    workersPerShard: number;    // 1-10
    browser: 'chromium' | 'firefox' | 'webkit';
    environment: 'dev' | 'staging' | 'production';
    retries: number;
    timeout: number;            // ms
    runnerType: 'cloud-hosted' | 'self-hosted';
    runnerLabels?: string[];    // For self-hosted
}
```

### Generated Workflow Structure

```yaml
name: Vero Tests

on:
  workflow_dispatch:
    inputs:
      shard_count:
        type: string
        default: '2'
      browser:
        type: choice
        options: [chromium, firefox, webkit]
      environment:
        type: choice
        options: [dev, staging, production]
      base_url:
        type: string
      test_grep:
        type: string
      retries:
        type: number
        default: 0
      timeout:
        type: number
        default: 30000

  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest  # or [self-hosted, linux, x64]
    strategy:
      matrix:
        shard: [1, 2, ..., N]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --shard=${{ matrix.shard }}/${{ inputs.shard_count }}
      - uses: actions/upload-artifact@v4
        with:
          name: test-results-shard-${{ matrix.shard }}
          path: test-results/

  merge-reports:
    if: always()
    needs: test
    steps:
      - Download all blob reports
      - Merge into single HTML report
      - Upload merged report
```

---

## Workflow Dispatch

### Trigger Flow

```typescript
// POST /api/github/runs/trigger
async triggerWorkflow(owner, repo, workflowPath, ref, inputs) {
    // 1. Get encrypted token
    const integration = await getIntegration(userId);
    const token = decrypt(integration.accessToken);

    // 2. Call GitHub API
    await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowPath}/dispatches`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            ref,
            inputs: {
                shard_count: inputs.shardCount.toString(),
                browser: inputs.browser,
                environment: inputs.environment,
                ...
            }
        })
    });

    // 3. Create tracking record
    await prisma.gitHubWorkflowRun.create({
        data: { workflowId, status: 'queued', ... }
    });
}
```

---

## Result Tracking

### Tracked Run Model

```prisma
model GitHubWorkflowRun {
    id            String   @id
    workflowId    String
    executionId   String?  // Link to Vero Execution
    runId         BigInt   // GitHub run ID
    runNumber     Int
    status        String   // queued | in_progress | completed
    conclusion    String?  // success | failure | cancelled | timed_out
    htmlUrl       String   // GitHub run page
    artifactsUrl  String?
    logsUrl       String?
    startedAt     DateTime?
    completedAt   DateTime?
    jobs          GitHubWorkflowJob[]
}

model GitHubWorkflowJob {
    id          String   @id
    runId       String
    jobId       BigInt
    name        String   // "test [shard 1/2]"
    status      String
    conclusion  String?
    startedAt   DateTime?
    completedAt DateTime?
    runnerName  String?
}
```

### Polling Flow

```typescript
// Poll for run status
async pollRunStatus(owner, repo, runId) {
    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`
    );
    const run = await response.json();

    // Update tracked run
    await prisma.gitHubWorkflowRun.update({
        where: { runId },
        data: {
            status: run.status,
            conclusion: run.conclusion,
            completedAt: run.completed_at
        }
    });
}
```

---

## Webhook Integration

### Events Handled

```
POST /api/github/webhooks/workflow_run
POST /api/github/webhooks/check_run

Headers:
  X-Hub-Signature-256: sha256={HMAC_HASH}
  X-GitHub-Event: workflow_run | check_run
  X-GitHub-Delivery: {UUID}
```

### Status Updates

| Event | Action |
|-------|--------|
| `workflow_run.requested` | Update status to "queued" |
| `workflow_run.in_progress` | Update status, record start time |
| `workflow_run.completed` | Update status, conclusion, mark finished |

### Signature Verification

```typescript
function verifyWebhookSignature(payload, signature, secret) {
    const expected = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
    );
}
```

---

## Artifact Retrieval

### Report Parsing

```typescript
async getTestReport(owner, repo, runId) {
    // 1. Get artifacts list
    const artifacts = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`
    );

    // 2. Find report artifact
    // Priority: test-results-shard (JSON) > playwright-report (HTML)

    // 3. Download and extract ZIP
    const reportZip = await downloadArtifact(artifactId);
    const extracted = await unzip(reportZip);

    // 4. Parse and return
    return {
        summary: { total, passed, failed, skipped, duration },
        scenarios: [...],
        raw: { suites: [...] }  // Original Playwright JSON
    };
}
```

---

## Schedule → GitHub Actions Connection

### Configuration

```typescript
// In Schedule model
executionTarget: 'github-actions'
githubRepoFullName: 'owner/repo'
githubBranch: 'main'
githubWorkflowFile: 'vero-tests.yml'
githubInputs: { shard_count: '2', browser: 'chromium' }
```

### Trigger Flow

```typescript
// When schedule triggers:
if (schedule.executionTarget === 'github-actions') {
    // 1. Build workflow inputs
    const inputs = {
        ...schedule.githubInputs,
        ...parameterValues  // Runtime overrides
    };

    // 2. Dispatch workflow
    const runId = await githubService.triggerWorkflow(
        schedule.githubRepoFullName,
        schedule.githubWorkflowFile,
        schedule.githubBranch,
        inputs
    );

    // 3. Link to ScheduleRun
    await prisma.scheduleRun.update({
        where: { id: run.id },
        data: { githubRunId: runId }
    });
}
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/github/connect` | Connect GitHub account |
| DELETE | `/api/github/disconnect` | Revoke access |
| GET | `/api/github/integration` | Check connection status |
| POST | `/api/github/validate-token` | Test token |
| GET | `/api/github/repos` | List repositories |
| GET | `/api/github/repos/:owner/:repo/branches` | Get branches |
| POST | `/api/github/workflows/generate` | Generate workflow YAML |
| POST | `/api/github/runs/trigger` | Trigger workflow |
| GET | `/api/github/runs` | List runs |
| GET | `/api/github/runs/:runId` | Get run details |
| GET | `/api/github/runs/:runId/jobs` | Get jobs (shards) |
| POST | `/api/github/runs/:runId/cancel` | Cancel run |
| POST | `/api/github/runs/:runId/rerun` | Rerun workflow |
| GET | `/api/github/artifacts/:artifactId/download` | Download artifact |
| POST | `/api/github/webhooks/*` | Webhook handlers |

---

## Frontend API Client

```typescript
// Integration
githubIntegrationApi.getIntegration()
githubIntegrationApi.connect(token)
githubIntegrationApi.disconnect()

// Workflows
githubWorkflowApi.generate(config, options)
githubWorkflowApi.preview(config)
githubWorkflowApi.estimate(testCount, avgDuration, config)

// Runs
githubRunsApi.trigger(owner, repo, workflowPath, ref, inputs)
githubRunsApi.list(owner, repo, options)
githubRunsApi.get(owner, repo, runId)
githubRunsApi.cancel(owner, repo, runId)
githubRunsApi.rerun(owner, repo, runId)
```

---

## Common Tasks

### Adding Workflow Input

1. Update `/backend/src/services/workflowGenerator.service.ts`:
   - Add input to `workflow_dispatch.inputs`
   - Update job steps to use input

2. Update `/backend/templates/github-workflow.yml`:
   - Add input definition
   - Reference with `${{ inputs.new_input }}`

### Handling New Webhook Event

1. Add route in `/backend/src/routes/github.routes.ts`
2. Implement handler with signature verification
3. Update tracked run/job models as needed

### Adding Self-Hosted Runner Support

Update workflow generation to use custom labels:

```yaml
runs-on: [self-hosted, linux, x64]  # Custom labels
```

---

## Gotchas

1. **Token Encryption**: Never store/log raw tokens. Always encrypt.
2. **Rate Limits**: GitHub API has rate limits (5000/hour with token).
3. **Webhook Signatures**: Always verify `X-Hub-Signature-256`.
4. **Run ID Race**: After dispatch, poll for new run (GitHub doesn't return ID).
5. **Artifact Expiration**: Artifacts expire after 90 days by default.
6. **Shard Indexing**: GitHub matrix shards are 1-indexed, not 0-indexed.
