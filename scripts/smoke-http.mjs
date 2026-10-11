// Set SMOKE_BASE_URL to a public/authorized deployment URL to run this test.
const base=process.env.SMOKE_BASE_URL;
if(!base){console.error("SMOKE_BASE_URL required");process.exit(2)}
let parsedBase;
try { parsedBase = new URL(base); } catch { console.error("SMOKE_BASE_URL must be a valid URL"); process.exit(2); }
if (!['http:', 'https:'].includes(parsedBase.protocol)) { console.error("SMOKE_BASE_URL must use HTTP or HTTPS"); process.exit(2); }
const headers=process.env.SMOKE_BYPASS_TOKEN?{"x-vercel-protection-bypass":process.env.SMOKE_BYPASS_TOKEN}:{};
async function check(path,accept){
 try {
  const r=await fetch(new URL(path,parsedBase),{headers,redirect:"manual",signal:AbortSignal.timeout(12000)});
  const text=await r.text();
  let body;
  try { body=JSON.parse(text); } catch { body=null; }
  if(!accept(r,body,text)){console.error(path+" FAILED: "+r.status+" "+text.slice(0,180));process.exitCode=1}
  else console.log(path+" PASSED: "+r.status);
 } catch (error) {
  console.error(path+" FAILED: "+(error instanceof Error?error.message:"request failed"));
  process.exitCode=1;
 }
}
await check("/api/health/db",(r,b)=>r.status===200&&b?.status==="ok"&&b?.database==="connected");
await check("/api/episodes",(r,b)=>r.status===200&&Array.isArray(b?.episodes)&&b.episodes.length===15);
await check("/api/episodes/tick-tock-on-the-clock",(r,b)=>r.status===200&&b?.episode?.slug==="tick-tock-on-the-clock");
await check("/api/editor/drafts",(r,b)=>r.status===405);
