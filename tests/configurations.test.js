import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { saveDraftEnquiry } from '../app/configurations.server.js';
import { tokenHash,checkToken } from '../app/configuration-input.js';
import { combinedLengthMm,calculateBespokePrice } from '../app/configurator/bespoke-pricing.mjs';
const shop='stow-test.myshopify.com',token='a'.repeat(64);
function input(overrides={}) {return{requestId:randomUUID(),token,variantId:'123',pricingVersion:'2026-11-10',expectedTotalPence:247000,
 selection:{style:'richmond',layout:'corner',cornerHand:'left',storage:'none',drawerMainEnabled:true,drawerMainEndEnabled:false,drawerReturnEndEnabled:true,drawerLeftEndEnabled:false,drawerRightEndEnabled:false},
 dimensions:{lengthMm:3000,returnLengthMm:2500,depthMm:600,overallHeightMm:1600},
 finishes:{bodyFabricRange:'moda',bodyFabric:'Steel',bodyFabricCode:'MOD2244',cushionFabricRange:'moda',cushionFabric:'Clay',cushionFabricCode:'MOD2224'},extras:{skirting:'no'},
 contact:{customerName:'Test Customer',email:'test@example.test',consent:true,customerNotes:'Please confirm access clearance.'},...overrides};}
function fixture(){
 const quotes=[],operations=[],savedInputs=[];
 const db={quote:{findFirst:async({where})=>quotes.find(q=>q.shop===where.shop && q.storefrontRequestId===where.storefrontRequestId),count:async()=>0,
 update:async({where,data})=>Object.assign(quotes.find(q=>q.id===where.id),data)},$executeRaw:async()=>1,$transaction:async fn=>fn(db)};
 const admin={graphql:async(query,{variables})=>{operations.push({query,variables});return{json:async()=>({data:{shop:{currencyCode:'GBP',taxesIncluded:true},productVariant:{id:'gid://shopify/ProductVariant/123',title:'Left Hand Corner / No Storage',price:'1795.00',product:{handle:'the-richmond'}}}})};}};
 const context={shop,admin,db,env:{CONFIGURATOR_ENQUIRIES_ENABLED:'true',CONFIGURATOR_SHOP:shop},createQuote:async(data,context,tx)=>{
   assert.equal(tx,db);savedInputs.push(data);const quote={id:randomUUID(),reference:'SS-000001',shop,status:'DRAFT',revisions:[{revisionNumber:1,specification:data.specification}]};quotes.push(quote);return quote;
 }};
 return{context,quotes,operations,savedInputs};
}
test('request creates a Draft quote with immutable specification and pricing reference',async()=>{
 const f=fixture(),i=input();const result=await saveDraftEnquiry({...f.context,input:i});
 assert.equal(result.status,'DRAFT');assert.equal(result.reference,'SS-000001');assert.equal(f.quotes.length,1);
 const saved=f.savedInputs[0];assert.equal(saved.seatingFullPricePence,247000);assert.equal(saved.specification.pricingReference.basePence,179500);
 assert.equal(saved.specification.pricingReference.adjustmentPence,67500);assert.equal(saved.specification.pricingReference.version,'2026-11-10');
 assert.equal(saved.specification.finishes.cushionFabric,'Clay');assert.equal(saved.specification.customerNotes,i.contact.customerNotes);
 assert.equal(f.quotes[0].storefrontTokenHash,tokenHash(token));assert.equal('tokenHash' in result,false);
 assert.ok(f.operations.every(x=>x.query.startsWith('query')));
});
test('client prices are not trusted and changed prices require review before saving',async()=>{
 const f=fixture();const r=await saveDraftEnquiry({...f.context,input:input({expectedTotalPence:1,pricing:{totalPence:1},actualDrawerCount:0})});
 assert.equal(r.priceChanged,true);assert.equal(r.pricing.totalPence,247000);assert.equal(f.quotes.length,0);
});
test('duplicate sends reuse the same draft without creating another revision',async()=>{
 const f=fixture(),i=input();const a=await saveDraftEnquiry({...f.context,input:i});const b=await saveDraftEnquiry({...f.context,input:i});
 assert.equal(a.quoteId,b.quoteId);assert.equal(f.savedInputs.length,1);assert.equal(f.operations.length,1);
});
test('token and fingerprint prevent reusing another saved reference',async()=>{
 const f=fixture(),i=input();await saveDraftEnquiry({...f.context,input:i});
 await assert.rejects(saveDraftEnquiry({...f.context,input:{...i,token:'b'.repeat(64)}}),/already in use/);
 await assert.rejects(saveDraftEnquiry({...f.context,input:{...i,contact:{...i.contact,customerNotes:'Changed'}}}),/already in use/);
 assert.equal(checkToken(token,tokenHash(token)),true);assert.equal(checkToken('invalid',tokenHash(token)),false);
});
test('disabled integration and wrong shop fail without saving',async()=>{
 const f=fixture();await assert.rejects(saveDraftEnquiry({...f.context,input:input(),env:{...f.context.env,CONFIGURATOR_ENQUIRIES_ENABLED:'false'}}),/not configured/);
 await assert.rejects(saveDraftEnquiry({...f.context,input:input(),shop:'other.myshopify.com'}),/not configured/);assert.equal(f.quotes.length,0);
});
test('consent, source variant, measurements and model are validated',async()=>{
 const f=fixture(),i=input();
 await assert.rejects(saveDraftEnquiry({...f.context,input:{...i,contact:{...i.contact,consent:false}}}),/consent/);
 await assert.rejects(saveDraftEnquiry({...f.context,input:{...i,variantId:'../../bad'}}),/variant/);
 await assert.rejects(saveDraftEnquiry({...f.context,input:{...i,dimensions:{...i.dimensions,lengthMm:NaN}}}),/measurement/);
 await assert.rejects(saveDraftEnquiry({...f.context,input:{...i,selection:{...i.selection,style:'constructor'}}}),/selection/);
 assert.equal(f.quotes.length,0);
});
test('different pricing-rule versions require review instead of silently saving',async()=>{
 const f=fixture();const r=await saveDraftEnquiry({...f.context,input:input({pricingVersion:'old'})});assert.equal(r.priceChanged,true);assert.equal(f.quotes.length,0);
});
test('server U pricing adds both K returns',()=>{
 const i=input(),selection={...i.selection,layout:'u-shaped'},dimensions={...i.dimensions,lengthMm:3200,returnLengthMm:1750,overallHeightMm:1000};
 assert.equal(combinedLengthMm('u-shaped',dimensions),6700);
 const p=calculateBespokePrice({selection,dimensions,variants:[{id:1,title:'U Shaped / No Storage',price:249500}]});
 assert.equal(p.requestedBands,14);assert.equal(p.dimensionalDeltaPence,9600);assert.equal(p.adjustmentPence,15000);
});
