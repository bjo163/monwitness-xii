export function selectSchemaSnapshot({ baselineReconciliation, migrationEntries, journalVersion, journalDialect }) {
  if (!Array.isArray(migrationEntries) || migrationEntries.length === 0) {
    throw new Error("Drizzle migration journal has no entries");
  }
  if (typeof journalVersion !== "string" || journalDialect !== "postgresql") {
    throw new Error("Drizzle migration journal has invalid version or dialect metadata");
  }

  const seenTags = new Set();
  let previousTimestamp = 0;
  for (const [index, entry] of migrationEntries.entries()) {
    if (!entry || entry.idx !== index) {
      throw new Error("Drizzle migration journal indices must be contiguous and ordered");
    }
    if (typeof entry.tag !== "string" || !/^[A-Za-z0-9_-]+$/.test(entry.tag) || seenTags.has(entry.tag)) {
      throw new Error("Drizzle migration journal tags must be unique safe filenames");
    }
    if (!Number.isSafeInteger(entry.when) || entry.when <= previousTimestamp) {
      throw new Error("Drizzle migration journal timestamps must be positive, unique, and increasing");
    }
    if (entry.version !== journalVersion || typeof entry.breakpoints !== "boolean") {
      throw new Error("Drizzle migration journal entries have invalid metadata");
    }
    seenTags.add(entry.tag);
    previousTimestamp = entry.when;
  }

  const entry = baselineReconciliation
    ? migrationEntries.find((candidate) => candidate.idx === 0)
    : migrationEntries.reduce((latest, candidate) => candidate.idx > latest.idx ? candidate : latest);

  if (!entry || !Number.isInteger(entry.idx) || entry.idx < 0) {
    throw new Error("Drizzle migration journal has an invalid snapshot index");
  }

  return `${String(entry.idx).padStart(4, "0")}_snapshot.json`;
}
