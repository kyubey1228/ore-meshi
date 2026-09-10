import { CAMPAIGN_STATUS_LABEL_JA, CAMPAIGN_STATUS_TONE, type BusinessCampaignStatus } from '@/features/business/campaign-status';

export function BusinessStatusBadge({ status }: { status: BusinessCampaignStatus }) {
  return <span className={`tag status-${CAMPAIGN_STATUS_TONE[status]}`}>{CAMPAIGN_STATUS_LABEL_JA[status]}</span>;
}
