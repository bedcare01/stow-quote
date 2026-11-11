/**
 * Cross-layout drawer opening-direction safety.
 *
 * The A-facing main frontage and the terminal faces of the returns are
 * orthogonal, spatially separate faces. Their checkboxes are therefore
 * independent. Actual cavity overlap is checked against transformed model
 * geometry by the compositor; selection labels alone never imply a conflict.
 */

const SUPPORTED_MULTI_END_LAYOUTS = new Set(['corner', 'u-shaped']);

function selectionResult(selection, extra = {}) {
  return {
    drawerMainEnabled: selection.drawerMainEnabled === true,
    drawerMainEndEnabled: selection.drawerMainEndEnabled === true,
    drawerReturnEndEnabled: selection.drawerReturnEndEnabled === true,
    drawerLeftEndEnabled: selection.drawerLeftEndEnabled === true,
    drawerRightEndEnabled: selection.drawerRightEndEnabled === true,
    ...extra
  };
}

export function validateRichmondDrawerOpeningDirections({
  layout,
  cornerHand = null,
  drawerMainEnabled = true,
  drawerMainEndEnabled = false,
  drawerReturnEndEnabled = false,
  drawerLeftEndEnabled = false,
  drawerRightEndEnabled = false
} = {}) {
  const selection = {
    drawerMainEnabled,
    drawerMainEndEnabled,
    drawerReturnEndEnabled,
    drawerLeftEndEnabled,
    drawerRightEndEnabled
  };
  if (!SUPPORTED_MULTI_END_LAYOUTS.has(layout)) {
    return selectionResult(selection, {
      valid: true,
      code: 'opening-directions-not-applicable',
      layout,
      cornerHand,
      conflictingEnds: [],
      message: ''
    });
  }

  // An L main-frontage cavity and its terminal cavity both cut BASE_MAIN.
  // They are distinct visible faces, but their 60 mm-deep openings meet at
  // the same physical end of that base and are not a supported construction.
  // Return End remains independent because it cuts BASE_RETURN at the far end.
  if (layout === 'corner' && drawerMainEnabled && drawerMainEndEnabled) {
    return selectionResult(selection, {
      valid: false,
      code: 'conflicting-main-frontage-main-end',
      layout,
      cornerHand,
      conflictingEnds: ['main-end'],
      independentFaces: false,
      message: 'Main End is unavailable while Main Frontage drawers are selected because both openings cut the same main base.'
    });
  }

  return selectionResult(selection, {
    valid: true,
    code: 'opening-directions-valid',
    layout,
    cornerHand,
    conflictingEnds: [],
    independentFaces: true,
    message: ''
  });
}

/**
 * UI helper retained as a single normalisation boundary. Independent
 * orthogonal faces are preserved exactly as selected; geometry validation
 * remains mandatory at the compositor boundary.
 */
export function resolveRichmondDrawerOpeningDirections(selection, changedLocation) {
  const resolved = selectionResult(selection);
  const deselected = [];
  let message = '';
  if (selection.layout === 'corner' && resolved.drawerMainEnabled && resolved.drawerMainEndEnabled) {
    // The UI makes Main End unavailable while Main Frontage is on. If state
    // arrives from an older/saved configuration, normalise only when the user
    // has explicitly changed Main Frontage; all other stale state fails closed
    // in validation and compositor preflight.
    if (changedLocation === 'main') {
      resolved.drawerMainEndEnabled = false;
      deselected.push('main-end');
      message = 'Main End was removed because it shares BASE_MAIN with Main Frontage drawers.';
    }
  }
  const validation = validateRichmondDrawerOpeningDirections({ ...selection, ...resolved });
  return {
    ...resolved,
    valid: validation.valid,
    code: validation.code,
    conflictingEnds: validation.conflictingEnds,
    changed: deselected.length > 0,
    changedLocation,
    deselected,
    message: message || validation.message
  };
}

