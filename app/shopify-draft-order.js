import { formatGBP } from "./pricing.js";

const money = pence => ({ amount:(pence / 100).toFixed(2), currencyCode:"GBP" });
export function buildDraftOrderInput({ quote, revision }) {
  const pricing = revision.pricing;
  const customAttributes = [{ key:"Quote reference", value:quote.reference }, { key:"Revision", value:String(revision.revisionNumber) }];
  const lineItems = [{ title:`Bespoke seating — ${quote.reference}`, quantity:1, originalUnitPriceWithCurrency:money(pricing.seatingFullPricePence), customAttributes }];
  for (const option of pricing.additionalOptions) lineItems.push({ title:option.description, quantity:1, originalUnitPriceWithCurrency:money(option.pricePence), customAttributes });
  if (pricing.deliveryCostPence > 0) lineItems.push({ title:"Delivery", quantity:1, originalUnitPriceWithCurrency:money(pricing.deliveryCostPence), customAttributes });
  return { email:quote.customerEmail, note:`Stow & Settle quotation ${quote.reference}. Total ${formatGBP(pricing.grandTotalPence)} including VAT.`, tags:["bespoke-seating", quote.reference], lineItems };
}
