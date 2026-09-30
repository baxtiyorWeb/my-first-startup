import { eq, desc, and, sql, not, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  users,
  posts,
  comments,
  postLikes,
  follows,
  botActivities,
  botEngineSettings,
} from "@/server/db/schema";
import { gemini } from "./gemini";
import { STARTER_PERSONAS } from "./personas";

export interface BotActionLog {
  id: string;
  activityType: string;
  botName?: string;
  details?: string | null;
  createdAt: Date;
}

export class BotService {
  /**
   * Get or initialize global bot engine settings
   */
  async getSettings() {
    const rows = await db
      .select()
      .from(botEngineSettings)
      .where(eq(botEngineSettings.id, "default"))
      .limit(1);

    if (rows.length > 0) {
      return rows[0];
    }

    const [created] = await db
      .insert(botEngineSettings)
      .values({
        id: "default",
        isActive: true,
        dailyLimit: 30,
        currentDailyCount: 0,
      })
      .returning();

    return created;
  }

  /**
   * Update bot engine settings
   */
  async updateSettings(data: { isActive?: boolean; dailyLimit?: number }) {
    await this.getSettings(); // ensure row exists

    const [updated] = await db
      .update(botEngineSettings)
      .set({
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.dailyLimit !== undefined ? { dailyLimit: data.dailyLimit } : {}),
        updatedAt: new Date(),
      })
      .where(eq(botEngineSettings.id, "default"))
      .returning();

    return updated;
  }

  /**
   * Count today's bot actions to enforce daily limit
   */
  async getTodayActivityCount(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(botActivities)
      .where(sql`${botActivities.createdAt} >= ${today}`);

    return result?.count || 0;
  }

  /**
   * Get all bot users from database
   */
  async getBotUsers() {
    return db
      .select()
      .from(users)
      .where(eq(users.isBot, true))
      .orderBy(desc(users.createdAt));
  }

  /**
   * Get all real human users from database
   */
  async getRealUsers() {
    return db
      .select()
      .from(users)
      .where(eq(users.isBot, false))
      .orderBy(desc(users.createdAt));
  }

  /**
   * Seed starter bots if none or fewer than 6 exist
   */
  async seedStarterBotsIfEmpty() {
    const existing = await this.getBotUsers();
    if (existing.length >= STARTER_PERSONAS.length) {
      return existing;
    }

    const createdBots = [];
    for (const archetype of STARTER_PERSONAS) {
      const handle = archetype.handle || archetype.id.replace("_", "");
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.handle, handle))
        .limit(1);

      if (existingUser.length === 0) {
        const avatarUrl = `https://api.dicebear.com/7.x/${archetype.avatarCollection}/svg?seed=${encodeURIComponent(archetype.avatarSeed)}`;
        const [newUser] = await db
          .insert(users)
          .values({
            name: archetype.name,
            handle,
            role: archetype.role,
            bio: archetype.bio,
            avatarUrl,
            isBot: true,
            botPersona: archetype.persona,
            verified: false,
            isOnboarded: true,
          })
          .returning();

        createdBots.push(newUser);

        await db.insert(botActivities).values({
          activityType: "create_bot",
          botId: newUser.id,
          details: `Yangi bot foydalanuvchi yaratildi: ${archetype.name} (@${handle})`,
        });
      }
    }

    return this.getBotUsers();
  }

  /**
   * Create a single new unique bot user with AI-generated profile
   */
  async createBotUser() {
    const existingUsers = await db.select({ handle: users.handle }).from(users);
    const existingHandles = existingUsers.map((u) => u.handle);

    const profile = await gemini.generateProfile(existingHandles);

    // Ensure handle uniqueness
    let finalHandle = profile.handle;
    if (existingHandles.includes(finalHandle) || !finalHandle) {
      finalHandle = `user_${Math.floor(10000 + Math.random() * 90000)}`;
    }

    const [newUser] = await db
      .insert(users)
      .values({
        name: profile.name,
        handle: finalHandle,
        role: profile.role,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        isBot: true,
        botPersona: profile.persona,
        verified: false,
        isOnboarded: true,
      })
      .returning();

    await db.insert(botActivities).values({
      activityType: "create_bot",
      botId: newUser.id,
      details: `Yangi bot a'zosi qo'shildi: ${profile.name} (@${finalHandle}) - ${profile.role}`,
    });

    return newUser;
  }

  /**
   * Generate an organic post from one of the bots
   */
  async generateOrganicPost() {
    let botList = await this.getBotUsers();
    if (botList.length === 0) {
      botList = await this.seedStarterBotsIfEmpty();
    }

    // Pick random bot
    const bot = botList[Math.floor(Math.random() * botList.length)];

    // Fetch recent 5 post titles on platform for context
    const recentPosts = await db
      .select({ title: posts.title })
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(5);

    const recentTopics = recentPosts
      .map((p) => p.title)
      .filter((t): t is string => Boolean(t));

    const generated = await gemini.generatePost({
      name: bot.name,
      role: bot.role,
      persona: bot.botPersona || "Samimiy va o'ylantiruvchi postlar yozuvchi",
      recentTopics,
    });

    // Random initial views count (between 8 and 35) to feel natural
    const initialViews = Math.floor(8 + Math.random() * 28);

    const [newPost] = await db
      .insert(posts)
      .values({
        authorId: bot.id,
        title: generated.title,
        content: generated.content,
        postType: generated.postType || "thought",
        viewsCount: initialViews,
        likesCount: 0,
        commentsCount: 0,
      })
      .returning();

    await db.insert(botActivities).values({
      activityType: "post",
      botId: bot.id,
      targetId: newPost.id,
      details: `Post e'lon qilindi: "${generated.title.slice(0, 60)}" (${bot.name} tomonidan)`,
    });

    return newPost;
  }

  /**
   * Generate an organic comment on an existing post
   */
  async generateOrganicComment(postIdOverride?: string) {
    let botList = await this.getBotUsers();
    if (botList.length === 0) {
      botList = await this.seedStarterBotsIfEmpty();
    }

    let targetPostId = postIdOverride;

    if (!targetPostId) {
      // Find candidate post: prioritize recent posts with < 4 comments
      const candidates = await db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          title: posts.title,
          content: posts.content,
          commentsCount: posts.commentsCount,
        })
        .from(posts)
        .orderBy(desc(posts.createdAt))
        .limit(10);

      if (candidates.length === 0) {
        // If no posts exist at all, generate a post first
        const createdPost = await this.generateOrganicPost();
        targetPostId = createdPost.id;
      } else {
        // Sort by fewer comments first
        const sorted = [...candidates].sort((a, b) => a.commentsCount - b.commentsCount);
        targetPostId = sorted[0].id;
      }
    }

    // Load post details
    const [targetPost] = await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        title: posts.title,
        content: posts.content,
      })
      .from(posts)
      .where(eq(posts.id, targetPostId))
      .limit(1);

    if (!targetPost) {
      throw new Error("Maqsadli post topilmadi");
    }

    // Pick a bot that is NOT the post author
    const eligibleBots = botList.filter((b) => b.id !== targetPost.authorId);
    const chosenBot = eligibleBots.length > 0
      ? eligibleBots[Math.floor(Math.random() * eligibleBots.length)]
      : botList[0];

    // Get previous comments on this post for context
    const existingComments = await db
      .select({ content: comments.content })
      .from(comments)
      .where(eq(comments.postId, targetPost.id))
      .limit(4);

    const commentText = await gemini.generateComment({
      botName: chosenBot.name,
      botRole: chosenBot.role,
      botPersona: chosenBot.botPersona || "Samimiy fikr bildiruvchi",
      postTitle: targetPost.title,
      postContent: targetPost.content,
      existingComments: existingComments.map((c) => c.content),
    });

    const [newComment] = await db
      .insert(comments)
      .values({
        postId: targetPost.id,
        authorId: chosenBot.id,
        content: commentText,
      })
      .returning();

    // Increment post's comments_count
    await db
      .update(posts)
      .set({
        commentsCount: sql`${posts.commentsCount} + 1`,
      })
      .where(eq(posts.id, targetPost.id));

    await db.insert(botActivities).values({
      activityType: "comment",
      botId: chosenBot.id,
      targetId: newComment.id,
      details: `Izoh qoldirildi: "${commentText.slice(0, 50)}..." (${chosenBot.name} tomonidan)`,
    });

    return newComment;
  }

  /**
   * Simulate realistic social interactions: Likes, Follows, Views
   */
  async simulateSocialInteractions() {
    const botList = await this.getBotUsers();
    if (botList.length === 0) return { likes: 0, follows: 0, views: 0 };

    let likesCount = 0;
    let followsCount = 0;
    let viewsCount = 0;

    // 1. Simulate Views: increment views on last 5 posts
    const recentPosts = await db
      .select({ id: posts.id })
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(5);

    for (const p of recentPosts) {
      const addedViews = Math.floor(3 + Math.random() * 8);
      await db
        .update(posts)
        .set({
          viewsCount: sql`${posts.viewsCount} + ${addedViews}`,
        })
        .where(eq(posts.id, p.id));
      viewsCount += addedViews;
    }

    // 2. Simulate Likes: random bot likes recent post
    if (recentPosts.length > 0) {
      const randomPost = recentPosts[Math.floor(Math.random() * recentPosts.length)];
      const randomBot = botList[Math.floor(Math.random() * botList.length)];

      try {
        await db
          .insert(postLikes)
          .values({
            postId: randomPost.id,
            userId: randomBot.id,
          })
          .onConflictDoNothing();

        // Update likesCount in posts
        await db
          .update(posts)
          .set({
            likesCount: sql`${posts.likesCount} + 1`,
          })
          .where(eq(posts.id, randomPost.id));

        likesCount++;

        await db.insert(botActivities).values({
          activityType: "like",
          botId: randomBot.id,
          targetId: randomPost.id,
          details: `${randomBot.name} postga like bosdi`,
        });
      } catch {
        // already liked or conflict, safely ignore
      }
    }

    // 3. Simulate Follows: bot follows another bot or a real user
    const allUsers = await db.select({ id: users.id, name: users.name, isBot: users.isBot }).from(users).limit(20);
    if (allUsers.length > 1) {
      const follower = botList[Math.floor(Math.random() * botList.length)];
      const targetUser = allUsers.filter((u) => u.id !== follower.id)[Math.floor(Math.random() * (allUsers.length - 1))];

      if (targetUser) {
        try {
          await db
            .insert(follows)
            .values({
              followerId: follower.id,
              followingId: targetUser.id,
            })
            .onConflictDoNothing();

          followsCount++;

          await db.insert(botActivities).values({
            activityType: "follow",
            botId: follower.id,
            targetId: targetUser.id,
            details: `${follower.name} ${targetUser.isBot ? "botga" : "foydalanuvchiga"} (${targetUser.name}) obuna bo'ldi`,
          });
        } catch {
          // already followed, safely ignore
        }
      }
    }

    return { likes: likesCount, follows: followsCount, views: viewsCount };
  }

  /**
   * Run one autonomous cycle (Tick)
   */
  async runAutonomousTick(): Promise<{ executed: boolean; reason?: string; action?: string }> {
    const settings = await this.getSettings();
    if (!settings.isActive) {
      return { executed: false, reason: "Bot tizimi hozirda pauza holatida" };
    }

    // Check biological sleep hours (Toshkent vaqti bilan 00:30 dan 07:30 gacha sukunat)
    const now = new Date();
    const utcHours = now.getUTCHours();
    const localTashkentHours = (utcHours + 5) % 24; // UTC+5
    if (localTashkentHours >= 1 && localTashkentHours < 7) {
      return { executed: false, reason: "Tungi sukunat vaqti (01:00 - 07:00)" };
    }

    // Check daily limit
    const todayCount = await this.getTodayActivityCount();
    if (todayCount >= settings.dailyLimit) {
      return { executed: false, reason: `Bugungi kunlik limitga yetildi (${todayCount}/${settings.dailyLimit})` };
    }

    // Ensure we have at least starter bots
    await this.seedStarterBotsIfEmpty();

    // Decide action:
    // Check if there are posts with zero comments
    const unrepliedPosts = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.commentsCount, 0))
      .limit(1);

    if (unrepliedPosts.length > 0) {
      await this.generateOrganicComment(unrepliedPosts[0].id);
      await this.simulateSocialInteractions();
      return { executed: true, action: "Komment va ijtimoiy munosabat qo'shildi" };
    }

    // Random choice: 35% new post, 65% comment / interaction
    const rand = Math.random();
    if (rand < 0.35) {
      const p = await this.generateOrganicPost();
      await this.simulateSocialInteractions();
      return { executed: true, action: `Yangi post yaratildi: ${p.title}` };
    } else {
      await this.generateOrganicComment();
      await this.simulateSocialInteractions();
      return { executed: true, action: "Yangi izoh va munosabat qo'shildi" };
    }
  }

  /**
   * Get full overview statistics for Admin panel
   */
  async getOverviewStats() {
    const [totalUsersRes] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [botUsersRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.isBot, true));

    const totalUsers = totalUsersRes?.count || 0;
    const botUsers = botUsersRes?.count || 0;
    const realUsers = Math.max(0, totalUsers - botUsers);

    const [totalPostsRes] = await db.select({ count: sql<number>`count(*)::int` }).from(posts);
    const [botPostsRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(users.isBot, true));

    const totalPosts = totalPostsRes?.count || 0;
    const botPosts = botPostsRes?.count || 0;
    const realPosts = Math.max(0, totalPosts - botPosts);

    const [totalCommentsRes] = await db.select({ count: sql<number>`count(*)::int` }).from(comments);
    const totalComments = totalCommentsRes?.count || 0;

    const todayActivities = await this.getTodayActivityCount();
    const settings = await this.getSettings();

    const recentLogs = await db
      .select({
        id: botActivities.id,
        activityType: botActivities.activityType,
        details: botActivities.details,
        createdAt: botActivities.createdAt,
      })
      .from(botActivities)
      .orderBy(desc(botActivities.createdAt))
      .limit(15);

    return {
      users: {
        total: totalUsers,
        real: realUsers,
        bots: botUsers,
      },
      posts: {
        total: totalPosts,
        real: realPosts,
        bots: botPosts,
      },
      comments: {
        total: totalComments,
      },
      engine: {
        isActive: settings.isActive,
        dailyLimit: settings.dailyLimit,
        todayCount: todayActivities,
        lastActivityAt: settings.lastActivityAt,
      },
      recentLogs,
    };
  }

  /**
   * Update a bot's profile (name, handle, role, bio, avatar, persona)
   */
  async updateBotUser(
    botId: string,
    data: {
      name?: string;
      handle?: string;
      role?: string;
      bio?: string;
      avatarUrl?: string;
      botPersona?: string;
    }
  ) {
    const [existing] = await db.select().from(users).where(eq(users.id, botId)).limit(1);
    if (!existing) {
      throw new Error("Bot foydalanuvchi topilmadi");
    }

    const [updated] = await db
      .update(users)
      .set({
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.handle ? { handle: data.handle.toLowerCase().replace(/[^a-z0-9_]/g, "") } : {}),
        ...(data.role ? { role: data.role.trim() } : {}),
        ...(data.bio !== undefined ? { bio: data.bio.trim() } : {}),
        ...(data.avatarUrl ? { avatarUrl: data.avatarUrl.trim() } : {}),
        ...(data.botPersona !== undefined ? { botPersona: data.botPersona.trim() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, botId))
      .returning();

    await db.insert(botActivities).values({
      activityType: "edit_profile",
      botId: updated.id,
      details: `Bot profili tahrirlandi: ${updated.name} (@${updated.handle})`,
    });

    return updated;
  }

  /**
   * Edit a bot's post (title, content)
   */
  async editBotPost(
    postId: string,
    data: {
      title?: string | null;
      content: string;
    }
  ) {
    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) {
      throw new Error("Post topilmadi");
    }

    const [updated] = await db
      .update(posts)
      .set({
        title: data.title !== undefined ? (data.title?.trim() || null) : undefined,
        content: data.content.trim(),
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId))
      .returning();

    await db.insert(botActivities).values({
      activityType: "edit_post",
      botId: post.authorId,
      targetId: post.id,
      details: `Post tahrirlandi: "${(updated.title || updated.content).slice(0, 50)}..."`,
    });

    return updated;
  }
}

export const botService = new BotService();
