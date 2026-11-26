import { type NextRequest } from "next/server";
import { z } from "zod";
import { enforceAdminGuard } from "@/server/common/admin-guard";
import { AppError } from "@/server/common/errors";
import { successResponse, errorResponse } from "@/server/common/response";
import { adminMergeTags, adminUpdateTag } from "@/server/modules/tags/tags-admin.service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const AdminPatchTagSchema = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  description: z.string().trim().max(300).optional().nullable(),
  status: z.enum(["active", "pending", "restricted", "hidden", "merged"]).optional(),
  isOfficial: z.boolean().optional(),
  mergeIntoId: z.string().uuid().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await enforceAdminGuard(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      throw AppError.notFound("Teg topilmadi");
    }

    const body = await req.json().catch(() => ({}));
    const parsed = AdminPatchTagSchema.safeParse(body);
    if (!parsed.success) {
      throw AppError.validation("Teg ma’lumotlari noto‘g‘ri");
    }

    if (parsed.data.mergeIntoId) {
      const merged = await adminMergeTags(id, parsed.data.mergeIntoId);
      return successResponse(merged);
    }

    const updated = await adminUpdateTag(id, {
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
      isOfficial: parsed.data.isOfficial,
    });
    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
