import { neon } from "@neondatabase/serverless";
const uri=process.env.DATABASE_URL;
if(!uri){console.error("DATABASE_URL missing; verification not run");process.exit(2)}
const db=neon(uri);
const schemas=["identity","archive","scripture","research","intelligence","characters","aetherion","cab","system"];
const expected={"identity.users":1,"archive.stories":1,"archive.story_revisions":1,"archive.media_assets":1,"scripture.references":1,"research.evidence":1,"intelligence.analyses":1,"characters.personas":1,"aetherion.realms":1,"aetherion.levels":1,"aetherion.player_progress":1,"cab.projects":1,"cab.missions":1,"cab.tasks":1,"cab.decisions":1,"system.audit_events":1};
const rows=await db`SELECT table_schema,table_name FROM information_schema.tables
WHERE table_schema IN ('identity','archive','scripture','research','intelligence','characters','aetherion','cab','system')`;
const existing=new Set(rows.map(x=>x.table_schema+"."+x.table_name));
const missing=Object.keys(expected).filter(x=>!existing.has(x));
const story=await db`SELECT count(*)::int AS total, count(*) FILTER (WHERE status='draft')::int AS drafts FROM archive.stories`;
const result={schemas:schemas.length,expectedTables:Object.keys(expected).length,actualTables:existing.size,missing,stories:story[0].total,drafts:story[0].drafts};
console.log(JSON.stringify(result,null,2));
if(missing.length)process.exit(1);
