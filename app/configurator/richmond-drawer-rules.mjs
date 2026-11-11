/**
 * Pure Richmond drawer placement rules.
 *
 * This module intentionally contains no model-viewer, DOM or Blender logic.
 * Stage 3R.1A uses it only for calculation and validation; it does not claim
 * that drawer geometry exists in the currently loaded furniture shell.
 */

import { validateRichmondDrawerOpeningDirections } from './richmond-drawer-placement-rules.mjs';

export const RICHMOND_DRAWER_RULES = Object.freeze({
  minDrawerWidthMm: 800,
  maxDrawerWidthMm: 1200,
  betweenDrawersMm: 120,
  minExternalClearanceMm: 60,
  minGeometricCornerSetbackMm: 12,
  drawerFrontHeightMm: 280,
  minDrawerFrontHeightMm: 240,
  manufacturingCornerClearanceMm: null
});

const EPSILON = 1e-7;

function invalid(code, message, extra = {}) {
  return { valid: false, code, message, ...extra };
}

function finitePositive(value) {
  return Number.isFinite(value) && value > 0;
}

export function richmondVisibleFrontageMm({ layout, lengthMm, depthMm }) {
  if (!finitePositive(lengthMm)) {
    return invalid('invalid-main-length', 'A main length must be a positive number.');
  }

  if (layout === 'straight') {
    return { valid: true, code: 'supported', frontageMm: lengthMm };
  }

  if (layout !== 'corner' && layout !== 'u-shaped') {
    return invalid('unsupported-layout', `Unsupported Richmond layout: ${String(layout)}.`);
  }
  if (!finitePositive(depthMm)) {
    return invalid('invalid-depth', 'B total depth must be a positive number.');
  }

  const frontageMm = layout === 'corner'
    ? lengthMm - depthMm
    : lengthMm - 2 * depthMm;
  if (frontageMm <= 0) {
    const formula = layout === 'corner' ? 'A - B' : 'A - 2B';
    return invalid(
      'invalid-visible-frontage',
      `The ${formula} main visible frontage must be greater than zero.`,
      { frontageMm }
    );
  }
  return { valid: true, code: 'supported', frontageMm };
}

/**
 * Straight runs use the Stage 3R.1B reconciled policy: 60 mm is a minimum,
 * the group is centred, and the existing count-transition policy is retained.
 * This deliberately supersedes the earlier DRAWERS.md wording of "exactly
 * 60 mm" so that, for example, A=1500 yields 1 x 1200 with 150 mm margins.
 */
export function solveRichmondStraightDrawerRun(frontageMm) {
  const rules = RICHMOND_DRAWER_RULES;
  if (!finitePositive(frontageMm)) {
    return invalid('invalid-frontage', 'Straight frontage must be a positive number.');
  }

  const availableGroupWidthMm = frontageMm - 2 * rules.minExternalClearanceMm;
  if (availableGroupWidthMm < rules.minDrawerWidthMm - EPSILON) {
    return invalid(
      'no-compliant-drawer-layout',
      'No equal-width drawer arrangement fits with at least 60 mm end clearances, ' +
        '120 mm gaps and 800–1200 mm fronts.',
      { frontageMm }
    );
  }

  let drawerCount = Math.max(1, Math.ceil((
    availableGroupWidthMm + rules.betweenDrawersMm - EPSILON
  ) / (rules.maxDrawerWidthMm + rules.betweenDrawersMm)));
  while (drawerCount > 1) {
    const minimumGroupWidthMm = drawerCount * rules.minDrawerWidthMm +
      (drawerCount - 1) * rules.betweenDrawersMm;
    if (minimumGroupWidthMm <= availableGroupWidthMm + EPSILON) break;
    drawerCount -= 1;
  }

  const gapsWidthMm = (drawerCount - 1) * rules.betweenDrawersMm;
  const maximumGroupWidthMm = drawerCount * rules.maxDrawerWidthMm + gapsWidthMm;
  const groupWidthMm = Math.min(availableGroupWidthMm, maximumGroupWidthMm);
  const drawerWidthMm = (groupWidthMm - gapsWidthMm) / drawerCount;
  if (drawerWidthMm < rules.minDrawerWidthMm - EPSILON) {
    return invalid(
      'no-compliant-drawer-layout',
      'No equal-width drawer arrangement fits with at least 60 mm end clearances, ' +
        '120 mm gaps and 800–1200 mm fronts.',
      { frontageMm }
    );
  }
  const externalEndClearanceMm = (frontageMm - groupWidthMm) / 2;
  const centresFromFrontageStartMm = Array.from({ length: drawerCount }, (_, index) => (
    externalEndClearanceMm + drawerWidthMm / 2 +
    index * (drawerWidthMm + rules.betweenDrawersMm)
  ));

  return {
    valid: true,
    code: 'supported',
    frontageMm,
    drawerCount,
    drawerWidthMm,
    drawerFrontHeightMm: rules.drawerFrontHeightMm,
    groupWidthMm,
    groupCentreMm: frontageMm / 2,
    externalEndClearanceMm,
    cornerEndClearanceMm: null,
    minimumEndClearanceMm: rules.minExternalClearanceMm,
    betweenDrawersMm: rules.betweenDrawersMm,
    centresFromFrontageStartMm,
    centresFromRunCentreMm: centresFromFrontageStartMm.map((value) => value - frontageMm / 2),
    manufacturingCornerClearanceMm: null,
    engineeringPreview: false,
    message: `${drawerCount} centred drawer${drawerCount === 1 ? '' : 's'}, ` +
      `${drawerWidthMm.toFixed(1)} mm wide, with ` +
      `${externalEndClearanceMm.toFixed(1)} mm equal end clearances.`
  };
}

/**
 * L/U runs use a trial corner setback as a minimum. Remaining frontage is
 * shared equally at both ends after fronts reach their 1200 mm maximum.
 * This is geometric feasibility only; corner manufacture is not approved.
 */
export function solveRichmondCornerDrawerRun(frontageMm, trialCornerSetbackMm) {
  const rules = RICHMOND_DRAWER_RULES;
  if (!finitePositive(frontageMm)) {
    return invalid('invalid-frontage', 'Main visible frontage must be a positive number.');
  }
  if (trialCornerSetbackMm === null || trialCornerSetbackMm === undefined ||
      trialCornerSetbackMm === '') {
    return invalid(
      'corner-setback-unset',
      'A trial corner setback is required for engineering calculation.',
      { frontageMm, manufacturingCornerClearanceMm: null }
    );
  }
  if (!Number.isFinite(trialCornerSetbackMm) || trialCornerSetbackMm < 0) {
    return invalid(
      'invalid-corner-setback',
      'Trial corner setback must be a non-negative number.',
      { frontageMm, manufacturingCornerClearanceMm: null }
    );
  }

  const minimumEndClearanceMm = Math.max(
    rules.minExternalClearanceMm,
    rules.minGeometricCornerSetbackMm,
    trialCornerSetbackMm
  );
  const availableGroupWidthMm = frontageMm - 2 * minimumEndClearanceMm;
  if (availableGroupWidthMm < rules.minDrawerWidthMm - EPSILON) {
    return invalid(
      'no-compliant-drawer-layout',
      `Main visible frontage cannot fit an 800–1200 mm front while keeping ` +
        `at least ${minimumEndClearanceMm.toFixed(1)} mm at both ends.`,
      { frontageMm, minimumEndClearanceMm, manufacturingCornerClearanceMm: null }
    );
  }

  let drawerCount = Math.max(1, Math.ceil((
    availableGroupWidthMm + rules.betweenDrawersMm - EPSILON
  ) / (rules.maxDrawerWidthMm + rules.betweenDrawersMm)));

  while (drawerCount > 1) {
    const minimumGroupWidthMm = drawerCount * rules.minDrawerWidthMm +
      (drawerCount - 1) * rules.betweenDrawersMm;
    if (minimumGroupWidthMm <= availableGroupWidthMm + EPSILON) break;
    drawerCount -= 1;
  }

  const gapsWidthMm = (drawerCount - 1) * rules.betweenDrawersMm;
  const maximumGroupWidthMm = drawerCount * rules.maxDrawerWidthMm + gapsWidthMm;
  const groupWidthMm = Math.min(availableGroupWidthMm, maximumGroupWidthMm);
  const drawerWidthMm = (groupWidthMm - gapsWidthMm) / drawerCount;
  if (drawerWidthMm < rules.minDrawerWidthMm - EPSILON) {
    return invalid(
      'no-compliant-drawer-layout',
      'Main visible frontage cannot fit equal 800–1200 mm fronts with 120 mm gaps.',
      { frontageMm, minimumEndClearanceMm, manufacturingCornerClearanceMm: null }
    );
  }

  const externalEndClearanceMm = (frontageMm - groupWidthMm) / 2;
  const centresFromFrontageStartMm = Array.from({ length: drawerCount }, (_, index) => (
    externalEndClearanceMm + drawerWidthMm / 2 +
    index * (drawerWidthMm + rules.betweenDrawersMm)
  ));

  return {
    valid: true,
    code: 'engineering-preview',
    frontageMm,
    trialCornerSetbackMm,
    minimumEndClearanceMm,
    drawerCount,
    drawerWidthMm,
    drawerFrontHeightMm: rules.drawerFrontHeightMm,
    groupWidthMm,
    groupCentreMm: frontageMm / 2,
    externalEndClearanceMm,
    cornerEndClearanceMm: externalEndClearanceMm,
    betweenDrawersMm: rules.betweenDrawersMm,
    centresFromFrontageStartMm,
    centresFromRunCentreMm: centresFromFrontageStartMm.map((value) => value - frontageMm / 2),
    manufacturingCornerClearanceMm: null,
    engineeringPreview: true,
    message: `${drawerCount} centred engineering-preview drawer` +
      `${drawerCount === 1 ? '' : 's'}, ${drawerWidthMm.toFixed(1)} mm wide, with ` +
      `${externalEndClearanceMm.toFixed(1)} mm equal end margins. ` +
      'Manufacturing corner clearance is not approved.'
  };
}

/**
 * U-shaped runs have two independently entered engineering setbacks. The
 * larger value is applied symmetrically so the drawer group remains centred
 * between the physical corner regions. This is geometric feasibility only.
 */
export function solveRichmondUShapeDrawerRun(
  frontageMm,
  trialLeftCornerSetbackMm,
  trialRightCornerSetbackMm
) {
  if (!finitePositive(frontageMm)) {
    return invalid('invalid-frontage', 'Main visible frontage must be a positive number.');
  }
  if (trialLeftCornerSetbackMm === null || trialLeftCornerSetbackMm === undefined ||
      trialLeftCornerSetbackMm === '') {
    return invalid(
      'left-corner-setback-unset',
      'A trial left corner setback is required for engineering calculation.',
      { frontageMm, manufacturingCornerClearanceMm: null }
    );
  }
  if (trialRightCornerSetbackMm === null || trialRightCornerSetbackMm === undefined ||
      trialRightCornerSetbackMm === '') {
    return invalid(
      'right-corner-setback-unset',
      'A trial right corner setback is required for engineering calculation.',
      { frontageMm, manufacturingCornerClearanceMm: null }
    );
  }
  if (!Number.isFinite(trialLeftCornerSetbackMm) || trialLeftCornerSetbackMm < 0) {
    return invalid(
      'invalid-left-corner-setback',
      'Trial left corner setback must be a non-negative number.',
      { frontageMm, manufacturingCornerClearanceMm: null }
    );
  }
  if (!Number.isFinite(trialRightCornerSetbackMm) || trialRightCornerSetbackMm < 0) {
    return invalid(
      'invalid-right-corner-setback',
      'Trial right corner setback must be a non-negative number.',
      { frontageMm, manufacturingCornerClearanceMm: null }
    );
  }

  const symmetricMinimumMm = Math.max(
    RICHMOND_DRAWER_RULES.minExternalClearanceMm,
    RICHMOND_DRAWER_RULES.minGeometricCornerSetbackMm,
    trialLeftCornerSetbackMm,
    trialRightCornerSetbackMm
  );
  const run = solveRichmondCornerDrawerRun(frontageMm, symmetricMinimumMm);
  if (!run.valid) {
    return {
      ...run,
      trialCornerSetbackMm: undefined,
      trialLeftCornerSetbackMm,
      trialRightCornerSetbackMm,
      symmetricMinimumMm
    };
  }
  return {
    ...run,
    trialCornerSetbackMm: undefined,
    trialLeftCornerSetbackMm,
    trialRightCornerSetbackMm,
    symmetricMinimumMm,
    message: `${run.drawerCount} centred U-shaped engineering-preview drawer` +
      `${run.drawerCount === 1 ? '' : 's'}, ${run.drawerWidthMm.toFixed(1)} mm wide, with ` +
      `${run.externalEndClearanceMm.toFixed(1)} mm equal end margins. ` +
      'Manufacturing corner clearance is not approved.'
  };
}

export function calculateRichmondDrawerPlacement({
  layout,
  lengthMm,
  depthMm,
  trialCornerSetbackMm = null,
  trialLeftCornerSetbackMm = null,
  trialRightCornerSetbackMm = null,
  cornerHand = null,
  drawerMainEnabled = true,
  drawerMainEndEnabled = false,
  drawerReturnEndEnabled = false,
  drawerLeftEndEnabled = false,
  drawerRightEndEnabled = false
}) {
  const openingDirections = validateRichmondDrawerOpeningDirections({
    layout,
    cornerHand,
    drawerMainEnabled,
    drawerMainEndEnabled,
    drawerReturnEndEnabled,
    drawerLeftEndEnabled,
    drawerRightEndEnabled
  });
  if (!openingDirections.valid) {
    return {
      ...openingDirections,
      returnDrawers: drawerLeftEndEnabled || drawerRightEndEnabled,
      manufacturingApproved: layout === 'straight' ? null : false
    };
  }
  const frontage = richmondVisibleFrontageMm({ layout, lengthMm, depthMm });
  if (!frontage.valid) return frontage;

  const run = layout === 'straight'
    ? solveRichmondStraightDrawerRun(frontage.frontageMm)
    : layout === 'corner'
      ? solveRichmondCornerDrawerRun(frontage.frontageMm, trialCornerSetbackMm)
      : solveRichmondUShapeDrawerRun(
        frontage.frontageMm,
        trialLeftCornerSetbackMm,
        trialRightCornerSetbackMm
      );
  if (!run.valid) {
    return { ...run, layout, mainFrontageMm: frontage.frontageMm, returnDrawers: false };
  }

  return {
    ...run,
    layout,
    mainFrontageMm: frontage.frontageMm,
    selectedRuns: [
      drawerMainEnabled ? 'main' : null,
      layout === 'corner' && drawerMainEndEnabled ? 'main-end' : null,
      layout === 'corner' && drawerReturnEndEnabled ? 'return-end' : null,
      layout === 'u-shaped' && drawerLeftEndEnabled ? 'left-end' : null,
      layout === 'u-shaped' && drawerRightEndEnabled ? 'right-end' : null
    ].filter(Boolean),
    returnDrawers: layout === 'corner'
      ? drawerReturnEndEnabled
      : drawerLeftEndEnabled || drawerRightEndEnabled,
    manufacturingApproved: layout === 'straight' ? null : false
  };
}

