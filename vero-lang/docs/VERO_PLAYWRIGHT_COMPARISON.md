# Vero DSL vs Playwright API - Comprehensive Comparison

## Part 1: Playwright Actions vs Vero Support

### Click Actions

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `locator.click()` | YES | `click "Submit"` | `await page.getByText('Submit').click();` |
| `locator.click({ button: 'right' })` | YES | `right click "Menu"` | `await page.getByText('Menu').click({ button: 'right' });` |
| `locator.dblclick()` | YES | `double click "Cell"` | `await page.getByText('Cell').dblclick();` |
| `locator.click({ force: true })` | YES | `force click "Hidden"` | `await page.getByText('Hidden').click({ force: true });` |
| `locator.click({ modifiers: ['Shift'] })` | MISSING | - | - |
| `locator.click({ position: {x, y} })` | MISSING | - | - |
| `locator.click({ delay: 100 })` | MISSING | - | - |
| `locator.click({ noWaitAfter: true })` | MISSING | - | - |
| `locator.click({ trial: true })` | MISSING | - | - |
| `locator.click({ timeout: 5000 })` | MISSING | - | - |

### Drag Actions

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `locator.dragTo(target)` | YES | `drag "Item" to "Zone"` | `await source.dragTo(target);` |
| `locator.dragTo(target, { targetPosition })` | YES | `drag "Item" to x=100 y=200` | `await source.dragTo(body, { targetPosition: { x: 100, y: 200 } });` |
| `locator.dragTo(target, { sourcePosition })` | MISSING | - | - |
| `locator.dragTo(target, { force })` | MISSING | - | - |

### Form Input Actions

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `locator.fill(value)` | YES | `fill "Email" with "test@example.com"` | `await page.getByText('Email').fill('test@example.com');` |
| `locator.type(text)` | MISSING | - | - |
| `locator.press(key)` | YES | `press "Enter"` | `await page.keyboard.press('Enter');` |
| `locator.clear()` | MISSING | - | - |
| `locator.check()` | YES | `check "Remember me"` | `await page.getByText('Remember me').check();` |
| `locator.uncheck()` | MISSING | - | - |
| `locator.selectOption(value)` | MISSING | - | - |
| `locator.selectOption({ label })` | MISSING | - | - |
| `locator.setInputFiles(files)` | YES | `upload "file.pdf" to "#input"` | `await locator.setInputFiles('file.pdf');` |
| `locator.setInputFiles([])` (clear files) | MISSING | - | - |
| `locator.inputValue()` | MISSING | - | - |

### Focus & Hover Actions

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `locator.hover()` | YES | `hover over "Menu"` | `await page.getByText('Menu').hover();` |
| `locator.hover({ position })` | MISSING | - | - |
| `locator.hover({ force })` | MISSING | - | - |
| `locator.focus()` | MISSING | - | - |
| `locator.blur()` | MISSING | - | - |

### Navigation Actions

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `page.goto(url)` | YES | `open "https://example.com"` | `await page.goto('https://example.com');` |
| `page.goto(url, { waitUntil })` | MISSING | - | - |
| `page.goto(url, { timeout })` | MISSING | - | - |
| `page.reload()` | YES | `refresh` | `await page.reload();` |
| `page.reload({ waitUntil })` | MISSING | - | - |
| `page.goBack()` | MISSING | - | - |
| `page.goForward()` | MISSING | - | - |

### Wait Actions

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `page.waitForTimeout(ms)` | YES | `wait 2 seconds` | `await page.waitForTimeout(2000);` |
| `page.waitForLoadState('networkidle')` | YES | `wait` | `await page.waitForLoadState('networkidle');` |
| `page.waitForLoadState('domcontentloaded')` | MISSING | - | - |
| `page.waitForLoadState('load')` | MISSING | - | - |
| `page.waitForURL(url)` | MISSING | - | - |
| `page.waitForSelector(selector)` | MISSING | - | - |
| `locator.waitFor({ state: 'visible' })` | MISSING | - | - |
| `locator.waitFor({ state: 'hidden' })` | MISSING | - | - |
| `locator.waitFor({ state: 'attached' })` | MISSING | - | - |
| `locator.waitFor({ state: 'detached' })` | MISSING | - | - |

### Screenshot & Recording

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `page.screenshot()` | YES | `take screenshot` | `await page.screenshot();` |
| `page.screenshot({ path })` | YES | `take screenshot as "before.png"` | `await page.screenshot({ path: 'before.png' });` |
| `page.screenshot({ fullPage: true })` | MISSING | - | - |
| `page.screenshot({ clip: { x, y, w, h } })` | MISSING | - | - |
| `locator.screenshot()` | MISSING | - | - |
| `page.pdf()` | MISSING | - | - |
| `page.video()` | MISSING | - | - |

### Assertions (expect)

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `expect(locator).toBeVisible()` | YES | `verify "Dashboard" is visible` | `await expect(page.getByText('Dashboard')).toBeVisible();` |
| `expect(locator).toBeHidden()` | YES | `verify "Error" is not visible` | `await expect(page.getByText('Error')).toBeHidden();` |
| `expect(locator).toBeEnabled()` | YES | `verify "Submit" is enabled` | `await expect(locator).toBeEnabled();` |
| `expect(locator).toBeDisabled()` | YES | `verify "Submit" is disabled` | `await expect(locator).toBeDisabled();` |
| `expect(locator).toBeChecked()` | YES | `verify "Terms" is checked` | `await expect(locator).toBeChecked();` |
| `expect(locator).toBeEmpty()` | YES | `verify "Input" is empty` | `await expect(locator).toBeEmpty();` |
| `expect(locator).toHaveCount(n)` | YES | `verify ".items" has count 5` | `await expect(locator).toHaveCount(5);` |
| `expect(locator).toHaveValue(val)` | YES | `verify "#input" has value "text"` | `await expect(locator).toHaveValue('text');` |
| `expect(locator).toHaveAttribute(name, val)` | YES | `verify "#link" has attribute "href" = "/home"` | `await expect(locator).toHaveAttribute('href', '/home');` |
| `expect(page).toHaveURL(url)` | YES | `verify url equals "/dashboard"` | `await expect(page).toHaveURL('/dashboard');` |
| `expect(page).toHaveURL(regex)` | YES | `verify url contains "dashboard"` | `await expect(page).toHaveURL(new RegExp('dashboard'));` |
| `expect(page).toHaveTitle(title)` | YES | `verify title equals "Home"` | `await expect(page).toHaveTitle('Home');` |
| `expect(page).toHaveTitle(regex)` | YES | `verify title contains "Home"` | `await expect(page).toHaveTitle(new RegExp('Home'));` |
| `expect(locator).toHaveText(text)` | MISSING | - | - |
| `expect(locator).toContainText(text)` | MISSING | - | - |
| `expect(locator).toHaveClass(class)` | MISSING | - | - |
| `expect(locator).toHaveCSS(prop, val)` | MISSING | - | - |
| `expect(locator).toHaveId(id)` | MISSING | - | - |
| `expect(locator).toBeFocused()` | MISSING | - | - |
| `expect(locator).toBeEditable()` | MISSING | - | - |
| `expect(locator).toBeAttached()` | MISSING | - | - |
| `expect(page).toHaveScreenshot()` | YES | `VERIFY SCREENSHOT AS "home" WITH BALANCED` | `await expect(page).toHaveScreenshot('home.png', { threshold: 0.2 });` |
| `expect(locator).toHaveScreenshot()` | YES | `VERIFY LoginPage.header MATCHES SCREENSHOT AS "header" WITH STRICT` | `await expect(loginPage.header).toHaveScreenshot('header.png', { threshold: 0.1, maxDiffPixels: 0, maxDiffPixelRatio: 0 });` |
| `expect.poll(() => ...)` | MISSING | - | - |
| `expect.toPass(() => ...)` | MISSING | - | - |

### Network Interception

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `page.waitForRequest(url)` | MISSING | - | - |
| `page.waitForRequest(predicate)` | MISSING | - | - |
| `page.waitForResponse(url)` | MISSING | - | - |
| `page.waitForResponse(predicate)` | MISSING | - | - |
| `page.route(url, handler)` | MISSING | - | - |
| `route.fulfill({ status, body })` | MISSING | - | - |
| `route.abort()` | MISSING | - | - |
| `route.continue()` | MISSING | - | - |
| `page.unroute(url)` | MISSING | - | - |
| `context.route(url, handler)` | MISSING | - | - |

### Browser Context APIs

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `context.addCookies([cookies])` | MISSING | - | - |
| `context.cookies()` | MISSING | - | - |
| `context.clearCookies()` | MISSING | - | - |
| `context.storageState()` | MISSING | - | - |
| `context.storageState({ path })` | MISSING | - | - |
| `browser.newContext({ storageState })` | MISSING | - | - |
| `context.setGeolocation({ lat, long })` | MISSING | - | - |
| `context.grantPermissions([...])` | MISSING | - | - |
| `context.clearPermissions()` | MISSING | - | - |
| `context.setOffline(true)` | MISSING | - | - |
| `context.setExtraHTTPHeaders({})` | MISSING | - | - |
| `page.setViewportSize({ w, h })` | MISSING | - | - |
| `context.setDefaultTimeout(ms)` | MISSING | - | - |

### iframes

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `page.frameLocator(selector)` | MISSING | - | - |
| `frame.locator(selector)` | MISSING | - | - |
| `page.frames()` | MISSING | - | - |
| `page.frame({ name })` | MISSING | - | - |
| `page.frame({ url })` | MISSING | - | - |
| `frame.evaluate()` | MISSING | - | - |

### Dialogs & Popups

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `page.on('dialog', handler)` | MISSING | - | - |
| `dialog.accept()` | MISSING | - | - |
| `dialog.accept(promptText)` | MISSING | - | - |
| `dialog.dismiss()` | MISSING | - | - |
| `dialog.message()` | MISSING | - | - |
| `dialog.type()` | MISSING | - | - |
| `page.waitForEvent('popup')` | MISSING | - | - |
| `popup.close()` | MISSING | - | - |

### Locator Methods

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `page.locator(selector)` | YES | Page Object with CSS | `page.locator('#email')` |
| `page.getByText(text)` | YES | `click "Submit"` | `page.getByText('Submit')` |
| `page.getByRole(role)` | MISSING | - | - |
| `page.getByLabel(label)` | MISSING | - | - |
| `page.getByPlaceholder(text)` | MISSING | - | - |
| `page.getByAltText(text)` | MISSING | - | - |
| `page.getByTitle(text)` | MISSING | - | - |
| `page.getByTestId(id)` | MISSING | - | - |
| `locator.first()` | MISSING | - | - |
| `locator.last()` | MISSING | - | - |
| `locator.nth(n)` | MISSING | - | - |
| `locator.filter({ hasText })` | MISSING | - | - |
| `locator.filter({ has: locator })` | MISSING | - | - |
| `locator.and(locator)` | MISSING | - | - |
| `locator.or(locator)` | MISSING | - | - |
| `locator.locator(selector)` | MISSING | - | - |

### Keyboard Actions

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `page.keyboard.press(key)` | YES | `press "Enter"` | `await page.keyboard.press('Enter');` |
| `page.keyboard.down(key)` | MISSING | - | - |
| `page.keyboard.up(key)` | MISSING | - | - |
| `page.keyboard.type(text)` | MISSING | - | - |
| `page.keyboard.insertText(text)` | MISSING | - | - |

### Mouse Actions

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `page.mouse.click(x, y)` | MISSING | - | - |
| `page.mouse.dblclick(x, y)` | MISSING | - | - |
| `page.mouse.down()` | MISSING | - | - |
| `page.mouse.up()` | MISSING | - | - |
| `page.mouse.move(x, y)` | MISSING | - | - |
| `page.mouse.wheel(dx, dy)` | MISSING | - | - |

### Evaluate & JavaScript

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `page.evaluate(fn)` | MISSING | - | - |
| `page.evaluateHandle(fn)` | MISSING | - | - |
| `locator.evaluate(fn)` | MISSING | - | - |
| `locator.evaluateAll(fn)` | MISSING | - | - |
| `page.addScriptTag()` | MISSING | - | - |
| `page.addStyleTag()` | MISSING | - | - |
| `page.exposeFunction(name, fn)` | MISSING | - | - |
| `page.exposeBinding(name, fn)` | MISSING | - | - |

### Element Information

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `locator.textContent()` | MISSING | - | - |
| `locator.innerText()` | MISSING | - | - |
| `locator.innerHTML()` | MISSING | - | - |
| `locator.getAttribute(name)` | MISSING | - | - |
| `locator.boundingBox()` | MISSING | - | - |
| `locator.count()` | MISSING | - | - |
| `locator.isVisible()` | MISSING | - | - |
| `locator.isEnabled()` | MISSING | - | - |
| `locator.isChecked()` | MISSING | - | - |
| `locator.isEditable()` | MISSING | - | - |
| `locator.isHidden()` | MISSING | - | - |
| `locator.all()` | MISSING | - | - |

### Scroll Actions

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `locator.scrollIntoViewIfNeeded()` | MISSING | - | - |
| `page.mouse.wheel(0, delta)` | MISSING | - | - |
| `locator.evaluate(el => el.scrollTop = n)` | MISSING | - | - |

### Tracing & Debugging

| Playwright API | Vero Support | Vero Syntax Example | Playwright Output |
|----------------|--------------|---------------------|-------------------|
| `context.tracing.start()` | MISSING | - | - |
| `context.tracing.stop({ path })` | MISSING | - | - |
| `page.pause()` | MISSING | - | - |
| `test.slow()` | YES | `@slow` annotation | `test.slow();` |

---

## Part 2: TypeScript Language Features vs Vero Support

### Variables & Types

| TypeScript Feature | Vero Support | Vero Syntax Example | Notes |
|-------------------|--------------|---------------------|-------|
| `const x = value` | YES | `text email = "test@example.com"` | Typed variables in Page Objects |
| `let x = value` | MISSING | - | No reassignable variables |
| `const x: string` | YES | `text email = "value"` | Type declaration implicit |
| `const x: number` | YES | `number count = 5` | |
| `const x: boolean` | YES | `flag enabled = true` | |
| `const x: string[]` | YES | `list items = ["a", "b"]` | |
| `const x: object` | PARTIAL | Data query results | Via VDQL only |
| `x = newValue` | MISSING | - | No variable reassignment |
| Type inference | MISSING | - | Always explicit types |
| Type assertions | MISSING | - | - |
| Union types | MISSING | - | - |
| Interface definition | MISSING | - | - |
| Type guards | MISSING | - | - |

### Control Flow

| TypeScript Feature | Vero Support | Vero Syntax Example | Notes |
|-------------------|--------------|---------------------|-------|
| `if (condition) {...}` | MISSING | - | No conditional blocks |
| `if...else` | MISSING | - | - |
| `if...else if...else` | MISSING | - | - |
| `switch (value) {...}` | MISSING | - | - |
| Ternary `? :` | MISSING | - | - |

### Loops

| TypeScript Feature | Vero Support | Vero Syntax Example | Notes |
|-------------------|--------------|---------------------|-------|
| `for (const x of arr)` | YES | `for each $user in $users { ... }` | Iteration over collections |
| `for (let i = 0; ...)` | MISSING | - | No index-based loops |
| `while (condition)` | MISSING | - | - |
| `do...while` | MISSING | - | - |
| `for...in` | MISSING | - | - |
| `Array.forEach()` | MISSING | - | - |
| `Array.map()` | MISSING | - | - |
| `Array.filter()` | MISSING | - | - |
| `Array.reduce()` | MISSING | - | - |
| `break` | MISSING | - | - |
| `continue` | MISSING | - | - |

### String Operations

| TypeScript Feature | Vero Support | Vero Syntax Example | Notes |
|-------------------|--------------|---------------------|-------|
| String literals | YES | `"hello world"` | Basic strings |
| Template literals `` `${x}` `` | MISSING | - | No string interpolation |
| `str.concat()` | MISSING | - | - |
| `str + str` | MISSING | - | No string concatenation |
| `str.includes()` | MISSING | - | - |
| `str.startsWith()` | MISSING | - | - |
| `str.endsWith()` | MISSING | - | - |
| `str.split()` | MISSING | - | - |
| `str.substring()` | MISSING | - | - |
| `str.replace()` | MISSING | - | - |
| `str.toUpperCase()` | MISSING | - | - |
| `str.toLowerCase()` | MISSING | - | - |
| `str.trim()` | MISSING | - | - |
| `str.length` | MISSING | - | - |

### Number Operations

| TypeScript Feature | Vero Support | Vero Syntax Example | Notes |
|-------------------|--------------|---------------------|-------|
| Number literals | YES | `42`, `3.14` | Basic numbers |
| `x + y`, `x - y` | MISSING | - | No arithmetic |
| `x * y`, `x / y` | MISSING | - | - |
| `x % y` (modulo) | MISSING | - | - |
| `Math.floor()` | MISSING | - | - |
| `Math.ceil()` | MISSING | - | - |
| `Math.round()` | MISSING | - | - |
| `Math.random()` | MISSING | - | - |
| `Math.min/max()` | MISSING | - | - |
| `parseInt()` | MISSING | - | - |
| `parseFloat()` | MISSING | - | - |

### Comparison & Logic

| TypeScript Feature | Vero Support | Vero Syntax Example | Notes |
|-------------------|--------------|---------------------|-------|
| `===` / `!==` | YES (VDQL) | `where status == "active"` | In data queries only |
| `<`, `>`, `<=`, `>=` | YES (VDQL) | `where age > 18` | In data queries only |
| `&&` (and) | YES (VDQL) | `where a == 1 and b == 2` | In data queries only |
| `\|\|` (or) | YES (VDQL) | `where a == 1 or b == 2` | In data queries only |
| `!` (not) | YES (VDQL) | `where not (status == "deleted")` | In data queries only |
| Comparison in actions | MISSING | - | Cannot compare in verify etc. |

### Arrays & Objects

| TypeScript Feature | Vero Support | Vero Syntax Example | Notes |
|-------------------|--------------|---------------------|-------|
| Array literals | PARTIAL | Via VDQL results | Cannot create inline arrays |
| `arr[index]` | YES (VDQL) | `Users[0]` | Row access in data queries |
| `arr.length` | MISSING | - | - |
| `arr.push()` | MISSING | - | - |
| `arr.pop()` | MISSING | - | - |
| `arr.slice()` | YES (VDQL) | `Users[5..10]` | Range access |
| `arr.find()` | YES (VDQL) | `first Users where ...` | Via VDQL |
| `arr.filter()` | YES (VDQL) | `Users where status == "active"` | Via VDQL |
| Object literals | MISSING | - | - |
| `obj.property` | YES | `$user.email` | Property access |
| `obj['key']` | MISSING | - | - |
| Spread operator `...` | MISSING | - | - |
| Destructuring | MISSING | - | - |

### Functions

| TypeScript Feature | Vero Support | Vero Syntax Example | Notes |
|-------------------|--------------|---------------------|-------|
| Function declaration | YES | `action login with email, password { ... }` | Page object actions |
| Arrow functions | MISSING | - | - |
| Function parameters | YES | `login with email, password` | Named parameters |
| Default parameters | MISSING | - | - |
| Rest parameters | MISSING | - | - |
| Return values | PARTIAL | Actions can return types | Limited return support |
| Async/await | IMPLICIT | All actions are async | Built into transpilation |
| Callbacks | MISSING | - | - |
| Higher-order functions | MISSING | - | - |
| Closures | MISSING | - | - |

### Error Handling

| TypeScript Feature | Vero Support | Vero Syntax Example | Notes |
|-------------------|--------------|---------------------|-------|
| `try...catch` | MISSING | - | No error handling |
| `try...finally` | MISSING | - | - |
| `throw new Error()` | MISSING | - | - |
| Custom error types | MISSING | - | - |
| Error propagation | MISSING | - | Tests fail on first error |

### Modules & Imports

| TypeScript Feature | Vero Support | Vero Syntax Example | Notes |
|-------------------|--------------|---------------------|-------|
| `import` | YES | `use LoginPage` | Page object imports |
| `export` | IMPLICIT | Pages/Features auto-export | Auto-generated |
| Named imports | MISSING | - | - |
| Default imports | MISSING | - | - |
| Dynamic imports | MISSING | - | - |
| Re-exports | MISSING | - | - |

### Classes & OOP

| TypeScript Feature | Vero Support | Vero Syntax Example | Notes |
|-------------------|--------------|---------------------|-------|
| Class definition | YES | `page LoginPage { ... }` | Page Objects are classes |
| Properties | YES | `field emailInput = "#email"` | Locator properties |
| Methods | YES | `action login { ... }` | Class methods |
| Constructor | IMPLICIT | Auto-generated | Takes Page parameter |
| Inheritance | MISSING | - | - |
| Interfaces | MISSING | - | - |
| Abstract classes | MISSING | - | - |
| Static members | MISSING | - | - |
| Access modifiers | MISSING | - | All public |
| Getters/setters | MISSING | - | - |

### Async Operations

| TypeScript Feature | Vero Support | Vero Syntax Example | Notes |
|-------------------|--------------|---------------------|-------|
| `async/await` | IMPLICIT | All actions async | Built-in |
| `Promise.all()` | MISSING | - | No parallel execution |
| `Promise.race()` | MISSING | - | - |
| `Promise.any()` | MISSING | - | - |
| Promise chaining | MISSING | - | - |
| Async iteration | MISSING | - | - |

### Test Framework Features

| TypeScript/Playwright Feature | Vero Support | Vero Syntax Example | Notes |
|------------------------------|--------------|---------------------|-------|
| `test('name', fn)` | YES | `scenario "Login works" { ... }` | Test definition |
| `test.describe('suite', fn)` | YES | `feature Login { ... }` | Test suite |
| `test.beforeAll(fn)` | YES | `before all { ... }` | Setup hook |
| `test.beforeEach(fn)` | YES | `before each { ... }` | Per-test setup |
| `test.afterAll(fn)` | YES | `after all { ... }` | Teardown hook |
| `test.afterEach(fn)` | YES | `after each { ... }` | Per-test teardown |
| `test.skip()` | YES | `@skip` annotation | Skip test |
| `test.only()` | YES | `@only` annotation | Focus test |
| `test.slow()` | YES | `@slow` annotation | Triple timeout |
| `test.fixme()` | YES | `@fixme` annotation | Mark as broken |
| `test.describe.serial()` | YES | `@serial` on feature | Sequential execution |
| Tags | YES | `@smoke @regression` | Test tagging |
| Test fixtures | YES | `fixture authUser { ... }` | Custom fixtures |
| Fixture scope | YES | `scope worker` | Worker/test scope |
| Fixture auto | YES | `auto` | Auto-run fixture |
| Fixture dependencies | YES | `depends on page` | Dependency injection |
| Parameterized tests | PARTIAL | VDQL + for each | Data-driven via VDQL |
| Test retries | MISSING | - | Config only |
| Parallel execution | MISSING | - | Config only |

---

## Summary Statistics

### Playwright API Coverage

| Category | Supported | Missing | Coverage |
|----------|-----------|---------|----------|
| Click Actions | 4 | 6 | 40% |
| Drag Actions | 2 | 2 | 50% |
| Form Input | 5 | 5 | 50% |
| Focus/Hover | 1 | 4 | 20% |
| Navigation | 2 | 4 | 33% |
| Wait Actions | 2 | 8 | 20% |
| Screenshots | 2 | 4 | 33% |
| Assertions | 14 | 13 | 52% |
| Network | 0 | 10 | 0% |
| Browser Context | 0 | 13 | 0% |
| iframes | 0 | 6 | 0% |
| Dialogs/Popups | 0 | 8 | 0% |
| Locators | 2 | 13 | 13% |
| Keyboard | 1 | 4 | 20% |
| Mouse | 0 | 6 | 0% |
| Evaluate/JS | 0 | 8 | 0% |
| Element Info | 0 | 12 | 0% |
| Scroll | 0 | 3 | 0% |
| Tracing | 1 | 3 | 25% |
| **TOTAL** | **36** | **132** | **21%** |

### TypeScript Feature Coverage

| Category | Supported | Missing | Coverage |
|----------|-----------|---------|----------|
| Variables/Types | 5 | 7 | 42% |
| Control Flow | 0 | 5 | 0% |
| Loops | 1 | 10 | 9% |
| String Ops | 1 | 13 | 7% |
| Number Ops | 1 | 11 | 8% |
| Comparison/Logic | 5 (VDQL) | 1 | 83% |
| Arrays/Objects | 4 | 8 | 33% |
| Functions | 3 | 7 | 30% |
| Error Handling | 0 | 4 | 0% |
| Modules | 1 | 4 | 20% |
| Classes/OOP | 4 | 6 | 40% |
| Async | 1 | 5 | 17% |
| Test Framework | 15 | 3 | 83% |
| **TOTAL** | **41** | **84** | **33%** |

---

## Priority Recommendations

### High Priority (Most Requested/Critical)

1. **Network Interception** - `waitForRequest`, `waitForResponse`, `route`, `mock`
2. **If/Else Conditionals** - Basic control flow
3. **Select Dropdown** - `selectOption`
4. **Uncheck** - Missing opposite of check
5. **Clear Input** - `clear()`
6. **String Interpolation** - Template literals

### Medium Priority

1. **Browser Context** - Cookies, storage, geolocation
2. **iframes** - `frameLocator`, nested frames
3. **Dialogs** - Alert, confirm, prompt handling
4. **More Locators** - `getByRole`, `getByLabel`, `getByTestId`
5. **Element Info** - `textContent()`, `getAttribute()`
6. **Go Back/Forward** - Navigation history

### Lower Priority

1. **Mouse Actions** - Raw mouse control
2. **Evaluate** - JavaScript execution
3. **Video Recording** - Video capture
4. **PDF Generation** - PDF output
5. **Advanced Assertions** - `toHaveText`, `toHaveClass`, `toHaveCSS`
