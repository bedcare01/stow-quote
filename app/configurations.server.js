import { calculateBespokePrice } from './configurator/bespoke-pricing.mjs';
import { normalizeConfiguration, configurationFingerprint, tokenHash, checkToken, contactInput } from './configuration-input.js';
import { graphql, SOURCE_VARIANT } from './configuration-shopify.js';

export function publicPricing(price) {
  return { version:price.version, variantId:price.variantId, basePence:price.basePence,
    adjustmentPence:price.adjustmentPence, totalPence:price.totalPence, currency:'GBP', vatInclusive:true };
}
export async function saveDraftEnquiry({ input, shop, admin, db, env, createQuote, now = new Date() }) {
  if (env.CONFIGURATOR_ENQUIRIES_ENABLED !== 'true' || env.CONFIGURATOR_SHOP !== shop)
    throw new Error('Saving to the quote app is not configured yet. Please contact our team.');
  if (!admin) throw new Error('The quote app must be connected to this store.');
  if (!/^[a-f0-9-]{36}$/.test(input.requestId || '')) throw new Error('Invalid request reference.');
  const hash = tokenHash(input.token);
  const specification = normalizeConfiguration(input);
  const contact = contactInput(input.contact);
  const fingerprint = configurationFingerprint({ specification, contact });
  return db.$transaction(async tx => {
    const lockKey = `${shop}:${input.requestId}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
    const existing = await tx.quote.findFirst({ where:{ shop,storefrontRequestId:input.requestId },include:{revisions:{where:{revisionNumber:1}}} });
    if (existing) {
      if (!checkToken(input.token,existing.storefrontTokenHash) || existing.configurationFingerprint !== fingerprint)
        throw new Error('This request reference is already in use. Please start a new enquiry.');
      return { reference:existing.reference, quoteId:existing.id, status:existing.status,
        pricing:existing.revisions[0].specification.pricingReference };
    }
    const count = await tx.quote.count({ where:{shop,createdBy:'storefront-configurator',createdAt:{gte:new Date(now.getTime()-60000)}} });
    if (count >= 30) throw new Error('Please wait a moment before sending another enquiry.');
    const data = await graphql(admin,SOURCE_VARIANT,{id:`gid://shopify/ProductVariant/${specification.variantId}`});
    const variant = data.productVariant;
    if (!variant || variant.product.handle !== `the-${specification.selection.style}` || data.shop.currencyCode !== 'GBP' || data.shop.taxesIncluded !== true)
      throw new Error('A matching VAT-inclusive GBP product could not be verified.');
    const price = calculateBespokePrice({ selection:specification.selection,dimensions:specification.dimensions,
      currency:'GBP',variants:[{id:specification.variantId,title:variant.title,price:Math.round(Number(variant.price)*100)}] });
    if (!price.available) throw new Error(price.message);
    if (input.pricingVersion !== price.version || input.expectedTotalPence !== price.totalPence)
      return { priceChanged:true,pricing:publicPricing(price) };
    const pricingReference = { ...publicPricing(price), requestId:input.requestId };
    const quote = await createQuote({ ...contact,enquiryDate:now.toISOString(),enquiryReference:input.requestId,
      specification:{ ...specification,pricingReference,customerNotes:contact.customerNotes,drawerNotes:contact.drawerNotes },
      seatingFullPricePence:price.totalPence,deliveryCostPence:0,additionalOptions:[] },{shop,staff:'storefront-configurator'},tx);
    await tx.quote.update({where:{id:quote.id},data:{storefrontRequestId:input.requestId,storefrontTokenHash:hash,configurationFingerprint:fingerprint}});
    return { reference:quote.reference,quoteId:quote.id,status:'DRAFT',pricing:pricingReference };
  },{timeout:45000});
}
