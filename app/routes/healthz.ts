import { db } from "../db.server";
export async function loader(){ try { await db.$queryRaw`SELECT 1`; return Response.json({status:"ok"},{status:200,headers:{"Cache-Control":"no-store"}}); } catch { return Response.json({status:"unhealthy"},{status:503}); } }
