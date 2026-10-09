// One-shot splitter for the 2026-10-08 refactor: moves index.html's main
// <style> and main classic <script> into src/ files, and each inline
// <script type="module"> into src/js/stage2/*.mjs - without changing code.
//
//   node scripts/refactor-harness/split.mjs plan     -> list top-level statements near the planned cuts
//   node scripts/refactor-harness/split.mjs check    -> load-order dependency check for the planned cuts
//   node scripts/refactor-harness/split.mjs apply    -> write files + rewrite index.html
//
// Classic scripts (not modules) on purpose: separate classic scripts share
// one global lexical scope, so every top-level const/let/function stays
// visible exactly as before (inline onclick= handlers, the module blocks'
// calls into it, the harness). The one thing a split CAN break is load-time
// code (top-level statements that run immediately) reaching a binding that
// now lives in a LATER file - `check` finds those statically.
import fs from 'node:fs';
import path from 'node:path';
import { parseSync } from 'rolldown/experimental';

const ROOT = process.cwd();
const HTML = path.join(ROOT, 'index.html');
const html = fs.readFileSync(HTML, 'utf8');

// Planned files for the main classic script, by the source line (1-based, in
// the CURRENT index.html) of the first line belonging to each chunk.
// Overridable via cuts.json next to this file.
const cutsFile = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'cuts.json');
const CUTS = JSON.parse(fs.readFileSync(cutsFile, 'utf8'));

function locateMainScript() {
    const re = /<script>([\s\S]*?)<\/script>/g;
    let m, best = null;
    while ((m = re.exec(html))) if (!best || m[1].length > best.code.length) best = { code: m[1], start: m.index + '<script>'.length, tagStart: m.index, tagEnd: m.index + m[0].length };
    return best;
}
const main = locateMainScript();
const lineOf = (off) => html.slice(0, off).split('\n').length;
const mainStartLine = lineOf(main.start);
const code = main.code;
const ast = parseSync('main.js', code, { sourceType: 'script', lang: 'js' });
if (ast.errors.length) throw new Error('parse errors');
const body = ast.program.body;
const lineStartOffsets = [0];
for (let i = 0; i < code.length; i++) if (code[i] === '\n') lineStartOffsets.push(i + 1);
const codeLine = (off) => { let lo = 0, hi = lineStartOffsets.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStartOffsets[mid] <= off) lo = mid; else hi = mid - 1; } return lo; };
const fileLine = (off) => mainStartLine + codeLine(off); // html line of a code offset

function stmtLabel(s) {
    if (s.type === 'FunctionDeclaration') return 'function ' + s.id.name;
    if (s.type === 'VariableDeclaration') return s.kind + ' ' + s.declarations.map((d) => d.id.name || '{..}').join(',');
    if (s.type === 'ClassDeclaration') return 'class ' + s.id.name;
    return s.type + ' ' + code.slice(s.start, s.start + 60).replace(/\s+/g, ' ');
}

// chunk index for each statement: a statement belongs to the chunk whose
// cut line is the last one <= the line its preceding gap starts on.
function cutOffsets() {
    return CUTS.map((c, ci) => {
        const target = c.line - mainStartLine; // code line index
        let off = lineStartOffsets[target];
        if (off === undefined) throw new Error('cut line out of range: ' + c.line);
        // Snap: first statement starting at/after the requested line, then
        // back up to the line after the previous statement ends so that
        // statement's leading comment block travels with it.
        if (ci === 0) off = 0;
        else {
            const idx = body.findIndex((s) => s.start >= off);
            const prevEnd = body[idx - 1].end;
            const nl = code.indexOf('\n', prevEnd);
            off = nl + 1;
        }
        // must not fall inside a statement
        for (const s of body) if (s.start < off && off < s.end) throw new Error(`cut ${c.name} @${c.line} falls inside ${stmtLabel(s)} (lines ${fileLine(s.start)}-${fileLine(s.end)})`);
        return { ...c, off };
    });
}

const mode = process.argv[2];
if (mode === 'plan') {
    for (const c of CUTS) {
        console.log(`== ${c.name} @ line ${c.line}`);
        for (const s of body) {
            const l = fileLine(s.start);
            if (Math.abs(l - c.line) < 120) console.log(`   ${l}-${fileLine(s.end)}  ${stmtLabel(s)}`);
        }
    }
    process.exit(0);
}

if (mode === 'scan') {
    // every top-level statement boundary where nothing executed earlier can
    // reach a binding declared later (statement-index granularity)
    const declIdx = new Map();
    body.forEach((s, i) => {
        if (s.type === 'FunctionDeclaration' || s.type === 'ClassDeclaration') declIdx.set(s.id.name, { i, node: s });
        else if (s.type === 'VariableDeclaration') for (const d of s.declarations) if (d.id.type === 'Identifier') declIdx.set(d.id.name, { i, node: d.init });
    });
    const isFn2 = (n) => n && /Function/.test(n.type);
    const refs2 = (node, out = new Set()) => {
        if (!node || typeof node !== 'object') return out;
        if (Array.isArray(node)) { node.forEach((n) => refs2(n, out)); return out; }
        if (node.type === 'Identifier') out.add(node.name);
        for (const k of Object.keys(node)) {
            if (k === 'start' || k === 'end') continue;
            if (node.type === 'MemberExpression' && k === 'property' && !node.computed) continue;
            if (node.type === 'Property' && k === 'key' && !node.computed) continue;
            refs2(node[k], out);
        }
        return out;
    };
    const memo = new Map();
    const reachMax = (name) => { // furthest statement index reachable from a declared name
        if (memo.has(name)) return memo.get(name);
        memo.set(name, declIdx.get(name).i);
        let m = declIdx.get(name).i;
        for (const r of refs2(declIdx.get(name).node)) if (declIdx.has(r)) m = Math.max(m, reachMax(r));
        memo.set(name, m); return m;
    };
    let pm = -1; const safe = [];
    body.forEach((s, i) => {
        if (i > 0 && pm < i) safe.push(i);
        if (!(s.type === 'FunctionDeclaration' || s.type === 'ClassDeclaration')) {
            for (const r of refs2(s.type === 'VariableDeclaration' ? s.declarations.map((d) => d.init) : s)) if (declIdx.has(r)) pm = Math.max(pm, reachMax(r));
        }
    });
    void isFn2;
    for (const i of safe) console.log(`safe before line ${fileLine(body[i].start)}: ${stmtLabel(body[i])}`);
    console.log(safe.length + ' safe boundaries of ' + (body.length - 1));
    process.exit(0);
}
const cuts = cutOffsets();
const chunkOf = (off) => { let k = 0; for (let i = 0; i < cuts.length; i++) if (cuts[i].off <= off) k = i; return k; };

// ---- dependency check ------------------------------------------------------
const decl = new Map(); // name -> {chunk, node}
for (const s of body) {
    const k = chunkOf(s.start);
    if (s.type === 'FunctionDeclaration' || s.type === 'ClassDeclaration') decl.set(s.id.name, { k, node: s, fn: true });
    else if (s.type === 'VariableDeclaration') for (const d of s.declarations) if (d.id.type === 'Identifier') decl.set(d.id.name, { k, node: d.init, fn: false });
}
const isFn = (n) => n && (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression' || n.type === 'FunctionDeclaration');
// identifiers referenced; deferred=true walks INTO function bodies too
function refs(node, deferred, out = new Set()) {
    if (!node || typeof node !== 'object') return out;
    if (Array.isArray(node)) { node.forEach((n) => refs(n, deferred, out)); return out; }
    if (!deferred && isFn(node)) return out;
    if (node.type === 'Identifier') out.add(node.name);
    for (const k of Object.keys(node)) {
        if (k === 'start' || k === 'end') continue;
        if (node.type === 'MemberExpression' && k === 'property' && !node.computed) continue;
        if (node.type === 'Property' && k === 'key' && !node.computed) continue;
        refs(node[k], deferred, out);
    }
    return out;
}
function reach(names, seen = new Set()) {
    const stack = [...names];
    while (stack.length) {
        const n = stack.pop();
        if (seen.has(n) || !decl.has(n)) continue;
        seen.add(n);
        const d = decl.get(n);
        if (d.node) for (const r of refs(d.node, true)) stack.push(r);
    }
    return seen;
}
// A file boundary is SAFE only if nothing executed before it - including
// inline callbacks it schedules (listeners, timers, observers, promise
// continuations) - can reach a binding declared after it: the browser may
// run microtasks/tasks/rendering between two classic script files, which it
// never does inside one inline script.
let problems = 0;
const maxReach = new Array(cuts.length).fill(-1); // per chunk: furthest chunk any of its executing code can reach
for (const s of body) {
    if (s.type === 'FunctionDeclaration' || s.type === 'ClassDeclaration') continue;
    const k = chunkOf(s.start);
    const reached = reach(refs(s.type === 'VariableDeclaration' ? s.declarations.map((d) => d.init) : s, true));
    const late = [...reached].filter((n) => decl.get(n).k > k);
    for (const n of late) maxReach[k] = Math.max(maxReach[k], decl.get(n).k);
    if (late.length && process.argv.includes('--verbose')) {
        console.log(`[${cuts[k].name}] line ${fileLine(s.start)} ${stmtLabel(s)}\n     reaches: ${late.slice(0, 8).map((n) => n + '(' + cuts[decl.get(n).k].name + ')').join(', ')}${late.length > 8 ? ' ...' : ''}`);
    }
}
let reachSoFar = -1;
for (let b = 1; b < cuts.length; b++) {
    reachSoFar = Math.max(reachSoFar, maxReach[b - 1]);
    const safe = reachSoFar < b;
    if (!safe) problems++;
    console.log(`boundary before ${cuts[b].name}: ${safe ? 'SAFE' : 'UNSAFE (earlier code can reach up to ' + cuts[reachSoFar].name + ')'}`);
}
console.log(problems ? `${problems} unsafe boundaries` : 'load-order check: all boundaries safe');
if (mode === 'apply' && problems && !process.argv.includes('--force')) throw new Error('refusing to apply with unsafe boundaries');
if (mode === 'check') process.exit(0);

// ---- apply -----------------------------------------------------------------
if (mode !== 'apply') throw new Error('mode must be plan|check|apply');
// template-literal spans: never re-indent lines that start inside one
const tpl = [];
(function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.type === 'TemplateLiteral') tpl.push([n.start, n.end]);
    for (const k of Object.keys(n)) if (k !== 'start' && k !== 'end') walk(n[k]);
})(body);
const insideTpl = (off) => tpl.some(([a, b]) => a < off && off < b);
function dedent(text, baseOff, n) {
    let out = '', off = baseOff;
    for (const line of text.split('\n')) {
        out += (!insideTpl(off) && line.startsWith(' '.repeat(n)) ? line.slice(n) : line) + '\n';
        off += line.length + 1;
    }
    return out.replace(/\n$/, '');
}
fs.mkdirSync(path.join(ROOT, 'src', 'js', 'stage2'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'src', 'css'), { recursive: true });
const tags = [];
const headCode = code.slice(0, cuts[0].off);
if (headCode.trim()) throw new Error('code before first cut: ' + headCode.slice(0, 200));
for (let i = 0; i < cuts.length; i++) {
    const a = cuts[i].off, b = i + 1 < cuts.length ? cuts[i + 1].off : code.length;
    const text = dedent(code.slice(a, b), a, 8).replace(/\s+$/, '') + '\n';
    fs.writeFileSync(path.join(ROOT, 'src', 'js', cuts[i].name), text);
    tags.push(`    <script src="src/js/${cuts[i].name}"></script>`);
}
let newHtml = html.slice(0, main.tagStart) + tags.join('\n').replace(/^    /, '') + html.slice(main.tagEnd);

// main <style> (the largest one) -> src/css/main.css
{
    const re = /<style>([\s\S]*?)<\/style>/g;
    let m, best = null;
    while ((m = re.exec(newHtml))) if (!best || m[1].length > best[1].length) best = m;
    const css = best[1].split('\n').map((l) => (l.startsWith('        ') ? l.slice(8) : l)).join('\n').replace(/^\n/, '').replace(/\s+$/, '') + '\n';
    fs.writeFileSync(path.join(ROOT, 'src', 'css', 'main.css'), css);
    newHtml = newHtml.slice(0, best.index) + '<link rel="stylesheet" href="src/css/main.css">' + newHtml.slice(best.index + best[0].length);
}
// inline module scripts -> src/js/stage2/NN-*.mjs (import paths re-rooted)
{
    let n = 0;
    newHtml = newHtml.replace(/<!--[\s\S]*?-->|<script type="module">([\s\S]*?)<\/script>/g, (all, body) => {
        if (all.startsWith('<!--')) return all;
        n++;
        const names = JSON.parse(fs.readFileSync(path.join(path.dirname(cutsFile), 'modules.json'), 'utf8'));
        const name = names[n - 1];
        const fixed = body
            .replace(/(['"])\.\/lib\/ui-engine\//g, '$1../../../lib/ui-engine/')
            .split('\n').map((l) => (l.startsWith('        ') ? l.slice(8) : l)).join('\n').replace(/^\n/, '').replace(/\s+$/, '') + '\n';
        fs.writeFileSync(path.join(ROOT, 'src', 'js', 'stage2', name), fixed);
        return `<script type="module" src="src/js/stage2/${name}"></script>`;
    });
    console.log('modules written:', n);
}
fs.writeFileSync(HTML, newHtml);
console.log('index.html rewritten:', newHtml.length, 'bytes');
