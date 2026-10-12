function unavailableResponse() {
  return Response.json({ status: "error", database: "unavailable" }, {
    status: 503, headers: { "Cache-Control": "no-store" }
  });
}

export function createDatabaseHealthHandler({ getDatabase, probeDatabase, logger = console }) {
  return async function GET() {
    // A missing local development URL is expected, not a failed connection.
    if (!process.env.DATABASE_URL) return unavailableResponse();

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
