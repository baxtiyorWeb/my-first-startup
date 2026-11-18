import { type NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { toggleFollow } from "@/server/modules/users/users.service";
import { successResponse, errorResponse } from "@/server/common/response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const authUser = await requireAuth(req);
    const { handle } = await params;
    const decodedHandle = decodeURIComponent(handle);

    const result = await toggleFollow(decodedHandle, authUser.userId);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
