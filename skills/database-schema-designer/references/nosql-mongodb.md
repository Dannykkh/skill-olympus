# Deep Dive: NoSQL Design (MongoDB)

## Embedding vs Referencing

| Factor | Embed | Reference |
|--------|-------|-----------|
| Access pattern | Read together | Read separately |
| Relationship | 1:few | 1:many |
| Document size | Small | Approaching 16MB |
| Update frequency | Rarely | Frequently |

## Embedded Document

```json
{
  "_id": "order_123",
  "customer": {
    "id": "cust_456",
    "name": "Jane Smith",
    "email": "jane@example.com"
  },
  "items": [
    { "product_id": "prod_789", "quantity": 2, "price": 29.99 }
  ],
  "total": 109.97
}
```

## Referenced Document

```json
{
  "_id": "order_123",
  "customer_id": "cust_456",
  "item_ids": ["item_1", "item_2"],
  "total": 109.97
}
```

## MongoDB Indexes

```javascript
// Single field
db.users.createIndex({ email: 1 }, { unique: true });

// Composite
db.orders.createIndex({ customer_id: 1, created_at: -1 });

// Text search
db.articles.createIndex({ title: "text", content: "text" });

// Geospatial
db.stores.createIndex({ location: "2dsphere" });
```
