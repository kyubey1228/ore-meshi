# Performance Index EXPLAIN Results

計測日: 2026-09-10

## Notification Dashboard（直近30日・type条件なし）

対象は`getNotificationAnalysis()`相当の次の条件です。

```sql
SELECT "type", "readAt", "clickedAt"
FROM "Notification"
WHERE "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '30 days';
```

結果の要点:

| Plan | 推定行数 | 実行行数 | Buffers | Planning | Execution |
|---|---:|---:|---:|---:|---:|
| Seq Scan（初回） | 97 | 0 | shared hit=5 | 0.043ms | 0.016ms |
| Seq Scan（再実行） | 97 | 0 | shared hit=163（planning） | 0.522ms | 0.062ms |

判定: **Seq Scan許容・データ増加後に再確認**

- 現在のクエリには`type`条件がないため、`Notification(type, createdAt)`複合インデックスは利用できない。
- 対象行は0件で、テーブル規模も推定約97行と小さい。5 buffer、0.016msで完了しており、現時点ではSeq Scanの方が合理的である。
- type条件付きの別クエリでは`Notification_type_createdAt_idx`のIndex Scanを確認できたため、複合indexは維持する。
- 行数や実行時間に問題がないため、index追加・変更やクエリ変更は行わない。
- Notificationの期間内明細が増えた場合は、`getNotificationAnalysis()`を`DailyMetrics`へ移す設計で全件読み出しを解消する。

## 分類状況

| 対象 | 分類 | 根拠 |
|---|---|---|
| Match(status, scheduledAt) | Seq Scan許容／データ増加後に再確認 | 全7行、該当0行、quicksort 25kB、0.141ms |
| Match(status, completedAt) | Seq Scan許容／データ増加後に再確認 | 全7行、該当0行、shared hit=1、0.148ms |
| Meal(createdAt, status) | Seq Scan許容／データ増加後に再確認 | 全20行、該当2行、shared hit=2、0.118ms |
| Meal(matchedAt) | Seq Scan許容／データ増加後に再確認 | 全20行、該当0行、shared hit=2、0.183ms |
| JoinRequest(userId, createdAt) | Seq Scan許容／データ増加後に再確認 | 全11行、該当1行、sort各25kB、0.161ms |
| Notification(type, createdAt) | 想定どおりIndex Scan | `Notification_type_createdAt_idx`、該当0行、0.104ms |
| Notification直近30日（type条件なし） | Seq Scan許容／データ増加後に再確認 | 該当0行、推定97行、再実行0.062ms |

## Match：ACTIVEかつ今後24時間

対象は通知Cronの`Match.findMany()`相当で、`status='ACTIVE'`、今後24時間、`ORDER BY id`、最大50件の条件である。

| Plan | テーブル行数 | 実行行数 | Sort | Buffers | Planning | Execution |
|---|---:|---:|---:|---:|---:|---:|
| Seq Scan → Sort → Limit | 7 | 0 | quicksort 25kB | shared hit=4 | 0.586ms | 0.141ms |

判定: **Seq Scan許容・データ増加後に再確認**

- 全7行のため、indexを辿るより1ページをSeq ScanするPlanが合理的である。
- `Rows Removed by Filter: 7`、該当0行であり、現データではindexの選択性を評価できない。
- Prismaクエリが`ORDER BY id`を指定するため、複合indexで絞った場合でも小さなSortは残り得る。今回のSortは25kBで問題ない。
- 実行0.141msのため、indexやクエリは変更しない。Matchが増加した後、該当行が存在する時間帯に再確認する。

## Match：COMPLETEDかつ直近30日

対象は`getCompletionStats()`の`Match.count()`相当である。

| Plan | テーブル行数 | 実行行数 | Buffers | Planning | Execution |
|---|---:|---:|---:|---:|---:|
| Aggregate → Seq Scan | 7 | 0 | shared hit=1 | 0.631ms | 0.148ms |

判定: **Seq Scan許容・データ増加後に再確認**

- 全7行から対象0行を探すため、index traversalより全行走査が安い。
- 実行0.148msであり、indexの変更・削除は行わない。

## Meal：MATCHEDかつ直近30日

対象は`getPhase3Overview()`の`Meal.count()`相当である。

| Plan | テーブル行数 | 実行行数 | Buffers | Planning | Execution |
|---|---:|---:|---:|---:|---:|
| Aggregate → Seq Scan | 20 | 2 | shared hit=2 | 0.662ms | 0.118ms |

判定: **Seq Scan許容・データ増加後に再確認**

- 全20行中2行が該当し、2 buffer、0.118msで完了している。
- 現状では`Meal(createdAt, status)`を辿る固定費よりSeq Scanが安い。
- データ増加後は、先頭列が範囲条件のためstatusによる絞り込み効率も確認する。明確な行数根拠がないため、現時点で列順変更や追加indexは行わない。

## Meal：matchedAtが直近30日

対象は`getCompletionStats()`などの`Meal.count()`相当である。

| Plan | テーブル行数 | 実行行数 | Buffers | Planning | Execution |
|---|---:|---:|---:|---:|---:|
| Aggregate → Seq Scan | 20 | 0 | shared hit=2 | 0.800ms | 0.183ms |

判定: **Seq Scan許容・データ増加後に再確認**

- 全20行中、直近30日の該当は0行である。
- 2 buffer、0.183msで完了しており、現在はindexを使う利点がない。
- 成立データが蓄積し、期間条件の選択性を評価できる状態で再確認する。

## JoinRequest：ユーザー別の直近30日履歴

検証SQLは既存ユーザーを選ぶInitPlanと、そのユーザーの履歴取得で構成される。

| Plan | テーブル行数 | 実行行数 | Sort | Buffers | Planning | Execution |
|---|---:|---:|---:|---:|---:|---:|
| InitPlan Seq Scan + 本体Seq Scan → Sort | 11 | 1 | top-N/quicksort 各25kB | shared hit=5 | 0.846ms | 0.161ms |

判定: **Seq Scan許容・データ増加後に再確認**

- 全11行のため、InitPlanと本体はいずれも1ページ前後のSeq Scanが合理的である。
- 本体では10行をfilterし1行を返しているが、実行0.161msで問題はない。
- `JoinRequest(userId, createdAt)`の有効性は、同一ユーザーの履歴とテーブル全体が増えた後に再確認する。

## Notification：type別の直近30日集計

対象は`type='MEAL_TODAY'`かつ直近30日の送信・開封・クリック集計である。

| Plan | Index | 実行行数 | Buffers | Planning | Execution |
|---|---|---:|---:|---:|---:|
| GroupAggregate → Index Scan | Notification_type_createdAt_idx | 0 | shared hit=5 | 0.687ms | 0.104ms |

判定: **想定どおりIndex Scan**

- `type`の等価条件と`createdAt`の期間条件が、複合indexのIndex Condに入っている。
- 対象行が0件でもplannerがindexを選択しており、このクエリ形状に対するindexの有効性を確認できた。
- indexは維持する。

## Phase 1総合判定

| 分類 | 対象 |
|---|---|
| 想定どおりIndex Scan | Notification(type, createdAt) |
| Seq Scan許容・データ増加後に再確認 | Match(status, scheduledAt)、Match(status, completedAt)、Meal(createdAt, status)、Meal(matchedAt)、JoinRequest(userId, createdAt)、Notificationのtype条件なし集計 |
| 行数増加時に問題になると確認済み | なし |
| 未使用で削除候補 | なし |

検証対象テーブルは最大でもNotificationの推定97行であり、全クエリの実行時間は0.2ms未満だった。現時点でmigrationやquery shapeを変更する実測根拠はない。
