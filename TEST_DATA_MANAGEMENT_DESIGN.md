# Test Data Management System Design
## Enterprise-Grade Test Data Architecture

**SME:** Test Automation Architect (Agent 5)
**Date:** 2025-12-31

---

## Executive Summary

Design a **best-practice test data management system** that supports:
- ✅ **Excel-based data storage** (one sheet per page object)
- ✅ **DTO/POJO pattern** (data → TypeScript classes)
- ✅ **Scenario-based data linking** (via scenario IDs)
- ✅ **Runtime data resolution** (testId + field lookup)
- ✅ **Environment management** (Postman-style global/environment variables)
- ✅ **Type-safe data access** in Vero scenarios
- ✅ **Web UI** for data management (no Excel editing needed)

---

## Current Best Practice (Your Approach)

### Excel Structure
```
Workbook: TestData.xlsx

Sheet: LoginPage
┌────────────┬──────────────┬──────────────┬─────────┐
│ TestID     │ email        │ password     │ enabled │
├────────────┼──────────────┼──────────────┼─────────┤
│ TC001      │ user@test.com│ Pass123!     │ true    │
│ TC002      │ admin@test.  │ Admin456!    │ true    │
│ TC003      │ invalid@test │ wrong        │ false   │
└────────────┴──────────────┴──────────────┴─────────┘

Sheet: CheckoutPage
┌────────────┬──────────────┬──────────────┬──────────┐
│ TestID     │ cardNumber   │ cvv          │ zipCode  │
├────────────┼──────────────┼──────────────┼──────────┤
│ TC001      │ 4111111111...│ 123          │ 12345    │
│ TC002      │ 5500000000...│ 456          │ 67890    │
└────────────┴──────────────┴──────────────┴──────────┘
```

### Code Usage Pattern
```typescript
// Filter by TestID (row) + Column (field)
const email = testData.LoginPage.filter(row => row.TestID === 'TC001').email;
const password = testData.LoginPage.filter(row => row.TestID === 'TC001').password;
```

---

## Enhanced Architecture

### 1. Data Storage Layer

#### A. Database Schema (Prisma)

```prisma
// Test Data Models
model TestDataSheet {
  id          String   @id @default(uuid())
  name        String   @unique  // "LoginPage", "CheckoutPage"
  pageObject  String?  // Associated Vero page name
  description String?
  columns     Json     // [{ name: "email", type: "string", required: true }]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  rows        TestDataRow[]
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
}

model TestDataRow {
  id          String        @id @default(uuid())
  sheetId     String
  sheet       TestDataSheet @relation(fields: [sheetId], references: [id], onDelete: Cascade)
  scenarioId  String        // "TC001", "TC002" - links to test scenarios
  data        Json          // { "email": "user@test.com", "password": "Pass123!" }
  enabled     Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([sheetId])
  @@index([scenarioId])
}

// Environment Variables (Postman-style)
model Environment {
  id          String   @id @default(uuid())
  name        String   // "Development", "Staging", "Production"
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  isActive    Boolean  @default(false)
  variables   Json     // { "baseUrl": "https://dev.example.com", "apiKey": "..." }
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([projectId, name])
  @@index([projectId])
}

model GlobalVariable {
  id          String   @id @default(uuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  key         String
  value       String
  type        String   @default("string") // string, number, boolean, secret
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([projectId, key])
  @@index([projectId])
}

// Project model extension
model Project {
  id                String            @id @default(uuid())
  name              String
  userId            String
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  dataSheets        TestDataSheet[]
  environments      Environment[]
  globalVariables   GlobalVariable[]
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
}
```

---

### 2. DTO/POJO Pattern

#### A. Runtime Type Generation

When a test runs, generate TypeScript classes from data sheets:

```typescript
// Generated at runtime from TestDataSheet
export class LoginPageData {
  TestID: string;
  email: string;
  password: string;
  enabled: boolean;

  constructor(data: any) {
    this.TestID = data.TestID;
    this.email = data.email;
    this.password = data.password;
    this.enabled = data.enabled ?? true;
  }

  static fromScenarioId(scenarioId: string): LoginPageData {
    const row = TestDataService.getRow('LoginPage', scenarioId);
    return new LoginPageData(row.data);
  }
}

// Usage in transpiled Playwright test
const loginData = LoginPageData.fromScenarioId('TC001');
await page.fill('email', loginData.email);
await page.fill('password', loginData.password);
```

#### B. Vero Language Integration

**Enhanced Vero Syntax:**

```vero
# Define data binding at scenario level
feature Login {
    use LoginPage
    use data LoginPageData  # Import generated DTO class

    scenario "Valid login" @testId:TC001 {
        # Auto-resolve data by @testId tag
        text userData = data.fromScenario(@testId)

        fill LoginPage.emailInput with userData.email
        fill LoginPage.passwordInput with userData.password
        click LoginPage.submitBtn
        verify "Dashboard" is visible
    }

    # Alternative: Inline data reference
    scenario "Admin login" @testId:TC002 {
        fill LoginPage.emailInput with @data.email
        fill LoginPage.passwordInput with @data.password
        click LoginPage.submitBtn
    }
}
```

**Key Features:**
- `@testId:TC001` tag automatically links scenario to data row
- `data.fromScenario(@testId)` resolves to POJO instance
- `@data.fieldName` shorthand for current scenario's data
- Type-safe access (IDE autocomplete works)

---

### 3. Excel Import/Export

#### A. Excel Parser Service

```typescript
// backend/src/services/excel-parser.ts
import * as XLSX from 'xlsx';

export class ExcelParserService {
  /**
   * Import Excel file into database
   *
   * Expected format:
   * - Each sheet = one test data set (matches page object name)
   * - First row = column headers
   * - Column "TestID" is required (scenario identifier)
   * - All other columns = test data fields
   */
  async importExcel(
    filePath: string,
    projectId: string
  ): Promise<ImportResult> {
    const workbook = XLSX.readFile(filePath);
    const results: ImportResult = { sheets: [], errors: [] };

    for (const sheetName of workbook.SheetNames) {
      try {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        // Validate TestID column exists
        if (!data[0]?.hasOwnProperty('TestID')) {
          results.errors.push(`Sheet "${sheetName}" missing TestID column`);
          continue;
        }

        // Create or update TestDataSheet
        const columns = Object.keys(data[0])
          .filter(k => k !== 'TestID')
          .map(k => ({
            name: k,
            type: this.inferType(data[0][k]),
            required: false
          }));

        const dataSheet = await prisma.testDataSheet.upsert({
          where: { projectId_name: { projectId, name: sheetName } },
          create: {
            name: sheetName,
            projectId,
            columns: JSON.stringify(columns)
          },
          update: {
            columns: JSON.stringify(columns)
          }
        });

        // Import rows
        for (const row of data) {
          const { TestID, ...rowData } = row;

          await prisma.testDataRow.upsert({
            where: {
              sheetId_scenarioId: {
                sheetId: dataSheet.id,
                scenarioId: TestID
              }
            },
            create: {
              sheetId: dataSheet.id,
              scenarioId: TestID,
              data: JSON.stringify(rowData),
              enabled: rowData.enabled ?? true
            },
            update: {
              data: JSON.stringify(rowData)
            }
          });
        }

        results.sheets.push({ name: sheetName, rows: data.length });
      } catch (error) {
        results.errors.push(`Sheet "${sheetName}": ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Export test data to Excel
   */
  async exportExcel(projectId: string): Promise<Buffer> {
    const sheets = await prisma.testDataSheet.findMany({
      where: { projectId },
      include: { rows: true }
    });

    const workbook = XLSX.utils.book_new();

    for (const sheet of sheets) {
      const rows = sheet.rows.map(row => ({
        TestID: row.scenarioId,
        ...JSON.parse(row.data)
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    }

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  private inferType(value: any): string {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (value?.match(/^\d{4}-\d{2}-\d{2}/)) return 'date';
    return 'string';
  }
}
```

---

### 4. Environment Variables (Postman-style)

#### A. Environment Manager

```typescript
// backend/src/services/environment.service.ts
export class EnvironmentService {
  /**
   * Get active environment variables
   * Precedence: Runtime > Environment > Global
   */
  async getVariables(
    projectId: string,
    runtimeVars?: Record<string, string>
  ): Promise<Record<string, any>> {
    // 1. Global variables (lowest precedence)
    const globalVars = await prisma.globalVariable.findMany({
      where: { projectId }
    });
    const global = Object.fromEntries(
      globalVars.map(v => [v.key, this.parseValue(v.value, v.type)])
    );

    // 2. Active environment variables
    const activeEnv = await prisma.environment.findFirst({
      where: { projectId, isActive: true }
    });
    const envVars = activeEnv ? JSON.parse(activeEnv.variables) : {};

    // 3. Runtime variables (highest precedence)
    const runtime = runtimeVars ?? {};

    // Merge with precedence
    return { ...global, ...envVars, ...runtime };
  }

  /**
   * Resolve variables in a string (supports {{varName}} syntax)
   */
  resolveVariables(
    template: string,
    variables: Record<string, any>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] ?? match;
    });
  }

  private parseValue(value: string, type: string): any {
    switch (type) {
      case 'number': return Number(value);
      case 'boolean': return value === 'true';
      default: return value;
    }
  }
}
```

#### B. Vero Environment Syntax

```vero
# Use environment variables
feature API Tests {
    use env  # Import environment context

    scenario "Login API" {
        open "{{baseUrl}}/login"  # Resolves to active env's baseUrl

        # Access environment variables
        text apiKey = env.apiKey
        text username = env.testUser

        # Override at runtime
        open "{{baseUrl}}/api/users"
    }
}
```

**Environment UI:**

```typescript
// Frontend: Environment selector dropdown
<select onChange={(e) => setActiveEnvironment(e.target.value)}>
  <option value="development">Development</option>
  <option value="staging">Staging</option>
  <option value="production">Production</option>
</select>

// Variables displayed in table
Environments > Development
┌──────────────┬──────────────────────────────┐
│ Variable     │ Value                        │
├──────────────┼──────────────────────────────┤
│ baseUrl      │ https://dev.example.com      │
│ apiKey       │ ••••••••••••                 │ (secret)
│ timeout      │ 30000                        │
└──────────────┴──────────────────────────────┘

Global Variables (All Environments)
┌──────────────┬──────────────────────────────┐
│ Variable     │ Value                        │
├──────────────┼──────────────────────────────┤
│ appName      │ My Test App                  │
│ version      │ 2.0.1                        │
└──────────────┴──────────────────────────────┘
```

---

### 5. Web UI for Test Data Management

#### A. Data Sheet Manager

```typescript
// frontend/src/pages/TestDataPage.tsx
export function TestDataPage() {
  const [sheets, setSheets] = useState<TestDataSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [rows, setRows] = useState<TestDataRow[]>([]);

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Left sidebar: Sheets */}
      <div className="col-span-1">
        <h2>Data Sheets</h2>
        <button onClick={handleImportExcel}>Import Excel</button>
        <button onClick={handleCreateSheet}>New Sheet</button>

        <ul>
          {sheets.map(sheet => (
            <li
              key={sheet.id}
              onClick={() => setSelectedSheet(sheet.id)}
              className={selectedSheet === sheet.id ? 'active' : ''}
            >
              {sheet.name}
              <span>{sheet.rows.length} rows</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Right: Data table */}
      <div className="col-span-3">
        <TestDataTable
          sheetId={selectedSheet}
          rows={rows}
          onUpdate={handleUpdateRow}
          onDelete={handleDeleteRow}
          onAdd={handleAddRow}
        />
      </div>
    </div>
  );
}

// Editable table component (like Excel)
export function TestDataTable({ sheetId, rows, onUpdate }) {
  return (
    <table>
      <thead>
        <tr>
          <th>TestID</th>
          <th>email</th>
          <th>password</th>
          <th>enabled</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.id}>
            <td>
              <input
                value={row.scenarioId}
                onChange={(e) => onUpdate(row.id, 'scenarioId', e.target.value)}
              />
            </td>
            <td>
              <input
                value={row.data.email}
                onChange={(e) => onUpdate(row.id, 'data.email', e.target.value)}
              />
            </td>
            {/* ... more cells */}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

### 6. DTO Code Generation

#### A. TypeScript Generator

```typescript
// backend/src/codegen/dto-generator.ts
export class DtoGenerator {
  /**
   * Generate TypeScript DTO classes from test data sheets
   */
  generateDtoClasses(sheets: TestDataSheet[]): string {
    const classes = sheets.map(sheet => this.generateClass(sheet));

    return `
// Auto-generated Test Data DTOs
// DO NOT EDIT MANUALLY

${classes.join('\n\n')}

// Data resolver service
export class TestDataResolver {
  private static data: Map<string, any[]> = new Map();

  static loadData(sheetName: string, rows: any[]) {
    this.data.set(sheetName, rows);
  }

  static getRow(sheetName: string, scenarioId: string): any {
    const rows = this.data.get(sheetName) ?? [];
    return rows.find(r => r.TestID === scenarioId) ?? {};
  }
}
`;
  }

  private generateClass(sheet: TestDataSheet): string {
    const columns: any[] = JSON.parse(sheet.columns);

    const properties = columns.map(col =>
      `  ${col.name}: ${col.type};`
    ).join('\n');

    const constructor = columns.map(col =>
      `    this.${col.name} = data.${col.name};`
    ).join('\n');

    return `
export class ${sheet.name}Data {
  TestID: string;
${properties}

  constructor(data: any) {
    this.TestID = data.TestID;
${constructor}
  }

  static fromScenarioId(scenarioId: string): ${sheet.name}Data {
    const row = TestDataResolver.getRow('${sheet.name}', scenarioId);
    return new ${sheet.name}Data(row);
  }

  static getAll(): ${sheet.name}Data[] {
    const rows = TestDataResolver.data.get('${sheet.name}') ?? [];
    return rows.map(r => new ${sheet.name}Data(r));
  }
}
`;
  }
}
```

#### B. Integration with Vero Transpiler

```typescript
// vero-lang/src/transpiler/transpiler.ts (enhanced)
export class VeroTranspiler {
  async transpile(veroCode: string, projectId: string): Promise<string> {
    // 1. Parse Vero AST
    const ast = this.parse(veroCode);

    // 2. Load test data DTOs
    const dataSheets = await this.loadTestDataSheets(projectId);
    const dtoClasses = this.dtoGenerator.generateDtoClasses(dataSheets);

    // 3. Load environment variables
    const envVars = await this.environmentService.getVariables(projectId);

    // 4. Transpile with data context
    const playwrightCode = this.transpileAst(ast, {
      dataClasses: dtoClasses,
      envVars: envVars
    });

    // 5. Inject DTO classes at top of file
    return `
import { test, expect } from '@playwright/test';

${dtoClasses}

${playwrightCode}
`;
  }

  private transpileScenario(scenario: ScenarioNode, context: any): string {
    // Extract @testId tag
    const testIdTag = scenario.tags.find(t => t.startsWith('@testId:'));
    const testId = testIdTag?.split(':')[1];

    // Find data references
    const hasDataUsage = scenario.statements.some(s =>
      s.includes('@data.') || s.includes('data.fromScenario')
    );

    let setupCode = '';
    if (hasDataUsage && testId) {
      // Determine which data class to use (based on page objects used)
      const pageUsed = this.findPageObjectUsed(scenario);
      const dataClass = `${pageUsed}Data`;

      setupCode = `
  // Load test data for scenario ${testId}
  const testData = ${dataClass}.fromScenarioId('${testId}');
  TestDataResolver.loadData('${pageUsed}', await fetchTestData('${pageUsed}'));
`;
    }

    return `
test('${scenario.name}', async ({ page }) => {
${setupCode}
  ${this.transpileStatements(scenario.statements, context)}
});
`;
  }
}
```

---

### 7. Best Practices Implementation

#### A. Data Validation

```typescript
// Validate data before test runs
export class TestDataValidator {
  static validate(
    sheet: TestDataSheet,
    row: TestDataRow
  ): ValidationResult {
    const errors: string[] = [];
    const columns: any[] = JSON.parse(sheet.columns);
    const data = JSON.parse(row.data);

    for (const column of columns) {
      if (column.required && !data[column.name]) {
        errors.push(`Missing required field: ${column.name}`);
      }

      if (data[column.name] && !this.validateType(data[column.name], column.type)) {
        errors.push(`Invalid type for ${column.name}: expected ${column.type}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
```

#### B. Data Versioning

```prisma
model TestDataVersion {
  id          String   @id @default(uuid())
  rowId       String
  row         TestDataRow @relation(fields: [rowId], references: [id], onDelete: Cascade)
  data        Json     // Snapshot of data at this version
  version     Int      // 1, 2, 3...
  changedBy   String
  changedAt   DateTime @default(now())

  @@index([rowId])
}
```

#### C. Data Encryption for Secrets

```typescript
// Encrypt sensitive fields (passwords, API keys)
export class DataEncryption {
  private static KEY = process.env.ENCRYPTION_KEY!;

  static encrypt(value: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.KEY);
    return cipher.update(value, 'utf8', 'hex') + cipher.final('hex');
  }

  static decrypt(encrypted: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', this.KEY);
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
  }

  // Mark fields as encrypted in schema
  static markSensitive(sheet: TestDataSheet, fields: string[]) {
    const columns = JSON.parse(sheet.columns);
    for (const column of columns) {
      if (fields.includes(column.name)) {
        column.encrypted = true;
      }
    }
    return JSON.stringify(columns);
  }
}
```

---

## Summary of Features

### ✅ Excel-Based Data Storage
- Import/export Excel files
- One sheet per page object
- TestID column for scenario linking

### ✅ DTO/POJO Pattern
- Auto-generated TypeScript classes
- Type-safe data access
- IDE autocomplete support

### ✅ Scenario Data Linking
- `@testId:TC001` tag in scenarios
- Automatic data resolution
- Filter by scenario ID

### ✅ Environment Variables
- Postman-style environments
- Global + environment-specific variables
- Runtime overrides
- `{{variable}}` syntax

### ✅ Web UI Management
- Excel-like data grid
- Create/edit/delete sheets and rows
- Import/export Excel
- Environment manager UI

### ✅ Best Practices
- Data validation
- Data versioning
- Secret encryption
- Type inference
- Error handling

---

## Agent 5 Enhanced Scope

**Agent 5** will now implement ALL of the above with Opus-level expertise:

1. Database schema (Prisma)
2. Excel import/export service
3. DTO code generation
4. Environment management
5. Web UI (React components)
6. Vero transpiler integration
7. Data validation & encryption
8. API endpoints
9. Documentation

This is **enterprise-grade test data management** matching industry best practices from frameworks like TestNG, JUnit, and Cucumber with Excel/database data providers.
