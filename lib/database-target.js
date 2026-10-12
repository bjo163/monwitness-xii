export function getDatabaseTargetError({ uri, expectedHost, expectedDatabase, requireExpected = false }) {
  if (requireExpected && (!expectedHost || !expectedDatabase)) {
    return "Expected database host and name are required for this database operation";
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

  // PostgreSQL's standard port is the only supported target. An alternate
  // port can route the same host/database name to a different service.
  if (target.port && target.port !== "5432") {
    return "DATABASE_URL must use the standard PostgreSQL port 5432";
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

export function getApplicationDatabaseTargetError(env = process.env) {
  if (!env.DATABASE_URL) return "DATABASE_URL is not configured";
  return getDatabaseTargetError({
    uri: env.DATABASE_URL,
    expectedHost: env.EXPECTED_DATABASE_HOST,
    expectedDatabase: env.EXPECTED_DATABASE_NAME,
    requireExpected: true,
  });
}

export function isApplicationDatabaseConfigured(env = process.env) {
  return getApplicationDatabaseTargetError(env) === null;
}

export function getApplicationDatabaseUrl(env = process.env) {
  if (!isApplicationDatabaseConfigured(env)) {
    throw new Error("Application database target is not verified");
  }
  return env.DATABASE_URL;
}

export function getDatabaseOperationError({ operation, env = process.env }) {
  if (!["migrate", "studio", "introspect", "pull"].includes(operation)) {
    return "Unsupported Drizzle database operation";
  }

  const uri = env.DATABASE_URL;
  if (!uri) return `DATABASE_URL missing; Drizzle ${operation} not run`;

  const targetError = getDatabaseTargetError({
    uri,
    expectedHost: env.EXPECTED_DATABASE_HOST,
    expectedDatabase: env.EXPECTED_DATABASE_NAME,
    requireExpected: true,
  });
  if (targetError) return `${targetError}; Drizzle ${operation} not run`;

  const confirmationVariable = {
    migrate: "CONFIRM_DATABASE_MIGRATION",
    studio: "CONFIRM_DATABASE_STUDIO",
    introspect: "CONFIRM_DATABASE_INTROSPECTION",
    pull: "CONFIRM_DATABASE_INTROSPECTION",
  }[operation];
  if (env[confirmationVariable] !== "YES") {
    return `Set ${confirmationVariable}=YES after reviewing the exact target and operation; Drizzle ${operation} not run`;
  }

  return null;
}

export function getDrizzleCliGuardError({ args, env = process.env }) {
  const command = args[0];
  if (!["migrate", "studio", "push", "introspect", "pull"].includes(command)) return null;
  if (command === "push") {
    return "Direct drizzle-kit push is disabled; use reviewed SQL migrations through the guarded command.";
  }

  const credentialOptions = new Set(["url", "host", "user", "password", "port", "database"]);
  const hasConnectionOverride = args.some((argument) => {
    const option = argument.startsWith("--") ? argument.slice(2).split("=", 1)[0] : argument.split("=", 1)[0];
    return credentialOptions.has(option.toLowerCase());
  });
  if (hasConnectionOverride) {
    return "Drizzle CLI connection overrides are disabled; use DATABASE_URL with the checked target values.";
  }

  return getDatabaseOperationError({ operation: command, env });
}
