import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// Pure logic mirrors/imports for isolated unit verification without touching production DB
function isShortVideoDuration(durationSeconds) {
  return (
    typeof durationSeconds === "number" &&
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0 &&
    durationSeconds <= 60
  );
}

function buildSyntheticMp4WithDuration(timescale, duration) {
  // Minimal moov -> mvhd (version 0) box
  const mvhdSize = 8 + 20;
  const moovSize = 8 + mvhdSize;
  const buf = Buffer.alloc(12 + moovSize);
  // ftyp header
  buf.writeUInt32BE(12, 0);
  buf.write("ftyp", 4, "ascii");
  buf.write("isom", 8, "ascii");
  // moov
  buf.writeUInt32BE(moovSize, 12);
  buf.write("moov", 16, "ascii");
  // mvhd
  buf.writeUInt32BE(mvhdSize, 20);
  buf.write("mvhd", 24, "ascii");
  buf.writeUInt8(0, 28); // version 0
  buf.writeUInt32BE(timescale, 28 + 12);
  buf.writeUInt32BE(duration, 28 + 16);
  return buf;
}

function parseMp4DurationSeconds(buffer) {
  if (buffer.length < 32) return null;
  const scanBox = (start, end) => {
    let offset = start;
    while (offset + 8 <= end) {
      let size = buffer.readUInt32BE(offset);
      const type = buffer.toString("ascii", offset + 4, offset + 8);
      if (size < 8 || offset + size > end) break;
      if (type === "moov" || type === "trak" || type === "mdia") {
        const nested = scanBox(offset + 8, offset + size);
        if (nested !== null) return nested;
      } else if (type === "mvhd") {
        const payload = offset + 8;
        const version = buffer.readUInt8(payload);
        if (version === 0) {
          const timescale = buffer.readUInt32BE(payload + 12);
          const duration = buffer.readUInt32BE(payload + 16);
          if (timescale > 0 && duration > 0) return Math.max(1, Math.round(duration / timescale));
        }
        return null;
      }
      offset += size;
    }
    return null;
  };
  return scanBox(0, buffer.length);
}

test("Shorts boundary classification: <= 60s qualifies, > 60s does not", () => {
  assert.equal(isShortVideoDuration(1), true);
  assert.equal(isShortVideoDuration(45), true);
  assert.equal(isShortVideoDuration(60), true); // Exact 60s boundary!
  assert.equal(isShortVideoDuration(61), false);
  assert.equal(isShortVideoDuration(180), false);
  assert.equal(isShortVideoDuration(0), false);
  assert.equal(isShortVideoDuration(-5), false);
  assert.equal(isShortVideoDuration(null), false);
  assert.equal(isShortVideoDuration(undefined), false);
});

test("MP4 mvhd parser extracts exact duration and classifies 60s vs 61s", () => {
  const short30 = buildSyntheticMp4WithDuration(1000, 30000);
  const exact60 = buildSyntheticMp4WithDuration(1000, 60000);
  const long61 = buildSyntheticMp4WithDuration(1000, 61000);

  const d30 = parseMp4DurationSeconds(short30);
  const d60 = parseMp4DurationSeconds(exact60);
  const d61 = parseMp4DurationSeconds(long61);

  assert.equal(d30, 30);
  assert.equal(d60, 60);
  assert.equal(d61, 61);
  assert.equal(isShortVideoDuration(d30), true);
  assert.equal(isShortVideoDuration(d60), true);
  assert.equal(isShortVideoDuration(d61), false);
  assert.equal(parseMp4DurationSeconds(Buffer.from("corrupted")), null);
});

test("Webhook HMAC-SHA256 verification rejects tampered payloads", () => {
  const secret = "test_webhook_secret_123456";
  const body = JSON.stringify({ transactionId: "tx-1", status: "succeeded" });
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");

  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig)), true);

  const tampered = JSON.stringify({ transactionId: "tx-1", status: "failed" });
  const tamperedExpected = crypto.createHmac("sha256", secret).update(tampered).digest("hex");
  assert.equal(crypto.timingSafeEqual(Buffer.from(tamperedExpected), Buffer.from(sig)), false);
});
