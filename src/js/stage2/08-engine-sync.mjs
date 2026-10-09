
import { getEffectiveValue, updateElement, getElement, replaceLayoutNode } from '../../../lib/ui-engine/registry.mjs';
import { refreshInspector } from '../../../lib/ui-engine/inspector.mjs';

function parseFloatSafe(v) { const n = parseFloat(v); return Number.isNaN(n) ? undefined : n; }
function blendedVw(v) { return (v && typeof v === 'object') ? v.vwValue : undefined; }
function blendedPx(v) { return (v && typeof v === 'object') ? v.pxValue : undefined; }
function gapX(v) { return (v && typeof v === 'object') ? parseFloatSafe(v.x) : undefined; }
function gapY(v) { return (v && typeof v === 'object') ? parseFloatSafe(v.y) : undefined; }
function identity(v) { return v; }

// ------------------------------------------------------------
// REGULAR-DEV-PANEL REFLECTION (2026-09-20) - per direct follow-up:
// "when i change the anchor type or whatever in the ui inspector, i
// want the sliders in the regular dev panel to reflect that
// change. so the object itself wont move, but the x offset and y
// offset will". Investigated live first: the object genuinely
// CANNOT move from an Inspector-only anchor change today - proven
// by direct getBoundingClientRect() checks before/after flipping
// stage2ButtonX's (a real positional element, unlike the
// align/valign-repurposed anchor on the STANDARD_ELEMENTS) anchor
// from center to left, with offsetX and the button's own rect.left
// both provably unchanged (STAGE2_SYNC_MAP has no anchorH/anchorV
// entry for Button at all, so an anchor-only edit is a pure no-op
// on Clicko's real rendering). The REAL gap, also confirmed live
// on High Score: stage2SyncEngineToClicko() below already wrote
// the new value into cssVars/applyActiveVars() correctly, but
// never touched the matching REAL dev-panel control's own DOM
// value - e.g. changing High Score's anchor to 'left' correctly
// flipped cssVars['--high-score-text-align'] to 'left' (and the
// rendered CSS with it), while
// document.getElementById('selectHighScoreTextAlign').value
// stayed stuck on the stale 'center' it had at page load. This
// block closes that gap generically for every STAGE2_SYNC_MAP
// entry (offsets, font sizes, round-breakdown box, align/valign
// selects) by reusing CSS_VAR_SLIDER_MAP (defined much earlier,
// ~line 14052, as the real dev panel's own desktop slider-id ->
// cssVar table) inverted once here, plus a small explicit table
// for the 10 align/valign <select> controls that
// CSS_VAR_SLIDER_MAP doesn't cover (select controls, not
// sliders). Confirmed CSS_VAR_SLIDER_MAP is visible from this
// module scope the same way cssVars/applyActiveVars already are -
// top-level const/let/function declarations in a classic <script>
// share the realm's global environment record with <script
// type="module"> blocks in the same document.
// ------------------------------------------------------------
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
    // Anchor-mode counterparts (2026-09-20, "big pass" request) -
    // Suffix's own mode can be switched to 'anchor' via the
    // Inspector (already generically possible - createUIElement()
    // never restricted this), in which case 'gap' no longer
    // applies (try/catch above already skips it silently) and
    // these 2 entries become the live ones instead. Both point at
    // NEW cssVars/real sliders (see CSS_VAR_SLIDER_MAP/the desktop
    // slider array above) - the existing gap entries above keep
    // pointing at the ORIGINAL, already-tuned relative-mode
    // sliders, untouched.
    { id: 'stage2TargetSuffix', field: 'offsetX', cssVar: '--target-suffix-x-anchor-offset-vw', extract: parseFloatSafe },
    { id: 'stage2TargetSuffix', field: 'offsetY', cssVar: '--target-suffix-y-anchor-offset-vh', extract: parseFloatSafe },
    { id: 'stage2TargetSuffixFontSize', field: 'widthValue', cssVar: '--target-suffix-font-size-vw', extract: blendedVw },
    { id: 'stage2TargetPrefixX', field: 'offsetX', cssVar: '--target-prefix-x-offset-vw', extract: parseFloatSafe },
    { id: 'stage2TargetPrefixY', field: 'gap', cssVar: '--target-prefix-y-offset-vh', extract: gapY },
    // Anchor-mode counterpart (2026-09-20) - same reasoning as
    // Suffix's above. Prefix's X (the entry directly above) has no
    // counterpart - it was never mode-dependent, see
    // #targetCountPrefix's own CSS comment - so only Y needs one.
    { id: 'stage2TargetPrefixY', field: 'offsetY', cssVar: '--target-prefix-y-anchor-offset-vh', extract: parseFloatSafe },
    { id: 'stage2TargetPrefixFontSize', field: 'widthValue', cssVar: '--target-prefix-font-size-vw', extract: blendedVw },
    { id: 'stage2ButtonX', field: 'offsetX', cssVar: '--button-x-offset-vw', extract: parseFloatSafe },
    { id: 'stage2ButtonX', field: 'offsetY', cssVar: '--button-y-offset-vh', extract: parseFloatSafe },
    { id: 'stage2ButtonDiameter', field: 'widthPreferred', cssVar: '--button-diameter-vw', extract: parseFloatSafe },
    { id: 'stage2ButtonDiameter', field: 'widthMin', cssVar: '--button-min-diameter-px', extract: parseFloatSafe },
);

// ------------------------------------------------------------
// REAL-ROW VISIBILITY BY MODE (2026-09-20, "big pass" - direct
// request: "if an object is set to anchor mode, only show the
// anchor mode relevant sliders. if its set to relative, only show
// the relative sliders... whatever i set the UI inspector settings
// to, I should have the relevant settings available", confirmed to
// apply to every object, not just Target Prefix). For the 8
// elements below that only ever had ONE real position.mode
// (anchor) wired up - their real X/Y sliders are hidden whenever
// the Inspector's own mode dropdown is switched to anything else
// (relative/fixed/absolute/flow), since none of those currently
// have real cssVar backing for them (editing them would be inert).
// Target Suffix and Target Prefix's Y each genuinely support BOTH
// anchor and relative (see the STAGE2_SYNC_MAP entries above and
// updateTargetAnchoredPositions()'s own comment) - their entry
// below lists BOTH mode's real rows, toggled between.
const STAGE2_MODE_ROW_MAP = {
    stage2HighScoreX: { anchor: ['sliderHighScoreX', 'sliderHighScoreY'] },
    stage2StartX: { anchor: ['sliderTextX', 'sliderTextY'] },
    stage2RoundTextX: { anchor: ['sliderRoundDockX', 'sliderRoundDockY'] },
    stage2SpeedX: { anchor: ['sliderSpeedX', 'sliderSpeedY'] },
    stage2MsPerClickX: { anchor: ['sliderMsPerClickX', 'sliderMsPerClickY'] },
    // 2026-09-23: relative entry added - Round Breakdown's own
    // Gap X/Y sliders (see applyRoundBreakdownPosition()'s own
    // relative-mode comment) - both the classic real sliders AND
    // the "Stage 2, engine-driven" X/Y Offset duplicates are
    // meaningless in relative mode (offsetX/offsetY don't exist on
    // a relative-mode element - see STAGE2_SYNC_MAP's own try/
    // catch skip for these 2 fields), so both now hide together
    // under 'anchor', matching the Gap sliders' own 'relative'
    // visibility exactly inverted.
    stage2RoundBreakdownX: {
        anchor: ['sliderRoundBreakdownX', 'sliderRoundBreakdownY', 'sliderStage2RoundBreakdownX', 'sliderStage2RoundBreakdownY'],
        relative: ['sliderStage2RoundBreakdownGapX', 'sliderStage2RoundBreakdownGapY'],
    },
    stage2TargetNumberX: { anchor: ['sliderTargetNumberXOffset', 'sliderTargetNumberYOffset'] },
    stage2ButtonX: { anchor: ['sliderButtonX', 'sliderButtonY'] },
    stage2TargetSuffix: { anchor: ['sliderTargetSuffixXAnchorOffset', 'sliderTargetSuffixYAnchorOffset'], relative: ['sliderTargetSuffixXOffset', 'sliderTargetSuffixYOffset'] },
    stage2TargetPrefixY: { anchor: ['sliderTargetPrefixYAnchorOffset'], relative: ['sliderTargetPrefixYOffset'] },
};
// Default mode used when nothing has ever been saved to
// stage2EngineOverrides for that element yet - matches each
// element's own real, original (pre-2026-09-20) behavior exactly,
// so a fresh page load with no overrides shows the SAME rows it
// always has.
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
// Bridged onto window - applyActiveVars() (classic script) has no
// direct visibility into this module's own top-level declarations,
// same reasoning as window.stage2SyncClickoToEngine above.
window.stage2SyncAllRowVisibility = stage2SyncAllRowVisibility;
// Also run once immediately, right here at module-load time - the
// window.applyActiveVars() hook alone isn't a reliable enough
// trigger for the INITIAL state (confirmed live: applyActiveVars()
// runs a couple of times synchronously during page bootstrap,
// BEFORE this deferred module has even executed once, so those
// early calls correctly no-op per their own typeof guard - but if
// nothing calls applyActiveVars() again afterward (e.g. real
// settings load resolves without incident, or a local/offline test
// context with no working settings fetch at all), the correct
// initial row visibility would never get set). This direct call
// guarantees correct initial state regardless of that timing;
// applyActiveVars()'s own hook remains in place as the ongoing/
// live-update path for anything that changes after this point.
stage2SyncAllRowVisibility();

// ------------------------------------------------------------
// BUG FIX (2026-09-20, direct report: "when im in desktop dev
// mode... hit Inspector button, all my ui moves to a vastly
// incorrect location"). Root cause, confirmed live: every Stage 2
// element is registered with the engine SYNCHRONOUSLY at this
// module's own load time, reading cssVars at that exact instant -
// but Clicko's real settings (loadSettings()'s async fetch) can
// resolve LATER than that, meaning the engine's stored config can
// be stale (page-load-default values) relative to what cssVars
// actually holds by the time a user opens the Inspector. The
// ORIGINAL version of this block pushed EVERY one of the ~26
// mapped fields to cssVars the instant the Inspector's mount point
// first rendered (even just showing the "select an element" hint,
// before anything was selected or edited) - confirmed via direct
// reproduction: merely clicking the Inspector toggle changed BOTH
// High Score's AND Button's real cssVars, with nothing selected or
// edited.
//
// Fix, 2 parts:
// 1. SCOPE - only ever sync fields belonging to the element
//    CURRENTLY SELECTED in the Inspector's own dropdown, never the
//    full ~26-entry table on every render.
// 2. PRIME-BEFORE-PUSH - the FIRST time a given element is seen as
//    selected (a fresh selection, or the panel's first open),
//    instead of pushing the engine's (possibly stale) value OUT,
//    pull cssVars' CURRENT real value IN to the engine first (via
//    updateElement()) and skip pushing that round. Only once the
//    engine's own state has been re-primed from live reality does
//    a SUBSEQUENT edit correctly push forward - which is exactly
//    "an edit you actually made," never "whatever this element
//    happened to look like at page-load time."
// ------------------------------------------------------------
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
        // Field doesn't apply under this element's current mode (e.g.
        // switched to 'relative' via the Inspector, offsetX no
        // longer exists) - skip, not an error.
    }
}

// 2026-09-23 fix, direct report: "i changed a property [Round
// Breakdown Position]... on refresh the data is not saved", plus
// the immediate-slider-reflection expectation restated directly
// ("when i save a ui inspector setting, that should be reflected
// by the dev panel settings immediatly"). Root cause: both sync
// functions below located "the currently selected element" via
// `document.querySelector('.ui-inspector-select')` - the FIRST
// element matching that class in the whole mount. Since v0.2.5's
// Object/Property cascade (2026-09-20) - now UNIVERSAL as of
// today's session, every registered element has a group - the
// FIRST such select is always the "SELECT OBJECT" dropdown, whose
// value is a `"group:<name>"` token, never a real element id. This
// silently broke BOTH sync directions for every grouped element:
// `STAGE2_SYNC_MAP.filter(e => e.id === selectedId)` never matched
// a `"group:X"` string, so both functions returned early on every
// single call, unconditionally, for as long as grouping has
// existed. Confirmed live before this fix: switching Round
// Breakdown's Position to relative mode via the Inspector produced
// real, confirmed DOM mutations (12 recorded by a diagnostic
// MutationObserver) - proving the observer itself fires correctly
// - yet `stage2EngineOverrides['stage2RoundBreakdownX']` stayed
// `undefined` throughout, and `document.querySelector(
// '.ui-inspector-select').value` read `"group:Round Breakdown"` at
// the exact moment of failure. Fixed by resolving the real element
// id from the SPECIFIC picker row (identified by its own "SELECT
// OBJECT"/"SELECT ELEMENT" label, not row position) and its LAST
// select - the Property select when grouped (already a real
// element id by construction), or the lone Object/Element select
// when not grouped (also already a real element id).
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
    if (relevantEntries.length === 0) return; // selected element isn't one of ours (e.g. a font-size sub-element with no direct cssVar of its own under a different id) - nothing to do

    if (selectedId !== stage2LastPrimedId) {
        // Freshly selected (or the panel just opened onto this
        // element for the first time) - re-prime from reality,
        // don't push anything out yet. refreshInspector() forces
        // the panel to redraw against the just-primed values - the
        // Inspector's own render() has no idea an external
        // updateElement() call just changed anything, so without
        // this its displayed text would keep showing the
        // pre-prime (stale) value even though the underlying
        // engine data is already correct (confirmed live: engine
        // read -1.83vw, displayed input still read 0vw, until this
        // call was added). Safe against re-triggering this same
        // MutationObserver in a loop - the next firing sees
        // selectedId === stage2LastPrimedId already, goes to the
        // push branch, finds nothing actually changed (we just
        // primed with the same value cssVars already had), and
        // stops.
        //
        // STRUCTURAL restore (2026-09-20, direct report: "i
        // changed Position Mode for the Target Prefix X, saved,
        // and on refresh its showing the old mode") - runs BEFORE
        // the per-field priming below, so any offsetX/anchorH/etc.
        // priming that follows applies on top of the correct
        // restored mode rather than the hardcoded page-load
        // default. Uses replaceLayoutNode() (a wholesale node
        // replace), not updateElement() (a deep merge) - matches
        // the engine's own adapter.setPositionMode()/setSizeMode(),
        // which use replaceLayoutNode() specifically because a
        // mode switch needs a fresh skeleton, not old-mode fields
        // merged with new-mode fields (see registry.mjs's own
        // comment on replaceLayoutNode for the underlying bug this
        // avoids).
        const savedStructural = stage2EngineOverrides[selectedId];
        if (savedStructural) {
            try {
                if (savedStructural.position) replaceLayoutNode(selectedId, ['position'], savedStructural.position);
                if (savedStructural.size) replaceLayoutNode(selectedId, ['size'], savedStructural.size);
            } catch (e) {
                // Saved override no longer valid for this element
                // (e.g. the registration itself changed shape since
                // the save) - skip, not fatal.
            }
        }
        relevantEntries.forEach(stage2PrimeEntry);
        stage2LastPrimedId = selectedId;
        stage2SyncRowVisibility(selectedId);
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

    // STRUCTURAL capture - mirrors the restore above. Position mode
    // (and size mode, if present) has no cssVar of its OWN, but
    // for Target Suffix/Prefix-Y specifically it now DOES have a
    // real rendering consequence (2026-09-20, "big pass" -
    // updateTargetAnchoredPositions() branches their base/offset-
    // active custom properties on this exact mode) - captured
    // independently of anyChanged/applyActiveVars() above since a
    // PURE mode switch with no value change wouldn't otherwise set
    // anyChanged at all (confirmed live: switching Suffix's mode
    // alone, before touching any slider, left computedLeft
    // completely unchanged - applyActiveVars() literally never
    // re-ran, so updateTargetAnchoredPositions() never re-resolved
    // which base/offset-active variables applied). Reaches
    // stage2EngineOverrides, which Save/Copy/Named-States already
    // include (buildSettingsSnapshot() etc.) and
    // applyLoadedSettings() already restores on load/Undo.
    const liveEl = getElement(selectedId);
    if (liveEl && liveEl.layout) {
        const liveStructural = { position: liveEl.layout.position, size: liveEl.layout.size };
        const savedJson = JSON.stringify(stage2EngineOverrides[selectedId] || null);
        if (JSON.stringify(liveStructural) !== savedJson) {
            stage2EngineOverrides[selectedId] = JSON.parse(JSON.stringify(liveStructural));
            stage2SyncRowVisibility(selectedId);
            if (!anyChanged) applyActiveVars(); // force a re-resolve even when no cssVar value itself changed - see comment above
        }
    }
}

// ------------------------------------------------------------
// REVERSE SYNC: real dev-panel edit -> engine (2026-09-20, direct
// request: "fix that so all sliders are reactive to the ui
// inspector settings" - the counterpart to stage2SyncEngineToClicko
// above, which only ever handled the OTHER direction (Inspector
// edit -> Clicko). Live-verified gap this closes: moving the REAL
// "Prefix X Offset" slider directly updated cssVars/rendering
// correctly (that was never broken), but the ENGINE's own internal
// value for the currently-selected Inspector element stayed stale
// at whatever it was primed to before - confirmed via
// getEffectiveValue() reading '49.2px' (the page-load default)
// immediately after cssVars had already moved to 123.45 through a
// direct real-slider edit. Left uncorrected, that stale engine
// value could even get PUSHED back out and silently revert the
// real slider's edit the next time any Inspector edit fired the
// existing push branch above (the same "prime-before-push" class
// of bug the Inspector-jump fix addressed earlier, just triggered
// from the opposite direction).
//
// Only ever acts on whichever element is CURRENTLY SELECTED in the
// Inspector - an unselected element already gets a correct, fresh
// read the next time it's selected (the existing "freshly
// selected" prime branch above), so there's nothing to keep
// continuously in sync for those.
function stage2SyncClickoToEngine() {
    const selectedId = stage2GetSelectedElementId();
    if (!selectedId || selectedId !== stage2LastPrimedId) return; // nothing selected, or not primed yet - the existing prime-on-select branch already covers this case
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
            continue; // field doesn't apply under the current mode - skip, not an error
        }
        if (currentResolved === realValue) continue;
        stage2PrimeEntry(entry); // reuses the exact same field-write logic the initial prime branch already uses
        anyRestored = true;
    }
    if (anyRestored) refreshInspector(); // makes the Inspector's own displayed value follow the real slider live, not just internally
}
// Bridged onto window - a classic <script> (applyActiveVars(), the
// single choke point already called after every real slider/select
// edit anywhere in the file) has no direct visibility into this
// module's own top-level declarations, the reverse of how this
// module already reads the classic script's cssVars/etc. See
// applyActiveVars()'s own matching comment for the call site.
window.stage2SyncClickoToEngine = stage2SyncClickoToEngine;

const stage2InspectorMountEl = document.getElementById('stage2InspectorMount');
if (stage2InspectorMountEl) {
    const observer = new MutationObserver(() => stage2SyncEngineToClicko());
    observer.observe(stage2InspectorMountEl, { childList: true, subtree: true, attributes: true, characterData: true });
}
