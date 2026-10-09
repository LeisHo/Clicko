
import { createUIElement, getEffectiveValue, updateElement } from '../../../lib/ui-engine/registry.mjs';

function registerStage2TextElement(cfg) {
    const content = findGroupContent('desktop', cfg.groupName, 'stage2Batch2', cfg.key);
    if (!content) {
        console.warn('[Stage 2 batch 2] group not found - skipping', cfg.groupName);
        return;
    }
    const alignLocked = !!cssVars[cfg.alignLockVar];
    const valignLocked = !!cssVars[cfg.valignLockVar];
    const initAnchorH = alignLocked ? (cssVars[cfg.alignVar] || 'center') : 'center';
    const initAnchorV = valignLocked ? (cssVars[cfg.valignVar] || 'top') : 'center';
    const initX = Number(cssVars[cfg.xVar]) || 0;
    const initY = Number(cssVars[cfg.yVar]) || 0;
    const elId = 'stage2' + cfg.key + 'X';

    createUIElement({
        id: elId,
        role: 'text',
        group: cfg.stage2Group, propertyLabel: 'Position / Align',
        layout: {
            position: {
                mode: 'anchor',
                horizontal: { anchor: initAnchorH, offset: initX + (alignLocked ? 'px' : 'vw') },
                vertical: { anchor: initAnchorV, offset: initY + (valignLocked ? 'px' : 'vh') },
            },
        },
    });

    function addRow(row) {
        row.style.borderTop = '1px dashed #5b9dff';
        row.style.marginTop = '4px';
        row.style.paddingTop = '4px';
        content.appendChild(row);
        return row;
    }

    // X Offset
    addRow(buildSliderRow({ id: 'sliderStage2' + cfg.key + 'X', label: '(Stage 2, engine-driven) X Offset:', min: -50, max: 50, step: 0.01, value: initX }));
    document.getElementById('sliderStage2' + cfg.key + 'X').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        const unit = document.getElementById(cfg.realAlignLockId).checked ? 'px' : 'vw';
        updateElement(elId, { position: { horizontal: { offset: num + unit } } });
        const resolvedNum = parseFloat(getEffectiveValue(elId, 'offsetX', 'base').value);
        document.getElementById('valueStage2' + cfg.key + 'X').textContent = resolvedNum;
        cssVars[cfg.xVar] = resolvedNum;
        applyActiveVars();
        const realSlider = document.getElementById(cfg.realXId);
        const realValueEl = document.getElementById(cfg.realXId.replace(/^slider/, 'value'));
        if (realSlider) realSlider.value = resolvedNum;
        if (realValueEl) realValueEl.textContent = resolvedNum;
    });

    // Y Offset
    addRow(buildSliderRow({ id: 'sliderStage2' + cfg.key + 'Y', label: '(Stage 2, engine-driven) Y Offset:', min: -50, max: 50, step: 0.01, value: initY }));
    document.getElementById('sliderStage2' + cfg.key + 'Y').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        const unit = document.getElementById(cfg.realValignLockId).checked ? 'px' : 'vh';
        updateElement(elId, { position: { vertical: { offset: num + unit } } });
        const resolvedNum = parseFloat(getEffectiveValue(elId, 'offsetY', 'base').value);
        document.getElementById('valueStage2' + cfg.key + 'Y').textContent = resolvedNum;
        cssVars[cfg.yVar] = resolvedNum;
        applyActiveVars();
        const realSlider = document.getElementById(cfg.realYId);
        const realValueEl = document.getElementById(cfg.realYId.replace(/^slider/, 'value'));
        if (realSlider) realSlider.value = resolvedNum;
        if (realValueEl) realValueEl.textContent = resolvedNum;
    });

    // Font Size (vw) - separate size element, blended-length
    const fontSizeElId = 'stage2' + cfg.key + 'FontSize';
    createUIElement({
        id: fontSizeElId,
        role: 'text',
        group: cfg.stage2Group, propertyLabel: 'Font Size',
        layout: {
            position: { mode: 'anchor', horizontal: { anchor: 'center' }, vertical: { anchor: 'top' } },
            size: { width: { mode: 'fixed', value: {
                pxValue: Number(cssVars[cfg.fontPxVar]) || 0,
                vwValue: Number(cssVars[cfg.fontVwVar]) || 0,
                blend: Number(cssVars[cfg.scaleVar]) || 0,
                vwUnit: 'vmin',
            } } },
        },
    });
    addRow(buildSliderRow({ id: 'sliderStage2' + cfg.key + 'FontSize', label: '(Stage 2, engine-driven) Font Size (vw):', min: 0, max: 50, step: 0.01, value: Number(cssVars[cfg.fontVwVar]) || 0 }));
    document.getElementById('sliderStage2' + cfg.key + 'FontSize').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        const current = getEffectiveValue(fontSizeElId, 'widthValue', 'base').value;
        updateElement(fontSizeElId, { size: { width: { value: { ...current, vwValue: num } } } });
        const resolved = getEffectiveValue(fontSizeElId, 'widthValue', 'base').value;
        document.getElementById('valueStage2' + cfg.key + 'FontSize').textContent = resolved.vwValue;
        cssVars[cfg.fontVwVar] = resolved.vwValue;
        applyActiveVars();
        if (cfg.realFontVwId) {
            const realSlider = document.getElementById(cfg.realFontVwId);
            const realValueEl = document.getElementById(cfg.realFontVwId.replace(/^slider/, 'value'));
            if (realSlider) realSlider.value = resolved.vwValue;
            if (realValueEl) realValueEl.textContent = resolved.vwValue;
        }
    });

    // Text Align
    addRow(buildSelectRow({ id: 'selectStage2' + cfg.key + 'Align', label: '(Stage 2, engine-driven) Text Align:', options: [{ value: 'left', text: 'Left' }, { value: 'center', text: 'Center' }, { value: 'right', text: 'Right' }] }));
    document.getElementById('selectStage2' + cfg.key + 'Align').value = cssVars[cfg.alignVar] || 'center';
    document.getElementById('selectStage2' + cfg.key + 'Align').addEventListener('change', (e) => {
        updateElement(elId, { position: { horizontal: { anchor: e.target.value } } });
        const resolvedAnchor = getEffectiveValue(elId, 'anchorH', 'base').value;
        cssVars[cfg.alignVar] = resolvedAnchor;
        applyActiveVars();
        const realSelect = document.getElementById(cfg.realAlignId);
        if (realSelect) realSelect.value = resolvedAnchor;
    });

    // Vertical Align
    addRow(buildSelectRow({ id: 'selectStage2' + cfg.key + 'Valign', label: '(Stage 2, engine-driven) Vertical Align:', options: [{ value: 'top', text: 'Top' }, { value: 'center', text: 'Center' }, { value: 'bottom', text: 'Bottom' }] }));
    document.getElementById('selectStage2' + cfg.key + 'Valign').value = cssVars[cfg.valignVar] || 'top';
    document.getElementById('selectStage2' + cfg.key + 'Valign').addEventListener('change', (e) => {
        updateElement(elId, { position: { vertical: { anchor: e.target.value } } });
        const resolvedAnchor = getEffectiveValue(elId, 'anchorV', 'base').value;
        cssVars[cfg.valignVar] = resolvedAnchor;
        applyActiveVars();
        const realSelect = document.getElementById(cfg.realValignId);
        if (realSelect) realSelect.value = resolvedAnchor;
    });

    // Edge Lock mirroring (both axes) - same reasoning as High
    // Score's own block: listens to the REAL checkboxes, mirrors
    // Clicko's own already-recomputed state, never reimplements the
    // position-preserving math itself.
    function mirrorEdgeLockToEngine(axis) {
        const locked = axis === 'x' ? document.getElementById(cfg.realAlignLockId).checked : document.getElementById(cfg.realValignLockId).checked;
        const align = cssVars[cfg.alignVar] || 'center';
        const valign = cssVars[cfg.valignVar] || 'top';
        if (axis === 'x') {
            const anchor = locked ? align : 'center';
            const unit = locked ? 'px' : 'vw';
            const num = Number(cssVars[cfg.xVar]) || 0;
            updateElement(elId, { position: { horizontal: { anchor, offset: num + unit } } });
            const r = getEffectiveValue(elId, 'offsetX', 'base').value;
            document.getElementById('valueStage2' + cfg.key + 'X').textContent = parseFloat(r);
        } else {
            const anchor = locked ? valign : 'center';
            const unit = locked ? 'px' : 'vh';
            const num = Number(cssVars[cfg.yVar]) || 0;
            updateElement(elId, { position: { vertical: { anchor, offset: num + unit } } });
            const r = getEffectiveValue(elId, 'offsetY', 'base').value;
            document.getElementById('valueStage2' + cfg.key + 'Y').textContent = parseFloat(r);
        }
    }
    // Null-guarded (2026-09-20 fix, see the matching Round
    // Breakdown block's own note for the full root-cause account):
    // these real checkboxes are part of the LAZY dev-panel build -
    // for a non-dev visitor they don't exist, and an unguarded call
    // here threw INSIDE this module's top-level synchronous run,
    // which could leave later code in this same script block
    // (nothing currently follows this in this particular block, but
    // a future edit could add some) un-executed.
    const realAlignLockEl = document.getElementById(cfg.realAlignLockId);
    const realValignLockEl = document.getElementById(cfg.realValignLockId);
    if (realAlignLockEl) realAlignLockEl.addEventListener('change', () => mirrorEdgeLockToEngine('x'));
    if (realValignLockEl) realValignLockEl.addEventListener('change', () => mirrorEdgeLockToEngine('y'));

    // Size (v0.2.6 engine re-vendor) - per direct request ("For all
    // objects, I want X and Y and size properties to be available,
    // even if they arent currently being used"). No real Clicko
    // mechanism controls a plain text element's own box width/
    // height independently of its Font Size (text elements here
    // size to their own content, not an authored box) - registered
    // as `mode: 'content'` (the engine's own "size to content"
    // default, matching what every one of these elements already
    // does visually) specifically so the property is discoverable
    // and available, honestly inert rather than pretending a real
    // writeback exists. Note this is NOT the same thing as X/Y
    // being split into their own separate properties - the
    // engine's anchor/fixed position modes require anchorH+anchorV+
    // offsetX+offsetY together as one schema unit (MODE_SCHEMA),
    // so a genuinely independent "X" or "Y" property isn't
    // representable without a new engine capability; the existing
    // "Position / Align" property already carries both X and Y
    // together (confirmed live - offsetY renders and resolves
    // correctly), and #4's conditional-visibility fix is what
    // actually addressed the "Target Number is missing Y" report
    // (a discoverability/decluttering issue, not a missing field).
    createUIElement({
        id: 'stage2' + cfg.key + 'Size', role: 'text',
        group: cfg.stage2Group, propertyLabel: 'Size',
        layout: {
            position: { mode: 'anchor', horizontal: { anchor: 'center' }, vertical: { anchor: 'top' } },
            size: { width: { mode: 'content' }, height: { mode: 'content' } },
        },
    });
}

// 'Start' was previously labeled stage2Group: 'Start/Try Again
// Button' even though it only ever wired Start's OWN vars
// (--start-text-*, --text-*) - Try Again has its own fully
// independent set (--try-again-text-*) and was never registered at
// all, so the Inspector showed one combined "Start/Try Again
// Button" object that only ever edited Start. Direct report: "Start
// and Try again are grouped as 1 object, they are 2 separate
// objects with their own properties." Renamed this one to plain
// 'Start' and added a real 'Try Again' registration below, using
// the same registerStage2TextElement() shape (Try Again's own
// position/align/valign/edge-lock/font-size CSS is structurally
// identical to Start's, just a fully separate set of cssVars/real
// dev-panel controls - see .start-button.try-again-state's own CSS
// comment). Both still target the SAME real dev-panel group
// ('Start/Try Again Button', via groupName) since that's genuinely
// one shared dev-panel section - only the Inspector's own object
// label (stage2Group) is split.
registerStage2TextElement({
    key: 'Start', groupName: 'Start/Try Again Button', stage2Group: 'Start',
    xVar: '--text-x-offset-vw', yVar: '--text-y-offset-vh',
    fontPxVar: '--text-font-size-px', fontVwVar: '--text-font-size-vw', scaleVar: '--text-scale-with-browser',
    alignVar: '--start-text-align', valignVar: '--start-text-valign',
    alignLockVar: '--start-text-align-edge-lock', valignLockVar: '--start-text-valign-edge-lock',
    realXId: 'sliderTextX', realYId: 'sliderTextY', realFontVwId: 'sliderTextFontSizeVw',
    realAlignId: 'selectStartTextAlign', realValignId: 'selectStartTextValign',
    realAlignLockId: 'checkboxStartTextAlignEdgeLock', realValignLockId: 'checkboxStartTextValignEdgeLock',
});

registerStage2TextElement({
    key: 'TryAgain', groupName: 'Start/Try Again Button', stage2Group: 'Try Again',
    xVar: '--try-again-text-x-offset-vw', yVar: '--try-again-text-y-offset-vh',
    fontPxVar: '--try-again-text-font-size-px', fontVwVar: '--try-again-text-font-size-vw', scaleVar: '--try-again-text-scale-with-browser',
    alignVar: '--try-again-text-align', valignVar: '--try-again-text-valign',
    alignLockVar: '--try-again-text-align-edge-lock', valignLockVar: '--try-again-text-valign-edge-lock',
    realXId: 'sliderTryAgainTextX', realYId: 'sliderTryAgainTextY', realFontVwId: 'sliderTryAgainTextFontSizeVw',
    realAlignId: 'selectTryAgainTextAlign', realValignId: 'selectTryAgainTextValign',
    realAlignLockId: 'checkboxTryAgainTextAlignEdgeLock', realValignLockId: 'checkboxTryAgainTextValignEdgeLock',
});

// The "?" that flashes alongside Try Again - its own separate
// element (#startButtonFlashChar/startButtonFlashCharExtrusion),
// own dev-panel group (oddly named "Rotation Animation" - a legacy
// name from when this used to be a rotating animation instead of a
// flash, per that feature's own history), own full position/align/
// valign/edge-lock/font-size set (--try-again-question-mark-*).
// Direct report: "The '?' that appears along Try Again is missing
// as well." Its real Y offset formula stacks on top of Try Again's
// own Y position (see .start-button.try-again-state's own CSS
// "parent-y" terms) - irrelevant here, since this registration only
// mirrors the "?" mark's OWN offset var/slider, exactly like every
// other Stage 2 element mirrors its own slider without re-deriving
// Clicko's underlying position formula.
registerStage2TextElement({
    key: 'TryAgainQuestionMark', groupName: 'Rotation Animation', stage2Group: 'Try Again "?"',
    xVar: '--try-again-question-mark-x-offset-vw', yVar: '--try-again-question-mark-y-offset-vh',
    fontPxVar: '--try-again-question-mark-font-size-px', fontVwVar: '--try-again-question-mark-font-size-vw', scaleVar: '--try-again-question-mark-scale-with-browser',
    alignVar: '--try-again-question-mark-text-align', valignVar: '--try-again-question-mark-text-valign',
    alignLockVar: '--try-again-question-mark-text-align-edge-lock', valignLockVar: '--try-again-question-mark-text-valign-edge-lock',
    realXId: 'sliderTryAgainQuestionMarkX', realYId: 'sliderTryAgainQuestionMarkY', realFontVwId: 'sliderTryAgainQuestionMarkFontSizeVw',
    realAlignId: 'selectTryAgainQuestionMarkTextAlign', realValignId: 'selectTryAgainQuestionMarkTextValign',
    realAlignLockId: 'checkboxTryAgainQuestionMarkTextAlignEdgeLock', realValignLockId: 'checkboxTryAgainQuestionMarkTextValignEdgeLock',
});

// Win and Lose - direct report: "Win and Lose are missing. Those
// are 2 separate objects." Both render through the SAME shared
// #resultText element (a class toggle, .result-win/.result-lose,
// same "one shared DOM node, two CSS states" pattern as Start/Try
// Again sharing #startButton) and SHARE one Align/Valign/Edge-Lock
// setting (--result-text-align/-valign - Result "splits Win/Lose
// into 2 independent offset vars driven by one align var", per
// preserveVisualPositionOnLockToggle()'s own comment) - but each
// has its own independent X/Y offset and Font Size, so each still
// gets its own Stage 2 object/registration. Passing the same
// shared alignVar/valignVar/lock vars/real select+checkbox ids to
// both calls is intentional, not a copy-paste mistake - editing
// either object's Align/Valign in the Inspector correctly affects
// both Win and Lose, matching their real shared behavior.
registerStage2TextElement({
    key: 'Win', groupName: 'Win/Lose Text', stage2Group: 'Win',
    xVar: '--result-win-x-offset-vw', yVar: '--result-win-y-offset-vh',
    fontPxVar: '--result-win-font-size-px', fontVwVar: '--result-win-font-size-vw', scaleVar: '--result-win-scale-with-browser',
    alignVar: '--result-text-align', valignVar: '--result-text-valign',
    alignLockVar: '--result-text-align-edge-lock', valignLockVar: '--result-text-valign-edge-lock',
    realXId: 'sliderResultWinX', realYId: 'sliderResultWinY', realFontVwId: 'sliderResultWinFontSizeVw',
    realAlignId: 'selectResultTextAlign', realValignId: 'selectResultTextValign',
    realAlignLockId: 'checkboxResultTextAlignEdgeLock', realValignLockId: 'checkboxResultTextValignEdgeLock',
});

registerStage2TextElement({
    key: 'Lose', groupName: 'Win/Lose Text', stage2Group: 'Lose',
    xVar: '--result-lose-x-offset-vw', yVar: '--result-lose-y-offset-vh',
    fontPxVar: '--result-lose-font-size-px', fontVwVar: '--result-lose-font-size-vw', scaleVar: '--result-lose-scale-with-browser',
    alignVar: '--result-text-align', valignVar: '--result-text-valign',
    alignLockVar: '--result-text-align-edge-lock', valignLockVar: '--result-text-valign-edge-lock',
    realXId: 'sliderResultLoseX', realYId: 'sliderResultLoseY', realFontVwId: 'sliderResultLoseFontSizeVw',
    realAlignId: 'selectResultTextAlign', realValignId: 'selectResultTextValign',
    realAlignLockId: 'checkboxResultTextAlignEdgeLock', realValignLockId: 'checkboxResultTextValignEdgeLock',
});

registerStage2TextElement({
    key: 'RoundText', groupName: 'Round Text', stage2Group: 'Round Text',
    xVar: '--round-dock-x-offset-vw', yVar: '--round-dock-y-offset-vh',
    fontPxVar: '--round-font-size-px', fontVwVar: '--round-font-size-vw', scaleVar: '--round-scale-with-browser',
    alignVar: '--round-text-align', valignVar: '--round-text-valign',
    alignLockVar: '--round-text-align-edge-lock', valignLockVar: '--round-text-valign-edge-lock',
    realXId: 'sliderRoundDockX', realYId: 'sliderRoundDockY', realFontVwId: 'sliderRoundFontSizeVw',
    realAlignId: 'selectRoundTextAlign', realValignId: 'selectRoundTextValign',
    realAlignLockId: 'checkboxRoundTextAlignEdgeLock', realValignLockId: 'checkboxRoundTextValignEdgeLock',
});

registerStage2TextElement({
    key: 'Speed', groupName: 'Speed Display (max ms between taps)', stage2Group: 'Speed Display',
    xVar: '--speed-x-offset-vw', yVar: '--speed-y-offset-vh',
    fontPxVar: '--speed-font-size-px', fontVwVar: '--speed-font-size-vw', scaleVar: '--speed-scale-with-browser',
    alignVar: '--speed-text-align', valignVar: '--speed-text-valign',
    alignLockVar: '--speed-text-align-edge-lock', valignLockVar: '--speed-text-valign-edge-lock',
    realXId: 'sliderSpeedX', realYId: 'sliderSpeedY', realFontVwId: 'sliderSpeedFontSizeVw',
    realAlignId: 'selectSpeedTextAlign', realValignId: 'selectSpeedTextValign',
    realAlignLockId: 'checkboxSpeedTextAlignEdgeLock', realValignLockId: 'checkboxSpeedTextValignEdgeLock',
});

registerStage2TextElement({
    key: 'MsPerClick', groupName: 'Ms/Click Display', stage2Group: 'Ms/Click Display',
    xVar: '--ms-per-click-x-offset-vw', yVar: '--ms-per-click-y-offset-vh',
    fontPxVar: '--ms-per-click-font-size-px', fontVwVar: '--ms-per-click-font-size-vw', scaleVar: '--ms-per-click-scale-with-browser',
    alignVar: '--ms-per-click-text-align', valignVar: '--ms-per-click-text-valign',
    alignLockVar: '--ms-per-click-text-align-edge-lock', valignLockVar: '--ms-per-click-text-valign-edge-lock',
    realXId: 'sliderMsPerClickX', realYId: 'sliderMsPerClickY', realFontVwId: 'sliderMsPerClickFontSizeVw',
    realAlignId: 'selectMsPerClickTextAlign', realValignId: 'selectMsPerClickTextValign',
    realAlignLockId: 'checkboxMsPerClickTextAlignEdgeLock', realValignLockId: 'checkboxMsPerClickTextValignEdgeLock',
});
