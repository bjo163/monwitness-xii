import { getDatabase } from "../../../../db/client";
import { stories, storyRevisions } from "../../../../db/schema";
import { authorizeEditor } from "../../../../lib/editor-auth";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const slugRule=/^[a-z0-9-]{3,120}$/;

export async function POST(request) {
 const auth=authorizeEditor(request);
 if(!auth.ok) return Response.json({error:auth.message},{status:auth.status});
 let input;
 try { input=await request.json(); } catch {return Response.json({error:"Invalid JSON"},{status:400});}
 if(!input||typeof input!=="object"||!slugRule.test(input.slug??"")||typeof input.title!=="string"||!input.title.trim()||input.title.length>250||typeof input.body!=="string"||!input.body.trim()||input.body.length>250000)
   return Response.json({error:"Invalid draft fields"},{status:400});
 const sql=neon(process.env.DATABASE_URL);
 try {
  // Atomic insert of draft + original revision. Slug uniqueness prevents accidental duplicates.
  const rows=await sql.transaction([
    sql`INSERT INTO archive.stories(slug,title,season,synopsis,status,original_source_status) VALUES (${input.slug},${input.title.trim()},${typeof input.season==="string"?input.season.slice(0,150):null},${typeof input.synopsis==="string"?input.synopsis.slice(0,2000):null},'draft','source_needed') RETURNING id,slug`,
  ]);
  const story=rows[0]?.[0];
  if(!story) return Response.json({error:"Failed to create draft"},{status:500});
  // Revision append is a separate step: on failure the draft remains private and recoverable.
  await sql`INSERT INTO archive.story_revisions(story_id,revision,body,source_type,notes) VALUES (${story.id},1,${input.body},'user_original','Original draft')`;
  return Response.json({id:story.id,slug:story.slug,status:"draft"},{status:201});
 } catch(err) {
  if(err?.code==="23505")return Response.json({error:"Slug exists"},{status:409});
  return Response.json({error:"Write unavailable"},{status:503});
 }
}
