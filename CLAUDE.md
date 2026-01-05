# Vero IDE

Test automation platform for non-technical QA testers. LeapWork/testRigor competitor.

## Core Flows

### 1. Authoring (Create Test Scenarios)

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUTHORING OPTIONS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Manual ──────▶ Write Vero Script directly in CodeMirror 6     │
│                                                                 │
│  Recording ───▶ Playwright codegen ──▶ Vero Script             │
│                 (codebase-aware, editable after)                │
│                                                                 │
│  AI Agent ────▶ Plain English ──▶ AI creates Vero Script       │
│                 (Claude API, user reviews before save)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    VERO SCRIPT (source of truth)
                              ↓
                    Visual Preview (React Flow, read-only)
```

### 2. Execution

| Option | Description |
|--------|-------------|
| Environment | Select target env (dev, staging, prod, custom URLs) |
| Browser Mode | Headless or Headful |
| Browser Type | Chromium, Firefox, WebKit |
| Run Location | Local machine or Docker container |
| Sharding | Parallel execution across multiple workers |
| Retry | Configure retry count on failure |
| Timeout | Global and per-step timeouts |

### 3. Scheduling (Jenkins-like from IDE)

- Cron expressions for recurring runs
- Manual trigger with parameters
- Environment-specific schedules
- Notifications on failure (email, Slack, webhook)
- Queue management and priority

### 4. Reporting (Execution Tab)

```
Executions List
├── Execution #123
│   ├── Meta: triggered by "john@example.com", 2024-01-15 10:30 AM
│   ├── Status: Passed/Failed/Running
│   ├── Duration: 45s
│   ├── Environment: staging
│   └── Actions:
│       ├── View Report (HTML summary)
│       └── Open Trace Viewer (Playwright traces)
```

### 5. Data Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA MANAGEMENT                              │
├─────────────────────────────────────────────────────────────────┤
│  User chooses database: MongoDB, PostgreSQL, MySQL, etc.        │
│                              ↓                                  │
│  Define collections/tables with schema                          │
│                              ↓                                  │
│  Auto-generate POJOs/TypeScript interfaces                      │
│                              ↓                                  │
│  Use in Vero Script:                                            │
│     load users from "users" where status = "active"             │
│     fill "Email" with $user.email                               │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Editor | CodeMirror 6 |
| Visual Preview | React Flow (read-only) |
| State | Zustand |
| Backend | Node.js, Express, Socket.IO |
| App Database | Prisma + SQLite (dev) / PostgreSQL (prod) |
| Test Data | User choice: MongoDB, PostgreSQL, MySQL, etc. |
| Browser Automation | Playwright |
| AI | Claude API |
| Parser | ANTLR4 (Vero grammar) |
| Containerization | Docker with sharding support |

## Directory Structure

```
playwright-web-app/
├── frontend/src/
│   ├── components/
│   │   ├── editor/        # CodeMirror 6 integration
│   │   ├── preview/       # React Flow visual preview
│   │   ├── recording/     # Screen recording controls
│   │   ├── ai/            # AI agent chat interface
│   │   ├── execution/     # Run configuration UI
│   │   ├── scheduling/    # Cron scheduler UI
│   │   ├── reporting/     # Execution reports & trace viewer
│   │   └── data/          # Data management UI
│   ├── store/             # Zustand stores
│   └── api/
├── backend/src/
│   ├── routes/
│   ├── services/
│   │   ├── recording.ts   # Playwright codegen integration
│   │   ├── execution.ts   # Test runner orchestration
│   │   ├── scheduling.ts  # Cron job management
│   │   ├── ai.ts          # Claude API integration
│   │   └── data.ts        # External DB connections
│   └── websocket/
├── vero-lang/             # ANTLR4-based parser
│   ├── grammar/
│   │   └── Vero.g4        # ANTLR4 grammar definition
│   ├── parser/            # Generated parser
│   ├── ast.ts             # AST types
│   ├── transpiler.ts      # Vero → Playwright
│   ├── validator.ts       # Semantic validation
│   └── codemirror/        # Editor integration
├── agent/                 # Execution agent
├── docker/                # Sharding & containerization
└── docs/
```

## Vero Script Syntax

```vero
# Navigation
navigate to "https://example.com"
navigate to $baseUrl + "/login"
go back | go forward | reload

# Actions
click "Login" button
click link "Sign up"
fill "Username" with "admin"
fill "Password" with "${password}"
fill "Email" with $user.email
select "Country" option "USA"
check "Remember me"
uncheck "Newsletter"
hover over "Menu"
press "Enter"
upload "Avatar" with "path/to/image.png"

# Waits
wait 2 seconds
wait for "Dashboard" to be visible
wait for network idle

# Assertions
assert "Welcome" is visible
assert "Error" is not visible
assert text "Success" exists
assert url contains "/dashboard"
assert $price > 100

# Variables
set $count to 0
set $baseUrl to "https://staging.example.com"
save text of "Price" as $price
save attribute "href" of "Learn More" as $link

# Data Management (connects to user's database)
load users from "users" where status = "active"
load $product from "products" where id = 123
for each $user in users
  fill "Email" with $user.email
  click "Submit"
end

# Control Flow
if $price > 100 then
  click "Apply Discount"
else
  click "Checkout"
end

repeat 3 times
  click "Next"
end

for $i from 1 to 5
  fill "Item $i" with "Value"
end

# Reusable Procedures
define "login as $username with $password"
  navigate to $baseUrl + "/login"
  fill "Username" with $username
  fill "Password" with $password
  click "Submit"
  wait for "Dashboard" to be visible
end

call "login as admin with secret123"

# Screenshots & Traces
take screenshot as "before-checkout"
start tracing
# ... actions ...
stop tracing
```

## Commands

```bash
# Development
pnpm dev              # Start all services
pnpm dev:frontend     # Frontend (localhost:5173)
pnpm dev:backend      # Backend (localhost:3000)

# Vero Language
pnpm build:parser     # Generate ANTLR4 parser
pnpm test:parser      # Test Vero grammar

# Database
pnpm db:migrate       # Run Prisma migrations
pnpm db:studio        # Open Prisma Studio

# Type Checking
pnpm typecheck        # Check all packages

# Docker
pnpm docker:build     # Build execution containers
pnpm docker:shard     # Run sharded execution
```

## ANTLR4 Grammar (vero-lang/grammar/Vero.g4)

```antlr
grammar Vero;

program: statement* EOF;

statement
    : navigateStmt
    | clickStmt
    | fillStmt
    | assertStmt
    | waitStmt
    | setStmt
    | loadStmt
    | ifStmt
    | repeatStmt
    | forEachStmt
    | defineStmt
    | callStmt
    ;

navigateStmt: NAVIGATE TO expression;
clickStmt: CLICK stringLiteral (BUTTON | LINK)?;
fillStmt: FILL stringLiteral WITH expression;
assertStmt: ASSERT expression (IS | IS_NOT) VISIBLE;
loadStmt: LOAD IDENTIFIER FROM stringLiteral (WHERE condition)?;

expression
    : stringLiteral
    | numberLiteral
    | variable
    | expression '+' expression
    | expression '.' IDENTIFIER  // property access
    ;

variable: '$' IDENTIFIER;
stringLiteral: STRING;
numberLiteral: NUMBER;

// Tokens
NAVIGATE: 'navigate';
TO: 'to';
CLICK: 'click';
FILL: 'fill';
WITH: 'with';
ASSERT: 'assert';
LOAD: 'load';
FROM: 'from';
WHERE: 'where';
// ... etc
```

## Code Patterns

### Transpiler (Vero → Playwright)
```typescript
function transpile(ast: VeroProgram): string {
  const lines = ast.statements.map(transpileStatement);
  return `
import { test, expect } from '@playwright/test';

test('${ast.name}', async ({ page }) => {
  ${lines.join('\n  ')}
});
`;
}

function transpileStatement(node: Statement): string {
  switch (node.type) {
    case 'navigate':
      return `await page.goto(${resolveExpr(node.url)});`;
    case 'click':
      return `await page.getByRole('button', { name: ${node.target} }).click();`;
    case 'fill':
      return `await page.getByLabel(${node.field}).fill(${resolveExpr(node.value)});`;
    case 'load':
      return `const ${node.variable} = await dataManager.query('${node.collection}', ${node.where});`;
  }
}
```

### Data Management Service
```typescript
interface DataSource {
  type: 'mongodb' | 'postgresql' | 'mysql';
  connectionString: string;
  collections: CollectionSchema[];
}

// Auto-generates TypeScript interfaces from schema
function generatePOJO(schema: CollectionSchema): string {
  return `
interface ${schema.name} {
  ${schema.fields.map(f => `${f.name}: ${f.type};`).join('\n  ')}
}
`;
}

// Use in Vero execution
const users = await dataManager.load('users', { status: 'active' });
```

### Execution Service
```typescript
interface ExecutionConfig {
  environment: string;
  headless: boolean;
  browser: 'chromium' | 'firefox' | 'webkit';
  shards: number;
  retries: number;
  timeout: number;
  docker: boolean;
  tracing: boolean;
}

async function executeTest(
  veroScript: string,
  config: ExecutionConfig
): Promise<ExecutionResult> {
  const playwrightCode = transpile(parse(veroScript));
  // Run via local Playwright or Docker container
}
```

### Scheduling Service
```typescript
interface Schedule {
  id: string;
  testFlowId: string;
  cron: string;           // "0 9 * * *" = daily at 9am
  environment: string;
  enabled: boolean;
  notifyOnFailure: string[];
}
```

## Zustand Stores

```typescript
// editorStore.ts
interface EditorState {
  script: string;
  ast: VeroAST | null;
  errors: ParseError[];
  setScript: (script: string) => void;
}

// executionStore.ts
interface ExecutionState {
  config: ExecutionConfig;
  isRunning: boolean;
  logs: LogEntry[];
  currentLine: number | null;
}

// reportingStore.ts
interface ReportingState {
  executions: Execution[];
  selectedExecution: Execution | null;
  traceViewerUrl: string | null;
}

// dataStore.ts
interface DataState {
  dataSources: DataSource[];
  generatedTypes: Record<string, string>;
}
```

## Rules

1. **Vero Script = source of truth** (visual preview derives from it)
2. **ANTLR4 for parsing** (robust grammar, good tooling)
3. **Parse on keystroke** (debounced, inline errors)
4. **Recording → Vero Script** (user can edit after)
5. **AI → Vero Script** (user reviews before save)
6. **Data as POJOs** (auto-generate from user's database schema)
7. **Run typecheck** before claiming done

## Current State

- Auth, Projects, Test Flows, Basic Recording, Basic Execution
- Needs: ANTLR4 parser, CodeMirror integration, AI agent, Scheduling, Reporting, Data Management

## Don't

- Make visual flow editable (preview only)
- Store AST in database (store Vero Script text only)
- Call Playwright from frontend (backend/agent only)
- Hardcode database connections (let user configure)
- Skip trace viewer integration
- Commit without my approval
