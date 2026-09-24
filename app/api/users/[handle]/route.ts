import { type NextRequest } from "next/server";
import { getOptionalAuth } from "@/server/common/auth-guard";
import { getProfileByHandle } from "@/server/modules/users/users.service";
import { successResponse, errorResponse } from "@/server/common/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const authUser = await getOptionalAuth(req);
    const { handle } = await params;
    const decodedHandle = decodeURIComponent(handle);

    const profile = await getProfileByHandle(decodedHandle, authUser?.userId);
    return successResponse(profile);
  } catch (error) {
    return errorResponse(error);
  }
}
