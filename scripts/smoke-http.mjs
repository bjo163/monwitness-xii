// Preview checks require SMOKE_BASE_URL and optional deployment-protection bypass.
// Local checks default to localhost and never require a database credential.
import { PUBLIC_ARCHIVE_NOTICE } from "../lib/source-provenance.js";

const profile=process.env.SMOKE_PROFILE??"preview";
if(!["preview","local"].includes(profile)){console.error("SMOKE_PROFILE must be preview or local");process.exit(2)}
const base=process.env.SMOKE_BASE_URL??(profile==="local"?"http://localhost:3000":undefined);
if(!base){console.error("SMOKE_BASE_URL required");process.exit(2)}
let parsedBase;
try { parsedBase = new URL(base); } catch { console.error("SMOKE_BASE_URL must be a valid URL"); process.exit(2); }
if (!['http:', 'https:'].includes(parsedBase.protocol)) { console.error("SMOKE_BASE_URL must use HTTP or HTTPS"); process.exit(2); }
if(parsedBase.username||parsedBase.password){console.error("SMOKE_BASE_URL must not contain credentials");process.exit(2)}
if(profile==="local"&&!['localhost','127.0.0.1','[::1]'].includes(parsedBase.hostname)){console.error("Local smoke profile only permits loopback hosts");process.exit(2)}
const headers=profile==="preview"&&process.env.SMOKE_BYPASS_TOKEN?{"x-vercel-protection-bypass":process.env.SMOKE_BYPASS_TOKEN}:{};
async function check(path,accept,method="GET"){
 const label=`${method==="GET"?"":`[${method}] `}${path}`;
 try {
  const r=await fetch(new URL(path,parsedBase),{method,headers,redirect:"manual",signal:AbortSignal.timeout(12000)});
  const text=await r.text();
  let body;
  try { body=JSON.parse(text); } catch { body=null; }
  if(!accept(r,body,text)){console.error(label+" FAILED: unexpected "+r.status);process.exitCode=1}
  else console.log(label+" PASSED: "+r.status);
 } catch (error) {
  console.error(label+" FAILED: "+(error instanceof Error?error.name:"request failed"));
  process.exitCode=1;
 }
}
if(profile==="preview"){
 await check("/api/health/db",(r,b)=>r.status===200&&b?.status==="ok"&&b?.database==="connected");
 await check("/api/health",(r,b)=>r.status===200&&b?.status==="ok"&&b?.service==="moonwitness-xii");
 await check("/api/episodes",(r,b)=>r.status===200&&Array.isArray(b?.episodes)&&b.episodes.length===15&&b?.notice===PUBLIC_ARCHIVE_NOTICE);
 await check("/episodes",(r,b,t)=>r.status===200&&t.includes("PUBLIC EDITORIAL INDEX")&&t.includes(PUBLIC_ARCHIVE_NOTICE));
 await check("/api/episodes/tick-tock-on-the-clock",(r,b)=>r.status===200&&b?.episode?.slug==="tick-tock-on-the-clock"&&b?.notice===PUBLIC_ARCHIVE_NOTICE);
 await check("/editor/login",(r)=>r.status===200&&r.headers.get("cache-control")==="no-store");
 await check("/api/auth/get-session",(r,b)=>r.status===200&&r.headers.get("cache-control")==="no-store"&&b===null);
 await check("/api/auth/sign-up/email",(r)=>r.status===404);
 await check("/api/auth/get-session",(r)=>r.status===405,"PUT");
 await check("/api/editor/session",(r,b)=>r.status===401&&r.headers.get("cache-control")==="no-store"&&b?.authenticated===false);
 await check("/api/editor/drafts",(r)=>r.status===405);
}else{
 await check("/",(r)=>r.status===200&&r.headers.get("x-content-type-options")==="nosniff"&&r.headers.get("x-frame-options")==="DENY"&&r.headers.get("referrer-policy")==="strict-origin-when-cross-origin"&&r.headers.get("permissions-policy")==="camera=(), microphone=(), geolocation=()"&&(process.env.SMOKE_EXPECT_CSP!=="1"||Boolean(r.headers.get("content-security-policy"))));
 await check("/team",(r,b,t)=>r.status===200&&t.includes('<html lang="en"')&&['four-lah','whalterwhite','isrockfeel','rock-soul'].every(name=>t.includes(`/characters/crew/${name}.webp`))&&[...t.matchAll(/lang="id"/g)].length>=6);
 for(const route of ["/throwing-dice","/four-books","/aetherion","/witness-log","/the-lab"]){
  await check(route,(r)=>r.status===200);
 }
 for(const asset of ["/characters/hero/eclipse-walker.webp","/characters/crew/four-lah.webp","/characters/crew/whalterwhite.webp","/characters/crew/isrockfeel.webp","/characters/crew/rock-soul.webp"]){
  await check(asset,(r)=>r.status===200&&r.headers.get("content-type")?.startsWith("image/webp"));
 }
 await check("/api/health",(r,b)=>r.status===200&&b?.status==="ok"&&b?.service==="moonwitness-xii");
 await check("/api/health/db",(r,b)=>(r.status===200&&b?.status==="ok"&&b?.database==="connected")||(r.status===503&&b?.status==="error"&&b?.database==="unavailable"));
 await check("/api/episodes",(r,b)=>(r.status===200&&Array.isArray(b?.episodes)&&b.episodes.length===15&&b?.notice===PUBLIC_ARCHIVE_NOTICE)||(r.status===503&&b?.error==="Archive unavailable"));
 await check("/episodes",(r,b,t)=>r.status===200&&t.includes("PUBLIC EDITORIAL INDEX")&&t.includes(PUBLIC_ARCHIVE_NOTICE)&&(t.includes("THE VAULT IS TAKING A BREATHER")||t.includes("INDEXED EPISODES")));
 await check("/editor/login",(r)=>r.status===200&&r.headers.get("cache-control")==="no-store");
 await check("/api/auth/get-session",(r,b)=>r.headers.get("cache-control")==="no-store"&&((r.status===200&&b===null)||(r.status===503&&b?.error==="Authentication is not configured")));
 await check("/api/auth/sign-up/email",(r,b)=>r.status===404&&b?.error==="Authentication route unavailable");
 await check("/api/auth/get-session",(r)=>r.status===405,"PUT");
 await check("/api/editor/session",(r,b)=>r.headers.get("cache-control")==="no-store"&&((r.status===401&&b?.authenticated===false)||(r.status===503&&b?.error==="Editor authentication is not configured")));
 await check("/api/editor/drafts",(r)=>r.status===405);
}
