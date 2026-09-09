import Link from 'next/link';
import { getDiningHistory } from '@/lib/data';
import { dateTimeLabel, paymentLabels } from '@/lib/format';
import { UserAvatar } from '@/components/meal-card';
export const metadata = { title: '飲食歴' };
export default async function History() { const matches = await getDiningHistory(); return <section className="section narrow"><h1>飲食歴</h1>{matches.length ? matches.map(match => <article className="panel history-card" key={match.id}><strong>{dateTimeLabel(match.scheduledAt)}</strong><Link href={`/matches/${match.id}`}><h2>{match.meal.title}</h2></Link><span>{match.meal.area} · {paymentLabels[match.meal.paymentType]} · {match.participants.length}人</span><p>一緒に食べた人</p><div className="people-list">{match.participants.map(({ user }) => <Link className="person" href={`/users/${user.id}`} key={user.id}><UserAvatar user={user} /><small>@{user.twitterUsername}</small></Link>)}</div></article>) : <div className="empty"><span className="empty-icon">🍚</span><p>まだ誰とも飯を食ってない。</p><Link className="text-link" href="/meals">誰かの飯に乗っかる →</Link></div>}</section>; }
