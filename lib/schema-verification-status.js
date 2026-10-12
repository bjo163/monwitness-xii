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
  "mismatchedRowSecurity",
  "forcedRowSecurity",
  "unexpectedCheckConstraints",
  "unverifiedExpectedCheckConstraints",
  "unexpectedPolicies",
  "unverifiedExpectedPolicies",
  "unexpectedTriggers",
];

export function hasSchemaDrift(result, { requireLedger = true } = {}) {
  return (requireLedger && !result.migrationLedgerPresent)
    || driftCollections.some((key) => (result[key]?.length ?? 0) > 0);
}
