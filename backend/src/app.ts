import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './config/env';
import { authRoutes } from './routes/auth.routes';
import { articleRoutes } from './routes/article.routes';
import { aiRoutes } from './routes/ai.routes';
import { reportRoutes } from './routes/report.routes';
import { analyticsRoutes } from './routes/analytics.routes';
import { importRoutes } from './routes/import.routes';
import { visibilityRoutes } from './routes/visibility.routes';
import { radarRoutes } from './routes/radar.routes';
import { aiIntelligenceRoutes } from './routes/ai-intelligence.routes';
import { compareRoutes } from './routes/compare.routes';

export function buildApp() {
  const fastify = Fastify({ 
    logger: process.env.NODE_ENV === 'development'
  });

  fastify.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  fastify.register(jwt, {
    secret: env.JWT_SECRET,
  });

  fastify.register(authRoutes);
  fastify.register(articleRoutes);
  fastify.register(aiRoutes);
  fastify.register(reportRoutes);
  fastify.register(analyticsRoutes);
  fastify.register(importRoutes);
  fastify.register(visibilityRoutes);
  fastify.register(radarRoutes);
  fastify.register(aiIntelligenceRoutes);
  fastify.register(compareRoutes);

  fastify.get('/api/health', async () => {
    return { status: 'healthy', mode: process.env.VERCEL ? 'serverless' : 'server', timestamp: new Date().toISOString() };
  });

  return fastify;
}
