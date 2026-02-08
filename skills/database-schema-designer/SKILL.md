---
name: database-schema-designer
description: Design robust, scalable database schemas for SQL and NoSQL databases. Provides normalization guidelines, indexing strategies, migration patterns, constraint design, and performance optimization. Ensures data integrity, query performance, and maintainable data models.
license: MIT
---

# Database Schema Designer

Design production-ready database schemas with best practices built-in.

---

## Quick Start

Just describe your data model:

```
design a schema for an e-commerce platform with users, products, orders
```

You'll get a complete SQL schema like:

```sql
CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  total DECIMAL(10,2) NOT NULL,
  INDEX idx_orders_user (user_id)
);
```

**What to include in your request:**
- Entities (users, products, orders)
- Key relationships (users have orders, orders have items)
- Scale hints (high-traffic, millions of records)
- Database preference (SQL/NoSQL) - defaults to SQL if not specified

---

## Triggers

| Trigger | Example |
|---------|---------|
| `design schema` | "design a schema for user authentication" |
| `database design` | "database design for multi-tenant SaaS" |
| `create tables` | "create tables for a blog system" |
| `schema for` | "schema for inventory management" |
| `model data` | "model data for real-time analytics" |
| `I need a database` | "I need a database for tracking orders" |
| `design NoSQL` | "design NoSQL schema for product catalog" |

---

## Key Terms

| Term | Definition |
|------|------------|
| **Normalization** | Organizing data to reduce redundancy (1NF → 2NF → 3NF) |
| **3NF** | Third Normal Form - no transitive dependencies between columns |
| **OLTP** | Online Transaction Processing - write-heavy, needs normalization |
| **OLAP** | Online Analytical Processing - read-heavy, benefits from denormalization |
| **Foreign Key (FK)** | Column that references another table's primary key |
| **Index** | Data structure that speeds up queries (at cost of slower writes) |
| **Access Pattern** | How your app reads/writes data (queries, joins, filters) |
| **Denormalization** | Intentionally duplicating data to speed up reads |

---

## Quick Reference

| Task | Approach | Key Consideration |
|------|----------|-------------------|
| New schema | Normalize to 3NF first | Domain modeling over UI |
| SQL vs NoSQL | Access patterns decide | Read/write ratio matters |
| Primary keys | INT or UUID | UUID for distributed systems |
| Foreign keys | Always constrain | ON DELETE strategy critical |
| Indexes | FKs + WHERE columns | Column order matters |
| Migrations | Always reversible | Backward compatible first |

---

## Process Overview

```
Your Data Requirements
    |
    v
+-----------------------------------------------------+
| Phase 1: ANALYSIS                                   |
| * Identify entities and relationships               |
| * Determine access patterns (read vs write heavy)   |
| * Choose SQL or NoSQL based on requirements         |
+-----------------------------------------------------+
    |
    v
+-----------------------------------------------------+
| Phase 2: DESIGN                                     |
| * Normalize to 3NF (SQL) or embed/reference (NoSQL) |
| * Define primary keys and foreign keys              |
| * Choose appropriate data types                     |
| * Add constraints (UNIQUE, CHECK, NOT NULL)         |
+-----------------------------------------------------+
    |
    v
+-----------------------------------------------------+
| Phase 3: OPTIMIZE                                   |
| * Plan indexing strategy                            |
| * Consider denormalization for read-heavy queries   |
| * Add timestamps (created_at, updated_at)           |
+-----------------------------------------------------+
    |
    v
+-----------------------------------------------------+
| Phase 4: MIGRATE                                    |
| * Generate migration scripts (up + down)            |
| * Ensure backward compatibility                     |
| * Plan zero-downtime deployment                     |
+-----------------------------------------------------+
    |
    v
Production-Ready Schema
```

---

## Commands

| Command | When to Use | Action |
|---------|-------------|--------|
| `design schema for {domain}` | Starting fresh | Full schema generation |
| `normalize {table}` | Fixing existing table | Apply normalization rules |
| `add indexes for {table}` | Performance issues | Generate index strategy |
| `migration for {change}` | Schema evolution | Create reversible migration |
| `review schema` | Code review | Audit existing schema |

**Workflow:** Start with `design schema` → iterate with `normalize` → optimize with `add indexes` → evolve with `migration`

---

## Core Principles

| Principle | WHY | Implementation |
|-----------|-----|----------------|
| Model the Domain | UI changes, domain doesn't | Entity names reflect business concepts |
| Data Integrity First | Corruption is costly to fix | Constraints at database level |
| Optimize for Access Pattern | Can't optimize for both | OLTP: normalized, OLAP: denormalized |
| Plan for Scale | Retrofitting is painful | Index strategy + partitioning plan |

---

## Anti-Patterns

| Avoid | Why | Instead |
|-------|-----|---------|
| VARCHAR(255) everywhere | Wastes storage, hides intent | Size appropriately per field |
| FLOAT for money | Rounding errors | DECIMAL(10,2) |
| Missing FK constraints | Orphaned data | Always define foreign keys |
| No indexes on FKs | Slow JOINs | Index every foreign key |
| Storing dates as strings | Can't compare/sort | DATE, TIMESTAMP types |
| SELECT * in queries | Fetches unnecessary data | Explicit column lists |
| Non-reversible migrations | Can't rollback | Always write DOWN migration |
| Adding NOT NULL without default | Breaks existing rows | Add nullable, backfill, then constrain |

---

## Verification Checklist

After designing a schema:

- [ ] Every table has a primary key
- [ ] All relationships have foreign key constraints
- [ ] ON DELETE strategy defined for each FK
- [ ] Indexes exist on all foreign keys
- [ ] Indexes exist on frequently queried columns
- [ ] Appropriate data types (DECIMAL for money, etc.)
- [ ] NOT NULL on required fields
- [ ] UNIQUE constraints where needed
- [ ] CHECK constraints for validation
- [ ] created_at and updated_at timestamps
- [ ] Migration scripts are reversible
- [ ] Tested on staging with production data

---

**Deep Dive: Normalization (SQL)** > 상세: [references/normalization.md](references/normalization.md)

<details>
<summary><strong>Deep Dive: Data Types</strong></summary>

### String Types

| Type | Use Case | Example |
|------|----------|---------|
| CHAR(n) | Fixed length | State codes, ISO dates |
| VARCHAR(n) | Variable length | Names, emails |
| TEXT | Long content | Articles, descriptions |

```sql
-- Good sizing
email VARCHAR(255)
phone VARCHAR(20)
country_code CHAR(2)
```

### Numeric Types

| Type | Range | Use Case |
|------|-------|----------|
| TINYINT | -128 to 127 | Age, status codes |
| SMALLINT | -32K to 32K | Quantities |
| INT | -2.1B to 2.1B | IDs, counts |
| BIGINT | Very large | Large IDs, timestamps |
| DECIMAL(p,s) | Exact precision | Money |
| FLOAT/DOUBLE | Approximate | Scientific data |

```sql
-- ALWAYS use DECIMAL for money
price DECIMAL(10, 2)  -- $99,999,999.99

-- NEVER use FLOAT for money
price FLOAT  -- Rounding errors!
```

### Date/Time Types

```sql
DATE        -- 2025-10-31
TIME        -- 14:30:00
DATETIME    -- 2025-10-31 14:30:00
TIMESTAMP   -- Auto timezone conversion

-- Always store in UTC
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

### Boolean

```sql
-- PostgreSQL
is_active BOOLEAN DEFAULT TRUE

-- MySQL
is_active TINYINT(1) DEFAULT 1
```

</details>

<details>
<summary><strong>Deep Dive: Indexing Strategy</strong></summary>

### When to Create Indexes

| Always Index | Reason |
|--------------|--------|
| Foreign keys | Speed up JOINs |
| WHERE clause columns | Speed up filtering |
| ORDER BY columns | Speed up sorting |
| Unique constraints | Enforced uniqueness |

```sql
-- Foreign key index
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- Query pattern index
CREATE INDEX idx_orders_status_date ON orders(status, created_at);
```

### Index Types

| Type | Best For | Example |
|------|----------|---------|
| B-Tree | Ranges, equality | `price > 100` |
| Hash | Exact matches only | `email = 'x@y.com'` |
| Full-text | Text search | `MATCH AGAINST` |
| Partial | Subset of rows | `WHERE is_active = true` |

### Composite Index Order

```sql
CREATE INDEX idx_customer_status ON orders(customer_id, status);

-- Uses index (customer_id first)
SELECT * FROM orders WHERE customer_id = 123;
SELECT * FROM orders WHERE customer_id = 123 AND status = 'pending';

-- Does NOT use index (status alone)
SELECT * FROM orders WHERE status = 'pending';
```

**Rule:** Most selective column first, or column most queried alone.

### Index Pitfalls

| Pitfall | Problem | Solution |
|---------|---------|----------|
| Over-indexing | Slow writes | Only index what's queried |
| Wrong column order | Unused index | Match query patterns |
| Missing FK indexes | Slow JOINs | Always index FKs |

</details>

<details>
<summary><strong>Deep Dive: Constraints</strong></summary>

### Primary Keys

```sql
-- Auto-increment (simple)
id INT AUTO_INCREMENT PRIMARY KEY

-- UUID (distributed systems)
id CHAR(36) PRIMARY KEY DEFAULT (UUID())

-- Composite (junction tables)
PRIMARY KEY (student_id, course_id)
```

### Foreign Keys

```sql
FOREIGN KEY (customer_id) REFERENCES customers(id)
  ON DELETE CASCADE     -- Delete children with parent
  ON DELETE RESTRICT    -- Prevent deletion if referenced
  ON DELETE SET NULL    -- Set to NULL when parent deleted
  ON UPDATE CASCADE     -- Update children when parent changes
```

| Strategy | Use When |
|----------|----------|
| CASCADE | Dependent data (order_items) |
| RESTRICT | Important references (prevent accidents) |
| SET NULL | Optional relationships |

### Other Constraints

```sql
-- Unique
email VARCHAR(255) UNIQUE NOT NULL

-- Composite unique
UNIQUE (student_id, course_id)

-- Check
price DECIMAL(10,2) CHECK (price >= 0)
discount INT CHECK (discount BETWEEN 0 AND 100)

-- Not null
name VARCHAR(100) NOT NULL
```

</details>

<details>
<summary><strong>Deep Dive: Relationship Patterns</strong></summary>

### One-to-Many

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id)
);

CREATE TABLE order_items (
  id INT PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT NOT NULL,
  quantity INT NOT NULL
);
```

### Many-to-Many

```sql
-- Junction table
CREATE TABLE enrollments (
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, course_id)
);
```

### Self-Referencing

```sql
CREATE TABLE employees (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  manager_id INT REFERENCES employees(id)
);
```

### Polymorphic

```sql
-- Approach 1: Separate FKs (stronger integrity)
CREATE TABLE comments (
  id INT PRIMARY KEY,
  content TEXT NOT NULL,
  post_id INT REFERENCES posts(id),
  photo_id INT REFERENCES photos(id),
  CHECK (
    (post_id IS NOT NULL AND photo_id IS NULL) OR
    (post_id IS NULL AND photo_id IS NOT NULL)
  )
);

-- Approach 2: Type + ID (flexible, weaker integrity)
CREATE TABLE comments (
  id INT PRIMARY KEY,
  content TEXT NOT NULL,
  commentable_type VARCHAR(50) NOT NULL,
  commentable_id INT NOT NULL
);
```

</details>

**Deep Dive: NoSQL Design (MongoDB)** > 상세: [references/nosql-mongodb.md](references/nosql-mongodb.md)

<details>
<summary><strong>Deep Dive: Migrations</strong></summary>

### Migration Best Practices

| Practice | WHY |
|----------|-----|
| Always reversible | Need to rollback |
| Backward compatible | Zero-downtime deploys |
| Schema before data | Separate concerns |
| Test on staging | Catch issues early |

### Adding a Column (Zero-Downtime)

```sql
-- Step 1: Add nullable column
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Step 2: Deploy code that writes to new column

-- Step 3: Backfill existing rows
UPDATE users SET phone = '' WHERE phone IS NULL;

-- Step 4: Make required (if needed)
ALTER TABLE users MODIFY phone VARCHAR(20) NOT NULL;
```

### Renaming a Column (Zero-Downtime)

```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN email_address VARCHAR(255);

-- Step 2: Copy data
UPDATE users SET email_address = email;

-- Step 3: Deploy code reading from new column
-- Step 4: Deploy code writing to new column

-- Step 5: Drop old column
ALTER TABLE users DROP COLUMN email;
```

### Migration Template

```sql
-- Migration: YYYYMMDDHHMMSS_description.sql

-- UP
BEGIN;
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
CREATE INDEX idx_users_phone ON users(phone);
COMMIT;

-- DOWN
BEGIN;
DROP INDEX idx_users_phone ON users;
ALTER TABLE users DROP COLUMN phone;
COMMIT;
```

</details>

**Deep Dive: Performance Optimization** > 상세: [references/performance-optimization.md](references/performance-optimization.md)

---

## Related Resources

- **MySQL 전문가:** `agents/database-mysql.md`
- **PostgreSQL/Supabase 전문가:** `agents/database-postgresql.md`
- **Supabase Best Practices:** `skills/supabase-postgres-best-practices/SKILL.md`
