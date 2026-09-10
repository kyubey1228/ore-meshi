import { getCurrentUser, getDiningTypes } from '@/lib/data';
import { requirePageUser } from '@/server/auth';
import { prisma } from '@/lib/prisma';
import { ProfileForm } from '@/components/profile-form';
export default async function ProfilePage() { const userId=await requirePageUser(); const [user,diningTypes,userEmail] = await Promise.all([getCurrentUser(),getDiningTypes(),prisma.user.findUnique({where:{id:userId},select:{email:true}})]); if (!user) return null; return <section className="section narrow"><h1>プロフィール編集</h1><ProfileForm displayName={user.displayName} bio={user.bio ?? ''} email={userEmail?.email ?? ''} diningTypes={diningTypes} selectedDiningTypeIds={user.diningTypes.map(({diningType})=>diningType.id)}/></section>; }
