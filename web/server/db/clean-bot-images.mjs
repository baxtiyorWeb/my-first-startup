import pg from "pg";
import * as fs from "fs";
import * as path from "path";

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

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("Cleaning stock images from existing bot posts...");
  const res = await pool.query(`
    UPDATE posts
    SET media_urls = '[]'::jsonb
    WHERE author_id IN (SELECT id FROM users WHERE is_bot = true)
      AND jsonb_array_length(media_urls) > 0;
  `);
  console.log(`Updated ${res.rowCount} bot posts (removed stock images).`);
  await pool.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
