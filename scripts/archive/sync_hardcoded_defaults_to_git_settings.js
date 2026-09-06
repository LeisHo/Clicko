// One-off script: syncs hardcoded JS default object literals in index.html
// to match the current git-tracked dev-panel-settings.json, per explicit
// request ("set the current save settings on Git as the default"). Only
// replaces VALUES on existing '--key': value / "key": value lines - never
// touches comments, structure, or adds/removes keys - so all the extensive
// per-key explanatory comments throughout these objects survive untouched.
const fs = require('fs');
const path = require('path');

const settings = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const htmlPath = process.argv[3];
let html = fs.readFileSync(htmlPath, 'utf8');

function findObjectBlock(html, declRegex) {
    const m = declRegex.exec(html);
    if (!m) return null;
    const braceStart = html.indexOf('{', m.index);
    let depth = 0, i = braceStart;
    for (; i < html.length; i++) {
        if (html[i] === '{') depth++;
        else if (html[i] === '}') { depth--; if (depth === 0) break; }
    }
    return { start: braceStart, end: i, declIndex: m.index };
}

function jsLiteral(val) {
    if (typeof val === 'string') {
        // Single-quoted, matching this file's own prevailing string style -
        // JSON.stringify's double quotes would work but look inconsistent
        // next to every hand-written literal around it.
        const escaped = val.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
        return `'${escaped}'`;
    }
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    return String(val);
}

function syncObject(html, objName, declRegex, data, report) {
    const block = findObjectBlock(html, declRegex);
    if (!block) { report.missing.push(objName); return html; }
    let body = html.slice(block.start, block.end + 1);
    let changed = 0, notFound = [];
    Object.entries(data).forEach(([key, val]) => {
        if (val !== null && typeof val === 'object') return; // skip nested objects, handle separately if needed
        // Match  'key': value   or   "key": value   as a standalone property line
        const keyPattern = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Matches BOTH quoted keys ('--css-var': ...) and bare identifier
        // keys (depth: ...) - CSS-custom-property objects always quote,
        // plain-identifier objects (extrusionVars etc.) never do.
        const re = new RegExp(`((?:['"]${keyPattern}['"]|\\b${keyPattern})\\s*:\\s*)([^,\\n]+?)(\\s*,?\\s*(?://[^\\n]*)?\\n)`);
        const newLiteral = jsLiteral(val);
        if (re.test(body)) {
            const before = body;
            body = body.replace(re, (full, p1, p2, p3) => {
                if (p2.trim() === newLiteral) return full; // already matches, no change
                changed++;
                return p1 + newLiteral + p3;
            });
        } else {
            notFound.push(key);
        }
    });
    html = html.slice(0, block.start) + body + html.slice(block.end + 1);
    report.synced[objName] = { changed, notFound };
    return html;
}

const report = { synced: {}, missing: [] };

html = syncObject(html, 'devPanelStyle', /const\s+devPanelStyle\s*=\s*\{/, settings.devPanelStyle || {}, report);
html = syncObject(html, 'cssVars', /const\s+cssVars\s*=\s*\{/, settings.cssVars || {}, report);
html = syncObject(html, 'colorVars', /const\s+colorVars\s*=\s*\{/, settings.colorVars || {}, report);
html = syncObject(html, 'mobileCssVars', /const\s+mobileCssVars\s*=\s*\{/, settings.mobileCssVars || {}, report);
html = syncObject(html, 'mobileColorVars', /const\s+mobileColorVars\s*=\s*\{/, settings.mobileColorVars || {}, report);
html = syncObject(html, 'extrusionVars', /const\s+extrusionVars\s*=\s*\{/, settings.extrusionVars || {}, report);
html = syncObject(html, 'mobileExtrusionVars', /const\s+mobileExtrusionVars\s*=\s*\{/, settings.mobileExtrusionVars || {}, report);
html = syncObject(html, 'clickBurstTextInputs', /const\s+clickBurstTextInputs\s*=\s*\{/, settings.clickBurstTextInputs || {}, report);
html = syncObject(html, 'mobileClickBurstTextInputs', /const\s+mobileClickBurstTextInputs\s*=\s*\{/, settings.mobileClickBurstTextInputs || {}, report);
html = syncObject(html, 'textOverrides', /const\s+textOverrides\s*=\s*\{/, settings.textOverrides || {}, report);
html = syncObject(html, 'mobileTextOverrides', /const\s+mobileTextOverrides\s*=\s*\{/, settings.mobileTextOverrides || {}, report);

fs.writeFileSync(htmlPath, html);
console.log(JSON.stringify(report, null, 1));
