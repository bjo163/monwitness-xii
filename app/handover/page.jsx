import Link from "next/link";
import styles from "./handover.module.css";

export const metadata = { title: "MoonWitness XII — Release & Handover" };

const checks = [
  { value: "104 / 104", label: "automated tests", detail: "Current checkout · Node 26.5.0", tone: "pink" },
  { value: "32 / 32", label: "local HTTP checks", detail: "Current checkout · Node 26.5.0", tone: "cyan" },
  { value: "0", label: "audit findings", detail: "Current checkout · full dependency audit", tone: "lime" },
  { value: "PASS", label: "migration replay", detail: "Current checkout · db:check", tone: "gold" },
];

const verified = [
  "Every HTML page receives a fresh script CSP nonce; smoke checks nonce rotation and every script tag.",
  "Script and style policies use per-request nonces; the old unsafe-inline CSP and inline style attributes have been removed.",
  "Editor writes require an Auth admin role, exact owner allowlist, same-origin requests, and actor-attributed audit SQL.",
  "Public Archive responses expose five editorial fields; private drafts stay out of the public projection.",
  "Schema verification detects untracked RLS, CHECK, policy, and trigger drift; the catalog regression is local PGlite evidence.",
  "DB readiness reports connectivity without guessing the target environment; an unconfigured local check returns a safe 503, and configured failures log only the error class.",
  "Draft and revision APIs reject unknown fields, so clients cannot set publication or source-rights status.",
  "CI workflow actions use immutable commit SHAs and Dependabot checks for action updates weekly.",
];

const gates = [
  { id: "SEC-01", title: "Verify CSP on the exact release preview", text: "Local smoke requires nonce-only script and style policies and checks every rendered script/style block. This worktree has no remote CI or Preview result; repeat on the exact reviewed release head." },
  { id: "AUTH-01", title: "Owner identity and editor access", text: "Complete owner sign-in, admin onboarding, authenticated draft/revision writes, audit attribution, and session/role-revocation checks." },
  { id: "AUTH-02", title: "Identity policy", text: "Direct provider sign-up remains enabled and Managed Auth has no MFA here. Choose and verify an identity path suitable for production." },
  { id: "DB-02", title: "Persistent development migration", text: "Confirm the exact application database target, reconcile its existing schema and missing ledger, then apply only through an approved migration plan." },
  { id: "DB-03", title: "Recoverable backups", text: "Daily snapshots with 30-day retention are unavailable on the selected Free plan. Representative Neon data restore, accepted RPO/RTO, and cutover/rollback remain unverified." },
  { id: "ARC-01", title: "Archive sources and rights", text: "All 15 entries remain source-needed until original materials, credits, and reuse-rights evidence are reviewed." },
  { id: "REL-01", title: "Independent release review", text: "The latest local commits have no remote CI result. PR #4 needs independent review and integration; PR #2 still has conflicts." },
  { id: "PLAN-01", title: "Full V11 traceability", text: "All ten prompt modules are mapped to local evidence; full requirements coverage awaits the missing authoritative V11/V11.2 plan." },
];

export default function HandoverPage() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.wordmark} href="/">MOONWITNESS <span>XII</span></Link>
        <nav aria-label="Main navigation" className={styles.nav}>
          <Link href="/episodes">STORY ARCHIVE</Link>
          <Link href="/team">THE BATTERIES</Link>
          <a href="#release-gates">RELEASE GATES <span>08</span></a>
        </nav>
        <span className={styles.localBadge}><i /> LOCAL REVIEW</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>ENGINEERING HANDOVER <span>V11 / 12 OCT 2026</span></p>
          <h1>MISSION<br /><em>CONTROL</em></h1>
          <p className={styles.intro}>A live snapshot of the work, evidence, and open gates for the MoonWitness XII release.</p>
          <div className={styles.heroLinks}>
            <a href="#release-gates" className={styles.primaryButton}>REVIEW THE GATES <span>↘</span></a>
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
          <p className={styles.eyebrow}>WHAT THE LOCAL EVIDENCE SAYS <span>CHECKPOINT · 12 OCT</span></p>
          <h2>Built, checked,<br /><em>still in review.</em></h2>
        </div>
        <div className={styles.evidenceList}>
          {verified.map((item, index) => <div className={styles.evidenceItem} key={item}><span>0{index + 1}</span><p>{item}</p><b>✓</b></div>)}
          <p className={styles.evidenceNote}>The clean Node 22.23.3 snapshot passed install, 95/95 tests, migration replay, audit, production build, and CSP-required loopback smoke 32/32. The current checkout exercises the actual editor draft/revision handlers against PGlite and passes 104/104 tests, build, and loopback smoke 32/32 on Node 26.5.0. Local Auth returns a signed-out session and editor denial; database routes return safe-unavailable responses without a local database URL, and the readiness route reports connectivity without guessing its target environment or logging the expected unconfigured state. Browser-console error review remains open.</p>
        </div>
      </section>

      <section className={styles.gatesSection} id="release-gates" aria-label="Release gates remaining">
        <div className={styles.gatesHeader}>
          <div><p className={styles.eyebrow}>THE WORK STILL AHEAD <span>OWNER DECISIONS + VERIFIED EVIDENCE</span></p><h2>Eight open<br /><em>release gates.</em></h2></div>
          <p>Each gate needs current, reviewable evidence before production status can change.</p>
        </div>
        <div className={styles.gateList}>
          {gates.map((gate) => <article className={styles.gate} key={gate.id}><span className={styles.gateId}>{gate.id}</span><div><h3>{gate.title}</h3><p>{gate.text}</p></div><span className={styles.gateMark} aria-label="Open">○</span></article>)}
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
