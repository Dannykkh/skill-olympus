# Indexing Strategy — 인덱스 전략 가이드

---

## When to Create Indexes

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

---

## Index Types

| Type | Best For | Example |
|------|----------|---------|
| B-Tree | Ranges, equality | `price > 100` |
| Hash | Exact matches only | `email = 'x@y.com'` |
| Full-text | Text search | `MATCH AGAINST` |
| Partial | Subset of rows | `WHERE is_active = true` |

---

## Composite Index Order

```sql
CREATE INDEX idx_customer_status ON orders(customer_id, status);

-- Uses index (customer_id first)
SELECT * FROM orders WHERE customer_id = 123;
SELECT * FROM orders WHERE customer_id = 123 AND status = 'pending';

-- Does NOT use index (status alone)
SELECT * FROM orders WHERE status = 'pending';
```

**Rule:** Most selective column first, or column most queried alone.

---

## Index Pitfalls

| Pitfall | Problem | Solution |
|---------|---------|----------|
| Over-indexing | Slow writes | Only index what's queried |
| Wrong column order | Unused index | Match query patterns |
| Missing FK indexes | Slow JOINs | Always index FKs |
