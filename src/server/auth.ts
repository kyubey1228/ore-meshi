import 'server-only';

import { prisma } from '@/lib/prisma';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import TwitterProvider, { type TwitterProfile } from 'next-auth/providers/twitter';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { recordGrowthEvent } from '@/server/growth';
import { REFERRAL_COOKIE } from '@/server/referral-constants';

export const authConfigured = Boolean(
  process.env.AUTH_SECRET &&
  process.env.AUTH_TWITTER_ID &&
  process.env.AUTH_TWITTER_SECRET &&
  process.env.DATABASE_URL,
);

const twitterProfileSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    username: z.string().min(1),
    name: z.string().min(1),
    profile_image_url: z.string().url().nullish(),
    description: z.string().nullish(),
  }),
});

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login' },
  providers: [
    TwitterProvider<TwitterProfile>({
      clientId: process.env.AUTH_TWITTER_ID ?? '',
      clientSecret: process.env.AUTH_TWITTER_SECRET ?? '',
      version: '2.0',
      userinfo: {
        url: 'https://api.twitter.com/2/users/me',
        params: { 'user.fields': 'profile_image_url,description' },
      },
      profile({ data }) {
        return {
          id: data.id,
          name: data.name,
          email: null,
          image: data.profile_image_url ?? null,
          twitterUsername: data.username,
          bio: data.description ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider !== 'twitter') return token;

      const { data: xProfile } = twitterProfileSchema.parse(profile);
      if (account.providerAccountId !== xProfile.id) {
        throw new Error('X OAuth account ID does not match the returned profile.');
      }
      // Xが検証したIDだけをアカウントキーとして使い、クライアント由来のIDは信用しない。
      const existing = await prisma.user.findUnique({ where: { twitterId: xProfile.id }, select: { id: true } });
      const user = await prisma.user.upsert({
        where: { twitterId: xProfile.id },
        create: {
          twitterId: xProfile.id,
          twitterUsername: xProfile.username,
          displayName: xProfile.name,
          image: xProfile.profile_image_url,
          bio: xProfile.description,
        },
        update: {
          twitterUsername: xProfile.username,
          displayName: xProfile.name,
          image: xProfile.profile_image_url,
          bio: xProfile.description,
        },
        select: { id: true },
      });

      if (!existing) {
        await recordGrowthEvent('SIGNUP_COMPLETED', { userId: user.id, loggedIn: true });
        const referralCode = (await cookies()).get(REFERRAL_COOKIE)?.value;
        if (referralCode) {
          const referral = await prisma.referral.findFirst({ where: { referralCode, referredUserId: null }, orderBy: { createdAt: 'desc' } });
          if (referral && referral.referrerUserId !== user.id) {
            await prisma.referral.update({ where: { id: referral.id }, data: { referredUserId: user.id, convertedAt: new Date() } });
            await recordGrowthEvent('REFERRAL_SIGNUP_COMPLETED', { userId: user.id, loggedIn: true, recruitmentId: referral.mealId ?? undefined });
          }
        }
      }

      token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      return session;
    },
  },
};

export async function currentUserId() {
  await connection();
  if (!authConfigured) return null;
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function requirePageUser(next?: string) {
  const id = await currentUserId();
  if (!id) redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  return id;
}

export async function requireBusinessPageUser(next?: string) {
  const id = await currentUserId();
  if (!id) redirect(next ? `/business/login?next=${encodeURIComponent(next)}` : '/business/login');
  return id;
}
