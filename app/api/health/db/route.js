import { getDatabase } from "../../../../db/client";
import { createDatabaseHealthHandler } from "../../../../lib/database-health-handler.js";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only integration probe. Does not disclose credentials, IDs or private records.
export const GET = createDatabaseHealthHandler({
  getDatabase,
  probeDatabase: (database) => database.execute(sql`select 1 as healthy`),
});
