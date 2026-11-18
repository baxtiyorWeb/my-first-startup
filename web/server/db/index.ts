import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/gogetters_db";

const isRemoteDb =
  connectionString.includes("neon.tech") ||
  connectionString.includes("sslmode=require") ||
  connectionString.includes("amazonaws.com");

const shouldRejectUnauthorized = process.env.DB_REJECT_UNAUTHORIZED !== "false";

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString,
    ssl: isRemoteDb ? { rejectUnauthorized: shouldRejectUnauthorized } : undefined,
    max: process.env.NODE_ENV === "production" ? 10 : 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

pool.on("error", (err) => {
  console.error("[DATABASE] Unexpected error on idle PostgreSQL client:", err);
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });
export type Database = typeof db;
