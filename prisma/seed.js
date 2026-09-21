import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const styles = [
  ["Placeholder Style A", "STYLE-A"], ["Placeholder Style B", "STYLE-B"],
  ["Placeholder Style C", "STYLE-C"], ["Placeholder Style D", "STYLE-D"]
];
for (const [name, reference] of styles) await db.seatingStyle.upsert({ where:{reference}, update:{}, create:{name,reference,description:"Replace with the approved Stow & Settle style name and details."} });
await db.$disconnect();
