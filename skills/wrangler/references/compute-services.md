# Cloudflare Compute & Advanced Services CLI Reference

## Workers AI

```bash
wrangler ai models
wrangler ai finetune list
```

Config: `"ai": { "binding": "AI" }`

**Note**: Workers AI always runs remotely and incurs usage charges even in local dev.

---

## Queues

### Manage Queues

```bash
wrangler queues create my-queue
wrangler queues list
wrangler queues delete my-queue
wrangler queues consumer add my-queue my-worker
wrangler queues consumer remove my-queue my-worker
```

### Config Binding

```jsonc
{
  "queues": {
    "producers": [
      { "binding": "MY_QUEUE", "queue": "my-queue" }
    ],
    "consumers": [
      {
        "queue": "my-queue",
        "max_batch_size": 10,
        "max_batch_timeout": 30
      }
    ]
  }
}
```

---

## Containers

### Build and Push Images

```bash
wrangler containers build -t my-app:latest .
wrangler containers build -t my-app:latest . --push
wrangler containers push my-app:latest
```

### Manage Containers

```bash
wrangler containers list
wrangler containers info <CONTAINER_ID>
wrangler containers delete <CONTAINER_ID>
```

### Manage Images

```bash
wrangler containers images list
wrangler containers images delete my-app:latest
```

### Manage External Registries

```bash
wrangler containers registries list
wrangler containers registries configure <DOMAIN> --public-credential <KEY>
wrangler containers registries delete <DOMAIN>
```

---

## Workflows

### Manage Workflows

```bash
wrangler workflows list
wrangler workflows describe my-workflow
wrangler workflows trigger my-workflow
wrangler workflows trigger my-workflow --params '{"key": "value"}'
wrangler workflows delete my-workflow
```

### Manage Instances

```bash
wrangler workflows instances list my-workflow
wrangler workflows instances describe my-workflow <INSTANCE_ID>
wrangler workflows instances terminate my-workflow <INSTANCE_ID>
```

### Config Binding

```jsonc
{
  "workflows": [
    {
      "binding": "MY_WORKFLOW",
      "name": "my-workflow",
      "class_name": "MyWorkflow"
    }
  ]
}
```

---

## Pipelines

```bash
wrangler pipelines create my-pipeline --r2 my-bucket
wrangler pipelines list
wrangler pipelines show my-pipeline
wrangler pipelines update my-pipeline --batch-max-mb 100
wrangler pipelines delete my-pipeline
```

Config: `"pipelines": [{ "binding": "MY_PIPELINE", "pipeline": "my-pipeline" }]`

---

## Secrets Store

### Manage Stores

```bash
wrangler secrets-store store create my-store
wrangler secrets-store store list
wrangler secrets-store store delete <STORE_ID>
```

### Manage Secrets

```bash
wrangler secrets-store secret put <STORE_ID> my-secret
wrangler secrets-store secret list <STORE_ID>
wrangler secrets-store secret get <STORE_ID> my-secret
wrangler secrets-store secret delete <STORE_ID> my-secret
```

### Config Binding

```jsonc
{
  "secrets_store_secrets": [
    {
      "binding": "MY_SECRET",
      "store_id": "<STORE_ID>",
      "secret_name": "my-secret"
    }
  ]
}
```

---

## Pages (Frontend Deployment)

```bash
wrangler pages project create my-site
wrangler pages deploy ./dist
wrangler pages deploy ./dist --branch main
wrangler pages deployment list --project-name my-site
```
