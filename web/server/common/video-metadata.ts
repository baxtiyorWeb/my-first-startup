export const SHORTS_MAX_DURATION_SECONDS = 60;

/**
 * Canonical Shorts classification rule:
 * - duration <= 60s -> true (appears in both normal feed and Shorts feed)
 * - duration > 60s  -> false (appears only in normal feed)
 * - missing/invalid -> false
 */
export function isShortVideoDuration(durationSeconds: number | null | undefined): boolean {
  return (
    typeof durationSeconds === "number" &&
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0 &&
    durationSeconds <= SHORTS_MAX_DURATION_SECONDS
  );
}

/**
 * Extract integer duration in seconds from an MP4/MOV buffer by locating the `mvhd` atom.
 * Supports both version 0 (32-bit) and version 1 (64-bit) `mvhd` boxes.
 */
export function parseMp4DurationSeconds(buffer: Buffer): number | null {
  if (buffer.length < 32) return null;

  const scanBox = (start: number, end: number): number | null => {
    let offset = start;
    while (offset + 8 <= end) {
      let size = buffer.readUInt32BE(offset);
      const type = buffer.toString("ascii", offset + 4, offset + 8);
      let headerSize = 8;

      if (size === 1) {
        if (offset + 16 > end) break;
        const hi = buffer.readUInt32BE(offset + 8);
        const lo = buffer.readUInt32BE(offset + 12);
        size = hi * 0x100000000 + lo;
        headerSize = 16;
      } else if (size === 0) {
        size = end - offset;
      }

      if (size < headerSize || offset + size > end) break;

      if (type === "moov" || type === "trak" || type === "mdia") {
        const nested = scanBox(offset + headerSize, offset + size);
        if (nested !== null) return nested;
      } else if (type === "mvhd") {
        const payload = offset + headerSize;
        if (payload + 20 > offset + size) return null;
        const version = buffer.readUInt8(payload);
        if (version === 0) {
          if (payload + 20 > end) return null;
          const timescale = buffer.readUInt32BE(payload + 12);
          const duration = buffer.readUInt32BE(payload + 16);
          if (timescale > 0 && duration > 0) {
            return Math.max(1, Math.round(duration / timescale));
          }
        } else if (version === 1) {
          if (payload + 32 > end) return null;
          const timescale = buffer.readUInt32BE(payload + 20);
          const durHi = buffer.readUInt32BE(payload + 24);
          const durLo = buffer.readUInt32BE(payload + 28);
          const duration = durHi * 0x100000000 + durLo;
          if (timescale > 0 && duration > 0) {
            return Math.max(1, Math.round(duration / timescale));
          }
        }
        return null;
      }

      offset += size;
    }
    return null;
  };

  return scanBox(0, buffer.length);
}

/**
 * Extract integer duration in seconds from a WebM (EBML/Matroska) buffer
 * by reading TimecodeScale (0x2AD7B1) and Duration (0x4489) inside Segment -> Info.
 */
export function parseWebmDurationSeconds(buffer: Buffer): number | null {
  if (buffer.length < 16) return null;
  // Locate Duration element ID (0x44 0x89) and TimecodeScale (0x2A 0xD7 0xB1)
  let timecodeScaleNs = 1_000_000; // default 1ms in nanoseconds

  for (let i = 0; i < Math.min(buffer.length - 8, 65536); i++) {
    if (buffer[i] === 0x2a && buffer[i + 1] === 0xd7 && buffer[i + 2] === 0xb1) {
      const sizeByte = buffer[i + 3];
      const len = sizeByte & 0x7f;
      if (len >= 1 && len <= 4 && i + 4 + len <= buffer.length) {
        let val = 0;
        for (let b = 0; b < len; b++) {
          val = (val << 8) | buffer[i + 4 + b];
        }
        if (val > 0) timecodeScaleNs = val;
      }
    }
    if (buffer[i] === 0x44 && buffer[i + 1] === 0x89) {
      const sizeByte = buffer[i + 2];
      const len = sizeByte & 0x7f;
      if (len === 4 && i + 7 <= buffer.length) {
        const raw = buffer.readFloatBE(i + 3);
        if (Number.isFinite(raw) && raw > 0) {
          return Math.max(1, Math.round((raw * timecodeScaleNs) / 1_000_000_000));
        }
      } else if (len === 8 && i + 11 <= buffer.length) {
        const raw = buffer.readDoubleBE(i + 3);
        if (Number.isFinite(raw) && raw > 0) {
          return Math.max(1, Math.round((raw * timecodeScaleNs) / 1_000_000_000));
        }
      }
    }
  }
  return null;
}

export function extractVideoDurationSeconds(buffer: Buffer, mimeType: string): number | null {
  const normalized = mimeType.toLowerCase();
  if (normalized === "video/mp4" || normalized === "video/quicktime") {
    return parseMp4DurationSeconds(buffer);
  }
  if (normalized === "video/webm") {
    return parseWebmDurationSeconds(buffer);
  }
  return null;
}
