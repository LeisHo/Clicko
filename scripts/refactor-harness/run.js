// Runs the harness capture in headless Chrome (CDP over Node's built-in
// WebSocket, no npm deps) for desktop / mobile / landscape.
//   node scripts/refactor-harness/run.js <rootDir> <outDir> <labelPrefix> [profiles=desktop,mobile,landscape]
// The desktop run also does the full dev-panel input sweep.
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(process.argv[2]);
const outDir = path.resolve(process.argv[3]);
const prefix = process.argv[4] || 'run';
const profiles = (process.argv[5] || 'desktop,mobile,landscape').split(',');
const PORT = 8960 + Math.floor(Math.random() * 30);
const CDP_PORT = 9330 + Math.floor(Math.random() * 30);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const VIEWPORTS = {
    desktop: { width: 1280, height: 800, mobile: false, q: '' },
    mobile: { width: 390, height: 844, mobile: true, q: '' },
    landscape: { width: 844, height: 390, mobile: true, q: '?__profile=landscape' },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function main() {
    const server = spawn(process.execPath, [path.join(__dirname, 'server.js'), root, String(PORT), outDir], { stdio: 'inherit' });
    const profileDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'clicko-harness-'));
    const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profileDir}`,
        '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
        '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
    try {
        let targets;
        for (let i = 0; i < 50; i++) {
            try { targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json(); break; } catch (e) { await sleep(200); }
        }
        const page = targets.find((t) => t.type === 'page');
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((r) => ws.addEventListener('open', r));
        let id = 0; const pending = new Map();
        ws.addEventListener('message', (ev) => {
            const msg = JSON.parse(ev.data);
            if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
            if (msg.method === 'Runtime.exceptionThrown') console.log('  PAGE EXCEPTION:', msg.params.exceptionDetails.exception && msg.params.exceptionDetails.exception.description);
            if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'log' && String(msg.params.args[0] && msg.params.args[0].value).startsWith('[H]')) console.log('  ' + msg.params.args.map((a) => a.value).join(' '));
            if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') console.log('  console.error:', msg.params.args.map((a) => a.value || a.description).join(' ').slice(0, 300));
        });
        const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
        await send('Runtime.enable'); await send('Page.enable');
        for (const prof of profiles) {
            const v = VIEWPORTS[prof];
            await send('Emulation.setDeviceMetricsOverride', { width: v.width, height: v.height, deviceScaleFactor: 1, mobile: v.mobile });
            await send('Emulation.setTouchEmulationEnabled', { enabled: v.mobile, maxTouchPoints: v.mobile ? 5 : 0 });
            await send('Page.navigate', { url: `http://localhost:${PORT}/${v.q}` });
            await sleep(500);
            const label = `${prefix}-${prof}`;
            const t0 = Date.now();
            const r = await send('Runtime.evaluate', { expression: `__harnessRun(${JSON.stringify(label)}, {sweep: ${prof === 'desktop'}})`, awaitPromise: true, returnByValue: true, timeout: 900000 });
            console.log(`${label}: ${JSON.stringify(r.result && (r.result.result ? r.result.result.value : r.result))} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
        }
        ws.close();
    } finally {
        chrome.kill(); server.kill();
    }
}
main().catch((e) => { console.error(e); process.exit(1); });
