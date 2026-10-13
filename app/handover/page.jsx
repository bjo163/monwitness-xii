import Link from "next/link";
import styles from "./handover.module.css";

export const metadata = { title: "MoonWitness XII — Project Status" };

const checks = [
  { value: "134 / 134", label: "automated tests", detail: "Revalidated locally · CI Node 22.23.3", tone: "pink" },
  { value: "40 / 40", label: "baseline HTTP smoke", detail: "Earlier run · freshness follow-up below", tone: "cyan" },
  { value: "0", label: "audit findings", detail: "Current checkout · full dependency audit", tone: "lime" },
  { value: "PASS", label: "migration replay", detail: "Current checkout · db:check", tone: "gold" },
];

const verified = [
  "Every HTML page receives a fresh script CSP nonce; smoke checks nonce rotation and every script tag.",
  "Script and style policies use per-request nonces; the old unsafe-inline CSP and inline style attributes have been removed.",
  "Editor writes require a verified email, an Auth admin role, the exact owner allowlist, same-origin requests, fresh provider session checks, and actor-attributed audit SQL. Sign-in/sign-out POSTs require a same-origin Origin and accept only same-origin Fetch Metadata when present; draft and revision writes share a database quota, and every handler response is no-store.",
  "Public Archive returns its five editorial fields only after per-entry, defined-use approval; source-needed stories stay hidden.",
  "Schema verification detects untracked RLS, CHECK, policy, and trigger drift; the catalog regression is local PGlite evidence.",
  "Database routes require independent host/database matches, reject connection-identity query overrides, and require TLS; readiness reports connectivity only.",
  "Draft and revision APIs reject unknown fields; the database freeze also gates both writes atomically and records its operator and reason.",
  "CI workflow actions use immutable commit SHAs and Dependabot checks for action updates weekly.",
];

const gates = [
  { id: "WAIT-01", title: "Unggah rencana V11 dan V11.2", text: "Yang tersedia baru prompt dan checklist lama. Tanpa dokumen rencana otoritatif, saya tidak bisa menandai semua persyaratan sebagai selesai." },
  { id: "WAIT-02", title: "Putuskan identitas dan pemulihan", text: "Neon Free saat ini masih mengizinkan pendaftaran langsung dan belum memberi snapshot harian 30 hari. Untuk editor admin dan backup yang dapat dipulihkan, perlu kebijakan/opsi yang disetujui pemilik." },
  { id: "WAIT-03", title: "Lengkapi bukti sumber Archive", text: "15 cerita tetap ditandai source-needed. Masing-masing perlu materi asli, kredit, dan bukti hak pakai sebelum dapat dianggap siap terbit." },
];

const evidenceLimits = [
  { label: "DATABASE", value: "NOT CONNECTED", detail: "No local DATABASE_URL or verified target is configured. Database routes fail closed; Neon behavior is not tested here.", tone: "pink" },
  { label: "REVIEW BRANCH", value: "LOCAL ONLY", detail: "This checkout is ahead of the remote PR head. Current remote CI does not cover these local commits.", tone: "gold" },
  { label: "RELEASE", value: "3 ACTION GROUPS", detail: "Ringkasan ini mengelompokkan pekerjaan yang menunggu pemilik; semua 8 gate teknis tetap OPEN di release register dan produksi tetap NO-GO.", tone: "aqua" },
];

export default function HandoverPage() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.wordmark} href="/">MOONWITNESS <span>XII</span></Link>
        <nav aria-label="Main navigation" className={styles.nav}>
          <Link href="/episodes">STORY ARCHIVE</Link>
          <Link href="/team">THE BATTERIES</Link>
          <a href="#release-gates">NEXT STEPS <span>03</span></a>
        </nav>
        <span className={styles.localBadge}><i /> LOCAL REVIEW</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>PROJECT STATUS <span>V11 / 13 OCT 2026</span></p>
          <h1>MISSION<br /><em>CONTROL</em></h1>
          <p className={styles.intro}>Yang sudah beres, yang masih menunggu keputusan, dan langkah berikutnya—ringkas, lokal, tanpa deployment.</p>
          <div className={styles.heroLinks}>
            <a href="#release-gates" className={styles.primaryButton}>LIHAT 3 LANGKAH <span>↘</span></a>
            <Link href="/team" className={styles.secondaryButton}>MEET THE BATTERIES <span>↗</span></Link>
          </div>
        </div>
        <div className={styles.statusCard}>
          <div className={styles.statusTop}><span>LOCAL REVIEW • NO-GO FOR PRODUCTION</span><span className={styles.statusLight}>● HOLD</span></div>
          <div className={styles.statusStamp}>NO<span>GO</span></div>
          <h2>Production release is on hold.</h2>
          <p>Local code and visual review can continue. Production promotion waits for verified security, database recovery, source rights, independent review, and owner approval.</p>
          <div className={styles.statusFoot}><span>BRANCH</span><code>codex/v11-release-readiness</code></div>
          <div className={styles.statusFoot}><span>NETWORK</span><b>LOCAL ONLY · NO DEPLOY</b></div>
        </div>
        <div className={styles.sunburst} aria-hidden="true">✳</div>
        <span className={styles.heroIndex}>MW—12</span>
      </section>

      <section className={styles.metrics} aria-label="Local verification results">
        {checks.map((check, index) => (
          <article className={`${styles.metric} ${styles[check.tone]}`} key={check.label}>
            <span className={styles.metricIndex}>0{index + 1} / VERIFIED</span>
            <strong>{check.value}</strong>
            <h2>{check.label}</h2>
            <p>{check.detail}</p>
          </article>
        ))}
      </section>

      <section className={styles.evidenceSection}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>WHAT THE LOCAL EVIDENCE SAYS <span>CHECKPOINT · 13 OCT</span></p>
          <h2>Sudah dicek,<br /><em>ini batasnya.</em></h2>
        </div>
        <div className={styles.evidenceList}>
          {verified.map((item, index) => <div className={styles.evidenceItem} key={item}><span>0{index + 1}</span><p>{item}</p><b>✓</b></div>)}
          <div className={styles.limitsGrid} aria-label="Evidence boundaries">
            {evidenceLimits.map((item) => <article className={`${styles.limitCard} ${styles[item.tone]}`} key={item.label}><span>{item.label} · EVIDENCE BOUNDARY</span><strong>{item.value}</strong><p>{item.detail}</p></article>)}
          </div>
          <div className={styles.evidenceNote}><strong>Local evidence · 13 Oct 2026</strong><p>Clean CI-chain replay on Node 22.23.3/npm 10.9.9: fresh `npm ci` installed 241 locked packages, then 134/134 tests, `db:check`, full dependency audit with 0 findings, production build, and `actionlint` passed. The initial HTTP smoke run was 40/40 against the existing visual app at `127.0.0.1:3199`. A stricter handover-freshness assertion was added afterward; its latest run was 39/40 because that already-running process still serves the previous handover bundle. Restart the existing server on the same port after building to load this copy; no second server or deployment was used. The editor session requires a verified email, Neon admin role, and exact server-side user allowlist. Hosted dev Auth still allows public signup and does not require email verification, so provider identity policy remains open.</p><p>The isolated Neon rehearsal covers `0000`–`0002`; migration `0001` was applied and rolled back with the baseline FK and ledger restored. Migrations `0003`–`0005` and persistent development rollout remain open. No Neon URL is configured locally; database and Archive APIs fail closed with `503`. All 15 Archive entries remain `source_needed`; local public lists/details now require a separate, default-false approval for the exact metadata use. Migration `0005` is not applied to Neon. AETHERION progress remains browser-local; persistent saves and seed authority remain open.</p><p>The authoritative Grand Master Plan V11/V11.2 has not been uploaded. No live owner-auth test, exact-head remote CI/Preview, or current remote branch review is claimed.</p></div>
        </div>
      </section>

      <section className={styles.gatesSection} id="release-gates" aria-label="Release gates remaining">
        <div className={styles.gatesHeader}>
          <div><p className={styles.eyebrow}>LANGKAH BERIKUTNYA <span>3 HAL YANG BENAR-BENAR MENUNGGU</span></p><h2>Tiga hal,<br /><em>lalu lanjut.</em></h2></div>
          <p>Ringkasan ini mengelompokkan pekerjaan untuk menghindari daftar berulang. Semua 8 gate teknis tetap terbuka; produksi tetap NO-GO sampai bukti lengkap dan pemilik menyetujui promosi.</p>
        </div>
        <div className={styles.gateList}>
          {gates.map((gate) => <article className={styles.gate} key={gate.id}><span className={styles.gateId}>{gate.id}</span><div><h3>{gate.title}</h3><p>{gate.text}</p></div><span className={styles.gateMark} aria-label="Menunggu"><i />MENUNGGU</span></article>)}
        </div>
        <div className={styles.docsRow}>
          <div>RELEASE GATES <code>docs/RELEASE_GATES_V11.md</code></div>
          <div>BACKUP / RESTORE <code>docs/BACKUP_RESTORE_RUNBOOK_V11.md</code></div>
          <div>IMPLEMENTATION MAP <code>docs/GRAND_MASTER_PLAN_IMPLEMENTATION_CHECKLIST.md</code></div>
        </div>
      </section>

      <footer className={styles.footer}><span>MOONWITNESS XII · LOCAL ENGINEERING REVIEW</span><span>MERCY FIRST · HUMANITY FIRST · EGO LAST</span></footer>
    </main>
  );
}
