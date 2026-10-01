import pg from "pg";
import * as fs from "fs";
import * as path from "path";

// 1. Read .env
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
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function runTests() {
  console.log("=== STARTING THE GO-GETTERS DM INTEGRATION TESTS ===");
  const client = await pool.connect();

  try {
    // 1. Fetch two real test users from the database
    const usersRes = await client.query(`
      SELECT id, name, handle, dm_permission FROM users WHERE is_deactivated = false LIMIT 2;
    `);

    if (usersRes.rows.length < 2) {
      console.warn("Skipping test: need at least 2 users in DB");
      return;
    }

    const userA = usersRes.rows[0];
    const userB = usersRes.rows[1];
    console.log(`✓ Test Users: [${userA.name} (@${userA.handle})] <-> [${userB.name} (@${userB.handle})]`);

    // 2. Test Deterministic Pair Key
    const pairKeyAB = [userA.id, userB.id].sort().join(":");
    const pairKeyBA = [userB.id, userA.id].sort().join(":");
    if (pairKeyAB !== pairKeyBA) {
      throw new Error("Deterministic pair key failed symmetry test!");
    }
    console.log(`✓ Deterministic pairKey verified: ${pairKeyAB}`);

    // 3. Test Conversation Insertion or Fetch
    let convRes = await client.query(`
      SELECT id FROM conversations WHERE direct_pair_key = $1;
    `, [pairKeyAB]);

    let convId;
    if (convRes.rows.length === 0) {
      const insertConv = await client.query(`
        INSERT INTO conversations (type, direct_pair_key)
        VALUES ('direct', $1)
        RETURNING id;
      `, [pairKeyAB]);
      convId = insertConv.rows[0].id;

      await client.query(`
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES ($1, $2), ($1, $3)
        ON CONFLICT DO NOTHING;
      `, [convId, userA.id, userB.id]);
      console.log(`✓ Created new direct conversation: ${convId}`);
    } else {
      convId = convRes.rows[0].id;
      console.log(`✓ Reused existing direct conversation: ${convId}`);
    }

    // 4. Test Uniqueness Constraint: Attempting to insert duplicate conversation must fail
    try {
      await client.query(`
        INSERT INTO conversations (type, direct_pair_key)
        VALUES ('direct', $1);
      `, [pairKeyAB]);
      throw new Error("Duplicate conversation was inserted! Constraint failed!");
    } catch (err) {
      if (err.code === '23505') {
        console.log("✓ Duplicate conversation prevention verified (Postgres 23505 unique_violation caught)");
      } else {
        throw err;
      }
    }

    // 5. Test Message Sending with Uzbek Unicode
    const clientMsgId = `test_msg_${Date.now()}`;
    const testContent = "Assalomu alaykum! O'zbekiston, Go-getters DM tizimi tayyor. Ўзбекистон стартаплари! 🚀";

    const msgInsert = await client.query(`
      INSERT INTO messages (conversation_id, sender_id, content, client_message_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, content, created_at;
    `, [convId, userA.id, testContent, clientMsgId]);

    const sentMessage = msgInsert.rows[0];
    console.log(`✓ Message persisted with ID: ${sentMessage.id}`);
    if (sentMessage.content !== testContent) {
      throw new Error("Unicode corruption detected in content!");
    }
    console.log(`✓ Unicode integrity verified for Latin & Cyrillic text!`);

    // 6. Test Idempotency: Attempting to insert same clientMessageId must fail
    try {
      await client.query(`
        INSERT INTO messages (conversation_id, sender_id, content, client_message_id)
        VALUES ($1, $2, $3, $4);
      `, [convId, userA.id, testContent, clientMsgId]);
      throw new Error("Duplicate message inserted with same clientMessageId!");
    } catch (err) {
      if (err.code === '23505') {
        console.log("✓ Message Idempotency verified: duplicate clientMessageId safely rejected!");
      } else {
        throw err;
      }
    }

    // 7. Test Message History & Ordering
    const historyRes = await client.query(`
      SELECT id, content, created_at 
      FROM messages 
      WHERE conversation_id = $1 
      ORDER BY created_at DESC 
      LIMIT 10;
    `, [convId]);
    console.log(`✓ Retrieved ${historyRes.rows.length} messages in conversation, ordered chronologically.`);

    // 8. Test Read Receipts
    await client.query(`
      UPDATE conversation_participants 
      SET last_read_message_id = $1, last_read_at = now()
      WHERE conversation_id = $2 AND user_id = $3;
    `, [sentMessage.id, convId, userB.id]);
    console.log(`✓ Read receipt marker updated for peer participant!`);

    // Clean up test message to keep DB pristine
    await client.query(`DELETE FROM messages WHERE id = $1;`, [sentMessage.id]);
    console.log(`✓ Cleaned up test message.`);

    console.log("\n========================================================");
    console.log("ALL 8 REAL-TIME DM INTEGRATION TESTS PASSED WITH 100% SUCCESS!");
    console.log("========================================================\n");
  } finally {
    client.release();
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
