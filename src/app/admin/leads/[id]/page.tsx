import { notFound } from 'next/navigation';
import { getAdminLead } from '@/server/admin';
import { addLeadNote, convertLeadToBusiness, updateLeadStatus } from '@/server/actions/admin-leads';
import { InlineStatusForm } from '@/components/inline-status-form';
import { LeadNoteForm } from '@/components/lead-note-form';
import { ConfirmActionButton } from '@/components/confirm-action-button';
import { dateTimeLabel } from '@/lib/format';

const STATUS_LABELS_JA = { NEW: '新規', CONTACTED: '連絡済み', QUALIFIED: '商談中', WON: '成約', LOST: '失注', ARCHIVED: '保管' } as const;
const STATUS_OPTIONS = Object.keys(STATUS_LABELS_JA) as (keyof typeof STATUS_LABELS_JA)[];

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getAdminLead(id);
  if (!lead) notFound();

  return (
    <section className="section narrow">
      <h1>{lead.companyName}</h1>
      <div className="panel">
        <dl className="detail-list">
          <div><dt>担当者</dt><dd>{lead.contactName}</dd></div>
          <div><dt>メール</dt><dd>{lead.email}</dd></div>
          <div><dt>電話</dt><dd>{lead.phone ?? '—'}</dd></div>
          <div><dt>Web</dt><dd>{lead.websiteUrl ?? '—'}</dd></div>
          <div><dt>目的</dt><dd>{lead.purpose}</dd></div>
          <div><dt>流入</dt><dd>{lead.source}</dd></div>
          <div><dt>紹介コード</dt><dd>{lead.referralCode ?? '—'}</dd></div>
          <div><dt>Partner</dt><dd>{lead.partnerCampaign?.title ?? '—'}</dd></div>
          <div><dt>Business</dt><dd>{lead.businessAccount?.name ?? '未変換'}</dd></div>
        </dl>
        <p className="pre-wrap">{lead.message}</p>
      </div>

      <InlineStatusForm id={id} currentStatus={lead.status} options={STATUS_OPTIONS} labels={STATUS_LABELS_JA} action={updateLeadStatus} />
      <LeadNoteForm leadId={id} action={addLeadNote} />
      {lead.notes.map(n => (
        <div className="panel" key={n.id}>
          <strong>{n.adminUser.displayName}</strong>
          <small>{dateTimeLabel(n.createdAt)}</small>
          <p>{n.note}</p>
        </div>
      ))}
      {!lead.businessAccountId && (
        <ConfirmActionButton id={id} label="Business下書きへ変換" confirm="BusinessAccountを作成しますか？" action={convertLeadToBusiness} />
      )}
    </section>
  );
}
