import { FastifyInstance } from 'fastify';
import { buildApp } from '../backend/src/app';
import { prisma } from '../backend/src/db/prisma';

let app: FastifyInstance;

export default async function handler(req: any, res: any) {
  if (!app) {
    app = buildApp();
    await app.ready();
  }

  // Ensure DB connection is active in the serverless environment
  try {
    await prisma.$connect();
  } catch (err) {
    console.error('Failed to connect to Prisma inside serverless handler:', err);
  }

  app.server.emit('request', req, res);
}
