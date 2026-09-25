import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/social';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/mypage', '/profile', '/settings', '/notifications', '/messages', '/billing', '/checkout', '/history', '/matches', '/login', '/onboarding', '/business/account', '/business/analytics', '/business/billing', '/business/dashboard', '/business/onboarding', '/business/login'] },
    ],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
