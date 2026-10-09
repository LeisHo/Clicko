
// Mounts the engine's floating Inspector panel (toggle, Save hook, resize, drag). Gated on
// isDevAllowed: unlike the other Stage 2 modules (which no-op via findGroupContent()), this
// standalone panel needs its own gate; non-dev visitors get the button/panel removed from the DOM.
if (typeof isDevAllowed !== 'undefined' && isDevAllowed) {
    import('../../../lib/ui-engine/inspector.mjs').then(({ mountInspector, refreshInspector }) => {
        const panel = document.getElementById('stage2InspectorPanel');
        const mount = document.getElementById('stage2InspectorMount');
        let mounted = false;
        document.getElementById('stage2InspectorToggleBtn').addEventListener('click', () => {
            panel.classList.toggle('stage2-open');
            if (panel.classList.contains('stage2-open') && !mounted) {
                mountInspector(mount);
                mounted = true;
            }
        });

        // The Inspector's own Save only writes the engine's separate localStorage key, so also
        // call Clicko's real saveSettings() (git-synced Save/Sync). inspector.mjs rebuilds the
        // button every render, so delegate via a capture listener on the stable mount and
        // identify the button by class + text (no edits to the vendored file).
        mount.addEventListener('click', (e) => {
            const btn = e.target.closest('.ui-inspector-button');
            if (btn && btn.textContent.trim() === 'Save' && typeof saveSettings === 'function') {
                saveSettings();
                // Confirm on this button too: the dev panel's Sync flash is invisible when only
                // the Inspector is open.
                const original = btn.textContent;
                btn.textContent = 'Saved!';
                btn.disabled = true;
                setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1200);
            }
        }, true);

        // Resize reuses Clicko's setupPanelResizeHandle() with a setLeftTop that writes inline
        // style, since this panel has no cssVars-backed position.
        function stage2SetLeftTop(key, value) {
            panel.style[key] = value + 'px';
        }
        setupPanelResizeHandle(panel, document.getElementById('stage2InspectorResizeTop'), null, 'top', stage2SetLeftTop);
        setupPanelResizeHandle(panel, document.getElementById('stage2InspectorResizeBottom'), null, 'bottom', stage2SetLeftTop);
        setupPanelResizeHandle(panel, document.getElementById('stage2InspectorResizeLeft'), 'left', null, stage2SetLeftTop);
        setupPanelResizeHandle(panel, document.getElementById('stage2InspectorResizeRight'), 'right', null, stage2SetLeftTop);
        setupPanelResizeHandle(panel, document.getElementById('stage2InspectorResizeTL'), 'left', 'top', stage2SetLeftTop);
        setupPanelResizeHandle(panel, document.getElementById('stage2InspectorResizeTR'), 'right', 'top', stage2SetLeftTop);
        setupPanelResizeHandle(panel, document.getElementById('stage2InspectorResizeBL'), 'left', 'bottom', stage2SetLeftTop);
        setupPanelResizeHandle(panel, document.getElementById('stage2InspectorResizeBR'), 'right', 'bottom', stage2SetLeftTop);

        // Header drag-to-move: same pointer-capture/viewport-clamp pattern as the dev panel's
        // drag, hand-written because that one is tied to --dev-panel-*-px cssVars.
        const header = document.getElementById('stage2InspectorHeader');
        let dragging = false;
        let dragStart = { x: 0, y: 0, left: 0, top: 0 };
        header.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            const rect = panel.getBoundingClientRect();
            dragStart = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
            dragging = true;
            header.classList.add('dragging');
            try { header.setPointerCapture(e.pointerId); } catch (err) { /* best-effort */ }
        });
        document.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            if (e.buttons === 0) { endDrag(e); return; }
            const rect = panel.getBoundingClientRect();
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            const newLeft = Math.max(0, Math.min(window.innerWidth - rect.width, dragStart.left + dx));
            const newTop = Math.max(0, Math.min(window.innerHeight - rect.height, dragStart.top + dy));
            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
        });
        function endDrag(e) {
            if (!dragging) return;
            dragging = false;
            header.classList.remove('dragging');
            if (e && e.pointerId !== undefined && header.hasPointerCapture(e.pointerId)) {
                header.releasePointerCapture(e.pointerId);
            }
        }
        document.addEventListener('pointerup', endDrag);
        document.addEventListener('pointercancel', endDrag);
    });
} else {
    document.getElementById('stage2InspectorPanel').remove();
    document.getElementById('stage2InspectorToggleBtn').remove();
}
