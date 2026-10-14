export function hasMigrationLedgerDrift({ present, actualEntries = [], expectedEntries, baselineReconciliation = false }) {
  if (baselineReconciliation) return present;
  if (!present || !Array.isArray(expectedEntries) || actualEntries.length !== expectedEntries.length) return true;
  return expectedEntries.some((expected, index) => {
    const actual = actualEntries[index];
    return !actual || actual.hash !== expected.hash || String(actual.created_at) !== String(expected.created_at);
  });
}
