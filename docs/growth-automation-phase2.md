# Growth Growth Automation Phase 2

## 1. 事前監査

既存のGrowthEvent、Referral、Notification、AnalyticsSnapshot、DailyMetrics、AreaDemandStats、HourlyDemandStats、ContentContentDraft、Growth Dashboard、エリアSEOページを再利用した。同じ意味のイベント・集計テーブルは新設していない。

## 2. DailyMetrics

`GET /api/cron/daily-metrics` が既定でJSTの前日を集計し、DailyMetrics・AreaDemandStats・HourlyDemandStats・AnalyticsSnapshotを冪等upsertする。`?date=YYYY-MM-DD`で単日再計算できる。`x-cron-secret`または`secret`は既存Cronと同じ`CRON_SECRET`を使う。

CLI backfill:

```bash
npm run analytics:backfill -- --days=7
npm run analytics:backfill -- --from=2026-09-01 --to=2026-09-10
```

JSTの半開区間 `[00:00, 翌日00:00)` をUTC instantへ変換して集計する。DailyMetricJobRunに開始・終了・対象日・処理件数・成功/失敗・エラーを保存する。

## 3. K-factor

確認済み招待はWeb Share APIが成功した`INVITE_SHARE_COMPLETED`だけを採用する。X/LINE共有画面の表示は`INVITE_SHARE_CLICKED`、コピーは`INVITE_LINK_COPIED`として区別する。K-factorは `Invites / Activated User × Invite Activation Rate`。Growth Dashboardに母数と参考値表示を追加した。

## 4. Business Lifecycle

`GET /api/cron/business-lifecycle`を追加した。OWNER/ADMINだけを通知先とし、cursor・最大200件のbatch・triggerKey・Notification dedupeKeyで再実行に耐える。未掲載、閲覧0、閲覧ありAction 0、初成果、契約終了予定、空席掲載終了を扱う。店舗設定画面で「店舗の動き」「掲載の成果」「契約・請求」「飯を呼ぶヒント」を設定できる。

## 5. Empty State

募集0件時に、最低3件以上の匿名需要、近隣の募集、10件以上の実績がある人気時間を使って次の行動を示す。A/B/C variantと表示・CTAイベントを追加した。少数データは公開しない。

## 6. SEO

`/recruitments/[area]/[genre]`を追加。30日間の募集・需要・Completedのいずれか3件以上をindex条件とし、未達は`noindex,follow`。canonical、Open Graph、BreadcrumbList、関連ジャンル、近隣エリアを含む。sitemapはDaily集計からQuality Gateを満たす組だけを掲載する。

## 7. Content Studio

既存の匿名集計テキストからImageResponseで1200x630、1080x1080、1080x1350、1080x1920のPNGを生成する。Content Studioからpreview/downloadでき、テンプレート・データソース・生成日時・形式・UTM・投稿日時を保存できる。個人名・画像は使用しない。

## 8. Admin / Recommendation

Growth HealthにDailyMetrics最終日、Cron状態、K-factor、Business activation、SEO index候補数、Content Draft数を追加した。36時間以上更新されていないDailyMetricsは警告する。十分な母数でK-factorが低い場合は既存RecommendationにReferral CTA改善候補を出す。

## 9. DB / Index

GrowthEventの既存`(eventType, createdAt)`、DailyMetricsの既存date unique/index、BusinessMemberの複合主キーを再利用した。追加migrationはDailyMetricJobRun、BusinessNotificationPreference、BusinessNotificationLog、DailyMetrics列、Content Draft列、enum追加で構成する。

## 10. Security / Privacy / Spam

Cronは秘密鍵認証、backfillはサーバーCLIのみ。店舗通知はOWNER/ADMIN限定で、設定・一意trigger・通知dedupeを適用する。SEO・SNS画像の数値は匿名集計のみで、公開最低母数を設ける。

## 11. 運用

外部CronからDailyMetricsを毎日JST 01:00以降、Business Lifecycleを1日1回呼ぶ。`hasMore=true`の場合は返却cursorを次のリクエストへ渡す。常駐timerは使わない。

## 12. Remaining Issues

X/LINEは外部投稿画面を開いた後の送信完了をブラウザから検証できないため、K-factorの確認済み招待には含めない。X APIまたは各プラットフォームのcallbackを導入できた時点でverified inviteへ昇格する。Content画像はテンプレート生成で、動画と外部生成AIは対象外。
