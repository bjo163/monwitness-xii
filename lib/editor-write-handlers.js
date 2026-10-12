import { validateDraft, validateRevision } from "./request-validation.js";
import { readJsonBody } from "./read-json-body.js";

function createWriteDependencies({ authorizeEditor, reserveEditorWrite, getSql, isWriteFrozen = async () => false }) {
  return async function prepareWrite(request, validate, validationMessage) {
    const auth = await authorizeEditor(request);
    if (!auth.ok) return { response: Response.json({ error: auth.message }, { status: auth.status }) };

    const body = await readJsonBody(request);
    if (!body.ok) return { response: Response.json({ error: body.message }, { status: body.status }) };
    if (!validate(body.value)) return { response: Response.json({ error: validationMessage }, { status: 400 }) };

    let sql;
    try {
      sql = getSql();
    } catch {
      return { response: Response.json({ error: "Database unavailable" }, { status: 503 }) };
    }
    if (!sql) return { response: Response.json({ error: "Database unavailable" }, { status: 503 }) };

    let frozen;
    try {
      frozen = await isWriteFrozen({ sql });
    } catch {
      return { response: Response.json({ error: "Write protection unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }) };
    }
    if (frozen) {
      return { response: Response.json({ error: "Editor writes are paused" }, { status: 503, headers: { "Cache-Control": "no-store" } }) };
    }

    try {
      const limit = await reserveEditorWrite({ sql, actorId: auth.user.id });
      if (!limit.allowed) {
        return { response: Response.json({ error: "Too many editor writes; retry later" }, {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
        }) };
      }
    } catch {
      return { response: Response.json({ error: "Write protection unavailable" }, { status: 503 }) };
    }

    return { auth, sql, input: body.value };
  };
}

export function createEditorDraftHandler(dependencies) {
  const prepareWrite = createWriteDependencies(dependencies);
  return async function POST(request) {
    const prepared = await prepareWrite(request, validateDraft, "Invalid draft fields");
    if (prepared.response) return prepared.response;
    const { auth, input, sql } = prepared;

    try {
      // This statement commits the draft, its first revision, and the actor
      // audit together. An actor row is created only when the draft exists.
      const rows = await sql`
        WITH control AS MATERIALIZED (
          SELECT writes_frozen FROM system.editor_write_controls
          WHERE singleton_id='global' FOR SHARE
        ), draft AS (
          INSERT INTO archive.stories(slug,title,season,synopsis,status,original_source_status)
          SELECT ${input.slug},${input.title.trim()},${typeof input.season === "string" ? input.season.slice(0,150) : null},${typeof input.synopsis === "string" ? input.synopsis.slice(0,2000) : null},'draft','source_needed'
          FROM control WHERE NOT control.writes_frozen
          RETURNING id, slug
        ), first_revision AS (
          INSERT INTO archive.story_revisions(story_id,revision,body,source_type,notes)
          SELECT id,1,${input.body},'user_original','Original draft' FROM draft
          RETURNING story_id
        ), actor AS (
          INSERT INTO identity.users(external_auth_id,display_name)
          SELECT ${auth.user.id},${auth.user.name} FROM first_revision LIMIT 1
          ON CONFLICT (external_auth_id) DO UPDATE SET
            display_name=COALESCE(EXCLUDED.display_name,identity.users.display_name)
          RETURNING id
        ), audit AS (
          INSERT INTO system.audit_events(actor_id,event,entity,entity_id,payload)
          SELECT actor.id,'story.draft.created','archive.stories',draft.id,
            jsonb_build_object('slug',draft.slug,'revision',1)
          FROM draft JOIN first_revision ON first_revision.story_id=draft.id CROSS JOIN actor
          RETURNING entity_id
        )
        SELECT draft.id, draft.slug, control.writes_frozen
        FROM control LEFT JOIN draft ON TRUE LEFT JOIN audit ON audit.entity_id=draft.id
      `;
      if (rows[0]?.writes_frozen) return Response.json({ error: "Editor writes are paused" }, { status: 503, headers: { "Cache-Control": "no-store" } });
      const story = rows[0];
      if (!story || !story.id) return Response.json({ error: "Write protection unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
      return Response.json({ id: story.id, slug: story.slug, status: "draft" }, { status: 201 });
    } catch (error) {
      if (error?.code === "23505") return Response.json({ error: "Slug exists" }, { status: 409 });
      return Response.json({ error: "Write unavailable" }, { status: 503 });
    }
  };
}

export function createEditorRevisionHandler(dependencies) {
  const prepareWrite = createWriteDependencies(dependencies);
  return async function POST(request) {
    const prepared = await prepareWrite(request, validateRevision, "Invalid revision fields");
    if (prepared.response) return prepared.response;
    const { auth, input, sql } = prepared;

    try {
      // Lock the draft before choosing a revision number. The unique index is
      // still the final integrity guard if concurrent transactions race.
      const rows = await sql`
        WITH control AS MATERIALIZED (
          SELECT writes_frozen FROM system.editor_write_controls
          WHERE singleton_id='global' FOR SHARE
        ), target AS MATERIALIZED (
          SELECT stories.id FROM archive.stories AS stories CROSS JOIN control
          WHERE stories.slug=${input.slug} AND stories.status='draft' AND NOT control.writes_frozen
          FOR UPDATE OF stories
        ), next_revision AS (
          SELECT target.id AS story_id, COALESCE(MAX(r.revision),0)+1 AS revision
          FROM target LEFT JOIN archive.story_revisions r ON r.story_id=target.id
          GROUP BY target.id
        ), inserted AS (
          INSERT INTO archive.story_revisions(story_id,revision,body,source_type,notes)
          SELECT story_id,revision,${input.body},'editorial',${typeof input.notes === "string" ? input.notes.slice(0,2000) : null} FROM next_revision
          RETURNING story_id,revision
        ), actor AS (
          INSERT INTO identity.users(external_auth_id,display_name)
          SELECT ${auth.user.id},${auth.user.name} FROM inserted LIMIT 1
          ON CONFLICT (external_auth_id) DO UPDATE SET
            display_name=COALESCE(EXCLUDED.display_name,identity.users.display_name)
          RETURNING id
        ), audit AS (
          INSERT INTO system.audit_events(actor_id,event,entity,entity_id,payload)
          SELECT actor.id,'story.revision.created','archive.story_revisions',inserted.story_id,
            jsonb_build_object('slug',${input.slug}::text,'revision',inserted.revision)
          FROM inserted CROSS JOIN actor
          RETURNING entity_id
        )
        SELECT inserted.revision, control.writes_frozen
        FROM control LEFT JOIN inserted ON TRUE LEFT JOIN audit ON audit.entity_id=inserted.story_id
      `;
      if (rows[0]?.writes_frozen) return Response.json({ error: "Editor writes are paused" }, { status: 503, headers: { "Cache-Control": "no-store" } });
      if (!rows.length) return Response.json({ error: "Write protection unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
      if (rows[0].revision == null) return Response.json({ error: "Draft not found or not editable" }, { status: 404 });
      return Response.json({ slug: input.slug, revision: rows[0].revision }, { status: 201 });
    } catch (error) {
      if (error?.code === "23505") return Response.json({ error: "Concurrent revision; retry" }, { status: 409 });
      return Response.json({ error: "Write unavailable" }, { status: 503 });
    }
  };
}
