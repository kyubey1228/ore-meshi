import { PRICING_PLAN_COPY } from '@/features/business/pricing-plans';
import { BusinessCheckoutButton } from '@/components/business-checkout-button';
import { BusinessBillingPortalButton } from '@/components/business-billing-portal-button';
import type { BusinessBillingState } from '@/server/billing';

export function BusinessPricingCards({ billing }: { billing: BusinessBillingState }) {
  return (
    <div className="pricing-grid">
      {PRICING_PLAN_COPY.map(({ plan, title, features }) => {
        const isCurrent = billing.plan === plan;
        const price=plan==='FREE'?null:billing.prices.find(item=>item.plan===plan);
        const amount=price?.unitAmount===null||price?.unitAmount===undefined?null:new Intl.NumberFormat('ja-JP',{style:'currency',currency:price.currency.toUpperCase(),maximumFractionDigits:0}).format(price.unitAmount);
        return (
          <div className={`panel pricing-card ${isCurrent ? 'current' : ''}`} key={plan}>
            {plan === 'STANDARD' && !isCurrent && <span className="tag">おすすめ</span>}
            <h2>{title}</h2>
            <p className="muted">{plan === 'FREE' ? '¥0' : amount?`${amount} / ${price?.interval==='month'?'月':price?.interval??'契約期間'}`:'料金を取得できませんでした'}</p>
            <ul>
              {features.map(feature => <li key={feature}>{feature}</li>)}
            </ul>
            {isCurrent && plan === 'FREE' && <span className="tag status-success">現在利用中</span>}
            {isCurrent && plan !== 'FREE' && (
              <>
                <span className="tag status-success">現在利用中</span>
                <BusinessBillingPortalButton disabled={!billing.hasBillingCustomer} />
              </>
            )}
            {!isCurrent && plan !== 'FREE' && (
              <BusinessCheckoutButton kind="SUBSCRIPTION" plan={plan} label="このプランにする" />
            )}
          </div>
        );
      })}
    </div>
  );
}
