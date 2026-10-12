export function getDatabaseTargetError({ uri, expectedHost, expectedDatabase, requireExpected = false, env = process.env }) {
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

  if (!target.username || !target.password) {
    return "DATABASE_URL must include explicit database credentials";
  }

  // PostgreSQL's standard port is the only supported target. An alternate
  // port can route the same host/database name to a different service. The
  // driver also falls back to PGPORT when the URL omits a port.
  const effectivePort = target.port || env.PGPORT || "5432";
  if (effectivePort !== "5432") {
    return "DATABASE_URL must use the standard PostgreSQL port 5432";
  }

  // node-postgres applies PGOPTIONS at session startup even when the
  // connection URL is valid. It can change session role or search_path.
  if (env.PGOPTIONS) {
    return "PGOPTIONS must be unset for this database operation";
  }
  if (env.PGREPLICATION) {
    return "PGREPLICATION must be unset for this database operation";
  }

  let databaseName;
  try {
    databaseName = decodeURIComponent(target.pathname.slice(1));
  } catch {
    return "DATABASE_URL contains an invalid database name";
  }

  const connectionIdentityParameters = new Set(["host", "hostaddr", "hostname", "port", "database", "dbname", "user", "username", "password"]);
  if ([...target.searchParams.keys()].some((parameter) => connectionIdentityParameters.has(parameter.toLowerCase()))) {
    return "DATABASE_URL must not override connection identity through query parameters";
  }

  const tlsOverrideParameters = new Set(["ssl", "sslcert", "sslkey", "sslrootcert", "sslpassword", "sslcrl", "sslcrldir"]);
  if ([...target.searchParams.keys()].some((parameter) => tlsOverrideParameters.has(parameter.toLowerCase()))) {
    return "DATABASE_URL must not override TLS configuration through query parameters";
  }

  const unsupportedParameters = [...target.searchParams.keys()]
    .map((parameter) => parameter.toLowerCase())
    .filter((parameter) => !["sslmode", "channel_binding"].includes(parameter));
  if (unsupportedParameters.length > 0) {
    return "DATABASE_URL contains unsupported query parameters";
  }

  const channelBindingModes = [...target.searchParams.entries()]
    .filter(([parameter]) => parameter.toLowerCase() === "channel_binding")
    .map(([, mode]) => mode.toLowerCase());
  if (channelBindingModes.length > 1 || channelBindingModes.some((mode) => mode !== "require")) {
    return "DATABASE_URL must not disable PostgreSQL channel binding";
  }

  if (expectedHost && target.hostname.toLowerCase() !== expectedHost.trim().toLowerCase()) {
    return "DATABASE_URL host does not match EXPECTED_DATABASE_HOST";
  }
  if (expectedDatabase && databaseName !== expectedDatabase.trim()) {
    return "DATABASE_URL database does not match EXPECTED_DATABASE_NAME";
  }

  const sslModes = [...target.searchParams.entries()]
    .filter(([parameter]) => parameter.toLowerCase() === "sslmode")
    .map(([, mode]) => mode.toLowerCase());
  if (sslModes.length !== 1 || !["require", "verify-ca", "verify-full"].includes(sslModes[0])) {
    return "DATABASE_URL must specify exactly one TLS-required sslmode";
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
    env,
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
    env,
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

  const hasConfigOverride = args.some((argument) => {
    const option = argument.startsWith("--") ? argument.slice(2).split("=", 1)[0] : argument.split("=", 1)[0];
    return option.toLowerCase() === "config";
  });
  if (hasConfigOverride) {
    return "Drizzle CLI config overrides are disabled; use the repository's guarded drizzle.config.js.";
  }

  const credentialOptions = new Set(["url", "host", "user", "password", "port", "database"]);
  const hasConnectionOverride = args.some((argument) => {
    const option = argument.startsWith("--") ? argument.slice(2).split("=", 1)[0] : argument.split("=", 1)[0];
    return credentialOptions.has(option.toLowerCase());
  });
  if (hasConnectionOverride) {
    return "Drizzle CLI connection overrides are disabled; use DATABASE_URL with the checked target values.";
  }

  if (args.length > 1) {
    return "Direct Drizzle CLI options are disabled; use the guarded npm command without extra flags.";
  }

  return getDatabaseOperationError({ operation: command, env });
}
