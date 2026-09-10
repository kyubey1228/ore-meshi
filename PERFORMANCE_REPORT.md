# Performance Report

実施日: 2026-09-10

## 計測結果

変更前の本番環境（`https://ore-meshi.lolipop-now.app`）を外部HTTPクライアントから計測した結果です。ネットワーク時間を含みます。

| 対象 | 回数 | TTFB | Total |
|---|---:|---:|---:|
| `/` cold | 1 | 2,571ms | 21,255ms |
| `/` warm | 2 | 135ms | 2,962ms |
| `/` warm | 3 | 116ms | 2,497ms |
| `/api/health` | 1 | 1,963ms | 1,964ms |

### デプロイ後比較（2026-09-10計測）

計測コマンド: `scripts/perf-measure.sh https://ore-meshi.lolipop-now.app`

| 対象 | Before TTFB | After TTFB | Before Total | After Total | TTFB差 |
|---|---:|---:|---:|---:|---:|
| `/` cold相当 | 2,571ms | 225ms | 21,255ms | 228ms | -91.2% |
| `/` warm 1 | 135ms | 71ms | 2,962ms | 71ms | -47.4% |
| `/` warm 2 | 116ms | 17ms | 2,497ms | 18ms | -85.3% |
| `/api/health` | 1,963ms | 2,305ms | 1,964ms | 2,307ms | +17.4% |

レスポンスヘッダー上、トップ3回はすべて`x-nextjs-cache: STALE`でした。そのため「cold相当」は`Cache-Control: no-cache`を付けた初回測定を指し、プロセス自体のcold startを保証する値ではありません。トップのTTFBと本文転送は大幅に短縮しました。一方、DBへ実際に接続するhealthは約2.3秒で、変更前より342ms遅く、Supabase接続経路は引き続きボトルネックです。

### PERFログ集計

`<PERF_DB_LOG>`と`<PERF_ADMIN_LOG>`の実ログは、この作業環境からロリポップ！デプロイなうの実行ログへアクセスできず、依頼にもログ本文が含まれていないため未集計です。値を推測して埋めることはしません。

| Category | 最大 | 中央値 | 件数 | 100ms超 |
|---|---:|---:|---:|---:|
| DB | 計測ログ待ち | 計測ログ待ち | 計測ログ待ち | 計測ログ待ち |
| AUTH | 計測ログ待ち | 計測ログ待ち | 計測ログ待ち | 計測ログ待ち |
| HOME | 計測ログ待ち | 計測ログ待ち | 計測ログ待ち | **未判定** |
| ADMIN | 計測ログ待ち | 計測ログ待ち | 計測ログ待ち | **未判定** |
| RECOMMENDATION | 計測ログ待ち | 計測ログ待ち | 計測ログ待ち | 計測ログ待ち |
| MATCH_SCORE | 計測ログ待ち | 計測ログ待ち | 計測ログ待ち | 計測ログ待ち |
| NOTIFICATION | 計測ログ待ち | 計測ログ待ち | 計測ログ待ち | 計測ログ待ち |

ロリポップ！デプロイなうでは本番ログを取得できないため、Phase 0のログ集計は運用上実施できないものとして記録します。HOME / ADMINの100ms超件数は未判定のままですが、2026-09-10のユーザー指示によりPhase 1の実行計画確認用SQLとPhase 2のsnapshot設計へ進みました。

初回アクセスとDB接続を含むhealthが約2秒であり、cold start・DB接続・cold cacheが主な体感遅延要因と判断できます。TotalがTTFBより大幅に長い値には、ホスティングまたは配信経路の本文転送時間も含まれます。

変更後のproduction HTTP計測は上表へ追記済みです。アプリ内では`PERF_LOG_ALL=true`を一時設定すると100ms未満を含む全計測、未設定時も100ms以上の処理を警告ログで確認できます。

## 修正内容

production buildのrender分類は、共通Layout変更前の全36 route dynamicから、公開トップ・問い合わせ・FAQ・Partner・料金・資料・規約・PrivacyなどをStatic/ISR化できました。認証・検索条件・ユーザー固有データが必要なページはdynamicを維持しています。

### DBクエリ削減

- トップの人気エリアを「候補エリアごとに4集計」から、全エリアをまとめる3クエリへ変更。
- cold cache時の上限を最大41クエリから3クエリへ削減（最大38クエリ、約93%削減）。
- トップの募集候補を最大100件から30件へ削減。画面に表示する6件を選ぶランキング余地は維持。
- Meal詳細のJoinRequestとMatch取得を直列から並列へ変更。
- Prismaのquery duration instrumentationを追加。

### キャッシュ追加

- 人気エリアの集計結果全体を5分キャッシュ。
- トップページを60秒ISRに設定。
- 既存のエリア統計5分、予測データ30分、Area×Genre集計30分キャッシュは維持。
- Authとadmin権限確認をReact `cache()`で同一リクエスト内共有。

### dynamic rendering削減

- Root Layoutから`currentUserId()`を除去。
- Headerのログイン状態と未読通知はHTML生成をブロックしないクライアント取得へ移動。
- トップのログイン案内も同じsession requestを共有。
- 認証が必要な各ページは引き続きサーバー側で権限検証する。

### 並列化・Cron改善

- 通知Cronの4対象取得とDemand Intent期限更新を`Promise.all`化。
- 取得上限を既定50、最大200に制限。
- Meal/Match cursorと`hasMore`を返し、外部Cronから分割継続できる構造を追加。
- 通知処理は同時5件のchunkで実行し、DB poolとメールAPIへの突発負荷を制限。
- 必要列だけ`select`し、Meal/participantsの過剰includeを削減。
- 既存の`dedupeKey`一意制約による冪等性を維持。

### インデックス追加

- `Match(status, scheduledAt)`
- `Match(status, completedAt)`
- `Meal(createdAt, status)`
- `Meal(matchedAt)`
- `JoinRequest(userId, createdAt)`
- `Notification(type, createdAt)`

対象migration: `prisma/migrations/20260910062000_performance_indexes/migration.sql`

### instrumentation

以下のカテゴリを`[PERF] CATEGORY label Nms`形式で出力可能にしました。

- `DB`: Prisma query engineの各クエリ
- `AUTH`: セッション解決
- `HOME`: トップの表示データ取得
- `ADMIN`: Growth / Business Dashboard集計
- `RECOMMENDATION`: おすすめ時間帯計算用データ
- `MATCH_SCORE`: 成立予測計算用データ
- `NOTIFICATION`: 通知作成とCron batch

100ms以上は常に`console.warn`、それ未満は`PERF_LOG_ALL=true`の場合だけ`console.info`へ出します。通常運用のログ量とI/O負荷を抑えつつ、遅い処理は常時検知できます。

## Bundle・画像

- Root LayoutはServer Componentのまま。追加したAuth状態だけを小さなClient Componentに分離。
- admin専用集計・UIは一般ユーザー画面からimportされていない。
- chartライブラリはなく、lucide-reactはnamed import。
- 最大の静的画像は約288KB。LP下部スクリーンショットはlazy load、画像なしではReact fallback。
- 外部X avatarは`unoptimized`のため、配信元画像サイズの監視は残る。

## ロリポップ！デプロイなう対応

- `next.config.ts`の`output: "standalone"`を確認済み。
- アプリ内の常駐timer、background loop、常駐workerはない。
- Cronは外部起動で、1リクエストの処理量を制限した。
- Supabase transaction pooler使用時はPrismaのconnection limitを1に保つ既存設定を維持。

## 残課題

- Growth/Business adminは今回、認証重複排除・既存30分キャッシュ・計測・index追加まで対応した。全期間JoinRequestや通知を読む集計はデータ増加前に`AnalyticsSnapshot` / `DailyMetrics` / `AreaDemandStats` / `HourlyDemandStats`へ移行する。
- snapshot更新は外部Cronで行い、Web requestでは最新snapshotのみを読む設計が次段階。現在のデータ量が不明な状態で集計テーブルを先に固定すると指標定義変更のmigration負担が大きいため、`[PERF] ADMIN`の実測を基に着手する。
- DBの実行計画はproduction migration適用後、Supabase SQL Editorで`EXPLAIN (ANALYZE, BUFFERS)`を確認する。
- デプロイ後に同じ3回計測を行い、cold/warm TTFB、`[PERF] DB` query count/total duration、`[PERF] HOME/ADMIN`を比較する。

Phase 1の実行用SQLは`docs/sql/explain-after-index.sql`、Phase 2の設計案は`docs/analytics-snapshot-design.md`に作成済みです。EXPLAIN結果の判定と設計レビュー後に、snapshot migration・parity検証へ進みます。

Notificationのtype条件なし・直近30日クエリはSeq Scan、実行0行、推定97行、shared buffer hit 5、実行0.016msでした。現データ量では適切なPlanであり、行数根拠がないためindexやクエリは変更しません。詳細は`docs/sql/explain-results.md`に記録しています。

Phase 1の全7クエリを確認しました。`Notification(type, createdAt)`は期待どおり複合indexのIndex Scan、ほかは対象テーブルが7〜20行（Notificationは推定97行）と小さいためSeq Scanでした。全実行が0.2ms未満であり、現時点の変更根拠はありません。削除候補indexもありません。

Phase 2は設計確定後、4集計テーブルのschema/migration、JST基準の純粋なpayload生成関数、`[PERF] ADMIN`計測付きデータ取得、parity検証スクリプトまで実装しました。Dashboardの読み取りは未変更です。Supabase上の既存集計との日次・snapshot・エリア・時間帯合計53比較は差分ゼロでした。

MatchのACTIVE・今後24時間クエリも全7行・該当0行のためSeq Scanとなり、実行0.141msでした。小規模データでの妥当なPlanとして、`Match(status, scheduledAt)`はデータ増加後に再確認します。
