'use server';import{z}from'zod';import{prisma}from '@/lib/prisma';import{perform}from '@/server/action';import{requireAdmin}from '@/server/admin';import{recordGrowthEvent}from '@/server/growth';import{getContentStudioAggregates,generateContentIdeas}from '@/server/content-studio';
// 需要データから下書きを生成するのみ。外部SNSへの自動投稿は一切行わない(コピーして手動投稿する運用)。
export async function generateContentDrafts(){return perform(async()=>{
  await requireAdmin();
  const aggregates=await getContentStudioAggregates();
  const ideas=generateContentIdeas(aggregates);
  if(ideas.length===0)return'/admin/content?created=0';
  await prisma.socialContentDraft.createMany({data:ideas.map((idea,index)=>({channel:idea.channel,body:idea.body,template:'GROWTH_CARD',dataSource:{kind:'aggregate',generatedFrom:'content-studio'},utmCampaign:`content_studio_${new Date().toISOString().slice(0,10)}_${index+1}`}))});
  await recordGrowthEvent('CONTENT_DRAFT_CREATED',{metadata:{count:ideas.length}});
  return`/admin/content?created=${ideas.length}`;
});}
export async function adminUpdateContentDraftStatus(input:unknown){return perform(async()=>{
  await requireAdmin();
  const data=z.object({id:z.string().min(1),status:z.enum(['DRAFT','APPROVED','POSTED'])}).parse(input);
  await prisma.socialContentDraft.update({where:{id:data.id},data:{status:data.status,...(data.status==='POSTED'?{postedAt:new Date()}: {})}});
  if(data.status==='POSTED')await recordGrowthEvent('CONTENT_DRAFT_POSTED',{metadata:{id:data.id}});
  return'/admin/content';
});}
export async function adminDeleteContentDraft(id:unknown){return perform(async()=>{
  await requireAdmin();
  const parsed=z.string().min(1).parse(id);
  await prisma.socialContentDraft.delete({where:{id:parsed}});
  return'/admin/content';
});}
