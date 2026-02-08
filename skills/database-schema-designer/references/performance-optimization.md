# Deep Dive: Performance Optimization

## Query Analysis

```sql
EXPLAIN SELECT * FROM orders
WHERE customer_id = 123 AND status = 'pending';
```

| Look For | Meaning |
|----------|---------|
| type: ALL | Full table scan (bad) |
| type: ref | Index used (good) |
| key: NULL | No index used |
| rows: high | Many rows scanned |

## N+1 Query Problem

```python
# BAD: N+1 queries
orders = db.query("SELECT * FROM orders")
for order in orders:
    customer = db.query(f"SELECT * FROM customers WHERE id = {order.customer_id}")

# GOOD: Single JOIN
results = db.query("""
    SELECT orders.*, customers.name
    FROM orders
    JOIN customers ON orders.customer_id = customers.id
""")
```

## Optimization Techniques

| Technique | When to Use |
|-----------|-------------|
| Add indexes | Slow WHERE/ORDER BY |
| Denormalize | Expensive JOINs |
| Pagination | Large result sets |
| Caching | Repeated queries |
| Read replicas | Read-heavy load |
| Partitioning | Very large tables |
