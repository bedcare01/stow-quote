import type {ActionFunctionArgs} from "react-router";
import {authenticate} from "../shopify.server";
import {db} from "../db.server";
export async function action({request}:ActionFunctionArgs){const {topic,shop,payload}=await authenticate.webhook(request);const id=request.headers.get("X-Shopify-Webhook-Id");if(!id)return new Response("Missing webhook id",{status:400});try{await db.webhookReceipt.create({data:{id,topic,shop}})}catch{return new Response(null,{status:200})}if(topic==="ORDERS_PAID"){const draftOrderId=(payload as any).draft_order_id;if(draftOrderId)await db.quote.updateMany({where:{shop,shopifyDraftOrderId:String(draftOrderId)},data:{status:"PAID"}})}return new Response(null,{status:200})}
