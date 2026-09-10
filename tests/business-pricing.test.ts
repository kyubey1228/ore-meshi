import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateMonthlyPrice } from '../src/features/business/pricing';

test('Stripe由来の単価から月間想定料金を計算する',()=>{const result=estimateMonthlyPrice({sponsoredMeal:5000,seatCampaign:1000,FREE:0,STANDARD:2980,PRO:9800},2,4,'STANDARD');assert.deepEqual(result,{subscription:2980,sponsoredMeals:10000,seatCampaigns:4000,total:16980});});
