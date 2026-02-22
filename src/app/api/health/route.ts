import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || 'unknown',
    memory: {
      rss: process.memoryUsage().rss,
      heapTotal: process.memoryUsage().heapTotal,
      heapUsed: process.memoryUsage().heapUsed,
      external: process.memoryUsage().external,
    },
    services: {
      immudb: !!process.env.IMMUDB_USERNAME,
      neo4j: !!process.env.NEO4J_URI,
      stripe: !!process.env.STRIPE_SECRET_KEY,
    },
    checks: {
      database: 'unknown' as 'ok' | 'error' | 'unknown',
    },
  };

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
