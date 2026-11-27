import "dotenv/config";
import pg from "pg";
import { SignJWT } from "jose";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
const marker = `page-${Date.now()}`;

try {
  const { rows: users } = await client.query(
    `SELECT id, handle, name, role FROM users WHERE is_deactivated = false ORDER BY created_at ASC LIMIT 1`
  );
  const user = users[0];
  const token = await new SignJWT({
    userId: user.id,
    handle: user.handle,
    name: user.name,
    role: user.role,
    isOnboarded: true,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));

  const { rows: communities } = await client.query(
    `SELECT id FROM communities WHERE slug = 'geters-community' LIMIT 1`
  );
  const communityId = communities[0].id;

  for (let i = 0; i < 35; i += 1) {
    await client.query(
      `INSERT INTO community_messages (community_id, sender_id, content, created_at, updated_at)
       VALUES ($1, $2, $3, now() - ($4 || ' seconds')::interval, now() - ($4 || ' seconds')::interval)`,
      [communityId, user.id, `${marker} #${i}`, String(35 - i)]
    );
  }

  const page1 = await fetch(`http://127.0.0.1:3000/api/community/messages?limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());

  const cursor = page1?.data?.nextCursor;
  const page2 = await fetch(
    `http://127.0.0.1:3000/api/community/messages?limit=10&cursor=${encodeURIComponent(cursor)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  ).then((r) => r.json());

  const ids1 = new Set((page1?.data?.messages || []).map((m) => m.id));
  const overlap = (page2?.data?.messages || []).filter((m) => ids1.has(m.id));
  const oldest1 = page1?.data?.messages?.[0]?.createdAt;
  const newest2 = page2?.data?.messages?.slice(-1)?.[0]?.createdAt;

  console.log("page1", page1?.data?.messages?.length, "hasMore", page1?.data?.hasMore);
  console.log("page2", page2?.data?.messages?.length, "hasMore", page2?.data?.hasMore);
  console.log("overlap", overlap.length, "ordered", oldest1 > newest2);

  if (page1?.data?.messages?.length !== 10) throw new Error("page1 size");
  if (page2?.data?.messages?.length !== 10) throw new Error("page2 size");
  if (overlap.length !== 0) throw new Error("overlapping pages");
  if (!(oldest1 > newest2)) throw new Error("pagination order broken");

  console.log("PAGINATION OK");
} catch (error) {
  console.error("PAGINATION FAILED:", error);
  process.exitCode = 1;
} finally {
  await client.query(`DELETE FROM community_messages WHERE content LIKE $1`, [`${marker}%`]);
  client.release();
  await pool.end();
}
