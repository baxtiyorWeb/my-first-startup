import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/db/schema/index.ts",
  out: "./server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/fikr_db",
  },
  verbose: true,
  strict: true,
});
