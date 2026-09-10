import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/social';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/mypage', '/profile', '/onboarding', '/business/dashboard', '/business/onboarding', '/business/login', '/admin', '/api'] },
    ],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
