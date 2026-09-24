import { successResponse } from "@/server/common/response";
import { SESSION_COOKIE_NAME } from "@/server/common/auth-guard";

export async function POST() {
  const response = successResponse({ message: "Muvaffaqiyatli chiqildi" });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
