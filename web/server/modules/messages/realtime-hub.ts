/**
 * Real-Time Event Dispatcher and Connection Hub for Direct Messaging (DM)
 * Provides Server-Sent Events (SSE) stream management, ephemeral typing indicators,
 * multi-device connection tracking, dead connection pruning, and live presence detection.
 */

export interface RealtimeMessageEvent {
  type:
    | "connection:ack"
    | "message:new"
    | "message:read"
    | "typing:update"
    | "presence:update"
    | "conversation:update";
  data: any;
}

export type SSEController = ReadableStreamDefaultController<Uint8Array>;

interface ActiveClient {
  id: string; // unique client connection ID (for tab/device)
  userId: string;
  controller: SSEController;
  connectedAt: Date;
}

interface TypingState {
  conversationId: string;
  userId: string;
  timer: NodeJS.Timeout;
}

class RealtimeHubService {
  // Map of userId -> Map of connectionId -> ActiveClient
  private clients = new Map<string, Map<string, ActiveClient>>();

  // Map of `${conversationId}:${userId}` -> TypingState
  private typingStates = new Map<string, TypingState>();

  // Map of userId -> lastSeenAt
  private lastSeenMap = new Map<string, Date>();

  /**
   * Register a new active client stream
   */
  public registerClient(userId: string, controller: SSEController): string {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const wasOffline = !this.isUserOnline(userId);

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Map());
    }

    const userClients = this.clients.get(userId)!;
    userClients.set(connectionId, {
      id: connectionId,
      userId,
      controller,
      connectedAt: new Date(),
    });

    if (wasOffline) {
      // First connection for this user -> broadcast user is now online
      this.broadcastPresence(userId, true);
    }

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

  /**
   * Send a real-time event to all active devices of a specific user
   */
  public emitToUser(userId: string, event: RealtimeMessageEvent): void {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) return;

    const deadConnections: string[] = [];

    for (const [connId, client] of userClients.entries()) {
      const ok = this.sendToController(userId, connId, client.controller, event);
      if (!ok) {
        deadConnections.push(connId);
      }
    }

    for (const connId of deadConnections) {
      this.unregisterClient(userId, connId);
    }
  }

  /**
   * Send a real-time event to a list of users
   */
  public emitToUsers(userIds: string[], event: RealtimeMessageEvent): void {
    for (const userId of userIds) {
      this.emitToUser(userId, event);
    }
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

// Global singleton instance
const globalRealtimeHub = (globalThis as any).__gogetters_realtime_hub || new RealtimeHubService();
if (process.env.NODE_ENV !== "production") {
  (globalThis as any).__gogetters_realtime_hub = globalRealtimeHub;
}

export const realtimeHub: RealtimeHubService = globalRealtimeHub;
