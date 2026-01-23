# Vero

A plain-English DSL for test automation that transpiles to Playwright TypeScript.

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
# Initialize a new Vero project
vero init

# Compile .vero files to Playwright
vero compile

# Run tests
vero run
```

## Syntax Example

### Page Object (pages/LoginPage.vero)

```vero
PAGE LoginPage {
    FIELD emailInput = TEXTBOX "Email"
    FIELD passwordInput = TEXTBOX "Password"
    FIELD submitBtn = BUTTON "Sign In"
    
    login WITH email, password {
        FILL emailInput WITH email
        FILL passwordInput WITH password
        CLICK submitBtn
    }
}
```

### Feature (features/Login.vero)

```vero
FEATURE Login {
    USE LoginPage
    
    BEFORE EACH {
        OPEN "/login"
    }
    
    SCENARIO UserCanLogin @smoke {
        PERFORM LoginPage.login WITH "test@example.com", "secret"
        VERIFY "Dashboard" IS VISIBLE
    }
}
```
