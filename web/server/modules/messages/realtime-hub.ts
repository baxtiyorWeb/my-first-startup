/**
 * Real-Time Event Dispatcher and Connection Hub for Direct Messaging (DM) & Community.
 * Provides Server-Sent Events (SSE) stream management, cross-instance fan-out via
 * PostgreSQL LISTEN/NOTIFY, ephemeral typing indicators, multi-device connection
 * tracking, dead connection pruning, and live presence detection.
 */
import pg from "pg";

const PG_REALTIME_CHANNEL = "geters_realtime_v1";
const MAX_PG_NOTIFY_BYTES = 7200;

interface PgBridgeEnvelope {
  origin: string;
  target: "dm" | "community";
  userIds?: string[];
  event: RealtimeMessageEvent;
}

export interface RealtimeMessageEvent {
  type:
    | "connection:ack"
    | "message:new"
    | "message:read"
    | "typing:update"
    | "presence:update"
    | "conversation:update"
    | "message:updated"
    | "message:deleted"
    | "message:reaction"
    | "typing:start"
    | "typing:stop"
    | "member:joined"
    | "member:left";
  data: any;
}

export type SSEController = ReadableStreamDefaultController<Uint8Array>;

export type RealtimeChannel = "dm" | "community";

interface ActiveClient {
  id: string; // unique client connection ID (for tab/device)
  userId: string;
  channel: RealtimeChannel;
  controller: SSEController;
  connectedAt: Date;
}

interface TypingState {
  conversationId: string;
  userId: string;
  timer: NodeJS.Timeout;
}

class RealtimeHubService {
  private readonly instanceId = `hub_${process.pid}_${Math.random().toString(36).slice(2, 10)}`;

  // Map of userId -> Map of connectionId -> ActiveClient
  private clients = new Map<string, Map<string, ActiveClient>>();

  // Map of `${conversationId}:${userId}` -> TypingState
  private typingStates = new Map<string, TypingState>();

  // Map of userId -> lastSeenAt
  private lastSeenMap = new Map<string, Date>();

  // Cross-instance PostgreSQL LISTEN/NOTIFY bridge
  private pgListener: pg.Client | null = null;
  private pgPublisher: pg.Pool | null = null;
  private pgConnecting = false;
  private pgReconnectTimer: NodeJS.Timeout | null = null;

  private getDirectConnectionString(): string | null {
    const direct = process.env.DIRECT_URL;
    if (direct) return direct;
    const url = process.env.DATABASE_URL;
    if (!url) return null;
    // Neon pooler hostnames (`ep-xxx-pooler.region.aws.neon.tech`) use PgBouncer
    // transaction pooling which drops LISTEN/NOTIFY; stripping `-pooler.` connects
    // to Neon's direct session endpoint that supports LISTEN/NOTIFY natively.
    return url.includes("-pooler.") ? url.replace("-pooler.", ".") : url;
  }

  private ensurePgListener(): void {
    if (this.pgListener || this.pgConnecting) return;
    const connectionString = this.getDirectConnectionString();
    if (!connectionString) return;

    this.pgConnecting = true;
    const client = new pg.Client({ connectionString });

    client
      .connect()
      .then(async () => {
        await client.query(`LISTEN ${PG_REALTIME_CHANNEL}`);
        this.pgListener = client;
        this.pgConnecting = false;

        client.on("notification", (msg) => {
          if (msg.channel !== PG_REALTIME_CHANNEL || !msg.payload) return;
          try {
            const envelope = JSON.parse(msg.payload) as PgBridgeEnvelope;
            if (!envelope || envelope.origin === this.instanceId || !envelope.event) return;
            if (envelope.target === "community") {
              this.deliverCommunityLocal(envelope.event);
            } else if (envelope.target === "dm" && Array.isArray(envelope.userIds)) {
              for (const uid of envelope.userIds) {
                this.deliverDmLocal(uid, envelope.event);
              }
            }
          } catch {
            // Ignore malformed cross-instance notification
          }
        });

        client.on("error", () => {
          this.teardownPgListener();
          this.schedulePgReconnect();
        });

        client.on("end", () => {
          this.teardownPgListener();
          if (this.clients.size > 0) {
            this.schedulePgReconnect();
          }
        });
      })
      .catch(() => {
        this.pgConnecting = false;
        try {
          client.end().catch(() => {});
        } catch {}
        this.schedulePgReconnect();
      });
  }

  private teardownPgListener(): void {
    const existing = this.pgListener;
    this.pgListener = null;
    this.pgConnecting = false;
    if (existing) {
      try {
        existing.removeAllListeners();
        existing.end().catch(() => {});
      } catch {}
    }
  }

  private schedulePgReconnect(): void {
    if (this.pgReconnectTimer || this.clients.size === 0) return;
    this.pgReconnectTimer = setTimeout(() => {
      this.pgReconnectTimer = null;
      if (this.clients.size > 0) {
        this.ensurePgListener();
      }
    }, 5000);
  }

  private publishCrossInstance(envelope: Omit<PgBridgeEnvelope, "origin">): void {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) return;

    try {
      const payload = JSON.stringify({ ...envelope, origin: this.instanceId });
      if (Buffer.byteLength(payload, "utf8") > MAX_PG_NOTIFY_BYTES) {
        // PostgreSQL NOTIFY limit is 8KB; skip oversized payload (clients resync via HTTP)
        return;
      }
      if (!this.pgPublisher) {
        this.pgPublisher = new pg.Pool({ connectionString, max: 2 });
      }
      this.pgPublisher
        .query("SELECT pg_notify($1, $2)", [PG_REALTIME_CHANNEL, payload])
        .catch(() => {});
    } catch {
      // Never block local delivery on pub/sub errors
    }
  }

  /**
   * Register a new active client stream
   */
  public registerClient(
    userId: string,
    controller: SSEController,
    channel: RealtimeChannel = "dm"
  ): string {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const wasOffline = !this.isUserOnline(userId);

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Map());
    }

    const userClients = this.clients.get(userId)!;
    userClients.set(connectionId, {
      id: connectionId,
      userId,
      channel,
      controller,
      connectedAt: new Date(),
    });

    if (wasOffline) {
      // First connection for this user -> broadcast user is now online
      this.broadcastPresence(userId, true);
    }

    // Ensure cross-instance Postgres LISTEN is active while at least one client is connected
    this.ensurePgListener();

    // Advise browser EventSource to reconnect quickly (2s) on transient proxy drops
    try {
      controller.enqueue(new TextEncoder().encode("retry: 2000\n\n"));
    } catch {}

    // Send connection ACK with list of currently online user IDs
    const onlineUserIds = Array.from(this.clients.keys()).filter((uid) => this.isUserOnline(uid));
    this.sendToController(userId, connectionId, controller, {
      type: "connection:ack",
      data: {
        connectionId,
        userId,
        onlineUserIds,
        timestamp: new Date().toISOString(),
      },
    });

    return connectionId;
  }

  /**
   * Unregister an active client stream on close/disconnect
   */
  public unregisterClient(userId: string, connectionId: string): void {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    userClients.delete(connectionId);

    if (userClients.size === 0) {
      this.clients.delete(userId);
      this.lastSeenMap.set(userId, new Date());
      // Last connection closed -> user went offline
      this.broadcastPresence(userId, false);
    }
  }

  /**
   * Immediately terminate all active connections of a user on logout
   */
  public forceUserOffline(userId: string): void {
    const userClients = this.clients.get(userId);
    if (userClients) {
      for (const client of userClients.values()) {
        try {
          client.controller.close();
        } catch {}
      }
      this.clients.delete(userId);
    }
    const now = new Date();
    this.lastSeenMap.set(userId, now);
    this.broadcastPresence(userId, false);
  }

  /**
   * Check if a user currently has at least one active connection
   */
  public isUserOnline(userId: string): boolean {
    const userClients = this.clients.get(userId);
    return Boolean(userClients && userClients.size > 0);
  }

  /**
   * Get last seen timestamp for a user
   */
  public getLastSeen(userId: string): Date | null {
    return this.lastSeenMap.get(userId) || null;
  }

  private deliverDmLocal(userId: string, event: RealtimeMessageEvent): void {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) return;

    const deadConnections: string[] = [];

    for (const [connId, client] of userClients.entries()) {
      if (client.channel !== "dm") continue;
      const ok = this.sendToController(userId, connId, client.controller, event);
      if (!ok) {
        deadConnections.push(connId);
      }
    }

    for (const connId of deadConnections) {
      this.unregisterClient(userId, connId);
    }
  }

  private deliverCommunityLocal(event: RealtimeMessageEvent): void {
    for (const [userId, userClients] of this.clients.entries()) {
      const deadConnections: string[] = [];
      for (const [connId, client] of userClients.entries()) {
        if (client.channel !== "community") continue;
        const ok = this.sendToController(userId, connId, client.controller, event);
        if (!ok) deadConnections.push(connId);
      }
      for (const connId of deadConnections) {
        this.unregisterClient(userId, connId);
      }
    }
  }

  /**
   * Send a real-time event to all active DM devices of a specific user
   */
  public emitToUser(userId: string, event: RealtimeMessageEvent): void {
    this.deliverDmLocal(userId, event);
    this.publishCrossInstance({ target: "dm", userIds: [userId], event });
  }

  /**
   * Send a real-time event to a list of users
   */
  public emitToUsers(userIds: string[], event: RealtimeMessageEvent): void {
    for (const userId of userIds) {
      this.deliverDmLocal(userId, event);
    }
    if (userIds.length > 0) {
      this.publishCrossInstance({ target: "dm", userIds, event });
    }
  }

  /**
   * Broadcast an event to every connected Community client.
   * Used by the single official Geters Community chat.
   */
  public broadcast(event: RealtimeMessageEvent): void {
    this.deliverCommunityLocal(event);
    this.publishCrossInstance({ target: "community", event });
  }

  /**
   * Number of users with at least one live connection
   */
  public getOnlineCount(): number {
    let total = 0;
    for (const userId of this.clients.keys()) {
      if (this.isUserOnline(userId)) total += 1;
    }
    return total;
  }

  /**
   * Handle ephemeral typing indicators with automatic timeout expiration
   */
  public setTyping(
    conversationId: string,
    userId: string,
    recipientUserIds: string[],
    isTyping: boolean
  ): void {
    const key = `${conversationId}:${userId}`;
    const existing = this.typingStates.get(key);

    if (existing) {
      clearTimeout(existing.timer);
      this.typingStates.delete(key);
    }

    if (isTyping) {
      // Auto-expire after 3.5 seconds in case client fails to send isTyping: false
      const timer = setTimeout(() => {
        this.typingStates.delete(key);
        this.emitToUsers(recipientUserIds, {
          type: "typing:update",
          data: { conversationId, userId, isTyping: false },
        });
      }, 3500);

      this.typingStates.set(key, { conversationId, userId, timer });
    }

    // Broadcast typing update to peer participants
    this.emitToUsers(recipientUserIds, {
      type: "typing:update",
      data: { conversationId, userId, isTyping },
    });
  }

  /**
   * Internal helper to format SSE message and safely detect dead sockets
   */
  private sendToController(
    userId: string,
    connectionId: string,
    controller: SSEController,
    event: RealtimeMessageEvent
  ): boolean {
    try {
      const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
      const encoded = new TextEncoder().encode(payload);
      controller.enqueue(encoded);
      return true;
    } catch {
      // Stream/TCP socket dead or closed by client
      return false;
    }
  }

  /**
   * Broadcast presence update to all connected clients
   */
  private broadcastPresence(userId: string, isOnline: boolean): void {
    const event: RealtimeMessageEvent = {
      type: "presence:update",
      data: {
        userId,
        status: isOnline ? "online" : "offline",
        lastSeenAt: isOnline ? null : (this.lastSeenMap.get(userId) || new Date()).toISOString(),
      },
    };

    for (const [clientUserId, userClients] of this.clients.entries()) {
      if (clientUserId === userId) continue;

      const deadConnections: string[] = [];
      for (const [connId, client] of userClients.entries()) {
        const ok = this.sendToController(clientUserId, connId, client.controller, event);
        if (!ok) {
          deadConnections.push(connId);
        }
      }
      for (const connId of deadConnections) {
        this.unregisterClient(clientUserId, connId);
      }
    }
  }
}

// Global singleton instance shared across all Next.js App Router route bundles
// (both development HMR and production `next start` chunks).
const GLOBAL_HUB_KEY = "__gogetters_realtime_hub_v4";
const existingRealtimeHub = (globalThis as Record<string, unknown>)[GLOBAL_HUB_KEY] as
  | RealtimeHubService
  | undefined;
const globalRealtimeHub: RealtimeHubService =
  existingRealtimeHub &&
  typeof existingRealtimeHub.broadcast === "function" &&
  typeof existingRealtimeHub.getOnlineCount === "function"
    ? existingRealtimeHub
    : new RealtimeHubService();
(globalThis as Record<string, unknown>)[GLOBAL_HUB_KEY] = globalRealtimeHub;

export const realtimeHub: RealtimeHubService = globalRealtimeHub;
