import 'server-only';

import { prisma } from '@/lib/prisma';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import TwitterProvider, { type TwitterProfile } from 'next-auth/providers/twitter';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { z } from 'zod';

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

export async function requirePageUser() {
  const id = await currentUserId();
  if (!id) redirect('/login');
  return id;
}
