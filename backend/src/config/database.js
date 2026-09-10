import './env.js';
import { PrismaClient } from '@prisma/client';

export function createDatabaseClient(connectionUrl = process.env.DATABASE_URL) {
  if (!connectionUrl) throw new Error('DATABASE_URL duhet të konfigurohet në backend/.env.');
  const url = new URL(connectionUrl);
  if (url.protocol !== 'mysql:') throw new Error('DATABASE_URL duhet të përdorë MySQL.');
  return new PrismaClient({ datasources: { db: { url: connectionUrl } } });
}
