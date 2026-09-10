import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMatchById } from '@/lib/data';
import { requirePageUser } from '@/server/auth';
import { dateTimeLabel, matchStatusLabels } from '@/lib/format';
import { UserAvatar } from '@/components/meal-card';
import { DiningTypePills } from '@/components/tag-pills';
import { MatchControls, RescheduleForm, ProposalControls, CancelProposal, FeedbackForm } from '@/components/match-controls';
import { TrackedLink } from '@/components/growth-tracker';
import { ReferralShare } from '@/components/referral-share';
import { getOrCreateReferralCode } from '@/server/referral';
import { appUrl } from '@/lib/social';

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requirePageUser();
  const { id } = await params;
  const match = await getMatchById(id);
  if (!match) notFound();
  const canComplete = match.scheduledAt <= new Date();
  const isHost = match.meal.hostId === userId;
  const referralCode = match.status === 'COMPLETED' ? await getOrCreateReferralCode(userId) : null;
  return <section className="section narrow">
    <Link className="text-link" href="/mypage">← マイページへ</Link>
    <div className="panel detail">
      <span className="tag">{matchStatusLabels[match.status]}</span>
      <h1>{match.meal.title}</h1>
      <dl className="detail-list"><div><dt>日時</dt><dd>{dateTimeLabel(match.scheduledAt)}</dd></div><div><dt>場所</dt><dd>{match.meal.area}{match.meal.restaurant && ` / ${match.meal.restaurant}`}</dd></div></dl>
      <h2>一緒に食べる人</h2>
      <div className="people-list">{match.participants.map(({ user }) => <Link key={user.id} className="person" href={`/users/${user.id}`}><UserAvatar user={user} /><span><strong>{user.displayName}</strong><small>@{user.twitterUsername}</small><DiningTypePills relations={user.diningTypes} limit={3}/></span></Link>)}</div>
      {match.status === 'ACTIVE' && <><MatchControls id={id} canComplete={canComplete} />{!canComplete && <p className="muted">「飯終了」は予定日時を過ぎると押せます。</p>}</>}
    </div>
    {match.status === 'ACTIVE' && <div className="panel"><h2>リスケ</h2><p className="muted">参加者全員がOKすると新しい日時に変わります。</p><RescheduleForm matchId={id} />{match.rescheduleProposals.map((proposal) => <article className="request" key={proposal.id}><strong>{dateTimeLabel(proposal.proposedAt)}</strong><p>{proposal.proposer.displayName}さんからの提案 · {proposal.status}</p>{proposal.status === 'PENDING' && (proposal.proposerId === userId ? <CancelProposal id={proposal.id} /> : proposal.votes.some(v => v.userId === userId) ? <p className="success">この日でOKを送りました。</p> : <ProposalControls id={proposal.id} />)}</article>)}</div>}
    {match.status === 'COMPLETED' && <div className="panel"><h2>飯、どうだった？</h2><p className="muted">回答やメモは公開されません。</p>{match.participants.filter(p => p.userId !== userId).map(({ user }) => { const done = match.diningFeedbacks.some(f => f.toUserId === user.id); return <article className="request" key={user.id}><div className="person"><UserAvatar user={user} /><strong>{user.displayName}</strong></div>{done ? <p className="success">感想を送りました。</p> : <FeedbackForm matchId={id} toUserId={user.id} />}</article>; })}</div>}
    {match.status === 'COMPLETED' && <div className="panel">
      <h2>また誰かと飯行く？</h2>
      <div className="hero-actions">
        <TrackedLink className="btn" eventType="REPEAT_JOIN_STARTED" payload={{ recruitmentId: match.mealId, loggedIn: true }} href="/meals">次も探す →</TrackedLink>
        {isHost && <Link className="btn secondary" href={`/meals/new?repeat=${match.mealId}`}>同じ条件でまた募集する</Link>}
      </div>
    </div>}
    {referralCode && <ReferralShare inviteUrl={`${appUrl()}/invite/${referralCode}`} mealId={match.mealId} text={`「俺は誰かと飯が食いたい！」で飯に行ってきました。\n\n${appUrl()}/invite/${referralCode}`} />}
  </section>;
}
