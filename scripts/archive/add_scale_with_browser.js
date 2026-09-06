// One-off migration script: adds a "Scale With Browser" checkbox + vw-based
// font-size slider after each of the 9 game-text font-size sliders (desktop
// + mobile = 18 insertion points), per explicit request ("For each different
// text type, provide a checkbox to select if i want the text to scale with
// the browser"). Archived per this project's own convention for one-off
// mechanical migration scripts (see swap_grayscale_svgs.js /
// add_shadow_thin_base.js from earlier this session).
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', '..', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');

const elements = [
  { base: 'text', desktopSlider: 'sliderTextFontSize', mobileSlider: 'sliderMobileTextFontSize', desktopPx: 197.38, mobilePx: 78 },
  { base: 'try-again-text', desktopSlider: 'sliderTryAgainTextFontSize', mobileSlider: 'sliderMobileTryAgainTextFontSize', desktopPx: 165.63, mobilePx: 78 },
  { base: 'try-again-question-mark', desktopSlider: 'sliderTryAgainQuestionMarkFontSize', mobileSlider: 'sliderMobileTryAgainQuestionMarkFontSize', desktopPx: 257.15, mobilePx: 78 },
  { base: 'round', desktopSlider: 'sliderRoundFontSize', mobileSlider: 'sliderMobileRoundFontSize', desktopPx: 89.34, mobilePx: 78 },
  { base: 'result-win', desktopSlider: 'sliderResultWinFontSize', mobileSlider: 'sliderMobileResultWinFontSize', desktopPx: 172.8, mobilePx: 18.6 },
  { base: 'result-lose', desktopSlider: 'sliderResultLoseFontSize', mobileSlider: 'sliderMobileResultLoseFontSize', desktopPx: 172.8, mobilePx: 18.6 },
  { base: 'target', desktopSlider: 'sliderTargetFontSize', mobileSlider: 'sliderMobileTargetFontSize', desktopPx: 309.76, mobilePx: 195 },
  { base: 'speed', desktopSlider: 'sliderSpeedFontSize', mobileSlider: 'sliderMobileSpeedFontSize', desktopPx: 89.34, mobilePx: 38.73 },
  { base: 'ms-per-click', desktopSlider: 'sliderMsPerClickFontSize', mobileSlider: 'sliderMobileMsPerClickFontSize', desktopPx: 69.89, mobilePx: 38.73 },
];

const DESKTOP_REF = 1280, MOBILE_REF = 390;
function round2(n) { return Math.round(n * 100) / 100; }
function pascalFromKebab(s) { return s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(''); }

let insertCount = 0;
const notFound = [];

elements.forEach(el => {
  const pascal = pascalFromKebab(el.base);
  [
    { sliderId: el.desktopSlider, isMobile: false, px: el.desktopPx, ref: DESKTOP_REF },
    { sliderId: el.mobileSlider, isMobile: true, px: el.mobilePx, ref: MOBILE_REF },
  ].forEach(({ sliderId, isMobile, px, ref }) => {
    const vw = round2(px / ref * 100);
    const prefix = isMobile ? 'Mobile' : '';
    const checkboxId = 'checkbox' + prefix + pascal + 'ScaleWithBrowser';
    const vwSliderId = 'slider' + prefix + pascal + 'FontSizeVw';
    const vwValueId = 'value' + prefix + pascal + 'FontSizeVw';
    const cssVarName = '--' + el.base + '-scale-with-browser';

    const valueId = 'value' + sliderId.replace(/^slider/, '');
    const marker = `id="${sliderId}"`;
    const idx = html.indexOf(marker);
    if (idx === -1) { notFound.push(sliderId); return; }
    const rowEndMarker = `id="${valueId}">`;
    const valueSpanIdx = html.indexOf(rowEndMarker, idx);
    if (valueSpanIdx === -1) { notFound.push(sliderId + ' (value span)'); return; }
    const closeSpanIdx = html.indexOf('</span>', valueSpanIdx);
    const divCloseIdx = html.indexOf('</div>', closeSpanIdx);
    if (divCloseIdx === -1) { notFound.push(sliderId + ' (div close)'); return; }
    const insertAt = divCloseIdx + '</div>'.length;

    const newRows = `
                <div class="dev-row">
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                        <input type="checkbox" id="${checkboxId}" onchange="updateScaleWithBrowser('${checkboxId}', '${cssVarName}')">
                        <span class="dev-label" style="min-width:auto;">Scale With Browser</span>
                    </label>
                </div>
                <div class="dev-row">
                    <span class="dev-label">Font Size (vw):</span>
                    <input type="range" class="dev-slider" id="${vwSliderId}" min="1" max="60" step="0.01" value="${vw}">
                    <span class="dev-value" id="${vwValueId}">${vw}</span>
                </div>`;

    html = html.slice(0, insertAt) + newRows + html.slice(insertAt);
    insertCount++;
  });
});

console.log('Inserted:', insertCount, 'of', elements.length * 2);
if (notFound.length) console.log('NOT FOUND:', notFound.join(', '));
fs.writeFileSync(filePath, html);
