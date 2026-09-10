'use server';
import { profileSchema } from '@/validators';
import { perform, ensure, transaction } from '@/server/action';
import { prisma } from '@/lib/prisma';
export async function updateProfile(input: unknown){return perform(async userId=>{
  const {diningTypeIds,email,...data}=profileSchema.parse(input);
  if(email){
    const existing=await prisma.user.findUnique({where:{email}});
    ensure(!existing||existing.id===userId,'このメールアドレスはすでに使われています。');
  }
  await transaction(async tx=>{
    const activeTypes=await tx.diningType.count({where:{id:{in:diningTypeIds},isActive:true}});
    ensure(activeTypes===new Set(diningTypeIds).size,'飯タイプを選び直してください。');
    await tx.userDiningType.deleteMany({where:{userId}});
    await tx.user.update({where:{id:userId},data:{...data,email:email||null,diningTypes:{create:diningTypeIds.map(diningTypeId=>({diningTypeId}))}}});
  });
});}
