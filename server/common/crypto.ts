import crypto from "crypto";

/**
 * Hash password using Node.js built-in crypto.scrypt with a cryptographically secure 16-byte random salt.
 * Formats output as "salt:derivedKeyHex".
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verify password against stored "salt:derivedKeyHex" hash using constant-time comparison.
 * If the stored hash is legacy plaintext, it handles comparison safely and allows re-hashing.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;

  // Check if hash matches "salt:key" format
  if (storedHash.includes(":")) {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;

    return new Promise((resolve) => {
      crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
        if (err) return resolve(false);
        try {
          const keyBuffer = Buffer.from(key, "hex");
          if (keyBuffer.length !== derivedKey.length) {
            return resolve(false);
          }
          resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
        } catch {
          resolve(false);
        }
      });
    });
  }

  // Fallback for legacy development plaintext passwords (timing-safe comparison)
  const bufA = Buffer.from(password);
  const bufB = Buffer.from(storedHash);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
