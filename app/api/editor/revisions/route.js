import { neon } from "@neondatabase/serverless";
import { authorizeEditor } from "../../../../lib/editor-auth";
import { reserveEditorWrite } from "../../../../lib/editor-write-limit";
import { validateRevision } from "../../../../lib/request-validation";
import { readJsonBody } from "../../../../lib/read-json-body";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request){
 const auth=await authorizeEditor(request);
 if(!auth.ok)return Response.json({error:auth.message},{status:auth.status});
 if (!process.env.DATABASE_URL) return Response.json({error:"Database unavailable"},{status:503});
 const sql=neon(process.env.DATABASE_URL);
 try {
  const limit=await reserveEditorWrite({sql,actorId:auth.user.id});
  if(!limit.allowed)return Response.json({error:"Too many editor writes; retry later"},{status:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});
 } catch {
  return Response.json({error:"Write protection unavailable"},{status:503});
 }
 const body = await readJsonBody(request);
 if (!body.ok) return Response.json({error:body.message},{status:body.status});
 const input = body.value;
 if(!validateRevision(input)) return Response.json({error:"Invalid revision fields"},{status:400});
 try {
  // Lock the draft row before allocating the next revision number. The unique
  // index remains the integrity guard; a concurrent allocation can still return
  // 409 and should be retried by the caller.
  const rows=await sql`
    WITH actor AS (
      INSERT INTO identity.users(external_auth_id,display_name)
      VALUES (${auth.user.id},${auth.user.name})
      ON CONFLICT (external_auth_id) DO UPDATE SET
        display_name=COALESCE(EXCLUDED.display_name,identity.users.display_name)
      RETURNING id
    ), target AS MATERIALIZED (
      SELECT id FROM archive.stories
      WHERE slug=${input.slug} AND status='draft'
      FOR UPDATE
    ), next_revision AS (
      SELECT target.id AS story_id, COALESCE(MAX(r.revision),0)+1 AS revision
      FROM target LEFT JOIN archive.story_revisions r ON r.story_id=target.id
      GROUP BY target.id
    ), inserted AS (
      INSERT INTO archive.story_revisions(story_id,revision,body,source_type,notes)
      SELECT story_id,revision,${input.body},'editorial',${typeof input.notes==="string"?input.notes.slice(0,2000):null} FROM next_revision
      RETURNING story_id,revision
    ), audit AS (
      INSERT INTO system.audit_events(actor_id,event,entity,entity_id,payload)
      SELECT actor.id,'story.revision.created','archive.story_revisions',inserted.story_id,
        jsonb_build_object('slug',${input.slug},'revision',inserted.revision)
      FROM inserted CROSS JOIN actor RETURNING entity_id
    )
    SELECT inserted.revision FROM inserted JOIN audit ON audit.entity_id=inserted.story_id
  `;
  if(!rows.length)return Response.json({error:"Draft not found or not editable"},{status:404});
  return Response.json({slug:input.slug,revision:rows[0].revision},{status:201});
 } catch(error){
  if(error?.code==="23505")return Response.json({error:"Concurrent revision; retry"},{status:409});
  return Response.json({error:"Write unavailable"},{status:503});
 }
}
