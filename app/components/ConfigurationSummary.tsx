export function ConfigurationSummary({ specification }: { specification:any }) {
  const s=specification;
  if (!s || typeof s !== 'object') return null;
  if (!s.selection) return s.description ? <p>{s.description}</p> : null;
  const d=s.dimensions || {}, f=s.finishes || {}, p=s.pricingReference;
  return <><p>{s.selection.style} · {s.selection.layout} · {s.selection.storage}</p>
    <p>Main length: {d.lengthMm}mm. {s.selection.layout !== 'straight' && <>Return length: {d.returnLengthMm}mm {s.selection.layout==='u-shaped' ? '(each of two)' : ''}. </>}Depth: {d.depthMm}mm. Overall height: {d.overallHeightMm}mm.</p>
    <p>Body/backrest: {f.bodyFabricRange} — {f.bodyFabric}. Cushion: {f.cushionFabricRange} — {f.cushionFabric}.</p>
    {s.extras?.skirting==='yes' && <p>Skirting allowance: {s.extras.skirtingHeight}mm high × {s.extras.skirtingDepth}mm deep.</p>}
    {p && <p>Pricing reference: {p.requestId}. Rule version: {p.version}. Source variant: {p.variantId}. Standard price: £{(p.basePence/100).toFixed(2)}. Bespoke adjustment: £{(p.adjustmentPence/100).toFixed(2)}. Total: £{(p.totalPence/100).toFixed(2)} including VAT.</p>}
    {s.customerNotes && <p>Customer question: {s.customerNotes}</p>}{s.drawerNotes && <p>Drawer notes: {s.drawerNotes}</p>}</>;
}
