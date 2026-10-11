import { authorizeEditor } from "../../../../lib/editor-auth";
import { validateDraft } from "../../../../lib/request-validation";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const slugRule=/^[a-z0-9-]{3,120}$/;

export async function POST(request) {
 const auth=authorizeEditor(request);
 if(!auth.ok) return Response.json({error:auth.message},{status:auth.status});
 let input;
 try { input=await request.json(); } catch {return Response.json({error:"Invalid JSON"},{status:400});}
 if(!validateDraft(input)) return Response.json({error:"Invalid draft fields"},{status:400});
 const sql=neon(process.env.DATABASE_URL);
 try {
  // One SQL statement ensures the draft and first revision are committed atomically.
  const rows=await sql`
    WITH draft AS (
      INSERT INTO archive.stories(slug,title,season,synopsis,status,original_source_status)
      VALUES (${input.slug},${input.title.trim()},${typeof input.season==="string"?input.season.slice(0,150):null},${typeof input.synopsis==="string"?input.synopsis.slice(0,2000):null},'draft','source_needed')
      RETURNING id, slug
    ), first_revision AS (
      INSERT INTO archive.story_revisions(story_id,revision,body,source_type,notes)
      SELECT id,1,${input.body},'user_original','Original draft' FROM draft
      RETURNING story_id
    )
    , audit AS (
      INSERT INTO system.audit_events(event,entity,entity_id,payload)
      SELECT 'story.draft.created','archive.stories',draft.id,
        jsonb_build_object('slug',draft.slug,'revision',1)
      FROM draft JOIN first_revision ON first_revision.story_id=draft.id
      RETURNING entity_id
    )
    SELECT draft.id, draft.slug FROM draft JOIN audit ON audit.entity_id=draft.id
  `;
  const story=rows[0];
  if(!story) return Response.json({error:"Failed to create draft"},{status:500});
  return Response.json({id:story.id,slug:story.slug,status:"draft"},{status:201});
 } catch(err) {
  if(err?.code==="23505")return Response.json({error:"Slug exists"},{status:409});
  return Response.json({error:"Write unavailable"},{status:503});
 }
}
