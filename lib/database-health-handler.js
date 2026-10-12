import { isApplicationDatabaseConfigured } from "./database-target.js";

function unavailableResponse() {
  return Response.json({ status: "error", database: "unavailable" }, {
    status: 503, headers: { "Cache-Control": "no-store" }
  });
}

export function createDatabaseHealthHandler({ getDatabase, probeDatabase, isConfigured = isApplicationDatabaseConfigured, logger = console }) {
  return async function GET() {
    // Missing or unverified local/runtime targets are configuration states, not failed probes.
    if (!isConfigured()) return unavailableResponse();

    try {
      const database = getDatabase();
      await probeDatabase(database);
      return Response.json({ status: "ok", database: "connected" }, {
        headers: { "Cache-Control": "no-store" }
      });
    } catch (error) {
      logger.error("MoonWitness DB probe failed", error instanceof Error ? error.name : "unknown");
      return unavailableResponse();
    }
  };
}
