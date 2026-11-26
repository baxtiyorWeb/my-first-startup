import { type NextRequest } from "next/server";
import {
  getPublishedContentCategories,
  type PublicContentKind,
} from "@/server/modules/content/seo-content.service";
import { getCategoryMeta } from "@/lib/seo/slugify";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { successResponse, errorResponse } from "@/server/common/response";

/**
 * Dynamic content categories derived from published posts.
 * Used by the mobile feed to render category chips that are never hardcoded.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const kindParam = searchParams.get("kind");
    const kind: PublicContentKind | "all" =
      kindParam === "article" || kindParam === "video" || kindParam === "news"
        ? kindParam
        : "all";

    const localeParam = searchParams.get("locale") || "uz";
    const locale = (isValidLocale(localeParam) ? localeParam : "uz") as Locale;

    const rows = await getPublishedContentCategories(kind);
    const data = rows.map((row) => ({
      slug: row.slug,
      name: getCategoryMeta(row.slug).label[locale],
      count: row.count,
    }));

    const response = successResponse(data);
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=120"
    );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
