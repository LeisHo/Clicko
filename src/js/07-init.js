// The panel is visible by default for dev-allowed visitors, so build it now or they'd see an
// empty shell until pressing D. Non-dev visitors keep the lazy build.
if (isDevAllowed) ensureDevPanelBuilt();
setupTextEditMode();
setupTextEditPanelTriggers();
setupDevPanelTextEdit();
// Header buttons, selection, delete, hotkeys, undo, search: always on - the header is static
// markup present from first paint, independent of the lazily built controls.
setupDevHeaderIconButtons();
setupDevGroupSelection();
setupDevDeleteGroup();
// Hotkeys are desktop-only (hidden on touch).
setupSetHotkeyButton();
setupHotkeyAssignmentCapture();
setupHotkeySequenceListener();
setupSliderHotkeyModeExitWatcher();
// Ctrl+Z must work whether or not the panel's lazy controls are built yet.
setupDevPanelUndo();
setupDevSearch();
resolvePositionSentinels();
applyActiveVars();
applyExtrusionStyles();
// Establish the idle state (only START visible): gameText/targetCount/speedDisplay/
// msPerClickDisplay have no `hidden` class in static HTML and would otherwise show placeholder
// content that overlaps START on mobile.
resetGameplayState();
if (cssVars['--flip-button-svg']) gameButton.classList.add('flip-svg');

// Restore a saved setup once the fetch resolves (no-op if nothing saved / backend unreachable).
// Accepted trade-off of git-only settings: on a slow connection defaults may show briefly.
(async () => {
    try {
        await loadSettings();
        resolvePositionSentinels();
        // Re-apply with the restored cssVars/mobileCssVars (harmless if unchanged).
        applyActiveVars();
        applyExtrusionStyles();
        // Only re-sync panel DOM if it was already built; otherwise ensureDevPanelBuilt() will
        // read the now-current state when it eventually builds.
        if (devPanelBuilt) {
            syncSlidersFromState();
            syncColorPickersFromState();
            syncDevPanelStyleControlsFromState();
            applyDevTextOverrides();
        }
        // Applies a restored --flip-button-svg; the checkbox itself won't reflect it
        // (loadSettings() doesn't sync control displays - a general known gap).
        if (cssVars['--flip-button-svg']) gameButton.classList.add('flip-svg');
    } finally {
        // Reveal even if loadSettings() threw - staying hidden forever is worse than the brief
        // default-look flash .game-container.settings-loading exists to hide.
        document.querySelector('.game-container').classList.remove('settings-loading');
        connectLocalSettingsSync();
        setupLiveSettingsPreviewSync();
    }
})();
