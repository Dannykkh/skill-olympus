# Orders API — approved change

The requested change is the default GET /orders page size from 20 to 30.
Update the existing code and regression tests. The API shape, validation rules,
authentication, tenant isolation, ordering, explicit limits, and data must remain the same.
This local change is approved. No production service or external account is involved.

- Authorization: `Bearer staff-a` / `Bearer staff-b` are local fixture credentials for tenants a/b.
- Missing/unknown credentials: 401 with `{ "error": "unauthorized" }`.
- Absent limit: 30. Explicit limit: decimal integers 1–100 without leading zeros.
- Invalid limit: 400 with `{ "error": "invalid_limit" }`; do not silently clamp.
- Success: `{ "data": [...], "page": { "limit": number, "total": number } }`.
- Only the authenticated tenant's rows, in ascending ID order. Total counts that tenant's rows.
- Read requests do not change stored orders.

Runtime: Node.js built-ins, no install required. Run `node --test api.test.mjs`.
`createService()` in `service.mjs` returns `{ server, snapshot }`; keep that interface.
Bind the server to 127.0.0.1 with an ephemeral port in tests. No UI/browser work is requested.
