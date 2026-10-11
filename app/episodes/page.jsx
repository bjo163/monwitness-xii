import Link from "next/link";
import { getDatabase } from "../../db/client";
import { stories } from "../../db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EpisodesPage() {
  let episodes = [];
  let connectionIssue = false;
  try {
    episodes = await getDatabase().select({
      slug: stories.slug, title: stories.title, season: stories.season,
      synopsis: stories.synopsis, originalSourceStatus: stories.originalSourceStatus,
    }).from(stories).where(eq(stories.status, "published")).orderBy(desc(stories.createdAt)).limit(100);
  } catch { connectionIssue = true; }
  return <main style={{minHeight:"100vh",padding:"40px max(20px,5vw)",background:"#101529",color:"#f8fbff",fontFamily:"system-ui"}}>
    <nav><Link href="/" style={{color:"#70edee"}}>← MOONWITNESS XII HOME</Link></nav>
    <header style={{padding:"45px 0",borderBottom:"3px solid #53eaf2"}}>
      <p style={{color:"#ffdc58",fontWeight:800}}>FIND LIGHT IN DARKNESS • STORY VAULT</p>
      <h1 style={{fontSize:"clamp(38px,6vw,76px)",margin:"12px 0"}}>THE EPISODE ARCHIVE</h1>
      <p style={{maxWidth:700}}>MoonWitness stories, The Batteries absurd comedy, witness journeys and AETHERION. Each entry below is an editorial index; full original scripts and comic pages are still being recovered.</p>
    </header>
    {connectionIssue?<section style={{padding:25,background:"#382535",marginTop:28}}>Archive database is temporarily unavailable. No private drafts are displayed.</section>:
    <><p style={{color:"#c6ff5b",marginTop:26}}>{episodes.length} INDEXED EPISODES • DEVELOPMENT VAULT</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:18,marginTop:22}}>
      {episodes.map((e,i)=><article key={e.slug} style={{border:"2px solid #5de8ef",background:"#202b43",padding:20,boxShadow:"5px 5px #ff79bb"}}>
        <div style={{fontSize:13,color:"#ffe05c",fontWeight:800}}>{e.season||"MOONWITNESS"} • #{i+1}</div>
        <h2 style={{fontSize:24,lineHeight:1.2}}>{e.title}</h2>
        <p style={{lineHeight:1.6}}>{e.synopsis}</p>
        <small style={{color:"#a0b9ca"}}>ORIGINAL SOURCE: {e.originalSourceStatus?.replaceAll("_"," ").toUpperCase()}</small>
      </article>)}
    </div></>}
    <footer style={{padding:"50px 0",marginTop:45,borderTop:"2px solid #444",textAlign:"center"}}>
      <h2 style={{color:"#ffe05c"}}>COMEDY ON. SHALAWAT ON.</h2>
      <p>Pelan-pelan ya, gue juga masih belajar. • Mercy First. Humanity First. Ego Last.</p>
      <p style={{fontSize:28,color:"#6aeaf0"}}>Cahaya bulan menerangi AKUUU... 🌙</p>
    </footer>
  </main>;
}
