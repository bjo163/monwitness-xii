# MoonWitness XII — Story Archive API (V11 development)

## Public read endpoints
- `GET /api/episodes`: lists published story metadata only (limit 100).
- `GET /api/episodes/:slug`: a published story only; validates URL slug.
- `GET /api/health/db`: read-only database connectivity probe.

Drafts, original materials, revision bodies, evidence and personal witness logs are **not** returned by public endpoints.

## Private write design (not enabled yet)
Do not expose a public POST/PATCH endpoint without a real authentication system.
Planned operations: authenticated create draft, save immutable revisions in a transaction, review/approve, publish.
Security: RBAC, server-side authorization, audit events, CSRF/origin protections, rate limits, input validation and idempotency.

## Development branch state
Neon project proud-surf-04547637, development branch br-green-butterfly-b51kp4b1.
Nine schemas and sixteen initial tables created in development; production database is unchanged.
Run endpoint smoke checks and verify deployment before declaring integration complete.

## Fast-track protected draft API (scaffold)
- `POST /api/editor/drafts`: creates draft and first immutable revision atomically.
- `POST /api/editor/revisions`: appends a revision to an existing draft only.
- Both endpoints require `Authorization: Bearer <EDITOR_API_TOKEN>` from a trusted server client.
- If `EDITOR_API_TOKEN` is absent (current default), both return HTTP 503. No public writes.
- Browser-origin token requests are rejected. This is a **temporary server-to-server gate**, not a finished user login or full RBAC system.
- No token is embedded in GitHub. Avoid setting it until a scoped editor/admin auth plan is reviewed.
- Revision inserts may conflict on concurrent writes and return 409 for retry. They never overwrite existing revision content.
- Planned: actual editor sessions, role checks, audit on every write, rate limiting and publication workflow.
