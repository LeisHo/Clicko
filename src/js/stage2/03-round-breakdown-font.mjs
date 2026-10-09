
import { createUIElement, getEffectiveValue, updateElement } from '../../../lib/ui-engine/registry.mjs';

const rbContent = findGroupContent('desktop', 'Round Breakdown', 'stage2RoundBreakdown', 'fontSize');
if (!rbContent) {
    console.warn('[Stage 2 Round Breakdown] group not found - skipping.');
} else {
    function registerRoundBreakdownFontSize(key, pxVar, realSliderId) {
        const scaleRefPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--round-breakdown-scale-ref-px')) || 1280;
        const pxValue = Number(cssVars[pxVar]) || 0;
        const blend = Number(cssVars['--round-breakdown-scale-with-browser']) || 0;
        const elId = 'stage2RoundBreakdown' + key;
        createUIElement({
            id: elId, role: 'text',
            group: 'Round Breakdown', propertyLabel: key + ' Font Size',
            layout: {
                position: { mode: 'anchor', horizontal: { anchor: 'center' }, vertical: { anchor: 'top' } },
                size: { width: { mode: 'fixed', value: { pxValue, vwValue: pxValue / scaleRefPx * 100, blend, vwUnit: 'vmin' } } },
            },
        });
        const row = buildSliderRow({ id: 'sliderStage2RoundBreakdown' + key, label: '(Stage 2, engine-driven) ' + key + ' Font Size (px):', min: 8, max: 60, step: 1, value: pxValue });
        row.style.borderTop = '1px dashed #5b9dff';
        row.style.marginTop = '4px';
        row.style.paddingTop = '4px';
        rbContent.appendChild(row);
        document.getElementById('sliderStage2RoundBreakdown' + key).addEventListener('input', (e) => {
            const num = parseFloat(e.target.value);
            const currentRef = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--round-breakdown-scale-ref-px')) || 1280;
            const current = getEffectiveValue(elId, 'widthValue', 'base').value;
            updateElement(elId, { size: { width: { value: { ...current, pxValue: num, vwValue: num / currentRef * 100 } } } });
            const resolved = getEffectiveValue(elId, 'widthValue', 'base').value;
            document.getElementById('valueStage2RoundBreakdown' + key).textContent = resolved.pxValue;
            cssVars[pxVar] = resolved.pxValue;
            applyActiveVars();
            const realSlider = document.getElementById(realSliderId);
            const realValueEl = document.getElementById(realSliderId.replace(/^slider/, 'value'));
            if (realSlider) realSlider.value = resolved.pxValue;
            if (realValueEl) realValueEl.textContent = resolved.pxValue;
        });
    }
    registerRoundBreakdownFontSize('Title', '--round-breakdown-title-font-size-px', 'sliderRoundBreakdownTitleFontSize');
    registerRoundBreakdownFontSize('Data', '--round-breakdown-data-font-size-px', 'sliderRoundBreakdownDataFontSize');
}
