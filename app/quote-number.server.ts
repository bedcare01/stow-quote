import type { PrismaClient } from "@prisma/client";
export async function nextQuoteReference(db: PrismaClient, shop: string) {
  return db.$transaction(async tx => {
    const counter = await tx.quoteCounter.upsert({ where:{shop}, create:{shop,nextNumber:2}, update:{nextNumber:{increment:1}} });
    const number = counter.nextNumber - 1;
    return `SS-${String(number).padStart(6,"0")}`;
  });
}
