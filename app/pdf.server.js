import PDFDocument from "pdfkit";
import { formatGBP } from "./pricing.js";

export function generateQuotePdf({ quote, revision, paymentUrl }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size:"A4", margins:{top:48,bottom:48,left:54,right:54}, info:{Title:`Quotation ${quote.reference}`,Author:"Stow & Settle"} });
    const chunks=[]; doc.on("data",c=>chunks.push(c)); doc.on("end",()=>resolve(Buffer.concat(chunks))); doc.on("error",reject);
    const price=revision.pricing;
    doc.fontSize(22).text("Stow & Settle",{align:"right"});
    doc.moveDown().fontSize(20).text("Bespoke Seating Quotation");
    doc.fontSize(10).fillColor("#555").text(`${quote.reference}  •  Revision ${revision.revisionNumber}`);
    doc.moveDown().fillColor("#111").fontSize(12).text(`Prepared for ${quote.customerName}`);
    doc.text(quote.customerEmail);
    doc.moveDown().fontSize(14).text("Specification",{underline:true});
    doc.fontSize(10).text(String(revision.specification.description||"Bespoke seating as specified."));
    doc.moveDown().fontSize(14).text("Price breakdown",{underline:true});
    const row=(label,value)=>{doc.fontSize(11).text(label,{continued:true}).text(formatGBP(value),{align:"right"});};
    row("Seating full price",price.seatingFullPricePence);
    for(const option of price.additionalOptions) row(option.description,option.pricePence);
    row("Delivery cost",price.deliveryCostPence);
    doc.moveDown(.5).lineWidth(1).moveTo(54,doc.y).lineTo(541,doc.y).stroke(); doc.moveDown(.5);
    doc.fontSize(14).font("Helvetica-Bold"); row("Grand total",price.grandTotalPence); doc.font("Helvetica");
    doc.fontSize(9).fillColor("#555").text("All amounts are GBP and inclusive of VAT.");
    if(paymentUrl){doc.moveDown().fillColor("#111").fontSize(13).text("Accept quote & pay",{link:paymentUrl,underline:true});doc.fontSize(8).text(paymentUrl,{link:paymentUrl});}
    doc.end();
  });
}
