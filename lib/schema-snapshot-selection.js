export function selectSchemaSnapshot({ baselineReconciliation, migrationEntries }) {
  if (!Array.isArray(migrationEntries) || migrationEntries.length === 0) {
    throw new Error("Drizzle migration journal has no entries");
  }

  const entry = baselineReconciliation
    ? migrationEntries.find((candidate) => candidate.idx === 0)
    : migrationEntries.reduce((latest, candidate) => candidate.idx > latest.idx ? candidate : latest);

  if (!entry || !Number.isInteger(entry.idx) || entry.idx < 0) {
    throw new Error("Drizzle migration journal has an invalid snapshot index");
  }

  return `${String(entry.idx).padStart(4, "0")}_snapshot.json`;
}
