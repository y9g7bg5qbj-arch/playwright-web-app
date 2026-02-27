---
name: e2e-test
description: Comprehensive end-to-end testing for Vero IDE. Launches parallel sub-agents to research the codebase, then uses Vercel Agent Browser CLI to test every user journey — taking screenshots, validating UI/UX, and querying MongoDB to verify records. Run after major development to validate before code review.
disable-model-invocation: true
---

# End-to-End Testing for Vero IDE

## Pre-flight Check

### 1. Platform Check

agent-browser requires **Linux, WSL, or macOS**. Check the platform:
```bash
uname -s
```
- `Linux` or `Darwin` → proceed
- Anything else (e.g., `MINGW`, `CYGWIN`, or native Windows) → stop with:

> "agent-browser only supports Linux, WSL, and macOS. It cannot run on native Windows. Please run this command from WSL or a Linux/macOS environment."

Stop execution if the platform is unsupported.

### 2. Frontend Check

Verify the Vero IDE frontend exists:
- Check for `frontend/package.json` with Vite dev script
- Confirm `frontend/src/App.tsx` and components exist

### 3. agent-browser Installation

Check if agent-browser is installed:
```bash
agent-browser --version
```

If not found, install automatically:
```bash
npm install -g agent-browser
agent-browser install --with-deps
```

Verify installation succeeded:
```bash
agent-browser --version
```

If installation fails, stop with:
> "Failed to install agent-browser. Please install it manually with `npm install -g agent-browser && agent-browser install --with-deps`, then re-run this command."

## Phase 1: Parallel Research

Launch **three sub-agents simultaneously** using the Task tool. All three run in parallel.

### Sub-agent 1: Vero IDE Structure & User Journeys

> Research this Vero IDE codebase thoroughly. Return a structured summary covering:
>
> 1. **How to start the application** — exact commands to:
>    - Start MongoDB (if local) or verify Atlas connection
>    - Start Redis for BullMQ
>    - Start backend (`pnpm dev:backend` on port 3000)
>    - Start frontend (`pnpm dev:frontend` on port 5173)
>
> 2. **Authentication** — how users log in, any test credentials in .env.example
>
> 3. **Every user-facing route/page** — document all routes in `frontend/src/App.tsx` and pages
>
> 4. **Core user journeys** to test:
>    - Create new project
>    - Write Vero script in editor
>    - Transpile Vero to Playwright
>    - Execute test (local/Docker)
>    - View execution results with trace viewer
>    - Manage test data connections
>    - Schedule test runs
>    - GitHub integration flow
>    - Record tests with Playwright codegen
>
> 5. **Key UI components** — Monaco editor, execution panels, data grids, modals

### Sub-agent 2: Database Schema & Data Flows

> Research the Vero IDE database layer. Check `.env.example` for MongoDB Atlas connection. Return:
>
> 1. **Database type**: MongoDB Atlas
>    - Connection string env var: `MONGODB_URI`
>
> 2. **Collections schema** — read `backend/src/db/mongodb.ts` and all service files to document:
>    - All collections (projects, scripts, executions, schedules, etc.)
>    - Document structure for each collection
>    - Relationships between collections
>
> 3. **Data flows per user action**:
>    - Creating a project → what documents are created
>    - Saving a Vero script → what gets stored
>    - Running an execution → execution records, status updates
>    - Creating a schedule → schedule documents
>
> 4. **Validation queries** — MongoDB shell commands to verify data:
>    ```bash
>    mongosh "$MONGODB_URI" --eval 'db.projects.find({name: "TestProject"})'
>    ```

### Sub-agent 3: Bug Hunting & Code Quality

> Analyze the Vero IDE codebase for potential issues. Focus on:
>
> 1. **TypeScript errors** — run `pnpm typecheck` in frontend/backend, document failures
>
> 2. **Logic errors** — incorrect conditionals, missing null checks, race conditions
>
> 3. **UI/UX issues**:
>    - Missing error states in forms
>    - No loading indicators
>    - Broken responsive layouts
>    - Accessibility problems
>
> 4. **Vero language issues**:
>    - Parser edge cases
>    - Transpiler output correctness
>    - Missing error recovery
>
> 5. **Security concerns** — injection risks, missing auth checks, exposed secrets
>
> Return a prioritized list with file paths and line numbers.

**Wait for all three sub-agents to complete before proceeding.**

## Phase 2: Start the Application

Using Sub-agent 1's startup instructions:

1. Install dependencies: `pnpm install`
2. Ensure MongoDB Atlas is accessible (check env)
3. Start Redis if needed: `redis-server &` or verify `REDIS_URL`
4. Start backend in background: `cd backend && pnpm dev &`
5. Start frontend in background: `cd frontend && pnpm dev &`
6. Wait for servers to be ready (check ports 3000 and 5173)
7. Open the app: `agent-browser open http://localhost:5173`
8. Take initial screenshot: `agent-browser screenshot e2e-screenshots/00-initial-load.png`

## Phase 3: Create Task List

Create tasks for each Vero IDE user journey:

1. **Project Management** — Create, edit, delete projects
2. **Vero Script Editor** — Write scripts, syntax highlighting, autocomplete
3. **Transpilation** — Convert Vero to Playwright, view generated code
4. **Local Execution** — Run tests locally, view real-time output
5. **Docker Execution** — Run tests in Docker containers
6. **Execution History** — View past runs, trace viewer integration
7. **Test Data Management** — Connect to external databases, manage data
8. **Scheduling** — Create cron schedules, view scheduled runs
9. **GitHub Integration** — Connect repo, commit scripts, trigger workflows
10. **Recording** — Use Playwright codegen to record tests
11. **Responsive Testing** — Mobile, tablet, desktop viewports

## Phase 4: User Journey Testing

For each task, mark it `in_progress` and execute:

### 4a. Browser Testing

Use agent-browser CLI for all interactions:

```bash
agent-browser open <url>              # Navigate to a page
agent-browser snapshot -i             # Get interactive elements (@e1, @e2...)
agent-browser click @eN               # Click element by ref
agent-browser fill @eN "text"         # Clear field and type
agent-browser select @eN "option"     # Select dropdown option
agent-browser press Enter             # Press a key
agent-browser screenshot <path>       # Save screenshot
agent-browser screenshot --annotate   # Screenshot with numbered labels
agent-browser set viewport W H        # Set viewport size
agent-browser wait --load networkidle # Wait for page to settle
agent-browser console                 # Check for JS errors
agent-browser errors                  # Check for exceptions
agent-browser get text @eN            # Get element text
agent-browser get url                 # Get current URL
agent-browser close                   # End session
```

**Important**: Refs become invalid after navigation or DOM changes. Always re-snapshot after page changes.

For each step:
1. Snapshot to get current refs
2. Perform the interaction
3. Wait for page to settle
4. Take screenshot to `e2e-screenshots/<journey>/<step>.png`
5. Analyze screenshot for visual issues
6. Check `agent-browser console` for JS errors

### 4b. MongoDB Validation

After data-modifying actions, verify in MongoDB:

```bash
# Verify project was created
mongosh "$MONGODB_URI" --eval 'db.projects.findOne({name: "TestProject"})'

# Verify script was saved
mongosh "$MONGODB_URI" --eval 'db.scripts.findOne({projectId: ObjectId("..."), name: "TestScript"})'

# Verify execution record
mongosh "$MONGODB_URI" --eval 'db.executions.findOne({status: "completed"}).sort({createdAt: -1})'

# Verify schedule was created
mongosh "$MONGODB_URI" --eval 'db.schedules.findOne({name: "DailyTest"})'
```

Check:
- Records created/updated as expected
- Values match UI entries
- References between documents are correct
- No orphaned documents

### 4c. Issue Handling

When an issue is found:
1. **Document it** — expected vs actual, screenshot path, DB query results
2. **Fix the code** — make the correction directly
3. **Re-run the failing step** to verify the fix
4. **Take a new screenshot** confirming the fix

### 4d. Responsive Testing

Test key pages at these viewports:

- **Mobile:** `agent-browser set viewport 375 812`
- **Tablet:** `agent-browser set viewport 768 1024`
- **Desktop:** `agent-browser set viewport 1440 900`

Focus on:
- Monaco editor usability on mobile
- Sidebar collapse/expand behavior
- Execution panel responsiveness
- Modal sizing and positioning

## Phase 5: Cleanup

After all testing:
1. Stop frontend and backend dev servers
2. Close browser: `agent-browser close`

## Phase 6: Report

### Text Summary (always output)

```
## E2E Testing Complete — Vero IDE

**Journeys Tested:** [count]
**Screenshots Captured:** [count]
**Issues Found:** [count] ([count] fixed, [count] remaining)

### Issues Fixed During Testing
- [Description] — [file:line]

### Remaining Issues
- [Description] — [severity: high/medium/low] — [file:line]

### Bug Hunt Findings
- [Description] — [severity] — [file:line]

### Vero Language Issues
- [Parser/Transpiler issues found]

### Screenshots
All saved to: `e2e-screenshots/`
```

### Markdown Export

Ask the user:
> "Would you like me to export the full testing report to `e2e-test-report.md`?"

If yes, write detailed report including:
- Full summary with stats
- Per-journey breakdown with screenshots
- MongoDB validation results
- All issues with fix status
- Vero language specific findings
- Recommendations for unresolved issues
