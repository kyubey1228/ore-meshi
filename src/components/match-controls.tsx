'use client';

import { useState } from 'react';
import { ActionForm } from '@/components/action-form';
import { setMatchStatus } from '@/server/actions/matches';
import { createRescheduleProposal, decideRescheduleProposal } from '@/server/actions/reschedule';
import { submitDiningFeedback } from '@/server/actions/feedback';
import type { ActionResult } from '@/server/action';

export function MatchControls({ id, canComplete }: { id: string; canComplete: boolean }) {
  return <div className="row wrap">
    {canComplete && <ActionForm label="飯終了" confirm="この飯を終了にしますか？" action={() => setMatchStatus({ id, status: 'COMPLETED' })} />}
    <ActionForm label="この予定をキャンセル" confirm="成立した飯の予定をキャンセルしますか？" action={() => setMatchStatus({ id, status: 'CANCELLED' })} />
  </div>;
}

export function RescheduleForm({ matchId }: { matchId: string }) {
  return <ActionForm label="リスケを提案する" action={(data) => {
    const raw = data.get('proposedAt');
    const proposedAt = typeof raw === 'string' && raw ? new Date(`${raw}:00+09:00`).toISOString() : '';
    return createRescheduleProposal({ matchId, proposedAt });
  }}><label>新しい日時（日本時間）<input name="proposedAt" type="datetime-local" required /></label></ActionForm>;
}

export function ProposalControls({ id }: { id: string }) {
  return <div className="row wrap">
    <ActionForm label="この日でOK" action={() => decideRescheduleProposal({ id, decision: 'ACCEPTED' })} />
    <ActionForm label="今回は難しい" action={() => decideRescheduleProposal({ id, decision: 'REJECTED' })} />
  </div>;
}

export function CancelProposal({ id }: { id: string }) {
  return <ActionForm label="提案を取り下げる" action={() => decideRescheduleProposal({ id, decision: 'CANCELLED' })} />;
}

export function FeedbackForm({ matchId, toUserId, onResult }: { matchId: string; toUserId: string; onResult?: (result: ActionResult) => void }) {
  return <ActionForm label="この人への感想を送る" onResult={onResult} action={(data) => submitDiningFeedback({
    matchId,
    toUserId,
    wouldMeetAgain: data.get('wouldMeetAgain'),
    attendanceStatus: data.get('attendanceStatus'),
    note: data.get('note'),
  })}>
    <label>また飯に行きたい？<select name="wouldMeetAgain" defaultValue="YES"><option value="YES">また飯行きたい</option><option value="NEUTRAL">普通</option><option value="NO">もう会わない</option></select></label>
    <label>出席状況<select name="attendanceStatus" defaultValue="ATTENDED"><option value="ATTENDED">普通に参加した</option><option value="LATE_CANCEL">当日キャンセル</option><option value="NO_SHOW">無断欠席</option></select></label>
    <label>自分用メモ（任意・相手には見えません）<textarea name="note" maxLength={1000} /></label>
  </ActionForm>;
}

// submitDiningFeedback成功時、perform()のrevalidatePath('/', 'layout')でこの直後にmatch.diningFeedbacksが
// 更新されたRSCペイロードが同じレスポンスに同梱され、doneがtrueに切り替わってFeedbackForm自体が
// 同じコミットでアンマウントされる。ActionForm内のローカル成功メッセージが描画される前に消えてしまう
// レースを避けるため、親(常にマウントされ続けるarticle)側でメッセージを保持する。
export function FeedbackStatus({ matchId, toUserId, initiallyDone }: { matchId: string; toUserId: string; initiallyDone: boolean }) {
  const [message, setMessage] = useState<string | null>(initiallyDone ? '感想を送りました。' : null);
  if (message) return <p className="success">{message}</p>;
  return <FeedbackForm matchId={matchId} toUserId={toUserId} onResult={(result) => { if (result.ok) setMessage(result.message); }} />;
}
