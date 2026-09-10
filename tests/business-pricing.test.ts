import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateMonthlyPrice } from '../src/features/business/pricing';

const noDiscount={STANDARD:null,PRO:null} as const;
test('Stripe由来の単価から月間想定料金を計算する(割引なし)',()=>{const result=estimateMonthlyPrice({sponsoredMeal:5000,seatCampaign:1000,FREE:0,STANDARD:2980,PRO:9800,discountPercent:noDiscount},2,4,'STANDARD');assert.deepEqual(result,{subscription:2980,sponsoredMeals:10000,seatCampaigns:4000,total:16980,savings:0});});
test('プラン割引がある場合はスポンサー飯/空席スポンサーの単価に反映され、savingsに割引額が入る',()=>{const result=estimateMonthlyPrice({sponsoredMeal:5000,seatCampaign:1000,FREE:0,STANDARD:2980,PRO:9800,discountPercent:{STANDARD:10,PRO:null}},2,4,'STANDARD');assert.deepEqual(result,{subscription:2980,sponsoredMeals:9000,seatCampaigns:3600,total:15580,savings:1400});});
test('FREEプランは割引が設定されていても適用されない',()=>{const result=estimateMonthlyPrice({sponsoredMeal:5000,seatCampaign:1000,FREE:0,STANDARD:2980,PRO:9800,discountPercent:{STANDARD:10,PRO:20}},2,4,'FREE');assert.deepEqual(result,{subscription:0,sponsoredMeals:10000,seatCampaigns:4000,total:14000,savings:0});});
