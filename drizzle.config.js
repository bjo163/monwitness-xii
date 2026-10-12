import { defineConfig } from "drizzle-kit";
import { getDrizzleCliGuardError } from "./lib/database-target.js";

const cliArguments = process.argv.slice(2);
const operationError = getDrizzleCliGuardError({ args: cliArguments, env: process.env });
if (operationError) throw new Error(operationError);

export default defineConfig({
 schema: "./db/schema.js",
 out: "./drizzle",
 dialect: "postgresql",
 dbCredentials: { url: process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder" },
 verbose: true,
 strict: true,
});
