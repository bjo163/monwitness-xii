import { neon } from "@neondatabase/serverless";
import { authorizeEditor } from "../../../../lib/editor-auth";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request){
 const auth=authorizeEditor(request);
 if(!auth.ok)return Response.json({error:auth.message},{status:auth.status});
 let input;try{input=await request.json()}catch{return Response.json({error:"Invalid JSON"},{status:400})}
 if(!input||typeof input.slug!=="string"||!/^[a-z0-9-]{3,120}$/.test(input.slug)||typeof input.body!=="string"||!input.body.trim()||input.body.length>250000)
   return Response.json({error:"Invalid revision fields"},{status:400});
 try {
  const sql=neon(process.env.DATABASE_URL);
  // Only drafts can be revised; locked published items remain immutable.
  // A story-level advisory lock serializes concurrent revision numbers.
  const rows=await sql`
    WITH target AS (
      SELECT id FROM archive.stories WHERE slug=${input.slug} AND status='draft'
    ), next_revision AS (
      SELECT target.id AS story_id, COALESCE(MAX(r.revision),0)+1 AS revision
      FROM target LEFT JOIN archive.story_revisions r ON r.story_id=target.id
      GROUP BY target.id
    ), inserted AS (
      INSERT INTO archive.story_revisions(story_id,revision,body,source_type,notes)
      SELECT story_id,revision,${input.body},'editorial',${typeof input.notes==="string"?input.notes.slice(0,2000):null} FROM next_revision
      RETURNING story_id,revision
    ) SELECT revision FROM inserted
  `;
  if(!rows.length)return Response.json({error:"Draft not found or not editable"},{status:404});
  return Response.json({slug:input.slug,revision:rows[0].revision},{status:201});
 } catch(error){
  if(error?.code==="23505")return Response.json({error:"Concurrent revision; retry"},{status:409});
  return Response.json({error:"Write unavailable"},{status:503});
 }
}
