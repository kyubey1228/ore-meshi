import { notFound } from 'next/navigation';
import { getUserProfileData } from '@/lib/data';
import { dateLabel } from '@/lib/format';
import { UserAvatar } from '@/components/meal-card';
import { DiningTypePills } from '@/components/tag-pills';
export default async function UserPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const data = await getUserProfileData(id); if (!data) notFound(); return <section className="section narrow"><div className="panel profile"><UserAvatar user={data.user} /><h1>{data.user.displayName}</h1><p className="muted">@{data.user.twitterUsername}</p><DiningTypePills relations={data.user.diningTypes} limit={5}/><p className="pre-wrap">{data.user.bio || 'まだ自己紹介はありません。'}</p><dl className="stats"><div><dt>飯に行った回数</dt><dd>{data.completedMealCount}回</dd></div><div><dt>最終飲食</dt><dd>{data.lastDiningDate ? dateLabel(data.lastDiningDate) : 'まだなし'}</dd></div><div><dt>登録日</dt><dd>{dateLabel(data.user.createdAt)}</dd></div></dl></div></section>; }
