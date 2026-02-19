# Cloudflare Storage Services CLI Reference

## KV (Key-Value Store)

### Manage Namespaces

```bash
wrangler kv namespace create MY_KV
wrangler kv namespace list
wrangler kv namespace delete --namespace-id <ID>
```

### Manage Keys

```bash
wrangler kv key put --namespace-id <ID> "key" "value"
wrangler kv key put --namespace-id <ID> "key" "value" --expiration-ttl 3600
wrangler kv key get --namespace-id <ID> "key"
wrangler kv key list --namespace-id <ID>
wrangler kv key delete --namespace-id <ID> "key"
wrangler kv bulk put --namespace-id <ID> data.json
```

### Config Binding

```jsonc
{
  "kv_namespaces": [
    { "binding": "CACHE", "id": "<NAMESPACE_ID>" }
  ]
}
```

---

## R2 (Object Storage)

### Manage Buckets

```bash
wrangler r2 bucket create my-bucket
wrangler r2 bucket create my-bucket --location wnam
wrangler r2 bucket list
wrangler r2 bucket info my-bucket
wrangler r2 bucket delete my-bucket
```

### Manage Objects

```bash
wrangler r2 object put my-bucket/path/file.txt --file ./local-file.txt
wrangler r2 object get my-bucket/path/file.txt
wrangler r2 object delete my-bucket/path/file.txt
```

### Config Binding

```jsonc
{
  "r2_buckets": [
    { "binding": "ASSETS", "bucket_name": "my-bucket" }
  ]
}
```

---

## D1 (SQL Database)

### Manage Databases

```bash
wrangler d1 create my-database
wrangler d1 create my-database --location wnam
wrangler d1 list
wrangler d1 info my-database
wrangler d1 delete my-database
```

### Execute SQL

```bash
wrangler d1 execute my-database --remote --command "SELECT * FROM users"
wrangler d1 execute my-database --remote --file ./schema.sql
wrangler d1 execute my-database --local --command "SELECT * FROM users"
```

### Migrations

```bash
wrangler d1 migrations create my-database create_users_table
wrangler d1 migrations list my-database --local
wrangler d1 migrations apply my-database --local
wrangler d1 migrations apply my-database --remote
```

### Export/Backup

```bash
wrangler d1 export my-database --remote --output backup.sql
wrangler d1 export my-database --remote --output schema.sql --no-data
```

### Config Binding

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "my-database",
      "database_id": "<DATABASE_ID>",
      "migrations_dir": "./migrations"
    }
  ]
}
```

---

## Vectorize (Vector Database)

### Manage Indexes

```bash
wrangler vectorize create my-index --dimensions 768 --metric cosine
wrangler vectorize create my-index --preset @cf/baai/bge-base-en-v1.5
wrangler vectorize list
wrangler vectorize get my-index
wrangler vectorize delete my-index
```

### Manage Vectors

```bash
wrangler vectorize insert my-index --file vectors.ndjson
wrangler vectorize query my-index --vector "[0.1, 0.2, ...]" --top-k 10
```

### Config Binding

```jsonc
{
  "vectorize": [
    { "binding": "SEARCH_INDEX", "index_name": "my-index" }
  ]
}
```

---

## Hyperdrive (Database Accelerator)

### Manage Configs

```bash
wrangler hyperdrive create my-hyperdrive \
  --connection-string "postgres://user:pass@host:5432/database"
wrangler hyperdrive list
wrangler hyperdrive get <HYPERDRIVE_ID>
wrangler hyperdrive update <HYPERDRIVE_ID> --origin-password "new-password"
wrangler hyperdrive delete <HYPERDRIVE_ID>
```

### Config Binding

```jsonc
{
  "compatibility_flags": ["nodejs_compat_v2"],
  "hyperdrive": [
    { "binding": "HYPERDRIVE", "id": "<HYPERDRIVE_ID>" }
  ]
}
```
