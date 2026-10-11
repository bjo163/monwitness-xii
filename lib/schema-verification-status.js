const driftCollections = [
  "missingTables",
  "unexpectedTables",
  "missingColumns",
  "unexpectedColumns",
  "mismatchedColumns",
  "mismatchedDefaults",
  "missingForeignKeys",
  "unexpectedForeignKeys",
  "missingIndexes",
  "unexpectedIndexes",
  "missingUniqueConstraints",
  "unexpectedUniqueConstraints",
];

export function hasSchemaDrift(result) {
  return !result.migrationLedgerPresent
    || driftCollections.some((key) => (result[key]?.length ?? 0) > 0);
}
