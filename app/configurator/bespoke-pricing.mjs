import { validateConfiguratorLayout } from './configurator-layout-validity.mjs';
import { calculateRichmondDrawerPlacement } from './richmond-drawer-rules.mjs';

export const PRICING_VERSION = '2026-11-10';
const RATES = { richmond: 96, camden: 96, soho: 96, mayfair: 109, henley: 56 };
export function standardPricingDimensions(style, layout) {
  const henley = style === 'henley';
  return { lengthMm: layout === 'straight' ? 2000 : layout === 'corner' ? (henley ? 2520 : 2600) : (henley ? 3100 : 3200),
    returnLengthMm: henley ? 1420 : 1500, depthMm: henley ? 520 : 600, overallHeightMm: henley ? 480 : 1000 };
}
export function combinedLengthMm(layout, dimensions) {
  return dimensions.lengthMm + (layout === 'straight' ? 0 : dimensions.returnLengthMm * (layout === 'u-shaped' ? 2 : 1));
}
export function drawerQuantity(selection, dimensions) {
  if (selection.storage !== 'drawers') return 0;
  const main = selection.drawerMainEnabled !== false;
  const placement = main ? calculateRichmondDrawerPlacement({ ...selection, ...dimensions,
    trialCornerSetbackMm: 60, trialLeftCornerSetbackMm: 60, trialRightCornerSetbackMm: 60 }) : { valid: true, drawerCount: 0 };
  if (!placement.valid) return null;
  return placement.drawerCount + (selection.layout === 'corner'
    ? Number(Boolean(selection.drawerMainEndEnabled)) + Number(Boolean(selection.drawerReturnEndEnabled))
    : selection.layout === 'u-shaped' ? Number(Boolean(selection.drawerLeftEndEnabled)) + Number(Boolean(selection.drawerRightEndEnabled)) : 0);
}
export function matchedVariantTitle({ layout, cornerHand, storage }) {
  const shape = layout === 'straight' ? 'Straight' : layout === 'corner'
    ? (cornerHand === 'left' ? 'Left Hand Corner' : 'Right Hand Corner') : 'U Shaped';
  return `${shape} / ${{ none: 'No Storage', drawers: 'With Drawers', 'lift-up': 'Lift-Up' }[storage]}`;
}
export function calculateBespokePrice({ selection, dimensions, variants, currency = 'GBP', actualDrawerCount }) {
  const rate = RATES[selection.style];
  const variant = variants?.find(v => v.title === matchedVariantTitle(selection));
  if (currency !== 'GBP' || !rate || !variant || !Number.isSafeInteger(variant.price) || variant.price <= 0)
    return { available: false, message: 'Price available on quotation — a matching GBP product price could not be verified.' };
  const standard = standardPricingDimensions(selection.style, selection.layout);
  const valid = [dimensions.lengthMm, dimensions.depthMm, dimensions.overallHeightMm].every(v => Number.isFinite(v) && v > 0) &&
    dimensions.lengthMm <= 6000 && (selection.layout === 'straight' || (Number.isFinite(dimensions.returnLengthMm) && dimensions.returnLengthMm > dimensions.depthMm && dimensions.returnLengthMm <= 6000)) &&
    dimensions.overallHeightMm <= (selection.style === 'henley' ? 600 : 1800);
  if (!valid || !validateConfiguratorLayout({ style: selection.style, layout: selection.layout, ...dimensions, baseHeightMm: selection.style === 'henley' ? dimensions.overallHeightMm - 90 : null }).valid) return { available: false, message: 'Enter valid measurements to see your estimate.' };
  if (selection.style === 'henley' && dimensions.overallHeightMm !== standard.overallHeightMm)
    return { available: false, message: 'Bench seat-height amendments require a checked quotation.' };
  const standardSelection = { ...selection, drawerMainEnabled: true, drawerMainEndEnabled: false,
    drawerReturnEndEnabled: selection.layout === 'corner', drawerLeftEndEnabled: selection.layout === 'u-shaped', drawerRightEndEnabled: selection.layout === 'u-shaped' };
  const standardGeneratedDrawers = drawerQuantity(standardSelection, standard);
  const drawers = actualDrawerCount ?? drawerQuantity(selection, dimensions);
  if (selection.storage === 'drawers' && (!Number.isInteger(drawers) || drawers < 0 || standardGeneratedDrawers === null))
    return { available: false, message: 'Drawer quantities require a checked quotation.' };
  const includedDrawers = selection.storage === 'drawers' ? (selection.layout === 'corner' ? 3 : standardGeneratedDrawers) : 0;
  const addedDrawers = Math.max(0, drawers - includedDrawers);
  const removedDrawers = Math.max(0, standardGeneratedDrawers - drawers);
  const standardBands = Math.ceil(combinedLengthMm(selection.layout, standard) / 500);
  const requestedBands = Math.ceil(combinedLengthMm(selection.layout, dimensions) / 500);
  const heightBands = selection.style === 'henley' ? 0 : Math.ceil(Math.max(0, dimensions.overallHeightMm - 1000) / 500);
  const dimensionalDeltaPence = ((requestedBands - standardBands) * rate + heightBands * 133) * 100;
  const rawAdjustmentPence = dimensionalDeltaPence * (dimensionalDeltaPence >= 0 ? 1.44 : 1.2) + addedDrawers * 7200 - removedDrawers * 4800;
  const adjustmentPence = rawAdjustmentPence > 0 ? Math.ceil((rawAdjustmentPence - 0.00001) / 2500) * 2500 : -Math.floor((-rawAdjustmentPence + 0.00001) / 500) * 500;
  const totalPence = variant.price + adjustmentPence;
  if (totalPence <= 0) return { available: false, message: 'This specification requires a checked quotation.' };
  return { available: true, version: PRICING_VERSION, variantId: variant.id, variantTitle: variant.title,
    basePence: variant.price, adjustmentPence: adjustmentPence || 0, totalPence, drawers, includedDrawers, addedDrawers, removedDrawers,
    heightBands, standardBands, requestedBands, dimensionalDeltaPence };
}

