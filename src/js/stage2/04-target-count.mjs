
import { createUIElement, getEffectiveValue, updateElement } from '../../../lib/ui-engine/registry.mjs';

const targetContent = findGroupContent('desktop', 'Target Count Display', 'stage2Target', 'number');
if (!targetContent) {
    console.warn('[Stage 2 Target] group not found - skipping.');
} else {
    function addTargetRow(row) {
        row.style.borderTop = '1px dashed #5b9dff';
        row.style.marginTop = '4px';
        row.style.paddingTop = '4px';
        targetContent.appendChild(row);
        return row;
    }
    function syncReal(realId, value) {
        const el = document.getElementById(realId);
        const valEl = document.getElementById(realId.replace(/^slider/, 'value'));
        if (el) el.value = value;
        if (valEl) valEl.textContent = value;
    }

    // ---- Number (plain anchor + offset) ----
    const numXUnit = cssVars['--target-x-offset-unit-is-px'] ? 'px' : 'vw';
    const numYUnit = cssVars['--target-y-offset-unit-is-px'] ? 'px' : 'vh';
    const initNumX = Number(cssVars['--target-number-x-offset-vw']) || 0;
    const initNumY = Number(cssVars['--target-number-y-offset-vh']) || 0;
    createUIElement({
        id: 'stage2TargetNumberX', role: 'text',
        group: 'Target Number', propertyLabel: 'Position',
        layout: { position: { mode: 'anchor', horizontal: { anchor: 'center', offset: initNumX + numXUnit }, vertical: { anchor: 'center', offset: initNumY + numYUnit } } },
    });
    addTargetRow(buildSliderRow({ id: 'sliderStage2TargetNumberX', label: '(Stage 2, engine-driven) Number X Offset:', min: -700, max: 700, step: 0.01, value: initNumX }));
    document.getElementById('sliderStage2TargetNumberX').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        const unit = cssVars['--target-x-offset-unit-is-px'] ? 'px' : 'vw';
        updateElement('stage2TargetNumberX', { position: { horizontal: { offset: num + unit } } });
        const resolvedNum = parseFloat(getEffectiveValue('stage2TargetNumberX', 'offsetX', 'base').value);
        document.getElementById('valueStage2TargetNumberX').textContent = resolvedNum;
        cssVars['--target-number-x-offset-vw'] = resolvedNum;
        applyActiveVars();
        syncReal('sliderTargetNumberXOffset', resolvedNum);
    });
    addTargetRow(buildSliderRow({ id: 'sliderStage2TargetNumberY', label: '(Stage 2, engine-driven) Number Y Offset:', min: -700, max: 700, step: 0.01, value: initNumY }));
    document.getElementById('sliderStage2TargetNumberY').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        const unit = cssVars['--target-y-offset-unit-is-px'] ? 'px' : 'vh';
        updateElement('stage2TargetNumberX', { position: { vertical: { offset: num + unit } } });
        const resolvedNum = parseFloat(getEffectiveValue('stage2TargetNumberX', 'offsetY', 'base').value);
        document.getElementById('valueStage2TargetNumberY').textContent = resolvedNum;
        cssVars['--target-number-y-offset-vh'] = resolvedNum;
        applyActiveVars();
        syncReal('sliderTargetNumberYOffset', resolvedNum);
    });

    function registerTargetFontSize(key, pxVar, vwVar, realId, groupName) {
        const elId = 'stage2Target' + key + 'FontSize';
        const pxValue = Number(cssVars[pxVar]) || 0;
        const vwValue = Number(cssVars[vwVar]) || 0;
        const blend = Number(cssVars['--target-scale-with-browser']) || 0;
        createUIElement({
            id: elId, role: 'text',
            group: groupName, propertyLabel: 'Font Size',
            layout: {
                position: { mode: 'anchor', horizontal: { anchor: 'center' }, vertical: { anchor: 'top' } },
                size: { width: { mode: 'fixed', value: { pxValue, vwValue, blend, vwUnit: 'vmin' } } },
            },
        });
        addTargetRow(buildSliderRow({ id: 'sliderStage2Target' + key + 'FontSize', label: '(Stage 2, engine-driven) ' + key + ' Font Size (vw):', min: 0, max: 60, step: 0.01, value: vwValue }));
        document.getElementById('sliderStage2Target' + key + 'FontSize').addEventListener('input', (e) => {
            const num = parseFloat(e.target.value);
            const current = getEffectiveValue(elId, 'widthValue', 'base').value;
            updateElement(elId, { size: { width: { value: { ...current, vwValue: num } } } });
            const resolved = getEffectiveValue(elId, 'widthValue', 'base').value;
            document.getElementById('valueStage2Target' + key + 'FontSize').textContent = resolved.vwValue;
            cssVars[vwVar] = resolved.vwValue;
            applyActiveVars();
            syncReal(realId, resolved.vwValue);
        });
    }
    registerTargetFontSize('Number', '--target-number-font-size-px', '--target-number-font-size-vw', 'sliderTargetNumberFontSizeVw', 'Target Number');

    // ---- Suffix (both axes relative to Number's edges, per-axis gap) ----
    const initSuffixX = Number(cssVars['--target-suffix-x-offset-vw']) || 0;
    const initSuffixY = Number(cssVars['--target-suffix-y-offset-vh']) || 0;
    createUIElement({
        id: 'stage2TargetSuffix', role: 'text',
        group: 'Target Suffix', propertyLabel: 'Position',
        layout: { position: { mode: 'relative', relativeTo: 'stage2TargetNumberX', myAnchor: 'top-left', targetAnchor: 'bottom-right', gap: { x: initSuffixX + 'px', y: initSuffixY + 'px' } } },
    });
    addTargetRow(buildSliderRow({ id: 'sliderStage2TargetSuffixX', label: '(Stage 2, engine-driven, relative-anchor) Suffix X Offset:', min: -700, max: 700, step: 0.01, value: initSuffixX }));
    document.getElementById('sliderStage2TargetSuffixX').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        const current = getEffectiveValue('stage2TargetSuffix', 'gap', 'base').value;
        updateElement('stage2TargetSuffix', { position: { gap: { ...(typeof current === 'object' ? current : {}), x: num + 'px' } } });
        const resolvedGap = getEffectiveValue('stage2TargetSuffix', 'gap', 'base').value;
        document.getElementById('valueStage2TargetSuffixX').textContent = parseFloat(resolvedGap.x);
        cssVars['--target-suffix-x-offset-vw'] = parseFloat(resolvedGap.x);
        applyActiveVars();
        syncReal('sliderTargetSuffixXOffset', parseFloat(resolvedGap.x));
    });
    addTargetRow(buildSliderRow({ id: 'sliderStage2TargetSuffixY', label: '(Stage 2, engine-driven, relative-anchor) Suffix Y Offset:', min: -700, max: 700, step: 0.01, value: initSuffixY }));
    document.getElementById('sliderStage2TargetSuffixY').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        const current = getEffectiveValue('stage2TargetSuffix', 'gap', 'base').value;
        updateElement('stage2TargetSuffix', { position: { gap: { ...(typeof current === 'object' ? current : {}), y: num + 'px' } } });
        const resolvedGap = getEffectiveValue('stage2TargetSuffix', 'gap', 'base').value;
        document.getElementById('valueStage2TargetSuffixY').textContent = parseFloat(resolvedGap.y);
        cssVars['--target-suffix-y-offset-vh'] = parseFloat(resolvedGap.y);
        applyActiveVars();
        syncReal('sliderTargetSuffixYOffset', parseFloat(resolvedGap.y));
    });
    registerTargetFontSize('Suffix', '--target-suffix-font-size-px', '--target-suffix-font-size-vw', 'sliderTargetSuffixFontSizeVw', 'Target Suffix');

    // ---- Prefix (hybrid: X is anchor-mode, Y is relative to Number's bottom edge, so it
    // needs 2 separate registrations) ----
    const initPrefixX = Number(cssVars['--target-prefix-x-offset-vw']) || 0;
    const initPrefixY = Number(cssVars['--target-prefix-y-offset-vh']) || 0;
    createUIElement({
        id: 'stage2TargetPrefixX', role: 'text',
        group: 'Target Prefix', propertyLabel: 'X Position',
        layout: { position: { mode: 'anchor', horizontal: { anchor: 'center', offset: initPrefixX + 'px' }, vertical: { anchor: 'top', offset: '0px' } } },
    });
    addTargetRow(buildSliderRow({ id: 'sliderStage2TargetPrefixX', label: '(Stage 2, engine-driven, anchor-mode) Prefix X Offset:', min: -700, max: 700, step: 0.01, value: initPrefixX }));
    document.getElementById('sliderStage2TargetPrefixX').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        updateElement('stage2TargetPrefixX', { position: { horizontal: { offset: num + 'px' } } });
        const resolvedNum = parseFloat(getEffectiveValue('stage2TargetPrefixX', 'offsetX', 'base').value);
        document.getElementById('valueStage2TargetPrefixX').textContent = resolvedNum;
        cssVars['--target-prefix-x-offset-vw'] = resolvedNum;
        applyActiveVars();
        syncReal('sliderTargetPrefixXOffset', resolvedNum);
    });
    createUIElement({
        id: 'stage2TargetPrefixY', role: 'text',
        group: 'Target Prefix', propertyLabel: 'Y Position',
        layout: { position: { mode: 'relative', relativeTo: 'stage2TargetNumberX', myAnchor: 'top-left', targetAnchor: 'bottom-left', gap: { y: initPrefixY + 'px' } } },
    });
    addTargetRow(buildSliderRow({ id: 'sliderStage2TargetPrefixY', label: '(Stage 2, engine-driven, relative-anchor) Prefix Y Offset:', min: -700, max: 700, step: 0.01, value: initPrefixY }));
    document.getElementById('sliderStage2TargetPrefixY').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        updateElement('stage2TargetPrefixY', { position: { gap: { y: num + 'px' } } });
        const resolvedGap = getEffectiveValue('stage2TargetPrefixY', 'gap', 'base').value;
        document.getElementById('valueStage2TargetPrefixY').textContent = parseFloat(resolvedGap.y);
        cssVars['--target-prefix-y-offset-vh'] = parseFloat(resolvedGap.y);
        applyActiveVars();
        syncReal('sliderTargetPrefixYOffset', parseFloat(resolvedGap.y));
    });
    registerTargetFontSize('Prefix', '--target-prefix-font-size-px', '--target-prefix-font-size-vw', 'sliderTargetPrefixFontSizeVw', 'Target Prefix');

    // Size: inert `mode: 'content'` registration on all 3 Target parts (no real writeback) -
    // see registerStage2TextElement().
    function registerTargetSize(key, groupName) {
        createUIElement({
            id: 'stage2Target' + key + 'Size', role: 'text',
            group: groupName, propertyLabel: 'Size',
            layout: {
                position: { mode: 'anchor', horizontal: { anchor: 'center' }, vertical: { anchor: 'top' } },
                size: { width: { mode: 'content' }, height: { mode: 'content' } },
            },
        });
    }
    registerTargetSize('Number', 'Target Number');
    registerTargetSize('Suffix', 'Target Suffix');
    registerTargetSize('Prefix', 'Target Prefix');
}
