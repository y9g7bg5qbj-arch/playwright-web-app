# Vero Grammar Reference

**Version:** 1.0.0
**Author:** Agent 10 - ANTLR Grammar Validator & Tester
**Date:** 2025-12-31

---

## Table of Contents

1. [Overview](#overview)
2. [Lexical Structure](#lexical-structure)
3. [Program Structure](#program-structure)
4. [Page Declarations](#page-declarations)
5. [Feature Declarations](#feature-declarations)
6. [Statements](#statements)
7. [Actions](#actions)
8. [Assertions](#assertions)
9. [Control Flow](#control-flow)
10. [Variables](#variables)
11. [Expressions](#expressions)
12. [Complete Examples](#complete-examples)

---

## Overview

Vero is a domain-specific language (DSL) for test automation that transpiles to Playwright. It provides a human-readable syntax designed to be accessible to non-programmers while remaining powerful enough for complex test scenarios.

### Design Principles

1. **Readability First** - Code should read like English
2. **Test-Focused** - Built specifically for UI test automation
3. **Page Object Pattern** - Native support for page objects
4. **Playwright Integration** - Transpiles directly to Playwright

### Key Features

- Case-insensitive keywords (`page`, `PAGE`, `Page` all work)
- Page object declarations with fields and actions
- Feature/scenario test organization (BDD-style)
- 15+ built-in action types
- 6+ assertion states
- Control flow (if/else, repeat)
- 4 variable types (text, number, flag, list)
- Comments (line comments with `#`)

---

## Lexical Structure

### Keywords (Case-Insensitive)

#### Structural Keywords
```
PAGE, FEATURE, SCENARIO, FIELD, USE
```

#### Hooks
```
BEFORE, AFTER, EACH, ALL
```

#### Actions
```
CLICK, FILL, OPEN, CHECK, UNCHECK, SELECT, HOVER, PRESS,
SCROLL, WAIT, DO, REFRESH, CLEAR, TAKE, SCREENSHOT, LOG
```

#### Assertions
```
VERIFY, IS, NOT, VISIBLE, HIDDEN, ENABLED, DISABLED,
CHECKED, EMPTY, CONTAINS
```

#### Control Flow
```
IF, ELSE, REPEAT, TIMES
```

#### Variables
```
TEXT, NUMBER, FLAG, LIST, RETURN, RETURNS
```

#### Connectors
```
WITH, FROM, TO, IN, FOR
```

#### Time Units
```
SECONDS, MILLISECONDS
```

#### Directions
```
UP, DOWN, LEFT, RIGHT
```

### Operators

| Operator | Description |
|----------|-------------|
| `=` | Assignment |
| `==` | Equality comparison |
| `!=` | Inequality comparison |
| `>` | Greater than |
| `<` | Less than |
| `>=` | Greater than or equal |
| `<=` | Less than or equal |

### Delimiters

| Symbol | Usage |
|--------|-------|
| `{` `}` | Block delimiters |
| `(` `)` | Parentheses (expressions) |
| `[` `]` | Brackets (lists) |
| `,` | Separator |
| `.` | Member access |
| `@` | Tag prefix |
| `#` | Comment prefix |

### Literals

#### String Literals
```vero
"Hello World"
"Path\\to\\file"
"Line1\nLine2"
"Quote: \"text\""
""  # Empty string
```

**Escape Sequences:**
- `\\` - Backslash
- `\"` - Double quote
- `\n` - Newline
- `\t` - Tab

#### Number Literals
```vero
5           # Integer
99.99       # Decimal
0           # Zero
1000000     # Large number
```

#### Identifiers
```vero
myVariable
_privateField
PageName123
camelCase
PascalCase
snake_case
```

**Rules:**
- Must start with letter or underscore
- Can contain letters, digits, underscores
- Case-sensitive for identifiers (unlike keywords)

### Comments

```vero
# This is a line comment
page TestPage {
    field button = "Button"  # Inline comment
}
```

---

## Program Structure

A Vero program consists of zero or more declarations:

```antlr
program
    : declaration* EOF
    ;

declaration
    : pageDeclaration
    | featureDeclaration
    ;
```

**Example:**
```vero
# Program with page and feature
page LoginPage {
    field email = "#email"
}

feature Login {
    use LoginPage
    scenario "Test" {
        log "Hello"
    }
}
```

---

## Page Declarations

Pages define reusable UI component references and actions.

### Syntax

```antlr
pageDeclaration
    : PAGE IDENTIFIER LBRACE pageBody RBRACE
    ;

pageBody
    : pageMember*
    ;

pageMember
    : fieldDeclaration
    | actionDeclaration
    ;
```

### Fields

Fields define selectors for UI elements:

```antlr
fieldDeclaration
    : FIELD IDENTIFIER EQUALS STRING_LITERAL
    ;
```

**Examples:**
```vero
page LoginPage {
    # Text selector (auto-detected)
    field submitBtn = "Submit"

    # CSS selector
    field emailInput = "#email"
    field passwordInput = ".password-field"

    # Attribute selector
    field loginForm = "[data-testid='login-form']"

    # Complex selector
    field errorMsg = "div.error-container > span.message"
}
```

### Actions

Actions define reusable sequences of statements:

```antlr
actionDeclaration
    : IDENTIFIER (WITH parameterList)? LBRACE statement* RBRACE
    ;

parameterList
    : IDENTIFIER (COMMA IDENTIFIER)*
    ;
```

**Examples:**
```vero
page LoginPage {
    field emailInput = "#email"
    field passwordInput = "#password"
    field submitBtn = "Submit"

    # Action without parameters
    submit {
        click submitBtn
    }

    # Action with single parameter
    enterEmail with email {
        fill emailInput with email
    }

    # Action with multiple parameters
    login with email, password {
        fill emailInput with email
        fill passwordInput with password
        click submitBtn
    }

    # Action with complex body
    loginAndVerify with email, password {
        fill emailInput with email
        fill passwordInput with password
        click submitBtn
        wait 2 seconds
        verify "Dashboard" is visible
    }
}
```

---

## Feature Declarations

Features organize related test scenarios.

### Syntax

```antlr
featureDeclaration
    : FEATURE IDENTIFIER LBRACE featureBody RBRACE
    ;

featureBody
    : featureMember*
    ;

featureMember
    : useStatement
    | hookDeclaration
    | scenarioDeclaration
    ;
```

### Use Statements

Reference pages to use in scenarios:

```antlr
useStatement
    : USE IDENTIFIER
    ;
```

**Example:**
```vero
feature Login {
    use LoginPage
    use DashboardPage
    use ProfilePage
}
```

### Hooks

Setup and teardown code:

```antlr
hookDeclaration
    : (BEFORE | AFTER) (EACH | ALL) LBRACE statement* RBRACE
    ;
```

**Hook Types:**
| Hook | Timing |
|------|--------|
| `before all` | Once before all scenarios |
| `before each` | Before every scenario |
| `after each` | After every scenario |
| `after all` | Once after all scenarios |

**Example:**
```vero
feature Login {
    before all {
        log "Suite starting"
    }

    before each {
        open "/login"
        wait 1 seconds
    }

    after each {
        take screenshot "test-result"
    }

    after all {
        log "Suite complete"
    }
}
```

### Scenarios

Individual test cases:

```antlr
scenarioDeclaration
    : SCENARIO STRING_LITERAL tag* LBRACE statement* RBRACE
    ;

tag
    : AT IDENTIFIER
    ;
```

**Example:**
```vero
feature Login {
    scenario "Valid login" @smoke @critical {
        fill "email" with "test@example.com"
        click "Submit"
        verify "Dashboard" is visible
    }

    scenario "Invalid login" @regression {
        fill "email" with "invalid"
        click "Submit"
        verify ".error" is visible
    }
}
```

---

## Statements

Statements are the executable units within actions, hooks, and scenarios.

```antlr
statement
    : actionStatement
    | assertionStatement
    | controlFlowStatement
    | variableDeclaration
    | returnStatement
    ;
```

---

## Actions

### Click

```antlr
clickAction
    : CLICK selectorExpression
    ;
```

**Examples:**
```vero
click "Submit"
click ".button-primary"
click LoginPage.submitBtn
click submitBtn
```

### Fill

```antlr
fillAction
    : FILL selectorExpression WITH expression
    ;
```

**Examples:**
```vero
fill "email" with "test@example.com"
fill "#quantity" with 5
fill LoginPage.emailInput with userData
```

### Open

```antlr
openAction
    : OPEN expression
    ;
```

**Examples:**
```vero
open "/login"
open "https://example.com"
open baseUrl
```

### Check / Uncheck

```antlr
checkAction
    : CHECK selectorExpression
    ;

uncheckAction
    : UNCHECK selectorExpression
    ;
```

**Examples:**
```vero
check "terms"
check FormPage.termsCheckbox
uncheck "newsletter"
```

### Select

```antlr
selectAction
    : SELECT expression FROM selectorExpression
    ;
```

**Examples:**
```vero
select "Option 1" from "dropdown"
select "California" from FormPage.stateDropdown
select selectedValue from countryDropdown
```

### Hover

```antlr
hoverAction
    : HOVER selectorExpression
    ;
```

**Examples:**
```vero
hover "Menu"
hover NavPage.submenu
```

### Press

```antlr
pressAction
    : PRESS expression
    ;
```

**Examples:**
```vero
press "Enter"
press "Tab"
press "Control+C"
press "Escape"
```

### Scroll

```antlr
scrollAction
    : SCROLL (TO selectorExpression | direction)
    ;

direction
    : UP | DOWN | LEFT | RIGHT
    ;
```

**Examples:**
```vero
scroll to "footer"
scroll to PageName.element
scroll down
scroll up
scroll left
scroll right
```

### Wait

```antlr
waitAction
    : WAIT (expression (SECONDS | MILLISECONDS) | FOR selectorExpression)
    ;
```

**Examples:**
```vero
wait 2 seconds
wait 500 milliseconds
wait 1.5 seconds
wait for "loading"
wait for PageName.loader
```

### Do (Call Page Action)

```antlr
doAction
    : DO pageMethodReference (WITH argumentList)?
    ;

pageMethodReference
    : IDENTIFIER DOT IDENTIFIER
    ;

argumentList
    : expression (COMMA expression)*
    ;
```

**Examples:**
```vero
do LoginPage.logout
do LoginPage.login with "email", "password"
do FormPage.fillAddress with address, city, zip
```

### Refresh

```antlr
refreshAction
    : REFRESH
    ;
```

**Example:**
```vero
refresh
```

### Clear

```antlr
clearAction
    : CLEAR selectorExpression
    ;
```

**Examples:**
```vero
clear "searchInput"
clear SearchPage.input
```

### Screenshot

```antlr
screenshotAction
    : TAKE SCREENSHOT expression?
    ;
```

**Examples:**
```vero
take screenshot
take screenshot "error-state"
take screenshot screenshotName
```

### Log

```antlr
logAction
    : LOG expression
    ;
```

**Examples:**
```vero
log "Test message"
log message
log 123
```

---

## Assertions

```antlr
assertionStatement
    : VERIFY selectorOrText (IS | ISNOT) condition
    ;

selectorOrText
    : selectorExpression
    | expression
    ;

condition
    : VISIBLE
    | HIDDEN_STATE
    | ENABLED
    | DISABLED
    | CHECKED
    | EMPTY
    | containsCondition
    ;

containsCondition
    : CONTAINS expression
    ;
```

### Visibility

```vero
verify "Dashboard" is visible
verify ".error" is not visible
verify "Loader" is hidden
verify PageName.header is visible
```

### State

```vero
verify "Submit" is enabled
verify "field" is disabled
verify "checkbox" is checked
verify "checkbox" is not checked
verify "input" is empty
verify "input" is not empty
```

### Contains

```vero
verify "message" is contains "Hello"
verify PageName.errorMsg is contains "Invalid"
verify "message" is not contains "Error"
```

---

## Control Flow

### If / Else

```antlr
ifStatement
    : IF booleanExpression LBRACE statement* RBRACE (ELSE LBRACE statement* RBRACE)?
    ;

booleanExpression
    : selectorExpression IS condition
    | selectorExpression ISNOT condition
    | expression comparisonOperator expression
    | expression
    ;

comparisonOperator
    : GT | LT | GTE | LTE | EQEQ | NEQ
    ;
```

**Examples:**
```vero
# Element condition
if button is visible {
    click button
}

# With else
if error is visible {
    log "Error found"
} else {
    log "No error"
}

# Is not condition
if loader is not visible {
    log "Page loaded"
}

# Comparison operators
if count > 0 {
    log "Has items"
}

if status == "active" {
    log "Active"
}

if attempts < 5 {
    click "Retry"
}
```

### Repeat

```antlr
repeatStatement
    : REPEAT expression TIMES LBRACE statement* RBRACE
    ;
```

**Examples:**
```vero
repeat 5 times {
    click "Next"
    wait 1 seconds
}

# With variable
number count = 3
repeat count times {
    scroll down
}
```

### Nested Control Flow

```vero
if container is visible {
    repeat 3 times {
        if item is visible {
            click item
        }
    }
}
```

---

## Variables

```antlr
variableDeclaration
    : variableType IDENTIFIER EQUALS expression
    ;

variableType
    : TEXT | NUMBER | FLAG | LIST
    ;
```

### Text Variables

```vero
text username = "testuser"
text email = "user@example.com"
text empty = ""
text special = "user+tag@example.com"
```

### Number Variables

```vero
number count = 5
number price = 99.99
number zero = 0
```

### Flag Variables

```vero
flag isActive = "true"
flag isDisabled = "false"
```

### List Variables

```vero
list items = "apple, banana, orange"
```

### Using Variables

```vero
text email = "test@example.com"
fill "email" with email

number count = 5
repeat count times {
    log "Iteration"
}

if count > 0 {
    log "Positive"
}
```

---

## Expressions

```antlr
expression
    : STRING_LITERAL
    | NUMBER_LITERAL
    | IDENTIFIER
    | pageMethodReference
    | LPAREN expression RPAREN
    ;

selectorExpression
    : pageFieldReference
    | STRING_LITERAL
    | IDENTIFIER
    ;

pageFieldReference
    : IDENTIFIER DOT IDENTIFIER
    ;
```

### Expression Types

| Type | Examples |
|------|----------|
| String literal | `"Hello"`, `"/login"` |
| Number literal | `5`, `99.99` |
| Identifier | `username`, `count` |
| Page reference | `LoginPage.email` |
| Parenthesized | `(expression)` |

---

## Complete Examples

### Login Feature

```vero
# pages/LoginPage.vero
page LoginPage {
    field emailInput = "input[type='email']"
    field passwordInput = "input[type='password']"
    field submitBtn = "button[type='submit']"
    field errorMsg = ".error-message"
    field rememberMe = "#remember"

    login with email, password {
        fill emailInput with email
        fill passwordInput with password
        click submitBtn
    }
}

# features/Login.vero
feature UserLogin {
    use LoginPage

    before each {
        open "/login"
        wait 1 seconds
    }

    after each {
        take screenshot "test-result"
    }

    scenario "Valid credentials" @smoke @critical {
        do LoginPage.login with "admin@example.com", "password123"
        wait 2 seconds
        verify "Dashboard" is visible
    }

    scenario "Invalid credentials" @regression {
        do LoginPage.login with "invalid@example.com", "wrong"
        verify LoginPage.errorMsg is visible
        verify LoginPage.errorMsg is contains "Invalid"
    }

    scenario "Empty credentials" @regression {
        click LoginPage.submitBtn
        verify LoginPage.errorMsg is visible
    }
}
```

### E-Commerce Checkout

```vero
page CartPage {
    field cartItems = ".cart-item"
    field totalPrice = ".total"
    field checkoutBtn = "Proceed to Checkout"

    checkout {
        click checkoutBtn
        wait 2 seconds
    }
}

page CheckoutPage {
    field addressInput = "#address"
    field cardNumber = "#card-number"
    field placeOrderBtn = "Place Order"
    field confirmation = ".order-confirmation"

    fillPayment with card, cvv {
        fill cardNumber with card
        fill "#cvv" with cvv
    }
}

feature Checkout {
    use CartPage
    use CheckoutPage

    before each {
        open "/cart"
    }

    scenario "Complete checkout" @smoke {
        verify CartPage.cartItems is visible
        do CartPage.checkout
        fill CheckoutPage.addressInput with "123 Main St"
        do CheckoutPage.fillPayment with "4111111111111111", "123"
        click CheckoutPage.placeOrderBtn
        verify CheckoutPage.confirmation is visible
    }
}
```

### Form Validation

```vero
page RegistrationPage {
    field nameInput = "#name"
    field emailInput = "#email"
    field passwordInput = "#password"
    field submitBtn = "Register"
    field nameError = "#name-error"
    field emailError = "#email-error"

    fillBasicInfo with name, email {
        fill nameInput with name
        fill emailInput with email
    }
}

feature FormValidation {
    use RegistrationPage

    scenario "All fields required" @regression {
        open "/register"
        click RegistrationPage.submitBtn
        verify RegistrationPage.nameError is visible
        verify RegistrationPage.emailError is visible
    }

    scenario "Invalid email" @regression {
        open "/register"
        do RegistrationPage.fillBasicInfo with "John", "invalid-email"
        click RegistrationPage.submitBtn
        verify RegistrationPage.emailError is visible
        verify RegistrationPage.emailError is contains "valid email"
    }
}
```

---

## Grammar File Location

The ANTLR4 grammar file is located at:
```
/vero-lang/grammar/Vero.g4
```

Generated parser files are in:
```
/vero-lang/src/parser/generated/grammar/
```

---

## See Also

- [Grammar Enhancement Specification](./GRAMMAR_ENHANCEMENT_SPEC.md) - Future enhancements
- [Grammar Validation Report](./GRAMMAR_VALIDATION_REPORT.md) - Validation results

---

*Document End - Version 1.0.0*
