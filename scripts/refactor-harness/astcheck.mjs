// Structural code-equivalence check between two Clicko trees (e.g. the frozen
// baseline and the working copy). Proves a refactor step changed only
// comments/whitespace/file boundaries where that's the intent:
//   - JS: every classic <script> (inline or src=) concatenated in document
//     order, and every module script separately, parsed with oxc; ASTs
//     compared with positions stripped (comments aren't in the AST).
//   - CSS: every <style>/<link rel=stylesheet> concatenated in order,
//     comments + whitespace normalized via lightningcss minify.
//   - HTML: markup with script/style bodies + <!-- --> comments removed and
//     whitespace collapsed.
//   node scripts/refactor-harness/astcheck.mjs <rootA> <rootB> [--js-only|--report]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { parseSync } from 'rolldown/experimental';
const require = createRequire(import.meta.url);
const { transform: cssTransform } = require('lightningcss');

const [rootA, rootB] = process.argv.slice(2, 4).map((p) => path.resolve(p));

function collect(root) {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const classic = [], modules = [], css = [];
    const re = /<!--[\s\S]*?-->|<script\b([^>]*)>([\s\S]*?)<\/script>|<style\b[^>]*>([\s\S]*?)<\/style>|<link\b([^>]*)>/gi;
    let m;
    while ((m = re.exec(html))) {
        if (m[0].startsWith('<!--')) continue;
        if (m[3] !== undefined) { css.push(m[3]); continue; }
        if (m[4] !== undefined) {
            const href = /href=["']([^"']+)/.exec(m[4]);
            if (/rel=["']stylesheet/.test(m[4]) && href && !/^https?:/.test(href[1])) css.push(fs.readFileSync(path.join(root, href[1]), 'utf8'));
            continue;
        }
        const attrs = m[1] || '';
        const src = /src=["']([^"']+)/.exec(attrs);
        let code = src ? fs.readFileSync(path.join(root, src[1]), 'utf8') : m[2];
        // external module files resolve imports relative to themselves;
        // map back to the document-relative form for comparison
        if (src && /type=["']module/.test(attrs)) code = code.replace(/(['"])(\.\.\/)+lib\/ui-engine\//g, '$1./lib/ui-engine/');
        (/type=["']module/.test(attrs) ? modules : classic).push(code);
    }
    const markup = html
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script/>')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style/>')
        .replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, '<style/>')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\s+/g, ' ').replace(/> </g, '><')
        .replace(/(<script\/>)+/g, '<script/>'); // N consecutive classic files == 1 inline block
    return { classic, modules, css, markup };
}

const STRIP = new Set(['start', 'end', 'range', 'loc', 'span', 'raw_span']);
function norm(node) {
    if (Array.isArray(node)) return node.map(norm);
    if (node && typeof node === 'object') {
        const o = {};
        for (const k of Object.keys(node)) if (!STRIP.has(k)) o[k] = norm(node[k]);
        return o;
    }
    return node;
}
function astOf(code, label, sourceType) {
    const r = parseSync(label + '.js', code, { sourceType, lang: 'js' });
    if (r.errors && r.errors.length) throw new Error(label + ': parse errors: ' + r.errors.map((e) => e.message).join('; '));
    return norm(r.program.body);
}
function firstDiff(a, b, p = '') {
    if (JSON.stringify(a) === JSON.stringify(b)) return null;
    if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return `${p}: ${JSON.stringify(a)?.slice(0, 200)} != ${JSON.stringify(b)?.slice(0, 200)}`;
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) { const d = firstDiff(a[k], b[k], p + '.' + k); if (d) return d; }
    return p + ': differ';
}
function cssNorm(text) {
    return cssTransform({ filename: 'a.css', code: Buffer.from(text), minify: true, errorRecovery: true }).code.toString();
}

const A = collect(rootA), B = collect(rootB);
let bad = 0;
const astA = A.classic.flatMap((c, i) => astOf(c, 'A-classic' + i, 'script'));
const astB = B.classic.flatMap((c, i) => astOf(c, 'B-classic' + i, 'script'));
const dJs = firstDiff(astA, astB, 'classic');
console.log(`classic JS: ${A.classic.length} vs ${B.classic.length} scripts, ${astA.length} vs ${astB.length} top-level statements -> ${dJs ? 'DIFF ' + dJs : 'identical'}`);
if (dJs) bad++;
const modA = A.modules.map((c, i) => astOf(c, 'A-mod' + i, 'module'));
const modB = B.modules.map((c, i) => astOf(c, 'B-mod' + i, 'module'));
const dMod = firstDiff(modA, modB, 'modules');
console.log(`module JS: ${A.modules.length} vs ${B.modules.length} -> ${dMod ? 'DIFF ' + dMod : 'identical'}`);
if (dMod && !process.argv.includes('--modules-may-differ')) bad++;
if (!process.argv.includes('--js-only')) {
    const cA = cssNorm(A.css.join('\n')), cB = cssNorm(B.css.join('\n'));
    let i = 0; while (i < cA.length && cA[i] === cB[i]) i++;
    console.log(`CSS: ${cA.length} vs ${cB.length} chars -> ${cA === cB ? 'identical' : 'DIFF @' + i + ' A«' + cA.slice(i - 60, i + 80) + '» B«' + cB.slice(i - 60, i + 80) + '»'}`);
    if (cA !== cB) bad++;
    let j = 0; while (j < A.markup.length && A.markup[j] === B.markup[j]) j++;
    console.log(`HTML markup: ${A.markup.length} vs ${B.markup.length} chars -> ${A.markup === B.markup ? 'identical' : 'DIFF @' + j + ' A«' + A.markup.slice(j - 60, j + 80) + '» B«' + B.markup.slice(j - 60, j + 80) + '»'}`);
    if (A.markup !== B.markup) bad++;
}
process.exit(bad ? 1 : 0);
