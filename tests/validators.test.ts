import test from 'node:test';
import assert from 'node:assert/strict';
import { candidateSchema, feedbackSchema, mealSchema } from '../src/validators/index';
const tomorrow=new Date(Date.now()+86_400_000).toISOString().slice(0,10);
test('深夜プリセットは翌日終了として有効',()=>assert.equal(candidateSchema.safeParse({date:tomorrow,startTime:'22:00',endTime:'02:00'}).success,true));
test('予算上限が下限より低い募集は無効',()=>assert.equal(mealSchema.safeParse({title:'飯',area:'新宿',budgetMin:3000,budgetMax:1000,maxParticipants:2,paymentType:'SPLIT',candidates:[{date:tomorrow,startTime:'18:00',endTime:'20:00'}]}).success,false));
test('フィードバック列挙値を検証する',()=>assert.equal(feedbackSchema.safeParse({matchId:'match_1',toUserId:'user_2',wouldMeetAgain:'MAYBE',attendanceStatus:'ATTENDED'}).success,false));
