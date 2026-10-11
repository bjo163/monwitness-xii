// Set SMOKE_BASE_URL to a public/authorized deployment URL to run this test.
const base=process.env.SMOKE_BASE_URL;
if(!base){console.error("SMOKE_BASE_URL required");process.exit(2)}
const headers=process.env.SMOKE_BYPASS_TOKEN?{"x-vercel-protection-bypass":process.env.SMOKE_BYPASS_TOKEN}:{};
async function check(path,accept){
 const r=await fetch(new URL(path,base),{headers,redirect:"manual",signal:AbortSignal.timeout(12000)});
 const text=await r.text();
 if(!accept(r,text)){console.error(path+" FAILED: "+r.status+" "+text.slice(0,180));process.exitCode=1}
 else console.log(path+" PASSED: "+r.status);
}
await check("/api/health/db",(r,s)=>r.status===200&&s.includes('"connected"'));
await check("/api/episodes",(r,s)=>r.status===200&&Array.isArray(JSON.parse(s).episodes));
await check("/api/episodes/tick-tock-on-the-clock",(r,s)=>r.status===200&&s.includes('"episode"'));
await check("/api/editor/drafts",(r,s)=>r.status===405); // POST only
