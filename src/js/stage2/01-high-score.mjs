
import { createUIElement, getEffectiveValue, updateElement } from '../../../lib/ui-engine/registry.mjs';

const stage2Content = findGroupContent('desktop', 'High Score', 'stage2Experiment', 'stage2HighScoreX');
if (!stage2Content) {
    console.warn('[Stage 2 experiment] "High Score" group not found - no preview rows added.');
} else {
    // One position element carries X/Y offset AND both anchors, matching Clicko's own single
    // left/top calc() per element. Edge Lock mapping (EDGE_LOCK_BASE/EDGE_LOCK_SIGN):
    // locked -> anchor = align/valign value, offset in px; unlocked -> anchor always 'center',
    // offset in vw/vh. Maps directly onto the engine's anchorH/anchorV vocabulary.
    const alignLocked = !!cssVars['--high-score-text-align-edge-lock'];
    const valignLocked = !!cssVars['--high-score-text-valign-edge-lock'];
    const initAnchorH = alignLocked ? (cssVars['--high-score-text-align'] || 'center') : 'center';
    const initAnchorV = valignLocked ? (cssVars['--high-score-text-valign'] || 'top') : 'center';
    const initOffsetXUnit = alignLocked ? 'px' : 'vw';
    const initOffsetYUnit = valignLocked ? 'px' : 'vh';
    const initX = Number(cssVars['--high-score-x-offset-vw']) || 0;
    const initY = Number(cssVars['--high-score-y-offset-vh']) || 0;

    createUIElement({
        id: 'stage2HighScoreX',
        role: 'text',
        group: 'High Score', propertyLabel: 'Position / Align',
        layout: {
            position: {
                mode: 'anchor',
                horizontal: { anchor: initAnchorH, offset: initX + initOffsetXUnit },
                vertical: { anchor: initAnchorV, offset: initY + initOffsetYUnit },
            },
        },
    });

    // Font Size is a SIZE field (widthValue), so it gets its own element, using the engine's
    // blended-length shape {pxValue, vwValue, blend, vwUnit}.
    createUIElement({
        id: 'stage2HighScoreFontSize',
        role: 'text',
        group: 'High Score', propertyLabel: 'Font Size',
        layout: {
            // createUIElement() requires position.mode even for a size-only element; this
            // anchor is inert (nothing reads it).
            position: { mode: 'anchor', horizontal: { anchor: 'center' }, vertical: { anchor: 'top' } },
            size: {
                width: {
                    mode: 'fixed',
                    value: {
                        pxValue: Number(cssVars['--high-score-font-size-px']) || 0,
                        vwValue: Number(cssVars['--high-score-font-size-vw']) || 0,
                        blend: Number(cssVars['--high-score-scale-with-browser']) || 0,
                        vwUnit: 'vmin',
                    },
                },
            },
        },
    });

    function addStage2Row(row) {
        row.style.borderTop = '1px dashed #5b9dff';
        row.style.marginTop = '4px';
        row.style.paddingTop = '4px';
        stage2Content.appendChild(row);
        return row;
    }

    // ---- 1. X Offset ----
    addStage2Row(buildSliderRow({
        id: 'sliderStage2HighScoreX', label: '(Stage 2, engine-driven) X Offset:',
        min: -50, max: 50, step: 0.01, value: initX,
    }));
    document.getElementById('sliderStage2HighScoreX').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        const unit = document.getElementById('checkboxHighScoreTextAlignEdgeLock').checked ? 'px' : 'vw';
        updateElement('stage2HighScoreX', { position: { horizontal: { offset: num + unit } } });
        const resolvedNum = parseFloat(getEffectiveValue('stage2HighScoreX', 'offsetX', 'base').value);
        document.getElementById('valueStage2HighScoreX').textContent = resolvedNum;
        cssVars['--high-score-x-offset-vw'] = resolvedNum;
        applyActiveVars();
        const realSlider = document.getElementById('sliderHighScoreX');
        const realValueEl = document.getElementById('valueHighScoreX');
        if (realSlider) realSlider.value = resolvedNum;
        if (realValueEl) realValueEl.textContent = resolvedNum;
    });

    // ---- 2. Y Offset ----
    addStage2Row(buildSliderRow({
        id: 'sliderStage2HighScoreY', label: '(Stage 2, engine-driven) Y Offset:',
        min: -50, max: 50, step: 0.01, value: initY,
    }));
    document.getElementById('sliderStage2HighScoreY').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        const unit = document.getElementById('checkboxHighScoreTextValignEdgeLock').checked ? 'px' : 'vh';
        updateElement('stage2HighScoreX', { position: { vertical: { offset: num + unit } } });
        const resolvedNum = parseFloat(getEffectiveValue('stage2HighScoreX', 'offsetY', 'base').value);
        document.getElementById('valueStage2HighScoreY').textContent = resolvedNum;
        cssVars['--high-score-y-offset-vh'] = resolvedNum;
        applyActiveVars();
        const realSlider = document.getElementById('sliderHighScoreY');
        const realValueEl = document.getElementById('valueHighScoreY');
        if (realSlider) realSlider.value = resolvedNum;
        if (realValueEl) realValueEl.textContent = resolvedNum;
    });

    // ---- 3. Font Size (vw component of the blended-length value) ----
    addStage2Row(buildSliderRow({
        id: 'sliderStage2HighScoreFontSize', label: '(Stage 2, engine-driven) Font Size (vw):',
        min: 0, max: 50, step: 0.01, value: Number(cssVars['--high-score-font-size-vw']) || 0,
    }));
    document.getElementById('sliderStage2HighScoreFontSize').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        const current = getEffectiveValue('stage2HighScoreFontSize', 'widthValue', 'base').value;
        // Write back the FULL blended-length object; only vwValue changes.
        updateElement('stage2HighScoreFontSize', { size: { width: { value: { ...current, vwValue: num } } } });
        const resolved = getEffectiveValue('stage2HighScoreFontSize', 'widthValue', 'base').value;
        document.getElementById('valueStage2HighScoreFontSize').textContent = resolved.vwValue;
        cssVars['--high-score-font-size-vw'] = resolved.vwValue;
        applyActiveVars();
        const realSlider = document.getElementById('sliderHighScoreFontSizeVw');
        const realValueEl = document.getElementById('valueHighScoreFontSizeVw');
        if (realSlider) realSlider.value = resolved.vwValue;
        if (realValueEl) realValueEl.textContent = resolved.vwValue;
    });

    // ---- 4. Text Align (horizontal anchor) ----
    addStage2Row(buildSelectRow({
        id: 'selectStage2HighScoreTextAlign', label: '(Stage 2, engine-driven) Text Align:',
        options: [{ value: 'left', text: 'Left' }, { value: 'center', text: 'Center' }, { value: 'right', text: 'Right' }],
    }));
    document.getElementById('selectStage2HighScoreTextAlign').value = cssVars['--high-score-text-align'] || 'center';
    document.getElementById('selectStage2HighScoreTextAlign').addEventListener('change', (e) => {
        // Locked-mode anchor is recomputed from align+lock by the Edge Lock listeners below.
        updateElement('stage2HighScoreX', { position: { horizontal: { anchor: e.target.value } } });
        const resolvedAnchor = getEffectiveValue('stage2HighScoreX', 'anchorH', 'base').value;
        cssVars['--high-score-text-align'] = resolvedAnchor;
        applyActiveVars();
        const realSelect = document.getElementById('selectHighScoreTextAlign');
        if (realSelect) realSelect.value = resolvedAnchor;
    });

    // ---- 5. Vertical Align (vertical anchor) ----
    addStage2Row(buildSelectRow({
        id: 'selectStage2HighScoreTextValign', label: '(Stage 2, engine-driven) Vertical Align:',
        options: [{ value: 'top', text: 'Top' }, { value: 'center', text: 'Center' }, { value: 'bottom', text: 'Bottom' }],
    }));
    document.getElementById('selectStage2HighScoreTextValign').value = cssVars['--high-score-text-valign'] || 'top';
    document.getElementById('selectStage2HighScoreTextValign').addEventListener('change', (e) => {
        updateElement('stage2HighScoreX', { position: { vertical: { anchor: e.target.value } } });
        const resolvedAnchor = getEffectiveValue('stage2HighScoreX', 'anchorV', 'base').value;
        cssVars['--high-score-text-valign'] = resolvedAnchor;
        applyActiveVars();
        const realSelect = document.getElementById('selectHighScoreTextValign');
        if (realSelect) realSelect.value = resolvedAnchor;
    });

    // ---- 6. Edge Lock mirroring (both axes) ----
    // Listens to the REAL Edge Lock checkboxes. Registered AFTER Clicko's own listener, so
    // cssVars already holds the position-preserving offset; this only mirrors that state into
    // the engine. The math stays in Clicko's preserveVisualPositionOnLockToggle().
    function mirrorEdgeLockToEngine(axis) {
        const locked = axis === 'x'
            ? document.getElementById('checkboxHighScoreTextAlignEdgeLock').checked
            : document.getElementById('checkboxHighScoreTextValignEdgeLock').checked;
        const align = cssVars['--high-score-text-align'] || 'center';
        const valign = cssVars['--high-score-text-valign'] || 'top';
        if (axis === 'x') {
            const anchor = locked ? align : 'center';
            const unit = locked ? 'px' : 'vw';
            const num = Number(cssVars['--high-score-x-offset-vw']) || 0;
            updateElement('stage2HighScoreX', { position: { horizontal: { anchor, offset: num + unit } } });
            const r = getEffectiveValue('stage2HighScoreX', 'offsetX', 'base').value;
            document.getElementById('valueStage2HighScoreX').textContent = parseFloat(r);
        } else {
            const anchor = locked ? valign : 'center';
            const unit = locked ? 'px' : 'vh';
            const num = Number(cssVars['--high-score-y-offset-vh']) || 0;
            updateElement('stage2HighScoreX', { position: { vertical: { anchor, offset: num + unit } } });
            const r = getEffectiveValue('stage2HighScoreX', 'offsetY', 'base').value;
            document.getElementById('valueStage2HighScoreY').textContent = parseFloat(r);
        }
    }
    // Null-guarded: these checkboxes come from the lazy dev-panel build and don't exist for a
    // non-dev visitor; an unguarded call would throw and abort this module's top-level run.
    const hsAlignLockEl = document.getElementById('checkboxHighScoreTextAlignEdgeLock');
    const hsValignLockEl = document.getElementById('checkboxHighScoreTextValignEdgeLock');
    if (hsAlignLockEl) hsAlignLockEl.addEventListener('change', () => mirrorEdgeLockToEngine('x'));
    if (hsValignLockEl) hsValignLockEl.addEventListener('change', () => mirrorEdgeLockToEngine('y'));

    // Size: inert `mode: 'content'` registration (text sizes to content; no real writeback) -
    // see registerStage2TextElement().
    createUIElement({
        id: 'stage2HighScoreSize', role: 'text',
        group: 'High Score', propertyLabel: 'Size',
        layout: {
            position: { mode: 'anchor', horizontal: { anchor: 'center' }, vertical: { anchor: 'top' } },
            size: { width: { mode: 'content' }, height: { mode: 'content' } },
        },
    });
}
