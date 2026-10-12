import Link from "next/link";
import { connection, notFound } from "next/server";
import { getDatabase } from "../../../db/client";
import { stories } from "../../../db/schema";
import { and, eq } from "drizzle-orm";
import { getSourceProvenanceNotice } from "../../../lib/source-provenance.js";
import styles from "../archive.module.css";

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
    return <main className={styles.page}>
      <p className={styles.retry} role="alert">
        <strong>THE VAULT IS TAKING A BREATHER</strong>
        <span className={styles.retryHint}>The index entry could not be loaded. No private drafts are displayed.</span>
        <Link href={`/episodes/${encodeURIComponent(slug)}`} className={styles.entryLink}>TRY AGAIN ↻</Link>
      </p>
      <Link href="/episodes" className={styles.homeLink}>← BACK TO THE ARCHIVE</Link>
    </main>;
  }
  if (!episode) notFound();
  const provenance=getSourceProvenanceNotice(episode.originalSourceStatus);

  return <main className={styles.page}>
    <nav className={styles.topbar} aria-label="Breadcrumb"><Link href="/episodes" className={styles.homeLink}>← THE EPISODE ARCHIVE</Link><span className={styles.issueTag}>EDITORIAL INDEX · {episode.experienceType.replaceAll("_", " ").toUpperCase()}</span></nav>
    <article className={styles.detail}>
      <p className={styles.eyebrow}><span className={styles.spark} aria-hidden="true">✳</span>{episode.season || "MOONWITNESS"} · INDEX ENTRY</p>
      <h1 className={styles.cardTitle}>{episode.title}</h1>
      <p lang={episode.synopsis ? "id" : "en"} className={styles.detailSynopsis}>{episode.synopsis || "No editorial synopsis is available yet."}</p>
      <aside className={styles.provenanceNotice} role="note" aria-label="Original source and rights status">
        <span className={styles.noticeMark} aria-hidden="true">!</span>
        <div><strong>{provenance.label}</strong><p>{provenance.description}</p></div>
      </aside>
      <p className={styles.noticeText}>This page is an editorial index. It does not reproduce an original script, comic page, or private witness record.</p>
      <Link href="/episodes" className={styles.entryLink}>← BACK TO ALL EPISODES</Link>
    </article>
  </main>;
}
