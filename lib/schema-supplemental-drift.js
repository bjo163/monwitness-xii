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

  const expectedCheckConstraints = new Map(Object.entries(expectedTables).flatMap(([tableName, table]) =>
    Object.entries(table.checkConstraints ?? {}).map(([name, constraint]) => [
      `${tableName}.${name}`,
      typeof constraint.value === "string" ? constraint.value : null,
    ])));
  const actualCheckConstraintsByName = new Map(actualCheckConstraints.map((constraint) => [
    `${constraint.schema_name}.${constraint.table_name}.${constraint.constraint_name}`,
    constraint.definition,
  ]));
  const normalizeCheck = (value) => value.toLowerCase()
    .replace(/^check\s*/, "")
    .replaceAll('"', "")
    .replace(/(?:archive\.)?stories\./g, "")
    .replace(/::text\b/g, "")
    .replace(/trim\(both from\s*/g, "trim(")
    .replace(/[\s()]/g, "");
  const missingExpectedCheckConstraints = [...expectedCheckConstraints.keys()]
    .filter((name) => !actualCheckConstraintsByName.has(name));
  const mismatchedExpectedCheckConstraints = [...expectedCheckConstraints].flatMap(([name, value]) => {
    const actual = actualCheckConstraintsByName.get(name);
    if (actual === undefined || value === null || normalizeCheck(actual) === normalizeCheck(value)) return [];
    return [name];
  });
  const expectedCheckNames = new Set(expectedCheckConstraints.keys());
  const unexpectedCheckConstraints = actualCheckConstraints
    .filter((constraint) => !expectedCheckNames.has(`${constraint.schema_name}.${constraint.table_name}.${constraint.constraint_name}`));
  const expectedPolicies = Object.entries(expectedTables).flatMap(([tableName, table]) =>
    Object.keys(table.policies ?? {}).map((name) => `${tableName}.${name}`));

  return {
    mismatchedRowSecurity,
    forcedRowSecurity,
    missingExpectedCheckConstraints,
    mismatchedExpectedCheckConstraints,
    unexpectedCheckConstraints,
    unexpectedPolicies: expectedPolicies.length === 0 ? actualPolicies : [],
    unverifiedExpectedPolicies: expectedPolicies,
    unexpectedTriggers: actualTriggers,
  };
}
