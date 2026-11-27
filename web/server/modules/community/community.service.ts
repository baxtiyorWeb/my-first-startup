import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  lt,
  ne,
  sql,
} from "drizzle-orm";
import { db } from "@/server/db";
import {
  communities,
  communityMembers,
  communityMessages,
  communityReactions,
  users,
  type CommunityAttachment,
} from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import { enforceRateLimit } from "@/server/common/rate-limiter";
import { realtimeHub } from "@/server/modules/messages/realtime-hub";
import { triggerNotification } from "@/server/modules/notifications/notifications.service";

/**
 * Geters has exactly ONE official public community. There is no group
 * creation, discovery or paid access — every registered account can read and
 * write in this single shared channel.
 */
export const OFFICIAL_COMMUNITY_SLUG = "geters-community";

export const COMMUNITY_RULES = [
  "Hurmat bilan muloqot qiling.",
  "Spam va reklama joylamang.",
  "Mavzudan chetga chiqmaslikka harakat qiling.",
  "Jamiyat qoidalariga rioya qiling.",
];

/** Emojis allowed as reactions. Keeps the UI consistent and the table tidy. */
export const ALLOWED_REACTIONS = [
  "❤️",
  "👍",
  "🔥",
  "😂",
  "🎉",
  "🙏",
  "😮",
  "😢",
  "👏",
  "💯",
] as const;

const MAX_CONTENT_LENGTH = 4000;
const MAX_ATTACHMENTS = 6;
const MAX_ATTACHMENT_NAME = 200;
const ALLOWED_TYPING_BROADCAST_MS = 5000;

export interface CommunityViewer {
  userId: string;
  role?: string | null;
  email?: string | null;
}

export interface CommunityReactionDto {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface CommunitySenderDto {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  verified: boolean;
  role: string;
}

export interface CommunityReplyPreviewDto {
  id: string;
  content: string;
  messageType: string;
  senderName: string | null;
  senderHandle: string | null;
  attachmentKind: "image" | "video" | "file" | null;
  isDeleted: boolean;
}

export interface CommunityMessageDto {
  id: string;
  content: string;
  messageType: "text" | "image" | "video" | "file" | "system";
  attachments: CommunityAttachment[];
  clientMessageId: string | null;
  replyTo: CommunityReplyPreviewDto | null;
  reactions: CommunityReactionDto[];
  sender: CommunitySenderDto;
  isMine: boolean;
  canEdit: boolean;
  canDelete: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityOverviewDto {
  community: {
    id: string;
    slug: string;
    name: string;
    description: string;
    isOfficial: boolean;
    verified: boolean;
    createdAt: string;
  };
  memberCount: number;
  onlineCount: number;
  unreadCount: number;
  isMuted: boolean;
  canModerate: boolean;
  rules: string[];
  mediaCounts: { image: number; video: number; file: number };
}

interface MessageRow {
  id: string;
  content: string;
  messageType: string;
  attachments: CommunityAttachment[];
  clientMessageId: string | null;
  replyToId: string | null;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  senderId: string;
  senderName: string;
  senderHandle: string;
  senderAvatarUrl: string | null;
  senderVerified: boolean;
  senderRole: string;
}

let cachedCommunity: {
  id: string;
  slug: string;
  name: string;
  description: string;
  isOfficial: boolean;
  verified: boolean;
  createdAt: Date;
} | null = null;

const typingTimers = new Map<string, NodeJS.Timeout>();
const typingNames = new Map<string, string>();

export function isCommunityModerator(viewer: CommunityViewer): boolean {
  const role = (viewer.role || "").toUpperCase();
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const email = (viewer.email || "").toLowerCase();
  return adminEmails.length > 0 && adminEmails.includes(email);
}

/** Idempotently resolve (and seed once) the single official community row. */
async function getOfficialCommunity() {
  if (cachedCommunity) return cachedCommunity;

  const [existing] = await db
    .select()
    .from(communities)
    .where(eq(communities.slug, OFFICIAL_COMMUNITY_SLUG))
    .limit(1);

  if (existing) {
    cachedCommunity = existing;
    return existing;
  }

  await db
    .insert(communities)
    .values({
      slug: OFFICIAL_COMMUNITY_SLUG,
      name: "Geters Community",
      description:
        "Geters.uz rasmiy ommaviy guruhi. Yangiliklar, e'lonlar, savol-javob va umumiy muhokamalar.",
      isOfficial: true,
      verified: true,
    })
    .onConflictDoNothing();

  const [created] = await db
    .select()
    .from(communities)
    .where(eq(communities.slug, OFFICIAL_COMMUNITY_SLUG))
    .limit(1);

  if (!created) {
    throw AppError.internal("Rasmiy guruhni yuklab bo'lmadi");
  }

  cachedCommunity = created;
  return created;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function normalizeAttachments(raw: unknown): CommunityAttachment[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw AppError.badRequest("Ilovalar formati noto'g'ri");
  }
  if (raw.length > MAX_ATTACHMENTS) {
    throw AppError.badRequest(`Bitta xabarga ${MAX_ATTACHMENTS} tagacha fayl biriktirish mumkin`);
  }

  return raw.map((item) => {
    if (!item || typeof item !== "object") {
      throw AppError.badRequest("Fayl ma'lumoti noto'g'ri");
    }
    const candidate = item as Record<string, unknown>;
    const url = typeof candidate.url === "string" ? candidate.url.trim() : "";
    const kind = candidate.kind;
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    const mimeType = typeof candidate.mimeType === "string" ? candidate.mimeType.trim() : "";
    const sizeBytes = Number(candidate.sizeBytes);

    if (!/^https?:\/\//i.test(url) || url.length > 1000) {
      throw AppError.badRequest("Fayl havolasi noto'g'ri");
    }
    if (kind !== "image" && kind !== "video" && kind !== "file") {
      throw AppError.badRequest("Fayl turi qo'llab-quvvatlanmaydi");
    }
    if (!name || name.length > MAX_ATTACHMENT_NAME) {
      throw AppError.badRequest("Fayl nomi noto'g'ri");
    }
    if (mimeType.length > 120) {
      throw AppError.badRequest("Fayl MIME turi noto'g'ri");
    }
    if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
      throw AppError.badRequest("Fayl hajmi noto'g'ri");
    }

    return {
      url,
      kind,
      name,
      mimeType: mimeType || "application/octet-stream",
      sizeBytes: Math.round(sizeBytes),
    };
  });
}

function resolveMessageType(attachments: CommunityAttachment[]): CommunityMessageDto["messageType"] {
  if (attachments.length === 0) return "text";
  if (attachments.some((item) => item.kind === "video")) return "video";
  if (attachments.every((item) => item.kind === "image")) return "image";
  return "file";
}

function toSenderDto(row: MessageRow): CommunitySenderDto {
  return {
    id: row.senderId,
    name: row.senderName,
    handle: row.senderHandle,
    avatarUrl: row.senderAvatarUrl,
    verified: row.senderVerified,
    role: row.senderRole,
  };
}

export class CommunityService {
  /** Overview payload for the chat header and right information panel. */
  public static async getOverview(viewer: CommunityViewer): Promise<CommunityOverviewDto> {
    const community = await getOfficialCommunity();

    const [[memberStats], [membership], mediaCounts] = await Promise.all([
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.isDeactivated, false)),
      db
        .select()
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, community.id),
            eq(communityMembers.userId, viewer.userId)
          )
        )
        .limit(1),
      this.countMedia(community.id),
    ]);

    const unreadCount = await this.getUnreadCount(community.id, viewer.userId);

    return {
      community: {
        id: community.id,
        slug: community.slug,
        name: community.name,
        description: community.description,
        isOfficial: community.isOfficial,
        verified: community.verified,
        createdAt: community.createdAt.toISOString(),
      },
      memberCount: memberStats?.total ?? 0,
      onlineCount: realtimeHub.getOnlineCount(),
      unreadCount,
      isMuted: membership?.isMuted ?? false,
      canModerate: isCommunityModerator(viewer),
      rules: COMMUNITY_RULES,
      mediaCounts: mediaCounts,
    };
  }

  /** Cursor-paginated message history (newest page first, returned chronologically). */
  public static async listMessages(
    viewer: CommunityViewer,
    options: { cursor?: string | null; limit?: number; search?: string | null } = {}
  ): Promise<{ messages: CommunityMessageDto[]; hasMore: boolean; nextCursor: string | null }> {
    const community = await getOfficialCommunity();
    const limit = Math.min(Math.max(options.limit ?? 30, 1), 50);
    const search = options.search?.trim();

    const conditions = [
      eq(communityMessages.communityId, community.id),
      isNull(communityMessages.deletedAt),
    ];

    if (search) {
      if (search.length < 2) {
        throw AppError.badRequest("Qidiruv uchun kamida 2 belgi kiriting");
      }
      conditions.push(ilike(communityMessages.content, `%${escapeLike(search)}%`));
    } else if (options.cursor) {
      const cursorDate = new Date(options.cursor);
      if (Number.isNaN(cursorDate.getTime())) {
        throw AppError.badRequest("Sahifalash kursor i noto'g'ri");
      }
      conditions.push(lt(communityMessages.createdAt, cursorDate));
    }

    const rows = await db
      .select({
        id: communityMessages.id,
        content: communityMessages.content,
        messageType: communityMessages.messageType,
        attachments: communityMessages.attachments,
        clientMessageId: communityMessages.clientMessageId,
        replyToId: communityMessages.replyToId,
        editedAt: communityMessages.editedAt,
        createdAt: communityMessages.createdAt,
        updatedAt: communityMessages.updatedAt,
        senderId: users.id,
        senderName: users.name,
        senderHandle: users.handle,
        senderAvatarUrl: users.avatarUrl,
        senderVerified: users.verified,
        senderRole: users.role,
      })
      .from(communityMessages)
      .innerJoin(users, eq(communityMessages.senderId, users.id))
      .where(and(...conditions))
      .orderBy(desc(communityMessages.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    page.reverse();

    const messages = await this.decorate(page, viewer);

    return {
      messages,
      hasMore,
      nextCursor: hasMore ? page[0]?.createdAt.toISOString() ?? null : null,
    };
  }

  /** Send a message with validation, idempotency and realtime fan-out. */
  public static async sendMessage(
    viewer: CommunityViewer,
    input: {
      content?: string;
      attachments?: unknown;
      replyToId?: string | null;
      clientMessageId?: string | null;
    }
  ): Promise<CommunityMessageDto> {
    enforceRateLimit(`community:send:${viewer.userId}`, 20, 60);

    const community = await getOfficialCommunity();
    const content = (input.content || "").trim();
    const attachments = normalizeAttachments(input.attachments);

    if (!content && attachments.length === 0) {
      throw AppError.badRequest("Xabar bo'sh bo'lishi mumkin emas");
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      throw AppError.badRequest(`Xabar ${MAX_CONTENT_LENGTH} belgidan oshmasligi kerak`);
    }

    const clientMessageId =
      typeof input.clientMessageId === "string" && input.clientMessageId.trim().length > 0
        ? input.clientMessageId.trim().slice(0, 64)
        : null;

    if (clientMessageId) {
      const [existing] = await db
        .select({ id: communityMessages.id })
        .from(communityMessages)
        .where(
          and(
            eq(communityMessages.senderId, viewer.userId),
            eq(communityMessages.clientMessageId, clientMessageId)
          )
        )
        .limit(1);

      if (existing) {
        const duplicate = await this.getMessage(viewer, existing.id);
        if (duplicate) return duplicate;
      }
    }

    let replyToId: string | null = null;
    let repliedMessage: { id: string; senderId: string; content: string } | null = null;

    if (input.replyToId) {
      const [target] = await db
        .select({
          id: communityMessages.id,
          senderId: communityMessages.senderId,
          content: communityMessages.content,
          communityId: communityMessages.communityId,
        })
        .from(communityMessages)
        .where(eq(communityMessages.id, input.replyToId))
        .limit(1);

      if (!target || target.communityId !== community.id) {
        throw AppError.badRequest("Javob berilayotgan xabar topilmadi");
      }
      replyToId = target.id;
      repliedMessage = { id: target.id, senderId: target.senderId, content: target.content };
    }

    const [inserted] = await db
      .insert(communityMessages)
      .values({
        communityId: community.id,
        senderId: viewer.userId,
        content,
        messageType: resolveMessageType(attachments),
        attachments,
        clientMessageId,
        replyToId,
      })
      .returning({ id: communityMessages.id, createdAt: communityMessages.createdAt });

    if (!inserted) {
      throw AppError.internal("Xabarni saqlab bo'lmadi");
    }

    await this.ensureMembership(community.id, viewer.userId);
    await db
      .update(communityMembers)
      .set({ lastReadMessageId: inserted.id, lastReadAt: inserted.createdAt })
      .where(
        and(
          eq(communityMembers.communityId, community.id),
          eq(communityMembers.userId, viewer.userId)
        )
      );

    const dto = await this.getMessage(viewer, inserted.id);
    if (!dto) {
      throw AppError.internal("Xabarni yuklab bo'lmadi");
    }

    realtimeHub.broadcast({ type: "message:new", data: { message: dto } });

    if (repliedMessage && repliedMessage.senderId !== viewer.userId) {
      const preview = content
        ? content.slice(0, 90)
        : attachments[0]?.name || "Ilova yuborildi";
      triggerNotification({
        recipientId: repliedMessage.senderId,
        actorId: viewer.userId,
        type: "reply",
        targetId: inserted.id,
        targetType: "post",
        title: `${dto.sender.name} sizga javob berdi`,
        message: preview,
        link: `/dashboard/community?m=${inserted.id}`,
      }).catch((error) => {
        console.warn("[COMMUNITY] Reply notification failed:", error);
      });
    }

    return dto;
  }

  public static async editMessage(
    viewer: CommunityViewer,
    messageId: string,
    rawContent: string
  ): Promise<CommunityMessageDto> {
    enforceRateLimit(`community:edit:${viewer.userId}`, 20, 60);

    const community = await getOfficialCommunity();
    const [row] = await db
      .select({
        id: communityMessages.id,
        senderId: communityMessages.senderId,
        communityId: communityMessages.communityId,
        deletedAt: communityMessages.deletedAt,
        messageType: communityMessages.messageType,
      })
      .from(communityMessages)
      .where(eq(communityMessages.id, messageId))
      .limit(1);

    if (!row || row.communityId !== community.id || row.deletedAt) {
      throw AppError.notFound("Xabar topilmadi");
    }

    const isModerator = isCommunityModerator(viewer);
    if (row.senderId !== viewer.userId && !isModerator) {
      throw AppError.forbidden("Faqat o'z xabaringizni tahrirlashingiz mumkin");
    }
    if (row.messageType !== "text" && row.messageType !== "file" && row.messageType !== "image" && row.messageType !== "video") {
      throw AppError.badRequest("Bu xabarni tahrirlab bo'lmaydi");
    }

    const content = (rawContent || "").trim();
    if (!content) {
      throw AppError.badRequest("Xabar matni bo'sh bo'lishi mumkin emas");
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      throw AppError.badRequest(`Xabar ${MAX_CONTENT_LENGTH} belgidan oshmasligi kerak`);
    }

    const now = new Date();
    await db
      .update(communityMessages)
      .set({ content, editedAt: now, updatedAt: now })
      .where(eq(communityMessages.id, messageId));

    const dto = await this.getMessage(viewer, messageId);
    if (!dto) {
      throw AppError.internal("Xabar yangilanmadi");
    }

    realtimeHub.broadcast({ type: "message:updated", data: { message: dto } });
    return dto;
  }

  public static async deleteMessage(
    viewer: CommunityViewer,
    messageId: string
  ): Promise<{ id: string }> {
    enforceRateLimit(`community:delete:${viewer.userId}`, 30, 60);

    const community = await getOfficialCommunity();
    const [row] = await db
      .select({
        id: communityMessages.id,
        senderId: communityMessages.senderId,
        communityId: communityMessages.communityId,
        deletedAt: communityMessages.deletedAt,
      })
      .from(communityMessages)
      .where(eq(communityMessages.id, messageId))
      .limit(1);

    if (!row || row.communityId !== community.id) {
      throw AppError.notFound("Xabar topilmadi");
    }
    if (row.deletedAt) {
      return { id: row.id };
    }

    const isModerator = isCommunityModerator(viewer);
    if (row.senderId !== viewer.userId && !isModerator) {
      throw AppError.forbidden("Faqat o'z xabaringizni o'chirishingiz mumkin");
    }

    await db
      .update(communityMessages)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(communityMessages.id, messageId));

    realtimeHub.broadcast({
      type: "message:deleted",
      data: { messageId: row.id, moderatorId: isModerator && row.senderId !== viewer.userId ? viewer.userId : null },
    });

    return { id: row.id };
  }

  public static async toggleReaction(
    viewer: CommunityViewer,
    messageId: string,
    emoji: string
  ): Promise<{ messageId: string; reactions: CommunityReactionDto[] }> {
    enforceRateLimit(`community:react:${viewer.userId}`, 60, 60);

    if (!ALLOWED_REACTIONS.includes(emoji as (typeof ALLOWED_REACTIONS)[number])) {
      throw AppError.badRequest("Bu reaksiya qo'llab-quvvatlanmaydi");
    }

    const community = await getOfficialCommunity();
    const [message] = await db
      .select({ id: communityMessages.id, communityId: communityMessages.communityId })
      .from(communityMessages)
      .where(and(eq(communityMessages.id, messageId), isNull(communityMessages.deletedAt)))
      .limit(1);

    if (!message || message.communityId !== community.id) {
      throw AppError.notFound("Xabar topilmadi");
    }

    const inserted = await db
      .insert(communityReactions)
      .values({ messageId, userId: viewer.userId, emoji })
      .onConflictDoNothing()
      .returning({ userId: communityReactions.userId });

    const added = inserted.length > 0;
    if (!added) {
      await db
        .delete(communityReactions)
        .where(
          and(
            eq(communityReactions.messageId, messageId),
            eq(communityReactions.userId, viewer.userId),
            eq(communityReactions.emoji, emoji)
          )
        );
    }

    const reactions = await this.loadReactions(viewer.userId, [messageId]);
    const list = reactions.get(messageId) || [];

    realtimeHub.broadcast({
      type: "message:reaction",
      data: {
        messageId,
        emoji,
        userId: viewer.userId,
        added,
        reactions: list.map(({ emoji: itemEmoji, count }) => ({ emoji: itemEmoji, count })),
      },
    });

    return { messageId, reactions: list };
  }

  public static async markRead(
    viewer: CommunityViewer,
    messageId?: string | null
  ): Promise<{ unreadCount: number }> {
    const community = await getOfficialCommunity();

    let resolvedId = messageId || null;
    let readAt = new Date();

    if (resolvedId) {
      const [target] = await db
        .select({ id: communityMessages.id, createdAt: communityMessages.createdAt })
        .from(communityMessages)
        .where(eq(communityMessages.id, resolvedId))
        .limit(1);
      if (!target) {
        throw AppError.notFound("Xabar topilmadi");
      }
      readAt = target.createdAt;
    } else {
      const [latest] = await db
        .select({ id: communityMessages.id, createdAt: communityMessages.createdAt })
        .from(communityMessages)
        .where(
          and(
            eq(communityMessages.communityId, community.id),
            isNull(communityMessages.deletedAt)
          )
        )
        .orderBy(desc(communityMessages.createdAt))
        .limit(1);
      resolvedId = latest?.id ?? null;
      readAt = latest?.createdAt ?? new Date();
    }

    await this.ensureMembership(community.id, viewer.userId);
    await db
      .update(communityMembers)
      .set({ lastReadMessageId: resolvedId, lastReadAt: readAt })
      .where(
        and(
          eq(communityMembers.communityId, community.id),
          eq(communityMembers.userId, viewer.userId)
        )
      );

    realtimeHub.broadcast({
      type: "message:read",
      data: { userId: viewer.userId, lastReadMessageId: resolvedId },
    });

    return { unreadCount: 0 };
  }

  public static async updateMembership(
    viewer: CommunityViewer,
    input: { muted?: boolean }
  ): Promise<{ isMuted: boolean }> {
    const community = await getOfficialCommunity();
    await this.ensureMembership(community.id, viewer.userId);

    if (typeof input.muted === "boolean") {
      await db
        .update(communityMembers)
        .set({ isMuted: input.muted })
        .where(
          and(
            eq(communityMembers.communityId, community.id),
            eq(communityMembers.userId, viewer.userId)
          )
        );
    }

    const [membership] = await db
      .select({ isMuted: communityMembers.isMuted })
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, community.id),
          eq(communityMembers.userId, viewer.userId)
        )
      )
      .limit(1);

    return { isMuted: membership?.isMuted ?? false };
  }

  /** Ephemeral typing indicator broadcast (auto-expires). */
  public static async setTyping(
    viewer: CommunityViewer,
    isTyping: boolean
  ): Promise<{ isTyping: boolean }> {
    const [user] = await db
      .select({ name: users.name, handle: users.handle })
      .from(users)
      .where(eq(users.id, viewer.userId))
      .limit(1);

    if (!user) {
      throw AppError.unauthorized("Foydalanuvchi topilmadi");
    }

    typingNames.set(viewer.userId, user.name);

    const existing = typingTimers.get(viewer.userId);
    if (existing) {
      clearTimeout(existing);
      typingTimers.delete(viewer.userId);
    }

    if (isTyping) {
      const timer = setTimeout(() => {
        typingTimers.delete(viewer.userId);
        typingNames.delete(viewer.userId);
        realtimeHub.broadcast({
          type: "typing:stop",
          data: { userId: viewer.userId, name: user.name, handle: user.handle },
        });
      }, ALLOWED_TYPING_BROADCAST_MS);
      typingTimers.set(viewer.userId, timer);
      realtimeHub.broadcast({
        type: "typing:start",
        data: { userId: viewer.userId, name: user.name, handle: user.handle },
      });
    } else {
      typingNames.delete(viewer.userId);
      realtimeHub.broadcast({
        type: "typing:stop",
        data: { userId: viewer.userId, name: user.name, handle: user.handle },
      });
    }

    return { isTyping };
  }

  /** Active members list (most recently active first) with presence flags. */
  public static async listMembers(
    viewer: CommunityViewer,
    options: { cursor?: string | null; limit?: number } = {}
  ): Promise<{
    items: Array<{
      id: string;
      name: string;
      handle: string;
      avatarUrl: string | null;
      verified: boolean;
      role: string;
      isOnline: boolean;
      lastActiveAt: string | null;
    }>;
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    void viewer;
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const offset = Math.max(Number.parseInt(options.cursor || "0", 10) || 0, 0);

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        handle: users.handle,
        avatarUrl: users.avatarUrl,
        verified: users.verified,
        role: users.role,
        lastActiveAt: sql<Date | null>`max(${communityMessages.createdAt})`,
      })
      .from(users)
      .leftJoin(
        communityMessages,
        and(
          eq(communityMessages.senderId, users.id),
          isNull(communityMessages.deletedAt)
        )
      )
      .where(eq(users.isDeactivated, false))
      .groupBy(users.id, users.name, users.handle, users.avatarUrl, users.verified, users.role)
      .orderBy(sql`max(${communityMessages.createdAt}) DESC NULLS LAST`, asc(users.name))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: page.map((row) => ({
        id: row.id,
        name: row.name,
        handle: row.handle,
        avatarUrl: row.avatarUrl,
        verified: row.verified,
        role: row.role,
        isOnline: realtimeHub.isUserOnline(row.id),
        lastActiveAt: row.lastActiveAt ? new Date(row.lastActiveAt).toISOString() : null,
      })),
      hasMore,
      nextCursor: hasMore ? String(offset + limit) : null,
    };
  }

  /** Shared media/files gallery for the right sidebar. */
  public static async listMedia(
    viewer: CommunityViewer,
    options: { kind?: "image" | "video" | "file"; cursor?: string | null; limit?: number } = {}
  ): Promise<{
    items: Array<{
      messageId: string;
      attachment: CommunityAttachment;
      senderName: string;
      createdAt: string;
    }>;
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    void viewer;
    const community = await getOfficialCommunity();
    const limit = Math.min(Math.max(options.limit ?? 18, 1), 40);
    const kind = options.kind || "image";

    const conditions = [
      eq(communityMessages.communityId, community.id),
      isNull(communityMessages.deletedAt),
      sql`jsonb_array_length(${communityMessages.attachments}) > 0`,
      sql`${communityMessages.attachments} @> ${JSON.stringify([{ kind }])}::jsonb`,
    ];

    if (options.cursor) {
      const cursorDate = new Date(options.cursor);
      if (Number.isNaN(cursorDate.getTime())) {
        throw AppError.badRequest("Sahifalash kursor i noto'g'ri");
      }
      conditions.push(lt(communityMessages.createdAt, cursorDate));
    }

    const rows = await db
      .select({
        id: communityMessages.id,
        attachments: communityMessages.attachments,
        createdAt: communityMessages.createdAt,
        senderName: users.name,
      })
      .from(communityMessages)
      .innerJoin(users, eq(communityMessages.senderId, users.id))
      .where(and(...conditions))
      .orderBy(desc(communityMessages.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const items = page.flatMap((row) =>
      row.attachments
        .filter((attachment) => attachment.kind === kind)
        .map((attachment) => ({
          messageId: row.id,
          attachment,
          senderName: row.senderName,
          createdAt: row.createdAt.toISOString(),
        }))
    );

    return {
      items,
      hasMore,
      nextCursor: hasMore ? page[page.length - 1]?.createdAt.toISOString() ?? null : null,
    };
  }

  /** Admin moderation listing (includes deleted messages for audit). */
  public static async listForModeration(options: {
    search?: string | null;
    limit?: number;
    cursor?: string | null;
  } = {}): Promise<{
    items: Array<{
      id: string;
      content: string;
      messageType: string;
      attachments: CommunityAttachment[];
      createdAt: string;
      deletedAt: string | null;
      sender: { id: string; name: string; handle: string };
      reactionsCount: number;
    }>;
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    const community = await getOfficialCommunity();
    const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
    const conditions = [eq(communityMessages.communityId, community.id)];

    if (options.search?.trim()) {
      conditions.push(
        ilike(communityMessages.content, `%${escapeLike(options.search.trim())}%`)
      );
    }
    if (options.cursor) {
      const cursorDate = new Date(options.cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        conditions.push(lt(communityMessages.createdAt, cursorDate));
      }
    }

    const rows = await db
      .select({
        id: communityMessages.id,
        content: communityMessages.content,
        messageType: communityMessages.messageType,
        attachments: communityMessages.attachments,
        createdAt: communityMessages.createdAt,
        deletedAt: communityMessages.deletedAt,
        senderId: users.id,
        senderName: users.name,
        senderHandle: users.handle,
        reactionsCount: sql<number>`(
          SELECT count(*)::int FROM ${communityReactions}
          WHERE ${communityReactions.messageId} = ${communityMessages.id}
        )`,
      })
      .from(communityMessages)
      .innerJoin(users, eq(communityMessages.senderId, users.id))
      .where(and(...conditions))
      .orderBy(desc(communityMessages.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: page.map((row) => ({
        id: row.id,
        content: row.content,
        messageType: row.messageType,
        attachments: row.attachments,
        createdAt: row.createdAt.toISOString(),
        deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
        sender: { id: row.senderId, name: row.senderName, handle: row.senderHandle },
        reactionsCount: row.reactionsCount,
      })),
      hasMore,
      nextCursor: hasMore ? page[page.length - 1]?.createdAt.toISOString() ?? null : null,
    };
  }

  /** Single message DTO (used after writes and by idempotent retries). */
  private static async getMessage(
    viewer: CommunityViewer,
    messageId: string
  ): Promise<CommunityMessageDto | null> {
    const [row] = await db
      .select({
        id: communityMessages.id,
        content: communityMessages.content,
        messageType: communityMessages.messageType,
        attachments: communityMessages.attachments,
        clientMessageId: communityMessages.clientMessageId,
        replyToId: communityMessages.replyToId,
        editedAt: communityMessages.editedAt,
        createdAt: communityMessages.createdAt,
        updatedAt: communityMessages.updatedAt,
        senderId: users.id,
        senderName: users.name,
        senderHandle: users.handle,
        senderAvatarUrl: users.avatarUrl,
        senderVerified: users.verified,
        senderRole: users.role,
      })
      .from(communityMessages)
      .innerJoin(users, eq(communityMessages.senderId, users.id))
      .where(
        and(eq(communityMessages.id, messageId), isNull(communityMessages.deletedAt))
      )
      .limit(1);

    if (!row) return null;
    const [dto] = await this.decorate([row], viewer);
    return dto || null;
  }

  private static async decorate(
    rows: MessageRow[],
    viewer: CommunityViewer
  ): Promise<CommunityMessageDto[]> {
    if (rows.length === 0) return [];

    const messageIds = rows.map((row) => row.id);
    const replyIds = Array.from(
      new Set(rows.map((row) => row.replyToId).filter((id): id is string => Boolean(id)))
    );

    const [reactions, replyRows] = await Promise.all([
      this.loadReactions(viewer.userId, messageIds),
      replyIds.length > 0
        ? db
            .select({
              id: communityMessages.id,
              content: communityMessages.content,
              messageType: communityMessages.messageType,
              attachments: communityMessages.attachments,
              deletedAt: communityMessages.deletedAt,
              senderName: users.name,
              senderHandle: users.handle,
            })
            .from(communityMessages)
            .leftJoin(users, eq(communityMessages.senderId, users.id))
            .where(inArray(communityMessages.id, replyIds))
        : Promise.resolve([]),
    ]);

    const replyMap = new Map(replyRows.map((row) => [row.id, row]));
    const isModerator = isCommunityModerator(viewer);

    return rows.map((row) => {
      const replyRow = row.replyToId ? replyMap.get(row.replyToId) : undefined;
      const replyTo: CommunityReplyPreviewDto | null = replyRow
        ? {
            id: replyRow.id,
            content: replyRow.deletedAt ? "" : replyRow.content,
            messageType: replyRow.messageType,
            senderName: replyRow.senderName ?? null,
            senderHandle: replyRow.senderHandle ?? null,
            attachmentKind: replyRow.attachments?.[0]?.kind ?? null,
            isDeleted: Boolean(replyRow.deletedAt),
          }
        : null;

      const isMine = row.senderId === viewer.userId;

      return {
        id: row.id,
        content: row.content,
        messageType: row.messageType as CommunityMessageDto["messageType"],
        attachments: row.attachments ?? [],
        clientMessageId: row.clientMessageId,
        replyTo,
        reactions: reactions.get(row.id) || [],
        sender: toSenderDto(row),
        isMine,
        canEdit: isMine,
        canDelete: isMine || isModerator,
        editedAt: row.editedAt ? row.editedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    });
  }

  private static async loadReactions(
    viewerId: string,
    messageIds: string[]
  ): Promise<Map<string, CommunityReactionDto[]>> {
    const map = new Map<string, CommunityReactionDto[]>();
    if (messageIds.length === 0) return map;

    const rows = await db
      .select({
        messageId: communityReactions.messageId,
        emoji: communityReactions.emoji,
        count: sql<number>`count(*)::int`,
        reacted: sql<boolean>`bool_or(${communityReactions.userId} = ${viewerId}::uuid)`,
      })
      .from(communityReactions)
      .where(inArray(communityReactions.messageId, messageIds))
      .groupBy(communityReactions.messageId, communityReactions.emoji);

    for (const row of rows) {
      const list = map.get(row.messageId) || [];
      list.push({ emoji: row.emoji, count: row.count, reacted: Boolean(row.reacted) });
      map.set(row.messageId, list);
    }

    for (const list of map.values()) {
      list.sort((a, b) => b.count - a.count);
    }

    return map;
  }

  private static async countMedia(
    communityId: string
  ): Promise<{ image: number; video: number; file: number }> {
    const kinds: Array<"image" | "video" | "file"> = ["image", "video", "file"];
    const counts = await Promise.all(
      kinds.map(async (kind) => {
        const [row] = await db
          .select({ total: sql<number>`count(*)::int` })
          .from(communityMessages)
          .where(
            and(
              eq(communityMessages.communityId, communityId),
              isNull(communityMessages.deletedAt),
              sql`${communityMessages.attachments} @> ${JSON.stringify([{ kind }])}::jsonb`
            )
          );
        return row?.total ?? 0;
      })
    );

    return { image: counts[0], video: counts[1], file: counts[2] };
  }

  private static async ensureMembership(communityId: string, userId: string): Promise<void> {
    const inserted = await db
      .insert(communityMembers)
      .values({ communityId, userId })
      .onConflictDoNothing()
      .returning({ userId: communityMembers.userId });

    if (inserted.length > 0) {
      const [user] = await db
        .select({ name: users.name, handle: users.handle })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      realtimeHub.broadcast({
        type: "member:joined",
        data: { userId, name: user?.name ?? "", handle: user?.handle ?? "" },
      });
    }
  }

  private static async getUnreadCount(communityId: string, userId: string): Promise<number> {
    const [membership] = await db
      .select({ lastReadAt: communityMembers.lastReadAt })
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, communityId),
          eq(communityMembers.userId, userId)
        )
      )
      .limit(1);

    if (!membership?.lastReadAt) return 0;

    const [row] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(communityMessages)
      .where(
        and(
          eq(communityMessages.communityId, communityId),
          isNull(communityMessages.deletedAt),
          ne(communityMessages.senderId, userId),
          gt(communityMessages.createdAt, membership.lastReadAt)
        )
      );

    return row?.total ?? 0;
  }
}
