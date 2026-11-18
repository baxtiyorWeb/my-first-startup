import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function clean() {
  const res = await pool.query(`DELETE FROM posts WHERE content LIKE '%title":%' OR content LIKE '%"content%' OR content LIKE '?%';`);
  console.log('Cleaned broken posts:', res.rowCount);
  await pool.end();
  process.exit(0);
}

clean().catch(console.error);
