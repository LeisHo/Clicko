
import { createUIElement, getEffectiveValue, updateElement } from '../../../lib/ui-engine/registry.mjs';

const buttonContent = findGroupContent('desktop', 'Main Button', 'stage2Button', 'position');
if (!buttonContent) {
    console.warn('[Stage 2 Button] group not found - skipping.');
} else {
    function addButtonRow(row) {
        row.style.borderTop = '1px dashed #5b9dff';
        row.style.marginTop = '4px';
        row.style.paddingTop = '4px';
        buttonContent.appendChild(row);
        return row;
    }
    function syncReal(realId, value) {
        const el = document.getElementById(realId);
        const valEl = document.getElementById(realId.replace(/^slider/, 'value'));
        if (el) el.value = value;
        if (valEl) valEl.textContent = value;
    }

    // ---- X/Y position ----
    const initX = Number(cssVars['--button-x-offset-vw']) || 0;
    const initY = Number(cssVars['--button-y-offset-vh']) || 0;
    const xUnit = cssVars['--button-x-offset-unit-is-px'] ? 'px' : 'vw';
    const yUnit = cssVars['--button-y-offset-unit-is-px'] ? 'px' : 'vh';
    createUIElement({
        id: 'stage2ButtonX', role: 'container',
        group: 'Main Button', propertyLabel: 'Position',
        layout: { position: { mode: 'anchor', horizontal: { anchor: 'center', offset: initX + xUnit }, vertical: { anchor: 'center', offset: initY + yUnit } } },
    });
    addButtonRow(buildSliderRow({ id: 'sliderStage2ButtonX', label: '(Stage 2, engine-driven) X Offset:', min: -50, max: 50, step: 0.01, value: initX }));
    document.getElementById('sliderStage2ButtonX').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        const unit = cssVars['--button-x-offset-unit-is-px'] ? 'px' : 'vw';
        updateElement('stage2ButtonX', { position: { horizontal: { offset: num + unit } } });
        const resolvedNum = parseFloat(getEffectiveValue('stage2ButtonX', 'offsetX', 'base').value);
        document.getElementById('valueStage2ButtonX').textContent = resolvedNum;
        cssVars['--button-x-offset-vw'] = resolvedNum;
        applyActiveVars();
        syncReal('sliderButtonX', resolvedNum);
    });
    addButtonRow(buildSliderRow({ id: 'sliderStage2ButtonY', label: '(Stage 2, engine-driven) Y Offset:', min: -50, max: 50, step: 0.01, value: initY }));
    document.getElementById('sliderStage2ButtonY').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        const unit = cssVars['--button-y-offset-unit-is-px'] ? 'px' : 'vh';
        updateElement('stage2ButtonX', { position: { vertical: { offset: num + unit } } });
        const resolvedNum = parseFloat(getEffectiveValue('stage2ButtonX', 'offsetY', 'base').value);
        document.getElementById('valueStage2ButtonY').textContent = resolvedNum;
        cssVars['--button-y-offset-vh'] = resolvedNum;
        applyActiveVars();
        syncReal('sliderButtonY', resolvedNum);
    });

    // ---- Diameter (clamp size mode: max(min, preferred), no ceiling) ----
    const initDiameterVw = Number(cssVars['--button-diameter-vw']) || 0;
    const initMinDiameterPx = Number(cssVars['--button-min-diameter-px']) || 0;
    createUIElement({
        id: 'stage2ButtonDiameter', role: 'container',
        group: 'Main Button', propertyLabel: 'Diameter',
        layout: {
            position: { mode: 'anchor', horizontal: { anchor: 'center' }, vertical: { anchor: 'top' } },
            size: { width: { mode: 'clamp', min: initMinDiameterPx + 'px', preferred: initDiameterVw + 'vmin', max: '99999px' } },
        },
    });
    addButtonRow(buildSliderRow({ id: 'sliderStage2ButtonDiameter', label: '(Stage 2, engine-driven) Diameter (vw):', min: 5, max: 60, step: 0.5, value: initDiameterVw }));
    document.getElementById('sliderStage2ButtonDiameter').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        updateElement('stage2ButtonDiameter', { size: { width: { preferred: num + 'vmin' } } });
        const resolved = getEffectiveValue('stage2ButtonDiameter', 'widthPreferred', 'base').value;
        const resolvedNum = parseFloat(resolved);
        document.getElementById('valueStage2ButtonDiameter').textContent = resolvedNum;
        cssVars['--button-diameter-vw'] = resolvedNum;
        applyActiveVars();
        syncReal('sliderButtonDiameter', resolvedNum);
    });
    addButtonRow(buildSliderRow({ id: 'sliderStage2ButtonMinDiameter', label: '(Stage 2, engine-driven) Min Diameter (px):', min: 0, max: 500, step: 5, value: initMinDiameterPx }));
    document.getElementById('sliderStage2ButtonMinDiameter').addEventListener('input', (e) => {
        const num = parseFloat(e.target.value);
        updateElement('stage2ButtonDiameter', { size: { width: { min: num + 'px' } } });
        const resolved = getEffectiveValue('stage2ButtonDiameter', 'widthMin', 'base').value;
        const resolvedNum = parseFloat(resolved);
        document.getElementById('valueStage2ButtonMinDiameter').textContent = resolvedNum;
        cssVars['--button-min-diameter-px'] = resolvedNum;
        applyActiveVars();
        syncReal('sliderButtonMinDiameter', resolvedNum);
    });
}
