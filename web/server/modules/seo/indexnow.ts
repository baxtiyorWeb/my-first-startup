import { SITE_CONFIG } from "@/lib/seo/config";

export function getIndexNowKey(): string {
  return process.env.INDEXNOW_KEY || "geters2026indexnowkey8f4a9c2d1e7b";
}

/**
 * Notify Yandex & Bing IndexNow immediately when an editorial article, video, or news item
 * is published or updated. Non-blocking, silently skips localhost URLs.
 */
export async function pingIndexNow(paths: string[]): Promise<void> {
  try {
    const baseUrl = SITE_CONFIG.url.replace(/\/$/, "");
    if (!baseUrl || baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
      return;
    }

    const host = new URL(baseUrl).hostname;
    const key = getIndexNowKey();
    const urlList = paths
      .map((p) => (p.startsWith("http") ? p : `${baseUrl}${p.startsWith("/") ? p : `/${p}`}`))
      .slice(0, 100);

    if (urlList.length === 0) return;

    const payload = {
      host,
      key,
      keyLocation: `${baseUrl}/indexnow-key.txt`,
      urlList,
    };

    const endpoints = [
      "https://api.indexnow.org/indexnow",
      "https://yandex.com/indexnow",
    ];

    await Promise.allSettled(
      endpoints.map((endpoint) =>
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(payload),
        })
      )
    );
  } catch (err) {
    console.warn("[INDEXNOW] Ping skipped/failed:", (err as Error).message);
  }
}
