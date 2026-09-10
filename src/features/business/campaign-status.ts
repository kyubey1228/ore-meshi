export type BusinessCampaignStatus = 'DRAFT' | 'ACTIVE' | 'ENDED' | 'CANCELLED';

export const CAMPAIGN_STATUS_LABEL_JA: Record<BusinessCampaignStatus, string> = {
  DRAFT: '下書き',
  ACTIVE: '公開中',
  ENDED: '終了',
  CANCELLED: 'キャンセル',
};

export const CAMPAIGN_STATUS_TONE: Record<BusinessCampaignStatus, 'neutral' | 'warning' | 'success' | 'muted' | 'danger'> = {
  DRAFT: 'warning',
  ACTIVE: 'success',
  ENDED: 'muted',
  CANCELLED: 'danger',
};

export const DRAFT_PAYMENT_HINT = '支払いが完了すると公開されます。';

export function isSeatCampaignExpired(status: BusinessCampaignStatus, endsAt: Date, now = new Date()) {
  return status === 'ACTIVE' && endsAt <= now;
}
