# Vero Grammar Enhancement Specification

**Document Version:** 1.0.0
**Author:** Agent 10 - ANTLR Grammar Validator & Tester
**Date:** 2025-12-31
**Status:** Ready for Implementation

---

## Executive Summary

This document specifies the grammar enhancements required to bring Vero DSL to TypeScript parity. The current grammar provides a solid foundation for test automation, but lacks advanced programming constructs necessary for complex test scenarios.

### Priority Classification

| Priority | Description | Timeline |
|----------|-------------|----------|
| P0 - Critical | Required for MVP, blocks multiple features | Phase 1 (Immediate) |
| P1 - High | Enables key use cases, highly requested | Phase 2 (Next Sprint) |
| P2 - Medium | Nice to have, improves developer experience | Phase 3 (Backlog) |
| P3 - Low | Future consideration, advanced use cases | Phase 4+ |

---

## Current Grammar Analysis

### Supported Features
- Page object declarations with fields and actions
- Feature declarations with scenarios, hooks, and tags
- 15 action types (click, fill, open, check, etc.)
- 6 assertion states (visible, hidden, enabled, disabled, checked, empty)
- Contains assertion
- Control flow (if/else, repeat)
- 4 variable types (text, number, flag, list)
- Return statements (no return type annotation)
- Comparison operators (==, !=, >, <, >=, <=)
- Comments (line comments with #)
- Case-insensitive keywords

### Grammar Statistics
- **Parser Rules:** 50
- **Lexer Rules:** 78 tokens
- **Keywords:** 47
- **Conflicts:** 0 (zero shift/reduce or reduce/reduce conflicts)

---

## P0 - Critical Enhancements

### 1. Functions with Return Values

**Rationale:** Enable reusable utility functions that compute values.

**Current Limitation:**
```vero
# Cannot create utility functions that return computed values
```

**Proposed Syntax:**
```vero
function calculateTotal with price, tax returns number {
    number total = price + (price * tax)
    return total
}

function formatCurrency with amount returns text {
    return "$" + amount
}

# Usage
number total = calculateTotal(100, 0.08)
text display = formatCurrency(total)
```

**ANTLR Grammar Addition:**
```antlr
// Add to parser rules
functionDeclaration
    : FUNCTION IDENTIFIER (WITH parameterList)? (RETURNS typeAnnotation)? LBRACE statement* RBRACE
    ;

functionCall
    : IDENTIFIER LPAREN argumentList? RPAREN
    ;

typeAnnotation
    : TEXT | NUMBER | FLAG | LIST | IDENTIFIER
    ;

// Add to lexer rules
FUNCTION    : F U N C T I O N ;
```

**Implementation Notes:**
- Functions can be declared at page level or global level
- Return type is optional but recommended
- Function calls can be used in expressions
- Supports recursion

---

### 2. Try/Catch Error Handling

**Rationale:** Graceful error handling is essential for robust test automation.

**Current Limitation:**
```vero
# No way to handle errors gracefully
click "MaybeExists"  # Fails entire test if element doesn't exist
```

**Proposed Syntax:**
```vero
scenario "Handle errors" {
    try {
        click "OptionalButton"
        log "Button clicked"
    } catch error {
        log "Button not found: " + error.message
        take screenshot "error-state"
    } finally {
        log "Cleanup complete"
    }
}

# Simple try/catch without finally
try {
    do riskyOperation
} catch {
    log "Operation failed"
}

# Rethrow pattern
try {
    doSomething
} catch error {
    log error.message
    throw error
}
```

**ANTLR Grammar Addition:**
```antlr
// Add to parser rules
tryStatement
    : TRY LBRACE statement* RBRACE catchClause? finallyClause?
    ;

catchClause
    : CATCH IDENTIFIER? LBRACE statement* RBRACE
    ;

finallyClause
    : FINALLY LBRACE statement* RBRACE
    ;

throwStatement
    : THROW expression?
    ;

// Add to lexer rules
TRY         : T R Y ;
CATCH       : C A T C H ;
FINALLY     : F I N A L L Y ;
THROW       : T H R O W ;
```

**Implementation Notes:**
- Error object has `message` and `name` properties
- finally block always executes
- Errors can be rethrown
- Nested try/catch is supported

---

### 3. Advanced Loops (for, while, forEach)

**Rationale:** Current `repeat N times` is too limited for real-world scenarios.

**Current Limitation:**
```vero
# Cannot iterate over collections
# Cannot loop until condition is met
```

**Proposed Syntax:**
```vero
# For loop with range
for i from 1 to 10 {
    log "Iteration " + i
    click item
}

# For each loop
list users = ["user1", "user2", "user3"]
for each user in users {
    fill "username" with user
    click "Submit"
}

# While loop
while ".loading" is visible {
    wait 100 milliseconds
}

# While with counter
number attempts = 0
while ".error" is visible and attempts < 5 {
    click "Retry"
    wait 1 seconds
    attempts = attempts + 1
}

# Do-while (optional)
do {
    click "Next"
} while ".more" is visible
```

**ANTLR Grammar Addition:**
```antlr
// Add to parser rules
forStatement
    : FOR IDENTIFIER FROM expression TO expression LBRACE statement* RBRACE
    ;

forEachStatement
    : FOR EACH IDENTIFIER IN expression LBRACE statement* RBRACE
    ;

whileStatement
    : WHILE booleanExpression LBRACE statement* RBRACE
    ;

doWhileStatement
    : DO LBRACE statement* RBRACE WHILE booleanExpression
    ;

// Update statement rule
statement
    : actionStatement
    | assertionStatement
    | controlFlowStatement
    | forStatement           // NEW
    | forEachStatement       // NEW
    | whileStatement         // NEW
    | doWhileStatement       // NEW
    | variableDeclaration
    | returnStatement
    ;

// Add to lexer rules (FOR already exists)
WHILE       : W H I L E ;
```

**Implementation Notes:**
- `for` loop generates numeric range
- `for each` iterates over lists and collections
- `while` evaluates condition before each iteration
- Break and continue statements are P1 priority

---

### 4. Data Type Annotations

**Rationale:** Type safety improves code quality and IDE support.

**Current Limitation:**
```vero
# Variable types are implicit
text name = "value"  # Type declared but not enforced
```

**Proposed Syntax:**
```vero
# Explicit type annotations on variables
text: username = "testuser"
number: count = 5
flag: isEnabled = true
list<text>: items = ["a", "b", "c"]
list<number>: prices = [10.99, 20.50, 15.00]

# Function parameter types
function login with email: text, password: text returns flag {
    fill "email" with email
    fill "password" with password
    click "Submit"
    return "Dashboard" is visible
}

# Page field types (optional but useful for tooling)
page LoginPage {
    field<input> emailField = "#email"
    field<button> submitBtn = "Submit"
    field<checkbox> rememberMe = "#remember"
}
```

**ANTLR Grammar Addition:**
```antlr
// Update parser rules
variableDeclaration
    : variableType (LT typeAnnotation GT)? COLON? IDENTIFIER EQUALS expression
    | IDENTIFIER COLON typeAnnotation EQUALS expression  // Inferred style
    ;

typedParameter
    : IDENTIFIER (COLON typeAnnotation)?
    ;

parameterList
    : typedParameter (COMMA typedParameter)*
    ;

genericType
    : variableType LT typeAnnotation GT
    ;

// Add to lexer
COLON       : ':' ;
```

**Implementation Notes:**
- Type annotations are optional (backward compatible)
- Enables future type checking in transpiler
- IDE can provide better autocomplete

---

## P1 - High Priority Enhancements

### 5. Classes and Objects

**Rationale:** Enable complex test data models and reusable components.

**Proposed Syntax:**
```vero
class User {
    text username
    text email
    number age
    flag isActive

    constructor with username, email {
        this.username = username
        this.email = email
        this.age = 0
        this.isActive = true
    }

    method setAge with age {
        this.age = age
    }

    method isAdult returns flag {
        return this.age >= 18
    }

    method toString returns text {
        return this.username + " <" + this.email + ">"
    }
}

# Usage
User admin = new User("admin", "admin@example.com")
admin.setAge(30)

if admin.isAdult {
    log "Adult user: " + admin.toString
}
```

**ANTLR Grammar Addition:**
```antlr
classDeclaration
    : CLASS IDENTIFIER LBRACE classMember* RBRACE
    ;

classMember
    : classField
    | constructor
    | classMethod
    ;

classField
    : variableType IDENTIFIER
    ;

constructor
    : CONSTRUCTOR (WITH parameterList)? LBRACE statement* RBRACE
    ;

classMethod
    : METHOD IDENTIFIER (WITH parameterList)? (RETURNS typeAnnotation)? LBRACE statement* RBRACE
    ;

newExpression
    : NEW IDENTIFIER LPAREN argumentList? RPAREN
    ;

memberAccess
    : expression DOT IDENTIFIER
    ;

// Add to lexer
CLASS       : C L A S S ;
CONSTRUCTOR : C O N S T R U C T O R ;
METHOD      : M E T H O D ;
NEW         : N E W ;
THIS        : T H I S ;
```

---

### 6. Async/Await

**Rationale:** Handle asynchronous operations explicitly.

**Proposed Syntax:**
```vero
async function fetchUserData with userId returns User {
    text response = await fetch("/api/users/" + userId)
    return parseUser(response)
}

scenario "Async operations" {
    # Await in scenario
    User user = await fetchUserData(123)
    fill "name" with user.name

    # Parallel await
    list results = await all [
        fetchUserData(1),
        fetchUserData(2),
        fetchUserData(3)
    ]
}
```

**ANTLR Grammar Addition:**
```antlr
asyncFunction
    : ASYNC functionDeclaration
    ;

awaitExpression
    : AWAIT expression
    ;

// Add to lexer
ASYNC       : A S Y N C ;
AWAIT       : A W A I T ;
```

---

### 7. Module Imports/Exports

**Rationale:** Enable code organization across multiple files.

**Proposed Syntax:**
```vero
# pages/LoginPage.vero
export page LoginPage {
    field email = "#email"
    field password = "#password"
}

# features/Login.vero
import LoginPage from "./pages/LoginPage"
import { User, Order } from "./models/Models"
import * as Utils from "./helpers/utils"

feature Login {
    use LoginPage

    scenario "Test" {
        do Utils.setup
        do LoginPage.login with User.default.email, User.default.password
    }
}
```

**ANTLR Grammar Addition:**
```antlr
importStatement
    : IMPORT importClause FROM STRING_LITERAL
    ;

importClause
    : IDENTIFIER                                    # DefaultImport
    | LBRACE importSpecifier (COMMA importSpecifier)* RBRACE  # NamedImport
    | STAR AS IDENTIFIER                            # NamespaceImport
    ;

importSpecifier
    : IDENTIFIER (AS IDENTIFIER)?
    ;

exportStatement
    : EXPORT (pageDeclaration | featureDeclaration | classDeclaration | functionDeclaration)
    ;

// Add to lexer
IMPORT      : I M P O R T ;
EXPORT      : E X P O R T ;
AS          : A S ;
STAR        : '*' ;
```

---

### 8. Destructuring

**Rationale:** Simplify working with complex objects and responses.

**Proposed Syntax:**
```vero
# Object destructuring
map response = { "status": 200, "data": "Success", "message": "OK" }
{ status, data } = response
log "Status: " + status

# Array destructuring
list items = ["first", "second", "third"]
[first, second, ...rest] = items
log "First: " + first

# In parameters
function processUser with { name, email, age } {
    log name
    log email
    log age
}
```

**ANTLR Grammar Addition:**
```antlr
destructuringPattern
    : LBRACE destructuringProperty (COMMA destructuringProperty)* RBRACE  # ObjectPattern
    | LBRACK destructuringElement (COMMA destructuringElement)* RBRACK   # ArrayPattern
    ;

destructuringProperty
    : IDENTIFIER (COLON IDENTIFIER)?
    ;

destructuringElement
    : IDENTIFIER
    | SPREAD IDENTIFIER
    ;

destructuringAssignment
    : destructuringPattern EQUALS expression
    ;

// Add to lexer
SPREAD      : '...' ;
```

---

## P2 - Medium Priority Enhancements

### 9. Spread Operator

**Proposed Syntax:**
```vero
list a = [1, 2, 3]
list b = [...a, 4, 5, 6]

map defaults = { "timeout": 5000, "retries": 3 }
map config = { ...defaults, "timeout": 10000 }  # Override timeout
```

---

### 10. Optional Chaining and Nullish Coalescing

**Proposed Syntax:**
```vero
# Optional chaining
text name = user?.profile?.name

# Nullish coalescing
text displayName = user?.name ?? "Anonymous"

# Combined
number count = data?.items?.length ?? 0
```

---

### 11. Template Literals

**Proposed Syntax:**
```vero
text greeting = `Hello, ${username}!`
text multiline = `
    Line 1
    Line 2
    Line 3
`

log `User ${user.name} has ${user.orders.length} orders`
```

---

### 12. Break and Continue

**Proposed Syntax:**
```vero
for each item in items {
    if item.skip {
        continue
    }
    if item.isLast {
        break
    }
    process(item)
}
```

---

### 13. Switch/Match Expressions

**Proposed Syntax:**
```vero
match status {
    case "active":
        log "User is active"
    case "inactive":
        log "User is inactive"
    case "pending":
        log "User is pending"
    default:
        log "Unknown status"
}

# Expression form
text message = match status {
    case "active" => "Active user"
    case "inactive" => "Inactive user"
    default => "Unknown"
}
```

---

## P3 - Low Priority (Future Consideration)

### 14. Generics

```vero
function findFirst<T> with items: list<T>, predicate: (T) => flag returns T? {
    for each item in items {
        if predicate(item) {
            return item
        }
    }
    return null
}
```

### 15. Interfaces and Type Aliases

```vero
interface Clickable {
    method click
    method isVisible returns flag
}

type UserId = number
type UserMap = map<text, User>
```

### 16. Decorators

```vero
@retry(3)
@timeout(30000)
scenario "Flaky test" {
    # ...
}

@beforeEach
function setup {
    # ...
}
```

### 17. Computed Properties

```vero
class Rectangle {
    number width
    number height

    get area returns number {
        return this.width * this.height
    }

    set dimensions with w, h {
        this.width = w
        this.height = h
    }
}
```

---

## Implementation Roadmap

### Phase 1: Critical (Weeks 1-4)
1. Functions with return values
2. Try/catch error handling
3. Advanced loops (for, while, forEach)
4. Data type annotations

### Phase 2: High Priority (Weeks 5-8)
5. Classes and objects
6. Async/await
7. Module imports/exports
8. Destructuring

### Phase 3: Medium Priority (Weeks 9-12)
9. Spread operator
10. Optional chaining
11. Template literals
12. Break and continue
13. Switch/match

### Phase 4: Future (Backlog)
14. Generics
15. Interfaces
16. Decorators
17. Computed properties

---

## Backward Compatibility

All enhancements are designed to be **fully backward compatible**:

1. **New keywords** do not conflict with existing identifiers
2. **Optional syntax** - new features use opt-in syntax
3. **No breaking changes** to existing grammar rules
4. **Existing .vero files** will continue to parse correctly

---

## Grammar Metrics After Enhancement

| Metric | Current | After P0 | After P1 | Final |
|--------|---------|----------|----------|-------|
| Parser Rules | 50 | 65 | 85 | 100+ |
| Lexer Tokens | 78 | 85 | 95 | 110+ |
| Keywords | 47 | 55 | 70 | 85+ |
| Action Types | 15 | 15 | 15 | 15 |

---

## Testing Requirements

For each enhancement:

1. **Grammar Tests** - Validate parsing succeeds
2. **Lexer Tests** - Verify token recognition
3. **Edge Case Tests** - Handle malformed input
4. **Integration Tests** - Work with existing features
5. **Performance Tests** - No regression in parse time

---

## Agent 2 Handoff Notes

This specification is ready for Agent 2 (Vero Language Engineer) to begin implementation.

**Recommended Order:**
1. Start with P0 items - they unblock the most use cases
2. Implement one feature at a time
3. Add comprehensive tests before moving to next feature
4. Keep backward compatibility at all times

**Key Files to Modify:**
- `/vero-lang/grammar/Vero.g4` - Grammar definition
- Regenerate parser after each change
- Update AST types in `/vero-lang/src/parser/ast.ts`
- Update transpiler in `/vero-lang/src/transpiler/`

---

*Document End - Version 1.0.0*
