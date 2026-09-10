import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BarChart3, Clock3, Megaphone, Users } from 'lucide-react';
import { currentBusinessMembership } from '@/server/business';
import { getBusinessPricingCatalog } from '@/server/billing';
import { getActivePartnerCampaigns } from '@/server/sales';
import { BusinessMarketingTracker } from '@/components/business-marketing-tracker';
import { BusinessMarketingLink } from '@/components/business-marketing-link';
import { BusinessTrackedSection } from '@/components/business-tracked-section';
import { PreviewFrame, PreviewStat } from '@/components/business-preview';

export const metadata: Metadata = {
  title: '飲食店の集客・空席対策｜店舗・スポンサー向け',
  description: 'スポンサー飯と空席スポンサーで、空席やキャンペーンを実際の飯の予定へ。X共有から飯成立までの成果を確認できる店舗・企業向けサービスです。',
  keywords: ['飲食店 集客', '空席対策', '飲食店 広告', 'スポンサー企画', '飲食店 SNS集客'],
  openGraph: { title: '空席を、今夜の客に。', description: '俺は誰かと飯が食いたい！ 店舗・スポンサー向けサービス', type: 'website', url: '/business' },
};

const flowSponsor = ['スポンサー飯を作る', '支払う', '俺メシに掲載', 'Xで拡散', '飯成立', '成果を見る'];
const flowSeat = ['席が空く', '「今、客を呼ぶ」', '空席スポンサー公開', 'Xで拡散', 'Meal成立', '来店'];
const standard = ['スポンサー飯・空席スポンサー割引', 'エリア・目的タグ露出', '募集コピー', 'キャンセル枠再Boost', '詳細Analytics', 'X投稿履歴'];
const pro = ['STANDARDの全機能', 'トップページ露出候補', 'あと1人自動Boost', '空席スポンサー優先表示', '複数店舗・Direct Ads', '高度Analytics・ブランド企画'];
const yen = (value: number) => new Intl.NumberFormat('ja-JP').format(value);

export default async function BusinessLanding() {
  const [membership, catalog, partners] = await Promise.all([currentBusinessMembership(), getBusinessPricingCatalog(), getActivePartnerCampaigns()]);
  const signupHref = membership ? '/business/dashboard' : '/business/signup';
  return <div className="business-lp">
    <BusinessMarketingTracker eventType="BUSINESS_LP_VIEW" />
    <section className="business-hero">
      <span className="business-hero-circle" aria-hidden="true"><span>💺</span></span>
      <span className="eyebrow orange">俺メシ FOR BUSINESS</span><h1>空席を、<br />今夜の客に。</h1>
      <p>スポンサー飯・空席スポンサーを使って、店舗の空席やキャンペーンを実際の“飯の予定”に変えます。</p>
      <div className="hero-actions"><BusinessMarketingLink className="btn" href={signupHref} eventType="BUSINESS_SIGNUP_CTA_CLICK" placement="HERO">{membership ? '店舗管理へ' : '店舗・企業登録'}<ArrowRight size={18} /></BusinessMarketingLink><BusinessMarketingLink className="btn secondary" href="/business/pricing" eventType="PRICING_CTA_CLICK" placement="HERO">料金を見る</BusinessMarketingLink><BusinessMarketingLink className="btn ghost" href="/business/contact" eventType="CONTACT_CTA_CLICK" placement="HERO">まず相談する</BusinessMarketingLink></div>
    </section>

    {partners.length > 0 && <section className="partner-strip"><strong>{partners[0].area}エリア 先行店舗募集中</strong><span>{partners[0].remaining === null ? '募集枠あり' : `残り${partners[0].remaining}店舗`}</span><BusinessMarketingLink href="/business/partner" eventType="PARTNER_CTA_CLICK" placement="LP_TOP">パートナー募集を見る →</BusinessMarketingLink></section>}

    <section className="section"><span className="eyebrow">3つの入口</span><h2>今の店に合う「飯の呼び方」</h2><div className="sales-grid"><article className="panel product-intro"><Megaphone /><b>予定を立てて人を集める</b><h2>スポンサー飯</h2><p>数日前からの集客、新商品、新店舗、期間限定キャンペーンに。</p></article><article className="panel product-intro seat"><Clock3 /><b>今、客を呼ぶ</b><h2>空席スポンサー</h2><p>突然の空席、予約キャンセル、雨の日、当日集客に。</p></article><article className="panel product-intro plan"><BarChart3 /><b>継続利用</b><h2>STANDARD / PRO</h2><p>分析、割引、Boost、複数店舗、Direct Adsを継続運用。</p></article></div></section>

    <BusinessTrackedSection eventType="SPONSORED_MEAL_SECTION_VIEW" id="sponsored-meal"><span className="tag">表示イメージ</span><h2>ユーザーには、こんなふうに見えます。</h2><div className="preview-split"><PreviewFrame name="sponsored-meal" alt="スポンサー飯の掲載画面"><article className="meal-card preview-meal"><div className="row between"><span className="person"><span className="avatar">焼</span><span><strong>サンプル焼肉店</strong><small>掲載イメージ</small></span></span><span className="tag">PR</span></div><p className="last-slot-label">🎁 スポンサー飯</p><h3>新メニュー記念。焼肉のおごり</h3><p>9/20 19:00 · 新宿</p><div className="facts"><span>1人1,000円分スポンサー</span><span><Users size={16} />参加者4人 · あと2人</span></div><span className="btn wide">この飯に行く</span></article></PreviewFrame><div><span className="eyebrow orange">SPONSORED MEAL</span><h2>予定を立てて客を呼ぶ</h2><p>新商品やキャンペーンを「参加できる飯」にして、開催日まで告知できます。</p><strong className="price-copy">{catalog ? yen(catalog.sponsoredMeal) : '5,000'}円〜 / 回</strong><BusinessMarketingLink className="btn" href={membership ? '/business/sponsored-meals/new' : '/business/signup'} eventType="BUSINESS_SIGNUP_CTA_CLICK" placement="SPONSORED_MEAL">スポンサー飯を出す</BusinessMarketingLink></div></div></BusinessTrackedSection>

    <BusinessTrackedSection eventType="SEAT_CAMPAIGN_SECTION_VIEW" id="seat-campaign"><div className="preview-split reverse"><div><span className="eyebrow orange">SEAT CAMPAIGN</span><h2>今、この席を埋める</h2><p>キャンセルや急な空席が出たら、残り時間と特典を付けて今から客を呼べます。</p><strong className="price-copy">{catalog ? yen(catalog.seatCampaign) : '1,000'}円〜 / 回</strong><BusinessMarketingLink className="btn" href={membership ? '/business/seats/new' : '/business/signup'} eventType="BUSINESS_SIGNUP_CTA_CLICK" placement="SEAT_CAMPAIGN">今、客を呼ぶ</BusinessMarketingLink></div><PreviewFrame name="seat-campaign" alt="空席スポンサーの掲載画面"><article className="seat-preview"><span className="tag">掲載イメージ</span><h3>🔥 今、席空いてます</h3><h2>サンプル居酒屋</h2><p>新宿 · あと4席</p><strong>21:30まで</strong><p className="campaign-benefit">ドリンク1杯サービス</p><span className="btn wide">この店で飯募集する</span></article></PreviewFrame></div></BusinessTrackedSection>

    <section className="section"><h2>スポンサー飯と空席スポンサーの違い</h2><div className="comparison-cards"><CompareCard tag="事前集客" title="スポンサー飯" timing="数日前〜数週間前" use="新商品・キャンペーン・新店舗・認知拡大" value="長めの露出・Boost・OGP・X共有・Analytics" /><CompareCard tag="リアルタイム集客" title="空席スポンサー" timing="今〜数時間" use="空席・予約キャンセル・当日集客" value="今から飯面・残り時間・X共有・即時Meal作成" /></div></section>

    <section className="section"><span className="tag">ダッシュボード画面イメージ</span><h2>出した後は、ちゃんと数字が見えます。</h2><p>表示されただけで終わらず、参加申請、飯成立、来店につながる動きを確認できます。</p><PreviewFrame name="dashboard" alt="Business Dashboardの画面イメージ"><div className="dashboard-preview"><div className="row between"><div><small>BUSINESS TABLE</small><h3>サンプル店舗</h3></div><span className="tag">STANDARD</span></div><h3>今月の成果</h3><div className="analytics-grid"><PreviewStat value="4,820" label="表示" /><PreviewStat value="326" label="詳細閲覧" /><PreviewStat value="42" label="参加申請" /><PreviewStat value="18" label="飯成立" /><PreviewStat value="39" label="成立人数" /><PreviewStat value="612" label="X経由" /></div><p className="muted">さらにクーポン利用や投稿ごとの成果も詳しく分析できます。</p></div></PreviewFrame><p className="sample-note">※数値はサンプルです。実績値ではありません。</p><BusinessMarketingLink className="text-link" href="/business/pricing" eventType="PRICING_CTA_CLICK" placement="DASHBOARD_PREVIEW">料金と機能を見る →</BusinessMarketingLink></section>

    <section className="section"><span className="tag">X投稿イメージ</span><h2>Xにもそのまま流せます。</h2><div className="x-preview-grid"><PreviewFrame name="x-share" alt="スポンサー飯のX投稿イメージ"><XPost kind="スポンサー飯" body={'PR\n\n今日はサンプル焼肉店が\n1人1,000円分スポンサーします。\n\n9/20 19:00 · 新宿 · あと2人\n\n#誰か飯いこ'} og="スポンサー飯｜新宿 19:00｜1人1,000円分｜あと2人" /></PreviewFrame><PreviewFrame name="x-share" alt="空席スポンサーのX投稿イメージ"><XPost kind="空席スポンサー" body={'今、席空いてます。\n\nサンプル居酒屋\nあと4席 · 21:30まで\nドリンク1杯サービス。\n\n#誰か飯いこ #空席飯'} og="今、席空いてます｜あと4席｜21:30まで" /></PreviewFrame></div></section>

    <section className="section"><h2>飯を呼ぶところまで、一直線。</h2><Flow title="スポンサー飯" steps={flowSponsor} /><Flow title="空席スポンサー" steps={flowSeat} /></section>

    <section className="section"><span className="eyebrow orange">MONTHLY PLANS</span><h2>飯を継続的に呼びやすくする月額プラン。</h2><p>スポンサー飯・空席スポンサーは1回ごとの広告商品。STANDARD / PROは、割引や分析、露出機能を継続して使うためのプランです。</p><div className="pricing-grid"><PlanCard title="STANDARD" copy="飯を定期的に呼びたい店向け" price={catalog?.STANDARD} items={standard} /><PlanCard title="PRO" copy="俺メシを本気で集客チャネルにしたい店向け" price={catalog?.PRO} items={pro} /></div><div className="hero-actions"><BusinessMarketingLink className="btn" href="/business/pricing" eventType="PRICING_CTA_CLICK" placement="PLAN_COMPARISON">料金を比べる</BusinessMarketingLink><BusinessMarketingLink className="btn secondary" href="/business/contact" eventType="CONTACT_CTA_CLICK" placement="PLAN_COMPARISON">どれが合うか相談する</BusinessMarketingLink></div></section>

    <section className="section sample-campaigns"><span className="tag">掲載イメージ</span><h2>こんな企画を掲載できます。</h2><div className="sales-grid"><article className="panel"><b>サンプル焼肉店</b><h3>新メニュー記念</h3><p>参加者4人 · 1人1,000円スポンサー</p></article><article className="panel"><b>サンプル居酒屋</b><h3>今3席空いてます</h3><p>22:00まで · ドリンク1杯サービス</p></article><article className="panel"><b>サンプル食品ブランド</b><h3>新商品をみんなで試す飯</h3><p>先着6人 · 商品提供あり</p></article></div></section>

    <section className="section contact-prompt"><h2>何を使えばいいかわからなければ、まず相談してください。</h2><p>空席対策、販促、スポンサー企画から合う方法を一緒に整理します。</p><div className="hero-actions"><BusinessMarketingLink className="btn" href="/business/contact" eventType="CONTACT_CTA_CLICK" placement="BEFORE_FAQ">相談する</BusinessMarketingLink><Link className="text-link" href="/business/faq">よくある質問を見る →</Link></div></section>

    <section className="partner-cta"><span>🤝</span><div><h2>スポンサー企業・飲食店募集中</h2><p>俺メシと一緒に、新しい飯の集まり方を作りませんか？</p></div><BusinessMarketingLink className="btn secondary" href="/business/partner" eventType="PARTNER_CTA_CLICK" placement="LP_BOTTOM">パートナー募集を見る</BusinessMarketingLink></section>
    <section className="invitation"><span>🍚</span><div><h2>今日の空席から、始めませんか？</h2><p>登録後に内容を確認します。商品が決まっていなくても相談できます。</p></div><BusinessMarketingLink className="btn" href={signupHref} eventType="BUSINESS_SIGNUP_CTA_CLICK" placement="LP_BOTTOM">{membership ? '店舗管理へ' : '店舗・企業登録'}</BusinessMarketingLink><BusinessMarketingLink className="btn ghost" href="/business/contact" eventType="CONTACT_CTA_CLICK" placement="LP_BOTTOM">まず相談する</BusinessMarketingLink></section>
    {!membership && <BusinessMarketingLink className="business-sticky-cta" href="/business/signup" eventType="BUSINESS_SIGNUP_CTA_CLICK" placement="MOBILE_STICKY">店舗・企業登録</BusinessMarketingLink>}
  </div>;
}

function XPost({ kind, body, og }: { kind: string; body: string; og: string }) { return <article className="x-post-preview"><div className="person"><span className="avatar">店</span><span><strong>サンプル店舗</strong><small>@sample_store</small></span></div><p className="pre-wrap">{body}</p><div className="x-og"><small>ore-meshi.example</small><strong>PR · {kind}</strong><span>{og}</span></div><small className="muted">投稿画面で本文を編集できます</small></article>; }
function PlanCard({ title, copy, price, items }: { title: string; copy: string; price?: number; items: string[] }) { return <article className="panel pricing-card"><span className="eyebrow orange">{title}</span><h3>{copy}</h3><strong className="price-copy">{price ? `${yen(price)}円 / 月` : '最新料金は料金ページで確認'}</strong><ul>{items.map(item => <li key={item}>{item}</li>)}</ul><Link className="text-link" href="/business/pricing">詳しく見る →</Link></article>; }
function CompareCard({ tag, title, timing, use, value }: { tag: string; title: string; timing: string; use: string; value: string }) { return <article className="panel"><span className="tag">{tag}</span><h3>{title}</h3><dl className="detail-list"><div><dt>タイミング</dt><dd>{timing}</dd></div><div><dt>用途</dt><dd>{use}</dd></div><div><dt>価値</dt><dd>{value}</dd></div></dl></article>; }
function Flow({ title, steps }: { title: string; steps: string[] }) { return <div className="flow-block"><h3>{title}</h3><ol className="business-flow">{steps.map((step, i) => <li key={step}><small>0{i + 1}</small><strong>{step}</strong></li>)}</ol></div>; }
