import Link from "next/link";
import { connection } from "next/server";
import { getDatabase } from "../../db/client";
import { stories } from "../../db/schema";
import { desc, eq } from "drizzle-orm";
import { getSourceProvenanceNotice, PUBLIC_ARCHIVE_NOTICE } from "../../lib/source-provenance.js";
import styles from "./archive.module.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EpisodesPage() {
  await connection();
  let episodes = [];
  let connectionIssue = false;
  try {
    episodes = await getDatabase().select({
      slug: stories.slug, title: stories.title, season: stories.season,
      synopsis: stories.synopsis, originalSourceStatus: stories.originalSourceStatus,
    }).from(stories).where(eq(stories.status, "published")).orderBy(desc(stories.createdAt)).limit(100);
  } catch { connectionIssue = true; }
  return <main className={styles.page}>
    <nav className={styles.topbar} aria-label="Main navigation">
      <Link href="/" className={styles.homeLink}>← MOONWITNESS XII</Link>
      <span className={styles.issueTag}>PUBLIC EDITORIAL INDEX · ISSUE 001</span>
    </nav>
    <header className={styles.hero}>
      <p className={styles.eyebrow}><span className={styles.spark} aria-hidden="true">✳</span> FIND LIGHT IN DARKNESS · STORY VAULT</p>
      <h1 className={styles.title}>THE EPISODE ARCHIVE</h1>
      <p className={styles.intro}>MoonWitness stories, The Batteries absurd comedy, witness journeys, and AETHERION. Each public entry is an editorial index; original scripts and comic pages are not reproduced here.</p>
      <aside className={styles.provenanceNotice} role="note" aria-label="Archive source and rights status">
        <span className={styles.noticeMark} aria-hidden="true">!</span>
        <div><strong>PUBLIC INDEX DOES NOT MEAN SOURCE VERIFIED</strong><p>{PUBLIC_ARCHIVE_NOTICE}</p></div>
      </aside>
    </header>
    {connectionIssue?<section className={styles.retry} role="alert"><h2>THE VAULT IS TAKING A BREATHER</h2><p>Archive database is temporarily unavailable. No private drafts are displayed.</p><Link href="/episodes" className={styles.entryLink}>TRY AGAIN ↻</Link></section>:
    <><p className={styles.countLine}><strong>{episodes.length}</strong> INDEXED EPISODES</p>
    <div className={styles.grid}>
      {episodes.map((e,i)=>{
        const provenance=getSourceProvenanceNotice(e.originalSourceStatus);
        return <article key={e.slug} className={styles.card}>
        <div className={styles.cardMeta}><span>{e.season||"MOONWITNESS"}</span><span>FILE #{String(i+1).padStart(2,"0")}</span></div>
        <h2 className={styles.cardTitle}>{e.title}</h2>
        <p lang="id" className={styles.synopsis}>{e.synopsis}</p>
        <div className={styles.status}><span className={styles.statusDot} aria-hidden="true" />{provenance.label}</div>
        <p className={styles.noticeText}>{provenance.description}</p>
        <Link href={`/episodes/${encodeURIComponent(e.slug)}`} className={styles.entryLink}>OPEN INDEX ENTRY →</Link>
      </article>;
      })}
    </div></>}
    <footer className={styles.footer}>
      <p>COMEDY ON. SHALAWAT ON. · MERCY FIRST · HUMANITY FIRST · EGO LAST</p>
      <p lang="id">Pelan-pelan ya, gue juga masih belajar. Cahaya bulan menerangi AKUUU... 🌙</p>
    </footer>
  </main>;
}
