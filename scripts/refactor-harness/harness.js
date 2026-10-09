// Injected as the first <script> in <head> by server.js. Harness-only: makes a
// run deterministic (seeded Math.random, pinned settings, no real network/
// clipboard/dialogs) and exposes window.__harnessRun(label) to capture state.
(function () {
    try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}

    let seed = 0x9e3779b9;
    Math.random = function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const H = window.__harness = { posts: [], clip: [], dialogs: [] };
    window.alert = (m) => { H.dialogs.push(['alert', String(m)]); };
    window.confirm = (m) => { H.dialogs.push(['confirm', String(m)]); return true; };
    window.prompt = (m) => { H.dialogs.push(['prompt', String(m).slice(0, 80)]); return null; };
    window.EventSource = undefined;

    // Landscape profile can't be emulated by viewport size alone (needs a
    // coarse pointer) - ?__profile=landscape forces that one media query true.
    const profile = new URLSearchParams(location.search).get('__profile');
    if (profile === 'landscape') {
        const realMM = window.matchMedia.bind(window);
        window.matchMedia = function (q) {
            if (q.includes('pointer: coarse') && q.includes('orientation: landscape')) {
                return { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null };
            }
            return realMM(q);
        };
    }

    const realFetch = window.fetch.bind(window);
    window.fetch = async function (input, init) {
        const url = typeof input === 'string' ? input : input.url;
        if (url.startsWith('https://api.github.com/repos/LeisHo/Clicko/contents/')) {
            const txt = await (await realFetch('/__harness/settings')).text();
            const b64 = btoa(unescape(encodeURIComponent(txt)));
            H.settingsServedAt = performance.now();
            return new Response(JSON.stringify({ content: b64 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (url.includes('/api/')) {
            H.posts.push({ url, body: init && init.body });
            return new Response(JSON.stringify({ ok: true, commit: { sha: 'harness' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return realFetch(input, init);
    };
    try {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
            writeText: async (t) => { H.clip.push(t); }, readText: async () => '' } });
    } catch (e) {}

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    function hash(str) {
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
        return (h >>> 0).toString(16);
    }
    function elKey(el) {
        const parts = [];
        for (let n = el; n && n !== document.body; n = n.parentElement) {
            // index among siblings EXCLUDING script/style/link: the split
            // changes how many of those exist, which isn't a DOM change.
            const sibs = n.parentElement ? Array.prototype.filter.call(n.parentElement.children, (c) => !/^(SCRIPT|STYLE|LINK)$/.test(c.tagName)) : [n];
            const idx = sibs.indexOf(n);
            parts.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + ':' + idx);
        }
        return parts.join('>');
    }
    function elementSig() {
        const out = {};
        // Full computed style only outside the dev panel (game visuals); dev
        // panel nodes get position/size only - its CSS rules are proven
        // identical statically by astcheck.mjs, and computing every style
        // on its thousands of nodes made one snapshot take minutes.
        const panel = document.getElementById('devPanel');
        document.body.querySelectorAll('*').forEach((el) => {
            if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
            const r = el.getBoundingClientRect();
            const rect = [r.x, r.y, r.width, r.height].map((v) => v.toFixed(2)).join(',');
            if (panel && panel.contains(el)) { out[elKey(el)] = rect; return; }
            const cs = getComputedStyle(el);
            let s = '';
            // custom properties excluded: they're inherited onto every node
            // (one root var would mark all of them) and are captured
            // directly via rootStyle; their real effect shows in the
            // standard properties hashed here.
            for (let i = 0; i < cs.length; i++) if (!cs[i].startsWith('--')) s += cs[i] + ':' + cs.getPropertyValue(cs[i]) + ';';
            out[elKey(el)] = hash(s) + '|' + rect;
        });
        return out;
    }
    function domSig(root) {
        if (!root) return null;
        const c = root.cloneNode(true);
        const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
        const dead = [];
        while (tw.nextNode()) if (!tw.currentNode.nodeValue.trim()) dead.push(tw.currentNode);
        dead.forEach((n) => n.remove());
        return c.outerHTML.replace(/\b\d\d:\d\d:\d\d\.\d{3}\b/g, 'HH:MM:SS.mmm');
    }
    function snap(name) {
        return {
            name,
            rootStyle: document.documentElement.style.cssText,
            rootClass: document.documentElement.className,
            bodyClass: document.body.className,
            elements: elementSig(),
            devPanel: domSig(document.getElementById('devPanel')),
            gameText: domSig(document.getElementById('gameText')),
        };
    }

    window.__harnessRun = async function (label, opts) {
        opts = opts || {};
        const res = { label, ua: navigator.userAgent, vw: innerWidth, vh: innerHeight, snaps: [] };
        console.log('[H] run', label);
        // Wait for the pinned settings to be served, fonts, then until the
        // page state is stable across 3 consecutive polls - a fixed delay
        // raced the async settings application under CPU load.
        while (!H.settingsServedAt) await wait(100);
        try { await document.fonts.ready; } catch (e) {}
        await wait(1500);
        let prev = '', stable = 0;
        for (let i = 0; i < 60 && stable < 3; i++) {
            const cur = hash(document.documentElement.style.cssText + (document.getElementById('devPanel') || {}).innerHTML + document.body.innerHTML.length);
            stable = cur === prev ? stable + 1 : 0; prev = cur;
            await wait(500);
        }
        res.snaps.push(snap('load'));
        console.log('[H] load snap done');
        if (typeof ensureDevPanelBuilt === 'function') ensureDevPanelBuilt();
        await wait(500);
        for (const tab of ['desktop', 'mobile', 'landscape']) {
            switchDevPanelTab(tab); await wait(400);
            res.snaps.push(snap('tab-' + tab));
        }
        switchDevPanelTab(typeof getActiveDeviceProfile === 'function' ? getActiveDeviceProfile() : 'desktop');
        await wait(300);
        copySettings(); saveSettings(); await wait(1500);
        res.copy1 = H.clip.slice(); res.posts1 = H.posts.map((p) => ({ url: p.url, body: p.body }));
        H.clip.length = 0; H.posts.length = 0;

        console.log('[H] tabs+copy/save done; game');
        startGame();
        let t = 0;
        for (const at of [1500, 4000, 8000, 14000]) { await wait(at - t); t = at; res.snaps.push(snap('game+' + at)); }

        if (opts.sweep) {
            const inputs = Array.from(document.querySelectorAll('#devPanel input, #devPanel select'))
                .filter((el) => ['range', 'color', 'checkbox'].includes(el.type) || el.tagName === 'SELECT');
            res.sweepCount = inputs.length;
            res.sweep = [];
            console.log('[H] sweep start', inputs.length);
            let tStep = performance.now(), idx = 0;
            for (const el of inputs) {
                if (++idx % 50 === 0) { console.log('[H] sweep', idx, (performance.now() - tStep).toFixed(0) + 'ms/50'); tStep = performance.now(); await wait(0); }
                if (!el.isConnected) { res.sweep.push('gone'); continue; }
                const id = el.id || elKey(el);
                try {
                    if (el.type === 'range') {
                        const min = +el.min || 0, max = el.max === '' ? 100 : +el.max;
                        el.value = String(min + (max - min) * 0.37);
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    } else if (el.type === 'color') {
                        el.value = '#3a7bd5';
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    } else if (el.type === 'checkbox') {
                        el.click();
                    } else {
                        el.selectedIndex = (el.selectedIndex + 1) % Math.max(1, el.options.length);
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } catch (e) { res.sweep.push(id + ' ERR ' + e.message); continue; }
                res.sweep.push(id + ' ' + hash(document.documentElement.style.cssText) + ' ' + hash(document.body.className));
            }
            await wait(1500);
            res.snaps.push(snap('after-sweep'));
            copySettings(); saveSettings(); await wait(1500);
            res.copy2 = H.clip.slice(); res.posts2 = H.posts.map((p) => ({ url: p.url, body: p.body }));
        }
        res.dialogs = H.dialogs.slice();
        await realFetch('/__harness/result?name=' + encodeURIComponent(label), { method: 'POST', body: JSON.stringify(res) });
        return 'saved ' + label + ' snaps=' + res.snaps.length + ' sweep=' + (res.sweepCount || 0);
    };
})();
