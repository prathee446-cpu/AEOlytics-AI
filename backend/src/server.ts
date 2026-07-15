import path from 'path';
import http from 'http';
import fastifyStatic from '@fastify/static';
import { env } from './config/env';
import { buildApp } from './app';
import { RadarSchedulerService } from './services/radar-scheduler.service';
import { prisma } from './db/prisma';

async function bootstrap() {
  const fastify = buildApp();

  try {
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

    // Establish database connection
    await prisma.$connect();

    // Start server
    await fastify.listen({ port: env.PORT || 5000, host: '0.0.0.0' });
    console.log('HTTP Server Running on port', env.PORT || 5000);
    console.log('Database Connected');
    
    // Start AI Radar Scheduler (only in long-running mode)
    RadarSchedulerService.start();
  } catch (err: any) {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[STARTUP ERROR] Port ${env.PORT || 5000} is already in use.`);
      process.exit(1);
    } else {
      console.error('Server failed to start. Reason:', err);
      process.exit(1);
    }
  }
}

bootstrap();
