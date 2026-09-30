/**
 * Utility for generating high-quality vector avatars via Dicebear API.
 * Uses diverse collections matching the autonomous bot styles (personas, micah, bottts, avataaars).
 */

export const DICEBEAR_COLLECTIONS = ["micah", "personas", "bottts", "avataaars"] as const;

export type DicebearCollection = (typeof DICEBEAR_COLLECTIONS)[number];

export function generateRandomAvatar(seed?: string, collection?: DicebearCollection): string {
  const chosenCollection =
    collection ||
    DICEBEAR_COLLECTIONS[Math.floor(Math.random() * DICEBEAR_COLLECTIONS.length)];

  const chosenSeed =
    seed ||
    `user_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;

  return `https://api.dicebear.com/7.x/${chosenCollection}/svg?seed=${encodeURIComponent(chosenSeed)}`;
}
