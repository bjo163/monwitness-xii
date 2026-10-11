import Link from "next/link";
import { connection, notFound } from "next/server";
import { getDatabase } from "../../../db/client";
import { stories } from "../../../db/schema";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

export default async function EpisodeIndexEntry({ params }) {
  await connection();
  const { slug } = await params;
  if (!slug || !/^[a-z0-9-]{1,120}$/.test(slug)) notFound();

  let episode;
  try {
    const [row] = await getDatabase().select({
      slug: stories.slug,
      title: stories.title,
      season: stories.season,
      synopsis: stories.synopsis,
      experienceType: stories.experienceType,
      originalSourceStatus: stories.originalSourceStatus,
    }).from(stories)
      .where(and(eq(stories.slug, slug), eq(stories.status, "published")))
      .limit(1);
    episode = row;
  } catch {
    return <main style={{minHeight:"100vh",padding:"40px max(20px,5vw)",background:"#101529",color:"#f8fbff",fontFamily:"system-ui"}}>
      <p role="alert" style={{padding:24,background:"#382535",maxWidth:700}}>
        <strong>THE VAULT IS TAKING A BREATHER</strong>
        <span style={{display:"block",margin:"12px 0"}}>The index entry could not be loaded. No private drafts are displayed.</span>
        <Link href={`/episodes/${encodeURIComponent(slug)}`} style={{color:"#70edee",fontWeight:800}}>TRY AGAIN ↻</Link>
      </p>
      <Link href="/episodes" style={{color:"#70edee"}}>← BACK TO THE ARCHIVE</Link>
    </main>;
  }
  if (!episode) notFound();

  return <main style={{minHeight:"100vh",padding:"40px max(20px,5vw)",background:"#101529",color:"#f8fbff",fontFamily:"system-ui"}}>
    <nav aria-label="Breadcrumb"><Link href="/episodes" style={{color:"#70edee"}}>← THE EPISODE ARCHIVE</Link></nav>
    <article style={{maxWidth:850,margin:"60px auto",padding:"clamp(24px,6vw,64px)",border:"2px solid #5de8ef",background:"#202b43",boxShadow:"8px 8px #ff79bb"}}>
      <p style={{color:"#ffe05c",fontWeight:800}}>{episode.season || "MOONWITNESS"} • EDITORIAL INDEX</p>
      <h1 style={{fontSize:"clamp(38px,7vw,76px)",lineHeight:1.05,margin:"16px 0"}}>{episode.title}</h1>
      <p style={{color:"#a0b9ca",fontWeight:800}}>{episode.experienceType.replaceAll("_", " ").toUpperCase()}</p>
      <p style={{fontSize:18,lineHeight:1.8}}>{episode.synopsis || "No editorial synopsis is available yet."}</p>
      <p style={{padding:16,background:"#151b2d",lineHeight:1.7}}><strong>ORIGINAL SOURCE: {episode.originalSourceStatus.replaceAll("_", " ").toUpperCase()}</strong><br/>This page contains an editorial index only. It does not reproduce an original script or comic page.</p>
      <Link href="/episodes" style={{display:"inline-block",marginTop:18,color:"#70edee",fontWeight:800}}>← BACK TO ALL EPISODES</Link>
    </article>
  </main>;
}
