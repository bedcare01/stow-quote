/**
 * Shared structural dimension validation for every configurator seating shell.
 *
 * This module is deliberately independent of storage and drawer manufacture.
 * Its only concern is whether the selected furniture shell can be constructed
 * without a collapsed main or return run.
 */

export const CONFIGURATOR_DIMENSION_LIMITS = Object.freeze({
  lengthMm: Object.freeze({ minimum: 600, maximum: 6000 }),
  depthMm: Object.freeze({ minimum: 585, maximum: 800 }),
  henleyDepthMm: Object.freeze({ minimum: 520, maximum: 720 }),
  returnLengthMm: Object.freeze({ minimum: 600, maximum: 6000 }),
  overallHeightMm: Object.freeze({ minimum: 700, maximum: 1800 }),
  henleySeatHeightMm: Object.freeze({ minimum: 480, maximum: 600 }),
  henleyCushionThicknessMm: 90,
  cornerMainSpanMm: 100,
  uShapeMainSpanMm: 200,
  returnSpanMm: 100
});

const SUPPORTED_LAYOUTS = new Set(['straight', 'corner', 'u-shaped']);

function result(valid, code, message, dimensions, mainFrontageMm, returnFrontageMm,
  applicableConstraint) {
  return {
    valid,
    code,
    message,
    dimensions,
    validatedDimensions: valid ? dimensions : null,
    mainFrontageMm,
    returnFrontageMm,
    applicableConstraint
  };
}

function invalidDimension(code, label, value, limits, dimensions) {
  return result(
    false,
    code,
    `${label} must be a finite number from ${limits.minimum} to ${limits.maximum} mm.`,
    dimensions,
    null,
    null,
    `${limits.minimum} <= ${label.slice(0, 1)} <= ${limits.maximum}`
  );
}

export function validateConfiguratorLayout({
  style,
  layout,
  lengthMm,
  depthMm,
  returnLengthMm,
  overallHeightMm,
  baseHeightMm = null
}) {
  const effectiveBaseHeightMm = style === 'henley'
    ? overallHeightMm - CONFIGURATOR_DIMENSION_LIMITS.henleyCushionThicknessMm
    : baseHeightMm;
  const dimensions = Object.freeze({
    style,
    layout,
    lengthMm,
    depthMm,
    returnLengthMm: layout === 'straight' ? null : returnLengthMm,
    overallHeightMm,
    ...(style === 'henley' ? {
      baseHeightMm: effectiveBaseHeightMm,
      cushionThicknessMm: CONFIGURATOR_DIMENSION_LIMITS.henleyCushionThicknessMm
    } : {})
  });
  const limits = CONFIGURATOR_DIMENSION_LIMITS;
  const depthLimits = style === 'henley' ? limits.henleyDepthMm : limits.depthMm;

  if (!SUPPORTED_LAYOUTS.has(layout)) {
    return result(
      false,
      'unsupported-layout',
      `Unsupported seating layout: ${String(layout)}.`,
      dimensions,
      null,
      null,
      'layout must be straight, corner or u-shaped'
    );
  }
  if (!Number.isFinite(lengthMm) || lengthMm < limits.lengthMm.minimum ||
      lengthMm > limits.lengthMm.maximum) {
    return invalidDimension('invalid-length', 'A main length', lengthMm, limits.lengthMm, dimensions);
  }
  if (!Number.isFinite(depthMm) || depthMm < depthLimits.minimum ||
      depthMm > depthLimits.maximum) {
    return invalidDimension('invalid-depth', 'B total depth', depthMm, depthLimits, dimensions);
  }
  if (style === 'henley') {
    if (!Number.isFinite(overallHeightMm) ||
        overallHeightMm < limits.henleySeatHeightMm.minimum ||
        overallHeightMm > limits.henleySeatHeightMm.maximum) {
      return invalidDimension(
        'invalid-seat-height', 'I total seat height', overallHeightMm,
        limits.henleySeatHeightMm, dimensions
      );
    }
  } else if (!Number.isFinite(overallHeightMm) ||
      overallHeightMm < limits.overallHeightMm.minimum ||
      overallHeightMm > limits.overallHeightMm.maximum) {
    return invalidDimension(
      'invalid-height', 'E overall height', overallHeightMm, limits.overallHeightMm, dimensions
    );
  }

  if (layout === 'straight') {
    return result(
      true,
      'valid-structure',
      '',
      dimensions,
      lengthMm,
      null,
      style === 'henley'
        ? '600 <= A <= 6000; 520 <= B <= 720; 480 <= I <= 600; cushion = 90'
        : '600 <= A <= 6000; 585 <= B <= 800; 700 <= E <= 1800'
    );
  }

  if (!Number.isFinite(returnLengthMm) ||
      returnLengthMm < limits.returnLengthMm.minimum ||
      returnLengthMm > limits.returnLengthMm.maximum) {
    return invalidDimension(
      'invalid-return', 'K return length', returnLengthMm, limits.returnLengthMm, dimensions
    );
  }

  const mainFrontageMm = layout === 'corner'
    ? lengthMm - depthMm
    : lengthMm - 2 * depthMm;
  const minimumMainSpanMm = layout === 'corner'
    ? limits.cornerMainSpanMm
    : limits.uShapeMainSpanMm;
  if (mainFrontageMm < minimumMainSpanMm) {
    const formula = layout === 'corner' ? 'A - B' : 'A - 2B';
    const requirement = layout === 'corner' ? 'A must be at least B + 100 mm' :
      'A must be at least 2B + 200 mm';
    return result(
      false,
      'invalid-main-span',
      `${requirement}. The selected ${formula} frontage is ${mainFrontageMm} mm.`,
      dimensions,
      mainFrontageMm,
      returnLengthMm - depthMm,
      `${formula} >= ${minimumMainSpanMm} mm`
    );
  }

  const returnFrontageMm = returnLengthMm - depthMm;
  if (returnFrontageMm < limits.returnSpanMm) {
    return result(
      false,
      'invalid-return-span',
      `K must be at least B + 100 mm. The selected K - B return frontage is ${returnFrontageMm} mm.`,
      dimensions,
      mainFrontageMm,
      returnFrontageMm,
      'K - B >= 100 mm'
    );
  }

  return result(
    true,
    'valid-structure',
    '',
    dimensions,
    mainFrontageMm,
    returnFrontageMm,
    layout === 'corner'
      ? 'A - B >= 100 mm; K - B >= 100 mm'
      : 'A - 2B >= 200 mm; K - B >= 100 mm'
  );
}

