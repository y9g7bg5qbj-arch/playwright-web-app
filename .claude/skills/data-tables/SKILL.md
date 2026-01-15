# Data Tables - Test Data Expert Skill

Auto-invoke when working with test data sheets, data import/export, AG Grid, reference columns, or data-driven testing.

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
| `/frontend/src/components/TestData/AGGridDataTable.tsx` | Main grid component |
| `/frontend/src/components/TestData/ColumnEditorModal.tsx` | Column type configuration |
| `/frontend/src/components/TestData/RelationshipsModal.tsx` | Table relationships |
| `/frontend/src/components/TestData/ReferenceCellEditor.tsx` | Multi-select reference picker |
| `/frontend/src/components/TestData/ReferenceCellRenderer.tsx` | Display resolved references |
| `/backend/src/services/excel-parser.ts` | File parsing service |
| `/backend/src/services/referenceResolver.ts` | Resolve reference IDs to objects |
| `/backend/src/routes/test-data.routes.ts` | API endpoints |
| `/vero-lang/src/runtime/DataManager.ts` | In-memory query engine |

---

## Data Structure Pattern: Normalized References + State Rows

### Problem: Row Duplication in Excel

Traditional Excel test data causes massive duplication:

```
TestID | Driver | License | Vehicle | Year | State | Discount | TaxRate
-------|--------|---------|---------|------|-------|----------|--------
TC001  | John   | DL123   | Toyota  | 2020 | CA    | true     | 0.0725
TC001  | John   | DL123   | Toyota  | 2020 | PA    | false    | 0.06
TC001  | John   | DL123   | Honda   | 2022 | CA    | true     | 0.0725
TC001  | Jane   | DL456   | Toyota  | 2020 | CA    | true     | 0.0725
... (8 rows for 2 drivers × 2 vehicles × 2 states)
```

### Solution: Normalized Tables with References

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTITY TABLES (Normalized)                   │
├─────────────────────────────────────────────────────────────────┤
│  Drivers Table              Vehicles Table                      │
│  ┌────────┬────────────┐   ┌───────────┬────────────┐          │
│  │ D001   │ John Smith │   │ V001      │ Toyota     │          │
│  │ D002   │ Jane Doe   │   │ V002      │ Honda      │          │
│  └────────┴────────────┘   └───────────┴────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              SCENARIOS (One Row Per State)                      │
├──────────┬───────┬─────────────┬──────────────┬─────────────────┤
│ TestID   │ State │ $drivers    │ $vehicles    │ State-Specific  │
├──────────┼───────┼─────────────┼──────────────┼─────────────────┤
│ TC001    │ CA    │ D001, D002  │ V001, V002   │ discount=true   │
│ TC001    │ PA    │ D001, D002  │ V001, V002   │ discount=false  │
│ TC001    │ TX    │ D001, D002  │ V001, V002   │ discount=true   │
└──────────┴───────┴─────────────┴──────────────┴─────────────────┘
```

**Result:** 12 Excel rows → 3 scenario rows + 4 entity rows = **7 rows total (42% reduction)**

### Key Insight

- **Drivers/Vehicles** = Pure reference data (no state-specific variations)
- **States** = Need dedicated rows (each state has different field values)

---

## Column Types

### Standard Types

| Type | Editor | Description |
|------|--------|-------------|
| `text` | Text input | Free-form text |
| `number` | Numeric input | Numbers with min/max |
| `boolean` | Checkbox | True/false |
| `date` | Date picker | Date values |
| `select` | Dropdown | Enum values |
| `formula` | Readonly | Computed columns |
| `reference` | Multi-select picker | References to other tables |

### Reference Column Type (NEW)

```typescript
interface Column {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'formula' | 'select' | 'reference';
  referenceConfig?: {
    targetSheet: string;       // "Drivers"
    targetColumn: string;      // "DriverID" (the ID column)
    displayColumn: string;     // "Name" (what to show in cell)
    allowMultiple: boolean;    // true for iteration columns ($drivers)
    separator?: string;        // "," for parsing (default)
  };
}
```

### Reference Cell Editor UI

```
┌─ Select Drivers ──────────────────────────────────────────┐
│ ⌕ Search drivers...                                       │
│                                                           │
│ Selected (2):                                             │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ [D001] John Smith - DL123                         ✕   │ │
│ │ [D002] Jane Doe - DL456                           ✕   │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                           │
│ Available:                                                │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ ☐ [D003] Bob Wilson - DL789                           │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                           │
│                              [Cancel]  [Apply]            │
└───────────────────────────────────────────────────────────┘
```

---

## Reference Resolution

### Backend API

```
POST /api/test-data/resolve-references
Body: {
  sheetId: string,
  rowId: string,
  columns: string[]  // ["$drivers", "$vehicles"]
}

Response: {
  $drivers: [
    { DriverID: "D001", Name: "John Smith", License: "DL123" },
    { DriverID: "D002", Name: "Jane Doe", License: "DL456" }
  ],
  $vehicles: [
    { VehicleID: "V001", Make: "Toyota", Model: "Camry", Year: 2020 }
  ]
}
```

### Reference Resolver Service

```typescript
// backend/src/services/referenceResolver.ts
class ReferenceResolver {
  async resolveReferences(
    sheetId: string,
    rowData: Record<string, any>,
    referenceColumns: string[]
  ): Promise<Record<string, any[]>> {
    const results: Record<string, any[]> = {};

    for (const colName of referenceColumns) {
      const column = await this.getColumnConfig(sheetId, colName);
      if (column.type !== 'reference') continue;

      const ids = this.parseIds(rowData[colName], column.referenceConfig.separator);
      const targetData = await this.fetchTargetRows(
        column.referenceConfig.targetSheet,
        column.referenceConfig.targetColumn,
        ids
      );

      results[colName] = targetData;
    }

    return results;
  }

  private parseIds(value: string, separator = ','): string[] {
    return value.split(separator).map(id => id.trim()).filter(Boolean);
  }
}
```

---

## VDQL Integration

### Loading Data with References

```vdql
# Load scenarios and expand references
data scenarios = TestData.Scenarios
  where TestID == "TC001"
  expand $drivers, $vehicles

# Short form - expand all reference columns
data scenarios = TestData.Scenarios where TestID == "TC001" expand all
```

### Vero Script Iteration

```vero
# Load all scenario rows for this test (one per state)
load $scenarios from "Scenarios" where TestID = $testId expand all

# Outer loop: each state (dedicated row)
for each $scenario in $scenarios

  # Inner loops: drivers × vehicles (Cartesian product from references)
  for each $driver in $scenario.$drivers
    for each $vehicle in $scenario.$vehicles

      # State-specific values (from the row)
      fill "State" with $scenario.State
      check "Discount" if $scenario.Discount
      fill "Tax Rate" with $scenario.TaxRate

      # Reference data (resolved from other tables)
      fill "Driver Name" with $driver.Name
      fill "License" with $driver.License
      fill "Vehicle Make" with $vehicle.Make

      click "Submit"
    end
  end
end
```

### Transpiled Playwright

```typescript
const scenarios = await dataManager.load('Scenarios', { TestID: testId });

for (const scenario of scenarios) {
  const drivers = await dataManager.resolveReferences(scenario, '$drivers', 'Drivers');
  const vehicles = await dataManager.resolveReferences(scenario, '$vehicles', 'Vehicles');

  for (const driver of drivers) {
    for (const vehicle of vehicles) {
      await page.getByLabel('State').fill(scenario.State);
      if (scenario.Discount) {
        await page.getByLabel('Discount').check();
      }
      await page.getByLabel('Driver Name').fill(driver.Name);
      await page.getByLabel('Vehicle Make').fill(vehicle.Make);
      await page.getByRole('button', { name: 'Submit' }).click();
    }
  }
}
```

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
    type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'formula' | 'reference';
    required: boolean;
    defaultValue?: any;
    validation?: {
        pattern?: string;
        min?: number;
        max?: number;
        minLength?: number;
        maxLength?: number;
        enum?: string[];
    };
    // For reference type
    referenceConfig?: {
        targetSheet: string;
        targetColumn: string;
        displayColumn: string;
        allowMultiple: boolean;
        separator?: string;
    };
    // For formula type
    formula?: string;
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
- Column pinning/freezing
- Row selection
- Custom cell renderers/editors

### Grid Configuration

```typescript
const gridOptions: GridOptions = {
    columnDefs: columns.map(col => ({
        field: col.name,
        headerName: col.name,
        editable: true,
        cellEditor: getCellEditor(col.type),
        cellRenderer: col.type === 'reference' ? 'referenceCellRenderer' : undefined,
        cellEditorPopup: col.type === 'reference',
        valueParser: getValueParser(col.type),
        valueFormatter: getValueFormatter(col.type),
        filter: getFilter(col.type),
        pinned: frozenColumns.includes(col.name) ? 'left' : undefined,
        hide: hiddenColumns.includes(col.name),
    })),
    defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true,
    },
    components: {
        referenceCellRenderer: ReferenceCellRenderer,
        referenceCellEditor: ReferenceCellEditor,
    },
};
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
| POST | `/api/test-data/resolve-references` | Resolve reference IDs |
| GET | `/api/test-data/sheets/:id/relationships` | Get table relationships |
| POST | `/api/test-data/relationships` | Create relationship |

---

## Common Tasks

### Adding Reference Column Type (IMPLEMENTED)

1. **ColumnEditorModal.tsx** - Reference type configuration UI:
   - Target sheet dropdown (filters out current sheet)
   - Target column (ID) dropdown
   - Display column dropdown
   - Allow multiple checkbox
   - Props: `availableSheets`, `currentSheetId`

2. **ReferenceCellEditor.tsx** - Multi-select picker modal:
   - Fetches rows from target sheet via `testDataApi.getSheet()`
   - Search/filter functionality
   - Multi-select with chips display (when allowMultiple)
   - Single-select mode (when !allowMultiple)
   - Returns comma-separated IDs

3. **ReferenceCellRenderer.tsx** - Display resolved names:
   - Resolves IDs to display names
   - In-memory cache for performance
   - Shows single value or chips for multiple
   - Loading and error states

4. **Backend endpoints** (`/api/test-data/`):
   - `POST /resolve-references` - Resolve IDs to full row data
   - `POST /sheets/:sheetId/expand` - VDQL expand support

5. **Frontend API** (`testData.ts`):
   - `resolveReferences(sheetId, rowId, columns)`
   - `expandSheetRows(sheetId, { rowIds?, expandColumns? })`

### Setting Up Normalized Data Structure

1. Create entity tables (Drivers, Vehicles, etc.):
   - Each with unique ID column (DriverID, VehicleID)
   - All entity-specific fields

2. Create scenario table:
   - TestID column
   - State column (one row per state)
   - Reference columns ($drivers, $vehicles) with `allowMultiple: true`
   - State-specific field columns (Discount, TaxRate, etc.)

3. Configure relationships:
   - $drivers → Drivers.DriverID
   - $vehicles → Vehicles.VehicleID

4. Write Vero script with nested iteration

---

## Gotchas

1. **Reference Resolution**: Always resolve references at runtime, not stored denormalized
2. **Pre-Loading**: Data loaded ONCE at test start - no DB calls during test
3. **Separator**: Default comma separator, but allow custom (e.g., semicolon)
4. **Display vs ID**: Store IDs in cell, display resolved names
5. **Circular References**: Prevent circular relationships between tables
6. **Large Files**: Consider chunked upload for large Excel files
7. **Type Inference**: May guess wrong on import - allow user override
8. **AG Grid License**: Enterprise features require license key

---

## Verification Checklist

- [ ] Reference cell editor shows multi-select picker
- [ ] Cell displays resolved names, not IDs
- [ ] VDQL `expand` resolves references correctly
- [ ] Vero script nested iteration works
- [ ] 3 states × 2 drivers × 2 vehicles = 12 iterations
- [ ] Each iteration has correct state-specific values
- [ ] Playwright trace shows all form submissions
