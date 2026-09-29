import type { Metadata } from "next";
import { getPostById } from "@/server/modules/posts/posts.service";
import { stripHtmlToPlainText } from "@/server/common/sanitizer";
import { PostDetailClient } from "@/components/feed/post-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  try {
    const post = await getPostById(id);
    if (!post) {
      return {
        title: "Post topilmadi — The Go-getters",
      };
    }

    const plainContent = stripHtmlToPlainText(post.content);
    const snippet =
      plainContent.length > 180 ? `${plainContent.slice(0, 180)}...` : plainContent;

    const title = post.title
      ? `${post.title} — ${post.author.name}`
      : `${post.author.name} (${post.author.handle}): "${snippet.slice(0, 70)}"`;

    const description =
      snippet || "The Go-getters — Intiluvchan insonlar, o'ziga xos g'oyalar va yangi startaplar tarmog'i";

    const mediaList = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
    const mainImageUrl =
      mediaList.length > 0 && mediaList[0]
        ? mediaList[0]
        : post.author.avatarUrl || "https://gogetters.uz/og-cover.png";

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://gogetters.uz";

    const postUrl = `${baseUrl}/${locale}/dashboard/posts/${id}`;

    return {
      title,
      description,
      metadataBase: new URL(baseUrl),
      alternates: {
        canonical: postUrl,
      },
      openGraph: {
        title,
        description,
        url: postUrl,
        siteName: "The Go-getters",
        type: "article",
        images: [
          {
            url: mainImageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [mainImageUrl],
      },
    };
  } catch {
    return {
      title: "The Go-getters — Post",
    };
  }
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <PostDetailClient params={params} />;
}
