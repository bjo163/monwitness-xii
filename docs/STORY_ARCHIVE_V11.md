# MoonWitness XII — Story Archive API (V11 development)

## Public read endpoints
- `GET /api/episodes`: lists published story metadata only (limit 100).
- `GET /api/episodes/:slug`: a published story only; validates URL slug.
- `GET /api/health/db`: read-only database connectivity probe.

Drafts, original materials, revision bodies, evidence and personal witness logs are **not** returned by public endpoints.

## Editor identity and private writes (development integration)
- Neon Managed Better Auth is enabled only on the isolated development branch; production Auth is untouched.
- `/editor/login` is sign-in only. Public account creation is disabled; the project owner must provision and assign the `admin` role to an editor account in Neon Auth.
- The server rechecks the session and admin role on every write. API calls without a session receive 401; signed-in users without the admin role receive 403; missing Auth configuration fails closed with 503.
- Writes require an exact same-origin `Origin` and reject `Sec-Fetch-Site: cross-site`.
- Both endpoints atomically map the Neon Auth subject to `identity.users` and write its user id to `system.audit_events.actor_id` with the manuscript change.
- JSON content type, bounded body size, input shape, immutable revision behavior, and database writes remain independently validated.
- Remaining: live development login and authorized write/revision/audit tests; concurrent write test; rate limiting; an editing/publishing workflow; production account policy. Neon Managed Auth in this configuration does not expose MFA.

## Development branch state
Neon project proud-surf-04547637, development branch br-green-butterfly-b51kp4b1.
Nine schemas and sixteen initial tables created in development; production database is unchanged.
Run endpoint smoke checks and verify deployment before declaring integration complete.

## Protected draft API
- `POST /api/editor/drafts`: creates draft and first immutable revision atomically.
- `POST /api/editor/revisions`: appends a revision to an existing draft only.
- Both endpoints require an authenticated Neon Auth session with the `admin` role and a same-origin browser request.
- Do not configure or use `EDITOR_API_TOKEN`; user authorization comes from the managed session, with per-user actor attribution.
- Missing Auth configuration/provider returns 503; signed-out and non-admin requests fail closed.
- Revision inserts may conflict on concurrent writes and return 409 for retry. They never overwrite existing revision content.
- Live session-to-write, audit, and concurrency verification remains required on the isolated development database before editor writes are enabled for users.
