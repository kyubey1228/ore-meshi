import { z } from 'zod';
export const idSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(v); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === v; }, '正しい日付を選んでください。');
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export function scheduledAt(date: string, time: string) { return new Date(`${date}T${time}:00+09:00`); }
export const candidateSchema = z.object({ date: daySchema, startTime: timeSchema, endTime: timeSchema }).superRefine((v,ctx) => {
  if (scheduledAt(v.date, v.startTime).getTime() <= Date.now()) ctx.addIssue({code:'custom',message:'これからの日時を選んでください。'});
  const minutes = (s: string) => Number(s.slice(0,2))*60 + Number(s.slice(3));
  const duration = (minutes(v.endTime)-minutes(v.startTime)+1440)%1440;
  if (duration === 0 || duration > 720) ctx.addIssue({code:'custom',message:'時間帯は開始から12時間以内にしてください（翌日可）。'});
});
const optionalText = (max: number) => z.string().trim().max(max).optional().default('');
export const mealSchema = z.object({ title: z.string().trim().min(1).max(80), area: z.string().trim().min(1).max(80), budgetMin: z.coerce.number().int().min(0).max(100000), budgetMax: z.coerce.number().int().min(0).max(100000), maxParticipants: z.coerce.number().int().min(2).max(20), paymentType: z.enum(['SPLIT','HOST_PAYS','GUEST_PAYS']), restaurant: optionalText(120), description: optionalText(1000), genre: optionalText(60), alcohol: optionalText(60), smoking: optionalText(60), ageCondition: optionalText(60), deadline: z.union([z.literal(''),z.iso.datetime({offset:true})]).optional().default(''), candidates: z.array(candidateSchema).min(1).max(10) }).superRefine((v,ctx) => {
  if (v.budgetMax<v.budgetMin) ctx.addIssue({code:'custom',message:'予算の上限は下限以上にしてください。',path:['budgetMax']});
  if (new Set(v.candidates.map(c=>`${c.date}/${c.startTime}/${c.endTime}`)).size !== v.candidates.length) ctx.addIssue({code:'custom',message:'同じ候補日時が重複しています。',path:['candidates']});
  if(v.deadline && (new Date(v.deadline).getTime() <= Date.now() || v.candidates.some(c=>new Date(v.deadline)>scheduledAt(c.date,c.startTime)))) ctx.addIssue({code:'custom',message:'締切は現在から最初の候補日時までに設定してください。',path:['deadline']});
});
export const joinSchema = z.object({ mealId: idSchema, candidateId: idSchema, message: optionalText(500) });
export const proposalSchema = z.object({ matchId: idSchema, proposedAt: z.iso.datetime({offset:true}).refine(v=>new Date(v).getTime()>Date.now(), 'これからの日時を選んでください。') });
export const feedbackSchema = z.object({ matchId: idSchema, toUserId: idSchema, wouldMeetAgain: z.enum(['YES','NEUTRAL','NO']), attendanceStatus: z.enum(['ATTENDED','LATE_CANCEL','NO_SHOW']), note: optionalText(1000) });
export const profileSchema = z.object({ displayName: z.string().trim().min(1).max(50), bio: optionalText(500) });
export const filterSchema = z.object({ date: z.union([daySchema,z.literal('')]).optional(), area: z.string().trim().max(80).optional(), budget: z.union([z.literal(''),z.coerce.number().int().min(0).max(100000)]).optional(), paymentType: z.enum(['SPLIT','HOST_PAYS','GUEST_PAYS','']).optional() });
