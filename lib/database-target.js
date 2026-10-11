export function getDatabaseTargetError({ uri, expectedHost, expectedDatabase, requireExpected = false }) {
  if (requireExpected && (!expectedHost || !expectedDatabase)) {
    return "Expected database host and name are required for baseline reconciliation";
  }

  let target;
  try {
    target = new URL(uri);
  } catch {
    return "DATABASE_URL is not a valid PostgreSQL URL";
  }

  if (!["postgres:", "postgresql:"].includes(target.protocol) || !target.hostname || !target.pathname || target.pathname === "/") {
    return "DATABASE_URL must identify a PostgreSQL host and database";
  }

  let databaseName;
  try {
    databaseName = decodeURIComponent(target.pathname.slice(1));
  } catch {
    return "DATABASE_URL contains an invalid database name";
  }

  if (expectedHost && target.hostname.toLowerCase() !== expectedHost.trim().toLowerCase()) {
    return "DATABASE_URL host does not match EXPECTED_DATABASE_HOST";
  }
  if (expectedDatabase && databaseName !== expectedDatabase.trim()) {
    return "DATABASE_URL database does not match EXPECTED_DATABASE_NAME";
  }
  return null;
}
