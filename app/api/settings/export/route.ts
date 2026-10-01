import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { db } from "@/server/db";
import { users, posts, comments, postLikes } from "@/server/db/schema";
import { eq, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    // 1. User Profile Data
    const [userProfile] = await db
      .select()
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1);

    if (!userProfile) {
      return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    }

    // 2. User Posts
    const userPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.authorId, authUser.userId));

    // 3. User Comments
    const userComments = await db
      .select()
      .from(comments)
      .where(eq(comments.authorId, authUser.userId));

    // 4. Export archive payload
    const exportArchive = {
      exportDate: new Date().toISOString(),
      platform: "Go-getters (GDPR Export)",
      profile: {
        id: userProfile.id,
        name: userProfile.name,
        handle: userProfile.handle,
        email: userProfile.email,
        phone: userProfile.phone,
        role: userProfile.role,
        bio: userProfile.bio,
        location: userProfile.location,
        website: userProfile.website,
        socialLinks: userProfile.socialLinks,
        avatarUrl: userProfile.avatarUrl,
        coverPhotoUrl: userProfile.coverPhotoUrl,
        createdAt: userProfile.createdAt,
      },
      postsCount: userPosts.length,
      posts: userPosts.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        postType: p.postType,
        mediaUrls: p.mediaUrls,
        createdAt: p.createdAt,
      })),
      commentsCount: userComments.length,
      comments: userComments.map((c) => ({
        id: c.id,
        postId: c.postId,
        content: c.content,
        createdAt: c.createdAt,
      })),
    };

    const jsonString = JSON.stringify(exportArchive, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="gogetters-archive-${userProfile.handle.replace(/^@/, "")}.json"`,
      },
    });
  } catch (error) {
    console.error("[GDPR_EXPORT] Error generating data archive:", error);
    return NextResponse.json({ error: "Eksport qilishda xatolik yuz berdi" }, { status: 500 });
  }
}
