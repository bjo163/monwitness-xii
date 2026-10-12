export function getSchemaSupplementalDrift({
  expectedTables,
  actualTableSecurity,
  actualCheckConstraints,
  actualPolicies,
  actualTriggers,
}) {
  const actualTableSecurityByName = new Map(actualTableSecurity.map((table) => [`${table.schema_name}.${table.table_name}`, table]));
  const mismatchedRowSecurity = Object.entries(expectedTables).flatMap(([tableName, expected]) => {
    const actual = actualTableSecurityByName.get(tableName);
    if (!actual || Boolean(actual.row_security_enabled) === Boolean(expected.isRLSEnabled)) return [];
    return [{ table: tableName, expected: Boolean(expected.isRLSEnabled), actual: Boolean(actual.row_security_enabled) }];
  });
  const forcedRowSecurity = actualTableSecurity
    .filter((table) => Boolean(table.force_row_security))
    .map((table) => `${table.schema_name}.${table.table_name}`);

  const expectedCheckConstraints = Object.entries(expectedTables).flatMap(([tableName, table]) =>
    Object.keys(table.checkConstraints ?? {}).map((name) => `${tableName}.${name}`));
  const expectedPolicies = Object.entries(expectedTables).flatMap(([tableName, table]) =>
    Object.keys(table.policies ?? {}).map((name) => `${tableName}.${name}`));

  // The current Drizzle snapshot has no CHECK constraints or row policies. Fail
  // closed if either is introduced until this verifier compares full semantics.
  return {
    mismatchedRowSecurity,
    forcedRowSecurity,
    unexpectedCheckConstraints: expectedCheckConstraints.length === 0 ? actualCheckConstraints : [],
    unverifiedExpectedCheckConstraints: expectedCheckConstraints,
    unexpectedPolicies: expectedPolicies.length === 0 ? actualPolicies : [],
    unverifiedExpectedPolicies: expectedPolicies,
    unexpectedTriggers: actualTriggers,
  };
}
