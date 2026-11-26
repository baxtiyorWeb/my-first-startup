import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { AppError } from "@/server/common/errors";
import { enforceRateLimit } from "@/server/common/rate-limiter";
import { findOrCreateTag, searchTags } from "@/server/modules/tags/tags.service";

const CreateTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Teg kamida 2 ta belgidan iborat bo‘lishi kerak")
    .max(40, "Teg ko‘pi bilan 40 ta belgidan oshmasligi kerak"),
  description: z.string().trim().max(300).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    enforceRateLimit(`tags:list:ip:${ip}`, 120, 60);

    const sp = req.nextUrl.searchParams;
    const q = sp.get("q") || "";
    const sortParam = sp.get("sort");
    const sort =
      sortParam === "popular" || sortParam === "newest" || sortParam === "alpha"
        ? sortParam
        : "trending";
    const limit = Number(sp.get("limit")) || 20;
    const offset = Number(sp.get("offset")) || 0;

    const result = await searchTags({ q, sort, limit, offset });
    const response = successResponse(result.items, {
      nextOffset: result.nextOffset,
      exactMatch: result.exactMatch,
      canCreate: result.canCreate,
      normalizedCandidate: result.normalizedCandidate,
    });
    response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    enforceRateLimit(`tags:post:${authUser.userId}`, 30, 60);

    const body = await req.json().catch(() => ({}));
    const parsed = CreateTagSchema.safeParse(body);
    if (!parsed.success) {
      throw AppError.validation(
        parsed.error.issues[0]?.message || "Teg ma’lumotlari noto‘g‘ri",
        parsed.error.issues.map((i) => ({
          field: String(i.path[0] ?? "name"),
          issue: i.message,
        }))
      );
    }

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes((authUser.role || "").toUpperCase());
    const result = await findOrCreateTag({
      name: parsed.data.name,
      description: parsed.data.description,
      userId: authUser.userId,
      isAdmin,
    });

    return successResponse(
      result.tag,
      { created: result.created },
      result.created ? 201 : 200
    );
  } catch (error) {
    return errorResponse(error);
  }
}
