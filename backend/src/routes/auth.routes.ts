import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma';
import { verifyJWT } from '../middlewares/auth';

export async function authRoutes(fastify: FastifyInstance) {
  // Register Account
  fastify.post('/api/auth/register', async (request, reply) => {
    const { name, email, password } = request.body as any;

    if (!name || !email || !password) {
      return reply.status(400).send({ error: 'Name, email, and password are required' });
    }

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.status(409).send({ error: 'A user with this email address already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: 'ADMIN', // Default to ADMIN for local standalone installation convenience
        },
      });

      const token = (fastify as any).jwt.sign({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: 'Internal registration error' });
    }
  });

  // Login Portal
  fastify.post('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body as any;

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.status(401).send({ error: 'Invalid email credentials' });
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return reply.status(401).send({ error: 'Invalid password credentials' });
      }

      const token = (fastify as any).jwt.sign({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: 'Internal login error' });
    }
  });

  // Get Profile Details
  fastify.get('/api/auth/profile', { preHandler: verifyJWT }, async (request) => {
    const payload = request.user as any;
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return user;
  });

  // Mock Forgot / Reset Password endpoints to complete module requirements
  fastify.post('/api/auth/forgot-password', async (request, reply) => {
    const { email } = request.body as any;
    if (!email) return reply.status(400).send({ error: 'Email is required' });
    return { message: 'Reset email triggered. (Simulated path)' };
  });

  fastify.post('/api/auth/reset-password', async (request, reply) => {
    const { token, newPassword } = request.body as any;
    if (!token || !newPassword) return reply.status(400).send({ error: 'Token and new password required' });
    return { message: 'Password has been reset. (Simulated path)' };
  });
}
