# Required Backend Changes (Business UX → Codex/Billing)

Business向けフロントエンド実装(`src/app/business/*`等)からバックエンド側に依頼したい変更点。

## 1. `getSponsorOrderStatus` の拡張
現状 `{id, status, paidAt}` のみを返す。決済成功画面(`/business?checkout=success&order_id=...`)で「スポンサー飯」「空席スポンサー」など商品別のコピーを出し分けたいので、`orderType` と `campaignId` を追加してほしい。

## 2. Checkout の success_url / cancel_url に `kind` を含める
現状 `createSponsoredMealCheckout`/`createSeatCampaignCheckout` の `success_url`/`cancel_url` は `order_id` のみで、`kind=SPONSORED_MEAL|SEAT_CAMPAIGN` を含まない。含めてもらえると成功/キャンセル画面のコピーとリンク先をより正確に出し分けられる。

## 3. ✅ 解決済み: Direct Ad(企業広告)のサーバー側プランガード
`createBusinessCampaign`のDIRECT_AD_CAMPAIGN分岐に`getBusinessCapabilities().canCreateDirectAd`のチェックが追加されました。

## 4. ✅ 解決済み: `SponsoredMeal` / `SeatCampaign` に自由文`description`カラム
`description`カラムが追加されました(`prisma/migrations/20260910021000_campaign_descriptions_coupon_redemptions/`)。Wizard側でも今後`description`を使うよう更新予定。

## 5. ✅ 解決済み: クーポン利用(`COUPON_REDEEMED`)の記録導線
`CouponRedemption`モデル・`redeemCoupon`(`src/server/actions/coupons.ts`)・`getCouponRedemptionCount`/`getCouponRedemptionStatus`(`src/server/queries/coupons.ts`)が追加されました。`/business/coupons`一覧は`_count.redemptions`を使って利用数を表示するよう更新済みです。公開キャンペーンページ(`/campaigns/coupon/[id]`)に「クーポンを使う」ボタン(`redeemCoupon`呼び出し)を追加すると、一般ユーザーが実際に利用申告できるようになります(未実装)。

## 6. STANDARD/PROの月額金額表示
Stripe Price ID(`STRIPE_PRICE_BUSINESS_STANDARD`/`STRIPE_PRICE_BUSINESS_PRO`)はenv変数経由でのみ分かり、金額をUIで安全に取得する手段がない。`getBusinessBillingState`等に確定金額フィールドを追加してもらえると、`/business/billing`で実際の月額を表示できる。

## 7. (フロント側メモ・要バックエンド判断ではない)
- `SeatCampaign`の「時間切れ」は`status==='ACTIVE' && endsAt<=now`をUI側で算出しているだけで、自動的に`ENDED`へ遷移させるバッチは無い。
- Xの「表示(インプレッション)」はX API連携がないため計測できない。
