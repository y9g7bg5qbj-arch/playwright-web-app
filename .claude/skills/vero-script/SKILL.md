# Vero Script - DSL Expert Skill

Auto-invoke when working with Vero DSL syntax, `.vero` files, grammar, transpiler, or data queries (VDQL).

---

## Architecture Overview

```
Vero Script (Plain English DSL)
    ↓ [Lexer - ANTLR4]
Token Stream
    ↓ [Parser]
Abstract Syntax Tree (AST)
    ↓ [Transpiler]
Playwright TypeScript
    ↓ [Playwright Runner]
Test Execution
```

---

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `/vero-lang/grammar/Vero.g4` | 757 | ANTLR4 grammar definition |
| `/vero-lang/src/parser/parser.ts` | 500+ | Token → AST conversion |
| `/vero-lang/src/parser/ast.ts` | 450 | AST node type definitions |
| `/vero-lang/src/transpiler/transpiler.ts` | 1219 | Vero → Playwright TypeScript |
| `/vero-lang/src/runtime/DataManager.ts` | 300+ | In-memory data querying |
| `/frontend/src/components/vero/veroLanguage.ts` | 200+ | Monaco syntax highlighting |
| `/frontend/src/components/vero/VeroEditor.tsx` | 300+ | React editor component |

---

## Complete Vero Syntax Reference

### Page Objects

```vero
PAGE LoginPage {
    FIELD emailInput = "Email"              # Auto-detects selector type
    FIELD passwordInput = "Password"
    FIELD submitBtn = button "Sign In"      # Explicit role
    FIELD rememberMe = checkbox "Remember"

    # Reusable action with parameters
    login WITH email, password {
        FILL emailInput WITH email
        FILL passwordInput WITH password
        CLICK submitBtn
        WAIT 2 SECONDS
    }
}
```

**Selector Auto-Detection:**
- `"Email"` → `getByLabel('Email')`
- `".email-input"` → `locator('.email-input')`
- `"#loginBtn"` → `locator('#loginBtn')`
- `button "Sign In"` → `getByRole('button', { name: 'Sign In' })`
- `"[data-testid=x]"` → `getByTestId('x')`

---

### Features & Scenarios

```vero
FEATURE Login @serial {
    USE LoginPage, DashboardPage
    WITH FIXTURE authenticatedUser { role = "admin" }

    BEFORE EACH {
        OPEN "/login"
    }

    AFTER ALL {
        LOG "Feature complete"
    }

    @skip SCENARIO UserCanLogin @smoke @e2e {
        PERFORM LoginPage.login WITH "test@example.com", "password"
        VERIFY DashboardPage.heading IS VISIBLE
    }

    @only SCENARIO InvalidCredentialsShowError {
        PERFORM LoginPage.login WITH "bad@email.com", "wrong"
        VERIFY "Invalid credentials" IS VISIBLE
    }
}
```

**Annotations:**
- `@skip` - Skip this test
- `@only` - Run only this test
- `@slow` - Triple timeout
- `@fixme` - Mark as known issue
- `@smoke`, `@e2e`, `@regression` - Custom tags for filtering

---

### Actions

| Action | Syntax | Transpiles To |
|--------|--------|---------------|
| CLICK | `CLICK PageName.field` | `await field.click()` |
| FILL | `FILL field WITH "value"` | `await field.fill('value')` |
| OPEN | `OPEN "url"` or `OPEN baseUrl + "/path"` | `await page.goto(url)` |
| CHECK | `CHECK field` | `await field.check()` |
| UNCHECK | `UNCHECK field` | `await field.uncheck()` |
| SELECT | `SELECT "option" FROM field` | `await field.selectOption('option')` |
| HOVER | `HOVER field` | `await field.hover()` |
| PRESS | `PRESS "Enter"` | `await page.keyboard.press('Enter')` |
| SCROLL | `SCROLL TO field` | `await field.scrollIntoViewIfNeeded()` |
| SCROLL | `SCROLL DOWN/UP/LEFT/RIGHT` | `await page.mouse.wheel(...)` |
| WAIT | `WAIT 2 SECONDS` | `await page.waitForTimeout(2000)` |
| WAIT | `WAIT FOR field` | `await field.waitFor()` |
| REFRESH | `REFRESH` | `await page.reload()` |
| CLEAR | `CLEAR field` | `await field.clear()` |
| UPLOAD | `UPLOAD "file.pdf" TO field` | `await field.setInputFiles('file.pdf')` |
| LOG | `LOG "message"` | `console.log('message')` |
| TAKE SCREENSHOT | `TAKE SCREENSHOT "name.png"` | `await page.screenshot({path: 'name.png'})` |
| PERFORM | `PERFORM PageName.action WITH arg1, arg2` | `await pageName.action(arg1, arg2)` |

---

### Assertions (VERIFY)

```vero
# Visibility
VERIFY PageName.field IS VISIBLE
VERIFY PageName.field ISNOT VISIBLE
VERIFY "text" IS VISIBLE
VERIFY PageName.field IS HIDDEN

# State
VERIFY PageName.field IS ENABLED
VERIFY PageName.field IS DISABLED
VERIFY PageName.field IS CHECKED
VERIFY PageName.field IS EMPTY

# Content
VERIFY PageName.field CONTAINS "substring"
VERIFY PageName.field HAS VALUE "exact"
VERIFY PageName.field HAS ATTRIBUTE "href" EQUAL "/home"
VERIFY PageName.items HAS COUNT 5

# URL
VERIFY URL CONTAINS "/dashboard"
VERIFY URL EQUALS "https://example.com"
VERIFY URL MATCHES ".*dashboard.*"

# Title
VERIFY TITLE CONTAINS "Welcome"
VERIFY TITLE EQUALS "Dashboard"
```

---

### Control Flow

```vero
# If/Else
IF PageName.heading IS VISIBLE {
    LOG "Heading visible"
} ELSE {
    LOG "Heading not visible"
}

# Comparison operators
IF maxRetries > 3 { ... }
IF status == "pending" { ... }
IF count != 0 { ... }

# Repeat
REPEAT 3 TIMES {
    CLICK nextButton
}

# For loop
FOR i FROM 1 TO 5 {
    FILL "Item" WITH "Value"
}
```

---

### Variables

```vero
TEXT greeting = "Hello"
NUMBER maxRetries = 3
FLAG isEnabled = true
LIST colors = "red", "green", "blue"

# Save from element
SAVE TEXT OF PageName.price AS currentPrice
SAVE ATTRIBUTE "href" OF PageName.link AS linkUrl
```

---

### Fixtures

```vero
FIXTURE authenticatedUser WITH role {
    SCOPE test                          # Per-test (or SCOPE worker)
    DEPENDS ON page                     # Fixture dependencies
    AUTO                                # Run automatically
    OPTION timeout DEFAULT 30000

    SETUP {
        OPEN "/login"
        FILL emailInput WITH "admin@test.com"
        CLICK loginBtn
        WAIT 2 SECONDS
    }

    TEARDOWN {
        CLICK logoutBtn
    }
}

# Usage in feature:
FEATURE Dashboard {
    WITH FIXTURE authenticatedUser { role = "admin" }

    SCENARIO AdminSeesDashboard {
        VERIFY AdminPanel IS VISIBLE
    }
}
```

---

## VDQL - Vero Data Query Language

### Table References

```vero
TestData.Users                              # All rows
TestData.Users.email                        # Single column
TestData.Users[1]                           # Row by index (0-based)
TestData.Users[1].email                     # Single cell
TestData.Users[5..10]                       # Row range
TestData.Users cell [1, 2]                  # Access by row,col
```

### Basic Queries

```vero
# Load all rows
DATA users = TestData.Users

# Single column as list
LIST emails = TestData.Users.email

# First/last/random
DATA firstUser = FIRST TestData.Users
DATA lastAdmin = LAST TestData.Users WHERE role == "admin"
DATA randomUser = RANDOM TestData.Users

# Multiple columns
LIST userData = TestData.Users.(email, firstName, lastName)
```

### Filtering (WHERE)

```vero
DATA admin = TestData.Users WHERE role == "admin"

DATA activeUsers = TestData.Users
    WHERE status == "active" AND created >= DAYS AGO 30

# Operators
WHERE column == "value"              # Equals
WHERE column != "value"              # Not equals
WHERE column > 100                   # Greater than
WHERE column < 100                   # Less than
WHERE column >= 100                  # Greater or equal
WHERE column <= 100                  # Less or equal

# Text matching
WHERE email CONTAINS "@example.com"
WHERE name STARTS WITH "John"
WHERE email ENDS WITH ".com"
WHERE phone MATCHES "[0-9]{10}"      # Regex

# Lists
WHERE status IN ["active", "pending"]
WHERE status NOT IN ["deleted", "archived"]

# Null/Empty
WHERE email IS EMPTY
WHERE email IS NOT EMPTY
WHERE deletedAt IS NULL

# Date operators
WHERE createdAt >= TODAY
WHERE createdAt >= DAYS AGO 7
WHERE createdAt >= MONTHS AGO 3
WHERE createdAt <= YEARS AGO 1

# Complex conditions
WHERE (status == "active" AND amount > 100) OR priority == "high"
WHERE NOT (status == "deleted")
```

### Aggregations

```vero
NUMBER count = COUNT TestData.Users
NUMBER distinctRoles = COUNT DISTINCT TestData.Users.role

NUMBER totalAmount = SUM TestData.Orders.amount
NUMBER avgPrice = AVERAGE TestData.Products.price
NUMBER minPrice = MIN TestData.Products.price
NUMBER maxPrice = MAX TestData.Products.price

# With WHERE
NUMBER activeCount = COUNT TestData.Users WHERE status == "active"

# Metadata
NUMBER rowCount = ROWS IN TestData.Orders
NUMBER colCount = COLUMNS IN TestData.Products
LIST headers = HEADERS OF TestData.Users
```

### Sorting & Limiting

```vero
LIST users = TestData.Users ORDER BY lastName ASC, firstName ASC
LIST recentOrders = TestData.Orders ORDER BY createdAt DESC

LIST first10 = TestData.Users LIMIT 10
LIST page2 = TestData.Users OFFSET 10 LIMIT 10

# Combined
DATA user = TestData.Users
    WHERE status == "active"
    ORDER BY createdAt DESC
    LIMIT 1
```

### Default Values

```vero
DATA user = TestData.Users WHERE id == 999 DEFAULT { id: 0, name: "Unknown" }
```

### FOR EACH Loop

```vero
DATA users = TestData.Users WHERE status == "active"

FOR EACH user IN users {
    FILL emailField WITH user.email
    FILL passwordField WITH user.password
    CLICK loginBtn
    VERIFY "Dashboard" IS VISIBLE
    CLICK logoutBtn
}
```

---

## Transpiler Patterns

### Page Object → TypeScript Class

```vero
PAGE LoginPage {
    FIELD emailInput = "Email"
    FIELD submitBtn = button "Submit"

    login WITH email, password { ... }
}
```

Transpiles to:

```typescript
class LoginPage {
    readonly page: Page;
    readonly emailInput: Locator;
    readonly submitBtn: Locator;

    constructor(page: Page) {
        this.page = page;
        this.emailInput = page.getByLabel('Email');
        this.submitBtn = page.getByRole('button', { name: 'Submit' });
    }

    async login(email: string, password: string): Promise<void> {
        // ... transpiled statements
    }
}
```

### Feature → Playwright Test Suite

```vero
FEATURE Login {
    SCENARIO UserCanLogin @smoke { ... }
}
```

Transpiles to:

```typescript
test.describe('Login', () => {
    test('User can login @smoke', async ({ page }) => {
        // ... transpiled statements
    });
});
```

---

## Common Tasks

### Adding a New Action Type

1. Update grammar: `/vero-lang/grammar/Vero.g4`
2. Add AST node: `/vero-lang/src/parser/ast.ts`
3. Update parser: `/vero-lang/src/parser/parser.ts`
4. Add transpiler case: `/vero-lang/src/transpiler/transpiler.ts`
5. Regenerate parser: `npm run build:parser`

### Adding Syntax Highlighting

Update `/frontend/src/components/vero/veroLanguage.ts`:
- Add keyword to `keywords`, `actions`, or `assertions` array
- Update `tokenProvider` patterns if needed

---

## Utility Functions

Vero provides built-in functions for string manipulation, dates, numbers, and random data generation.

### String Utilities

```vero
TEXT clean = TRIM rawInput                        # Remove whitespace
TEXT upper = CONVERT name TO UPPERCASE            # UPPERCASE
TEXT lower = CONVERT email TO LOWERCASE           # lowercase
TEXT first5 = EXTRACT code FROM 0 TO 5            # Substring
TEXT fixed = REPLACE url "http" WITH "https"      # Replace
LIST parts = SPLIT csv BY ","                     # Split to list
TEXT combined = JOIN items WITH ", "              # Join list
NUMBER len = LENGTH OF name                       # String length
TEXT padded = PAD num TO 5 WITH "0"               # Pad string
```

### Date Utilities

```vero
TEXT date = TODAY                                 # Current date
TEXT timestamp = NOW                              # Current datetime
TEXT nextWeek = ADD 7 DAYS TO TODAY               # Add days
TEXT lastMonth = SUBTRACT 30 DAYS FROM TODAY      # Subtract days
TEXT futureDate = ADD 1 MONTH TO startDate        # Add months
TEXT formatted = FORMAT TODAY AS "MM/DD/YYYY"     # Format date
NUMBER yr = YEAR OF birthDate                     # Extract year
NUMBER mo = MONTH OF date                         # Extract month
NUMBER dy = DAY OF date                           # Extract day
```

### Number Utilities

```vero
NUMBER price = ROUND total TO 2 DECIMALS          # Round to decimals
NUMBER qty = ROUND items UP                       # Round up
NUMBER qty = ROUND items DOWN                     # Round down
NUMBER diff = ABSOLUTE change                     # Absolute value
TEXT priceStr = FORMAT total AS CURRENCY "USD"    # Currency format
TEXT pct = FORMAT discount AS PERCENT             # Percent format
NUMBER val = CONVERT "123" TO NUMBER              # Parse number
```

### Random/Generate Utilities

```vero
TEXT code = GENERATE "[A-Z0-9]{8}"                # Random from regex
NUMBER pick = RANDOM NUMBER FROM 1 TO 100         # Random number
TEXT id = GENERATE UUID                           # Generate UUID
```

### Chaining Operations

```vero
# Use THEN to chain operations
TEXT result = TRIM email THEN CONVERT TO LOWERCASE

# Or use intermediate variables for clarity
TEXT step1 = TRIM email
TEXT step2 = CONVERT step1 TO LOWERCASE
TEXT step3 = REPLACE step2 "old" WITH "new"
```

---

## Gotchas

1. **Case Insensitive**: All Vero keywords are case-insensitive (CLICK = click = Click)
2. **String Escaping**: Use `\"` inside strings
3. **Comments**: Use `#` for single-line comments
4. **Variables**: Variables are plain identifiers (e.g., `user`, `count`) - no `$` prefix needed
5. **SCENARIO Names**: Use PascalCase identifiers, not quoted strings (`SCENARIO UserCanLogin` not `SCENARIO "User can login"`)
6. **PERFORM Keyword**: Use `PERFORM` to call page actions (`PERFORM LoginPage.login WITH args`)
7. **Data Loading**: Data is loaded ONCE at test start, queries run in-memory
8. **Selector Priority**: testId > role > label > text > CSS (for reliability)
