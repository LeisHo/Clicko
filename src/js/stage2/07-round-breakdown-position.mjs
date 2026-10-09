
import { createUIElement, getEffectiveValue, updateElement } from '../../../lib/ui-engine/registry.mjs';

const rbPosContent = findGroupContent('desktop', 'Round Breakdown', 'stage2RoundBreakdownPos', 'position');
if (!rbPosContent) {
    console.warn('[Stage 2 Round Breakdown position] group not found - skipping.');
} else {
    function addRbRow(row) {
        row.style.borderTop = '1px dashed #5b9dff';
        row.style.marginTop = '4px';
        row.style.paddingTop = '4px';
        rbPosContent.appendChild(row);
        return row;
    }
    function syncReal(realId, value) {
        const el = document.getElementById(realId);
        const valEl = document.getElementById(realId.replace(/^slider/, 'value'));
        if (el) el.value = value;
        if (valEl) valEl.textContent = value;
    }
    function reapply() {
        if (typeof applyRoundBreakdownPosition === 'function') applyRoundBreakdownPosition();
        applyActiveVars();
    }

    const rbAlignLocked = !!cssVars['--round-breakdown-align-edge-lock'];
    const rbValignLocked = !!cssVars['--round-breakdown-valign-edge-lock'];
    const rbAlign = cssVars['--round-breakdown-align'] || 'left';
    const rbValign = cssVars['--round-breakdown-valign'] || 'top';
    const initAnchorH = (rbAlign === 'right' && rbAlignLocked) ? 'right' : 'left';
    const initAnchorV = (rbValign === 'bottom' && rbValignLocked) ? 'bottom' : 'top';
    const initX = Number(cssVars['--round-breakdown-left-vw']) || 0;
    const initY = Number(cssVars['--round-breakdown-top-vh']) || 0;
    const xUnit = cssVars['--round-breakdown-x-offset-unit-is-px'] ? 'px' : 'vw';
    const yUnit = cssVars['--round-breakdown-y-offset-unit-is-px'] ? 'px' : 'vh';

    createUIElement({
        id: 'stage2RoundBreakdownX', role: 'container',
        group: 'Round Breakdown', propertyLabel: 'Position',
        layout: { position: { mode: 'anchor', horizontal: { anchor: initAnchorH, offset: initX + xUnit }, vertical: { anchor: initAnchorV, offset: initY + yUnit } } },
    });
    addRbRow(buildSliderRow({ id: 'sliderStage2RoundBreakdownX', label: '(Stage 2, engine-driven) X Offset:', min: 0, max: 100, step: 0.1, value: initX }));
    document.getElementById('sliderStage2RoundBreakdownX').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        const unit = cssVars['--round-breakdown-x-offset-unit-is-px'] ? 'px' : 'vw';
        updateElement('stage2RoundBreakdownX', { position: { horizontal: { offset: num + unit } } });
        const resolvedNum = parseFloat(getEffectiveValue('stage2RoundBreakdownX', 'offsetX', 'base').value);
        document.getElementById('valueStage2RoundBreakdownX').textContent = resolvedNum;
        cssVars['--round-breakdown-left-vw'] = resolvedNum;
        reapply();
        syncReal('sliderRoundBreakdownX', resolvedNum);
    });
    addRbRow(buildSliderRow({ id: 'sliderStage2RoundBreakdownY', label: '(Stage 2, engine-driven) Y Offset:', min: 0, max: 100, step: 0.1, value: initY }));
    document.getElementById('sliderStage2RoundBreakdownY').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        const unit = cssVars['--round-breakdown-y-offset-unit-is-px'] ? 'px' : 'vh';
        updateElement('stage2RoundBreakdownX', { position: { vertical: { offset: num + unit } } });
        const resolvedNum = parseFloat(getEffectiveValue('stage2RoundBreakdownX', 'offsetY', 'base').value);
        document.getElementById('valueStage2RoundBreakdownY').textContent = resolvedNum;
        cssVars['--round-breakdown-top-vh'] = resolvedNum;
        reapply();
        syncReal('sliderRoundBreakdownY', resolvedNum);
    });

    // Gap X/Y (2026-09-23) - real relative-mode counterpart to the
    // X/Y Offset sliders above, per direct request: "When i change
    // the anchor settings to relative, i still want the xy offset
    // sliders to choose the gap." Shown instead of the plain
    // Offset sliders whenever the Inspector's own Mode is switched
    // to 'relative' (STAGE2_MODE_ROW_MAP's own relative entry,
    // added in the sync module below) - same toggle mechanism
    // Target Suffix/Prefix-Y already use for their own anchor-vs-
    // relative slider pairs. Writes directly into
    // stage2EngineOverrides (the actual source stage2ApplyRound
    // BreakdownRelativePosition() reads, see its own comment) as
    // well as the live engine element (updateElement) so the
    // Inspector's own displayed gap value stays correct if
    // reselected - no separate cssVar needed since
    // stage2EngineOverrides is already included in Save/Sync.
    function currentRbGap() {
        const saved = stage2EngineOverrides['stage2RoundBreakdownX'];
        const gap = (saved && saved.position && typeof saved.position.gap === 'object') ? saved.position.gap : {};
        return { x: parseFloat(gap.x) || 0, y: parseFloat(gap.y) || 0 };
    }
    const initGap = currentRbGap();
    addRbRow(buildSliderRow({ id: 'sliderStage2RoundBreakdownGapX', label: '(Stage 2, engine-driven, relative-mode) Gap X (px):', min: -500, max: 500, step: 1, value: initGap.x }));
    document.getElementById('sliderStage2RoundBreakdownGapX').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        const saved = stage2EngineOverrides['stage2RoundBreakdownX'] || { position: { mode: 'relative' } };
        const gap = (saved.position.gap && typeof saved.position.gap === 'object') ? saved.position.gap : {};
        saved.position.gap = { ...gap, x: num + 'px' };
        stage2EngineOverrides['stage2RoundBreakdownX'] = saved;
        try { updateElement('stage2RoundBreakdownX', { position: { gap: saved.position.gap } }); } catch (err) {}
        document.getElementById('valueStage2RoundBreakdownGapX').textContent = num;
        reapply();
    });
    addRbRow(buildSliderRow({ id: 'sliderStage2RoundBreakdownGapY', label: '(Stage 2, engine-driven, relative-mode) Gap Y (px):', min: -500, max: 500, step: 1, value: initGap.y }));
    document.getElementById('sliderStage2RoundBreakdownGapY').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        const saved = stage2EngineOverrides['stage2RoundBreakdownX'] || { position: { mode: 'relative' } };
        const gap = (saved.position.gap && typeof saved.position.gap === 'object') ? saved.position.gap : {};
        saved.position.gap = { ...gap, y: num + 'px' };
        stage2EngineOverrides['stage2RoundBreakdownX'] = saved;
        try { updateElement('stage2RoundBreakdownX', { position: { gap: saved.position.gap } }); } catch (err) {}
        document.getElementById('valueStage2RoundBreakdownGapY').textContent = num;
        reapply();
    });

    const initWidth = Number(cssVars['--round-breakdown-width-vw']) || 0;
    const initHeight = Number(cssVars['--round-breakdown-height-vh']) || 0;
    createUIElement({
        id: 'stage2RoundBreakdownSize', role: 'container',
        group: 'Round Breakdown', propertyLabel: 'Size (Width/Height)',
        layout: {
            position: { mode: 'anchor', horizontal: { anchor: 'left' }, vertical: { anchor: 'top' } },
            size: { width: { mode: 'fixed', value: initWidth + 'vw' }, height: { mode: 'fixed', value: initHeight + 'vh' } },
        },
    });
    addRbRow(buildSliderRow({ id: 'sliderStage2RoundBreakdownWidth', label: '(Stage 2, engine-driven) Width (vw):', min: 10, max: 100, step: 0.1, value: initWidth }));
    document.getElementById('sliderStage2RoundBreakdownWidth').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        updateElement('stage2RoundBreakdownSize', { size: { width: { value: num + 'vw' } } });
        const resolvedNum = parseFloat(getEffectiveValue('stage2RoundBreakdownSize', 'widthValue', 'base').value);
        document.getElementById('valueStage2RoundBreakdownWidth').textContent = resolvedNum;
        cssVars['--round-breakdown-width-vw'] = resolvedNum;
        reapply();
        syncReal('sliderRoundBreakdownWidth', resolvedNum);
    });
    addRbRow(buildSliderRow({ id: 'sliderStage2RoundBreakdownHeight', label: '(Stage 2, engine-driven) Height (vh):', min: 10, max: 100, step: 0.1, value: initHeight }));
    document.getElementById('sliderStage2RoundBreakdownHeight').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        updateElement('stage2RoundBreakdownSize', { size: { height: { value: num + 'vh' } } });
        const resolvedNum = parseFloat(getEffectiveValue('stage2RoundBreakdownSize', 'heightValue', 'base').value);
        document.getElementById('valueStage2RoundBreakdownHeight').textContent = resolvedNum;
        cssVars['--round-breakdown-height-vh'] = resolvedNum;
        reapply();
        syncReal('sliderRoundBreakdownHeight', resolvedNum);
    });

    // Edge Lock mirroring (both axes) - same reasoning as every
    // other Stage 2 element.
    function mirrorEdgeLockToEngine(axis) {
        const align = cssVars['--round-breakdown-align'] || 'left';
        const valign = cssVars['--round-breakdown-valign'] || 'top';
        if (axis === 'x') {
            const locked = document.getElementById('checkboxRoundBreakdownAlignEdgeLock').checked;
            const anchor = (align === 'right' && locked) ? 'right' : 'left';
            const unit = cssVars['--round-breakdown-x-offset-unit-is-px'] ? 'px' : 'vw';
            const num = Number(cssVars['--round-breakdown-left-vw']) || 0;
            updateElement('stage2RoundBreakdownX', { position: { horizontal: { anchor, offset: num + unit } } });
            document.getElementById('valueStage2RoundBreakdownX').textContent = parseFloat(getEffectiveValue('stage2RoundBreakdownX', 'offsetX', 'base').value);
        } else {
            const locked = document.getElementById('checkboxRoundBreakdownValignEdgeLock').checked;
            const anchor = (valign === 'bottom' && locked) ? 'bottom' : 'top';
            const unit = cssVars['--round-breakdown-y-offset-unit-is-px'] ? 'px' : 'vh';
            const num = Number(cssVars['--round-breakdown-top-vh']) || 0;
            updateElement('stage2RoundBreakdownX', { position: { vertical: { anchor, offset: num + unit } } });
            document.getElementById('valueStage2RoundBreakdownY').textContent = parseFloat(getEffectiveValue('stage2RoundBreakdownX', 'offsetY', 'base').value);
        }
    }
    // Null-guarded (2026-09-20 fix) - THE ORIGINAL CRASH SITE: on a
    // real, non-dev production visit, these 2 checkboxes don't
    // exist yet (part of the lazy dev-panel build, per
    // ensureDevPanelBuilt() only ever running when isDevAllowed),
    // so the unguarded calls below threw "Cannot read properties of
    // null (reading 'addEventListener')" on every page load for
    // every real visitor - confirmed via direct reproduction on
    // production. This crash was in a SEPARATE, LATER module script
    // than the actual gameplay-breaking bug (the real root cause of
    // "click doesn't register/no click frames" was
    // renderClickBurstTextInputControls() being lazy too - see the
    // Initialize block's own fix, ~line 18430) - so fixing this
    // alone would NOT have fixed gameplay, but it's a real,
    // separate crash on every load and is fixed here regardless.
    const rbAlignLockEl = document.getElementById('checkboxRoundBreakdownAlignEdgeLock');
    const rbValignLockEl = document.getElementById('checkboxRoundBreakdownValignEdgeLock');
    if (rbAlignLockEl) rbAlignLockEl.addEventListener('change', () => mirrorEdgeLockToEngine('x'));
    if (rbValignLockEl) rbValignLockEl.addEventListener('change', () => mirrorEdgeLockToEngine('y'));
}
