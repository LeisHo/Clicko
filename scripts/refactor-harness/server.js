// Refactor equivalence harness server (2026-10-08 refactor).
// Serves a Clicko checkout read-only and injects harness.js as the very first
// script in index.html, so a capture taken before the refactor and one taken
// after can be diffed field-for-field. Never touches the served files.
//
//   node scripts/refactor-harness/server.js <rootDir> <port> <outDir>
//
// /__harness/settings      -> the pinned fixture settings JSON
// POST /__harness/result?name=X -> writes the posted JSON to <outDir>/X.json
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || '.');
const port = Number(process.argv[3] || 8950);
const outDir = path.resolve(process.argv[4] || path.join(__dirname, 'out'));
const fixture = path.join(__dirname, 'fixtures', 'dev-panel-settings.json');
const harnessJs = fs.readFileSync(path.join(__dirname, 'harness.js'), 'utf8');
fs.mkdirSync(outDir, { recursive: true });

const types = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
};

http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/__harness/settings') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        return res.end(fs.readFileSync(fixture));
    }
    if (url.pathname === '/__harness/result' && req.method === 'POST') {
        // Buffer chunks, not string-concatenate them: a multibyte UTF-8 char
        // split across two chunks would decode to U+FFFD on each side.
        const chunks = [];
        req.on('data', (c) => { chunks.push(c); });
        req.on('end', () => {
            const name = (url.searchParams.get('name') || 'result').replace(/[^\w.-]/g, '_');
            fs.writeFileSync(path.join(outDir, name + '.json'), Buffer.concat(chunks));
            res.writeHead(200); res.end('ok');
        });
        return;
    }
    let p = decodeURIComponent(url.pathname);
    if (p === '/') p = '/index.html';
    const file = path.join(root, p);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); return res.end('not found');
    }
    let data = fs.readFileSync(file);
    if (p === '/index.html') {
        data = data.toString('utf8').replace(/<head>/i, '<head><script>' + harnessJs + '</script>');
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
}).listen(port, () => console.log(`harness serving ${root} on :${port} -> ${outDir}`));
