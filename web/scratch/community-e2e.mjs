import "dotenv/config";
import pg from "pg";
import { SignJWT } from "jose";

const { Pool } = pg;
const BASE = "http://127.0.0.1:3000";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function tokenFor(user) {
  return new SignJWT({
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
}

async function call(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // ignore
  }
  return { status: res.status, json };
}

const createdIds = [];

try {
  const { rows: users } = await client.query(
    `SELECT id, handle, name, role FROM users WHERE is_deactivated = false ORDER BY created_at ASC LIMIT 2`
  );
  if (users.length < 2) throw new Error("Kamida 2 ta faol foydalanuvchi kerak");
  const [userA, userB] = users;
  const tokenA = await tokenFor(userA);
  const tokenB = await tokenFor(userB);

  console.log(`Users: ${userA.name} <-> ${userB.name}`);

  const anon = await call("/api/community");
  check("Anonim so'rov 401", anon.status === 401, `status=${anon.status}`);

  const overview = await call("/api/community", { token: tokenA });
  check(
    "GET /api/community 200",
    overview.status === 200 && overview.json?.data?.community?.slug === "geters-community",
    `members=${overview.json?.data?.memberCount}`
  );

  const anonSend = await call("/api/community/messages", {
    method: "POST",
    body: { content: "anon" },
  });
  check("Anonim yuborish 401", anonSend.status === 401, `status=${anonSend.status}`);

  // SSE listener for user B before sending
  const controller = new AbortController();
  const sseResponse = await fetch(`${BASE}/api/community/stream`, {
    headers: { Authorization: `Bearer ${tokenB}` },
    signal: controller.signal,
  });
  const reader = sseResponse.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  const ssePromise = (async () => {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });
      if (sseBuffer.includes("event: message:new")) return true;
    }
    return false;
  })().catch(() => false);

  const marker = `e2e-${Date.now()}`;
  const sent = await call("/api/community/messages", {
    method: "POST",
    token: tokenA,
    body: { content: `Salom guruh! ${marker}` },
  });
  const messageId = sent.json?.data?.message?.id;
  if (messageId) createdIds.push(messageId);
  check(
    "Xabar yuborish 201",
    sent.status === 201 && Boolean(messageId),
    `status=${sent.status}`
  );

  const gotSse = await Promise.race([
    ssePromise,
    new Promise((resolve) => setTimeout(() => resolve(false), 9000)),
  ]);
  controller.abort();
  check("SSE message:new yetib keldi", gotSse === true);

  const reply = await call("/api/community/messages", {
    method: "POST",
    token: tokenB,
    body: { content: `Javob ${marker}`, replyToId: messageId },
  });
  if (reply.json?.data?.message?.id) createdIds.push(reply.json.data.message.id);
  check(
    "Javob (reply) 201 va replyTo bog'landi",
    reply.status === 201 &&
      reply.json?.data?.message?.replyTo?.id === messageId &&
      reply.json?.data?.message?.replyTo?.senderName === userA.name,
    `status=${reply.status}`
  );

  const reactB = await call(`/api/community/messages/${messageId}/reactions`, {
    method: "POST",
    token: tokenB,
    body: { emoji: "❤️" },
  });
  check(
    "Reaksiya qo'shildi",
    reactB.status === 200 &&
      reactB.json?.data?.reactions?.[0]?.count === 1 &&
      reactB.json?.data?.reactions?.[0]?.reacted === true,
    JSON.stringify(reactB.json?.data?.reactions)
  );

  const reactA = await call(`/api/community/messages/${messageId}/reactions`, {
    method: "POST",
    token: tokenA,
    body: { emoji: "❤️" },
  });
  check(
    "Ikkinchi foydalanuvchi reaksiyasi",
    reactA.json?.data?.reactions?.[0]?.count === 2,
    JSON.stringify(reactA.json?.data?.reactions)
  );

  const toggleOff = await call(`/api/community/messages/${messageId}/reactions`, {
    method: "POST",
    token: tokenA,
    body: { emoji: "❤️" },
  });
  check(
    "Reaksiyani olib tashlash",
    toggleOff.json?.data?.reactions?.[0]?.count === 1 &&
      toggleOff.json?.data?.reactions?.[0]?.reacted === false,
    JSON.stringify(toggleOff.json?.data?.reactions)
  );

  const badEmoji = await call(`/api/community/messages/${messageId}/reactions`, {
    method: "POST",
    token: tokenA,
    body: { emoji: "🦄" },
  });
  check("Ruxsatsiz emoji 400", badEmoji.status === 400, `status=${badEmoji.status}`);

  const list = await call("/api/community/messages?limit=10", { token: tokenA });
  const listIds = (list.json?.data?.messages || []).map((m) => m.id);
  check(
    "GET xabarlar javobni o'z ichiga oladi",
    list.status === 200 && listIds.includes(reply.json.data.message.id),
    `count=${listIds.length}`
  );

  const search = await call(`/api/community/messages?q=${encodeURIComponent(marker)}`, {
    token: tokenA,
  });
  check(
    "Qidiruv ishlaydi",
    search.status === 200 && (search.json?.data?.messages || []).length === 2,
    `found=${(search.json?.data?.messages || []).length}`
  );

  const edited = await call(`/api/community/messages/${messageId}`, {
    method: "PATCH",
    token: tokenA,
    body: { content: `Tahrirlangan ${marker}` },
  });
  check(
    "Tahrirlash 200",
    edited.status === 200 && Boolean(edited.json?.data?.message?.editedAt),
    `status=${edited.status}`
  );

  const foreignEdit = await call(`/api/community/messages/${messageId}`, {
    method: "PATCH",
    token: tokenB,
    body: { content: "boshqa foydalanuvchi" },
  });
  check("Boshqa foydalanuvchi tahrirlay olmaydi (403)", foreignEdit.status === 403);

  const foreignDelete = await call(`/api/community/messages/${messageId}`, {
    method: "DELETE",
    token: tokenB,
  });
  check("Boshqa foydalanuvchi o'chira olmaydi (403)", foreignDelete.status === 403);

  const badAttachment = await call("/api/community/messages", {
    method: "POST",
    token: tokenA,
    body: { content: "x", attachments: [{ url: "javascript:alert(1)", kind: "image", name: "a", mimeType: "image/png", sizeBytes: 1 }] },
  });
  check("Xavfli attachment rad etildi (400)", badAttachment.status === 400);

  const members = await call("/api/community/members?limit=5", { token: tokenA });
  check(
    "A'zolar ro'yxati 200",
    members.status === 200 && Array.isArray(members.json?.data?.items),
    `count=${members.json?.data?.items?.length}`
  );

  const media = await call("/api/community/media?kind=image", { token: tokenA });
  check("Media ro'yxati 200", media.status === 200);

  const typing = await call("/api/community/typing", {
    method: "POST",
    token: tokenA,
    body: { isTyping: true },
  });
  check("Typing 200", typing.status === 200);

  const read = await call("/api/community/read", {
    method: "POST",
    token: tokenA,
    body: { messageId },
  });
  check("O'qilgan belgisi 200", read.status === 200);

  const removed = await call(`/api/community/messages/${messageId}`, {
    method: "DELETE",
    token: tokenA,
  });
  check("O'z xabarini o'chirish 200", removed.status === 200, `status=${removed.status}`);

  const afterDelete = await call("/api/community/messages?limit=10", { token: tokenA });
  check(
    "O'chirilgan xabar ro'yxatda yo'q",
    !(afterDelete.json?.data?.messages || []).some((m) => m.id === messageId)
  );
} catch (error) {
  console.error("E2E ERROR:", error);
  results.push({ name: "runtime", ok: false, detail: String(error) });
} finally {
  // Remove test data so the dev database stays clean.
  try {
    if (createdIds.length > 0) {
      await client.query("DELETE FROM community_messages WHERE id = ANY($1::uuid[])", [
        createdIds,
      ]);
    }
    await client.query(
      "DELETE FROM community_messages WHERE content LIKE 'e2e-%' OR content LIKE 'Salom guruh!%' OR content LIKE 'Javob %' OR content LIKE 'Tahrirlangan %'"
    );
  } catch (error) {
    console.warn("Cleanup warning:", error.message);
  }
  client.release();
  await pool.end();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length === 0 ? 0 : 1);
}
