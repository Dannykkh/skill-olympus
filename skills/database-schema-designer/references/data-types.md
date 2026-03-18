# Data Types — 데이터베이스 타입 선택 가이드

---

## String Types

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

---

## Numeric Types

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

---

## Date/Time Types

```sql
DATE        -- 2025-10-31
TIME        -- 14:30:00
DATETIME    -- 2025-10-31 14:30:00
TIMESTAMP   -- Auto timezone conversion

-- Always store in UTC
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

---

## Boolean

```sql
-- PostgreSQL
is_active BOOLEAN DEFAULT TRUE

-- MySQL
is_active TINYINT(1) DEFAULT 1
```
