export const dynamic = "force-dynamic";

// Application liveness probe. Database readiness is reported by /api/health/db.
export async function GET() {
  return Response.json({ status: "ok", service: "moonwitness-xii" }, {
    headers: { "Cache-Control": "no-store" },
  });
}
