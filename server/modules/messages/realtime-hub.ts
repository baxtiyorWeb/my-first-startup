/**
 * Real-Time Event Dispatcher and Connection Hub for Direct Messaging (DM)
 * Provides Server-Sent Events (SSE) stream management, ephemeral typing indicators,
 * and multi-device connection tracking with presence detection.
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

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Map());
      // First connection for this user -> user went online
      this.broadcastPresence(userId, true);
    }

    const userClients = this.clients.get(userId)!;
    userClients.set(connectionId, {
      id: connectionId,
      userId,
      controller,
      connectedAt: new Date(),
    });

    // Send connection ACK
    this.sendToController(controller, {
      type: "connection:ack",
      data: {
        connectionId,
        userId,
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

    for (const client of userClients.values()) {
      this.sendToController(client.controller, event);
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
   * Internal helper to format SSE message
   */
  private sendToController(controller: SSEController, event: RealtimeMessageEvent): void {
    try {
      const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
      const encoded = new TextEncoder().encode(payload);
      controller.enqueue(encoded);
    } catch {
      // Controller may already be closed by browser
    }
  }

  /**
   * Broadcast presence update to interested peers
   */
  private broadcastPresence(userId: string, isOnline: boolean): void {
    // Notify all connected clients about presence change
    const event: RealtimeMessageEvent = {
      type: "presence:update",
      data: {
        userId,
        status: isOnline ? "online" : "offline",
        lastSeenAt: isOnline ? null : (this.lastSeenMap.get(userId) || new Date()).toISOString(),
      },
    };

    // Broadcast presence update
    for (const userClients of this.clients.values()) {
      for (const client of userClients.values()) {
        if (client.userId !== userId) {
          this.sendToController(client.controller, event);
        }
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
