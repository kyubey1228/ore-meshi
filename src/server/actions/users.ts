'use server';
import { profileSchema } from '@/validators';
import { perform, ensure, transaction } from '@/server/action';
export async function updateProfile(input: unknown){return perform(async userId=>{
  const {diningTypeIds,...data}=profileSchema.parse(input);
  await transaction(async tx=>{
    const activeTypes=await tx.diningType.count({where:{id:{in:diningTypeIds},isActive:true}});
    ensure(activeTypes===new Set(diningTypeIds).size,'飯タイプを選び直してください。');
    await tx.userDiningType.deleteMany({where:{userId}});
    await tx.user.update({where:{id:userId},data:{...data,diningTypes:{create:diningTypeIds.map(diningTypeId=>({diningTypeId}))}}});
  });
});}
