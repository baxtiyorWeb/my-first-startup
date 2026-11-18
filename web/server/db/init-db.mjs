import pg from "pg";
import * as fs from "fs";
import * as path from "path";

// 1. Read .env manually
const envPath = path.resolve(process.cwd(), ".env");
let databaseUrl = process.env.DATABASE_URL;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      databaseUrl = trimmed.substring("DATABASE_URL=".length).replace(/^["']|["']$/g, "");
    }
  }
}

if (!databaseUrl) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

console.log("Connecting to Neon PostgreSQL...");

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

// 2. Read full SQL from schema.sql
const schemaPath = path.resolve(process.cwd(), "server/db/schema.sql");
const ddl = fs.readFileSync(schemaPath, "utf-8");

async function main() {
  try {
    const client = await pool.connect();
    console.log("Connected successfully to Neon PostgreSQL!");
    
    console.log("Applying complete schema DDL from schema.sql...");
    await client.query(ddl);

    console.log("All tables, indexes, constraints, and triggers applied successfully!");

    // Verify created tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log("\nTables in database:");
    for (const row of res.rows) {
      console.log(` - ${row.table_name}`);
    }

    client.release();
    await pool.end();
    console.log("\nDatabase migration completed perfectly!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

main();
