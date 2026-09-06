// Adds a Thin Base shadow variant (shadow-caster-thin-base-layer), reusing
// the thin base's own silhouette so the shadow's shape matches the Thin
// Base checkbox instead of always casting the regular base's shadow.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const INDEX = path.join(ROOT, 'index.html');
const SRC = path.join(ROOT, 'data', 'BUTTON', 'GRAY', 'BUTTONBASE_THIN.svg');

let html = fs.readFileSync(INDEX, 'utf8');
let src = fs.readFileSync(SRC, 'utf8');

const prefix = 'shbasethin';
src = src.replace(/\.(?:st|cls-)(\d+)\s*\{/g, `.${prefix}-cls-$1 {`);
src = src.replace(/class="((?:st|cls-)\d+)"/g, (m, cls) => {
  const num = cls.match(/\d+/)[0];
  return `class="${prefix}-cls-${num}"`;
});

const openTagMatch = src.match(/<svg\b[^>]*>/);
const rootId = 'shadowBaseThinSvgRoot';
let openTag = openTagMatch[0].replace(/\sid="[^"]*"/, '').replace('<svg', `<svg id="${rootId}"`);
const bodyStart = openTagMatch.index + openTagMatch[0].length;
const bodyEnd = src.lastIndexOf('</svg>');
const body = src.slice(bodyStart, bodyEnd);
const newSvgBlock = openTag + body + '</svg>';

// Insert as a new sibling right after the existing shadow-caster-base-layer
// div closes, both wrapped in a shared parent so CSS can target either.
const anchor = '<div class="shadow-caster" id="shadowCaster"><div class="shadow-caster-layer shadow-caster-base-layer"><svg id="shadowBaseSvgRoot"';
const anchorIdx = html.indexOf(anchor);
if (anchorIdx === -1) throw new Error('anchor not found');
// Find the </svg></div> that closes this shadow-caster-base-layer div (the
// next </svg></div> after the anchor's own <svg ...> open tag).
const svgOpenEnd = html.indexOf('>', anchorIdx + anchor.length) + 1;
const closeIdx = html.indexOf('</svg></div>', svgOpenEnd);
if (closeIdx === -1) throw new Error('closing tag not found');
const insertAt = closeIdx + '</svg></div>'.length;

const newDiv = `<div class="shadow-caster-layer shadow-caster-base-layer shadow-caster-thin-base-layer">${newSvgBlock}</div>`;
html = html.slice(0, insertAt) + newDiv + html.slice(insertAt);

fs.writeFileSync(INDEX, html, 'utf8');
console.log('Inserted shadow-caster-thin-base-layer, body length:', body.length);
