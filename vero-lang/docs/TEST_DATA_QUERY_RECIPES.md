# Test Data Query Recipes

## One row by key

```vero
ROW one = Users WHERE userId == "U-1001"
```

## Multiple rows with sort and paging

```vero
ROWS many = Users WHERE status == "active" ORDER BY createdAt DESC LIMIT 25 OFFSET 0
```

## One value from the first matching row

```vero
ROW one = Drivers WHERE region == "US-East" ORDER BY lastSeen DESC
TEXT licenseNumber = one.licenseNumber
```

## Count matching rows

```vero
NUMBER total = COUNT Users WHERE enabled == true
```

## Cross-table key-set filter pattern

```vero
ROWS users = Users WHERE driverId IN ["D001", "D007"]
```

## Notes

- Use the Query ribbon tab to build these snippets with chips.
- Quick search is grid-only and is not emitted in runtime snippets.
- If a cross-table filter produces too many keys, refine it before copying the snippet.
