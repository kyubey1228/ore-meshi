import { getCurrentUser } from '@/lib/data';
import { requirePageUser } from '@/server/auth';
import { ProfileForm } from '@/components/profile-form';
export default async function ProfilePage() { await requirePageUser(); const user = await getCurrentUser(); if (!user) return null; return <section className="section narrow"><h1>プロフィール編集</h1><ProfileForm displayName={user.displayName} bio={user.bio ?? ''} /></section>; }
