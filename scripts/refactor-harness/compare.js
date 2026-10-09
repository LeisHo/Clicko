// Diffs two harness captures field-by-field.
//   node scripts/refactor-harness/compare.js <a.json> <b.json> [maxDiffsPerField]
// Exit code 0 = identical, 1 = differences (printed).
const fs = require('fs');
const [aPath, bPath, maxArg] = process.argv.slice(2);
const MAX = Number(maxArg || 8);
const a = JSON.parse(fs.readFileSync(aPath, 'utf8'));
const b = JSON.parse(fs.readFileSync(bPath, 'utf8'));
let diffs = 0;
const say = (s) => { diffs++; console.log(s); };

function firstStrDiff(x, y) {
    if (x === y) return null;
    if (x == null || y == null) return `one side null`;
    let i = 0;
    while (i < x.length && i < y.length && x[i] === y[i]) i++;
    return `@${i}: A«${x.slice(Math.max(0, i - 80), i + 120)}» B«${y.slice(Math.max(0, i - 80), i + 120)}»`;
}
// Measured baseline-vs-baseline noise (b4 vs b5, same original build): the
// Start button's continuously-animated flash glyph lands at a different
// animation phase. Ignored only when its position/size still matches.
const NOISE = [/startButtonFlashChar/];
function cmpObj(label, x, y) {
    const keys = new Set([...Object.keys(x || {}), ...Object.keys(y || {})]);
    let n = 0;
    for (const k of keys) {
        const vx = (x || {})[k], vy = (y || {})[k];
        if (vx !== vy && NOISE.some((r) => r.test(k)) && typeof vx === 'string' && typeof vy === 'string' && vx.split('|')[1] === vy.split('|')[1]) continue;
        if (vx !== vy) {
            if (n++ < MAX) say(`  ${label}[${k}]: ${JSON.stringify((x || {})[k])} -> ${JSON.stringify((y || {})[k])}`);
        }
    }
    if (n > MAX) say(`  ${label}: ... ${n - MAX} more`);
    return n;
}
function cmpJsonText(label, x, y) {
    if (x === y) return;
    try {
        const px = JSON.parse(x), py = JSON.parse(y);
        const flat = (o, p = '', out = {}) => {
            if (o && typeof o === 'object') for (const k of Object.keys(o)) flat(o[k], p + '.' + k, out);
            else out[p] = JSON.stringify(o);
            return out;
        };
        console.log(`${label}: JSON differs`);
        cmpObj(label, flat(px), flat(py));
        if (JSON.stringify(px) === JSON.stringify(py)) console.log(`  (${label}: same content, different key order/formatting)`);
    } catch (e) { say(`${label}: ${firstStrDiff(x, y)}`); }
}

const byName = (r) => Object.fromEntries((r.snaps || []).map((s) => [s.name, s]));
const sa = byName(a), sb = byName(b);
for (const name of new Set([...Object.keys(sa), ...Object.keys(sb)])) {
    const x = sa[name], y = sb[name];
    if (!x || !y) { say(`snap ${name}: missing on one side`); continue; }
    for (const f of ['rootStyle', 'rootClass', 'bodyClass', 'devPanel', 'gameText']) {
        if (x[f] !== y[f]) say(`snap ${name}.${f}: ${firstStrDiff(x[f], y[f])}`);
    }
    const n = cmpObj(`snap ${name}.elements`, x.elements, y.elements);
    if (n) console.log(`  (${n} element signatures differ in ${name})`);
}
for (const f of ['copy1', 'copy2']) {
    const x = (a[f] || []).join('\n'), y = (b[f] || []).join('\n');
    cmpJsonText(f, x, y);
}
// /api/preview-settings is debounced live-sync (count varies with timing) -
// only real Save payloads are compared.
for (const r of [a, b]) for (const f of ['posts1', 'posts2']) if (r[f]) r[f] = r[f].filter((p) => !p.url.includes('preview-settings'));
for (const f of ['posts1', 'posts2']) {
    const x = (a[f] || []).map((p) => p.url + ' ' + p.body).join('\n'), y = (b[f] || []).map((p) => p.url + ' ' + p.body).join('\n');
    if (x !== y) {
        const bx = (a[f] || []).map((p) => p.body), by = (b[f] || []).map((p) => p.body);
        if (bx.length !== by.length) say(`${f}: ${bx.length} vs ${by.length} posts`);
        bx.forEach((v, i) => cmpJsonText(`${f}[${i}] ${(a[f][i] || {}).url}`, v, by[i]));
    }
}
if ((a.sweepCount || 0) !== (b.sweepCount || 0)) say(`sweepCount ${a.sweepCount} vs ${b.sweepCount}`);
const sw = Math.max((a.sweep || []).length, (b.sweep || []).length);
let swd = 0;
for (let i = 0; i < sw; i++) {
    if ((a.sweep || [])[i] !== (b.sweep || [])[i]) { if (swd++ < MAX) say(`sweep[${i}]: ${a.sweep[i]} | ${b.sweep[i]}`); }
}
if (swd > MAX) say(`sweep: ... ${swd - MAX} more`);
if (JSON.stringify(a.dialogs) !== JSON.stringify(b.dialogs)) say(`dialogs differ: ${JSON.stringify(a.dialogs).slice(0, 300)} | ${JSON.stringify(b.dialogs).slice(0, 300)}`);
console.log(diffs ? `\n${diffs} difference lines` : 'IDENTICAL');
process.exit(diffs ? 1 : 0);
