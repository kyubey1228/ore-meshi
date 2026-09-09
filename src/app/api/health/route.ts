import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function prismaErrorCode(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  if (error instanceof Prisma.PrismaClientInitializationError) return 'INITIALIZATION_ERROR';
  return 'UNKNOWN_ERROR';
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
      { status: 'unhealthy', environment, database: 'unreachable', code: prismaErrorCode(error) },
      { status: 503 },
    );
  }

  try {
    await prisma.user.count();
    await prisma.meal.count();
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', environment, database: 'schema-unavailable', code: prismaErrorCode(error) },
      { status: 503 },
    );
  }

  return NextResponse.json({ status: 'healthy', environment, database: 'ready' });
}
