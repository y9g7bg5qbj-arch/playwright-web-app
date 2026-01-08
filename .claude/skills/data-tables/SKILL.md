# Data Tables - Test Data Expert Skill

Auto-invoke when working with test data sheets, data import/export, AG Grid, or data-driven testing.

---

## Architecture Overview

```
Excel/CSV Upload
    ↓
Excel Parser (backend)
    ↓
TestDataSheet (database)
    ↓
AG Grid Enterprise (frontend)
    ↓
VDQL Queries (in Vero scripts)
    ↓
DataManager (runtime)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `/frontend/src/components/TestData/` | AG Grid components |
| `/backend/src/services/excel-parser.ts` | File parsing service |
| `/vero-lang/src/api/testDataApi.ts` | Data API client |
| `/vero-lang/src/runtime/DataManager.ts` | In-memory query engine |
| `/vero-lang/docs/DATA_TABLE_UX_PROPOSAL.md` | UX design document |

---

## TestDataSheet Model

```typescript
interface TestDataSheet {
    id: string;
    projectId: string;
    name: string;
    description?: string;
    columns: ColumnDefinition[];
    rows: Record<string, any>[];
    version: number;
    createdAt: Date;
    updatedAt: Date;
}

interface ColumnDefinition {
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url';
    required: boolean;
    defaultValue?: any;
    validation?: {
        pattern?: string;      // Regex for string
        min?: number;          // For number
        max?: number;
        minLength?: number;    // For string
        maxLength?: number;
        enum?: string[];       // Allowed values
    };
}
```

---

## AG Grid Integration

### Enterprise Features Used

- Cell editing with validation
- Copy/paste from Excel
- Column filtering & sorting
- Row grouping & aggregation
- Export to CSV/Excel
- Undo/redo
- Column pinning
- Row selection

### Grid Configuration

```typescript
const gridOptions: GridOptions = {
    columnDefs: columns.map(col => ({
        field: col.name,
        headerName: col.name,
        editable: true,
        cellEditor: getCellEditor(col.type),
        valueParser: getValueParser(col.type),
        valueFormatter: getValueFormatter(col.type),
        filter: getFilter(col.type),
    })),
    defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true,
    },
    rowSelection: 'multiple',
    enableRangeSelection: true,
    undoRedoCellEditing: true,
    clipboardDelimiter: '\t',
};
```

### Cell Editors by Type

| Type | Editor | Validation |
|------|--------|------------|
| string | Text input | minLength, maxLength, pattern |
| number | Numeric input | min, max |
| boolean | Checkbox | - |
| date | Date picker | - |
| email | Text input | Email regex |
| url | Text input | URL regex |
| enum | Dropdown | Allowed values |

---

## Excel/CSV Parsing

### Supported Formats

- `.xlsx` - Excel 2007+
- `.xls` - Legacy Excel
- `.csv` - Comma-separated values

### Parsing Flow

```typescript
async function parseExcel(file: Buffer): Promise<ParsedSheet> {
    const workbook = xlsx.read(file);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // 1. Extract headers (first row)
    const headers = extractHeaders(sheet);

    // 2. Infer column types from data
    const columns = headers.map(header => ({
        name: header,
        type: inferType(getColumnData(sheet, header))
    }));

    // 3. Parse rows
    const rows = xlsx.utils.sheet_to_json(sheet);

    return { columns, rows };
}

function inferType(values: any[]): ColumnType {
    // Check sample values to determine type
    if (values.every(v => typeof v === 'number')) return 'number';
    if (values.every(v => typeof v === 'boolean')) return 'boolean';
    if (values.every(v => isValidDate(v))) return 'date';
    if (values.every(v => isValidEmail(v))) return 'email';
    if (values.every(v => isValidUrl(v))) return 'url';
    return 'string';
}
```

---

## VDQL Integration

### Loading Data in Tests

```vero
# Reference table directly
DATA users = TestData.Users

# With filtering
DATA admins = TestData.Users WHERE role == "admin"

# With sorting and limiting
DATA topCustomers = TestData.Customers
    ORDER BY totalSpent DESC
    LIMIT 10
```

### DataManager Runtime

```typescript
class DataManager {
    private tables: Map<string, any[]>;

    // Pre-load all tables at test start
    async preloadTables(tableNames: string[]): Promise<void> {
        for (const name of tableNames) {
            const data = await testDataApi.getTableData(name);
            this.tables.set(name, data);
        }
    }

    // Query interface
    query(tableName: string): QueryBuilder {
        const data = this.tables.get(tableName);
        return new QueryBuilder(data);
    }
}

class QueryBuilder<T> {
    select(columns: string[]): QueryBuilder<T>;
    where(predicate: Predicate): QueryBuilder<T>;
    orderBy(specs: SortSpec[]): QueryBuilder<T>;
    limit(count: number): QueryBuilder<T>;
    offset(count: number): QueryBuilder<T>;
    first(): T | null;
    last(): T | null;
    random(): T | null;
    toArray(): T[];
}
```

### Predicate Functions

```typescript
// Comparison
eq(column, value)      // column == value
neq(column, value)     // column != value
gt(column, value)      // column > value
lt(column, value)      // column < value
gte(column, value)     // column >= value
lte(column, value)     // column <= value

// Text
contains(column, substr)
startsWith(column, prefix)
endsWith(column, suffix)
matches(column, regex)

// Collection
isIn(column, values[])
notIn(column, values[])

// Null/Empty
isEmpty(column)
isNotEmpty(column)
isNull(column)

// Logic
and(cond1, cond2)
or(cond1, cond2)
not(condition)
```

---

## Data Table UX (Non-Technical Users)

### Visual Query Builder

Instead of writing VDQL manually, users can:

1. **Link to Table** - Define relationships
2. **Group By** - Create pivot table views
3. **Sort Builder** - Multi-field sorting
4. **Formula Builder** - Computed columns

### Generated VDQL

```
User Action: "Show me all pending orders over $100"
    ↓
Visual Query Builder UI
    ↓
Generated VDQL:
DATA result = TestData.Orders
    WHERE status == "pending" AND amount > 100
    ORDER BY createdAt DESC
```

### Reusable Views

Users can save queries as named views:

```typescript
interface SavedView {
    id: string;
    name: string;
    tableId: string;
    query: VDQLQuery;  // Stored query definition
}
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/test-data/sheets` | List sheets |
| POST | `/api/test-data/sheets` | Create sheet |
| GET | `/api/test-data/sheets/:id` | Get sheet with data |
| PUT | `/api/test-data/sheets/:id` | Update sheet |
| DELETE | `/api/test-data/sheets/:id` | Delete sheet |
| POST | `/api/test-data/sheets/:id/import` | Import from file |
| GET | `/api/test-data/sheets/:id/export` | Export to file |
| GET | `/api/test-data/sheets/:id/rows` | Get rows (paginated) |
| POST | `/api/test-data/sheets/:id/rows` | Add rows |
| PUT | `/api/test-data/sheets/:id/rows/:rowId` | Update row |
| DELETE | `/api/test-data/sheets/:id/rows/:rowId` | Delete row |
| POST | `/api/test-data/query` | Execute VDQL query |

---

## Data Validation

### Column-Level Validation

```typescript
function validateCell(value: any, column: ColumnDefinition): ValidationResult {
    // Required check
    if (column.required && (value === null || value === undefined || value === '')) {
        return { valid: false, error: `${column.name} is required` };
    }

    // Type check
    if (!isValidType(value, column.type)) {
        return { valid: false, error: `${column.name} must be ${column.type}` };
    }

    // Validation rules
    if (column.validation) {
        const { pattern, min, max, minLength, maxLength, enum: allowed } = column.validation;

        if (pattern && !new RegExp(pattern).test(value)) {
            return { valid: false, error: `${column.name} format invalid` };
        }

        if (min !== undefined && value < min) {
            return { valid: false, error: `${column.name} must be >= ${min}` };
        }

        // ... more validations
    }

    return { valid: true };
}
```

### Row-Level Validation

```typescript
function validateRow(row: Record<string, any>, columns: ColumnDefinition[]): ValidationResult[] {
    return columns.map(col => validateCell(row[col.name], col));
}
```

---

## Common Tasks

### Adding New Column Type

1. Add to `ColumnType` enum
2. Update type inference in `excel-parser.ts`
3. Add cell editor in AG Grid config
4. Add validation logic
5. Update VDQL type handling

### Implementing Table Relationships

1. Add `relationships` field to `TestDataSheet`:

```typescript
interface TableRelationship {
    sourceColumn: string;
    targetTable: string;
    targetColumn: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}
```

2. Update DataManager for JOIN queries
3. Add UI for relationship management

### Adding Computed Columns

1. Add `computed` field to `ColumnDefinition`:

```typescript
interface ComputedColumn extends ColumnDefinition {
    formula: string;  // e.g., "price * quantity"
}
```

2. Evaluate formula on data load
3. Update AG Grid to show computed values

---

## Gotchas

1. **Pre-Loading**: Data loaded ONCE at test start - no DB calls during test.
2. **Large Files**: Consider chunked upload for large Excel files.
3. **Type Inference**: May guess wrong - allow user override.
4. **Version Conflicts**: Handle concurrent edits with versioning.
5. **Formula Security**: Sanitize/sandbox computed column formulas.
6. **AG Grid License**: Enterprise features require license key.
