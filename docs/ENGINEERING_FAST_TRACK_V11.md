# MoonWitness XII — V11 Fast-track engineering report

> **Historical baseline; superseded.** This short report predates the current Auth integration, editor identity allowlist, migration chain, limiter, and HTTP-smoke checks. Its statuses and limitations below describe the earlier checkpoint only. Use [HANDOVER_V11.md](./HANDOVER_V11.md), [RELEASE_GATES_V11.md](./RELEASE_GATES_V11.md), and [Issue #3](https://github.com/bjo163/monwitness-xii/issues/3) for current evidence. Do not treat this file as a current architecture or release status report.

## What is verified
- Vercel preview for dev commit a1ae3f9f: READY.
- Neon development branch br-green-butterfly-b51kp4b1: 9 domains, 16 tables, 15 public editorial indices, 0 drafts/revisions/audits (read-only verified).
- Two editor endpoints implement API-token deny-by-default; one-statement audit+write; revision inserts append rather than overwrite.
- Shared payload validation was wired into both editor endpoints, with repository unit tests.

## What is not verified
- Successful HTTP response from preview, because request networking is blocked in the current runtime (Vercel deployment protection may apply).
- End-to-end writes and audit concurrency, because editor token is intentionally not configured.
- CI workflow run status cannot be verified from the available per-commit workflow listing.
- Authentic sessions, RBAC, migration artifacts, backup/restore, production promotion.

## Repeatable checks
`npm test` — unit tests
`npm run build` — build
`npm run db:verify` — read-only schema inventory (requires DATABASE_URL)
`SMOKE_BASE_URL=<authorized preview> npm run smoke:http` — real HTTP endpoint checks
Secrets must come from the environment and never enter Git.

## Release policy
Keep branch dev; production DB untouched; only mark API production-ready once authenticated E2E and migrations/rollback pass.
