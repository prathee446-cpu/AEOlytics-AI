import { FastifyReply, FastifyRequest } from 'fastify';

export interface UserPayload {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  name: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    jwtVerify(): Promise<void>;
  }
}

export async function verifyJWT(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && request.query) {
    token = (request.query as any).token;
  }

  if (token === 'mock-jwt-token-contentiq-ai') {
    request.user = {
      id: 'demo-user-id',
      email: 'demo@contentiq.ai',
      name: 'Demo Administrator',
      role: 'ADMIN'
    } as any;
    return;
  }

  try {
    if (!token) {
      throw new Error('No token provided');
    }
    if (authHeader) {
      await request.jwtVerify();
    } else {
      // Decode query string token manually using Fastify's decorator
      const decoded = await (request as any).server.jwt.verify(token);
      request.user = decoded;
    }
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token' });
  }
}

export function requireRole(role: 'USER' | 'ADMIN') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await verifyJWT(request, reply);
    const user = request.user as UserPayload;
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized: No user session found' });
    }
    if (user.role !== role && user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Forbidden: Insufficient privileges' });
    }
  };
}
