// .dev-panel is visible by default for any dev-allowed visitor,
// no D-press/DEV-button-click needed (see html.dev-mode's own CSS
// comment) - so a dev-allowed visitor must get the panel actually
// built right away too, or they'd see the empty shell (just the
// header/Copy/Reset/Save buttons, no rows) until they happened to
// press D or click DEV, confirmed via a real screenshot showing
// exactly that gap. Real (non-dev) visitors are unaffected - this
// only runs for isDevAllowed, so the lazy-build win for them
// (the entire point of this change) is untouched.
if (isDevAllowed) ensureDevPanelBuilt();
setupTextEditMode();
setupTextEditPanelTriggers();
setupDevPanelTextEdit();
// Header icon buttons + Shift/armed-click group selection - always
// on, same as the calls above, since the header is static markup
// present from first paint. Ported from TEMPLATE_DEV_PANEL.html
// (2026-09-16).
setupDevHeaderIconButtons();
setupDevGroupSelection();
// Delete Group - same "always on" reasoning as the header buttons.
setupDevDeleteGroup();
// Set Hotkey - same "always on" reasoning (desktop-only, hidden on touch).
setupSetHotkeyButton();
setupHotkeyAssignmentCapture();
setupHotkeySequenceListener();
setupSliderHotkeyModeExitWatcher();
// Undo - same "always on" reasoning (Ctrl+Z must work regardless
// of whether the panel's own lazy controls are built yet).
setupDevPanelUndo();
// Search bar - same "always on" reasoning as the header buttons.
// Ported from TEMPLATE_DEV_PANEL.html (2026-09-17).
setupDevSearch();
resolvePositionSentinels();
applyActiveVars();
applyExtrusionStyles();
// Idle/landing-screen state - resetGameplayState() was defined but
// never actually called anywhere (confirmed via a full-file grep),
// so gameText/targetCount/speedDisplay/msPerClickDisplay - none of
// which carry a `hidden` class in their static HTML - were visible
// from the very first paint, showing stale/placeholder content
// ("ROUND", "0", "0 ms", "500 ms / CLICK") that visually clutters
// and, on mobile specifically, partially overlaps the START button
// itself (confirmed via direct getBoundingClientRect() overlap on
// both the local build and the deployed site) - a plausible real
// contributor to a report of the start button "appearing and
// disappearing", even though no code was found that hides START
// itself on any kind of timer. Calling it once here establishes the
// correct idle state (only START visible) before the user ever
// interacts, matching what resetGameplayState() already does
// correctly for the RESET button/R-key mid-game.
resetGameplayState();
if (cssVars['--flip-button-svg']) gameButton.classList.add('flip-svg');

// Restore a saved setup on top of the above, once the fetch
// resolves - a no-op if nothing's been saved yet (or the backend
// isn't configured/reachable), same as the old localStorage-empty
// case. Known, accepted trade-off of going git-only: on a slow
// connection there can be a brief visible moment of default
// positions/colors before a saved setup applies - there's no local
// copy left to paint instantly from.
(async () => {
    try {
        await loadSettings();
        resolvePositionSentinels();
        // Re-apply now that a restored setup (if any) is in cssVars/
        // mobileCssVars - harmless no-op re-push if nothing changed.
        applyActiveVars();
        applyExtrusionStyles();
        // Dev panel is now lazy-built (see ensureDevPanelBuilt()'s
        // own comment) - only re-sync/re-apply its own DOM if it's
        // actually been built already (the rare case: the panel was
        // opened before this fetch resolved). If it hasn't been
        // built yet, ensureDevPanelBuilt() itself will correctly
        // read the now-current cssVars/extrusionVars/devTextOverrides
        // whenever it eventually IS built - nothing to do here.
        if (devPanelBuilt) {
            syncSlidersFromState();
            syncColorPickersFromState();
            syncDevPanelStyleControlsFromState();
            applyDevTextOverrides();
        }
        // Apply a restored --flip-button-svg even though the checkbox
        // itself won't visually reflect it (loadSettings() doesn't sync any
        // control's displayed value from a restored setting - a pre-existing
        // gap affecting every dev-panel control, not specific to this one).
        if (cssVars['--flip-button-svg']) gameButton.classList.add('flip-svg');
    } finally {
        // Reveal even if loadSettings() itself somehow threw - staying
        // hidden forever on a genuine failure would be far worse than
        // the brief default-look flash this class exists to hide (see
        // .game-container.settings-loading's own comment).
        document.querySelector('.game-container').classList.remove('settings-loading');
        connectLocalSettingsSync();
        setupLiveSettingsPreviewSync();
    }
})();
