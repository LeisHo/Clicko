// Per-file "only comments/whitespace changed" proof.
//   node scripts/refactor-harness/filecheck.mjs <original> <edited>
// .js -> classic script, .mjs -> module, .css -> lightningcss-minified compare,
// .html -> markup with comments removed + whitespace collapsed (script/style
// bodies compared as text with comments stripped by the JS/CSS rules above is
// NOT done here - use astcheck.mjs for whole-page checks).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { parseSync } from 'rolldown/experimental';
const require = createRequire(import.meta.url);
const { transform } = require('lightningcss');

const [a, b] = process.argv.slice(2);
const A = fs.readFileSync(a, 'utf8'), B = fs.readFileSync(b, 'utf8');
const ext = path.extname(a);
const STRIP = new Set(['start', 'end', 'range', 'loc', 'span']);
const norm = (n) => Array.isArray(n) ? n.map(norm) : (n && typeof n === 'object' ? Object.fromEntries(Object.keys(n).filter((k) => !STRIP.has(k)).map((k) => [k, norm(n[k])])) : n);
function firstDiff(x, y, p = '') {
    if (JSON.stringify(x) === JSON.stringify(y)) return null;
    if (typeof x !== 'object' || typeof y !== 'object' || !x || !y) return `${p}: ${JSON.stringify(x)?.slice(0, 160)} != ${JSON.stringify(y)?.slice(0, 160)}`;
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) { const d = firstDiff(x[k], y[k], p + '.' + k); if (d) return d; }
    return p;
}
let ok, detail = '';
if (ext === '.js' || ext === '.mjs') {
    const st = ext === '.mjs' ? 'module' : 'script';
    const pa = parseSync('a' + ext, A, { sourceType: st, lang: 'js' }), pb = parseSync('b' + ext, B, { sourceType: st, lang: 'js' });
    if (pb.errors.length) { console.log('EDITED FILE HAS PARSE ERRORS:', pb.errors.map((e) => e.message).join('; ')); process.exit(1); }
    const d = firstDiff(norm(pa.program.body), norm(pb.program.body), 'body');
    ok = !d; detail = d || '';
    const cbytes = (r) => r.comments.reduce((s, c) => s + (c.end - c.start), 0);
    console.log(`comments: ${cbytes(pa)} -> ${cbytes(pb)} bytes; file: ${A.length} -> ${B.length} bytes`);
} else if (ext === '.css') {
    const m = (t) => transform({ filename: 'x.css', code: Buffer.from(t), minify: true, errorRecovery: true }).code.toString();
    const ma = m(A), mb = m(B);
    ok = ma === mb;
    if (!ok) { let i = 0; while (ma[i] === mb[i]) i++; detail = `@${i} «${ma.slice(i - 60, i + 60)}» vs «${mb.slice(i - 60, i + 60)}»`; }
    console.log(`file: ${A.length} -> ${B.length} bytes`);
} else if (ext === '.html') {
    // everything except <!-- --> comments and inter-tag whitespace must match;
    // script/style bodies must match byte-for-byte after trimming each line
    const n = (t) => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').replace(/> </g, '><');
    const na = n(A), nb = n(B);
    ok = na === nb;
    if (!ok) { let i = 0; while (na[i] === nb[i]) i++; detail = `@${i} «${na.slice(i - 80, i + 80)}» vs «${nb.slice(i - 80, i + 80)}»`; }
    console.log(`file: ${A.length} -> ${B.length} bytes`);
}
console.log(ok ? 'OK: code identical (only comments/whitespace changed)' : 'FAIL: code differs: ' + detail);
process.exit(ok ? 0 : 1);
