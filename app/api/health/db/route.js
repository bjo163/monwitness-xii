import { getDatabase } from "../../../db/client";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only integration probe. Does not disclose credentials, IDs or private records.
export async function GET() {
  try {
    const database = getDatabase();
    await database.execute(sql`select 1 as healthy`);
    return Response.json({ status: "ok", database: "connected", migration: "development" }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("MoonWitness DB probe failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ status: "error", database: "unavailable" }, {
      status: 503, headers: { "Cache-Control": "no-store" }
    });
  }
}
