import { db } from "./db.server";
import { calculatePricing } from "./pricing.js";
import { nextQuoteReference } from "./quote-number.server";

export async function createQuote(input:any, context:{shop:string;staff:string}) {
  const pricing = calculatePricing(input);
  const reference = await nextQuoteReference(db, context.shop);
  return db.quote.create({ data:{ reference,shop:context.shop,status:"DRAFT",customerName:input.customerName,customerEmail:input.customerEmail,customerTelephone:input.customerTelephone||null,customerAddress:input.customerAddress||null,deliveryPostcode:input.deliveryPostcode||null,enquiryDate:new Date(input.enquiryDate),enquiryReference:input.enquiryReference||null,internalNotes:input.internalNotes||null,seatingStyleId:input.seatingStyleId||null,currentRevisionNumber:1,createdBy:context.staff,updatedBy:context.staff,revisions:{create:{revisionNumber:1,specification:input.specification,pricing,seatingFullPricePence:pricing.seatingFullPricePence,deliveryCostPence:pricing.deliveryCostPence,additionalOptionsTotalPence:pricing.additionalOptionsTotalPence,grandTotalPence:pricing.grandTotalPence,createdBy:context.staff}}}, include:{revisions:true} });
}

export async function reviseQuote(quoteId:string,input:any,staff:string) {
  const pricing=calculatePricing(input);
  return db.$transaction(async tx=>{
    const quote=await tx.quote.findUniqueOrThrow({where:{id:quoteId}});
    const revisionNumber=quote.currentRevisionNumber+1;
    await tx.quoteRevision.create({data:{quoteId,revisionNumber,specification:input.specification,pricing,seatingFullPricePence:pricing.seatingFullPricePence,deliveryCostPence:pricing.deliveryCostPence,additionalOptionsTotalPence:pricing.additionalOptionsTotalPence,grandTotalPence:pricing.grandTotalPence,createdBy:staff}});
    return tx.quote.update({where:{id:quoteId},data:{currentRevisionNumber:revisionNumber,updatedBy:staff,status:"DRAFT"}});
  });
}
