import 'server-only';
import { prisma } from '@/lib/prisma';
import { requirePageUser } from '@/server/auth';
// Internal attendance counts are available only for the authenticated user's own account.
export async function getDiningStats(){
  const userId=await requirePageUser();
  const [completedMealCount,lateCancelCount,noShowCount]=await Promise.all([
    prisma.match.count({where:{status:'COMPLETED',participants:{some:{userId}}}}),
    prisma.diningFeedback.count({where:{toUserId:userId,attendanceStatus:'LATE_CANCEL'}}),
    prisma.diningFeedback.count({where:{toUserId:userId,attendanceStatus:'NO_SHOW'}})
  ]);return {completedMealCount,lateCancelCount,noShowCount};
}
