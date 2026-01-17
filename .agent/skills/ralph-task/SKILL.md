---
description: "Convert task to Ralph Loop command with verifiable promises"
argument-hint: "<task description>"
---

# Ralph Task Converter

Convert user tasks into proper `/ralph-loop:ralph-loop` commands with **verifiable completion promises** that prevent false claims of completion.

## Core Principle

**NEVER trust Claude's assertion that something is "done" or "fixed".**

Instead, tie completion promises to **objective, verifiable command output** such as:
- Test results: `npm test` exit code 0
- Type checking: `npm run typecheck` showing 0 errors
- Build success: `npm run build` completing without errors
- Linting: `npm run lint` passing

---

## Task Analysis Process

When the user provides a task, analyze it and classify into one of these categories:

### 1. Bug Fix Tasks
Keywords: fix, bug, error, issue, broken, not working, crash, failing

**Verification strategy:**
- Identify which tests cover the buggy code
- Run those tests to confirm fix
- Run full test suite to ensure no regressions

**Promise template:**
```
You MUST run the relevant tests after each fix attempt.
Only output <promise>BUG FIXED</promise> when:
1. You have run `npm test` in the backend or frontend directory
2. The test output shows ALL TESTS PASSING with exit code 0
3. Paste the actual test output showing green results before the promise

DO NOT claim fixed without running tests. DO NOT claim fixed if any test fails.
```

### 2. Type Error Tasks
Keywords: type error, typescript, tsc, typecheck, type mismatch

**Verification strategy:**
- Run `npm run typecheck` after each change
- Count errors and iterate until 0

**Promise template:**
```
After EVERY change, run `npm run typecheck` in the affected directory.
Only output <promise>TYPE ERRORS FIXED</promise> when:
1. You have run `npm run typecheck`
2. The output shows "Found 0 errors" or exits with code 0
3. Paste the actual typecheck output proving 0 errors before the promise

If typecheck shows ANY errors, DO NOT output the promise. Fix them first.
```

### 3. Build Tasks
Keywords: build, compile, bundle, deploy, production

**Verification strategy:**
- Run `npm run build` and check exit code
- Verify output artifacts exist

**Promise template:**
```
You MUST run `npm run build` after completing your changes.
Only output <promise>BUILD COMPLETE</promise> when:
1. The build command exits with code 0
2. No errors appear in the output
3. Paste the build output showing success before the promise

Build warnings are acceptable. Build ERRORS mean you cannot output the promise.
```

### 4. Feature Implementation Tasks
Keywords: add, create, implement, build, new feature, integrate

**Verification strategy:**
- Write tests for the new feature
- Run typecheck AND tests
- Both must pass

**Promise template:**
```
After implementing the feature:
1. Run `npm run typecheck` - must show 0 errors
2. Run `npm test` - all tests must pass

Only output <promise>FEATURE COMPLETE</promise> when BOTH commands succeed.
Paste both command outputs as proof before the promise.

DO NOT claim complete without running both verification commands.
```

### 5. Refactoring Tasks
Keywords: refactor, clean up, reorganize, simplify, optimize, improve

**Verification strategy:**
- No new functionality = existing tests must still pass
- Typecheck must pass

**Promise template:**
```
Refactoring must not break existing functionality.
After each refactoring step:
1. Run `npm run typecheck` - must pass
2. Run `npm test` - all existing tests must pass

Only output <promise>REFACTORING COMPLETE</promise> when:
- Typecheck shows 0 errors
- All tests pass
- Paste both outputs as proof before the promise
```

### 6. Test Writing Tasks
Keywords: test, spec, coverage, unit test, integration test

**Verification strategy:**
- Run the tests you wrote
- They must actually execute and pass

**Promise template:**
```
After writing tests:
1. Run `npm test` to execute the new tests
2. All new tests must pass (green)
3. Existing tests must not be broken

Only output <promise>TESTS WRITTEN</promise> when:
- npm test shows your new tests executing
- All tests (new and existing) pass
- Paste the test output showing the new test names and PASS status
```

---

## Project-Specific Verification Commands

For this Vero IDE project:

| Directory | Typecheck | Tests | Build |
|-----------|-----------|-------|-------|
| `/backend` | `npm run typecheck` | `npm test` | `npm run build` |
| `/frontend` | `npm run typecheck` | N/A | `npm run build` |
| `/vero-lang` | `npm run typecheck` | `npm test` | `npm run build:parser` |

---

## Output Format

Generate a command in this format:

```
/ralph-loop:ralph-loop "<ENHANCED_PROMPT>" --completion-promise "<PROMISE_TEXT>" --max-iterations <N>
```

### Enhanced Prompt Structure

The enhanced prompt MUST include:

1. **Original task** - what the user wants done
2. **Verification requirements** - specific commands to run
3. **Success criteria** - exact output that proves completion
4. **Anti-circumvention rules** - explicit warnings against false promises

### Example Conversions

**User says:** "Fix the login bug"

**Generated command:**
```
/ralph-loop:ralph-loop "Fix the login bug.

VERIFICATION REQUIREMENTS:
1. After each fix attempt, run: cd backend && npm test
2. Look for the login-related tests specifically

SUCCESS CRITERIA:
- npm test exits with code 0
- All login tests show PASS
- No test failures

COMPLETION RULES:
- Only output <promise>LOGIN BUG FIXED</promise> when ALL tests pass
- Paste the actual npm test output showing green results
- If ANY test fails, DO NOT output the promise - fix it first
- Do NOT claim fixed without running tests" --completion-promise "LOGIN BUG FIXED" --max-iterations 15
```

**User says:** "Add dark mode toggle"

**Generated command:**
```
/ralph-loop:ralph-loop "Add dark mode toggle to the settings.

VERIFICATION REQUIREMENTS:
1. After implementation, run: cd frontend && npm run typecheck
2. Then run: cd frontend && npm run build

SUCCESS CRITERIA:
- Typecheck shows 0 errors
- Build completes without errors

COMPLETION RULES:
- Only output <promise>DARK MODE COMPLETE</promise> when both commands pass
- Paste typecheck AND build output as proof
- If typecheck or build fails, fix issues first - no false promises" --completion-promise "DARK MODE COMPLETE" --max-iterations 20
```

---

## When Converting a Task

1. **Identify task type** from keywords
2. **Select appropriate verification commands** for this project
3. **Generate enhanced prompt** with verification requirements
4. **Set reasonable max-iterations** (10-20 for bugs, 20-30 for features)
5. **Create clear promise text** that's easy to detect

---

## Anti-Circumvention Reminders

Always include in the prompt:

```
CRITICAL - DO NOT LIE:
- Do NOT output the promise tag unless the verification commands ACTUALLY passed
- Do NOT claim "fixed" or "complete" without running the verification commands
- Do NOT skip verification because you're "confident" it works
- Do NOT output the promise to escape the loop if you're stuck

If stuck, try a different approach. The loop continues until genuine completion.
```

---

## Now Convert This Task

The user's task is: $ARGUMENTS

Analyze it, determine the task type, select appropriate verification commands, and generate a complete `/ralph-loop:ralph-loop` command with verifiable promises.

Output the command so the user can copy and run it.
