import test from "node:test";import assert from "node:assert/strict";import {calculatePricing,formatGBP,parsePoundsToPence} from "../app/pricing.js";
test("parses pounds without floating point arithmetic",()=>{assert.equal(parsePoundsToPence("1,234.56"),123456);assert.equal(parsePoundsToPence("10.5"),1050)});
test("rejects fractions below a penny",()=>assert.throws(()=>parsePoundsToPence("1.001")));
test("simple total is seating plus options plus delivery",()=>{const p=calculatePricing({seatingFullPricePence:200000,additionalOptions:[{description:"Storage",pricePence:15000},{description:"Piping",pricePence:2500}],deliveryCostPence:7500});assert.equal(p.additionalOptionsTotalPence,17500);assert.equal(p.grandTotalPence,225000);assert.equal(p.currency,"GBP");assert.equal(p.vatInclusive,true)});
test("formats GBP",()=>assert.equal(formatGBP(123456),"£1,234.56"));
