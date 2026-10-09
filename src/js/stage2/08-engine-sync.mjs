
import { getEffectiveValue, updateElement, getElement, replaceLayoutNode } from '../../../lib/ui-engine/registry.mjs';
import { refreshInspector } from '../../../lib/ui-engine/inspector.mjs';

function parseFloatSafe(v) { const n = parseFloat(v); return Number.isNaN(n) ? undefined : n; }
function blendedVw(v) { return (v && typeof v === 'object') ? v.vwValue : undefined; }
function blendedPx(v) { return (v && typeof v === 'object') ? v.pxValue : undefined; }
function gapX(v) { return (v && typeof v === 'object') ? parseFloatSafe(v.x) : undefined; }
function gapY(v) { return (v && typeof v === 'object') ? parseFloatSafe(v.y) : undefined; }
function identity(v) { return v; }

// Two-way sync between engine elements and Clicko's cssVars, driven by the Inspector's
// selected element: STAGE2_SYNC_MAP maps engine field -> cssVar; Inspector edits push to
// cssVars (MutationObserver), real dev-panel edits pull into the engine (applyActiveVars hook).

// When a synced cssVar changes, also update the matching REAL dev-panel control's DOM value.
// Uses CSS_VAR_SLIDER_MAP (classic-script global; top-level declarations there are visible to
// modules) inverted, plus the align/valign <select>s it doesn't cover.
const CSS_VAR_TO_REAL_SLIDER = {};
if (typeof CSS_VAR_SLIDER_MAP === 'object') {
    Object.keys(CSS_VAR_SLIDER_MAP).forEach((sliderId) => {
        CSS_VAR_TO_REAL_SLIDER[CSS_VAR_SLIDER_MAP[sliderId]] = sliderId;
    });
}
const CSS_VAR_TO_REAL_ALIGN_SELECT = {
    '--high-score-text-align': 'selectHighScoreTextAlign', '--high-score-text-valign': 'selectHighScoreTextValign',
    '--start-text-align': 'selectStartTextAlign', '--start-text-valign': 'selectStartTextValign',
    '--round-text-align': 'selectRoundTextAlign', '--round-text-valign': 'selectRoundTextValign',
    '--speed-text-align': 'selectSpeedTextAlign', '--speed-text-valign': 'selectSpeedTextValign',
    '--ms-per-click-text-align': 'selectMsPerClickTextAlign', '--ms-per-click-text-valign': 'selectMsPerClickTextValign',
};
function stage2ReflectToRealControl(cssVar, value) {
    const sliderId = CSS_VAR_TO_REAL_SLIDER[cssVar];
    if (sliderId) {
        const el = document.getElementById(sliderId);
        if (el) {
            el.value = value;
            const valueEl = document.getElementById(sliderId.replace(/^slider/, 'value'));
            if (valueEl) valueEl.textContent = value;
        }
        return;
    }
    const selectId = CSS_VAR_TO_REAL_ALIGN_SELECT[cssVar];
    if (selectId) {
        const el = document.getElementById(selectId);
        if (el) el.value = value;
    }
}

const STAGE2_STANDARD_ELEMENTS = [
    { key: 'HighScore', xVar: '--high-score-x-offset-vw', yVar: '--high-score-y-offset-vh', alignVar: '--high-score-text-align', valignVar: '--high-score-text-valign', fontVwVar: '--high-score-font-size-vw' },
    { key: 'Start', xVar: '--text-x-offset-vw', yVar: '--text-y-offset-vh', alignVar: '--start-text-align', valignVar: '--start-text-valign', fontVwVar: '--text-font-size-vw' },
    { key: 'RoundText', xVar: '--round-dock-x-offset-vw', yVar: '--round-dock-y-offset-vh', alignVar: '--round-text-align', valignVar: '--round-text-valign', fontVwVar: '--round-font-size-vw' },
    { key: 'Speed', xVar: '--speed-x-offset-vw', yVar: '--speed-y-offset-vh', alignVar: '--speed-text-align', valignVar: '--speed-text-valign', fontVwVar: '--speed-font-size-vw' },
    { key: 'MsPerClick', xVar: '--ms-per-click-x-offset-vw', yVar: '--ms-per-click-y-offset-vh', alignVar: '--ms-per-click-text-align', valignVar: '--ms-per-click-text-valign', fontVwVar: '--ms-per-click-font-size-vw' },
];

const STAGE2_SYNC_MAP = [];
STAGE2_STANDARD_ELEMENTS.forEach((cfg) => {
    const posId = 'stage2' + cfg.key + 'X';
    const fontId = 'stage2' + cfg.key + 'FontSize';
    STAGE2_SYNC_MAP.push(
        { id: posId, field: 'offsetX', cssVar: cfg.xVar, extract: parseFloatSafe },
        { id: posId, field: 'offsetY', cssVar: cfg.yVar, extract: parseFloatSafe },
        { id: posId, field: 'anchorH', cssVar: cfg.alignVar, extract: identity },
        { id: posId, field: 'anchorV', cssVar: cfg.valignVar, extract: identity },
        { id: fontId, field: 'widthValue', cssVar: cfg.fontVwVar, extract: blendedVw },
    );
});
STAGE2_SYNC_MAP.push(
    { id: 'stage2RoundBreakdownTitle', field: 'widthValue', cssVar: '--round-breakdown-title-font-size-px', extract: blendedPx },
    { id: 'stage2RoundBreakdownData', field: 'widthValue', cssVar: '--round-breakdown-data-font-size-px', extract: blendedPx },
    { id: 'stage2RoundBreakdownX', field: 'offsetX', cssVar: '--round-breakdown-left-vw', extract: parseFloatSafe },
    { id: 'stage2RoundBreakdownX', field: 'offsetY', cssVar: '--round-breakdown-top-vh', extract: parseFloatSafe },
    { id: 'stage2RoundBreakdownSize', field: 'widthValue', cssVar: '--round-breakdown-width-vw', extract: parseFloatSafe },
    { id: 'stage2RoundBreakdownSize', field: 'heightValue', cssVar: '--round-breakdown-height-vh', extract: parseFloatSafe },
    { id: 'stage2TargetNumberX', field: 'offsetX', cssVar: '--target-number-x-offset-vw', extract: parseFloatSafe },
    { id: 'stage2TargetNumberX', field: 'offsetY', cssVar: '--target-number-y-offset-vh', extract: parseFloatSafe },
    { id: 'stage2TargetNumberFontSize', field: 'widthValue', cssVar: '--target-number-font-size-vw', extract: blendedVw },
    { id: 'stage2TargetSuffix', field: 'gap', cssVar: '--target-suffix-x-offset-vw', extract: gapX },
    { id: 'stage2TargetSuffix', field: 'gap', cssVar: '--target-suffix-y-offset-vh', extract: gapY },
    // Anchor-mode counterparts: if Suffix is switched to 'anchor', 'gap' no longer applies
    // (skipped via try/catch) and these become live. They use separate *-anchor-offset cssVars
    // so the relative-mode gap vars above keep their own tuning.
    { id: 'stage2TargetSuffix', field: 'offsetX', cssVar: '--target-suffix-x-anchor-offset-vw', extract: parseFloatSafe },
    { id: 'stage2TargetSuffix', field: 'offsetY', cssVar: '--target-suffix-y-anchor-offset-vh', extract: parseFloatSafe },
    { id: 'stage2TargetSuffixFontSize', field: 'widthValue', cssVar: '--target-suffix-font-size-vw', extract: blendedVw },
    { id: 'stage2TargetPrefixX', field: 'offsetX', cssVar: '--target-prefix-x-offset-vw', extract: parseFloatSafe },
    { id: 'stage2TargetPrefixY', field: 'gap', cssVar: '--target-prefix-y-offset-vh', extract: gapY },
    // Anchor-mode counterpart for Prefix Y only; Prefix X is never mode-dependent.
    { id: 'stage2TargetPrefixY', field: 'offsetY', cssVar: '--target-prefix-y-anchor-offset-vh', extract: parseFloatSafe },
    { id: 'stage2TargetPrefixFontSize', field: 'widthValue', cssVar: '--target-prefix-font-size-vw', extract: blendedVw },
    { id: 'stage2ButtonX', field: 'offsetX', cssVar: '--button-x-offset-vw', extract: parseFloatSafe },
    { id: 'stage2ButtonX', field: 'offsetY', cssVar: '--button-y-offset-vh', extract: parseFloatSafe },
    { id: 'stage2ButtonDiameter', field: 'widthPreferred', cssVar: '--button-diameter-vw', extract: parseFloatSafe },
    { id: 'stage2ButtonDiameter', field: 'widthMin', cssVar: '--button-min-diameter-px', extract: parseFloatSafe },
);

// Real dev-panel rows to show per position.mode; rows for other modes get hidden. Most elements
// only have anchor-mode cssVar backing, so their X/Y rows hide under any other mode (editing
// would be inert). Target Suffix, Prefix Y and Round Breakdown support both anchor and relative.
const STAGE2_MODE_ROW_MAP = {
    stage2HighScoreX: { anchor: ['sliderHighScoreX', 'sliderHighScoreY'] },
    stage2StartX: { anchor: ['sliderTextX', 'sliderTextY'] },
    stage2RoundTextX: { anchor: ['sliderRoundDockX', 'sliderRoundDockY'] },
    stage2SpeedX: { anchor: ['sliderSpeedX', 'sliderSpeedY'] },
    stage2MsPerClickX: { anchor: ['sliderMsPerClickX', 'sliderMsPerClickY'] },
    // offsetX/offsetY don't exist in relative mode, so both the real and Stage 2 offset sliders
    // are anchor-only; the Gap sliders replace them in relative mode.
    stage2RoundBreakdownX: {
        anchor: ['sliderRoundBreakdownX', 'sliderRoundBreakdownY', 'sliderStage2RoundBreakdownX', 'sliderStage2RoundBreakdownY'],
        relative: ['sliderStage2RoundBreakdownGapX', 'sliderStage2RoundBreakdownGapY'],
    },
    stage2TargetNumberX: { anchor: ['sliderTargetNumberXOffset', 'sliderTargetNumberYOffset'] },
    stage2ButtonX: { anchor: ['sliderButtonX', 'sliderButtonY'] },
    stage2TargetSuffix: { anchor: ['sliderTargetSuffixXAnchorOffset', 'sliderTargetSuffixYAnchorOffset'], relative: ['sliderTargetSuffixXOffset', 'sliderTargetSuffixYOffset'] },
    stage2TargetPrefixY: { anchor: ['sliderTargetPrefixYAnchorOffset'], relative: ['sliderTargetPrefixYOffset'] },
};
// Mode assumed when stage2EngineOverrides has nothing saved for the element; matches each
// element's registered mode.
const STAGE2_DEFAULT_MODE = {
    stage2HighScoreX: 'anchor', stage2StartX: 'anchor', stage2RoundTextX: 'anchor',
    stage2SpeedX: 'anchor', stage2MsPerClickX: 'anchor', stage2RoundBreakdownX: 'anchor',
    stage2TargetNumberX: 'anchor', stage2ButtonX: 'anchor',
    stage2TargetSuffix: 'relative', stage2TargetPrefixY: 'relative',
};
function stage2CurrentSavedMode(elementId) {
    const saved = stage2EngineOverrides[elementId];
    const fallback = STAGE2_DEFAULT_MODE[elementId] || 'anchor';
    return (saved && saved.position && saved.position.mode) ? saved.position.mode : fallback;
}
function stage2SyncRowVisibility(elementId) {
    const modeMap = STAGE2_MODE_ROW_MAP[elementId];
    if (!modeMap) return;
    const currentMode = stage2CurrentSavedMode(elementId);
    Object.keys(modeMap).forEach((modeKey) => {
        const shouldShow = modeKey === currentMode;
        modeMap[modeKey].forEach((rowId) => {
            const controlEl = document.getElementById(rowId);
            if (!controlEl) return;
            const row = controlEl.closest('.dev-row');
            if (!row) return;
            row.classList.toggle('dev-row-hidden-by-mode', !shouldShow);
        });
    });
}
function stage2SyncAllRowVisibility() {
    Object.keys(STAGE2_MODE_ROW_MAP).forEach(stage2SyncRowVisibility);
}
// Exposed on window: the classic script (applyActiveVars()) can't see module declarations.
window.stage2SyncAllRowVisibility = stage2SyncAllRowVisibility;
// Run once now: applyActiveVars() fires during bootstrap BEFORE this deferred module loads and
// may not fire again, so the hook alone can't guarantee the initial visibility state.
stage2SyncAllRowVisibility();

// Elements register at module load, but loadSettings() resolves async later, so engine values
// can be stale. Therefore: (1) only sync the element currently selected in the Inspector;
// (2) prime-before-push - on first selection, pull cssVars INTO the engine and skip pushing,
// so only genuine Inspector edits are pushed back out.
let stage2LastPrimedId = null;

function stage2PrimeEntry(entry) {
    const raw = cssVars[entry.cssVar];
    if (raw === undefined) return;
    try {
        if (entry.field === 'anchorH') {
            updateElement(entry.id, { position: { horizontal: { anchor: raw } } });
        } else if (entry.field === 'anchorV') {
            updateElement(entry.id, { position: { vertical: { anchor: raw } } });
        } else if (entry.field === 'offsetX' || entry.field === 'offsetY') {
            const current = getEffectiveValue(entry.id, entry.field, 'base').value;
            const unitMatch = typeof current === 'string' ? /[a-z%]+$/i.exec(current) : null;
            const unit = unitMatch ? unitMatch[0] : (entry.field === 'offsetX' ? 'vw' : 'vh');
            const axis = entry.field === 'offsetX' ? 'horizontal' : 'vertical';
            updateElement(entry.id, { position: { [axis]: { offset: raw + unit } } });
        } else if (entry.field === 'widthValue') {
            const current = getEffectiveValue(entry.id, 'widthValue', 'base').value;
            if (current && typeof current === 'object') {
                const key = entry.extract === blendedPx ? 'pxValue' : 'vwValue';
                updateElement(entry.id, { size: { width: { value: { ...current, [key]: raw } } } });
            } else {
                updateElement(entry.id, { size: { width: { value: raw + 'vw' } } });
            }
        } else if (entry.field === 'heightValue') {
            updateElement(entry.id, { size: { height: { value: raw + 'vh' } } });
        } else if (entry.field === 'gap') {
            const current = getEffectiveValue(entry.id, 'gap', 'base').value;
            const axis = entry.extract === gapX ? 'x' : 'y';
            updateElement(entry.id, { position: { gap: { ...(current && typeof current === 'object' ? current : {}), [axis]: raw + 'px' } } });
        } else if (entry.field === 'widthPreferred') {
            updateElement(entry.id, { size: { width: { preferred: raw + 'vmin' } } });
        } else if (entry.field === 'widthMin') {
            updateElement(entry.id, { size: { width: { min: raw + 'px' } } });
        }
    } catch (e) {
        // Field doesn't exist under the current mode (e.g. offsetX in relative) - skip.
    }
}

// Resolve the selected element id from the picker row (found by its label) and its LAST
// select: the first select is the Object dropdown, whose value is a "group:<name>" token, not
// an element id; the last is the Property select (or the lone select when ungrouped).
function stage2GetSelectedElementId() {
    const mount = document.getElementById('stage2InspectorMount');
    if (!mount) return '';
    const rows = mount.querySelectorAll(':scope > .ui-inspector-row');
    for (const row of rows) {
        const label = row.querySelector('.ui-inspector-label');
        if (label && (label.textContent === 'SELECT OBJECT' || label.textContent === 'SELECT ELEMENT')) {
            const selects = row.querySelectorAll('select.ui-inspector-select');
            return selects.length ? selects[selects.length - 1].value : '';
        }
    }
    return '';
}

function stage2SyncEngineToClicko() {
    const selectedId = stage2GetSelectedElementId();
    if (!selectedId) { stage2LastPrimedId = null; return; } // nothing selected - never sync anything

    const relevantEntries = STAGE2_SYNC_MAP.filter((e) => e.id === selectedId);
    if (relevantEntries.length === 0) return; // selected element has no mapped cssVars

    if (selectedId !== stage2LastPrimedId) {
        // Fresh selection: prime from cssVars, push nothing. First restore the saved mode
        // (stage2EngineOverrides) so field priming lands on the right mode; replaceLayoutNode()
        // not updateElement(), since a mode switch needs a fresh skeleton, not a deep merge.
        const savedStructural = stage2EngineOverrides[selectedId];
        if (savedStructural) {
            try {
                if (savedStructural.position) replaceLayoutNode(selectedId, ['position'], savedStructural.position);
                if (savedStructural.size) replaceLayoutNode(selectedId, ['size'], savedStructural.size);
            } catch (e) {
                // Saved override no longer fits this element's registration - skip.
            }
        }
        relevantEntries.forEach(stage2PrimeEntry);
        stage2LastPrimedId = selectedId;
        stage2SyncRowVisibility(selectedId);
        // Inspector doesn't notice external updateElement() calls, so redraw. No observer loop:
        // the next firing takes the push branch and finds nothing changed.
        refreshInspector();
        return;
    }

    let anyChanged = false;
    for (const entry of relevantEntries) {
        let result;
        try {
            result = getEffectiveValue(entry.id, entry.field, 'base');
        } catch (e) {
            continue; // field doesn't apply under the current mode - skip, not an error
        }
        if (!result) continue;
        const extracted = entry.extract(result.value);
        if (extracted === undefined || (typeof extracted === 'number' && Number.isNaN(extracted))) continue;
        if (cssVars[entry.cssVar] !== extracted) {
            cssVars[entry.cssVar] = extracted;
            stage2ReflectToRealControl(entry.cssVar, extracted);
            anyChanged = true;
        }
    }
    if (anyChanged) applyActiveVars();

    // Capture position/size mode (no cssVar of its own) into stage2EngineOverrides, which
    // Save/Copy/Undo already persist. A pure mode switch changes no cssVar, so force
    // applyActiveVars() - updateTargetAnchoredPositions() branches on this mode.
    const liveEl = getElement(selectedId);
    if (liveEl && liveEl.layout) {
        const liveStructural = { position: liveEl.layout.position, size: liveEl.layout.size };
        const savedJson = JSON.stringify(stage2EngineOverrides[selectedId] || null);
        if (JSON.stringify(liveStructural) !== savedJson) {
            stage2EngineOverrides[selectedId] = JSON.parse(JSON.stringify(liveStructural));
            stage2SyncRowVisibility(selectedId);
            if (!anyChanged) applyActiveVars(); // force re-resolve on a pure mode switch
        }
    }
}

// Reverse sync: real dev-panel edit -> engine, for the selected element only (others re-prime on
// selection). Without it the stale engine value could be pushed back out and revert the edit.
function stage2SyncClickoToEngine() {
    const selectedId = stage2GetSelectedElementId();
    if (!selectedId || selectedId !== stage2LastPrimedId) return; // not primed yet - prime-on-select covers it
    const relevantEntries = STAGE2_SYNC_MAP.filter((e) => e.id === selectedId);
    if (relevantEntries.length === 0) return;
    let anyRestored = false;
    for (const entry of relevantEntries) {
        const realValue = cssVars[entry.cssVar];
        if (realValue === undefined) continue;
        let currentResolved;
        try {
            currentResolved = entry.extract(getEffectiveValue(entry.id, entry.field, 'base').value);
        } catch (e) {
            continue; // field doesn't apply under the current mode
        }
        if (currentResolved === realValue) continue;
        stage2PrimeEntry(entry);
        anyRestored = true;
    }
    if (anyRestored) refreshInspector(); // keep the Inspector's displayed value live
}
// Exposed on window for applyActiveVars() (classic script; called after every real control edit).
window.stage2SyncClickoToEngine = stage2SyncClickoToEngine;

const stage2InspectorMountEl = document.getElementById('stage2InspectorMount');
if (stage2InspectorMountEl) {
    const observer = new MutationObserver(() => stage2SyncEngineToClicko());
    observer.observe(stage2InspectorMountEl, { childList: true, subtree: true, attributes: true, characterData: true });
}
