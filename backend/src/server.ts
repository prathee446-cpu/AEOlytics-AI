import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import path from 'path';
import http from 'http';
import fastifyStatic from '@fastify/static';
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
import { RadarSchedulerService } from './services/radar-scheduler.service';
import fastifyWebsocket from '@fastify/websocket';
import { prisma } from './db/prisma';

const fastify = Fastify({ 
  logger: process.env.NODE_ENV === 'development'
});

async function bootstrap() {
  try {
    // Register WebSockets plugin
    await fastify.register(fastifyWebsocket);

    // Register CORS allowing cross-origin calls
    await fastify.register(cors, {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    });

    // Register JWT Sign/Verification engines
    await fastify.register(jwt, {
      secret: env.JWT_SECRET,
    });

    // Register modular routers
    await fastify.register(authRoutes);
    await fastify.register(articleRoutes);
    await fastify.register(aiRoutes);
    await fastify.register(reportRoutes);
    await fastify.register(analyticsRoutes);
    await fastify.register(importRoutes);
    await fastify.register(visibilityRoutes);
    await fastify.register(radarRoutes);
    await fastify.register(aiIntelligenceRoutes);
    await fastify.register(compareRoutes);

    // Basic Health Check Endpoint
    fastify.get('/api/health', async () => {
      return { status: 'healthy', timestamp: new Date().toISOString() };
    });

    // Serve Frontend Assets in Production or Proxy to Vite in Development
    if (process.env.NODE_ENV === 'production') {
      await fastify.register(fastifyStatic, {
        root: path.join(__dirname, '../../frontend/dist'),
        prefix: '/',
        wildcard: false,
      });

      // Catch-all route to serve index.html for React SPA Router
      fastify.get('/*', async (request, reply) => {
        return reply.sendFile('index.html');
      });
    } else {
      // Development Proxy to Vite dev server on port 3000
      fastify.get('/*', (request, reply) => {
        const targetUrl = `http://localhost:3000${request.url}`;
        const proxyReq = http.request(
          targetUrl,
          {
            method: request.method,
            headers: request.headers,
          },
          (proxyRes) => {
            reply.status(proxyRes.statusCode || 200);
            Object.entries(proxyRes.headers).forEach(([key, value]) => {
              if (value !== undefined) reply.header(key, value);
            });
            reply.send(proxyRes);
          }
        );

        proxyReq.on('error', (err) => {
          reply.status(503).send('Vite development server is booting or offline...');
        });

        if (request.body) {
          proxyReq.write(typeof request.body === 'string' ? request.body : JSON.stringify(request.body));
        }
        proxyReq.end();
      });
    }

    // Server bootstrap listen
    try {
      // Establish database connection
      await prisma.$connect();

      const address = await fastify.listen({ port: env.PORT || 5000, host: '0.0.0.0' });
      console.log('HTTP Server Running');
      console.log('WebSocket Server Running');
      console.log('Listening on /ws/ai-intelligence');
      console.log('Database Connected');
      console.log('AI Intelligence Center Ready');
      
      // Start AI Radar Scheduler
      RadarSchedulerService.start();
    } catch (err: any) {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n[STARTUP ERROR] Port ${env.PORT || 5000} is already in use.`);
        console.error('Another instance of the backend is currently running.');
        console.error('Please stop the existing instance or change the PORT in your .env file.\n');
        process.exit(1);
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error('Server failed to start. Reason:', err instanceof Error ? err.message : err);
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
