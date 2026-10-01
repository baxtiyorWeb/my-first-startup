import { type NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { db } from "@/server/db";
import { notificationSettings } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const NotificationSettingsSchema = z.object({
  notifyLikes: z.boolean().optional(),
  notifyComments: z.boolean().optional(),
  notifyShares: z.boolean().optional(),
  notifyFollows: z.boolean().optional(),
  notifyMentions: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  emailDigest: z.boolean().optional(),
  emailSecurity: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    let [settings] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, authUser.userId))
      .limit(1);

    if (!settings) {
      // Initialize default settings
      [settings] = await db
        .insert(notificationSettings)
        .values({
          userId: authUser.userId,
          notifyLikes: true,
          notifyComments: true,
          notifyShares: true,
          notifyFollows: true,
          notifyMentions: true,
          pushEnabled: true,
          emailDigest: true,
          emailSecurity: true,
        })
        .returning();
    }

    return successResponse({ settings });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const parseResult = NotificationSettingsSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(new Error("Noto'g'ri bildirishnoma sozlamalari"));
    }

    const updates = parseResult.data;

    const [updated] = await db
      .insert(notificationSettings)
      .values({
        userId: authUser.userId,
        ...updates,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: notificationSettings.userId,
        set: {
          ...updates,
          updatedAt: new Date(),
        },
      })
      .returning();

    return successResponse({ settings: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
