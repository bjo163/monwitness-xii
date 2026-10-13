# MoonWitness XII — Story Archive API (V11 development)

## Public read endpoints
- `GET /api/episodes`: lists published story metadata only (limit 100) and includes a static provenance notice in the response envelope.
- `GET /api/episodes/:slug`: a published story only; validates URL slug and includes the same provenance notice.
- `/episodes/:slug`: editorial index detail page; includes a retry action on database failures and never exposes revision bodies or source materials.
- `GET /api/health/db`: read-only database connectivity probe.

Drafts, original materials, revision bodies, evidence and personal witness logs are **not** returned by public endpoints. A row must be `published` and have `public_index_approved=true` to appear in a public list or detail route. Migration `0005_public_index_approval` adds that field with a false default plus reviewer, timestamp and defined-use fields; a database check rejects approval unless the source is `source_verified` and all approval details are present. The reviewer must have checked source identity, credits, privacy, and permission for the exact listed metadata use. A source-status label by itself is not permission. Public query helpers select only the five fields (`slug`, `title`, `season`, `synopsis`, `experienceType`) and bound the list at 100; response builders apply the same field projection again. PGlite integration coverage executes the query and the actual detail-route handler with an approved synthetic entry, an unapproved `source_needed` published entry, a private draft, manuscript revision, source evidence, media and private metadata. The unapproved row is omitted from lists and returns 404 at detail; an approved row returns only the five editorial fields. All success and error responses set `Cache-Control: no-store`. Local production HTTP smoke checks the detail route's generic 503/no-store without DB and malformed-slug 400. Connected Neon HTTP success remains unverified; the isolated PGlite fixture does not prove remote behavior or rights clearance for real content.

## Editor identity and private writes (development integration)
- Neon Managed Better Auth is enabled only on the isolated development branch; production Auth is untouched.
- `/editor/login` is sign-in only, and this app's auth proxy rejects public signup routes. Neon provider config still reports `allow_sign_up=true`; current provider-policy evidence and official docs are summarized in the [release gates](RELEASE_GATES_V11.md#security-and-editor). Direct provider registration is not proven blocked. The project owner must verify provider-side role assignment and keep `admin` assignment owner-controlled before enabling editors.
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

Use the [V11 provenance intake register](./ARCHIVE_PROVENANCE_INTAKE_V11.md) to track each of the 15 records without placing manuscripts or private evidence in this repository. It is an empty intake template, not proof of a rights review; all entries remain `source_needed` until an authorized reviewer records a decision.

Do not infer permission from possession or from a public listing. Keep missing or uncertain fields marked `source_needed` / unverified; do not make originals, evidence, or private witness material public until rights and privacy review is recorded. **Current direct database evidence (2026-10-12, development branch `br-green-butterfly-b51kp4b1`):** 15/15 rows are `published` and `original_source_status='source_needed'`; `archive.media_assets`, `research.evidence`, and `archive.story_revisions` contain zero rows. At that read-only checkpoint the table had no dedicated public-index approval columns; this local checkout now defines those fields in migration `0005`, which is not applied to Neon. No manuscript/source material was read. The owner explicitly confirmed all 15 entries stay source-needed until originals, credits, and rights evidence are supplied. Therefore the approval flag is unset for existing stories, and no source-needed row is served by the updated local query.

### Explicit approval workflow boundary

There is no application endpoint to grant public-index approval. Do not set `public_index_approved` through an ad hoc editor request or routine migration. A future authorization must be owner-approved, tied to the exact entry and defined use in the intake register, performed through a reviewed and audited process, and independently checked before it can make the row public. The migration's default is false so existing and newly inserted entries remain excluded. The local database constraint enforces complete recorded fields, not the truth of the evidence; human rights/privacy review and its audit trail remain required.

## Protected draft API
- `POST /api/editor/drafts`: creates draft and first immutable revision atomically.
- `POST /api/editor/revisions`: appends a revision to an existing draft only.
- Both endpoints require an authenticated Neon Auth session with the `admin` role and a same-origin browser request.
- Do not configure or use `EDITOR_API_TOKEN`; user authorization comes from the managed session, with per-user actor attribution.
- Missing Auth configuration/provider returns 503; signed-out and non-admin requests fail closed.
- Revision inserts may conflict on concurrent writes and return 409 for retry. They never overwrite existing revision content.
- Live session-to-write, audit, and concurrency verification remains required on the isolated development database before editor writes are enabled for users.
