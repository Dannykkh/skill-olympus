# Constraints — 제약 조건 가이드

---

## Primary Keys

```sql
-- Auto-increment (simple)
id INT AUTO_INCREMENT PRIMARY KEY

-- UUID (distributed systems)
id CHAR(36) PRIMARY KEY DEFAULT (UUID())

-- Composite (junction tables)
PRIMARY KEY (student_id, course_id)
```

---

## Foreign Keys

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

---

## Other Constraints

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
