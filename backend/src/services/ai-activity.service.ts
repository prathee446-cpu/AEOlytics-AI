import { prisma } from '../db/prisma';

export interface AIEventData {
  type:
    | 'URL_CRAWL_STARTED'
    | 'URL_CRAWL_COMPLETED'
    | 'URL_CRAWLED'
    | 'AUDIT_STARTED'
    | 'AUDIT_COMPLETED'
    | 'KEYWORDS_FOUND'
    | 'REWRITE_STARTED'
    | 'REWRITE_COMPLETED'
    | 'FAQ_GENERATED'
    | 'SCHEMA_GENERATED'
    | 'DRAFT_SAVED'
    | 'ARTICLE_PUBLISHED'
    | 'REPORT_EXPORTED'
    | 'OPTIMIZATION_FINISHED'
    | 'RADAR_SCAN_COMPLETE'
    | 'RADAR_MENTION_FOUND';
  message: string;
  details?: Record<string, any>;
}

export class AIActivityService {
  // Store connected WS sockets
  private static wsClients: Set<any> = new Set();

  /** Returns number of currently active WebSocket connections */
  static getClientCount(): number {
    return this.wsClients.size;
  }

  /**
   * Broadcasts updated connection count and server uptime status to all connected clients
   */
  static broadcastSystemStatus() {
    const payload = JSON.stringify({
      type: 'SYSTEM_STATUS',
      serverStatus: 'Operational',
      activeConnections: this.wsClients.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });

    for (const client of this.wsClients) {
      try {
        if (client.readyState === 1) { // OPEN
          client.send(payload);
        }
      } catch (err) {
        // ignore send errors
      }
    }
  }

  /**
   * Register a new WebSocket connection
   */
  static addClient(ws: any) {
    this.wsClients.add(ws);
    console.log(`[WS-Activity] Client connected. Total: ${this.wsClients.size}`);
    
    // Broadcast updated connections to all clients immediately
    this.broadcastSystemStatus();

    // Send initial greeting
    try {
      ws.send(
        JSON.stringify({
          type: 'SYSTEM_STATUS',
          message: 'Connected to AI Intelligence real-time stream',
          serverStatus: 'Operational',
          activeConnections: this.wsClients.size,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.error('[WS-Activity] Error sending initial welcome message:', e);
    }

    // Handle incoming messages (e.g. ping/pong heartbeats)
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
        }
      } catch (err) {
        // Ignore parse errors on malformed messages
      }
    });

    // Handle error
    ws.on('error', (error: any) => {
      console.error('[WS-Activity] Socket error:', error);
      if (this.wsClients.has(ws)) {
        this.wsClients.delete(ws);
        this.broadcastSystemStatus();
      }
    });

    // Handle close
    ws.on('close', () => {
      console.log(`[WS-Activity] Client disconnected. Total: ${this.wsClients.size}`);
      if (this.wsClients.has(ws)) {
        this.wsClients.delete(ws);
        this.broadcastSystemStatus();
      }
    });
  }

  /**
   * Log an event into the DB and broadcast it to all connected sockets
   */
  static async logEvent(type: AIEventData['type'], message: string, details: Record<string, any> = {}) {
    try {
      // 1. Save to database
      const activity = await prisma.aIActivity.create({
        data: {
          type,
          message,
          details: details || {},
        },
      });

      console.log(`[AIActivity] Saved: [${type}] ${message}`);

      // 2. Broadcast to all WebSocket clients
      const payload = JSON.stringify({
        type: 'REAL_TIME_EVENT',
        event: {
          id: activity.id,
          type: activity.type,
          message: activity.message,
          details: activity.details,
          createdAt: activity.createdAt.toISOString(),
        },
      });

      let deadClients = 0;
      for (const client of this.wsClients) {
        try {
          if (client.readyState === 1) { // OPEN
            client.send(payload);
          } else {
            this.wsClients.delete(client);
            deadClients++;
          }
        } catch (err) {
          console.error('[WS-Activity] Error sending to socket client:', err);
          this.wsClients.delete(client);
          deadClients++;
        }
      }

      if (deadClients > 0) {
        console.log(`[WS-Activity] Cleaned up ${deadClients} stale client sockets.`);
      }

      return activity;
    } catch (err) {
      console.error('[AIActivity] Error logging and broadcasting event:', err);
    }
  }
}
