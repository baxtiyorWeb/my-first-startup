import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users, userSessions } from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import { signSessionToken, type AuthUserPayload } from "@/server/common/auth-guard";
import { generateRandomAvatar } from "@/lib/avatar";

/**
 * Complete onboarding: save name, handle, role, bio
 */
export async function completeOnboarding(
  userId: string,
  data: { name: string; handle: string; role: string; bio?: string }
): Promise<AuthUserPayload> {
  const cleanHandle = data.handle.startsWith("@") ? data.handle : `@${data.handle.trim()}`;

  try {
    // Check if handle is already taken by another user
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.handle, cleanHandle))
      .limit(1);

    if (existing.length > 0 && existing[0].id !== userId) {
      throw AppError.conflict("Ushbu @handle allaqachon band. Boshqa nom tanlang");
    }

    // Ensure the user has an avatar automatically assigned and saved in DB
    const [existingUser] = await db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const autoAvatar = existingUser?.avatarUrl || generateRandomAvatar(cleanHandle);

    const [updated] = await db
      .update(users)
      .set({
        name: data.name.trim(),
        handle: cleanHandle,
        role: data.role.trim() || "Go-getter",
        bio: (data.bio || "").trim(),
        avatarUrl: autoAvatar,
        isOnboarded: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return {
      userId: updated.id,
      phone: updated.phone || null,
      email: updated.email || null,
      handle: updated.handle,
      name: updated.name,
      role: updated.role,
      avatarUrl: updated.avatarUrl || null,
      isOnboarded: true,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[AUTH] Error completing onboarding:", err);
    throw AppError.internal("Onboarding ma’lumotlarini saqlashda xatolik yuz berdi");
  }
}

/**
 * Handle Google OAuth authentication / registration:
 * 1. Finds user by googleId or email
 * 2. If new user, creates user record with isOnboarded = false (so they proceed to onboarding)
 * 3. Signs JWT session token
 */
export async function handleGoogleAuth(googleUser: {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}): Promise<{ token: string; user: AuthUserPayload }> {
  const { googleId, email, name, avatarUrl } = googleUser;

  // 1. Look for existing user with this googleId
  let existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.googleId, googleId))
    .limit(1);

  // 2. If not found by googleId, check by email
  if (existingUsers.length === 0 && email) {
    existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUsers.length > 0) {
      // Link googleId to existing account
      await db
        .update(users)
        .set({
          googleId,
          avatarUrl: existingUsers[0].avatarUrl || avatarUrl || null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUsers[0].id));
    }
  }

  let userRecord: AuthUserPayload;

  if (existingUsers.length > 0) {
    const u = existingUsers[0];

    // Automatically reactivate account upon fresh Google login
    if (u.isDeactivated) {
      await db
        .update(users)
        .set({ isDeactivated: false, updatedAt: new Date() })
        .where(eq(users.id, u.id));
    }

    const resolvedAvatar = u.avatarUrl || avatarUrl || generateRandomAvatar(u.handle);
    if (!u.avatarUrl && resolvedAvatar) {
      db.update(users)
        .set({ avatarUrl: resolvedAvatar })
        .where(eq(users.id, u.id))
        .catch(() => {});
    }

    userRecord = {
      userId: u.id,
      phone: u.phone || null,
      email: u.email || email,
      handle: u.handle,
      name: u.name,
      role: u.role,
      avatarUrl: resolvedAvatar,
      isOnboarded: u.isOnboarded,
    };
  } else {
    // 3. Create new provisional user for Google sign-in
    // Generate clean temporary handle from email or random hex
    const emailPrefix = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 15);
    const randomSuffix = crypto.randomBytes(2).toString("hex");
    const tempHandle = `@${emailPrefix || "user"}_${randomSuffix}`;
    const initialAvatar = avatarUrl || generateRandomAvatar(tempHandle);

    const [newUser] = await db
      .insert(users)
      .values({
        googleId,
        email,
        name: name.trim() || "Go-getter",
        handle: tempHandle,
        role: "Go-getter",
        avatarUrl: initialAvatar,
        isOnboarded: false, // New users MUST complete onboarding!
      })
      .returning();

    userRecord = {
      userId: newUser.id,
      phone: null,
      email: newUser.email,
      handle: newUser.handle,
      name: newUser.name,
      role: newUser.role,
      avatarUrl: newUser.avatarUrl,
      isOnboarded: false,
    };
  }

  // Create an active session in userSessions
  const [createdSession] = await db
    .insert(userSessions)
    .values({
      userId: userRecord.userId,
      deviceName: "Brauzer seansi",
      browser: "Google Chrome / Web",
      ipAddress: "127.0.0.1",
      location: "Toshkent, O‘zbekiston",
      isCurrent: true,
      lastActiveAt: new Date(),
    })
    .returning();

  userRecord.sessionId = createdSession.id;

  // 4. Sign JWT session token
  const token = await signSessionToken(userRecord);
  return { token, user: userRecord };
}
