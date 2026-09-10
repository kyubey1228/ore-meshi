# Analytics Snapshot Design

作成日: 2026-09-10

## 前提と目的

ロリポップ！デプロイなうでは`[PERF] ADMIN`の本番ログを取得できないため、実測による100ms判定はできない。ユーザーの明示的な指示により、コード上で全期間走査または期間内の明細行取得を行う集計を対象に設計した。2026-09-10に設計が確定され、Prisma schema、migration、集計payload生成、parity検証まで実装済み。Dashboardの読み取り先はPhase 3まで変更しない。

集計日は`Asia/Tokyo`の暦日で定義し、保存する境界はUTCの半開区間`[periodStart, periodEnd)`とする。日次バッチは同じキーへupsertし、再実行しても加算されない方式にする。

## 現在の指標と移行先

クエリコストは本番ログがないため実測値ではなく、現在のコードが読む行数から分類した。`O(期間内行数)`は指定期間の明細またはgroupBy、`O(全期間行数)`は期間条件なしの走査を表す。

| 指標 | 元テーブル | 単位・期間 | 現在のコスト | 移行先 |
|---|---|---|---|---|
| Signup開始・完了、Join Intent、シェア、紹介、Quick Postの件数とCVR | GrowthEvent | 全体、選択期間 | eventType別groupBy、O(期間内行数) | DailyMetrics（件数）。CVRは読み取り時に算出 |
| Completed Meals、実食ユーザー数 | Match, MatchParticipant | 全体、直近7日/選択期間 | countとdistinct、O(期間内行数) | DailyMetrics |
| 募集数、成立数、Fill Rate、Match→Completed | Meal, Match | 全体、選択期間 | 複数count、O(期間内行数) | DailyMetrics |
| Signup→初参加、Signup→成立、D1/D7 | User, JoinRequest, Meal, MatchParticipant | signup cohort、選択期間 | cohort明細をメモリ結合、O(cohort活動行数) | AnalyticsSnapshot |
| 2回目Join率、2回目募集率 | JoinRequest, Meal | 全ユーザー、全期間 | userId groupBy、O(全期間行数) | AnalyticsSnapshot |
| 初回Completed後の再参加近似、2回目Joinまでの中央値 | JoinRequest, MatchParticipant, Match | 全ユーザー、全期間 | JoinRequest全件の時系列走査、O(全期間行数) | AnalyticsSnapshot |
| Time to First Join / Matchの中央値・percentile | Meal | 全体、選択/前期間 | 期間内Meal明細を全取得して計算 | AnalyticsSnapshot |
| Time to Matchのエリア別・ジャンル別中央値 | Meal | area/genre、選択期間 | 期間内Meal明細を全取得して分類 | AnalyticsSnapshot |
| 通知送信・開封・クリック・率・type別 | Notification | 全体/type、選択期間 | 期間内Notification明細を全取得 | DailyMetrics（type別日次数値） |
| Demand作成・成立・募集化・募集成立 | DemandIntent, Meal | 全体、選択期間 | count/groupBy、O(期間内行数) | DailyMetrics |
| Demand、供給、成立、Fill Rate、gap | DemandIntent, Meal | area、直近30日 | groupByとMeal明細、O(期間内行数) | AreaDemandStats |
| Demand、募集、成立、Completed、推定参加者 | DemandIntent, Meal, Match | area×genre、選択期間 | 4集計、O(期間内行数)、現在30分cache | AreaDemandStats |
| 曜日・時間帯別の需要と供給 | DemandIntent, Meal, Match | area×genre×曜日×時、日次 | 現在Dashboard未表示。将来は明細走査が必要 | HourlyDemandStats |
| Opportunity Score、営業要約、前期間比 | AreaDemandStats相当の値 | area×genre、選択/前期間 | Area×Genre結果からメモリ計算 | AnalyticsSnapshot（表示順位・文章）。基礎値はAreaDemandStats |
| 訪問session、Signup、Activated、Matched、Completed | GrowthEvent, JoinRequest, Meal, MatchParticipant | 全体、選択期間 | distinct sessionとcohort明細結合 | AnalyticsSnapshot |
| チャネル別Signup/Activated/Matched/Completed/CVR | GrowthEventと上記cohort表 | channel、選択期間 | signup明細を分類し活動明細と結合 | AnalyticsSnapshot |
| campaign別visit/Signup/Activated/Matched/Completed | GrowthEventと上記cohort表 | utmCampaign、選択期間 | campaign groupByとcohort明細結合 | AnalyticsSnapshot |
| Growth Insightsの前期間比較・異常文言 | User, Meal, GrowthEventと各集計 | 選択/前期間 | 複数再集計とメモリ比較 | AnalyticsSnapshot（基礎値からバッチ生成） |
| Top Completed Areas | Match→Meal | area、選択期間 | Completed Match明細取得 | AreaDemandStatsから導出 |
| BusinessAccountごとのキャンペーン実績 | ReferralEvent、各campaign | businessAccount、月次 | アカウント単位の限定走査 | 移行対象外。テナント別集計が必要になった時点で専用表を設計 |

## テーブル案

固定して運用する主要カウンタは型付きカラムにする。ランキング、percentile、チャネルなど可変ディメンションは`Json`へ保存し、`schemaVersion`で構造を管理する。すべてをJSONにするとSQLでの期間合算や異常検知が難しくなるため、日次の加算可能な値はJSONへ逃がさない。

```prisma
enum AnalyticsSnapshotType {
  GROWTH_DASHBOARD
  BUSINESS_DASHBOARD
  GROWTH_INSIGHTS
}

model AnalyticsSnapshot {
  id             String                @id @default(cuid())
  snapshotType   AnalyticsSnapshotType
  asOfDate       DateTime              @db.Date
  windowDays     Int
  timezone       String                @default("Asia/Tokyo")
  periodStart    DateTime
  periodEnd      DateTime
  schemaVersion  Int                   @default(1)
  payload        Json
  generatedAt    DateTime
  createdAt      DateTime              @default(now())
  updatedAt      DateTime              @updatedAt

  @@unique([snapshotType, asOfDate, windowDays, schemaVersion])
  @@index([snapshotType, generatedAt])
}

model DailyMetrics {
  id                       String   @id @default(cuid())
  date                     DateTime @db.Date
  timezone                 String   @default("Asia/Tokyo")
  periodStart              DateTime
  periodEnd                DateTime
  signupStarted            Int      @default(0)
  signupCompleted          Int      @default(0)
  joinIntentCreated        Int      @default(0)
  joinAfterSignupCompleted Int      @default(0)
  recruitmentShareX        Int      @default(0)
  recruitmentShareLine     Int      @default(0)
  recruitmentUrlCopied     Int      @default(0)
  referralOpened           Int      @default(0)
  referralSignupCompleted  Int      @default(0)
  quickPostStarted         Int      @default(0)
  quickPostCompleted       Int      @default(0)
  mealsCreated             Int      @default(0)
  mealsMatched             Int      @default(0)
  matchesCompleted         Int      @default(0)
  uniqueDiners             Int      @default(0)
  demandIntentsCreated     Int      @default(0)
  demandIntentsMatched     Int      @default(0)
  demandRecruitments       Int      @default(0)
  demandMealsMatched       Int      @default(0)
  notificationsSent        Int      @default(0)
  notificationsOpened      Int      @default(0)
  notificationsClicked     Int      @default(0)
  // { "MEAL_TODAY": { "sent": 10, "opened": 4, "clicked": 2 }, ... }
  notificationTypeMetrics  Json     @default("{}")
  generatedAt              DateTime
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@unique([date, timezone])
  @@index([date])
}

model AreaDemandStats {
  id                    String   @id @default(cuid())
  date                  DateTime @db.Date
  timezone              String   @default("Asia/Tokyo")
  periodStart           DateTime
  periodEnd             DateTime
  area                  String
  genre                 String   @default("未指定")
  demandIntents         Int      @default(0)
  mealsCreated          Int      @default(0)
  mealsMatched          Int      @default(0)
  matchesCompleted      Int      @default(0)
  estimatedParticipants Int      @default(0)
  generatedAt           DateTime
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([date, timezone, area, genre])
  @@index([area, date])
  @@index([area, genre, date])
}

model HourlyDemandStats {
  id                    String   @id @default(cuid())
  bucketStart           DateTime
  timezone              String   @default("Asia/Tokyo")
  localDate             DateTime @db.Date
  localWeekday          Int
  localHour             Int
  area                  String
  genre                 String   @default("未指定")
  demandIntents         Int      @default(0)
  mealsCreated          Int      @default(0)
  mealsMatched          Int      @default(0)
  matchesCompleted      Int      @default(0)
  generatedAt           DateTime
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([bucketStart, timezone, area, genre])
  @@index([localDate, area])
  @@index([localWeekday, localHour, area, genre])
}
```

`DailyMetrics`は1日1行とし、通知全体値は型付きカラム、将来増える`NotificationType`別内訳だけを`notificationTypeMetrics`へ保存する。種別単位の横断SQLが主要用途になった場合は、JSONへindexを足すのではなく専用の日次通知テーブルへ分離する。

## 再計算と読み取り

- 日次テーブルは、確定済みの日は対象日の全値を再計算して一括upsertする。当日は遅延イベントを取り込むため毎回上書きする。
- `generatedAt`は鮮度表示に使用し、Dashboardは最新snapshotがなくても同期集計へフォールバックしない。
- 7日・30日など加算可能な指標はDailyMetricsを合算する。中央値、percentile、cohort、チャネル帰属は加算できないためAnalyticsSnapshotを読む。
- AreaDemandStatsとHourlyDemandStatsの`genre='未指定'`はnullを正規化した値であり、実ジャンル名として使わない。
- Cronのcursorは集計対象日を指し、upsertキーにより同一日の再実行を冪等にする。

## この設計で表現できない変更

- Signup cohortを「登録後7日以内」から「初回訪問後7日以内」へ変える場合、既存snapshotの再計算とschemaVersion更新が必要。
- First Completed→Second Joinを近似ではなく厳密なイベント順で定義する場合、参加・完了時点を保持する専用cohort集計が必要。
- last-touchからfirst-touch、multi-touchへ帰属モデルを変える場合、日次数値の足し算では復元できずGrowthEvent明細から再計算が必要。
- 店舗、キャンペーン、広告投稿単位の多次元分析は4テーブルのキーに含まれず、専用fact tableが必要。
- 年齢層、決済プラン、流入コンテンツなど新しいdimensionをArea/Hourly表へ後付けすると一意キーが変わるため、新表またはversion付き再構築が必要。
- ユニークユーザー数は日次値を期間合算できない。期間ユニーク数はAnalyticsSnapshotで保持するか、ユーザー集合を扱う別方式が必要。
- percentileや中央値は日次値から正確に合成できない。対象期間ごとのsnapshot再計算が必要。
- 指標定義を過去時点の状態で再現するには、mutableなMeal/Matchの現在値だけでは不足する。状態遷移イベントまたは履歴表が必要。

## 実装前レビュー項目

- NotificationType別の横断分析が増えた時点で、5つ目の日次通知テーブルを許可するか。
- Dashboardが必要とする期間を7日・30日・90日に固定するか、任意日数snapshotを生成するか。
- `matchesCompleted`を`completedAt`、Top Completed Areasを現在どおり`scheduledAt`で数える不一致を統一するか。
- `activeMeals`という現行名が「期間内に作成された全募集」を意味する箇所を`mealsCreated`へ統一するか。
- BusinessAccount単位のAnalyticsを今回のglobal snapshot移行に含めるか。

## Phase 2実装結果

- Prisma schemaと`prisma/migrations/20260910090000_analytics_snapshot/migration.sql`へ4テーブルを追加。
- `src/lib/analytics-snapshot.ts`へJST期間計算と、DB非依存のpayload生成関数を追加。
- `src/server/analytics-snapshots.ts`へ読み取り専用の元データ取得と`[PERF] ADMIN analytics.snapshot.generate`計測を追加。
- Supabase transaction poolerの`connection_limit=1`を守るため、元データ取得は単一接続のbatch transactionを使用。
- `scripts/verify-snapshot-parity.ts`で既存集計との53比較を実施し、差分ゼロを確認。
- Web request、Dashboard、Cronから新しい集計処理はまだ呼び出していない。
