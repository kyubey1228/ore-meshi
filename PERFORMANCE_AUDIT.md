# Performance Audit

調査日: 2026-09-10  
対象: Next.js 16.3.4 / Prisma 5 / Supabase PostgreSQL / ロリポップ！デプロイなう

`next.config.ts` の `output: "standalone"` は設定済みです。常駐ループ、常駐ワーカー、アプリ内スケジューラはありません。Cronは外部スケジューラからHTTPで起動する構成です。

## Critical

### 全ページが共通LayoutのAuth取得によりdynamic renderingになる

- 対象ファイル: `src/app/layout.tsx`, `src/server/auth.ts`
- 原因: Root Layoutが`currentUserId()`を呼び、内部で`connection()`と`getServerSession()`を実行する。
- 現在の処理: 公開ページ、ログインページ、OGP以外も含め、全画面でJWTセッション解決が発生する。現状のproduction buildでは36ページすべてがdynamic。
- 想定される負荷: 公開ページのキャッシュ利用を阻害し、全リクエストのTTFBへAuth処理を追加する。ページ側でも`currentUserId()`を呼ぶ場合は同一リクエスト内で重複する。
- 改善方法: リクエスト内Auth取得をReact `cache()`で共有する。公開LayoutからAuth依存を分離し、Headerの個人表示は独立したクライアント境界または認証必須Layoutへ移す。公開ページ側の不要なユーザー取得を削る。

### 人気エリアのcold pathが最大41クエリになる

- 対象ファイル: `src/server/area-stats.ts`, `src/app/page.tsx`
- 原因: 候補エリア10件を取得後、各エリアについて4件のCOUNTを`Promise.all`で発行する。
- 現在の処理: `groupBy` 1本 + 最大10エリア × 4集計。5分キャッシュはあるが、プロセス再起動や各キャッシュキー初回では大量発行される。
- 想定される負荷: Supabaseへのネットワーク往復と接続待ちが集中し、サーバーレス/再起動が多い環境ではトップページTTFBが大幅に悪化する。
- 改善方法: 人気エリア専用に期間内MealとCompleted Matchをまとめて集計し、固定3クエリ程度へ削減する。結果全体を5分キャッシュする。

### 通知Cronが無制限・通知単位で直列処理する

- 対象ファイル: `src/app/api/cron/notifications/route.ts`, `src/server/notifications.ts`
- 原因: 4種類の対象を件数制限なしで取得し、各ユーザーについてPreference、User、Notification、GrowthEvent、メールを逐次awaitする。
- 現在の処理: 対象N件に対して概ね4〜8N回のDB/外部I/O。Match参加者も無制限で、同じ時間帯範囲を別クエリで重複取得する。
- 想定される負荷: データ増加に比例して実行時間が伸び、ホスティングのtimeout、DB pool枯渇、途中終了が起きる。`dedupeKey`は冪等だが、再実行の走査コストは残る。
- 改善方法: 1回の上限、cursor、chunk並列数を導入する。必要列だけselectし、同種処理を小さなバッチに分ける。レスポンスに`hasMore`を返して外部Cronが続行可能にする。

## High

### admin Growth Dashboardがリクエストごとに多数の生集計・全件読込を行う

- 対象ファイル: `src/app/admin/growth/page.tsx`, `src/server/growth-admin.ts`, `src/server/phase3-admin.ts`, `src/server/growth-insights.ts`
- 原因: 9つの集計関数を同時実行するが、内部では多数のCOUNT/GROUP BY/findManyを行う。通知、JoinRequest、Meal、MatchParticipantを期間または全期間でアプリメモリへ読み込む処理がある。
- 現在の処理: 1ページ表示で数十クエリ。`getRepeatStats()`のJoinRequest全件読込、cohortごとの配列filter反復、通知期間全件読込が特に増大する。
- 想定される負荷: データ増加に伴ってDB CPU、転送量、Nodeメモリ、render時間が線形以上に増える。
- 改善方法: adminの認証を1リクエストで共有し、集計結果を15〜30分キャッシュする。次段階で`AnalyticsSnapshot`、`DailyMetrics`、`AreaDemandStats`、`HourlyDemandStats`へ日次/時間単位で集計し、adminはsnapshotのみ読む。

### admin Business Dashboardで同じ集計を複数経路から再計算する

- 対象ファイル: `src/app/admin/business/page.tsx`, `src/server/business-intelligence.ts`, `src/server/acquisition.ts`, `src/server/growth-insights.ts`
- 原因: `getAreaGenreMatrix()`は一部キャッシュ済みだが、前期間は非キャッシュ関数を直接実行する。Acquisition cohort分類もDashboardとInsightsから重複実行する。
- 現在の処理: 同じ期間のArea×Genre、Acquisitionを同一表示中に複数回要求する。
- 想定される負荷: GrowthEventと関連テーブルの走査が重複し、adminのTTFBが不安定になる。
- 改善方法: 引数ごとの共有キャッシュとDashboard単位のsnapshotを導入する。期間条件を必須にし、CSV exportも同じsnapshotを読む。

### トップ募集一覧が表示6件に対して最大100件と関連データを取得する

- 対象ファイル: `src/app/page.tsx`, `src/lib/data.ts`
- 原因: `getMealList()`は`take:100`でhostの嗜好、全候補日、目的、Join count、スポンサーを取得し、トップは先頭6件だけ描画する。
- 現在の処理: 最大100件をNodeでランキング後、94件を捨てる。
- 想定される負荷: DB転送量、Prisma変換、ランキングCPUとメモリが過剰。
- 改善方法: トップ用取得上限を設ける。公開ユーザー情報もカードに必要な項目へ限定する。静的なマスタは長期キャッシュする。

### インデックスが時系列集計条件を十分に覆わない

- 対象ファイル: `prisma/schema.prisma`
- 原因: `Match(status, completedAt/scheduledAt)`、`Meal(matchedAt/createdAt)`、`JoinRequest(userId, createdAt)`、`Notification(type, createdAt)`がない。
- 現在の処理: adminとCronがstatus+期間、時刻範囲、ユーザー活動期間で繰り返し検索する。
- 想定される負荷: 行数増加時にsequential scanとsortが増える。
- 改善方法: 実クエリ条件に合わせた複合indexを追加し、デプロイ後に`EXPLAIN (ANALYZE, BUFFERS)`で利用状況を確認する。

## Medium

### Meal詳細のユーザー関連クエリが直列

- 対象ファイル: `src/lib/data.ts`
- 原因: Meal取得後、JoinRequestとMatchを直列awaitする。
- 現在の処理: 認証、Meal、JoinRequest、Matchの順で待つ。
- 想定される負荷: 認証済み詳細ページにDB往復1回分の余分な待ち時間。
- 改善方法: Meal確認後のJoinRequestとMatchを`Promise.all`で並列化する。

### Business公開LPがログイン状態・Stripe・Partner DBに依存する

- 対象ファイル: `src/app/business/page.tsx`
- 原因: CTA出し分けのためmembershipを取得し、料金とPartnerCampaignもリクエスト時取得する。
- 現在の処理: 公開LPがdynamicになり、外部Stripe価格取得もcold cache時に発生する。
- 想定される負荷: 広告/X流入時のTTFBがDB・Stripe応答に影響される。
- 改善方法: 公開LPは匿名CTAを基本にし、料金・Partner情報をrevalidate付きキャッシュへ分離する。ログイン済み管理導線はHeader側で補う。

### Server Componentの内部HTTP fetchはないが、閲覧イベントが追加HTTPを発行する

- 対象ファイル: `src/components/business-marketing-tracker.tsx`, `src/components/growth-tracker.tsx`
- 原因: Client ComponentからイベントごとにAPI RouteへPOSTする。
- 現在の処理: 表示自体をブロックしないが、LP内の複数Sectionで個別リクエストが発生する。
- 想定される負荷: LP閲覧1回あたりのリクエスト数とDB insert数が増える。
- 改善方法: `sendBeacon`とクライアントside queueでまとめる。低優先イベントはサンプリングまたはバッチinsertする。

## Low

### Client Component数は多いが境界は末端中心

- 対象ファイル: `src/components/*`
- 原因: フォーム、Dialog、閲覧計測、localStorage機能が個別にClient Component化されている。
- 現在の処理: Root Layoutやページ全体に`use client`はなく、admin専用コードが一般画面へ直接importされる形も見当たらない。
- 想定される負荷: 現時点では限定的。`lucide-react`はnamed importでtree shaking対象。
- 改善方法: build analyzer導入時にフォーム/UI primitivesのchunk重複を確認し、重い画面だけdynamic importする。

### 画像は概ね適正

- 対象ファイル: `public/business/hero/izakaya-interior.jpg`, `src/components/meal-card.tsx`, Business LP preview
- 原因: 最大の静的画像は約288KB。外部プロフィール画像は`next/image`だが`unoptimized`。
- 現在の処理: LP下部画像はlazy、壊れたスクリーンショットはReact fallback。priorityの乱用なし。
- 想定される負荷: 外部avatar最適化を無効化しているため配信元サイズに依存する。
- 改善方法: X画像hostを安全に許可できる場合は`remotePatterns`を設定し、`unoptimized`を外す。

## 計測上の制約

- production TTFB/API時間はネットワーク許可のある環境から複数回測定する。
- DB query count/durationは現状instrumentationがなく正確なbefore値を取得できない。コード静的解析上、トップ人気エリアcold pathは最大41件、Growth adminは数十件。
- 改善後は`[PERF]`ログとレスポンスの`Server-Timing`、クエリ件数/合計時間を使って継続比較する。
