import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getApplicationDatabaseUrl } from "../lib/database-target.js";
import * as schema from "./schema";

export function getDatabase() {
  // Fail closed unless the endpoint matches independently supplied target values.
  const sql = neon(getApplicationDatabaseUrl());
  return drizzle(sql, { schema });
}
