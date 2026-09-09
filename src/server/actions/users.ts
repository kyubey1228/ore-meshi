'use server';
import { profileSchema } from '@/validators';
import { perform } from '@/server/action';
import { prisma } from '@/lib/prisma';
export async function updateProfile(input: unknown){return perform(async userId=>{const data=profileSchema.parse(input);await prisma.user.update({where:{id:userId},data});});}
