// One-off script: swaps the inlined RED-sourced SVG artwork in index.html
// for the user-provided grayscale masters (data/BUTTON/GRAY/), renaming
// each file's own generic Illustrator class names (.stN / .cls-N) and any
// local clipPath id to this project's own established per-element prefix
// convention (base-cls-N, basebg-cls-N, etc.) so they don't collide with
// each other once inlined together in one HTML document.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const INDEX = path.join(ROOT, 'index.html');
const GRAY = path.join(ROOT, 'data', 'BUTTON', 'GRAY');
const RED = path.join(ROOT, 'data', 'BUTTON', 'RED');

const SLOTS = [
  { rootId: 'baseSvgRoot', prefix: 'base', file: path.join(GRAY, 'BUTTONBASE.svg') },
  { rootId: 'baseBgSvgRoot', prefix: 'basebg', file: path.join(GRAY, 'BUTTONBASENG.svg') },
  { rootId: 'baseThinSvgRoot', prefix: 'basethin', file: path.join(GRAY, 'BUTTONBASE_THIN.svg') },
  // Backing-thin: use the RED copy - it was updated (simplified single-path
  // shape, repositioned) AFTER the GRAY copy was last saved, per direct
  // instruction; color doesn't matter here since it goes through the same
  // grayscale+levels+tint filter as everything else regardless of source.
  { rootId: 'baseBgThinSvgRoot', prefix: 'backingthin', file: path.join(RED, 'BUTTONBASEBACKING_THIN.svg') },
  { rootId: 'buttonSvgRoot', prefix: 'btn', file: path.join(GRAY, 'BUTTON.svg') },
  { rootId: 'buttonPressedSvgRoot', prefix: 'btnp', file: path.join(GRAY, 'BUTTONPRESSED.svg') },
];

let html = fs.readFileSync(INDEX, 'utf8');

for (const { rootId, prefix, file } of SLOTS) {
  let src = fs.readFileSync(file, 'utf8');

  // Rename class selectors/usages: .st0 -> .PREFIX-cls-0, .cls-0 -> .PREFIX-cls-0
  src = src.replace(/\.(?:st|cls-)(\d+)\s*\{/g, `.${prefix}-cls-$1 {`);
  src = src.replace(/class="((?:st|cls-)\d+)"/g, (m, cls) => {
    const num = cls.match(/\d+/)[0];
    return `class="${prefix}-cls-${num}"`;
  });

  // Rename the local clipPath id, if present.
  src = src.replace(/id="clippath"/g, `id="${prefix}-clippath"`);
  src = src.replace(/url\(#clippath\)/g, `url(#${prefix}-clippath)`);

  // Extract everything from the opening <svg ...> tag (rewritten with our
  // established root id) down to (and including) the closing </svg>.
  const openTagMatch = src.match(/<svg\b[^>]*>/);
  if (!openTagMatch) throw new Error('No <svg> open tag found in ' + file);
  let openTag = openTagMatch[0].replace(/\sid="[^"]*"/, '').replace('<svg', `<svg id="${rootId}"`);
  const bodyStart = openTagMatch.index + openTagMatch[0].length;
  const bodyEnd = src.lastIndexOf('</svg>');
  const body = src.slice(bodyStart, bodyEnd);
  const newBlock = openTag + body + '</svg>';

  // Replace the existing inlined block for this root id in index.html.
  const existingRe = new RegExp(`<svg id="${rootId}"[^>]*>[\\s\\S]*?<\\/svg>`);
  if (!existingRe.test(html)) throw new Error('Could not find existing block for ' + rootId);
  const matches = html.match(new RegExp(existingRe.source, 'g'));
  if (matches.length !== 1) throw new Error(`Expected exactly 1 match for ${rootId}, found ${matches.length}`);
  html = html.replace(existingRe, () => newBlock);

  console.log(`Replaced ${rootId} <- ${path.relative(ROOT, file)} (prefix: ${prefix}-cls-N, ${body.length} body chars)`);
}

fs.writeFileSync(INDEX, html, 'utf8');
console.log('Done.');
