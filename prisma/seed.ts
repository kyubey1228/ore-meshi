import { PrismaClient, type AttendanceStatus, type WouldMeetAgain } from '@prisma/client';
const prisma = new PrismaClient();
const diningTypeSeeds=[['first-meeting-ok','初対面OK'],['food-first','飯メイン'],['talkative','会話多め'],['quiet-ok','静かでもOK'],['drinks-welcome','酒あり歓迎'],['no-drinks','酒なし歓迎'],['otaku-talk','オタクトーク歓迎'],['work-talk','仕事トーク歓迎'],['late-night','深夜飯OK'],['quick-meal','サク飯派'],['long-stay','長居OK'],['leave-choice','店選び任せたい'],['like-choice','店選び好き']] as const;
const purposeSeeds=[['just-eat','ただ飯'],['vent','愚痴りたい'],['work-talk','仕事の話'],['love-talk','恋バナ'],['otaku-talk','オタク話'],['drinks','飲みたい'],['quiet','静かに食べたい'],['new-tokyo','上京したて'],['business-trip','出張中'],['heartbreak','失恋した'],['new-friends','友達増やしたい'],['free','暇'],['late-night','深夜飯'],['new-place','新しい店に行きたい']] as const;
// 全市区町村ではなく、政令指定都市・県庁所在地・主要な繁華街/観光地レベルの「主要都市」だけを候補として持つ。
// 自由入力(丁目・商店街名など)を妨げないよう、あくまでinput[list]のsuggestion用データ。
const areaSeeds:readonly (readonly [string,string])[]=[
  ['北海道','札幌市'],['北海道','函館市'],['北海道','旭川市'],['北海道','小樽市'],['北海道','釧路市'],
  ['青森県','青森市'],['青森県','弘前市'],['青森県','八戸市'],
  ['岩手県','盛岡市'],['岩手県','一関市'],
  ['宮城県','仙台市'],['宮城県','石巻市'],
  ['秋田県','秋田市'],['秋田県','横手市'],
  ['山形県','山形市'],['山形県','鶴岡市'],
  ['福島県','福島市'],['福島県','郡山市'],['福島県','会津若松市'],
  ['茨城県','水戸市'],['茨城県','つくば市'],['茨城県','日立市'],
  ['栃木県','宇都宮市'],['栃木県','日光市'],['栃木県','那須塩原市'],
  ['群馬県','前橋市'],['群馬県','高崎市'],['群馬県','草津町'],
  ['埼玉県','さいたま市'],['埼玉県','川越市'],['埼玉県','所沢市'],
  ['千葉県','千葉市'],['千葉県','船橋市'],['千葉県','柏市'],['千葉県','浦安市'],['千葉県','成田市'],
  ['東京都','千代田区'],['東京都','中央区'],['東京都','港区'],['東京都','新宿区'],['東京都','文京区'],['東京都','台東区'],['東京都','墨田区'],['東京都','江東区'],['東京都','品川区'],['東京都','目黒区'],['東京都','大田区'],['東京都','世田谷区'],['東京都','渋谷区'],['東京都','中野区'],['東京都','杉並区'],['東京都','豊島区'],['東京都','北区'],['東京都','荒川区'],['東京都','板橋区'],['東京都','練馬区'],['東京都','足立区'],['東京都','葛飾区'],['東京都','江戸川区'],['東京都','八王子市'],['東京都','町田市'],['東京都','武蔵野市'],['東京都','立川市'],
  ['神奈川県','横浜市'],['神奈川県','川崎市'],['神奈川県','相模原市'],['神奈川県','鎌倉市'],['神奈川県','藤沢市'],['神奈川県','小田原市'],
  ['新潟県','新潟市'],['新潟県','長岡市'],
  ['富山県','富山市'],['富山県','高岡市'],
  ['石川県','金沢市'],['石川県','七尾市'],
  ['福井県','福井市'],['福井県','敦賀市'],
  ['山梨県','甲府市'],['山梨県','富士吉田市'],
  ['長野県','長野市'],['長野県','松本市'],['長野県','軽井沢町'],
  ['岐阜県','岐阜市'],['岐阜県','高山市'],
  ['静岡県','静岡市'],['静岡県','浜松市'],['静岡県','熱海市'],['静岡県','伊豆市'],
  ['愛知県','名古屋市'],['愛知県','豊田市'],['愛知県','岡崎市'],
  ['三重県','津市'],['三重県','伊勢市'],['三重県','鈴鹿市'],
  ['滋賀県','大津市'],['滋賀県','草津市'],['滋賀県','彦根市'],
  ['京都府','京都市'],['京都府','宇治市'],
  ['大阪府','大阪市'],['大阪府','堺市'],['大阪府','東大阪市'],['大阪府','豊中市'],
  ['兵庫県','神戸市'],['兵庫県','姫路市'],['兵庫県','西宮市'],['兵庫県','尼崎市'],
  ['奈良県','奈良市'],['奈良県','橿原市'],
  ['和歌山県','和歌山市'],['和歌山県','白浜町'],
  ['鳥取県','鳥取市'],['鳥取県','米子市'],
  ['島根県','松江市'],['島根県','出雲市'],
  ['岡山県','岡山市'],['岡山県','倉敷市'],
  ['広島県','広島市'],['広島県','福山市'],['広島県','尾道市'],
  ['山口県','山口市'],['山口県','下関市'],['山口県','岩国市'],
  ['徳島県','徳島市'],['徳島県','鳴門市'],
  ['香川県','高松市'],['香川県','丸亀市'],
  ['愛媛県','松山市'],['愛媛県','今治市'],
  ['高知県','高知市'],['高知県','四万十市'],
  ['福岡県','福岡市'],['福岡県','北九州市'],['福岡県','久留米市'],
  ['佐賀県','佐賀市'],['佐賀県','唐津市'],
  ['長崎県','長崎市'],['長崎県','佐世保市'],['長崎県','島原市'],
  ['熊本県','熊本市'],['熊本県','阿蘇市'],
  ['大分県','大分市'],['大分県','別府市'],['大分県','由布市'],
  ['宮崎県','宮崎市'],['宮崎県','都城市'],
  ['鹿児島県','鹿児島市'],['鹿児島県','霧島市'],['鹿児島県','指宿市'],
  ['沖縄県','那覇市'],['沖縄県','石垣市'],['沖縄県','宮古島市'],['沖縄県','名護市'],
] as const;
const userSeeds = [
  ['seed-user-1','ramen_taro','ラーメン太郎','ラーメンと町中華が好き。'],['seed-user-2','sushi_hanako','すし花子','魚と日本酒を探しています。'],['seed-user-3','curry_ken','カレー健','辛いものならだいたい好き。'],['seed-user-4','niku_mika','肉のみか','焼肉は塩タンから派です。'],['seed-user-5','coffee_jun','珈琲じゅん','喫茶店と甘いもの巡り。'],['seed-user-6','gyoza_kei','餃子ケイ','餃子とビールで乾杯したい。'],
] as const;
const sampleMealSeeds = [
  ['新宿で煮干しラーメン食いたい','新宿','ラーメン',1000,1800],['渋谷でスパイスカレー開拓','渋谷','カレー',1200,2200],['上野で昼から寿司どう？','上野','寿司',3000,6000],['池袋で餃子とビール','池袋','中華',2000,4000],['吉祥寺の喫茶店でプリン','吉祥寺','カフェ',1000,2500],['恵比寿で焼肉いこう','恵比寿','焼肉',5000,9000],['神田の老舗そばで昼飯','神田','そば',800,1800],['中野で町中華を攻めたい','中野','中華',1500,3000],['下北沢で夜カレー','下北沢','カレー',1200,2500],['浅草でもんじゃ食べよう','浅草','もんじゃ',2500,4500],
] as const;
const shifted = (days: number, hour = 19) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour,0,0,0); return d; };
async function main() {
  const diningTypes=await Promise.all(diningTypeSeeds.map(([slug,label],index)=>prisma.diningType.upsert({where:{slug},create:{slug,label,sortOrder:(index+1)*10},update:{label,sortOrder:(index+1)*10,isActive:true}})));
  const purposes=await Promise.all(purposeSeeds.map(([slug,label],index)=>prisma.mealPurpose.upsert({where:{slug},create:{slug,label,sortOrder:(index+1)*10},update:{label,sortOrder:(index+1)*10,isActive:true}})));
  await Promise.all(areaSeeds.map(([prefecture,city],index)=>prisma.areaOption.upsert({where:{prefecture_city:{prefecture,city}},create:{prefecture,city,sortOrder:(index+1)*10},update:{sortOrder:(index+1)*10,isActive:true}})));
  // Cascade relations let us refresh demo records without touching real users or their meals.
  await prisma.businessAccount.deleteMany({where:{slug:{startsWith:'seed-'}}});
  await prisma.businessLead.deleteMany({where:{email:{endsWith:'@seed.example'}}});
  await prisma.firstTimeOffer.deleteMany({where:{name:{startsWith:'[SEED]'}}});
  await prisma.partnerCampaign.deleteMany({where:{slug:{startsWith:'seed-'}}});
  await prisma.user.deleteMany({where:{twitterId:{startsWith:'seed-'}}});
  const users = await Promise.all(userSeeds.map(([twitterId,twitterUsername,displayName,bio],index) => prisma.user.create({data:{twitterId,twitterUsername,displayName,bio,image:`https://api.dicebear.com/9.x/thumbs/svg?seed=${twitterUsername}`,diningTypes:{create:[diningTypes[index%diningTypes.length],diningTypes[(index+2)%diningTypes.length],diningTypes[(index+5)%diningTypes.length]].map(type=>({diningTypeId:type.id}))}}})));
  await prisma.user.update({where:{id:users[0].id},data:{isAdmin:true}});
  const business=await prisma.businessAccount.create({data:{name:'シード食堂',legalName:'シード食堂株式会社',slug:'seed-restaurant',businessType:'RESTAURANT',contactName:'飯田 店長',contactEmail:'owner@seed.example',area:'新宿',status:'ACTIVE',purposes:['新規集客','空席対策'],members:{create:{userId:users[0].id,role:'OWNER',canPostToSocial:true}},socialPostSettings:{create:{}}}});
  const partner=await prisma.partnerCampaign.create({data:{slug:'seed-shinjuku-partner',title:'新宿エリア先行10店舗募集',description:'新宿の飯を一緒に増やす立ち上げパートナー募集です。',area:'新宿',startsAt:shifted(-5),endsAt:shifted(30),maxPartners:10,joinedPartners:1,offerText:'初回空席スポンサー無料',status:'ACTIVE',members:{create:{businessAccountId:business.id}}}});
  await prisma.firstTimeOffer.create({data:{name:'[SEED] 空席スポンサー初回無料',offerType:'FREE',targetProduct:'SEAT_CAMPAIGN',startsAt:shifted(-5),endsAt:shifted(30),maxUses:10}});
  await prisma.businessReferral.create({data:{referrerBusinessAccountId:business.id,referralCode:'SEEDMESHI1'}});
  const leadStatuses=['NEW','CONTACTED','WON','LOST'] as const;
  const leads=await Promise.all(leadStatuses.map((status,index)=>prisma.businessLead.create({data:{companyName:`シード企業 ${index+1}`,contactName:`担当者 ${index+1}`,email:`lead${index+1}@seed.example`,businessType:index%2?'COMPANY':'RESTAURANT',area:index%2?'渋谷':'新宿',purpose:'スポンサー施策について相談したい',monthlyBudgetRange:'1〜3万円',message:'デモ確認用の営業Leadです。',source:index===0?'BUSINESS_LP':index===1?'PRICING':index===2?'PARTNER_CAMPAIGN':'DIRECT',status,partnerCampaignId:index===2?partner.id:null}})));
  await prisma.businessLeadNote.create({data:{leadId:leads[1].id,adminUserId:users[0].id,note:'初回連絡済み。デモ用の内部メモです。'}});
  await prisma.businessMarketingEvent.createMany({data:[{sessionKey:'seed-session-1',eventType:'LP_VIEW',source:'x',campaign:'seed-launch'},{sessionKey:'seed-session-1',eventType:'PRICING_VIEW',source:'x',campaign:'seed-launch'},{sessionKey:'seed-session-2',leadId:leads[0].id,eventType:'CONTACT_SUBMITTED',source:'direct'}]});
  await prisma.firstTimeOffer.create({data:{name:'[SEED] 空席スポンサー初回無料',offerType:'FREE',targetProduct:'SEAT_CAMPAIGN',startsAt:shifted(-5),endsAt:shifted(60),maxUses:100,isActive:true}});
  await prisma.businessReferral.create({data:{referrerBusinessAccountId:business.id,referralCode:'SEEDMESHI',status:'INVITED',rewardStatus:'PENDING'}});
  await prisma.businessMarketingEvent.createMany({data:[{sessionKey:'seed-session-1',eventType:'LP_VIEW',source:'x',campaign:'seed-launch'},{sessionKey:'seed-session-1',leadId:leads[0].id,eventType:'CONTACT_SUBMITTED',source:'x',campaign:'seed-launch'},{sessionKey:'seed-session-2',businessAccountId:business.id,eventType:'SIGNUP_COMPLETED',source:'referral'}]});
  const sampleMeals = [];
  for (let i=0;i<sampleMealSeeds.length;i++) { const [title,area,genre,budgetMin,budgetMax]=sampleMealSeeds[i]; sampleMeals.push(await prisma.meal.create({data:{hostId:users[i%users.length].id,title,area,genre,budgetMin,budgetMax,description:'気軽に話しながら、うまい飯を食べましょう。',paymentType:i%3===0?'HOST_PAYS':i%3===1?'SPLIT':'GUEST_PAYS',maxParticipants:i<3?3:2+(i%3),status:'CLOSED',purposes:{create:[purposes[i%purposes.length],purposes[(i+4)%purposes.length]].map(purpose=>({purposeId:purpose.id}))},candidates:{create:[shifted(i+2),shifted(i+4,12)].map((d,j)=>({date:new Date(d.toISOString().slice(0,10)),startTime:j?'12:00':'19:00',endTime:j?'14:00':'21:00'}))}} ,include:{candidates:true}})); }
  await prisma.joinRequest.createMany({data:[{mealId:sampleMeals[0].id,userId:users[2].id,candidateId:sampleMeals[0].candidates[0].id,message:'煮干し好きです！',status:'ACCEPTED'},{mealId:sampleMeals[1].id,userId:users[4].id,candidateId:sampleMeals[1].candidates[0].id,message:'一緒に開拓したいです。',status:'ACCEPTED'},{mealId:sampleMeals[2].id,userId:users[5].id,candidateId:sampleMeals[2].candidates[1].id,message:'昼寿司いいですね。',status:'ACCEPTED'}]});
  for(let i=0;i<2;i++){const meal=await prisma.meal.create({data:{hostId:users[i].id,title:`開催予定の飯 ${i+1}`,area:i?'赤羽':'高円寺',budgetMin:2000,budgetMax:4000,paymentType:'SPLIT',maxParticipants:3,status:'MATCHED',candidates:{create:{date:new Date(shifted(i+8).toISOString().slice(0,10)),startTime:'19:00',endTime:'21:00'}}},include:{candidates:true}});const guest=users[i+2];const match=await prisma.match.create({data:{mealId:meal.id,candidateId:meal.candidates[0].id,scheduledAt:shifted(i+8),participants:{create:[{userId:users[i].id},{userId:guest.id}]}}});await prisma.joinRequest.create({data:{mealId:meal.id,userId:guest.id,candidateId:meal.candidates[0].id,status:'ACCEPTED'}});await prisma.rescheduleProposal.create({data:{matchId:match.id,proposerId:users[i].id,proposedAt:shifted(i+10),status:i?'REJECTED':'PENDING'}});}
  const attend:AttendanceStatus[]=['ATTENDED','LATE_CANCEL','NO_SHOW','ATTENDED','ATTENDED']; const again:WouldMeetAgain[]=['YES','NEUTRAL','NO','YES','YES'];
  for(let i=0;i<5;i++){const host=users[i%users.length],guest=users[(i+1)%users.length],scheduled=shifted(-(i+2));const meal=await prisma.meal.create({data:{hostId:host.id,title:`思い出の飯 ${i+1}`,area:['新宿','渋谷','上野','浅草','神田'][i],budgetMin:1500,budgetMax:3500,paymentType:i%2?'SPLIT':'HOST_PAYS',maxParticipants:2,status:'CLOSED',candidates:{create:{date:new Date(scheduled.toISOString().slice(0,10)),startTime:'19:00',endTime:'21:00'}}},include:{candidates:true}});const match=await prisma.match.create({data:{mealId:meal.id,candidateId:meal.candidates[0].id,scheduledAt:scheduled,status:'COMPLETED',participants:{create:[{userId:host.id},{userId:guest.id}]}}});await prisma.joinRequest.create({data:{mealId:meal.id,userId:guest.id,candidateId:meal.candidates[0].id,status:'ACCEPTED'}});await prisma.diningFeedback.createMany({data:[{matchId:match.id,fromUserId:host.id,toUserId:guest.id,wouldMeetAgain:again[i],attendanceStatus:attend[i],note:'本人だけが参照する非公開メモ'},{matchId:match.id,fromUserId:guest.id,toUserId:host.id,wouldMeetAgain:'YES',attendanceStatus:'ATTENDED'}]});}
  console.log('Seeded meals plus Business leads, offer, referral, partner campaign, marketing events, and an admin user.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>prisma.$disconnect());
