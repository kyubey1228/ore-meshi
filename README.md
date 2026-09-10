# 俺は誰かと飯が食いたい！

「今日、誰かと飯食わない？」を気軽に形にする食事仲間募集サービスです。募集者が複数の候補日時、場所、予算、支払い条件、人数を登録し、参加希望を承認すると飯の予定が成立します。

## 技術スタック

- Next.js 16 App Router / React 19 / TypeScript strict
- Tailwind CSS 4 / shadcn/ui / React Hook Form / Zod / date-fns / react-day-picker
- Auth.js (NextAuth.js v4) + Twitter/X OAuth 2.0
- Prisma ORM 5 + Supabase PostgreSQL
- Stripe Checkout / Subscription / Customer Portal

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
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_SPONSORED_MEAL=
STRIPE_PRICE_SEAT_CAMPAIGN=
STRIPE_PRICE_BUSINESS_STANDARD=
STRIPE_PRICE_BUSINESS_PRO=
```

`AUTH_SECRET` は `openssl rand -base64 32` などで生成します。秘密情報はコミットしないでください。

## Stripe決済

Stripe Dashboardで作成済みのPrice IDとSecret Keyを環境変数へ設定します。`STRIPE_SECRET_KEY` と `STRIPE_WEBHOOK_SECRET` はサーバー専用です。`NEXT_PUBLIC_` を付けないでください。

スポンサー飯と空席スポンサーは作成時に `DRAFT` となります。「支払って公開」からCheckoutを開始し、署名検証済みのWebhookが決済完了を通知した場合だけ注文を `PAID`、キャンペーンを `ACTIVE` にします。ブラウザが `success_url` へ戻っただけでは公開されません。金額と通貨はクライアントから受け取らず、環境変数のPrice IDとStripeの決済結果を使います。

月額のSTANDARD / PROはStripe Checkoutのsubscription modeを使います。プラン変更・解約・支払方法の管理にはCustomer Portalを使います。PortalはStripe Dashboardで事前に有効化してください。

ローカルではStripe CLIでログイン後、Webhookを転送します。

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

表示された `whsec_...` をローカルの `STRIPE_WEBHOOK_SECRET` に設定します。別ターミナルからテストイベントを送信できます。

```bash
stripe trigger checkout.session.completed
```

実際のCheckoutフローの検証にはStripeテストモードの商品・Priceを使ってください。本番Webhook URLは `https://本番ドメイン/api/stripe/webhook` です。次のイベントをWebhook Endpointで購読します。

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Business UIから使うServer APIは次の通りです。

- Mutation: `src/server/actions/billing.ts` の `createSponsoredMealCheckout`、`createSeatCampaignCheckout`、`createBusinessSubscriptionCheckout`、`createBillingPortalSession`
- Query: `src/server/billing/index.ts` の `getBusinessBillingState`、`getBusinessSubscriptionPrices`、`getBusinessPlan`、`getBusinessCapabilities`、`getSponsorOrderStatus`

Checkout系Server Actionは `{ success: true, url } | { success: false, error }` を返します。UIは成功時のURLへ遷移してください。すべての操作でログイン、店舗の稼働状態、OWNER / ADMIN権限、Campaignの所有店舗をサーバー側で確認します。

`getBusinessBillingState` の `prices` はStripeから取得したSTANDARD / PROの確定金額、通貨、請求間隔を返します。Stripeが未設定または一時的に取得できない場合は空配列となるため、UIでは金額を断定せず再読み込み可能な表示にしてください。スポンサー飯・空席スポンサーのCheckout戻り先には `kind` と `order_id` が付き、`getSponsorOrderStatus` は `orderType` と `campaignId` も返します。

クーポン利用申告には `src/server/actions/coupons.ts` の `redeemCoupon` を使います。同じユーザーが同じクーポンを二重利用することはできず、成功時は `COUPON_REDEEMED` のReferralEventも同じtransactionで記録します。利用者側の状態確認は `getCouponRedemptionStatus`、店舗側の件数確認は `getCouponRedemptionCount` を `src/server/queries/coupons.ts` から利用できます。

## Business営業導線

`/business` は飲食店・スポンサー向けの公開LP、ログイン後の管理画面は `/business/dashboard` です。料金比較・シミュレーター、登録、問い合わせ、資料請求、FAQ、紹介制度、先行パートナー募集を `/business/*` に用意しています。管理者のLead管理は `/admin/leads` です。管理者にするUserはDB上の `isAdmin` を明示的に有効化してください。

Business登録は通常 `PENDING` で作成します。開発・デモで承認を省略するときだけ次を設定します。

```env
BUSINESS_AUTO_APPROVE=true
```

問い合わせと資料請求は `BusinessLead` に保存し、匿名の営業ファネルは個人情報を持たないsession keyとUTMで `BusinessMarketingEvent` に記録します。初回特典は `FirstTimeOffer.stripePromotionCodeId` にStripe Promotion Codeを設定した場合だけCheckoutへ適用されます。割引対象かどうかはBusinessAccountの過去の支払いをサーバー側で確認します。

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
