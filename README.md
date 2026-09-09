# 俺は誰かと飯が食いたい！

「今日、誰かと飯食わない？」を気軽に形にする食事仲間募集サービスです。募集者が複数の候補日時、場所、予算、支払い条件、人数を登録し、参加希望を承認すると飯の予定が成立します。

## 技術スタック

- Next.js 16 App Router / React 19 / TypeScript strict
- Tailwind CSS 4 / shadcn/ui / React Hook Form / Zod / date-fns / react-day-picker
- Auth.js (NextAuth.js v4) + Twitter/X OAuth 2.0
- Prisma ORM 5 + Supabase PostgreSQL

SupabaseはDatabaseとしてのみ使用し、認証にはSupabase Authを使いません。DBアクセスはPrismaに統一しています。

## ローカル起動

Node.js 20以降を用意し、依存関係と環境変数を設定します。

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

`http://localhost:3000` を開きます。品質チェックは `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` です。

## 環境変数

```env
DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=
AUTH_TWITTER_ID=
AUTH_TWITTER_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

`AUTH_SECRET` は `openssl rand -base64 32` などで生成します。秘密情報はコミットしないでください。

## Supabase PostgreSQL

1. Supabaseでプロジェクトを作成します。
2. Project SettingsのDatabase接続情報を開きます。
3. Transaction poolerの接続文字列を `DATABASE_URL` に設定します。Prisma向けに `?pgbouncer=true&connection_limit=1` を付けます。
4. Direct connection（環境からIPv6へ接続できない場合はSession pooler）の接続文字列を `DIRECT_URL` に設定します。
5. `npm run db:migrate` で開発用migrationを作成・適用します。本番は `npm run db:deploy` を使います。
6. `npm run db:seed` でユーザー6人、受付停止済みのサンプル飯10件、参加希望、ACTIVE Match、COMPLETED Match、リスケ、全種類のフィードバックを投入できます。サンプル飯は誤応募を防ぐため公開募集一覧には表示されません。Seedはデモデータを再作成するため、本番DBでは実行しないでください。

DBパスワードに `@`、`?`、`#`、`$` などが含まれる場合は、接続URL内のパスワード部分をパーセントエンコードしてください。たとえば `p@ss?word` は `p%40ss%3Fword` です。Supabase Dashboardが表示する接続文字列の `[YOUR-PASSWORD]` 部分へ、エンコード後の値を入れます。値全体をエンコードしてはいけません。

Prisma CLI用の `db:*` スクリプトは `.env.local` を明示的に読み込みます。通常の `npx prisma ...` は `.env.local` を自動では読み込まないため、このプロジェクトでは `npm run db:deploy` などのスクリプトを使用してください。

## Twitter/X OAuthとAuth.js

X Developer PortalでOAuth 2.0を有効にし、Web Appとして登録します。Callback URIはローカルでは `http://localhost:3000/api/auth/callback/twitter`、本番では `https://<本番ドメイン>/api/auth/callback/twitter` です。Website URLも各環境のURLに合わせます。

Client IDを `AUTH_TWITTER_ID`、Client Secretを `AUTH_TWITTER_SECRET` に設定します。`NEXTAUTH_URL` と `NEXT_PUBLIC_APP_URL` は公開URLに揃え、環境ごとに別の `AUTH_SECRET` を安全に管理します。初回ログイン時、Xから検証済みのIDを受け取りUserをupsertします。

## ロリポップ！デプロイなう

このリポジトリをGitHubへ配置し、ロリポップ！デプロイなうでリポジトリと本番ブランチを選択します。Build commandは `npm run build`、Start commandは `npm run start` を指定してください。[next.config.ts](./next.config.ts) はNode.jsサーバー向けに必須の `output: "standalone"` を設定済みです。

管理画面で `DATABASE_URL`、`DIRECT_URL`、`AUTH_SECRET`、`AUTH_TWITTER_ID`、`AUTH_TWITTER_SECRET`、`NEXT_PUBLIC_APP_URL`、`NEXTAUTH_URL` を本番値として登録し、デプロイ前またはリリース処理で `npm run db:deploy` を一度実行します。X Developer Portalの本番Callback URIも忘れずに追加してください。

## 設計メモ

- `maxParticipants` は募集者を含む総人数です。
- 最初に承認した参加希望の候補日時でMatchを作成し、その後の承認は同じ候補に限ります。
- リスケは履歴を残し、提案者を含む参加者全員の同意でMatch日時を更新します。
- 募集のキャンセルと成立後のMatchキャンセルは別の状態として管理します。
- 個別フィードバック、欠席情報、noteは公開プロフィールへ返しません。内部集計は本人向けサーバークエリだけに分離しています。
- チャット、通知、ブロック、通報、本人確認、決済、店舗予約、地図、再マッチングは将来機能です。
