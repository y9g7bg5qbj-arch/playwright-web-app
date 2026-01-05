# Agent 10: ANTLR Grammar Validator & Tester
## The Foundation Expert

**Model:** Opus (Maximum Accuracy)
**Expertise:** ANTLR4, Compiler Design, Grammar Testing, Language Theory
**Priority:** CRITICAL - Must complete FIRST before Agent 2

---

## Mission

**Validate, test, and perfect the Vero ANTLR grammar** to ensure it's:
- ✅ Syntactically correct
- ✅ Unambiguous (no conflicts)
- ✅ Complete (covers all required features)
- ✅ Well-tested (comprehensive test suite)
- ✅ Production-ready foundation

**This agent's work is the FOUNDATION** for:
- Agent 2 (Vero Language Engineer) - Builds transpiler on this grammar
- Agent 5 (Test Data SME) - Data syntax integration
- All other agents that generate Vero code

---

## Why This Agent is Critical

### Current Risk
Without dedicated grammar validation:
- ❌ Grammar might have conflicts (shift/reduce, reduce/reduce)
- ❌ Ambiguous syntax could break parsing
- ❌ Missing test coverage for edge cases
- ❌ Parser generation might fail
- ❌ Transpiler built on broken grammar = disaster

### With Agent 10
- ✅ Grammar validated with ANTLR tools
- ✅ Zero conflicts guaranteed
- ✅ 100% syntax coverage
- ✅ Comprehensive test suite
- ✅ Agent 2 builds on solid foundation

---

## Detailed Tasks

### 1. Grammar Analysis & Validation

**1.1 ANTLR Grammar Validation**
```bash
# Use ANTLR4 built-in validator
antlr4 -Werror Vero.g4

# Check for:
# - Syntax errors
# - Undefined rules
# - Unreachable rules
# - Left recursion issues
```

**1.2 Conflict Detection**
```bash
# Generate parser and check for conflicts
antlr4 Vero.g4
# Analyze output for:
# - Shift/reduce conflicts
# - Reduce/reduce conflicts
# - Ambiguous alternatives
```

**1.3 Grammar Metrics**
- Count rules (parser + lexer)
- Measure complexity
- Identify potential performance issues
- Check for dead code

---

### 2. Syntax Coverage Testing

Create **comprehensive test suite** for every grammar construct:

**2.1 Page Objects**
```vero
# Test: Simple page
page SimplePage {
    field button = "Click Me"
}

# Test: Complex page with multiple fields
page ComplexPage {
    field emailInput = "Email"
    field passwordInput = "Password"
    field submitBtn = "Submit"
    field errorMsg = ".error-message"

    login with email, password {
        fill emailInput with email
        fill passwordInput with password
        click submitBtn
    }
}

# Test: Page with multiple actions
page CheckoutPage {
    field cardNumber = "#card-number"
    field cvv = "#cvv"

    fillCardDetails with card, cvv {
        fill cardNumber with card
        fill cvv with cvv
        click "Next"
    }

    verifyTotal with expectedAmount {
        verify ".total-amount" contains expectedAmount
    }
}
```

**2.2 Features & Scenarios**
```vero
# Test: Basic feature
feature Login {
    use LoginPage

    scenario "Valid login" {
        open "/login"
        fill LoginPage.emailInput with "test@example.com"
        click LoginPage.submitBtn
    }
}

# Test: Feature with hooks
feature CompleteFeature {
    use LoginPage
    use DashboardPage

    before each {
        open "/login"
        log "Starting test"
    }

    after each {
        take screenshot "final-state"
        clear cookies
    }

    before all {
        log "Suite started"
    }

    after all {
        log "Suite completed"
    }

    scenario "First scenario" @smoke @critical {
        click "Start"
    }

    scenario "Second scenario" @regression {
        verify "Welcome" is visible
    }
}
```

**2.3 Actions (All Types)**
```vero
scenario "All actions" {
    # Click
    click "Button"
    click LoginPage.submitBtn

    # Fill
    fill "email" with "test@example.com"
    fill LoginPage.emailInput with userData.email

    # Open
    open "/page"
    open "https://example.com"

    # Check/Uncheck
    check "termsCheckbox"
    uncheck "newsletter"

    # Select
    select "Option 1" from "dropdown"

    # Hover
    hover "menuItem"

    # Press
    press "Enter"
    press "Control+C"

    # Scroll
    scroll to "footer"
    scroll down
    scroll up
    scroll left
    scroll right

    # Wait
    wait 2 seconds
    wait 500 milliseconds
    wait for "element"

    # Do (call page action)
    do LoginPage.login with "user@test.com", "password"

    # Refresh
    refresh

    # Clear
    clear "searchInput"

    # Screenshot
    take screenshot
    take screenshot "error-state"

    # Log
    log "Test message"
    log "Value: " + myVariable
}
```

**2.4 Assertions**
```vero
scenario "All assertions" {
    # Visibility
    verify "Dashboard" is visible
    verify "LoadingSpinner" is not visible
    verify ".error" is hidden

    # State
    verify LoginPage.submitBtn is enabled
    verify "disabledField" is disabled
    verify "checkbox" is checked
    verify "emptyField" is empty

    # Content
    verify "Welcome Message" contains "Hello"
    verify errorMessage is not contains "Success"
}
```

**2.5 Control Flow**
```vero
scenario "Control flow" {
    # If/Else
    if LoginPage.submitBtn is enabled {
        click LoginPage.submitBtn
    }

    if "error" is visible {
        log "Error found"
    } else {
        log "No errors"
    }

    # Repeat
    repeat 5 times {
        click "Next"
        wait 1 seconds
    }

    # Nested
    if userType == "admin" {
        repeat 3 times {
            click "adminButton"
        }
    } else {
        click "userButton"
    }
}
```

**2.6 Variables**
```vero
scenario "Variables" {
    # Text
    text username = "testuser"
    text email = "user@test.com"

    # Number
    number count = 5
    number price = 99.99

    # Flag (boolean)
    flag isActive = true
    flag isVisible = false

    # List
    list items = ["apple", "banana", "orange"]

    # Usage
    fill "username" with username
    verify count == 5

    if isActive {
        log "Active user"
    }
}
```

**2.7 Advanced Features (TypeScript Parity)**

These need NEW grammar rules:

```vero
# Functions
function calculateTotal with price, tax returns number {
    number total = price + (price * tax)
    return total
}

# Classes
class User {
    field username
    field email
    field age

    constructor with username, email {
        this.username = username
        this.email = email
        this.age = 0
    }

    method isAdult returns flag {
        return this.age >= 18
    }
}

# Async/Await
async function fetchData with url returns text {
    text response = await fetch(url)
    return response
}

# Try/Catch
scenario "Error handling" {
    try {
        click "NonExistentButton"
    } catch error {
        log "Error: " + error.message
        take screenshot "error"
    }
}

# Loops
scenario "Loops" {
    # For loop
    for item in cartItems {
        click item.removeButton
    }

    # While loop
    while ".loading" is visible {
        wait 100 milliseconds
    }

    # ForEach
    forEach user in testUsers {
        do LoginPage.login with user.email, user.password
    }
}

# Destructuring
map response = { "status": 200, "data": "Success" }
{ status, data } = response

# Spread
list numbers = [1, 2, 3]
list more = [...numbers, 4, 5]

# Import/Export
import LoginPage from "./pages/LoginPage.vero"
import { User, Order } from "./models/Models.vero"
```

---

### 3. Grammar Enhancement Design

**3.1 Document Required Grammar Changes**

Create specification for Agent 2:

```markdown
# Grammar Enhancement Specification

## 1. Functions
Add production rules for:
- Function declaration
- Function parameters with types
- Return type annotation
- Function body (statements)
- Return statement

ANTLR Grammar:
functionDeclaration
    : FUNCTION IDENTIFIER (WITH parameterList)? (RETURNS type)? LBRACE statement* RBRACE
    ;

parameterList
    : parameter (COMMA parameter)*
    ;

parameter
    : IDENTIFIER (COLON type)?
    ;

type
    : TEXT | NUMBER | FLAG | LIST | IDENTIFIER
    ;

## 2. Classes
...
```

**3.2 Priority-Ordered Enhancement List**

1. **Critical (Required for MVP):**
   - Functions with return values
   - Try/catch error handling
   - For/while loops
   - Data type annotations

2. **High Priority:**
   - Classes and objects
   - Async/await
   - Module imports
   - Destructuring

3. **Nice to Have:**
   - Spread operators
   - Generic types
   - Advanced type inference

---

### 4. Test Suite Implementation

**4.1 Parser Test Framework**

```typescript
// vero-lang/src/tests/grammar/parser.test.ts
import { VeroParser } from '../parser/VeroParser';
import { VeroLexer } from '../lexer/VeroLexer';
import { CharStreams, CommonTokenStream } from 'antlr4ng';

describe('Vero Grammar - Parser Tests', () => {
  function parse(input: string) {
    const chars = CharStreams.fromString(input);
    const lexer = new VeroLexer(chars);
    const tokens = new CommonTokenStream(lexer);
    const parser = new VeroParser(tokens);

    // Collect errors
    const errors: string[] = [];
    parser.removeErrorListeners();
    parser.addErrorListener({
      syntaxError: (recognizer, offendingSymbol, line, column, msg) => {
        errors.push(`Line ${line}:${column} - ${msg}`);
      }
    });

    const tree = parser.program();
    return { tree, errors };
  }

  describe('Page Objects', () => {
    it('should parse simple page', () => {
      const vero = `
        page LoginPage {
          field emailInput = "Email"
        }
      `;
      const { errors } = parse(vero);
      expect(errors).toHaveLength(0);
    });

    it('should parse page with action', () => {
      const vero = `
        page LoginPage {
          field emailInput = "Email"

          login with email, password {
            fill emailInput with email
          }
        }
      `;
      const { errors } = parse(vero);
      expect(errors).toHaveLength(0);
    });

    it('should reject page without brace', () => {
      const vero = `page LoginPage { field email = "Email"`;
      const { errors } = parse(vero);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Features & Scenarios', () => {
    it('should parse feature with scenario', () => {
      const vero = `
        feature Login {
          use LoginPage

          scenario "Valid login" {
            click "Submit"
          }
        }
      `;
      const { errors } = parse(vero);
      expect(errors).toHaveLength(0);
    });

    it('should parse scenario with tags', () => {
      const vero = `
        feature Login {
          scenario "Test" @smoke @critical {
            log "Test"
          }
        }
      `;
      const { errors } = parse(vero);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Actions', () => {
    // Test every single action type
    const actions = [
      'click "Button"',
      'fill "email" with "test@example.com"',
      'open "/page"',
      'check "checkbox"',
      'uncheck "checkbox"',
      'select "Option" from "dropdown"',
      'hover "element"',
      'press "Enter"',
      'scroll to "footer"',
      'scroll down',
      'wait 2 seconds',
      'wait for "element"',
      'do LoginPage.login with "email", "pass"',
      'refresh',
      'clear "input"',
      'take screenshot',
      'take screenshot "name"',
      'log "message"'
    ];

    actions.forEach(action => {
      it(`should parse: ${action}`, () => {
        const vero = `
          feature Test {
            scenario "Test" {
              ${action}
            }
          }
        `;
        const { errors } = parse(vero);
        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('Assertions', () => {
    // Test all assertion variations
  });

  describe('Control Flow', () => {
    // Test if/else, repeat, nested
  });

  describe('Variables', () => {
    // Test all variable types
  });

  describe('Edge Cases', () => {
    it('should handle comments', () => {
      const vero = `
        # This is a comment
        page LoginPage {
          # Another comment
          field email = "Email"  # Inline comment
        }
      `;
      const { errors } = parse(vero);
      expect(errors).toHaveLength(0);
    });

    it('should handle empty page', () => {
      const vero = `page EmptyPage {}`;
      const { errors } = parse(vero);
      expect(errors).toHaveLength(0);
    });

    it('should handle special characters in strings', () => {
      const vero = `
        scenario "Test" {
          fill "email" with "user+tag@example.com"
          log "Quote: \\"Hello\\""
        }
      `;
      const { errors } = parse(vero);
      expect(errors).toHaveLength(0);
    });

    it('should handle nested control flow', () => {
      const vero = `
        scenario "Nested" {
          if condition {
            repeat 3 times {
              if another {
                log "Deep"
              }
            }
          }
        }
      `;
      const { errors } = parse(vero);
      expect(errors).toHaveLength(0);
    });
  });
});
```

**4.2 Integration Tests with Real .vero Files**

```typescript
// vero-lang/src/tests/grammar/integration.test.ts
import { readFileSync } from 'fs';
import { glob } from 'glob';

describe('Vero Grammar - Integration Tests', () => {
  it('should parse all example .vero files', async () => {
    const veroFiles = await glob('test-project/**/*.vero');

    for (const file of veroFiles) {
      const content = readFileSync(file, 'utf-8');
      const { errors } = parse(content);

      expect(errors).toHaveLength(0);
      // If errors, show which file failed
      if (errors.length > 0) {
        console.error(`Failed to parse ${file}:`, errors);
      }
    }
  });
});
```

---

### 5. Grammar Documentation

**5.1 Complete Grammar Reference**

Create `VERO_GRAMMAR_REFERENCE.md`:

```markdown
# Vero Grammar Reference

## Parser Rules

### Program Structure
- program: declaration* EOF
- declaration: pageDeclaration | featureDeclaration

### Page Objects
- pageDeclaration: PAGE IDENTIFIER LBRACE pageBody RBRACE
- pageBody: pageMember*
- pageMember: fieldDeclaration | actionDeclaration
- fieldDeclaration: FIELD IDENTIFIER EQUALS STRING_LITERAL
- actionDeclaration: IDENTIFIER (WITH parameterList)? LBRACE statement* RBRACE

[Complete documentation of every rule...]

## Lexer Rules

### Keywords
- PAGE, FEATURE, SCENARIO, FIELD, USE, etc.

### Literals
- STRING_LITERAL: "..."
- NUMBER_LITERAL: [0-9]+
- IDENTIFIER: [a-zA-Z_][a-zA-Z0-9_]*

[Complete lexer documentation...]

## Examples

[100+ examples covering every grammar construct]
```

**5.2 Railroad Diagrams**

Generate visual grammar diagrams using ANTLR tools or online generators.

---

### 6. Performance Testing

**6.1 Parser Performance**

```typescript
describe('Grammar Performance', () => {
  it('should parse large file quickly', () => {
    const largeVero = generateLargeVeroFile(1000); // 1000 scenarios

    const start = performance.now();
    const { errors } = parse(largeVero);
    const duration = performance.now() - start;

    expect(errors).toHaveLength(0);
    expect(duration).toBeLessThan(5000); // < 5 seconds
  });

  it('should handle deeply nested structures', () => {
    const deepNesting = generateDeeplyNested(20); // 20 levels
    const { errors } = parse(deepNesting);
    expect(errors).toHaveLength(0);
  });
});
```

---

### 7. Error Recovery Testing

**7.1 Graceful Error Handling**

```typescript
describe('Error Recovery', () => {
  it('should report clear error for missing brace', () => {
    const vero = `
      page LoginPage {
        field email = "Email"
      # Missing closing brace
    `;
    const { errors } = parse(vero);
    expect(errors[0]).toContain('missing }');
  });

  it('should report error for invalid syntax', () => {
    const vero = `
      scenario "Test" {
        click click "Button"  # Duplicate keyword
      }
    `;
    const { errors } = parse(vero);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should provide helpful error messages', () => {
    // Test that error messages are user-friendly
  });
});
```

---

### 8. Validation Report

**8.1 Grammar Health Report**

Generate comprehensive report:

```typescript
// vero-lang/scripts/validate-grammar.ts
export async function generateGrammarReport() {
  return {
    validation: {
      antlrErrors: 0,
      conflicts: { shiftReduce: 0, reduceReduce: 0 },
      warnings: []
    },
    coverage: {
      totalRules: 150,
      testedRules: 150,
      coveragePercent: 100
    },
    tests: {
      total: 250,
      passed: 250,
      failed: 0
    },
    performance: {
      avgParseTime: '12ms',
      maxFileSize: '10000 lines'
    },
    readiness: 'PRODUCTION_READY' // or 'NEEDS_WORK'
  };
}
```

---

## Deliverables

### 📦 Files to Create/Modify

1. **Grammar Files:**
   - `vero-lang/grammar/Vero.g4` (validated & enhanced)
   - `vero-lang/grammar/VeroLexer.g4` (if split)
   - `vero-lang/grammar/VeroParser.g4` (if split)

2. **Test Suite:**
   - `vero-lang/src/tests/grammar/parser.test.ts`
   - `vero-lang/src/tests/grammar/lexer.test.ts`
   - `vero-lang/src/tests/grammar/integration.test.ts`
   - `vero-lang/src/tests/grammar/performance.test.ts`
   - `vero-lang/src/tests/grammar/error-recovery.test.ts`

3. **Test Fixtures:**
   - `vero-lang/test-project/grammar-tests/*.vero` (100+ test files)

4. **Documentation:**
   - `docs/VERO_GRAMMAR_REFERENCE.md`
   - `docs/GRAMMAR_VALIDATION_REPORT.md`
   - `docs/GRAMMAR_ENHANCEMENT_SPEC.md`

5. **Scripts:**
   - `vero-lang/scripts/validate-grammar.ts`
   - `vero-lang/scripts/generate-parser.ts`
   - `vero-lang/scripts/run-grammar-tests.ts`

6. **CI Integration:**
   - `.github/workflows/grammar-validation.yml`

---

## Success Criteria

### ✅ Grammar Validation
- [ ] Zero ANTLR errors
- [ ] Zero shift/reduce conflicts
- [ ] Zero reduce/reduce conflicts
- [ ] No warnings in grammar generation
- [ ] Parser generates successfully

### ✅ Test Coverage
- [ ] 100% of current grammar rules tested
- [ ] All actions tested (18+ actions)
- [ ] All assertions tested (10+ variations)
- [ ] Control flow tested (if/else, repeat)
- [ ] Variables tested (all types)
- [ ] Edge cases tested (50+ cases)
- [ ] Integration tests pass for existing .vero files

### ✅ Performance
- [ ] Parse 1000-scenario file in < 5 seconds
- [ ] Handle 20-level nesting
- [ ] Memory usage reasonable

### ✅ Documentation
- [ ] Complete grammar reference
- [ ] Enhancement specification for Agent 2
- [ ] Test documentation
- [ ] Examples for all constructs

### ✅ Enhancement Spec
- [ ] Detailed design for functions
- [ ] Detailed design for classes
- [ ] Detailed design for async/await
- [ ] Detailed design for try/catch
- [ ] Detailed design for loops
- [ ] Detailed design for imports
- [ ] Priority-ordered roadmap

### ✅ Handoff to Agent 2
- [ ] Validated grammar file
- [ ] Complete test suite
- [ ] Enhancement specification
- [ ] Zero blocking issues
- [ ] Agent 2 can start immediately

---

## Timeline

**Estimated:** 3-4 hours

**Breakdown:**
- Grammar validation: 30 min
- Current feature testing: 1 hour
- Enhancement design: 1 hour
- Documentation: 1 hour
- Performance & error testing: 30 min
- Final report: 30 min

---

## Dependencies

**Before Agent 10:**
- None (starts immediately)

**After Agent 10:**
- **Agent 2** depends on Agent 10's validated grammar
- **Agent 5** depends on Agent 10's data syntax design
- All other agents indirectly depend on solid grammar foundation

---

## Why This Matters

**Without Agent 10:**
- ⚠️ Agent 2 might build transpiler on broken grammar
- ⚠️ Runtime errors during test execution
- ⚠️ Difficult to debug grammar vs transpiler issues
- ⚠️ Delayed feedback loop (find issues late)

**With Agent 10:**
- ✅ Guaranteed valid grammar foundation
- ✅ Agent 2 has clear specification
- ✅ All agents work with validated syntax
- ✅ Early detection of grammar issues
- ✅ Faster development (solid foundation)

---

## This is the FIRST agent to spawn!

Agent 10 → Agent 2 → All Others
