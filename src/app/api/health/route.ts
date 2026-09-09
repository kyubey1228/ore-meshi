import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function prismaErrorCode(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  if (error instanceof Prisma.PrismaClientInitializationError) {
    const code = error.errorCode ?? error.message.match(/P\d{4}/)?.[0];
    const message = error.message.toLowerCase();
    if (code) return code;
    if (message.includes('authentication failed') || message.includes('password authentication failed')) return 'AUTHENTICATION_FAILED';
    if (message.includes("can't reach database server") || message.includes('connection refused')) return 'CANNOT_REACH_SERVER';
    if (message.includes('timed out') || message.includes('timeout')) return 'CONNECTION_TIMEOUT';
    if (message.includes('certificate') || message.includes('tls') || message.includes('ssl')) return 'TLS_ERROR';
    if (message.includes('max client connections') || message.includes('too many connections')) return 'CONNECTION_LIMIT';
    return 'INITIALIZATION_ERROR';
  }
  return 'UNKNOWN_ERROR';
}

function databaseTarget() {
  try {
    const url = new URL(process.env.DATABASE_URL ?? '');
    return {
      host: url.hostname,
      port: url.port,
      transactionPooler: url.hostname.endsWith('.pooler.supabase.com') && url.port === '6543',
      projectScopedUser: url.username.includes('.'),
      passwordPresent: Boolean(url.password),
    };
  } catch {
    return { validUrl: false };
  }
}

export async function GET() {
  const environment = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    authSecret: Boolean(process.env.AUTH_SECRET),
    twitterId: Boolean(process.env.AUTH_TWITTER_ID),
    twitterSecret: Boolean(process.env.AUTH_TWITTER_SECRET),
    nextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', environment, target: databaseTarget(), database: 'unreachable', code: prismaErrorCode(error) },
      { status: 503 },
    );
  }

  try {
    await prisma.user.count();
    await prisma.meal.count();
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', environment, target: databaseTarget(), database: 'schema-unavailable', code: prismaErrorCode(error) },
      { status: 503 },
    );
  }

  return NextResponse.json({ status: 'healthy', environment, target: databaseTarget(), database: 'ready' });
}
