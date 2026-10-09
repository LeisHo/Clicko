
// Gated the same way as the rest of the dev tooling (isDevAllowed,
// ~line 28: file:/data:/localhost/127.0.0.1/?dev=1 only) - per
// direct report, the toggle button and panel were being created
// completely UNCONDITIONALLY for every real visitor, a real bug
// (every other Stage 2 addition happens to no-op safely for a
// normal visitor since findGroupContent() only finds anything once
// the dev panel itself has been built, which is itself already
// gated - this standalone floating panel had no such protection).
// A normal visitor gets neither the button nor the panel in the DOM
// at all, not just a hidden one.
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

        // ------------------------------------------------------------
        // BUG FIX (2026-09-20, direct report: "the ui engine save
        // button doesnt work"). The Inspector's own Copy/Save/Reset
        // toolbar (inspector.mjs's buildToolbar()) calls the ENGINE's
        // own saveLayoutConfig()/resetLayoutConfig() - a completely
        // separate localStorage key ('uiLayoutEngineConfig'),
        // disconnected from Clicko's real save system entirely. It
        // doesn't throw, it just has zero visible effect on anything
        // the player or Clicko's real Save/Sync button cares about -
        // clicking it "does nothing" from the user's actual
        // perspective, matching the report. Since inspector.mjs
        // rebuilds this button from scratch on every render (a
        // directly-attached extra listener would be destroyed every
        // time), delegated via a capture-phase click listener on the
        // stable mount point instead - checks the click target is
        // specifically the Save button (by its own text + class,
        // the only way to identify it without touching the vendored
        // file), and ALSO calls Clicko's REAL saveSettings() so an
        // Inspector-made edit (now correctly written into cssVars by
        // the writeback fix above) actually gets persisted through
        // the same git-synced Save/Sync path every other control
        // already uses. The engine's own localStorage save still
        // happens too (harmless, left alone) - this only ADDS the
        // real persistence on top of it.
        mount.addEventListener('click', (e) => {
            const btn = e.target.closest('.ui-inspector-button');
            if (btn && btn.textContent.trim() === 'Save' && typeof saveSettings === 'function') {
                saveSettings();
                // Visible confirmation on THIS button directly (2026-09-20)
                // - flashDevHeaderSyncStatus() above already flashes the
                // real dev panel's own header Sync button, but that's
                // invisible if the regular panel is collapsed/closed
                // while only the Inspector is open - which made a
                // successful save look like nothing happened (confirmed
                // via live reload test: the save/persist/load-back cycle
                // was actually working correctly the whole time).
                const original = btn.textContent;
                btn.textContent = 'Saved!';
                btn.disabled = true;
                setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1200);
            }
        }, true);

        // ------------------------------------------------------------
        // FEATURE (2026-09-20, direct request: "allow me to resize
        // and drag to move this ui inspector") - reuses Clicko's own
        // real setupPanelResizeHandle() function (already proven,
        // already handles min/max clamping, pointer-capture, mobile
        // touch-action edge cases) with a custom setLeftTop writing
        // directly to this panel's own inline style (this panel has
        // no cssVars-backed position the way the real dev panel
        // does, so the direct-inline-style branch that function's
        // own comment already anticipates for "a different panel"
        // is exactly the right fit here - not a new mechanism).
        // ------------------------------------------------------------
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

        // Drag-to-move via the header - same pointer-capture/clamp-
        // to-viewport pattern as Clicko's own devPanelHeader drag,
        // hand-written here (simpler than devPanel's own version,
        // which is entangled with cssVars/--dev-panel-*-px) rather
        // than reused directly, since this panel positions itself
        // via plain inline style, not custom properties.
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
