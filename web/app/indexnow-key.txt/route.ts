import { NextResponse } from "next/server";
import { getIndexNowKey } from "@/server/modules/seo/indexnow";

export async function GET() {
  return new NextResponse(getIndexNowKey(), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
