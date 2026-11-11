import type { PrismaClient } from "@prisma/client";
export async function nextQuoteReference(db: Pick<PrismaClient, "quoteCounter">, shop: string) {
  const counter = await db.quoteCounter.upsert({ where:{shop}, create:{shop,nextNumber:2}, update:{nextNumber:{increment:1}} });
  return `SS-${String(counter.nextNumber - 1).padStart(6,"0")}`;
}
