# Final Agent Swarm Plan - All Opus Models
## 9 Elite Agents for Enterprise Playwright IDE

**Date:** 2025-12-31
**All Agents:** Claude Opus 4.5 (Maximum Accuracy & Reasoning)
**Coordination:** Claude Sonnet 4.5 (Me)

---

## 🎯 Mission Overview

Build a **world-class smart web-based IDE for Playwright** with:
- AI-powered test generation (Gemini 2.0 Flash Thinking)
- Enterprise test data management (Excel → DTO → Vero)
- Parallel execution with Docker sharding
- Full TypeScript capabilities in Vero DSL
- Comprehensive UI for all configurations
- Trace viewer, reporting, scheduling
- Chrome extension for E2E testing

---

## 🤖 Agent Roster (All Opus)

### **Agent 1: AI Enhancement Specialist** 🧠
**Model:** Opus
**Expertise:** AI/ML, Gemini API, Computer Vision, Browser Automation

**Mission:** Upgrade vero-agent to Gemini 2.0 Flash Thinking with computer use

**Detailed Tasks:**
1. **Gemini Integration:**
   - Use **Gemini 2.0 Flash Thinking Experimental** (most accurate)
   - Implement computer use mode for visual element detection
   - Handle API authentication and rate limiting

2. **Visual Element Detection Pipeline:**
   ```
   User: "Click login button"
         ↓
   Gemini Computer Use → Identifies element visually → (x, y)
         ↓
   element_at_coordinates(page, x, y) → DOM info
         ↓
   generate_playwright_selector() → Best-practice selector
         ↓
   selector_to_vero() → Vero field syntax
         ↓
   Auto-update .vero page file
   ```

3. **Page Object Auto-Update:**
   - Parse existing `.vero` page files
   - Detect new selectors from AI generation
   - Append new fields to appropriate page objects
   - Preserve existing code and formatting

4. **Enhanced Retry Executor (20 retries):**
   - Pattern recognition for common errors
   - Smart healing strategies per error type
   - Progress tracking per attempt
   - Detailed logging

5. **Headless/Headed Mode:**
   - Toggle configuration
   - Pass to Playwright browser launch

6. **Selector Resolution:**
   - Check existing page objects first (reuse)
   - Create new fields only when needed
   - Maintain consistency across test suite

**Deliverables:**
- `vero-agent/src/agent/gemini_computer_use.py`
- `vero-agent/src/agent/page_updater.py`
- Enhanced `vero_generator.py`, `selector_resolver.py`, `retry_executor.py`
- `vero-agent/src/config.py` - Gemini config
- `vero-agent/tests/` - Test suite
- `docs/GEMINI_INTEGRATION.md`

**Success Criteria:**
- ✅ Gemini 2.0 Flash Thinking working
- ✅ Visual element detection → Playwright selector
- ✅ Auto-update .vero files with new fields
- ✅ 20-retry self-healing functional
- ✅ Headless mode configurable
- ✅ Reuses existing selectors when possible

---

### **Agent 2: ANTLR Grammar Expert** 📝
**Model:** Opus
**Expertise:** Compiler design, ANTLR, DSL development, Language theory

**Mission:** Extend Vero grammar to full TypeScript capabilities

**Current Limitations:**
- Basic actions only (click, fill, verify)
- No functions/methods (except page actions)
- No classes/objects
- Limited control flow (if, repeat only)
- No async/await
- No error handling
- No imports/modules

**Required Enhancements:**

1. **Functions & Methods:**
   ```vero
   function calculateTotal with price, tax returns number {
       number total = price + tax
       return total
   }

   feature Checkout {
       scenario "Calculate order" {
           number price = 100
           number tax = calculateTotal(price, 0.08)
           verify tax is 108
       }
   }
   ```

2. **Classes & Objects:**
   ```vero
   class User {
       field username
       field email
       field age

       constructor with username, email {
           this.username = username
           this.email = email
           this.age = 0
       }

       method isAdult returns boolean {
           return this.age >= 18
       }
   }
   ```

3. **Advanced Data Structures:**
   ```vero
   list names = ["Alice", "Bob", "Charlie"]
   map userData = { "name": "Alice", "age": 30 }
   ```

4. **Async/Await:**
   ```vero
   async function fetchUserData with userId returns object {
       text response = await fetch("{{baseUrl}}/users/" + userId)
       return parseJson(response)
   }
   ```

5. **Try/Catch Error Handling:**
   ```vero
   scenario "Handle errors" {
       try {
           click "NonExistentButton"
       } catch error {
           log "Button not found: " + error.message
           take screenshot "error"
       }
   }
   ```

6. **Loops:**
   ```vero
   # For loop
   for item in cartItems {
       click item.removeButton
       wait 1 seconds
   }

   # While loop
   while page.isLoading is visible {
       wait 500 milliseconds
   }

   # ForEach
   forEach user in testUsers {
       do LoginPage.login with user.email, user.password
   }
   ```

7. **Imports/Modules:**
   ```vero
   # Import from other .vero files
   import LoginPage from "./pages/LoginPage.vero"
   import { User, Order } from "./models/Models.vero"
   ```

8. **Destructuring:**
   ```vero
   map response = { "status": 200, "data": "Success" }
   { status, data } = response
   ```

9. **Spread Operators:**
   ```vero
   list numbers = [1, 2, 3]
   list moreNumbers = [...numbers, 4, 5, 6]
   ```

10. **Type Annotations:**
    ```vero
    text username: string = "test"
    number age: number = 25
    flag isActive: boolean = true
    ```

**Deliverables:**
- Enhanced `vero-lang/grammar/Vero.g4`
- Regenerated parser/lexer with `antlr4ng-cli`
- Updated `vero-lang/src/transpiler/transpiler.ts`
- New AST node types in `src/parser/ast.ts`
- Comprehensive test suite (`test-project/advanced-features/`)
- `VERO_LANGUAGE_REFERENCE.md` - Complete syntax guide
- Migration guide for existing tests

**Success Criteria:**
- ✅ All TypeScript features available in Vero
- ✅ Functions with return values
- ✅ Classes and objects
- ✅ Async/await support
- ✅ Try/catch error handling
- ✅ Advanced loops (for, while, forEach)
- ✅ Module imports
- ✅ All transpiles correctly to Playwright TypeScript
- ✅ Backward compatible with existing Vero tests

---

### **Agent 3: Parallel Execution & Sharding Architect** ⚡
**Model:** Opus
**Expertise:** Distributed systems, Docker, Kubernetes, Playwright sharding

**Mission:** Implement plug-and-play parallel execution with Docker sharding

**Architecture Design:**

```
┌─────────────────────────────────────────────────────┐
│           Execution Coordinator                     │
│  - Receives test suite                              │
│  - Splits into N shards                             │
│  - Distributes to worker pool                       │
└────────────┬────────────────────────────────────────┘
             │
     ┌───────┴────────┬──────────┬──────────┐
     ▼                ▼          ▼          ▼
┌─────────┐    ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Worker 1│    │ Worker 2│  │ Worker 3│  │ Worker N│
│ Shard 1/4   │ Shard 2/4│  Shard 3/4│  Shard 4/4│
└─────────┘    └─────────┘  └─────────┘  └─────────┘
     │                │          │          │
     └────────────────┴──────────┴──────────┘
                      │
              ┌───────▼────────┐
              │ Result Merger  │
              │ - Aggregates   │
              │ - Reports      │
              └────────────────┘
```

**Detailed Tasks:**

1. **Sharding Engine:**
   ```typescript
   // backend/src/execution/sharding/shard-manager.ts
   export class ShardManager {
     async createShards(
       testFiles: string[],
       totalShards: number
     ): Promise<Shard[]> {
       // Smart sharding based on:
       // - Test duration (balance load)
       // - Test dependencies
       // - File size
     }

     async executeShards(
       shards: Shard[],
       workers: Worker[]
     ): Promise<ExecutionResult[]> {
       // Parallel execution
       // Health monitoring
       // Failure recovery
     }
   }
   ```

2. **Worker Pool:**
   ```typescript
   export class WorkerPool {
     private workers: Map<string, Worker> = new Map();

     async registerWorker(worker: WorkerConfig): Promise<void> {
       // Register local or remote worker
       // Health check
       // Capability detection
     }

     async getAvailableWorker(): Promise<Worker> {
       // Load balancing
       // Priority queue
     }
   }
   ```

3. **Docker Setup:**
   ```dockerfile
   # docker/worker/Dockerfile
   FROM mcr.microsoft.com/playwright:latest

   WORKDIR /app
   COPY . .
   RUN npm install

   # Install Vero transpiler
   RUN cd vero-lang && npm install && npm run build

   # Health check
   HEALTHCHECK --interval=30s CMD curl -f http://localhost:3001/health || exit 1

   CMD ["node", "backend/dist/worker/index.js"]
   ```

   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     coordinator:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - WORKERS=worker-1,worker-2,worker-3,worker-4

     worker-1:
       build: ./docker/worker
       environment:
         - WORKER_ID=worker-1
         - COORDINATOR_URL=http://coordinator:3000

     worker-2:
       build: ./docker/worker
       environment:
         - WORKER_ID=worker-2

     worker-3:
       build: ./docker/worker
       environment:
         - WORKER_ID=worker-3

     worker-4:
       build: ./docker/worker
       environment:
         - WORKER_ID=worker-4
   ```

4. **Playwright Sharding Integration:**
   ```typescript
   // Each worker runs with shard flag
   npx playwright test --shard=1/4
   npx playwright test --shard=2/4
   npx playwright test --shard=3/4
   npx playwright test --shard=4/4
   ```

5. **Remote Worker Support:**
   ```typescript
   // Workers register via WebSocket
   export class RemoteWorkerClient {
     async connect(coordinatorUrl: string) {
       const socket = io(coordinatorUrl);

       socket.on('execute-shard', async (shard: Shard) => {
         const result = await this.executeShard(shard);
         socket.emit('shard-complete', result);
       });
     }
   }
   ```

6. **Result Aggregation:**
   ```typescript
   export class ResultMerger {
     async mergeResults(
       shardResults: ShardResult[]
     ): Promise<AggregatedResult> {
       // Merge test results
       // Combine traces
       // Generate unified report
       // Calculate total metrics
     }
   }
   ```

7. **Kubernetes (Optional):**
   ```yaml
   # k8s/worker-deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: playwright-workers
   spec:
     replicas: 4
     selector:
       matchLabels:
         app: playwright-worker
     template:
       metadata:
         labels:
           app: playwright-worker
       spec:
         containers:
         - name: worker
           image: playwright-web-app/worker:latest
           env:
           - name: COORDINATOR_URL
             value: "http://coordinator-service:3000"
   ```

**Configuration File:**
```json
// sharding.config.json
{
  "enabled": true,
  "totalShards": 4,
  "mode": "auto",  // "auto" | "manual"
  "workers": [
    {
      "id": "local-1",
      "type": "local",
      "maxConcurrency": 5
    },
    {
      "id": "docker-1",
      "type": "docker",
      "endpoint": "http://localhost:3001"
    },
    {
      "id": "remote-1",
      "type": "remote",
      "endpoint": "https://worker1.example.com"
    }
  ],
  "loadBalancing": "round-robin",  // "round-robin" | "least-busy"
  "retryFailedShards": true,
  "maxRetries": 3
}
```

**Deliverables:**
- `backend/src/execution/sharding/` - Complete sharding system
- `backend/src/execution/worker-pool.ts`
- `backend/src/execution/result-merger.ts`
- `docker/` - All Docker files
- `k8s/` - Kubernetes manifests
- `sharding.config.json` - Configuration schema
- `docs/SHARDING_SETUP.md`
- `docs/DOCKER_DEPLOYMENT.md`
- `docs/KUBERNETES_DEPLOYMENT.md`

**Success Criteria:**
- ✅ Run tests on 4+ workers in parallel
- ✅ `docker-compose up` starts multi-worker setup
- ✅ Remote Docker workers connect seamlessly
- ✅ Results merged correctly
- ✅ Load balancing works
- ✅ Failure recovery (retry failed shards)
- ✅ Plug-and-play config (no code changes)

---

### **Agent 4: UI Configuration Specialist** ⚙️
**Model:** Opus
**Expertise:** Frontend development, UX design, Configuration management

**Mission:** Build comprehensive configuration UI for all settings

**UI Sections:**

#### 1. **Test Execution Settings**
```typescript
// frontend/src/components/settings/ExecutionSettings.tsx
export function ExecutionSettings() {
  return (
    <div className="settings-section">
      <h2>Test Execution</h2>

      {/* Parallel Workers */}
      <div className="setting-group">
        <label>Parallel Workers</label>
        <Slider min={1} max={20} value={workers} onChange={setWorkers} />
        <span>{workers} workers</span>
        <p className="help">Number of parallel test execution workers</p>
      </div>

      {/* Execution Mode */}
      <div className="setting-group">
        <label>Execution Mode</label>
        <RadioGroup>
          <Radio value="local">Local (This Machine)</Radio>
          <Radio value="remote">Remote (Docker/K8s)</Radio>
        </RadioGroup>
      </div>

      {/* Browser Selection */}
      <div className="setting-group">
        <label>Browser</label>
        <Checkbox checked={chromium} onChange={setChromium}>Chromium</Checkbox>
        <Checkbox checked={firefox} onChange={setFirefox}>Firefox</Checkbox>
        <Checkbox checked={webkit} onChange={setWebkit}>WebKit</Checkbox>
      </div>

      {/* Headless Mode */}
      <Toggle
        label="Headless Mode"
        checked={headless}
        onChange={setHeadless}
      />

      {/* Video Recording */}
      <Toggle
        label="Record Videos"
        checked={video}
        onChange={setVideo}
      />

      {/* Trace Generation */}
      <Toggle
        label="Generate Traces"
        checked={trace}
        onChange={setTrace}
      />

      {/* Screenshots */}
      <Select
        label="Screenshots"
        value={screenshots}
        options={['off', 'on-failure', 'always']}
      />

      {/* Slow Motion */}
      <NumberInput
        label="Slow Motion (ms)"
        value={slowMo}
        onChange={setSlowMo}
        min={0}
        max={5000}
      />
    </div>
  );
}
```

#### 2. **Sharding Configuration**
```typescript
export function ShardingConfig() {
  const [workers, setWorkers] = useState<WorkerConfig[]>([]);

  return (
    <div className="settings-section">
      <h2>Sharding & Distribution</h2>

      {/* Total Shards */}
      <NumberInput
        label="Total Shards"
        value={totalShards}
        onChange={setTotalShards}
      />

      {/* Worker Distribution Visualization */}
      <div className="worker-visualization">
        {workers.map((worker, i) => (
          <div key={i} className="worker-card">
            <h4>{worker.id}</h4>
            <Badge>{worker.type}</Badge>
            <Progress value={worker.load} max={100} />
            <span>{worker.load}% load</span>
          </div>
        ))}
      </div>

      {/* Add Remote Worker */}
      <div className="worker-config">
        <h3>Workers</h3>
        <Button onClick={handleAddWorker}>Add Worker</Button>

        <Table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Endpoint</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workers.map(worker => (
              <tr key={worker.id}>
                <td>{worker.id}</td>
                <td>{worker.type}</td>
                <td>{worker.endpoint}</td>
                <td>
                  <StatusBadge status={worker.status} />
                </td>
                <td>
                  <Button onClick={() => handleTest(worker)}>Test</Button>
                  <Button onClick={() => handleRemove(worker)}>Remove</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
```

#### 3. **Environment Configuration**
```typescript
export function EnvironmentConfig() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnv, setActiveEnv] = useState<string>('development');

  return (
    <div className="settings-section">
      <h2>Environments</h2>

      {/* Environment Selector */}
      <Select
        label="Active Environment"
        value={activeEnv}
        onChange={setActiveEnv}
        options={environments.map(e => ({ value: e.id, label: e.name }))}
      />

      {/* Environment Variables Table */}
      <h3>{environments.find(e => e.id === activeEnv)?.name} Variables</h3>
      <Table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Value</th>
            <th>Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentEnvVars.map(variable => (
            <tr key={variable.key}>
              <td><input value={variable.key} /></td>
              <td>
                {variable.type === 'secret' ? (
                  <PasswordInput value={variable.value} />
                ) : (
                  <input value={variable.value} />
                )}
              </td>
              <td>
                <Select
                  value={variable.type}
                  options={['string', 'number', 'boolean', 'secret']}
                />
              </td>
              <td>
                <Button onClick={() => handleDelete(variable)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Button onClick={handleAddVariable}>Add Variable</Button>
    </div>
  );
}
```

#### 4. **Global Variables**
```typescript
export function GlobalVariables() {
  return (
    <div className="settings-section">
      <h2>Global Variables (All Environments)</h2>
      <p className="help">
        These variables are available in all environments and can be overridden.
      </p>

      <Table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
            <th>Type</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {globalVars.map(variable => (
            <tr key={variable.id}>
              <td><input value={variable.key} /></td>
              <td><input value={variable.value} /></td>
              <td>
                <Select
                  value={variable.type}
                  options={['string', 'number', 'boolean']}
                />
              </td>
              <td><input value={variable.description} /></td>
              <td>
                <Button onClick={() => handleSave(variable)}>Save</Button>
                <Button onClick={() => handleDelete(variable)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
```

#### 5. **Storage Configuration**
```typescript
export function StorageConfig() {
  return (
    <div className="settings-section">
      <h2>Storage</h2>

      {/* Storage Backend */}
      <RadioGroup
        label="Storage Backend"
        value={storageType}
        onChange={setStorageType}
      >
        <Radio value="local">Local Filesystem</Radio>
        <Radio value="s3">Amazon S3</Radio>
        <Radio value="azure">Azure Blob Storage</Radio>
      </RadioGroup>

      {/* S3 Configuration */}
      {storageType === 's3' && (
        <div className="storage-config">
          <TextInput label="Bucket Name" value={bucket} onChange={setBucket} />
          <TextInput label="Region" value={region} onChange={setRegion} />
          <TextInput label="Access Key ID" value={accessKey} onChange={setAccessKey} />
          <PasswordInput label="Secret Access Key" value={secretKey} onChange={setSecretKey} />
        </div>
      )}

      {/* Retention Policy */}
      <div className="retention-policy">
        <h3>Retention Policy</h3>
        <NumberInput
          label="Keep test results for (days)"
          value={retentionDays}
          onChange={setRetentionDays}
        />
        <NumberInput
          label="Keep traces for (days)"
          value={traceRetentionDays}
          onChange={setTraceRetentionDays}
        />
      </div>
    </div>
  );
}
```

#### 6. **Configuration Export/Import**
```typescript
export function ConfigurationManager() {
  const handleExport = async () => {
    const config = await api.exportConfiguration();
    downloadJson(config, 'playwright-config.json');
  };

  const handleImport = async (file: File) => {
    const config = await readJsonFile(file);
    await api.importConfiguration(config);
  };

  return (
    <div className="config-manager">
      <Button onClick={handleExport}>Export Configuration</Button>
      <FileUpload onUpload={handleImport} accept=".json">
        Import Configuration
      </FileUpload>
    </div>
  );
}
```

**Deliverables:**
- `frontend/src/components/settings/` - All components
- `frontend/src/pages/SettingsPage.tsx`
- `backend/src/services/config.service.ts`
- `backend/src/routes/config.routes.ts`
- Zustand store: `frontend/src/store/configStore.ts`
- `docs/CONFIGURATION_GUIDE.md`

**Success Criteria:**
- ✅ Visual UI for parallel workers (slider)
- ✅ Toggle local vs remote execution
- ✅ Configure sharding with worker visualization
- ✅ Environment variables manager
- ✅ Global variables manager
- ✅ Storage backend configuration
- ✅ Export/import configuration JSON
- ✅ All settings persist to database
- ✅ Real-time preview of settings

---

### **Agent 5: Test Data Management SME** 🗄️
**Model:** Opus
**Expertise:** Test automation frameworks, Database design, DTO patterns, Excel integration

**Mission:** Enterprise-grade test data management system

See complete design in `TEST_DATA_MANAGEMENT_DESIGN.md`

**Key Features:**
- Excel import/export (one sheet per page object)
- DTO/POJO code generation
- Scenario-based data linking (`@testId:TC001`)
- Postman-style environment variables
- Web UI for data management
- Data validation & encryption
- Data versioning

**Deliverables:**
- Extended Prisma schema (data tables)
- `backend/src/services/excel-parser.ts`
- `backend/src/services/environment.service.ts`
- `backend/src/services/data.service.ts`
- `backend/src/codegen/dto-generator.ts`
- `frontend/src/components/data/` - Data UI
- `frontend/src/pages/TestDataPage.tsx`
- `vero-lang/src/transpiler/data-resolver.ts`
- `docs/TEST_DATA_GUIDE.md`

**Success Criteria:**
- ✅ Import Excel → Database
- ✅ Auto-generate TypeScript DTOs
- ✅ Reference data in Vero: `@data.email`
- ✅ Scenario linking via `@testId` tags
- ✅ Environment variable resolution
- ✅ Web UI for data CRUD
- ✅ Data validation & encryption
- ✅ Export data as Excel/JSON

---

### **Agent 6: Backend Execution Engine** 🚀
**Model:** Opus
**Expertise:** Node.js, Playwright API, WebSocket, File storage

**Mission:** Enhanced execution with traces, videos, screenshots

**Tasks:**
1. Execution service enhancements
2. Trace generation (.zip files)
3. Video recording
4. Screenshot capture
5. Artifact storage (local/S3)
6. WebSocket real-time updates
7. Integration with sharding system

**Deliverables:**
- Enhanced `backend/src/services/execution.service.ts`
- `backend/src/executor/artifact-manager.ts`
- `backend/src/storage/` - Storage adapters
- `backend/src/websocket/execution-events.ts`
- Updated API routes
- Tests

**Success Criteria:**
- ✅ Automatic trace generation
- ✅ Video recording when enabled
- ✅ Screenshots on failure
- ✅ Artifacts downloadable via API
- ✅ Real-time WebSocket updates
- ✅ Works with sharding

---

### **Agent 7: Frontend IDE & Trace Viewer** 🎨
**Model:** Opus
**Expertise:** React, Monaco Editor, Playwright trace viewer, Data visualization

**Mission:** Enhanced IDE with debugging and reporting

**Tasks:**
1. Embed Playwright trace viewer
2. Execution results UI
3. Screenshot gallery
4. Video player
5. Metrics dashboard
6. Enhanced Monaco editor (Vero syntax)
7. Visual flow builder

**Deliverables:**
- `frontend/src/components/trace/TraceViewer.tsx`
- `frontend/src/components/results/`
- `frontend/src/components/reports/Dashboard.tsx`
- `frontend/src/pages/TraceViewerPage.tsx`
- Enhanced IDE components
- CSS/Tailwind styling

**Success Criteria:**
- ✅ Inline trace viewing
- ✅ Screenshot gallery
- ✅ Video playback
- ✅ Metrics dashboard
- ✅ HTML report viewer
- ✅ Vero syntax highlighting

---

### **Agent 8: Scheduler & Notifications** ⏰
**Model:** Opus
**Expertise:** Cron scheduling, Job queues, Email/webhook integrations

**Mission:** Complete scheduling and notification system

**Tasks:**
1. Cron scheduler with Bull queue
2. Email notifications (SendGrid/SMTP)
3. Slack webhooks
4. Discord webhooks
5. Custom webhook support
6. UI for schedule management

**Deliverables:**
- `backend/src/services/schedule.service.ts`
- `backend/src/services/notification.service.ts`
- `backend/src/queue/` - Bull setup
- `frontend/src/components/scheduler/`
- `frontend/src/pages/SchedulerPage.tsx`
- Email templates
- `docs/SCHEDULING.md`

**Success Criteria:**
- ✅ Cron-based scheduling
- ✅ Email notifications
- ✅ Slack/Discord webhooks
- ✅ Custom webhooks
- ✅ Schedule management UI

---

### **Agent 9: QA & Chrome Extension** 🧪
**Model:** Opus
**Expertise:** Chrome extension development, E2E testing, CI/CD

**Mission:** Chrome extension and comprehensive testing

**Tasks:**
1. Chrome extension (Manifest v3)
2. E2E test suite for IDE
3. Integration tests
4. CI/CD pipeline (GitHub Actions)

**Deliverables:**
- `chrome-extension/` - Complete extension
- `tests/e2e/` - E2E tests
- `tests/integration/` - Integration tests
- `.github/workflows/` - CI/CD
- `docs/CHROME_EXTENSION.md`

**Success Criteria:**
- ✅ Chrome extension working
- ✅ E2E tests cover major features
- ✅ Integration tests pass
- ✅ CI/CD pipeline functional
- ✅ Claude Code integration

---

## 🚀 Execution Plan

### Phase 1: Foundation (Start Now)
**Agents:** 1, 2, 5 (in parallel)
**Duration:** 4-5 hours
**Focus:** Core capabilities

### Phase 2: Execution Infrastructure
**Agents:** 3, 4, 6 (in parallel)
**Duration:** 4-5 hours
**Focus:** Parallel execution, config UI, execution engine

### Phase 3: User Experience
**Agents:** 7, 8 (in parallel)
**Duration:** 3-4 hours
**Focus:** Frontend features, scheduling

### Phase 4: Quality Assurance
**Agent:** 9
**Duration:** 3-4 hours
**Focus:** Testing and validation

**Total:** 14-18 hours

---

## Ready to Launch Phase 1?

Spawn Agents 1, 2, and 5 now to begin?
