import { type NextRequest } from "next/server";
import { getOptionalAuth } from "@/server/common/auth-guard";
import { successResponse, errorResponse } from "@/server/common/response";
import { getProfileSummaryByHandle } from "@/server/modules/users/users.service";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getOptionalAuth(req);
    if (!authUser) {
      return successResponse({
        isAuthenticated: false,
        isOnboarded: false,
        user: null,
      });
    }

    // Identity + counters only: the session payload must not carry the user's
    // post and discussion collections on every app start.
    const profile = await getProfileSummaryByHandle(authUser.handle, authUser.userId);

    return successResponse({
      isAuthenticated: true,
      isOnboarded: profile.isOnboarded,
      user: {
        ...profile,
        phone: authUser.phone,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
