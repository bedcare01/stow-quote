const MAX_PENCE = 2_147_483_647;

export function parsePoundsToPence(value) {
  const normalized = String(value ?? "").trim().replace(/^£/, "").replace(/,/g, "");
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(normalized)) throw new Error("Enter a non-negative GBP amount with no more than two decimal places.");
  const [whole, fraction = ""] = normalized.split(".");
  const pence = Number(BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2)));
  if (!Number.isSafeInteger(pence) || pence > MAX_PENCE) throw new Error("Amount is too large.");
  return pence;
}

export function calculatePricing({ seatingFullPricePence, deliveryCostPence, additionalOptions = [] }) {
  for (const value of [seatingFullPricePence, deliveryCostPence, ...additionalOptions.map(o => o.pricePence)]) {
    if (!Number.isInteger(value) || value < 0) throw new Error("Prices must be non-negative integer pennies.");
  }
  const additionalOptionsTotalPence = additionalOptions.reduce((sum, option) => sum + option.pricePence, 0);
  const grandTotalPence = seatingFullPricePence + additionalOptionsTotalPence + deliveryCostPence;
  if (!Number.isSafeInteger(grandTotalPence) || grandTotalPence > MAX_PENCE) throw new Error("Grand total is too large.");
  return { seatingFullPricePence, additionalOptions, additionalOptionsTotalPence, deliveryCostPence, grandTotalPence, currency:"GBP", vatInclusive:true };
}

export function formatGBP(pence) {
  if (!Number.isInteger(pence)) throw new Error("Expected integer pennies.");
  return new Intl.NumberFormat("en-GB", { style:"currency", currency:"GBP" }).format(pence / 100);
}
