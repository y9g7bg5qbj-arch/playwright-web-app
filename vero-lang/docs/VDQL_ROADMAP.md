# VDQL Roadmap: MongoDB Feature Parity

## Current State (v1.0)
- ✅ Basic filtering (where clause)
- ✅ Comparison operators (==, !=, >, <, >=, <=)
- ✅ Text operators (contains, starts with, ends with, matches)
- ✅ IN / NOT IN clauses
- ✅ AND / OR / NOT logic
- ✅ ORDER BY (single field)
- ✅ LIMIT / OFFSET pagination
- ✅ Aggregations (count, sum, avg, min, max)
- ✅ DISTINCT values
- ✅ Row selection (first, last, random, index, range)
- ✅ Column selection (single and multiple)

---

## Phase 2: Essential Additions

### 2.1 JOIN / Lookup (Cross-table queries)
```vero
# Syntax Option A: Explicit JOIN
data orderWithUser = TestData.Orders
    join TestData.Users on Orders.userId == Users.id
    where Orders.status == "pending"

# Syntax Option B: Inline lookup
data order = TestData.Orders where id == 123
    with user = TestData.Users[Orders.userId]

# Syntax Option C: Dot notation for foreign keys
data order = first TestData.Orders where id == 123
fill "Customer" with order.user.name  # Auto-resolves userId -> Users.name
```

**Use Case:** Get order details with customer info without multiple queries.

### 2.2 GROUP BY with Aggregations
```vero
# Count by status
list statusCounts = TestData.Orders
    group by status
    select status, count as total

# Sum revenue by category
list categoryRevenue = TestData.Products
    group by category
    select category, sum(price) as revenue
    order by revenue desc

# With HAVING clause
list bigCategories = TestData.Products
    group by category
    select category, count as productCount
    having productCount > 10
```

**Use Case:** Generate summary statistics for test validation.

### 2.3 Multi-field ORDER BY
```vero
# Sort by multiple fields
list users = TestData.Users
    order by lastName asc, firstName asc

list products = TestData.Products
    order by category asc, price desc, name asc
```

**Use Case:** Deterministic ordering for consistent test results.

---

## Phase 3: Advanced Features

### 3.1 Nested Object Access
```vero
# Access nested properties (if table has JSON columns)
data user = TestData.Users where profile.settings.theme == "dark"
text city = TestData.Users[0].address.city

# Array contains
list premiumUsers = TestData.Users where tags contains "premium"
list verifiedPremium = TestData.Users where tags contains all ("premium", "verified")
```

### 3.2 Computed Fields / Expressions
```vero
# Computed values in select
list productSummary = TestData.Products
    select name, price, (price * 0.1) as tax, (price * 1.1) as totalPrice

# String concatenation
list fullNames = TestData.Users
    select (firstName + " " + lastName) as fullName, email
```

### 3.3 Date Arithmetic
```vero
# Relative date comparisons
list recentOrders = TestData.Orders where createdAt >= days ago 7
list thisMonth = TestData.Orders where createdAt >= start of month
list expiringSoon = TestData.Subscriptions where expiresAt <= days from now 30

# Date parts
list byMonth = TestData.Orders
    group by month(createdAt)
    select month, count as orderCount
```

### 3.4 Subqueries
```vero
# IN with subquery
list usersWithOrders = TestData.Users
    where id in (select distinct userId from TestData.Orders)

# NOT IN with subquery
list usersWithoutOrders = TestData.Users
    where id not in (select userId from TestData.Orders)
```

---

## Phase 4: Power Features

### 4.1 Window Functions
```vero
# Running totals
list ordersWithRunningTotal = TestData.Orders
    select *, sum(amount) over (order by date) as runningTotal

# Ranking
list rankedProducts = TestData.Products
    select *, rank() over (partition by category order by price desc) as priceRank
```

### 4.2 Pivoting
```vero
# Pivot table
list salesByMonth = TestData.Orders
    pivot month(date) as columns
    sum(amount) as values
    group by productId
```

### 4.3 Conditional Logic
```vero
# CASE expressions
list categorizedUsers = TestData.Users
    select name,
        case
            when age < 18 then "minor"
            when age < 65 then "adult"
            else "senior"
        end as ageGroup
```

---

## Implementation Priority

| Feature | Priority | Complexity | Use Case Frequency |
|---------|----------|------------|-------------------|
| GROUP BY | 🔴 High | Medium | Very Common |
| JOIN/Lookup | 🔴 High | High | Very Common |
| Multi-field ORDER BY | 🟡 Medium | Low | Common |
| Date Arithmetic | 🟡 Medium | Medium | Common |
| Computed Fields | 🟡 Medium | Medium | Occasional |
| Nested Objects | 🟢 Low | High | Rare |
| Subqueries | 🟢 Low | High | Occasional |
| Window Functions | 🟢 Low | Very High | Rare |

---

## Backend Requirements

For these features to work, the backend data layer needs:

1. **For JOINs:** Foreign key metadata in table schema
2. **For GROUP BY:** Aggregation engine in DataManager
3. **For Date Ops:** Date parsing and arithmetic library
4. **For Nested Objects:** JSON column type support

---

## Grammar Changes Required

```antlr
// GROUP BY
groupByClause
    : GROUP BY identifierList
    ;

selectClause
    : SELECT selectItem (COMMA selectItem)*
    ;

selectItem
    : expression (AS IDENTIFIER)?
    | aggregateFunction LPAREN expression RPAREN (AS IDENTIFIER)?
    ;

// JOIN
joinClause
    : JOIN tableReference ON joinCondition
    ;

// Multi-field ORDER BY (already partially supported)
orderByClause
    : ORDER BY orderColumn (COMMA orderColumn)*
    ;
```
