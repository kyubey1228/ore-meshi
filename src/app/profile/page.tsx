import { getCurrentUserForProfile, getDiningTypes } from '@/lib/data';
import { requirePageUser } from '@/server/auth';
import { ProfileForm } from '@/components/profile-form';
export default async function ProfilePage() { const userId=await requirePageUser(); const [user,diningTypes] = await Promise.all([getCurrentUserForProfile(userId),getDiningTypes()]); if (!user) return null; return <section className="section narrow"><h1>プロフィール編集</h1><ProfileForm displayName={user.displayName} bio={user.bio ?? ''} email={user.email ?? ''} diningTypes={diningTypes} selectedDiningTypeIds={user.diningTypes.map(({diningType})=>diningType.id)}/></section>; }
