'use server';
import { z } from 'zod';
import { perform, transaction } from '@/server/action';
export async function createBusinessAccount(input:unknown){return perform(async userId=>{
  const data=z.object({name:z.string().trim().min(1).max(80),slug:z.string().trim().min(3).max(50).regex(/^[a-z0-9-]+$/),area:z.string().trim().max(80).optional().default('')}).parse(input);
  return transaction(async tx=>{await tx.businessAccount.create({data:{...data,members:{create:{userId,role:'OWNER',canPostToSocial:true}},socialPostSettings:{create:{}}}});return '/business';});
});}
