import { createHash, timingSafeEqual } from 'node:crypto';
const STYLES = ['richmond','camden','soho','mayfair','henley'];
const text = (value, limit = 120) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
export function tokenHash(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid configuration access token.');
  return createHash('sha256').update(token).digest('hex');
}
export function checkToken(token, expected) {
  try { return timingSafeEqual(Buffer.from(tokenHash(token), 'hex'), Buffer.from(expected, 'hex')); } catch { return false; }
}
export function normalizeConfiguration(input) {
  const s = input?.selection || {}, d = input?.dimensions || {};
  if (!STYLES.includes(s.style) || !['straight','corner','u-shaped'].includes(s.layout) ||
      !['none','drawers','lift-up'].includes(s.storage) || !['left','right'].includes(s.cornerHand)) throw new Error('Invalid seating selection.');
  const variantId = String(input.variantId || '');
  if (!/^\d+$/.test(variantId)) throw new Error('Invalid product variant.');
  const dimensions = {};
  for (const key of ['lengthMm','depthMm','returnLengthMm','overallHeightMm']) {
    const value = d[key];
    if (!Number.isSafeInteger(value) || value <= 0 || value > 6000) throw new Error('Invalid measurement.');
    dimensions[key] = value;
  }
  const selection = { style:s.style, layout:s.layout, storage:s.storage, cornerHand:s.cornerHand };
  for (const key of ['drawerMainEnabled','drawerMainEndEnabled','drawerReturnEndEnabled','drawerLeftEndEnabled','drawerRightEndEnabled']) {
    if (typeof s[key] !== 'boolean') throw new Error('Invalid drawer selection.');
    selection[key] = s[key];
  }
  const finishes = {};
  for (const key of ['bodyFabricRange','bodyFabric','bodyFabricCode','cushionFabricRange','cushionFabric','cushionFabricCode']) finishes[key] = text(input.finishes?.[key]);
  if (!finishes.bodyFabric || !finishes.cushionFabric) throw new Error('Choose your upholstery.');
  const extras = { skirting: input.extras?.skirting === 'yes' ? 'yes' : 'no' };
  for (const [key,max] of [['skirtingHeight',500],['skirtingDepth',200]]) {
    const value = input.extras?.[key] ?? 0;
    if (!Number.isSafeInteger(value) || value < 0 || value > max || (extras.skirting === 'yes' && value === 0)) throw new Error('Invalid skirting measurements.');
    extras[key] = value;
  }
  return { selection, dimensions, finishes, extras, variantId };
}
export function configurationFingerprint(specification) {
  return createHash('sha256').update(JSON.stringify(specification)).digest('hex');
}
export function contactInput(input) {
  const c = { customerName:text(input?.customerName,150), customerEmail:text(input?.email,254),
    customerTelephone:text(input?.phone,40), deliveryPostcode:text(input?.postcode,20), customerNotes:text(input?.customerNotes,4000), drawerNotes:text(input?.drawerNotes,2000) };
  if (input?.consent !== true || !c.customerName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.customerEmail)) throw new Error('Enter your name, email and consent to enquire.');
  return c;
}
