# Deep Dive: Normalization (SQL)

## Normal Forms

| Form | Rule | Violation Example |
|------|------|-------------------|
| **1NF** | Atomic values, no repeating groups | `product_ids = '1,2,3'` |
| **2NF** | 1NF + no partial dependencies | customer_name in order_items |
| **3NF** | 2NF + no transitive dependencies | country derived from postal_code |

## 1st Normal Form (1NF)

```sql
-- BAD: Multiple values in column
CREATE TABLE orders (
  id INT PRIMARY KEY,
  product_ids VARCHAR(255)  -- '101,102,103'
);

-- GOOD: Separate table for items
CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer_id INT
);

CREATE TABLE order_items (
  id INT PRIMARY KEY,
  order_id INT REFERENCES orders(id),
  product_id INT
);
```

## 2nd Normal Form (2NF)

```sql
-- BAD: customer_name depends only on customer_id
CREATE TABLE order_items (
  order_id INT,
  product_id INT,
  customer_name VARCHAR(100),  -- Partial dependency!
  PRIMARY KEY (order_id, product_id)
);

-- GOOD: Customer data in separate table
CREATE TABLE customers (
  id INT PRIMARY KEY,
  name VARCHAR(100)
);
```

## 3rd Normal Form (3NF)

```sql
-- BAD: country depends on postal_code
CREATE TABLE customers (
  id INT PRIMARY KEY,
  postal_code VARCHAR(10),
  country VARCHAR(50)  -- Transitive dependency!
);

-- GOOD: Separate postal_codes table
CREATE TABLE postal_codes (
  code VARCHAR(10) PRIMARY KEY,
  country VARCHAR(50)
);
```

## When to Denormalize

| Scenario | Denormalization Strategy |
|----------|-------------------------|
| Read-heavy reporting | Pre-calculated aggregates |
| Expensive JOINs | Cached derived columns |
| Analytics dashboards | Materialized views |

```sql
-- Denormalized for performance
CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer_id INT,
  total_amount DECIMAL(10,2),  -- Calculated
  item_count INT               -- Calculated
);
```
