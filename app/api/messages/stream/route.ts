import { NextRequest } from "next/server";
import { requireAuth } from "@/server/common/auth-guard";
import { realtimeHub } from "@/server/modules/messages/realtime-hub";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  let authUser;
  try {
    authUser = await requireAuth(req);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = authUser.userId;
  let connectionId = "";
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      connectionId = realtimeHub.registerClient(userId, controller);

      // Heartbeat comment every 20 seconds to prevent proxy / NAT timeouts
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": ping\n\n"));
        } catch {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        }
      }, 20000);
    },
    cancel() {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (connectionId) {
        realtimeHub.unregisterClient(userId, connectionId);
      }
    },
  });

  req.signal.addEventListener("abort", () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (connectionId) {
      realtimeHub.unregisterClient(userId, connectionId);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable buffering in Nginx
    },
  });
}
