import { FastifyReply } from 'fastify';

interface SSEClient {
  userId: string;
  reply: FastifyReply;
}

export class SSEService {
  private static clients: Set<SSEClient> = new Set();

  /**
   * Register a new client connection for SSE updates
   */
  static addClient(userId: string, reply: FastifyReply) {
    const client: SSEClient = { userId, reply };
    this.clients.add(client);

    // Keep connection alive
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send a connection confirmation event
    this.sendToUser(userId, 'connected', { status: 'established', userId, timestamp: new Date().toISOString() });

    // Clean up when client disconnects
    reply.raw.on('close', () => {
      this.clients.delete(client);
      console.log(`[SSE] Client disconnected for user: ${userId}. Total clients remaining: ${this.clients.size}`);
    });

    console.log(`[SSE] Client registered for user: ${userId}. Total clients: ${this.clients.size}`);
  }

  /**
   * Broadcast message to a specific user's active client connections
   */
  static sendToUser(userId: string, eventName: string, data: any) {
    const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      if (client.userId === userId) {
        try {
          client.reply.raw.write(message);
        } catch (err) {
          console.error(`[SSE] Error pushing to user client ${userId}:`, err);
        }
      }
    }
  }

  /**
   * Broadcast message to all active client connections
   */
  static sendToAll(eventName: string, data: any) {
    const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.reply.raw.write(message);
      } catch (err) {
        console.error(`[SSE] Error broadcasting to client ${client.userId}:`, err);
      }
    }
  }
}
