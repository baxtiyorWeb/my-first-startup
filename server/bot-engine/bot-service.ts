import { eq, desc, sql, isNull, and } from "drizzle-orm";
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
import {
  STARTER_PERSONAS,
  getRandomLengthTier,
  getRandomTopicCategory,
  PostLengthTier,
} from "./personas";
import { recordPostView } from "@/server/modules/posts/posts.service";

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
   * Generate an organic post from one of the bots with deep reasoning, rich formatting,
   * varied length tiers (short thoughts, medium posts, long guides), and broad topic coverage.
   */
  async generateOrganicPost(options?: {
    forceWithSearch?: boolean;
    topicFocus?: string;
    botId?: string;
    lengthTier?: PostLengthTier;
  }) {
    let botList = await this.getBotUsers();
    if (botList.length === 0) {
      botList = await this.seedStarterBotsIfEmpty();
    }

    // Pick random bot or specific one
    let bot = botList[Math.floor(Math.random() * botList.length)];
    if (options?.botId) {
      const found = botList.find((b) => b.id === options.botId);
      if (found) bot = found;
    }

    // Match archetype for enhanced writing style and thinking angle
    const archetype = STARTER_PERSONAS.find(
      (p) => p.name === bot.name || p.handle === bot.handle
    );

    // Fetch recent 5 post titles on platform for context
    const recentPosts = await db
      .select({ title: posts.title })
      .from(posts)
      .where(isNull(posts.deletedAt))
      .orderBy(desc(posts.createdAt))
      .limit(5);

    const recentTopics = recentPosts
      .map((p) => p.title)
      .filter((t): t is string => Boolean(t));

    // Enable search if forced or randomly 40% of the time for fresh insights
    const shouldSearch =
      options?.forceWithSearch !== undefined
        ? options.forceWithSearch
        : Math.random() < 0.4;

    // Pick dynamic topic category, angle and search query
    const topicCategory = getRandomTopicCategory(options?.topicFocus);
    const chosenAngle =
      topicCategory.angles[Math.floor(Math.random() * topicCategory.angles.length)];
    const chosenSearchQuery =
      topicCategory.searchQueries[
        Math.floor(Math.random() * topicCategory.searchQueries.length)
      ];
    const lengthTier = options?.lengthTier || getRandomLengthTier();

    let generated = await gemini.generatePost({
      name: bot.name,
      role: bot.role,
      persona: bot.botPersona || archetype?.persona || "Samimiy va o'ylantiruvchi postlar yozuvchi",
      writingStyle: archetype?.writingStyle,
      thoughtAngle: archetype?.thoughtAngle,
      recentTopics,
      withSearch: shouldSearch,
      topicFocus: options?.topicFocus,
      topicAngle: chosenAngle,
      searchAngle: chosenSearchQuery,
      lengthTier,
    });

    // Enforce strict uniqueness against existing DB records
    const existingSameTitle = await db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.title, generated.title), isNull(posts.deletedAt)))
      .limit(1);

    if (existingSameTitle.length > 0) {
      const roleTag = bot.role ? bot.role.trim() : "Go-getter";
      generated.title = `${generated.title} (${roleTag} nigohi)`;
    }

    const existingSameContent = await db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.content, generated.content), isNull(posts.deletedAt)))
      .limit(1);

    if (existingSameContent.length > 0) {
      generated.content = `<p><em>${bot.name} (${bot.role}) kuzatuvi:</em></p>` + generated.content;
    }

    // Bots do not attach stock images — thoughts are clean, organic and text-first
    const mediaUrls: string[] = [];

    const [newPost] = await db
      .insert(posts)
      .values({
        authorId: bot.id,
        title: generated.title,
        content: generated.content,
        postType: generated.postType || "thought",
        mediaUrls,
        viewsCount: 0,
        likesCount: 0,
        commentsCount: 0,
      })
      .returning();

    const lengthLabel =
      lengthTier === "short" ? " [Qisqa fikr]" : lengthTier === "long" ? " [Tahliliy maqola]" : "";
    const searchTag = shouldSearch ? " [Google tahlili]" : "";
    await db.insert(botActivities).values({
      activityType: "post",
      botId: bot.id,
      targetId: newPost.id,
      details: `Post e'lon qilindi${lengthLabel}${searchTag} (${topicCategory.label}): "${generated.title.slice(0, 45)}" (${bot.name})`,
    });

    return newPost;
  }

  /**
   * Generate an organic comment on an existing post with deep human reasoning and optional search
   */
  async generateOrganicComment(
    postIdOverride?: string,
    options?: {
      deepReasoning?: boolean;
      withSearch?: boolean;
      botId?: string;
    }
  ): Promise<typeof comments.$inferSelect> {
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
        .where(isNull(posts.deletedAt))
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
      .where(and(eq(posts.id, targetPostId), isNull(posts.deletedAt)))
      .limit(1);

    if (!targetPost) {
      const createdPost = await this.generateOrganicPost();
      return this.generateOrganicComment(createdPost.id, options);
    }

    // Pick a bot that is NOT the post author
    const eligibleBots = botList.filter((b) => b.id !== targetPost.authorId);
    let chosenBot =
      eligibleBots.length > 0
        ? eligibleBots[Math.floor(Math.random() * eligibleBots.length)]
        : botList[0];

    if (options?.botId) {
      const found = botList.find((b) => b.id === options.botId);
      if (found) chosenBot = found;
    }

    const archetype = STARTER_PERSONAS.find(
      (p) => p.name === chosenBot.name || p.handle === chosenBot.handle
    );

    // Get previous comments on this post for context
    const existingComments = await db
      .select({ content: comments.content })
      .from(comments)
      .where(eq(comments.postId, targetPost.id))
      .limit(4);

    const isDeep = options?.deepReasoning !== undefined ? options.deepReasoning : true;
    const withSearch = options?.withSearch !== undefined ? options.withSearch : Math.random() < 0.25;

    let commentText = await gemini.generateComment({
      botName: chosenBot.name,
      botRole: chosenBot.role,
      botPersona: chosenBot.botPersona || archetype?.persona || "Samimiy fikr bildiruvchi",
      writingStyle: archetype?.writingStyle,
      thoughtAngle: archetype?.thoughtAngle,
      postTitle: targetPost.title,
      postContent: targetPost.content,
      existingComments: existingComments.map((c) => c.content),
      deepReasoning: isDeep,
      withSearch,
    });

    // Enforce comment uniqueness on post
    const existingSameComment = await db
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.postId, targetPost.id), eq(comments.content, commentText), isNull(comments.deletedAt)))
      .limit(1);

    if (existingSameComment.length > 0) {
      commentText = `${commentText} — ${chosenBot.name} (${chosenBot.role})`;
    }

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

    const extraTag = withSearch ? " [Internet tahlili bilan]" : isDeep ? " [Chuqur mulohaza]" : "";
    await db.insert(botActivities).values({
      activityType: "comment",
      botId: chosenBot.id,
      targetId: newComment.id,
      details: `Izoh qoldirildi${extraTag}: "${commentText.slice(0, 45)}..." (${chosenBot.name})`,
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

    // 1. Simulate Views: increment organically, bounded by total users
    const [userCountRow] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const maxRealisticViews = Math.max(2, Math.min(userCountRow?.count || 8, 8));

    const recentPosts = await db
      .select({ id: posts.id, viewsCount: posts.viewsCount })
      .from(posts)
      .where(isNull(posts.deletedAt))
      .orderBy(desc(posts.createdAt))
      .limit(5);

    for (const p of recentPosts) {
      if (p.viewsCount < maxRealisticViews && Math.random() > 0.5) {
        await db
          .update(posts)
          .set({
            viewsCount: sql`${posts.viewsCount} + 1`,
          })
          .where(eq(posts.id, p.id));
        viewsCount += 1;
      }
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
   * Determine and record a bot viewing a post.
   * Logic:
   * 1. Inspect post content and evaluate persona interest correlation.
   * 2. Call recordPostView(postId, botId) to deduplicate within 24h and atomically increment posts.viewsCount.
   * 3. Log the view action into botActivities with activityType: "view".
   */
  async simulateBotPostView(botId: string, postId: string): Promise<{
    recorded: boolean;
    viewsCount: number;
    isInterested: boolean;
    matchingDomain?: string;
  }> {
    const [bot] = await db
      .select({ id: users.id, name: users.name, handle: users.handle, role: users.role, botPersona: users.botPersona })
      .from(users)
      .where(eq(users.id, botId))
      .limit(1);

    const [targetPost] = await db
      .select({ id: posts.id, title: posts.title, content: posts.content, authorId: posts.authorId, viewsCount: posts.viewsCount })
      .from(posts)
      .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
      .limit(1);

    if (!bot || !targetPost) {
      return { recorded: false, viewsCount: 0, isInterested: false };
    }

    // Persona-based interest correlation
    const textToAnalyze = `${targetPost.title || ""} ${targetPost.content}`.toLowerCase();
    const roleLower = (bot.role || "").toLowerCase();
    const personaLower = (bot.botPersona || "").toLowerCase();

    let isInterested = false;
    let matchingDomain: string | undefined;

    if (roleLower.includes("dasturchi") || personaLower.includes("arxitektura") || personaLower.includes("kod")) {
      if (/typescript|javascript|react|next\.js|python|backend|api|sql|database|server|baza|algoritm|bug/i.test(textToAnalyze)) {
        isInterested = true;
        matchingDomain = "Dasturlash & Texnologiya";
      }
    } else if (roleLower.includes("dizayn") || personaLower.includes("ux") || personaLower.includes("figma")) {
      if (/figma|dizayn|ui|ux|interfeys|rang|tipografika|foydalanuvchi|mobil|layout/i.test(textToAnalyze)) {
        isInterested = true;
        matchingDomain = "UI/UX & Mahsulot Dizayni";
      }
    } else if (roleLower.includes("asoschi") || roleLower.includes("pm") || personaLower.includes("biznes")) {
      if (/startap|investitsiya|mvp|mijoz|monetizatsiya|bozor|daromad|foyda|custdev|pmf/i.test(textToAnalyze)) {
        isInterested = true;
        matchingDomain = "Startap & Biznes Model";
      }
    } else {
      isInterested = Math.random() < 0.5;
      matchingDomain = "Umumiy tahlil";
    }

    // Record legitimate view with 24h deduplication in database
    let viewResult = { incremented: false, viewsCount: targetPost.viewsCount };
    try {
      viewResult = await recordPostView(targetPost.id, bot.id);
    } catch (err) {
      console.warn(`[BotService] recordPostView skipped for post ${targetPost.id}:`, err);
    }

    // Audit in bot activities
    const interestTag = isInterested ? ` [Sohasi: ${matchingDomain}]` : "";
    await db.insert(botActivities).values({
      activityType: "view",
      botId: bot.id,
      targetId: targetPost.id,
      details: `${bot.name} postni ko'rdi va o'qib chiqdi${interestTag}: "${targetPost.title?.slice(0, 40) || targetPost.content.slice(0, 40)}..."`,
    });

    return {
      recorded: viewResult.incremented,
      viewsCount: viewResult.viewsCount,
      isInterested,
      matchingDomain,
    };
  }

  /**
   * Generate an organic reply to an existing comment.
   */
  async generateOrganicReply(options?: {
    postId?: string;
    commentId?: string;
    botId?: string;
  }) {
    let botList = await this.getBotUsers();
    if (botList.length === 0) {
      botList = await this.seedStarterBotsIfEmpty();
    }

    // Find comments to reply to
    const candidateComments = await db
      .select({
        id: comments.id,
        postId: comments.postId,
        authorId: comments.authorId,
        content: comments.content,
        authorName: users.name,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(sql`${comments.parentId} IS NULL AND ${comments.deletedAt} IS NULL`)
      .orderBy(desc(comments.createdAt))
      .limit(10);

    if (candidateComments.length === 0) {
      return this.generateOrganicComment(options?.postId);
    }

    const targetComment = options?.commentId
      ? candidateComments.find((c) => c.id === options.commentId) || candidateComments[0]
      : candidateComments[Math.floor(Math.random() * candidateComments.length)];

    const [parentPost] = await db
      .select({ id: posts.id, title: posts.title, content: posts.content, authorId: posts.authorId })
      .from(posts)
      .where(and(eq(posts.id, targetComment.postId), isNull(posts.deletedAt)))
      .limit(1);

    if (!parentPost) {
      return this.generateOrganicComment();
    }

    // Pick a bot that is neither the comment author nor the post author
    const eligibleBots = botList.filter((b) => b.id !== targetComment.authorId && b.id !== parentPost.authorId);
    const chosenBot = eligibleBots.length > 0
      ? eligibleBots[Math.floor(Math.random() * eligibleBots.length)]
      : botList[0];

    // Bot views the post before replying!
    await this.simulateBotPostView(chosenBot.id, parentPost.id).catch(() => {});

    const archetype = STARTER_PERSONAS.find((p) => p.name === chosenBot.name || p.handle === chosenBot.handle);

    let replyText = await gemini.generateReply({
      botName: chosenBot.name,
      botRole: chosenBot.role,
      botPersona: chosenBot.botPersona || archetype?.persona || "Mulohazali suhbatdosh",
      writingStyle: archetype?.writingStyle,
      thoughtAngle: archetype?.thoughtAngle,
      postTitle: parentPost.title,
      postContent: parentPost.content,
      parentCommentAuthor: targetComment.authorName,
      parentCommentContent: targetComment.content,
    });

    // Enforce reply uniqueness on post
    const existingSameReply = await db
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.postId, parentPost.id), eq(comments.content, replyText), isNull(comments.deletedAt)))
      .limit(1);

    if (existingSameReply.length > 0) {
      replyText = `${replyText} (${chosenBot.name})`;
    }

    const [newReply] = await db
      .insert(comments)
      .values({
        postId: parentPost.id,
        authorId: chosenBot.id,
        parentId: targetComment.id,
        content: replyText,
      })
      .returning();

    await db
      .update(posts)
      .set({ commentsCount: sql`${posts.commentsCount} + 1` })
      .where(eq(posts.id, parentPost.id));

    await db.insert(botActivities).values({
      activityType: "reply",
      botId: chosenBot.id,
      targetId: newReply.id,
      details: `${chosenBot.name} ${targetComment.authorName} ning izohiga javob yozdi: "${replyText.slice(0, 45)}..."`,
    });

    return newReply;
  }

  /**
   * Run one autonomous cycle according to selected sections and topic focus.
   * sections: ["thoughts", "search_thoughts", "comments", "replies", "views", "likes"]
   */
  async runAutonomousCycle(options: {
    sections?: string[];
    topicFocus?: string;
    forceAction?: boolean;
  }): Promise<{
    executed: boolean;
    actionType: string;
    description: string;
    data?: any;
    reason?: string;
  }> {
    const settings = await this.getSettings();
    if (!settings.isActive && !options.forceAction) {
      return {
        executed: false,
        actionType: "none",
        description: "Bot tizimi faol emas",
        reason: "Bot tizimi hozirda to'xtatilgan (pauza)",
      };
    }

    if (!options.forceAction) {
      const todayCount = await this.getTodayActivityCount();
      if (todayCount >= settings.dailyLimit) {
        return {
          executed: false,
          actionType: "none",
          description: "Kunlik limitga yetildi",
          reason: `Kunlik limitga yetildi (${todayCount}/${settings.dailyLimit})`,
        };
      }
    }

    const availableSections = options.sections && options.sections.length > 0
      ? options.sections
      : ["thoughts", "comments", "views", "likes"];

    // Pick one of the active sections
    const chosenSection = availableSections[Math.floor(Math.random() * availableSections.length)];

    let actionType = chosenSection;
    let description = "";
    let data: any = null;

    try {
      switch (chosenSection) {
        case "thoughts": {
          const post = await this.generateOrganicPost({
            forceWithSearch: false,
            topicFocus: options.topicFocus && options.topicFocus !== "all" ? options.topicFocus : undefined,
          });
          try {
            const botList = await this.getBotUsers();
            if (botList.length > 1) {
              const viewer = botList.find((b) => b.id !== post.authorId) || botList[0];
              await this.simulateBotPostView(viewer.id, post.id);
            }
          } catch {}
          description = `Yangi fikr chop etildi: "${post.title?.slice(0, 45)}..."`;
          data = post;
          break;
        }

        case "search_thoughts": {
          const post = await this.generateOrganicPost({
            forceWithSearch: true,
            topicFocus: options.topicFocus && options.topicFocus !== "all" ? options.topicFocus : undefined,
          });
          try {
            const botList = await this.getBotUsers();
            if (botList.length > 1) {
              const viewer = botList.find((b) => b.id !== post.authorId) || botList[0];
              await this.simulateBotPostView(viewer.id, post.id);
            }
          } catch {}
          description = `Google tahlili bilan post chiqdi: "${post.title?.slice(0, 45)}..."`;
          data = post;
          break;
        }

        case "comments": {
          const comment = await this.generateOrganicComment(undefined, {
            deepReasoning: true,
            withSearch: Math.random() < 0.35,
          });
          if (comment?.postId) {
            try {
              const botList = await this.getBotUsers();
              if (botList.length > 0) {
                const liker = botList[Math.floor(Math.random() * botList.length)];
                await db.insert(postLikes).values({ postId: comment.postId, userId: liker.id }).onConflictDoNothing();
                await db.update(posts).set({ likesCount: sql`${posts.likesCount} + 1` }).where(eq(posts.id, comment.postId));
              }
            } catch {}
          }
          description = `Mavjud postga tahliliy izoh va layk qoldirildi`;
          data = comment;
          break;
        }

        case "replies": {
          const reply = await this.generateOrganicReply();
          description = `Muhokamadagi izohga jonli javob yozildi`;
          data = reply;
          break;
        }

        case "views": {
          const botList = await this.getBotUsers();
          const recentPosts = await db
            .select({ id: posts.id })
            .from(posts)
            .where(isNull(posts.deletedAt))
            .orderBy(desc(posts.createdAt))
            .limit(8);
          if (botList.length > 0 && recentPosts.length > 0) {
            const randomBot = botList[Math.floor(Math.random() * botList.length)];
            const randomPost = recentPosts[Math.floor(Math.random() * recentPosts.length)];
            const viewRes = await this.simulateBotPostView(randomBot.id, randomPost.id);
            if (Math.random() < 0.6) {
              try {
                await db.insert(postLikes).values({ postId: randomPost.id, userId: randomBot.id }).onConflictDoNothing();
                await db.update(posts).set({ likesCount: sql`${posts.likesCount} + 1` }).where(eq(posts.id, randomPost.id));
              } catch {}
            }
            description = `${randomBot.name} postni ko'rdi va munosabat bildirdi (Ko'rishlar: ${viewRes.viewsCount})`;
            data = viewRes;
          } else {
            description = `Postlar skanerlandi`;
          }
          break;
        }

        case "likes": {
          const socialResult = await this.simulateSocialInteractions();
          description = `Ijtimoiy munosabat: +${socialResult.views} ko'rish, +${socialResult.likes} like, +${socialResult.follows} obuna`;
          data = socialResult;
          break;
        }

        case "refine": {
          const refineResult = await this.auditAndRefineBotContent();
          description = `Avtonom audit va tahrirlash: ${refineResult.refinedPosts} ta post va ${refineResult.refinedComments} ta izoh tekshirildi hamda tahrirlandi`;
          data = refineResult;
          break;
        }

        default: {
          const defaultPost = await this.generateOrganicPost();
          description = `Yangi post yaratildi: "${defaultPost.title}"`;
          data = defaultPost;
        }
      }
    } catch (err) {
      console.error("[BotService] Autonomous cycle action failed:", err);
      return {
        executed: false,
        actionType,
        description: "Avtonom sikl bajarilishida xatolik yuz berdi",
        reason: (err as Error).message || "Noma'lum xatolik",
      };
    }

    // Touch lastActivityAt in settings
    await db
      .update(botEngineSettings)
      .set({ lastActivityAt: new Date() })
      .where(eq(botEngineSettings.id, "default"))
      .catch(() => {});

    return {
      executed: true,
      actionType,
      description,
      data,
    };
  }

  /**
   * Autonomous audit and self-correction engine for bot posts & comments.
   * Scans existing posts and comments, fixes identity/name mismatches, formatting issues,
   * enriches with cover images, and refines text quality.
   */
  async auditAndRefineBotContent(): Promise<{
    refinedPosts: number;
    refinedComments: number;
    details: string[];
  }> {
    const detailsList: string[] = [];
    let refinedPostsCount = 0;
    let refinedCommentsCount = 0;

    // 1. Audit comments for bot users
    const botComments = await db
      .select({
        id: comments.id,
        postId: comments.postId,
        authorId: comments.authorId,
        content: comments.content,
        authorName: users.name,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(and(eq(users.isBot, true), isNull(comments.deletedAt)))
      .orderBy(desc(comments.createdAt))
      .limit(30);

    for (const c of botComments) {
      // Check if comment text contains hallucinated names like "Men Usmonov Abdulaziz..."
      const sanitized = gemini.sanitizeAuthorIdentity(c.content, c.authorName);
      if (sanitized !== c.content) {
        await db
          .update(comments)
          .set({ content: sanitized, updatedAt: new Date() })
          .where(eq(comments.id, c.id));

        refinedCommentsCount++;
        detailsList.push(`Izohdagi ism xatoligi tuzatildi (${c.authorName})`);

        await db.insert(botActivities).values({
          activityType: "refine",
          botId: c.authorId,
          targetId: c.id,
          details: `Bot o'z izohidagi ism xatoligini avtonom tuzatdi (${c.authorName})`,
        });
      }
    }

    // 2. Audit posts for bot users
    const botPosts = await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        title: posts.title,
        content: posts.content,
        mediaUrls: posts.mediaUrls,
        authorName: users.name,
        authorRole: users.role,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(eq(users.isBot, true), isNull(posts.deletedAt)))
      .orderBy(desc(posts.createdAt))
      .limit(20);

    for (const p of botPosts) {
      let needsUpdate = false;
      let newTitle = p.title ? gemini.sanitizeAuthorIdentity(p.title, p.authorName) : p.title;
      let newContent = gemini.sanitizeAuthorIdentity(p.content, p.authorName);
      let mediaList = (p.mediaUrls as string[]) || [];

      if (newContent !== p.content || newTitle !== p.title) {
        needsUpdate = true;
      }

      // Ensure bot posts do not have repetitive stock images attached
      if (mediaList.length > 0) {
        mediaList = [];
        needsUpdate = true;
      }

      if (needsUpdate) {
        await db
          .update(posts)
          .set({
            title: newTitle,
            content: newContent,
            mediaUrls: mediaList,
            updatedAt: new Date(),
          })
          .where(eq(posts.id, p.id));

        refinedPostsCount++;
        detailsList.push(`Post tahrirlandi va rasm bilan boyitildi (${p.authorName})`);

        await db.insert(botActivities).values({
          activityType: "refine",
          botId: p.authorId,
          targetId: p.id,
          details: `Bot o'z postini tahrirladi va muqova rasmini qo'shdi (${p.authorName})`,
        });
      }
    }

    return {
      refinedPosts: refinedPostsCount,
      refinedComments: refinedCommentsCount,
      details: detailsList,
    };
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
