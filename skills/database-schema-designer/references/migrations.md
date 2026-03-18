# Migrations — 마이그레이션 가이드

---

## Best Practices

| Practice | WHY |
|----------|-----|
| Always reversible | Need to rollback |
| Backward compatible | Zero-downtime deploys |
| Schema before data | Separate concerns |
| Test on staging | Catch issues early |

---

## Adding a Column (Zero-Downtime)

```sql
-- Step 1: Add nullable column
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Step 2: Deploy code that writes to new column

-- Step 3: Backfill existing rows
UPDATE users SET phone = '' WHERE phone IS NULL;

-- Step 4: Make required (if needed)
ALTER TABLE users MODIFY phone VARCHAR(20) NOT NULL;
```

---

## Renaming a Column (Zero-Downtime)

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

---

## Migration Template

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
