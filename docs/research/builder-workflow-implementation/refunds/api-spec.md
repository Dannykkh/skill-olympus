# Refund API — current contract

Repair the failing API tests and their causes according to this contract. This is an
API-only local project. No browser or dependency installation is needed. The old test
suite may include outdated expectations; use the current contract to decide what to edit.

POST /orders/:orderId/refunds, JSON `{ "amountCents": 500 }` plus Idempotency-Key header.

- Fixture bearer tokens: support-a / support-b are support staff in tenants a/b;
  customer-a is an ordinary customer in tenant a.
- Missing/unknown authentication: 401 `{ "error": "unauthorized" }`.
- Only support staff may issue refunds. Other authenticated roles: 403 `{ "error": "forbidden" }`.
- Missing or other-tenant orders: 404 `{ "error": "not_found" }`, without order details.
- amountCents must be a positive safe integer JSON number, not a numeric string or boolean.
  Invalid amounts: 400 `{ "error": "invalid_amount" }`.
- Missing/blank idempotency key: 400 `{ "error": "missing_key" }`.
- Fixed test clock: 2026-10-22T00:00:00Z. More than 30 days after purchase:
  410 `{ "error": "refund_expired" }`.
- Amount greater than remaining paid balance: 409 `{ "error": "amount_exceeded" }`.
- Successful refund: 201 `{ "data": { "id": "...", "orderId": "...", "amountCents": 500 } }`.
  Increase refundedCents and create exactly one refund, audit entry, and event.
- Same tenant/order/key and identical amount: replay original 201 response with no additional effects,
  even if the first refund consumed the remaining balance. Same key with a different valid amount: 409
  `{ "error": "idempotency_conflict" }`, with no additional effects.
- Every rejected request leaves orders, refunds, audit, events, and idempotency keys unchanged.

Runtime: Node.js built-ins. `node --test api.test.mjs` runs the existing tests.
`createService()` in `service.mjs` returns `{ server, snapshot }`; keep that interface.
snapshot() exposes a copy of all mutable state for tests. Bind to 127.0.0.1 and ephemeral ports.
