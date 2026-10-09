
import { createUIElement, getEffectiveValue, updateElement } from '../../../lib/ui-engine/registry.mjs';

const stage2Content = findGroupContent('desktop', 'High Score', 'stage2Experiment', 'stage2HighScoreX');
if (!stage2Content) {
    console.warn('[Stage 2 experiment] "High Score" group not found - no preview rows added.');
} else {
    // ------------------------------------------------------------
    // Shared position element - carries X/Y offset AND both anchors
    // together, mirroring how Clicko's OWN single position formula
    // for this element already combines all 4 (one calc() for left,
    // one for top, each keyed off the SAME align/valign + edge-lock
    // state). Edge Lock's real base/sign/unit mapping (read directly
    // from EDGE_LOCK_BASE/EDGE_LOCK_SIGN, index.html ~line 14518):
    // locked -> anchor = the align/valign value itself, offset in
    // px; unlocked -> anchor is ALWAYS 'center' regardless of the
    // align/valign dropdown, offset in vw/vh. This is exactly the
    // engine's own anchorH/anchorV vocabulary - no translation layer
    // needed beyond picking which anchor point per lock state.
    // ------------------------------------------------------------
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

    // Separate element for Font Size, since it's a SIZE field
    // (widthValue), not a position field - the blended-length shape
    // {pxValue, vwValue, blend, vwUnit} is v0.2.3's own mechanism,
    // tested here interactively for the first time (Stage 1 only
    // ever checked it via a domNode-less hand-evaluated harness).
    createUIElement({
        id: 'stage2HighScoreFontSize',
        role: 'text',
        group: 'High Score', propertyLabel: 'Font Size',
        layout: {
            // position.mode is unconditionally required by
            // createUIElement() even for a size-only registration
            // (confirmed live - the engine has no size-only
            // shorthand) - an inert anchor is harmless since nothing
            // ever reads this element's position fields.
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
        // Round-trips the FULL blended-length object through the
        // real engine (updateElement -> validateConfig, which
        // v0.2.3 taught to accept this shape -> getEffectiveValue) -
        // proves the object survives storage/retrieval unmangled,
        // not just that a plain number does.
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
        // Only meaningful while unlocked (locked mode derives its
        // anchor from align+lock together - see the Edge Lock
        // listeners below, which own that combined recompute).
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
    // Deliberately NOT a new control - listens to the REAL Edge Lock
    // checkboxes (registered AFTER Clicko's own listener, so this
    // always runs with Clicko's already-recomputed, position-
    // preserving offset number already in cssVars) and mirrors the
    // resulting state into the engine's fields, proving the schema
    // can represent both lock states faithfully. The actual
    // position-preserving MATH stays Clicko's own
    // preserveVisualPositionOnLockToggle() - per the engine repo's
    // own v0.2.3 finding, that computation is host-specific, not
    // something to reimplement here.
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
    // Null-guarded (2026-09-20 fix): these real checkboxes are part
    // of the LAZY dev-panel build - for a non-dev visitor they
    // don't exist yet (ensureDevPanelBuilt() never runs for them),
    // and an unguarded call here threw and could interrupt this
    // module's remaining top-level execution - see the matching
    // fix note on the shared registerStage2TextElement() helper and
    // the Round Breakdown block for the full account (this one
    // never actually reached production since High Score's row was
    // ported before that root cause was found, but is fixed
    // preventatively, same reasoning).
    const hsAlignLockEl = document.getElementById('checkboxHighScoreTextAlignEdgeLock');
    const hsValignLockEl = document.getElementById('checkboxHighScoreTextValignEdgeLock');
    if (hsAlignLockEl) hsAlignLockEl.addEventListener('change', () => mirrorEdgeLockToEngine('x'));
    if (hsValignLockEl) hsValignLockEl.addEventListener('change', () => mirrorEdgeLockToEngine('y'));

    // Size - see registerStage2TextElement()'s own matching comment
    // (added the same session, same reasoning) for why this is an
    // honestly-inert `mode: 'content'` registration rather than a
    // real writeback.
    createUIElement({
        id: 'stage2HighScoreSize', role: 'text',
        group: 'High Score', propertyLabel: 'Size',
        layout: {
            position: { mode: 'anchor', horizontal: { anchor: 'center' }, vertical: { anchor: 'top' } },
            size: { width: { mode: 'content' }, height: { mode: 'content' } },
        },
    });
}
