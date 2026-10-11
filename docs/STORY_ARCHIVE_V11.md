# MoonWitness XII — Story Archive API (V11 development)

## Public read endpoints
- `GET /api/episodes`: lists published story metadata only (limit 100).
- `GET /api/episodes/:slug`: a published story only; validates URL slug.
- `/episodes/:slug`: editorial index detail page; includes a retry action on database failures and never exposes revision bodies or source materials.
- `GET /api/health/db`: read-only database connectivity probe.

Drafts, original materials, revision bodies, evidence and personal witness logs are **not** returned by public endpoints.

## Editor identity and private writes (development integration)
- Neon Managed Better Auth is enabled only on the isolated development branch; production Auth is untouched.
- `/editor/login` is sign-in only, and this app's auth proxy rejects public signup routes. Neon provider config still reports `allow_sign_up=true`; current Neon docs say restricted signups are not yet supported, so direct provider registration is not proven blocked. The project owner must verify provider-side role assignment and keep `admin` assignment owner-controlled before enabling editors.
- The server rechecks the session and admin role on every write. API calls without a session receive 401; signed-in users without the admin role receive 403; missing Auth configuration fails closed with 503.
- Writes require an exact same-origin `Origin` and reject `Sec-Fetch-Site: cross-site`.
- Both endpoints atomically map the Neon Auth subject to `identity.users` and write its user id to `system.audit_events.actor_id` with the manuscript change.
- JSON content type, bounded body size, input shape, immutable revision behavior, and database writes remain independently validated.
- Remaining: live development login and authorized write/revision/audit tests; concurrent write test against PostgreSQL; apply the tested editor rate-limit migration on an explicitly approved development target; an editing/publishing workflow; production account policy. Neon Managed Auth in this configuration does not expose MFA.

## Development branch state
Neon project proud-surf-04547637, development branch br-green-butterfly-b51kp4b1.
Nine schemas and sixteen initial tables created in development; production database is unchanged.
Run endpoint smoke checks and verify deployment before declaring integration complete.

## Editorial source, credit, and rights acceptance
The 15 current public rows are editorial indexes only; their original sources are not verified. Before marking any entry source-complete or publishing source material, record and review:
- canonical source title and stable URL or repository/archive identifier;
- source owner/creator and the provenance of the received copy;
- verification status, verifier, verification date, and a content checksum for the preserved original;
- publication permission/license and any territorial, time, or media restrictions;
- required author, publisher, translator, performer, and image/music credits;
- privacy review for witness names, contact details, and identifying metadata;
- storage location and access policy for the original, separate from the public editorial summary.

Do not infer permission from possession or from a public listing. Keep missing or uncertain fields marked `source_needed` / unverified; do not make originals, evidence, or private witness material public until rights and privacy review is recorded. **Current direct database evidence (2026-10-12, development branch `br-green-butterfly-b51kp4b1`):** 15/15 rows are `published` and `original_source_status='source_needed'`; `archive.media_assets`, `research.evidence`, and `archive.story_revisions` contain zero rows. `archive.stories` does not have dedicated `editorial_index_only` or `source_verified` columns, and those keys are not present in the inspected row metadata; do not report them as verified database flags. No manuscript/source material was read. The owner explicitly confirmed all 15 entries stay source-needed until originals, credits, and rights evidence are supplied.

## Protected draft API
- `POST /api/editor/drafts`: creates draft and first immutable revision atomically.
- `POST /api/editor/revisions`: appends a revision to an existing draft only.
- Both endpoints require an authenticated Neon Auth session with the `admin` role and a same-origin browser request.
- Do not configure or use `EDITOR_API_TOKEN`; user authorization comes from the managed session, with per-user actor attribution.
- Missing Auth configuration/provider returns 503; signed-out and non-admin requests fail closed.
- Revision inserts may conflict on concurrent writes and return 409 for retry. They never overwrite existing revision content.
- Live session-to-write, audit, and concurrency verification remains required on the isolated development database before editor writes are enabled for users.
