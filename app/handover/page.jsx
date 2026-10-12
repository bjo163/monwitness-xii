import Link from "next/link";

export const metadata = { title: "MoonWitness XII — Release & Handover" };

const verified = [
  "79 automated tests pass, including Archive, editor-policy, migration-ledger, auth-config, and recovery checks",
  "Neon Auth signed session-data cache is explicitly limited to 60 seconds",
  "Migration generation and PostgreSQL replay check pass",
  "Read-only schema verifier checks every migration ledger hash and timestamp in journal order",
  "Full dependency audit reports zero vulnerabilities",
  "CI actions are SHA-pinned and Dependabot tracks updates weekly",
  "Production build and local HTTP smoke pass (30 checks)",
  "Public Archive response is limited to five editorial fields and excludes drafts",
  "Editor writes require an Auth admin role, exact owner allowlist, and same-origin request",
];

const openGates = [
  "Verify owner sign-in, admin onboarding, authenticated writes, and audit attribution",
  "Run live session and role-revocation checks; the signed cache can remain valid for up to 60 seconds",
  "Development Auth still permits direct provider signup; app signup routes alone return 404",
  "Reconcile and apply migrations to persistent development only after exact target verification and approval",
  "Daily snapshots with 30-day retention are not configured on the selected Free plan; representative-data recovery and RPO/RTO remain unverified",
  "All 15 development Archive entries remain source-needed pending originals, credits, and rights evidence",
  "Complete independent review and integration checks for PR #4 and PR #2; latest local commits have no remote CI result",
  "Obtain the authoritative Grand Master Plan V11/V11.2 source before claiming full module traceability",
];

export default function HandoverPage() {
  return (
    <main style={{ background: "#0f1427", color: "#f8fafc", minHeight: "100vh", padding: "32px clamp(20px,5vw,80px)", fontFamily: "system-ui" }}>
      <nav aria-label="Main navigation" style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
        <Link href="/" style={{ color: "#72e6ed" }}>← HOME</Link>
        <Link href="/episodes" style={{ color: "#72e6ed" }}>STORY ARCHIVE</Link>
        <Link href="/team" style={{ color: "#72e6ed" }}>THE BATTERIES</Link>
      </nav>

      <section style={{ maxWidth: 1050, margin: "72px auto 32px" }}>
        <p style={{ color: "#c9fa62", fontWeight: 800, letterSpacing: 3 }}>LOCAL RELEASE CONTROL • V11 HANDOVER</p>
        <h1 style={{ fontSize: "clamp(42px,7vw,88px)", lineHeight: 1.05, margin: "12px 0" }}>
          MISSION CONTROL <span style={{ color: "#6ee6ef" }}>V11</span>
        </h1>
        <p style={{ fontSize: 20, maxWidth: 780 }}>
          A local engineering review of the MoonWitness XII story universe, security boundaries, and release evidence.
        </p>

        <div style={{ background: "#4a2d35", borderLeft: "5px solid #ffbb74", padding: 22, margin: "26px 0", borderRadius: 10 }}>
          <b>LOCAL REVIEW • NO-GO FOR PRODUCTION</b>
          <p>
            This checkout is for local review only. No push or deployment was made. Local tests, migration checks, production build, and HTTP smoke pass with the updated read-only verifier. Live owner authentication, persistent development migration, backup recovery, and Archive source review remain open. Production promotion requires a separate owner approval after those gates pass.
          </p>
          <p style={{ marginBottom: 0 }}>
            Review branch <code>codex/v11-release-readiness</code> · Unit tests <code>79/79</code> · Local smoke (last verified) <code>30/30</code>
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
          <section aria-labelledby="verified-title" style={{ background: "#192f3c", padding: 25, borderRadius: 18, border: "1px solid #62e2c7" }}>
            <h2 id="verified-title" style={{ color: "#8affdd" }}>✓ Verified locally</h2>
            <ul style={{ lineHeight: 2 }}>{verified.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section aria-labelledby="gates-title" style={{ background: "#322539", padding: 25, borderRadius: 18, border: "1px solid #e7abd1" }}>
            <h2 id="gates-title" style={{ color: "#ffc2df" }}>◯ Release gates remaining</h2>
            <ul style={{ lineHeight: 2 }}>{openGates.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        </div>

        <div style={{ marginTop: 40, display: "flex", flexWrap: "wrap", gap: 14 }}>
          <Link href="/episodes" style={{ background: "#d5ff69", color: "#161b27", padding: "14px 20px", fontWeight: 800, borderRadius: 10 }}>VIEW STORY ARCHIVE</Link>
          <Link href="/team" style={{ border: "2px solid #6be7e9", color: "#6be7e9", padding: "12px 20px", fontWeight: 800, borderRadius: 10 }}>MEET THE BATTERIES</Link>
        </div>
        <footer style={{ marginTop: 70, borderTop: "1px solid #536072", paddingTop: 24, color: "#bdd0df" }}>
          FIND LIGHT IN DARKNESS · MERCY FIRST • HUMANITY FIRST • EGO LAST · COMEDY ON. SHALAWAT ON.
        </footer>
      </section>
    </main>
  );
}
