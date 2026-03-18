# Relationship Patterns — 관계 패턴 가이드

---

## One-to-Many

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

---

## Many-to-Many

```sql
-- Junction table
CREATE TABLE enrollments (
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, course_id)
);
```

---

## Self-Referencing

```sql
CREATE TABLE employees (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  manager_id INT REFERENCES employees(id)
);
```

---

## Polymorphic

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
