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
let smokeChecksTotal=0;
let smokeChecksPassed=0;
async function check(path,accept,method="GET",extraHeaders={}){
 smokeChecksTotal++;
 const label=`${method==="GET"?"":`[${method}] `}${path}`;
 try {
  const r=await fetch(new URL(path,parsedBase),{method,headers:{...headers,...extraHeaders},redirect:"manual",signal:AbortSignal.timeout(12000)});
  const text=await r.text();
  let body;
  try { body=JSON.parse(text); } catch { body=null; }
  if(!accept(r,body,text)){console.error(label+" FAILED: unexpected "+r.status);process.exitCode=1}
  else {smokeChecksPassed++;console.log(label+" PASSED: "+r.status)}
 } catch (error) {
  console.error(label+" FAILED: "+(error instanceof Error?error.name:"request failed"));
  process.exitCode=1;
 }
}
function hasStrictPageCsp(response,_body,html){
 const policy=response.headers.get("content-security-policy")??"";
 const scriptPolicy=policy.match(/(?:^|;)\s*script-src\s+([^;]+)/)?.[1]??"";
 const stylePolicy=policy.match(/(?:^|;)\s*style-src\s+([^;]+)/)?.[1]??"";
 const scriptNonce=scriptPolicy.match(/'nonce-([^']+)'/)?.[1];
 const styleNonce=stylePolicy.match(/'nonce-([^']+)'/)?.[1];
 if(!scriptNonce||scriptNonce!==styleNonce||!scriptPolicy.includes("'strict-dynamic'")||/script-src[^;]*'unsafe-inline'/.test(policy)||/style-src[^;]*'unsafe-inline'/.test(policy))return false;
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
 const styleBlocks=[...html.matchAll(/<style\b([^>]*)>[\s\S]*?<\/style>/gi)];
 const nonceMatches=(attributes)=>attributes.includes(`nonce="${scriptNonce}"`)||attributes.includes(`nonce='${scriptNonce}'`);
 return scripts.length>0&&scripts.every(([,attributes])=>nonceMatches(attributes))&&styleBlocks.every(([,attributes])=>nonceMatches(attributes))&&!/<[a-z][^>]*\sstyle\s*=/i.test(html);
}
async function checkFreshPageNonce(path){
 smokeChecksTotal++;
 const label=`${path} fresh per-request CSP nonce`;
 try{
  const responses=await Promise.all([0,1].map(()=>fetch(new URL(path,parsedBase),{headers,redirect:"manual",signal:AbortSignal.timeout(12000)})));
  const pages=await Promise.all(responses.map(async response=>({response,html:await response.text()})));
  const nonces=pages.map(({response})=>response.headers.get("content-security-policy")?.match(/'nonce-([^']+)'/)?.[1]);
  const valid=pages.every(({response,html})=>response.status===200&&hasStrictPageCsp(response,null,html));
  if(!valid||!nonces[0]||!nonces[1]||nonces[0]===nonces[1]){console.error(label+" FAILED: nonce was missing, reused, or not applied");process.exitCode=1}
  else {smokeChecksPassed++;console.log(label+" PASSED")}
 }catch(error){console.error(label+" FAILED: "+(error instanceof Error?error.name:"request failed"));process.exitCode=1}
}
if(profile==="preview"){
 await check("/api/health/db",(r,b)=>r.status===200&&b?.status==="ok"&&b?.database==="connected"&&!Object.hasOwn(b,"migration"));
 await check("/api/health",(r,b)=>r.status===200&&r.headers.get("content-security-policy")===null&&b?.status==="ok"&&b?.service==="moonwitness-xii");
 await check("/api/episodes",(r,b)=>r.status===200&&Array.isArray(b?.episodes)&&b.episodes.length===15&&b?.notice===PUBLIC_ARCHIVE_NOTICE);
 await check("/episodes",(r,b,t)=>r.status===200&&t.includes("PUBLIC EDITORIAL INDEX")&&t.includes(PUBLIC_ARCHIVE_NOTICE));
 await check("/api/episodes/tick-tock-on-the-clock",(r,b)=>r.status===200&&b?.episode?.slug==="tick-tock-on-the-clock"&&b?.notice===PUBLIC_ARCHIVE_NOTICE);
 await check("/episodes/tick-tock-on-the-clock",(r,b,t)=>r.status===200&&hasStrictPageCsp(r,b,t));
 await check("/editor/login",(r,b,t)=>r.status===200&&r.headers.get("cache-control")==="no-store"&&hasStrictPageCsp(r,b,t));
 await check("/editor",(r)=>[307,308].includes(r.status)&&r.headers.get("location")==="/editor/login"&&r.headers.get("cache-control")==="no-store");
 await checkFreshPageNonce("/");
 await check("/api/auth/get-session",(r,b)=>r.status===200&&r.headers.get("cache-control")==="no-store"&&b===null);
 await check("/api/auth/token",(r,b)=>r.headers.get("cache-control")==="no-store"&&((r.status===401)||(r.status===503&&b?.error==="Authentication is not configured")));
 await check("/api/auth/sign-up/email",(r)=>r.status===404);
 await check("/api/auth/get-session",(r)=>r.status===405,"PUT");
 await check("/api/auth/get-session",(r)=>r.status===405&&r.headers.get("allow")==="GET","POST");
 await check("/api/auth/sign-in/email",(r)=>r.status===405&&r.headers.get("allow")==="POST");
 await check("/api/auth/sign-in/email",(r)=>r.status===204&&r.headers.get("allow")==="POST","OPTIONS");
 await check("/api/auth/get-session",(r)=>r.status===405&&r.headers.get("allow")==="GET","HEAD");
 await check("/api/editor/session",(r,b)=>r.status===401&&r.headers.get("cache-control")==="no-store"&&b?.authenticated===false);
 await check("/api/editor/drafts",(r)=>r.status===405);
}else{
 await check("/",(r,b,t)=>r.status===200&&r.headers.get("x-content-type-options")==="nosniff"&&r.headers.get("x-frame-options")==="DENY"&&r.headers.get("referrer-policy")==="strict-origin-when-cross-origin"&&r.headers.get("permissions-policy")==="camera=(), microphone=(), geolocation=()"&&(process.env.SMOKE_EXPECT_CSP!=="1"||hasStrictPageCsp(r,b,t)));
 await check("/team",(r,b,t)=>r.status===200&&t.includes('<html lang="en"')&&['four-lah','whalterwhite','isrockfeel','rock-soul'].every(name=>t.includes(`/characters/styles/faceless-visor/${name}--faceless-visor.webp`))&&[...t.matchAll(/lang="id"/g)].length>=6&&hasStrictPageCsp(r,b,t));
 await checkFreshPageNonce("/");
 for(const route of ["/throwing-dice","/four-books","/aetherion","/witness-log","/the-lab"]){
  await check(route,(r,b,t)=>r.status===200&&hasStrictPageCsp(r,b,t));
 }
 for(const asset of ["/characters/hero/eclipse-walker.webp","/characters/styles/faceless-visor/four-lah--faceless-visor.webp","/characters/styles/faceless-visor/whalterwhite--faceless-visor.webp","/characters/styles/faceless-visor/isrockfeel--faceless-visor.webp","/characters/styles/faceless-visor/rock-soul--faceless-visor.webp"]){
  await check(asset,(r)=>r.status===200&&r.headers.get("content-security-policy")===null&&r.headers.get("content-type")?.startsWith("image/webp"));
 }
 await check("/api/health",(r,b)=>r.status===200&&r.headers.get("content-security-policy")===null&&b?.status==="ok"&&b?.service==="moonwitness-xii");
 await check("/api/health/db",(r,b)=>(r.status===200&&b?.status==="ok"&&b?.database==="connected"&&!Object.hasOwn(b,"migration"))||(r.status===503&&b?.status==="error"&&b?.database==="unavailable"));
 await check("/api/episodes",(r,b)=>(r.status===200&&Array.isArray(b?.episodes)&&b.episodes.length===15&&b?.notice===PUBLIC_ARCHIVE_NOTICE)||(r.status===503&&b?.error==="Archive unavailable"));
 await check("/api/episodes/tick-tock-on-the-clock",(r,b)=>r.headers.get("cache-control")==="no-store"&&((r.status===200&&b?.episode?.slug==="tick-tock-on-the-clock"&&b?.notice===PUBLIC_ARCHIVE_NOTICE&&JSON.stringify(Object.keys(b.episode).sort())===JSON.stringify(["experienceType","season","slug","synopsis","title"]))||(r.status===503&&b?.error==="Archive unavailable")));
 await check("/api/episodes/INVALID%21",(r,b)=>r.status===400&&r.headers.get("cache-control")==="no-store"&&b?.error==="Invalid slug");
 await check("/episodes",(r,b,t)=>r.status===200&&t.includes("PUBLIC EDITORIAL INDEX")&&t.includes(PUBLIC_ARCHIVE_NOTICE)&&t.includes("THE CREW KEEPS WATCH.")&&t.includes("These are universe portraits, not claims that a specific character appears in an indexed story.")&&["four-lah","whalterwhite","isrockfeel","rock-soul"].every(name=>t.includes(`/characters/styles/faceless-visor/${name}--faceless-visor.webp`))&&(t.includes("THE VAULT IS TAKING A BREATHER")||t.includes("INDEXED EPISODES"))&&hasStrictPageCsp(r,b,t));
 await check("/episodes/tick-tock-on-the-clock",(r,b,t)=>r.status===200&&hasStrictPageCsp(r,b,t));
 await check("/handover",(r,b,t)=>r.status===200&&t.includes("LOCAL REVIEW • NO-GO FOR PRODUCTION")&&t.includes("129 / 129")&&t.includes("All ten prompt modules are mapped to local evidence")&&t.includes("40 / 40")&&t.includes("Release gates remaining")&&t.includes("DATABASE")&&t.includes("NOT CONNECTED")&&t.includes("REVIEW BRANCH")&&t.includes("LOCAL ONLY")&&t.includes("8 GATES OPEN")&&t.includes("EVIDENCE BOUNDARY")&&t.includes("OPEN")&&!t.includes("Preview is live")&&!t.includes("Fresh exact tracked-tree reproduction at commit 2f43d14")&&hasStrictPageCsp(r,b,t));
 await check("/editor/login",(r,b,t)=>r.status===200&&r.headers.get("cache-control")==="no-store"&&hasStrictPageCsp(r,b,t));
 await check("/editor",(r)=>[307,308].includes(r.status)&&r.headers.get("location")==="/editor/login"&&r.headers.get("cache-control")==="no-store");
 await checkFreshPageNonce("/");
 await check("/api/auth/get-session",(r,b)=>r.headers.get("cache-control")==="no-store"&&((r.status===200&&b===null)||(r.status===503&&b?.error==="Authentication is not configured")));
 await check("/api/auth/token",(r,b)=>r.headers.get("cache-control")==="no-store"&&((r.status===401)||(r.status===503&&b?.error==="Authentication is not configured")));
 await check("/api/auth/sign-up/email",(r,b)=>r.status===404&&b?.error==="Authentication route unavailable");
 await check("/api/auth/get-session",(r)=>r.status===405,"PUT");
 await check("/api/auth/get-session",(r)=>r.status===405&&r.headers.get("allow")==="GET","POST");
 await check("/api/auth/sign-in/email",(r)=>r.status===405&&r.headers.get("allow")==="POST");
 await check("/api/auth/sign-in/email",(r)=>r.status===204&&r.headers.get("allow")==="POST","OPTIONS");
 await check("/api/auth/get-session",(r)=>r.status===405&&r.headers.get("allow")==="GET","HEAD");
 await check("/api/auth/sign-in/email",(r,b)=>r.status===403&&b?.error==="Cross-origin authentication request rejected","POST");
 await check("/api/auth/sign-in/email",(r,b)=>r.status===403&&b?.error==="Cross-origin authentication request rejected","POST",{origin:"https://attacker.example"});
 await check("/api/auth/sign-out",(r,b)=>r.status===403&&b?.error==="Cross-origin authentication request rejected","POST",{origin:parsedBase.origin,"sec-fetch-site":"cross-site"});
 for(const fetchSite of ["same-site","none","unknown"]){
  await check("/api/auth/sign-in/email",(r,b)=>r.status===403&&b?.error==="Cross-origin authentication request rejected","POST",{origin:parsedBase.origin,"sec-fetch-site":fetchSite});
 }
 await check("/api/editor/session",(r,b)=>r.headers.get("cache-control")==="no-store"&&((r.status===401&&b?.authenticated===false)||(r.status===503&&b?.error==="Editor authentication is not configured")));
 await check("/api/editor/drafts",(r)=>[401,503].includes(r.status)&&r.headers.get("cache-control")==="no-store","POST");
}
console.log(`HTTP smoke checks: ${smokeChecksPassed}/${smokeChecksTotal} passed`);
