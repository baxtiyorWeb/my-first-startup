/**
 * Utility functions for user identification and comparisons.
 */

export interface MinimalUser {
  id?: string | null;
  handle?: string | null;
}

/**
 * Robustly check if two user entities represent the same user.
 * Normalizes handles (strips leading '@' and lowercases) and checks user IDs.
 */
export function isSameUser(
  userA?: MinimalUser | null,
  userB?: MinimalUser | null
): boolean {
  if (!userA || !userB) return false;

  // 1. Compare IDs if both are present
  if (userA.id && userB.id) {
    if (userA.id === userB.id) return true;
    if (userA.id === "me" || userB.id === "me") return true;
  }

  // 2. Compare Handles (normalizing leading '@' and case)
  if (userA.handle && userB.handle) {
    const handleA = userA.handle.replace(/^@/, "").toLowerCase().trim();
    const handleB = userB.handle.replace(/^@/, "").toLowerCase().trim();
    if (handleA && handleB && handleA === handleB) {
      return true;
    }
  }

  return false;
}
