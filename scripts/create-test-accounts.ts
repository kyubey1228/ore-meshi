import { PrismaClient } from '@prisma/client';
import { encode } from 'next-auth/jwt';

const prisma = new PrismaClient();

// 固定twitterIdでupsertするため、何度実行しても同じ2アカウント(+紐づくテスト店舗)を再利用する。
// 既存のprisma/seed.tsが扱う'seed-'プレフィックスとは重ならないよう'phase6-test-'を使う。
const GENERAL_USER_TWITTER_ID = 'phase6-test-user';
const OWNER_USER_TWITTER_ID = 'phase6-test-owner';
const ADMIN_USER_TWITTER_ID = 'phase6-test-admin';
const BUSINESS_SLUG = 'phase6-test-business';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // next-authのデフォルト(30日)に合わせる

async function upsertTestUser(twitterId: string, twitterUsername: string, displayName: string, bio: string, isAdmin = false) {
  return prisma.user.upsert({
    where: { twitterId },
    create: { twitterId, twitterUsername, displayName, bio, isAdmin, image: `https://api.dicebear.com/9.x/thumbs/svg?seed=${twitterUsername}` },
    update: { twitterUsername, displayName, bio, isAdmin },
  });
}

async function mintSessionToken(userId: string, name: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set (.env.local)');
  // next-authのjwtコールバックがtoken.userIdへ入れるのと同じ形の payload を組み立て、
  // このアプリのsecretで正規にencodeする(実際のX OAuthは経由しない、ローカル検証専用の発行)。
  return encode({ token: { userId, sub: userId, name, email: null }, secret, maxAge: SESSION_MAX_AGE });
}

async function main() {
  const generalUser = await upsertTestUser(GENERAL_USER_TWITTER_ID, 'phase6_test_user', 'テストユーザー(Phase6)', 'Phase6動作確認用のテストアカウントです。');
  const ownerUser = await upsertTestUser(OWNER_USER_TWITTER_ID, 'phase6_test_owner', 'テスト店舗オーナー(Phase6)', 'Phase6動作確認用のテスト店舗オーナーです。');
  const adminUser = await upsertTestUser(ADMIN_USER_TWITTER_ID, 'phase6_test_admin', 'テスト管理者(Phase6)', '動作確認用のテスト管理者アカウントです。', true);

  const business = await prisma.businessAccount.upsert({
    where: { slug: BUSINESS_SLUG },
    create: {
      name: 'テスト店舗(Phase6)',
      slug: BUSINESS_SLUG,
      area: '渋谷',
      businessType: 'RESTAURANT',
      contactName: 'テスト 店長',
      contactEmail: 'phase6-test-business@example.com',
      status: 'ACTIVE',
      purposes: ['新規集客'],
    },
    update: {},
  });

  await prisma.businessMember.upsert({
    where: { businessAccountId_userId: { businessAccountId: business.id, userId: ownerUser.id } },
    create: { businessAccountId: business.id, userId: ownerUser.id, role: 'OWNER', canPostToSocial: true },
    update: { role: 'OWNER' },
  });

  const generalToken = await mintSessionToken(generalUser.id, generalUser.displayName);
  const ownerToken = await mintSessionToken(ownerUser.id, ownerUser.displayName);
  const adminToken = await mintSessionToken(adminUser.id, adminUser.displayName);
  const cookieName = '__Secure-next-auth.session-token';
  const domain = 'ore-meshi.lolipop-now.app';

  console.log('\n===== 一般ユーザー(テスト) =====');
  console.log(`userId: ${generalUser.id}`);
  console.log(`X username: @${generalUser.twitterUsername}`);
  console.log(`セッションCookie値:\n${generalToken}`);

  console.log('\n===== 店舗オーナー(テスト) =====');
  console.log(`userId: ${ownerUser.id}`);
  console.log(`X username: @${ownerUser.twitterUsername}`);
  console.log(`BusinessAccount: ${business.name} (${business.id}, slug=${business.slug})`);
  console.log(`セッションCookie値:\n${ownerToken}`);

  console.log('\n===== 管理者(テスト、isAdmin=true) =====');
  console.log(`userId: ${adminUser.id}`);
  console.log(`X username: @${adminUser.twitterUsername}`);
  console.log(`セッションCookie値:\n${adminToken}`);

  console.log('\n===== ブラウザへの入れ方 =====');
  console.log(`1. Chromeで https://${domain} を開く(未ログインで一度アクセスしてCookieの土台を作る)`);
  console.log('2. DevTools(F12) → Application タブ → Storage → Cookies → 該当オリジンを選択');
  console.log(`3. 右クリック等で新規Cookieを追加:`);
  console.log(`   Name:  ${cookieName}`);
  console.log(`   Value: (上記いずれかのセッションCookie値をそのまま貼り付け)`);
  console.log(`   Domain: ${domain}`);
  console.log('   Path: /');
  console.log('   Secure: チェックする / HttpOnly: チェックする');
  console.log(`   Expires: 30日後程度(空欄だとセッションCookie扱いになりタブを閉じると消えます)`);
  console.log('4. ページをリロードすればログイン状態になります(一般ユーザー用/店舗オーナー用でCookie値を使い分けてください)');
  console.log('\n※このトークンはパスワード同然です。スクリーンショットや共有先には注意してください。');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
