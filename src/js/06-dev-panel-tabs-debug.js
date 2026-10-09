
// Collapses the dev panel to just its header - distinct from fully
// hiding it (the D key / dev-hide-btn) - per CLAUDE.md Section 12c.
// Desktop/Mobile dev-panel tabs - per CLAUDE.md Section 12f. Purely
// a PRESENTATION change: which tab is showing doesn't affect which
// device's actual game rendering is active (that's still
// isMobileActive(), driven by the real viewport width) - both tabs'
// sliders remain live-editable regardless of which one you're
// currently looking at, same as before this restructuring when both
// were simultaneously visible in one long scroll.
function switchDevPanelTab(tab) {
    // tab is 'desktop' | 'mobile' | 'landscape'.
    // Per direct request, Mobile's (and now Landscape's) group/
    // setting order always mirrors Desktop's CURRENT order the
    // moment that tab is opened - see syncTabOrderToDesktop()'s own
    // comment. Runs BEFORE the 'hidden' class toggle below so the
    // tab's content is already in its correct order the instant it
    // becomes visible, not reordering visibly after the fact.
    if (tab === 'mobile') syncMobileOrderToDesktop();
    else if (tab === 'landscape') syncLandscapeOrderToDesktop();
    // Re-syncs checkbox .checked display, group cascade indeterminate
    // display, and empty-group hiding for whichever tab is about to
    // show - state can change while a tab isn't the active one (an
    // edit on Desktop, a Mobile/Landscape edit made just before
    // switching away), and none of that is otherwise guaranteed to
    // have refreshed this specific tab's own display yet. Direct
    // request: "the checkboxes for groups and settings in different
    // tabs should also auto update appropriately."
    if (devPanelBuilt) {
        syncDeviceCheckboxesFromState();
        if (tab === 'mobile' || tab === 'landscape') refreshEmptyGroupVisibility(tab);
        injectGroupDeviceCheckboxes();
    }
    document.getElementById('desktopTabContent').classList.toggle('hidden', tab !== 'desktop');
    document.getElementById('mobileTabContent').classList.toggle('hidden', tab !== 'mobile');
    document.getElementById('landscapeTabContent').classList.toggle('hidden', tab !== 'landscape');
    document.getElementById('devTabDesktopBtn').classList.toggle('active', tab === 'desktop');
    document.getElementById('devTabMobileBtn').classList.toggle('active', tab === 'mobile');
    document.getElementById('devTabLandscapeBtn').classList.toggle('active', tab === 'landscape');
    // The panel's OWN styling (Section 12i) is independent per tab,
    // not tied to the real device viewport - re-apply whichever
    // tab's own saved look now that it's the one showing.
    applyDevPanelOwnStyling(tab);
}

// Top-edge debug lines - see the dev-panel checkbox's own comment.
// Draws a vertical bar from the browser's real top edge (y=0) down
// to each element's own plain getBoundingClientRect().top - the
// EXACT same measurement Text Edit Mode's own bounding box already
// uses (see updateTextEditBoundingBoxes() above), which the user
// directly confirmed looks visually correct around the real
// rendered text. The first version of this tool used
// Range.getBoundingClientRect() on the text node instead (this
// investigation's own earlier diagnostic method, used to root-cause
// the original line-height leading bug) - per direct report ("30px
// gap between the bottom of the green line and the top of the
// Target Text... when I change the Line Spacing of Target, nothing
// moves... I think both your green and blue line is measuring to
// the top of the Ms/Click text" - and the direct suggestion "why
// dont you use the Edit Text mode Bounding Box... as a measurement
// guide"), that Range-based measurement does NOT correspond to
// where the text actually renders, at least not reliably enough to
// trust over Text Edit Mode's own already-validated method. Switched
// to match it exactly rather than keep trusting the Range approach.
// Self-perpetuating requestAnimationFrame loop (not a resize
// listener) specifically because every resize-event-based re-
// trigger tried earlier this session proved unreliable on the
// user's real device - a per-frame poll has no "did the right
// event fire" question to get wrong, and naturally stops
// rescheduling itself the instant the checkbox is unchecked.
function updateTopDebugLines() {
    const checkbox = document.getElementById('checkboxShowTopDebugLines');
    const lineTarget = document.getElementById('topDebugLineTarget');
    const lineMs = document.getElementById('topDebugLineMs');
    const labelTarget = document.getElementById('topDebugLabelTarget');
    const labelMs = document.getElementById('topDebugLabelMs');
    if (!checkbox.checked) {
        lineTarget.classList.add('hidden');
        lineMs.classList.add('hidden');
        labelTarget.classList.add('hidden');
        labelMs.classList.add('hidden');
        return;
    }
    // Reverted back to plain el.getBoundingClientRect() with NO
    // line-height correction - a "+lineHeightPx" version (per the
    // user's own first-guess formula, "top of bounding box = top
    // of text + linespacing*fontsize") shipped briefly and was
    // then directly reported as overshooting badly for Target
    // ("the 2 lines are now way too long... not a simple
    // multiplication as I had previously stated"). Re-measured
    // carefully this time - tick marks spaced 10px apart, drawn
    // directly ACROSS the glyph's own width (not off to the side,
    // which risked misalignment/misreading) - at Target's real
    // line-height (0.65, forced for a clean, controlled test) and
    // found the glyph's own visible top lands almost exactly AT
    // the box's own top (+0 on the ruler), no meaningful gap at
    // all. This matches Text Edit Mode's own bounding box (plain
    // getBoundingClientRect(), no correction) exactly, and directly
    // contradicts the "+lineHeightPx" formula's premise that a
    // real, non-zero line-height always needs correcting for. No
    // further correction applied here pending confirmation this
    // holds on the user's own real device too.
    //
    // Font Trim Adjust (the 8-Bit Text Style slider) is applied
    // ONLY to this reported/drawn measurement, not to the real
    // element - per explicit correction ("when I change the
    // slider, the text moves with it. the whole point is to
    // change where the bottom of the green and the blue line
    // ends, so I can manually adjust the lead trim overlap").
    // An earlier version applied it as margin-top on the actual
    // .target-count/.ms-per-click-display elements, which shifts
    // the real box AND this same getBoundingClientRect() measurement
    // by the same amount - the gap between the line and the real
    // glyph (the thing the slider exists to close) never changed,
    // only the on-screen Y position moved as an unwanted side
    // effect. Offsetting only the drawn line's endpoint here keeps
    // the actual text fixed in place while letting the line be
    // dragged down to the glyph's real edge by eye.
    function measureGlyphTop(el) {
        if (!el || el.classList.contains('hidden')) return null;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return null;
        const fontSizePx = parseFloat(getComputedStyle(el).fontSize) || 0;
        const trimAdjustPx = (extrusionVars.fontTrimAdjust || 0) * fontSizePx;
        return { top: rect.top + trimAdjustPx, left: rect.left, width: rect.width };
    }
    function place(el, line, label, name) {
        const m = measureGlyphTop(el);
        if (!m) {
            line.classList.add('hidden');
            label.classList.add('hidden');
            return;
        }
        line.classList.remove('hidden');
        label.classList.remove('hidden');
        const x = m.left + m.width / 2;
        line.style.left = x + 'px';
        line.style.height = Math.max(0, m.top) + 'px';
        label.style.left = (x + 6) + 'px';
        label.style.top = Math.max(0, m.top - 2) + 'px';
        label.textContent = name + ': ' + m.top.toFixed(1) + 'px';
    }
    place(document.getElementById('targetCount'), lineTarget, labelTarget, 'Target');
    place(document.getElementById('msPerClickDisplay'), lineMs, labelMs, 'Ms/Click');
    requestAnimationFrame(updateTopDebugLines);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Don't fire while the user is typing into a text field (Text
    // Edit Mode's textarea, the Hide Shadow spec textbox, a
    // click-to-type numeric readout, etc.) - "d"/"r" are ordinary
    // letters that show up in normal typed text (e.g. "Round"),
    // and without this guard typing them there used to blow away
    // unsaved dev-panel settings via Reset.
    const target = e.target;
    const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if (isTyping) return;
    if (e.key.toLowerCase() === 'd' && isDevAllowed) {
        ensureDevPanelBuilt();
        devPanel.classList.toggle('hidden');
    }
    if (e.key.toLowerCase() === 'r' && isDevAllowed) {
        resetDevSettings();
    }
});

// Wires the SAME 'change' handler to all 3 devices' copies of one
// global dev-tool toggle (Desktop/Mobile/Landscape - see each tab's
// own HTML comment on why these exist as 3 draggable copies of one
// shared state, not 3 independent states). Whichever copy the user
// actually clicked drives the real effect via onChange(checked);
// the other 2 copies' own .checked are synced to match WITHOUT
// re-dispatching 'change' on them (a plain property set never
// fires the event), so this can't recurse or double-apply the effect.
function wireSyncedCheckboxGroup(ids, onChange) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', (e) => {
            const checked = e.target.checked;
            ids.forEach(otherId => {
                if (otherId === id) return;
                const other = document.getElementById(otherId);
                if (other) other.checked = checked;
            });
            onChange(checked);
        });
    });
}
// Sets every device copy's .checked directly (no 'change' event) -
// used for mutual-exclusivity between 2 DIFFERENT synced groups
// (Preview Start Text vs Preview Try Again Text below), where
// checking one has to un-check every copy of the OTHER control.
function setAllChecked(ids, checked) {
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.checked = checked; });
}

// Click counter checkbox (also shows the tap diagnostic log)
wireSyncedCheckboxGroup(['checkboxClickCounter', 'checkboxMobileClickCounter', 'checkboxLandscapeClickCounter'], (checked) => {
    clickCounter.classList.toggle('hidden', !checked);
    tapDiagnosticPanel.classList.toggle('hidden', !checked);
    // Catch the DOM up in one shot right when the panel opens, so
    // logTapDiagnostic's incremental per-tap append (see above) can
    // assume it's already caught up on every subsequent tap instead
    // of needing to check/rebuild itself.
    if (checked) { rebuildTapDiagnosticDisplay(); }
});

wireSyncedCheckboxGroup(['checkboxFlipButtonSvg', 'checkboxMobileFlipButtonSvg', 'checkboxLandscapeFlipButtonSvg'], (checked) => {
    cssVars['--flip-button-svg'] = checked ? 1 : 0;
    gameButton.classList.toggle('flip-svg', checked);
});

// Preview Round Text checkbox - forces gameText visible with
// sample/last content so its position/size/extrusion sliders can be
// tuned live without playing through a round (see the dev-panel row's
// own comment). Unchecking just re-hides it - doesn't try to restore
// whatever real gameplay state was showing before.
wireSyncedCheckboxGroup(['checkboxPreviewRoundText', 'checkboxMobilePreviewRoundText', 'checkboxLandscapePreviewRoundText'], (checked) => {
    if (checked) {
        gameTextLabel.textContent = overrideOr('roundLabel');
        if (!gameTextNumber.textContent) gameTextNumber.textContent = '1';
        gameTextNumber.style.visibility = 'visible';
        gameText.classList.remove('hidden');
    } else {
        gameText.classList.add('hidden');
    }
});

// Preview Win Text checkbox - same idea, forces resultText visible
// in its WIN look (fixed ':)' text, per its own comment in endGame()).
wireSyncedCheckboxGroup(['checkboxPreviewWinText', 'checkboxMobilePreviewWinText', 'checkboxLandscapePreviewWinText'], (checked) => {
    if (checked) {
        resultText.textContent = overrideOr('winSymbol');
        resultText.classList.remove('result-lose');
        resultText.classList.add('result-win');
        resultText.classList.remove('hidden');
        // Also tints Target/Speed/Ms-per-click, same as a real win -
        // per direct report that the Gameplay Win Border/Text color
        // pickers "stay the same color": this was the only way to
        // preview them live without playing a real round, and this
        // checkbox never called the one function that actually
        // applies them (see applyGameplayResultColor()'s own
        // comment on the color-picker side of this same fix).
        applyGameplayResultColor('win');
    } else {
        resultText.classList.add('hidden');
        applyGameplayResultColor(null);
    }
});

// Preview Lose Text checkbox - same idea, forces resultText visible
// in its LOSE look. A real loss shows a randomly-chosen tap-count
// message (e.g. "TOO FAR! (4/3)"), not reproducible here without a
// real round's count/target - uses loseSymbol (':(', TEXT_EDIT_
// TARGETS.resultText's own existing editable slot for the lose
// state, the same one Text Edit Mode already falls back to) as
// stand-in content, good enough for tuning position/size/extrusion/
// letter-spacing without playing a round.
wireSyncedCheckboxGroup(['checkboxPreviewLoseText', 'checkboxMobilePreviewLoseText', 'checkboxLandscapePreviewLoseText'], (checked) => {
    if (checked) {
        resultText.textContent = overrideOr('loseSymbol');
        resultText.classList.remove('result-win');
        resultText.classList.add('result-lose');
        resultText.classList.remove('hidden');
        // See Preview Win Text's own comment just above - same fix.
        applyGameplayResultColor('lose');
    } else {
        resultText.classList.add('hidden');
        applyGameplayResultColor(null);
    }
});

// Preview Start Text / Preview Try Again Text checkboxes - same
// idea, force startButton visible in each of its 2 states. Reuses
// TEXT_EDIT_TARGETS.startButton.render() (the exact same function a
// real state change or a Text Edit Mode commit uses) so the DOM
// content, try-again-state class, and text-align anchors all come
// out identical to the real thing - not a hand-rolled duplicate.
// The 2 controls are mutually exclusive (startButton can only show
// one state at a time) - checking one un-checks every device copy
// of the OTHER control, not just its own same-device sibling,
// since state is shared across devices now (see setAllChecked()).
const PREVIEW_START_TEXT_IDS = ['checkboxPreviewStartText', 'checkboxMobilePreviewStartText', 'checkboxLandscapePreviewStartText'];
const PREVIEW_TRYAGAIN_TEXT_IDS = ['checkboxPreviewTryAgainText', 'checkboxMobilePreviewTryAgainText', 'checkboxLandscapePreviewTryAgainText'];
wireSyncedCheckboxGroup(PREVIEW_START_TEXT_IDS, (checked) => {
    if (checked) {
        setAllChecked(PREVIEW_TRYAGAIN_TEXT_IDS, false);
        TEXT_EDIT_TARGETS.startButton.render('startLabel');
        startButton.classList.remove('hidden');
    } else {
        startButton.classList.add('hidden');
    }
});
wireSyncedCheckboxGroup(PREVIEW_TRYAGAIN_TEXT_IDS, (checked) => {
    if (checked) {
        setAllChecked(PREVIEW_START_TEXT_IDS, false);
        TEXT_EDIT_TARGETS.startButton.render('tryAgainLabel');
        startButton.classList.remove('hidden');
        startTryAgainFlash();
    } else {
        startButton.classList.add('hidden');
        stopTryAgainFlash();
    }
});

wireSyncedCheckboxGroup(['checkboxShowTopDebugLines', 'checkboxMobileShowTopDebugLines', 'checkboxLandscapeShowTopDebugLines'], () => {
    updateTopDebugLines();
});

// Text Edit Mode's checkbox-group wiring removed 2026-09-16 - it's
// now a direct header icon button (#devTextEditModeBtn, see
// setupDevHeaderIconButtons()), not backed by any checkbox.

// Manually replays the round-change blink sequence (see
// runRoundBlinkSequence()) without needing to actually play through
// a round - per explicit request for a dedicated trigger button.
// Advances to the next number each press (wrapping isn't needed -
// this is a dev-only demo, not real round state) so repeated presses
// give a natural incrementing preview.
// Deliberately NOT a call to the real runRoundBlinkSequence() -
// that function ends by calling showTargetAndSpeed(), which would
// roll a real target/speed and unhide the gameplay HUD as a side
// effect of what's meant to be a pure visual preview. This replays
// the exact same phase list standalone, with no gameplay effects.
function triggerRoundTextFlash() {
    gameTextLabel.textContent = overrideOr('roundLabel');
    gameText.classList.remove('hidden');
    const current = parseInt(gameTextNumber.textContent, 10) || 0;
    const nextNum = current + 1;
    const phases = [
        { visible: false, ms: cssVars['--round-blink1-hide-ms'] },
        { visible: true, ms: cssVars['--round-blink1-show-ms'] },
        { visible: false, ms: cssVars['--round-blink2-hide-ms'] },
        { visible: true, ms: cssVars['--round-blink2-show-ms'] },
        { visible: false, ms: cssVars['--round-blink3-hide-ms'] },
        { visible: true, ms: cssVars['--round-blink3-show-ms'] },
        { visible: false, ms: cssVars['--round-blink4-hide-ms'] },
    ];
    let i = 0;
    function step() {
        if (i >= phases.length) {
            gameTextNumber.textContent = nextNum;
            gameTextNumber.style.visibility = 'visible';
            return;
        }
        const phase = phases[i++];
        gameTextNumber.style.visibility = phase.visible ? 'visible' : 'hidden';
        setTimeout(step, phase.ms);
    }
    step();
}

// Wires the built-in "Dev Panel" panel-styling controls - bypasses
// the generic cssVars/CSS_VAR_SLIDER_MAP mechanism deliberately,
// since these are keyed by which TAB is being viewed, not by
// isMobileActive() like everything that mechanism otherwise
// handles. Opacity + the 4 colors are desktop-only (see
// DEV_PANEL_STYLE_SHARED_KEYS/applyDevPanelOwnStyling) - no Mobile
// id to wire for those, unlike the per-tab font-size/button-height
// controls below.
function setupDevPanelStyleControls() {
    const sliderKeys = [
        ['titleFontSize', 'sliderDevPanelTitleFontSize', 'sliderMobileDevPanelTitleFontSize', 'sliderLandscapeDevPanelTitleFontSize'],
        ['tabFontSize', 'sliderDevTabFontSize', 'sliderMobileDevTabFontSize', 'sliderLandscapeDevTabFontSize'],
        ['groupTitleFontSize', 'sliderDevGroupTitleFontSize', 'sliderMobileDevGroupTitleFontSize', 'sliderLandscapeDevGroupTitleFontSize'],
        ['settingTitleFontSize', 'sliderDevSettingTitleFontSize', 'sliderMobileDevSettingTitleFontSize', 'sliderLandscapeDevSettingTitleFontSize'],
        ['buttonTextBorder', 'sliderDevButtonTextBorder', 'sliderMobileDevButtonTextBorder', 'sliderLandscapeDevButtonTextBorder'],
        ['scrollStrength', 'sliderDevScrollStrength', 'sliderMobileDevScrollStrength', 'sliderLandscapeDevScrollStrength'],
        ['buttonHeight', 'sliderDevButtonHeight', 'sliderMobileDevButtonHeight', 'sliderLandscapeDevButtonHeight'],
        ['buttonTextLetterSpacing', 'sliderDevButtonTextLetterSpacing', null, null],
        ['tabTextLetterSpacing', 'sliderDevTabTextLetterSpacing', null, null],
        ['groupTextLetterSpacing', 'sliderDevGroupTextLetterSpacing', null, null],
        ['settingsTextLetterSpacing', 'sliderDevSettingsTextLetterSpacing', null, null],
        ['valueFontSize', 'sliderDevValueFontSize', 'sliderMobileDevValueFontSize', 'sliderLandscapeDevValueFontSize'],
        ['titleLetterSpacing', 'sliderDevPanelTitleLetterSpacing', 'sliderMobileDevPanelTitleLetterSpacing', 'sliderLandscapeDevPanelTitleLetterSpacing'],
        ['titleLineHeight', 'sliderDevPanelTitleLineHeight', 'sliderMobileDevPanelTitleLineHeight', 'sliderLandscapeDevPanelTitleLineHeight'],
        ['tabLineHeight', 'sliderDevTabLineHeight', 'sliderMobileDevTabLineHeight', 'sliderLandscapeDevTabLineHeight'],
        ['buttonFontSize', 'sliderDevButtonFontSize', 'sliderMobileDevButtonFontSize', 'sliderLandscapeDevButtonFontSize'],
        ['buttonLineHeight', 'sliderDevButtonLineHeight', 'sliderMobileDevButtonLineHeight', 'sliderLandscapeDevButtonLineHeight'],
        ['settingsLineHeight', 'sliderDevSettingsLineHeight', 'sliderMobileDevSettingsLineHeight', 'sliderLandscapeDevSettingsLineHeight'],
        ['groupLineHeight', 'sliderDevGroupLineHeight', 'sliderMobileDevGroupLineHeight', 'sliderLandscapeDevGroupLineHeight'],
    ];
    sliderKeys.forEach(([key, deskId, mobId, landId]) => {
        const deskEl = document.getElementById(deskId);
        if (deskEl) deskEl.addEventListener('input', (e) => {
            devPanelStyle[key] = parseFloat(e.target.value);
            applyDevPanelOwnStyling('desktop');
            const valEl = document.getElementById(deskId.replace('slider', 'value'));
            if (valEl) valEl.textContent = e.target.value;
        });
        const mobEl = document.getElementById(mobId);
        if (mobEl) mobEl.addEventListener('input', (e) => {
            mobileDevPanelStyle[key] = parseFloat(e.target.value);
            applyDevPanelOwnStyling('mobile');
            const valEl = document.getElementById(mobId.replace('slider', 'value'));
            if (valEl) valEl.textContent = e.target.value;
        });
        const landEl = document.getElementById(landId);
        if (landEl) landEl.addEventListener('input', (e) => {
            landscapeDevPanelStyle[key] = parseFloat(e.target.value);
            applyDevPanelOwnStyling('landscape');
            const valEl = document.getElementById(landId.replace('slider', 'value'));
            if (valEl) valEl.textContent = e.target.value;
        });
    });

    const deskOnlySliderEl = document.getElementById('sliderDevPanelOpacity');
    if (deskOnlySliderEl) deskOnlySliderEl.addEventListener('input', (e) => {
        devPanelStyle.opacity = parseFloat(e.target.value);
        applyDevPanelOwnStyling(true);
        const valEl = document.getElementById('valueDevPanelOpacity');
        if (valEl) valEl.textContent = e.target.value;
    });

    const colorKeys = [
        ['bgColor', 'colorDevPanelBg'],
        ['titleTextColor', 'colorDevPanelTitleText'],
        ['nonTitleTextColor', 'colorDevPanelNonTitleText'],
        ['accentColor', 'colorDevPanelAccent'],
        ['sliderColor', 'colorDevPanelSliderColor'],
        ['groupLabelBgColor', 'colorDevPanelGroupLabelBg'],
        ['groupTextColor', 'colorDevPanelGroupText'],
        ['buttonTextColor', 'colorDevPanelButtonText'],
        ['settingNumberColor', 'colorDevPanelSettingNumber'],
        ['tabTextColor', 'colorDevPanelTabText'],
    ];
    colorKeys.forEach(([key, deskId]) => {
        const deskEl = document.getElementById(deskId);
        if (deskEl) deskEl.addEventListener('input', (e) => {
            devPanelStyle[key] = e.target.value;
            applyDevPanelOwnStyling(true);
        });
    });

    const fontFamilyEl = document.getElementById('selectDevPanelFontFamily');
    if (fontFamilyEl) fontFamilyEl.addEventListener('change', (e) => {
        devPanelStyle.fontFamily = e.target.value;
        applyDevPanelOwnStyling(true);
    });

    const capsCheckboxKeys = [
        ['capsButtonText', 'checkboxDevCapsButtonText'],
        ['capsTabText', 'checkboxDevCapsTabText'],
        ['capsGroupNames', 'checkboxDevCapsGroupNames'],
        ['capsSettingsText', 'checkboxDevCapsSettingsText'],
        ['titleCapitalize', 'checkboxDevCapsTitleText'],
        ['titleBold', 'checkboxDevBoldTitle'],
        ['tabBold', 'checkboxDevBoldTab'],
        ['buttonBold', 'checkboxDevBoldButton'],
        ['settingsBold', 'checkboxDevBoldSettings'],
        ['groupBold', 'checkboxDevBoldGroup'],
    ];
    capsCheckboxKeys.forEach(([key, deskId]) => {
        const deskEl = document.getElementById(deskId);
        if (deskEl) deskEl.addEventListener('change', (e) => {
            devPanelStyle[key] = e.target.checked;
            applyDevPanelOwnStyling(true);
        });
    });

    // Scroll Strength - overflow:auto's native scroll speed isn't
    // CSS-tunable, so a manual wheel handler scales the delta
    // instead. Desktop/mobile each apply their own tab's own
    // scrollStrength (per-tab setting, see devPanelStyle above) to
    // whichever scroll container is actually visible.
    const devScrollContent = document.querySelector('.dev-panel-scroll-content');
    if (devScrollContent) devScrollContent.addEventListener('wheel', (e) => {
        const isDesktopTab = !document.getElementById('desktopTabContent').classList.contains('hidden');
        const strength = (isDesktopTab ? devPanelStyle : mobileDevPanelStyle).scrollStrength;
        if (strength === 1) return; // native speed - let the browser handle it natively
        e.preventDefault();
        devScrollContent.scrollTop += e.deltaY * strength;
    }, { passive: false });
}

// The round-breakdown panel's and dev panel's left/top(/height)
// defaults are sentinels (picked before any real viewport was
// known), resolved into real viewport-safe numbers here - but ONLY
// when a value still exactly matches its untouched literal
// sentinel, so a real saved/dragged position (from loadSettings())
// is never overwritten. Extracted into its own function since it
// now has to run twice: once synchronously below (so first paint -
// before loadSettings()'s fetch resolves - never shows a literal
// unresolved sentinel like left:-1px) and once again after
// loadSettings() completes (to correctly no-op past whatever it
// just restored, or resolve fresh if it restored nothing).
function resolvePositionSentinels() {
    // Round Breakdown's own sentinel-resolution block used to live
    // here (converting a placeholder px default into a real
    // viewport-safe number at load time) - removed now that X/Y/
    // Width/Height are vw/vh-native (per direct request - see
    // .round-breakdown-panel's own CSS comment): a vw/vh default is
    // ALREADY viewport-relative/safe by construction, so there's no
    // "sentinel" left to resolve.
    // Dev panel: same sentinel-default pattern, reproducing its old
    // fixed right:0/top:0/bottom:0 CSS anchor as real numbers.
    if (cssVars['--dev-panel-left-px'] === -1 && cssVars['--dev-panel-top-px'] === -1 && cssVars['--dev-panel-height-px'] === -1) {
        cssVars['--dev-panel-left-px'] = Math.max(0, window.innerWidth - cssVars['--dev-panel-width-px']);
        cssVars['--dev-panel-top-px'] = 0;
        cssVars['--dev-panel-height-px'] = window.innerHeight;
    }
}

// Initialize
// renderGameMechanicsControls() is deliberately NOT deferred into
// ensureDevPanelBuilt() below with the other 8 render*Controls()
// calls - a real, gameplay-breaking bug found via live testing:
// startGame()/endGame()'s lose branch both read
// gameState.maxTimeMs directly from document.getElementById(
// 'sliderStartingSpeed').value (a Game Mechanics control) as their
// actual source of truth, not from a separate JS default - a real
// player who never opens the dev panel would otherwise be unable
// to start a game at all. Kept eager and unconditional, for every
// visitor, matching its original pre-lazy-build behavior exactly -
// only 13 Desktop-only controls, a small, cheap exception that
// doesn't meaningfully change the overall win (686 total controls,
// minus these 13, still lazy for everyone who isn't isDevAllowed).
renderGameMechanicsControls();
// renderClickBurstTextInputControls() gets the EXACT same eager
// exception as renderGameMechanicsControls() directly above, for
// the identical reason - found live (2026-09-20, direct report: "I
// click start, it doesn't register if I won or lose... I can just
// keep clicking forever and nothing happens. The click frames also
// don't show", non-dev/production build only). Root cause:
// spawnClickBurst() -> spawnClickBurstSide() reads
// document.getElementById(floorId/ceilingId).value (the Left/Right
// Floor/Ceiling Angle inputs this function builds) as gameplay
// source of truth on EVERY tap, unconditionally - for a non-dev
// visitor, these controls were lazy (only built by
// ensureDevPanelBuilt(), which per line ~19217 only ever runs when
// isDevAllowed), so document.getElementById(...) returned null and
// .value threw INSIDE handleGameButtonPress(), before
// totalClickCount++ - killing the click burst AND all round
// progression in the same uncaught exception, for every real
// player, every tap. Confirmed via direct reproduction on the live
// production site (isDevAllowed: false): inputClickBurstLeftFloorDeg
// was null, spawnClickBurst() threw "Cannot read properties of
// null (reading 'value')", tap count never incremented. The
// now-duplicate call inside ensureDevPanelBuilt() below was removed
// (calling this twice would create duplicate-id DOM elements).
renderClickBurstTextInputControls();
// Lazy dev-panel build - per direct request ("what does it take...
// go for it" after a load-time investigation measured a consistent
// ~780-880ms gap between the HTML finishing download and
// domInteractive, root-caused to these 9 render*Controls() calls
// unconditionally building 686 DOM elements - sliders/color
// pickers/selects/checkboxes across all 3 device tabs - via
// synchronous createElement/appendChild, for EVERY visitor,
// including real players who never open the panel (isDevAllowed
// only hid it with CSS afterward, never skipped building it).
// ensureDevPanelBuilt() now defers every piece of setup that
// depends on those generated rows actually existing - called from
// the D-key handler and the DEV toggle button's own onclick, the
// first (and only the first) time either is used, so the cost is
// paid once, on demand, by whoever actually opens the panel,
// instead of unconditionally by everyone on every load.
//
// What stays EAGER below (deliberately NOT moved into
// ensureDevPanelBuilt(), and why): setupTextEditMode() wires
// TEXT_EDIT_TARGETS - real GAME elements (startButton,
// gameTextLabel, resultText, targetCount*, highScoreLabel, etc.),
// zero dependency on the panel's generated rows.
// setupTextEditPanelTriggers() and setupDevPanelTextEdit() only
// need the panel's SECTION-TITLE shell (data-text-edit-target/
// data-sid), which is static HTML present from first paint -
// setupDevPanelTextEdit() specifically uses one delegated listener
// on #devPanel itself, so it correctly catches clicks on rows
// added later by ensureDevPanelBuilt() too, no re-wiring needed.
// resolvePositionSentinels()/applyActiveVars()/applyExtrusionStyles()
// touch only cssVars/extrusionVars and real game elements (the
// dev-panel-position sentinel resolution is a plain object-property
// check, not DOM). All 4 stay in their original relative order below.
// devPanelBuilt itself is declared at the very TOP of this script,
// not here - see that declaration's own comment for why.
// ================================================================
// MOUSE LOG (built-in "Debug" group feature) - ported from the
// shared .claude/TEMPLATE_DEV_PANEL.html, 2026-09-14. A live log
// of mouse/touch position, click type, and what it hit - per
// direct request. Referenced DickoClicko's own "CLICK LOG"
// (structured {event,data} pairs, clipboard-only) and Handy
// Dandies' own "Mouse Tracking Log" (Debug-group placement, a
// sampling-interval slider) - this version extends past both:
// touch gesture classification (tap/double-tap/long-press/swipe/
// pinch), device/viewport context entries, and a Save-to-file
// export.
//
// SINGLE INSTANCE, Desktop-tab only - one real mouse/touch input
// stream regardless of which tab is showing.
//
// Placement: unlike the template (which has a static built-in
// "Debug" group), Clicko's own "DEBUG" group already exists as a
// real, user-created custom group (its stable internal data-sid
// is "New Group (17)", renamed to "DEBUG" via devTextOverrides) -
// resolveDebugGroupSid() finds it by CURRENT override text rather
// than a hardcoded internal key, so this keeps working even if
// the group is ever recreated. Called from both ensureDevPanelBuilt()
// (synchronous, devTextOverrides likely still empty on a brand
// new session - harmlessly no-ops, matching findGroupContent's
// own console.warn-and-return-null behavior) and the async
// settings-load completion (same dual-call-site pattern already
// established for injectGroupLockIcons() - devTextOverrides IS
// populated there, so this is the call that actually succeeds on
// a real page load).
const MOUSE_LOG_MAX_ENTRIES = 500;
const MOUSE_LOG_HOLD_MS = 500;
const MOUSE_LOG_MULTICLICK_MS = 350;
const MOUSE_LOG_MOVE_THRESHOLD_PX = 10;
let mouseLog = [];
let mouseLogEl = null;
let mouseLogPositionEnabled = false;
let mouseLogPositionIntervalMs = 1000;
let mouseLogPositionTimer = null;
// Both default OFF (opt-in), matching Log Mouse Position's own
// default - per direct request ("provide a checkbox to turn on and
// off scroll logging" / "provide a checkbox to log keystrokes
// too"). Scroll events are high-volume/noisy the same way
// continuous position sampling is (a real click log this session
// showed a burst of ~10 scroll entries in under 2s just from
// scrolling the dev panel itself, most of them no-ops); keystrokes
// are additionally privacy-sensitive (could capture real typed
// text in a rename/text box), so opt-in is the more conservative
// default there too.
let mouseLogScrollEnabled = false;
let mouseLogKeystrokesEnabled = false;
let mouseLogLastPointerPos = null;
let mouseLogLastViewport = null;
const mouseLogActivePointers = new Map();
let mouseLogClickCount = 0;
let mouseLogClickTimer = null;
let mouseLogHoldTimer = null;
let mouseLogPinchStartDist = null;
let mouseLogPinchActive = false;

function resolveDebugGroupSid() {
    for (const key in devTextOverrides) {
        if (devTextOverrides[key] === 'DEBUG' && key.indexOf('desktop:') === 0) return key.slice('desktop:'.length);
    }
    return null;
}
function mouseLogDeviceContext() { return isMobileActive() ? 'mobile' : 'desktop'; }
function formatMouseLogTime(d) {
    const pad2 = n => String(n).padStart(2, '0');
    const pad3 = n => String(n).padStart(3, '0');
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + '.' + pad3(d.getMilliseconds());
}
// Reads back the CURRENT value of a form control for the Mouse Log's
// own "what input" detail - per direct request ("when it logs what
// function was triggered. I need more information than just 'set
// dev panel setting'. I need it to say what setting and what
// input."). Only meaningful for actual form controls (range/color/
// text/number inputs, checkboxes, selects) - null for anything
// else (a button, a group title bar), which describeMouseLogTarget
// below then leaves off the log line entirely rather than printing
// a hollow "= null".
function describeMouseLogControlValue(el) {
    if (!el || !el.tagName) return null;
    const tag = el.tagName;
    if (tag === 'SELECT') {
        const opt = el.options[el.selectedIndex];
        return opt ? opt.text : el.value;
    }
    if (tag === 'INPUT') {
        const type = (el.type || '').toLowerCase();
        if (type === 'checkbox') return el.checked ? 'checked' : 'unchecked';
        if (type === 'range' || type === 'number' || type === 'color') return el.value;
        if (type === 'text') return '"' + el.value.slice(0, 30) + '"';
    }
    if (tag === 'TEXTAREA') return '"' + el.value.slice(0, 30) + '"';
    return null;
}
function describeMouseLogTarget(el) {
    if (!el || el === document.documentElement || el === document.body) return { target: '(background)', triggered: false };
    const inPanel = el.closest && el.closest('.dev-panel');
    if (inPanel) {
        const row = el.closest('.dev-row');
        const label = row && row.querySelector('.dev-label');
        const btn = el.closest('button');
        const titleEl = el.closest('.dev-section-title');
        const name = label ? label.textContent.trim() : btn ? btn.textContent.trim() : titleEl ? '(group) ' + titleEl.textContent.replace(/^[▼▶]\s*/, '').trim() : (el.id || el.tagName.toLowerCase());
        const interactive = !!(btn || titleEl || el.matches('input, select, textarea, [onclick]'));
        // The actual form control a row's own value lives on isn't
        // always e.target itself (a slider's wheel/click can land on
        // its .dev-label instead) - fall back to the row's own
        // control when el itself isn't one.
        const control = el.matches('input, select, textarea') ? el : (row && row.querySelector('input, select, textarea'));
        const value = describeMouseLogControlValue(control);
        return { target: 'Dev Panel: ' + name + (value !== null ? ' = ' + value : ''), triggered: interactive };
    }
    const interactiveEl = el.closest && el.closest('button, a[href], input, select, textarea, [onclick], label');
    if (interactiveEl) {
        const id = interactiveEl.id ? '#' + interactiveEl.id : '';
        const text = (interactiveEl.textContent || '').trim().slice(0, 30);
        return { target: 'App: ' + interactiveEl.tagName.toLowerCase() + id + (text ? ' "' + text + '"' : ''), triggered: true };
    }
    const id = el.id ? '#' + el.id : '';
    const cls = el.className && typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '';
    return { target: 'App: ' + el.tagName.toLowerCase() + id + cls, triggered: false };
}
function renderMouseLogEntry(entry) {
    if (!mouseLogEl) return;
    const empty = mouseLogEl.querySelector('.dev-mouse-log-empty');
    if (empty) empty.remove();
    const line = document.createElement('div');
    let text = entry.time + '  [' + entry.device + '/' + entry.pointerType + ']  ' + entry.type + '  (' + entry.x + ', ' + entry.y + ')';
    if (entry.target) text += '  -> ' + entry.target;
    if (entry.triggered === true) text += '  [OK]';
    else if (entry.triggered === false) text += '  [no-op]';
    if (entry.detail) text += '  ' + entry.detail;
    line.textContent = text;
    mouseLogEl.appendChild(line);
    while (mouseLogEl.children.length > MOUSE_LOG_MAX_ENTRIES) mouseLogEl.removeChild(mouseLogEl.firstChild);
    mouseLogEl.scrollTop = mouseLogEl.scrollHeight;
}
function pushMouseLogEntry(entry) {
    entry.time = formatMouseLogTime(new Date());
    mouseLog.push(entry);
    if (mouseLog.length > MOUSE_LOG_MAX_ENTRIES) mouseLog.shift();
    renderMouseLogEntry(entry);
}
function logMouseLogContext(reason) {
    const w = window.innerWidth, h = window.innerHeight;
    if (reason === 'resize' && mouseLogLastViewport && mouseLogLastViewport.w === w && mouseLogLastViewport.h === h) return;
    mouseLogLastViewport = { w, h };
    pushMouseLogEntry({
        type: 'context', x: '-', y: '-', device: mouseLogDeviceContext(), pointerType: '-',
        target: null, triggered: null,
        detail: reason + ': ' + w + 'x' + h + ' dpr:' + (window.devicePixelRatio || 1).toFixed(2),
    });
}
function clearMouseLog() {
    mouseLog = [];
    if (mouseLogEl) {
        mouseLogEl.innerHTML = '';
        const empty = document.createElement('div');
        empty.className = 'dev-mouse-log-empty';
        empty.textContent = '(no mouse activity logged yet)';
        mouseLogEl.appendChild(empty);
    }
    mouseLogLastViewport = null;
}
function mouseLogEntryToLine(e) {
    let text = e.time + '  [' + e.device + '/' + e.pointerType + ']  ' + e.type + '  (' + e.x + ', ' + e.y + ')';
    if (e.target) text += '  -> ' + e.target;
    if (e.triggered === true) text += '  [OK]';
    else if (e.triggered === false) text += '  [no-op]';
    if (e.detail) text += '  ' + e.detail;
    return text;
}
function copyMouseLog(btn) {
    const text = mouseLog.map(mouseLogEntryToLine).join('\n');
    const flash = (msg) => { const orig = btn.textContent; btn.textContent = msg; setTimeout(() => { btn.textContent = orig; }, 900); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => flash('Copied!')).catch(() => flash('Copy failed'));
    } else {
        flash('Copy failed');
    }
}
function saveMouseLog() {
    const header = '# Mouse Log\n\n' + mouseLog.filter(e => e.type === 'context').map(mouseLogEntryToLine).join('\n') + '\n\n';
    const body = mouseLog.map(e => '- ' + mouseLogEntryToLine(e)).join('\n');
    const md = header + body + '\n';
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = 'mouse-log-' + stamp + '.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
function restartMouseLogPositionTimer() {
    clearInterval(mouseLogPositionTimer);
    mouseLogPositionTimer = null;
    if (!mouseLogPositionEnabled) return;
    mouseLogPositionTimer = setInterval(() => {
        if (!mouseLogLastPointerPos) return;
        pushMouseLogEntry({
            type: 'position', x: mouseLogLastPointerPos.x, y: mouseLogLastPointerPos.y,
            device: mouseLogDeviceContext(), pointerType: mouseLogLastPointerPos.pointerType || '-',
            target: null, triggered: null,
        });
    }, mouseLogPositionIntervalMs);
}
function buildMouseLogWidget() {
    if (mouseLogEl) return;
    const debugSid = resolveDebugGroupSid();
    if (!debugSid) return;
    const debugContent = findGroupContent('desktop', debugSid, 'buildMouseLogWidget', 'mouseLogWidget');
    if (!debugContent) return;
    const section = createDevGroupElement('Mouse Log');
    debugContent.appendChild(section);
    const content = section.querySelector(':scope > .dev-section-content');

    const posRow = document.createElement('div');
    posRow.className = 'dev-row';
    const posCheckbox = document.createElement('input');
    posCheckbox.type = 'checkbox';
    posCheckbox.id = 'checkboxMouseLogPosition';
    const posLabel = document.createElement('span');
    posLabel.className = 'dev-label';
    posLabel.textContent = 'Log Mouse Position (continuous)';
    posRow.append(posCheckbox, posLabel);
    content.appendChild(posRow);
    posCheckbox.addEventListener('change', (e) => {
        mouseLogPositionEnabled = e.target.checked;
        restartMouseLogPositionTimer();
    });

    const sliderRow = document.createElement('div');
    sliderRow.className = 'dev-row';
    const sliderLabel = document.createElement('span');
    sliderLabel.className = 'dev-label';
    sliderLabel.textContent = 'Position Log Interval (Ms):';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'dev-slider';
    slider.id = 'sliderMouseLogInterval';
    slider.min = '100'; slider.max = '5000'; slider.step = '50'; slider.value = String(mouseLogPositionIntervalMs);
    const sliderVal = document.createElement('span');
    sliderVal.className = 'dev-value';
    sliderVal.id = 'valueMouseLogInterval';
    sliderVal.textContent = String(mouseLogPositionIntervalMs);
    sliderRow.append(sliderLabel, slider, sliderVal);
    content.appendChild(sliderRow);
    slider.addEventListener('input', (e) => {
        mouseLogPositionIntervalMs = parseFloat(e.target.value);
        sliderVal.textContent = e.target.value;
        restartMouseLogPositionTimer();
    });

    const scrollRow = document.createElement('div');
    scrollRow.className = 'dev-row';
    const scrollCheckbox = document.createElement('input');
    scrollCheckbox.type = 'checkbox';
    scrollCheckbox.id = 'checkboxMouseLogScroll';
    const scrollLabel = document.createElement('span');
    scrollLabel.className = 'dev-label';
    scrollLabel.textContent = 'Log Scroll';
    scrollRow.append(scrollCheckbox, scrollLabel);
    content.appendChild(scrollRow);
    scrollCheckbox.addEventListener('change', (e) => { mouseLogScrollEnabled = e.target.checked; });

    const keyRow = document.createElement('div');
    keyRow.className = 'dev-row';
    const keyCheckbox = document.createElement('input');
    keyCheckbox.type = 'checkbox';
    keyCheckbox.id = 'checkboxMouseLogKeystrokes';
    const keyLabel = document.createElement('span');
    keyLabel.className = 'dev-label';
    keyLabel.textContent = 'Log Keystrokes';
    keyRow.append(keyCheckbox, keyLabel);
    content.appendChild(keyRow);
    keyCheckbox.addEventListener('change', (e) => { mouseLogKeystrokesEnabled = e.target.checked; });

    const btnRow = document.createElement('div');
    btnRow.className = 'dev-buttons';
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.textContent = 'COPY';
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'SAVE';
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = 'CLEAR';
    btnRow.append(copyBtn, saveBtn, clearBtn);
    content.appendChild(btnRow);
    copyBtn.addEventListener('click', () => copyMouseLog(copyBtn));
    saveBtn.addEventListener('click', saveMouseLog);
    clearBtn.addEventListener('click', clearMouseLog);

    mouseLogEl = document.createElement('div');
    mouseLogEl.className = 'dev-mouse-log';
    content.appendChild(mouseLogEl);
    clearMouseLog();
    logMouseLogContext('start');
}
// Clear Highscore button (Debug group) - per direct request ("add
// a 'Clear Highscore' button"). A plain trigger button directly in
// the Debug group's own content, not a nested subgroup (unlike
// Mouse Log above) - same idempotent-by-id-check + resolveDebugGroupSid()/
// findGroupContent() lookup + dual sync/async call-site pattern as
// buildMouseLogWidget() (see that function's own top comment for
// why 2 call sites are needed - devTextOverrides may still be
// empty on the synchronous one).
function buildClearHighScoreButton() {
    if (document.getElementById('btnClearHighScore')) return;
    const debugSid = resolveDebugGroupSid();
    if (!debugSid) return;
    const debugContent = findGroupContent('desktop', debugSid, 'buildClearHighScoreButton', 'btnClearHighScore');
    if (!debugContent) return;
    const row = document.createElement('div');
    row.className = 'dev-row';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dev-trigger-btn';
    btn.id = 'btnClearHighScore';
    btn.textContent = 'Clear Highscore';
    btn.addEventListener('click', clearHighScore);
    row.appendChild(btn);
    debugContent.appendChild(row);
}
function setupMouseLog() {
    if (setupMouseLog._done) return;
    setupMouseLog._done = true;
    window.addEventListener('pointermove', (e) => {
        mouseLogLastPointerPos = { x: Math.round(e.clientX), y: Math.round(e.clientY), pointerType: e.pointerType };
        const info = mouseLogActivePointers.get(e.pointerId);
        if (!info) return;
        info.curX = e.clientX; info.curY = e.clientY;
        if (!info.moved && Math.hypot(e.clientX - info.startX, e.clientY - info.startY) > MOUSE_LOG_MOVE_THRESHOLD_PX) info.moved = true;
    });
    window.addEventListener('pointerdown', (e) => {
        mouseLogActivePointers.set(e.pointerId, { startX: e.clientX, startY: e.clientY, curX: e.clientX, curY: e.clientY, startTime: performance.now(), moved: false, target: e.target });
        if (e.pointerType === 'touch' && mouseLogActivePointers.size === 2) {
            const pts = Array.from(mouseLogActivePointers.values());
            mouseLogPinchStartDist = Math.hypot(pts[0].curX - pts[1].curX, pts[0].curY - pts[1].curY);
            mouseLogPinchActive = true;
            clearTimeout(mouseLogHoldTimer);
            return;
        }
        if (e.button === 2 || mouseLogActivePointers.size > 1) return;
        clearTimeout(mouseLogHoldTimer);
        mouseLogHoldTimer = setTimeout(() => {
            const info2 = mouseLogActivePointers.get(e.pointerId);
            if (info2 && !info2.moved) {
                const { target, triggered } = describeMouseLogTarget(e.target);
                pushMouseLogEntry({ type: 'hold', x: Math.round(e.clientX), y: Math.round(e.clientY), device: mouseLogDeviceContext(), pointerType: e.pointerType, target, triggered });
            }
        }, MOUSE_LOG_HOLD_MS);
    });
    window.addEventListener('pointerup', (e) => {
        clearTimeout(mouseLogHoldTimer);
        const info = mouseLogActivePointers.get(e.pointerId);
        const wasPinching = mouseLogPinchActive && mouseLogActivePointers.size === 2;
        mouseLogActivePointers.delete(e.pointerId);
        if (!info) return;
        const x = Math.round(e.clientX), y = Math.round(e.clientY);
        const device = mouseLogDeviceContext();
        if (wasPinching) {
            mouseLogPinchActive = false;
            const remaining = Array.from(mouseLogActivePointers.values())[0];
            if (remaining && mouseLogPinchStartDist) {
                const endDist = Math.hypot(x - remaining.curX, y - remaining.curY);
                const scale = mouseLogPinchStartDist > 0 ? endDist / mouseLogPinchStartDist : 1;
                pushMouseLogEntry({ type: 'pinch', x, y, device, pointerType: 'touch', target: null, triggered: null, detail: (scale > 1 ? 'out' : 'in') + ' scale:' + scale.toFixed(2) });
            }
            return;
        }
        const heldMs = performance.now() - info.startTime;
        // Deferred one macrotask (setTimeout 0), not called
        // synchronously here - per direct request for the log to
        // include the actual value/input a setting was changed to,
        // not just its name. A checkbox's own `checked` flip (and a
        // native <select>'s selection) happens as part of the
        // browser's default click handling, which runs AFTER
        // 'pointerup' has already fired - reading el.checked/value
        // synchronously at this point would still show the OLD,
        // pre-click state. Range/color/text inputs update .value
        // live as you interact, so this costs them nothing; it's
        // what makes checkbox/select values come out correct.
        setTimeout(() => {
        const { target, triggered } = describeMouseLogTarget(info.target);
        if (e.pointerType === 'touch') {
            if (info.moved) {
                const dx = e.clientX - info.startX, dy = e.clientY - info.startY;
                const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
                pushMouseLogEntry({ type: 'swipe', x, y, device, pointerType: 'touch', target, triggered, detail: 'dir:' + dir + ' dist:' + Math.round(Math.hypot(dx, dy)) });
                return;
            }
            if (heldMs > MOUSE_LOG_HOLD_MS) return;
            mouseLogClickCount++;
            clearTimeout(mouseLogClickTimer);
            mouseLogClickTimer = setTimeout(() => {
                pushMouseLogEntry({ type: mouseLogClickCount >= 2 ? 'doubletap' : 'tap', x, y, device, pointerType: 'touch', target, triggered });
                mouseLogClickCount = 0;
            }, MOUSE_LOG_MULTICLICK_MS);
            return;
        }
        if (e.button === 2) {
            pushMouseLogEntry({ type: 'rightclick', x, y, device, pointerType: e.pointerType, target, triggered });
            return;
        }
        if (info.moved) {
            pushMouseLogEntry({ type: 'drag-release', x, y, device, pointerType: e.pointerType, target, triggered, detail: 'heldMs:' + Math.round(heldMs) });
            return;
        }
        if (heldMs > MOUSE_LOG_HOLD_MS) {
            pushMouseLogEntry({ type: 'release', x, y, device, pointerType: e.pointerType, target, triggered, detail: 'heldMs:' + Math.round(heldMs) });
            return;
        }
        mouseLogClickCount++;
        clearTimeout(mouseLogClickTimer);
        mouseLogClickTimer = setTimeout(() => {
            const kind = mouseLogClickCount >= 3 ? 'tripleclick' : mouseLogClickCount === 2 ? 'dblclick' : 'click';
            pushMouseLogEntry({ type: kind, x, y, device, pointerType: e.pointerType, target, triggered });
            mouseLogClickCount = 0;
        }, MOUSE_LOG_MULTICLICK_MS);
        }, 0);
    });
    window.addEventListener('pointercancel', (e) => {
        clearTimeout(mouseLogHoldTimer);
        mouseLogActivePointers.delete(e.pointerId);
        mouseLogPinchActive = false;
    });
    window.addEventListener('wheel', (e) => {
        if (!mouseLogScrollEnabled) return;
        const { target, triggered } = describeMouseLogTarget(e.target);
        pushMouseLogEntry({ type: 'scroll', x: Math.round(e.clientX), y: Math.round(e.clientY), device: mouseLogDeviceContext(), pointerType: 'wheel', target, triggered, detail: 'deltaY:' + Math.round(e.deltaY) });
    }, { passive: true });
    window.addEventListener('keydown', (e) => {
        if (!mouseLogKeystrokesEnabled) return;
        const { target, triggered } = describeMouseLogTarget(e.target);
        pushMouseLogEntry({ type: 'keydown', x: '-', y: '-', device: mouseLogDeviceContext(), pointerType: 'keyboard', target, triggered, detail: 'key:' + e.key });
    });
    window.addEventListener('resize', () => { if (mouseLogEl) logMouseLogContext('resize'); });
}

function ensureDevPanelBuilt() {
    if (devPanelBuilt) return;
    // Set at the END of this function, not here - if anything
    // inside throws partway through, devPanelBuilt staying false
    // means the NEXT call (e.g. a later D-press) retries the whole
    // build instead of being permanently stuck half-built forever
    // (setting this flag first, before the work runs, was a real
    // bug: a mid-build exception left it true while the panel was
    // still genuinely incomplete).
    renderDesktopUniformControls();
    renderMobileUniformControls();
    renderLandscapeUniformControls();
    // MUST run after all 3 renders above - see syncDynamicDeviceRows()'s
    // own comment for why (Mobile/Landscape's static rows have to
    // already exist before this checks what's missing).
    syncDynamicDeviceRows();
    renderCompoundOffsetControls();
    renderDevPanelStyleControls();
    // Mouse Log's own widget/listeners - see that section's own
    // top comment for why this is called from both here AND the
    // async settings-load completion below.
    buildMouseLogWidget();
    setupMouseLog();
    // Clear Highscore button - same dual-call-site reasoning.
    buildClearHighScoreButton();
    renderSpecialColorControls();
    renderDevPanelMiscControls();
    // renderClickBurstTextInputControls() moved to the eager,
    // unconditional Initialize block (~line 18430, next to
    // renderGameMechanicsControls()) - see that call site's own
    // comment. Calling it again here would create duplicate-id DOM
    // elements.
    setupDevPanelStyleControls();
    // Blend Mode dropdowns (Button/Base Color) - per explicit
    // request. cssVars-backed (single/shared, like Light
    // Levels/Base Color itself), not a .dev-slider/.dev-color-
    // picker, so wired directly here rather than through either
    // of those generic loops.
    (function setupBlendModeSelects() {
        const baseEl = document.getElementById('selectBaseBlendMode');
        if (baseEl) baseEl.addEventListener('change', (e) => {
            cssVars['--base-blend-mode'] = e.target.value;
            applyActiveVars();
        });
        const buttonEl = document.getElementById('selectButtonBlendMode');
        if (buttonEl) buttonEl.addEventListener('change', (e) => {
            cssVars['--button-blend-mode'] = e.target.value;
            applyActiveVars();
        });
    })();
    applyDevPanelOwnStyling(true);
    setupDevSliders();
    // Sync every generated slider/color-picker's DOM value from
    // the live state objects (cssVars/extrusionVars/etc.) right
    // now - correct regardless of whether this runs before or
    // after loadSettings()'s async fetch resolves, since those
    // objects are the real source of truth either way (see the
    // devPanelBuilt check added to the async settings callback
    // below, for the case where the panel is opened BEFORE the
    // fetch resolves and needs a follow-up re-sync once it does).
    syncSlidersFromState();
    syncColorPickersFromState();
    syncDevPanelStyleControlsFromState();
    validateDevControlMappings();
    assertDevControlsRendered();
    setupTextAlignSelects();
    setupOffsetUnitCheckboxes();
    setupTextEdgeLockCheckboxes();
    setupClickBurstTextInputs();
    // Hide "Click" (Prefix) / Hide "x" (Suffix) checkboxes - per
    // direct request for checkboxes to independently hide the
    // Target Text's prefix/suffix words. Config-array-built
    // (buildCheckboxRow doesn't auto-wire), so wired here same as
    // the Preview checkboxes' own pattern - moved into
    // ensureDevPanelBuilt() since these 2 specific checkboxes are
    // generated (unlike the static Preview checkboxes), so wiring
    // them eagerly (their original position) threw
    // "addEventListener of null" the instant the panel stopped
    // being built unconditionally on every load.
    document.getElementById('checkboxHideTargetPrefix').addEventListener('change', (e) => {
        cssVars['--target-prefix-hidden'] = e.target.checked ? 1 : 0;
        targetCountPrefix.classList.toggle('hidden', e.target.checked);
    });
    document.getElementById('checkboxHideTargetSuffix').addEventListener('change', (e) => {
        cssVars['--target-suffix-hidden'] = e.target.checked ? 1 : 0;
        targetCountSuffix.classList.toggle('hidden', e.target.checked);
    });
    // Round Breakdown group - same config-array-built-checkboxes-
    // need-manual-wiring reasoning as the 2 above, plus the Font
    // select (not covered by any generic .dev-select handler).
    // checkboxRoundBreakdownEnabled/ResizerEnabled/TitleBold default
    // to CHECKED here (matching this feature's pre-existing always-
    // on/always-bold look) before a real saved setting's own
    // restore (see applyLoadedSettings()'s matching block) can
    // override it.
    document.getElementById('checkboxRoundBreakdownEnabled').checked = true;
    document.getElementById('checkboxRoundBreakdownEnabled').addEventListener('change', (e) => {
        cssVars['--round-breakdown-enabled'] = e.target.checked ? 1 : 0;
        if (!e.target.checked) roundBreakdownPanel.classList.add('hidden');
    });
    document.getElementById('checkboxRoundBreakdownResizerEnabled').checked = true;
    document.getElementById('checkboxRoundBreakdownResizerEnabled').addEventListener('change', (e) => {
        cssVars['--round-breakdown-resizer-enabled'] = e.target.checked ? 1 : 0;
        roundBreakdownResizeHandle.classList.toggle('hidden', !e.target.checked);
    });
    document.getElementById('checkboxRoundBreakdownOutlineEnabled').checked = true;
    document.getElementById('checkboxRoundBreakdownOutlineEnabled').addEventListener('change', (e) => {
        cssVars['--round-breakdown-outline-enabled'] = e.target.checked ? 1 : 0;
        roundBreakdownPanel.classList.toggle('rb-outline-on', e.target.checked);
    });
    document.getElementById('checkboxRoundBreakdownTitleBold').checked = true;
    document.getElementById('checkboxRoundBreakdownTitleBold').addEventListener('change', (e) => {
        cssVars['--round-breakdown-title-bold'] = e.target.checked ? 1 : 0;
        roundBreakdownPanel.classList.toggle('rb-title-bold', e.target.checked);
    });
    document.getElementById('checkboxRoundBreakdownDataBold').addEventListener('change', (e) => {
        cssVars['--round-breakdown-data-bold'] = e.target.checked ? 1 : 0;
        roundBreakdownPanel.classList.toggle('rb-data-bold', e.target.checked);
    });
    document.getElementById('selectRoundBreakdownFont').addEventListener('change', (e) => {
        cssVars['--round-breakdown-font-family'] = e.target.value;
        document.documentElement.style.setProperty('--round-breakdown-font-family', e.target.value);
    });
    document.getElementById('checkboxRoundBreakdownRowLinesEnabled').checked = true;
    document.getElementById('checkboxRoundBreakdownRowLinesEnabled').addEventListener('change', (e) => {
        cssVars['--round-breakdown-row-lines-enabled'] = e.target.checked ? 1 : 0;
        roundBreakdownPanel.classList.toggle('rb-row-lines-on', e.target.checked);
    });
    document.getElementById('checkboxRoundBreakdownScaleWithBrowser').addEventListener('change', (e) => {
        cssVars['--round-breakdown-scale-with-browser'] = e.target.checked ? 1 : 0;
        document.documentElement.style.setProperty('--round-breakdown-scale-with-browser', e.target.checked ? 1 : 0);
    });
    document.getElementById('selectRoundBreakdownAlign').addEventListener('change', (e) => {
        cssVars['--round-breakdown-align'] = e.target.value;
        applyRoundBreakdownPosition();
    });
    document.getElementById('checkboxRoundBreakdownAlignEdgeLock').addEventListener('change', (e) => {
        cssVars['--round-breakdown-align-edge-lock'] = e.target.checked ? 1 : 0;
        applyRoundBreakdownPosition();
    });
    document.getElementById('selectRoundBreakdownValign').addEventListener('change', (e) => {
        cssVars['--round-breakdown-valign'] = e.target.value;
        applyRoundBreakdownPosition();
    });
    document.getElementById('checkboxRoundBreakdownValignEdgeLock').addEventListener('change', (e) => {
        cssVars['--round-breakdown-valign-edge-lock'] = e.target.checked ? 1 : 0;
        applyRoundBreakdownPosition();
    });
    document.getElementById('checkboxRoundBreakdownAutoscrollEnabled').addEventListener('change', (e) => {
        cssVars['--round-breakdown-autoscroll-enabled'] = e.target.checked ? 1 : 0;
        restartRoundBreakdownAutoscroll();
    });
    // No onDrop action needed - the DOM order itself IS the live state;
    // captureSectionOrder() reads it fresh whenever Copy/Save actually run.
    // Counts how many .dev-section ancestors a given .dev-section-
    // content element has within tabRoot - used below to order
    // cross-container drag candidates DEEPEST-first, so
    // setupDragReorder's direct hit-test (`containers.find(c =>
    // pointerY is within c's own rect)`) naturally prefers the most
    // specific (smallest, most nested) container whenever the
    // pointer sits within several nested candidates at once. An
    // outer group's content rect always geometrically contains
    // every one of its own nested groups' content rects (same
    // shape as the tabRoot-vs-top-level bug fixed earlier the same
    // day - see that fix's own history below) - generalized here to
    // every nesting level, not just the top one, now that nesting
    // depth is unbounded (see the group-drag call's own comment).
    function devGroupNestingDepth(contentEl, tabRoot) {
        let depth = 0;
        let cur = contentEl.parentElement;
        while (cur && cur !== tabRoot) {
            if (cur.classList.contains('dev-section')) depth++;
            cur = cur.parentElement;
        }
        return depth;
    }
    // Groups within groups, now UNLIMITED depth - per direct follow-
    // up request ("how hard would it be to allow infinite groups in
    // groups" -> "yes[, implement it]"), lifting the original one-
    // level cap ("make it so that i can have setting groups within
    // setting groups"). Eligible drop targets: tabRoot itself (drag
    // a nested group back out to the top level) plus EVERY group's
    // own content anywhere in the tab, at any depth (nest a group
    // INTO it) - previously restricted to top-level-only content
    // (":scope > .dev-section > .dev-section-content"), which is
    // exactly what made 2+ levels impossible; that restriction is
    // gone now that a depth-sorted hit-test (below) makes it safe to
    // offer every level as a target. Excludes the DRAGGED group's
    // own content AND every one of its descendants' content
    // (`dragging.contains(content)`) - can't nest a group inside
    // itself OR inside its own child, a real cycle risk that
    // couldn't happen under the old 1-level cap (a nested group's
    // content was never offered as a target at all) but has to be
    // checked explicitly now. See setupDragReorder's own comment on
    // why this needs a function instead of the plain-string selector
    // form.
    // tabRoot MUST be last, and every group content candidate MUST
    // be sorted deepest-first before it - per direct report ("it
    // doesnt seem to work") against the ORIGINAL 2-level (tabRoot vs
    // top-level) version of this bug: setupDragReorder's own direct
    // hit-test is `containers.find(c => pointerY is within c's own
    // rect)` - tabRoot's rect always SPANS every nested group's own
    // (much smaller) content rect, since every group is its
    // descendant, so with tabRoot listed first, Array.prototype.
    // find() matched it for every single pointermove of every drag,
    // before a nested group's own smaller rect ever got a chance -
    // making it structurally impossible to ever hit-test into a
    // nested group, 100% of the time, regardless of how precisely
    // the pointer was positioned over it. The SAME shadowing shape
    // recurs at every level once depth is unbounded (a depth-1
    // group's content also fully contains a depth-2 child's own
    // content) - devGroupNestingDepth() above generalizes the fix
    // from "tabRoot last" to "every candidate sorted deepest-first,
    // tabRoot last of all", so find() always prefers the most
    // specific match at whatever depth the pointer actually is,
    // falling through to a shallower (or eventually tabRoot) match
    // only when the pointer is genuinely outside every deeper
    // candidate - which is exactly the un-nest-by-one-or-more-levels
    // case this ordering exists to support.
    // Handle narrowed from the WHOLE title bar ('.dev-section-title')
    // to a dedicated '.dev-group-drag-handle' icon - per direct
    // request, modeled on the Handy Dandies project's own handle-
    // only drag gating ("the settings/group reorder/nesting is only
    // triggered by the icon on the far left... when i click and
    // drag outside that icon, it wont move or nest things"). The
    // title itself keeps its own separate onclick="toggleSection(this)"
    // (collapse/expand) - completely unaffected, since it's now a
    // different element from the drag handle entirely, not a click-
    // vs-drag disambiguation on the SAME element the way it used to
    // be (sectionJustDragged still exists but is no longer the
    // mechanism keeping these apart).
    setupDragReorder('.dev-group-drag-handle', '.dev-section', null, (tabRoot, dragging) => {
        const groupContents = Array.from(tabRoot.querySelectorAll('.dev-section > .dev-section-content'))
            .filter(content => !dragging.contains(content));
        groupContents.sort((a, b) => devGroupNestingDepth(b, tabRoot) - devGroupNestingDepth(a, tabRoot));
        return [...groupContents, tabRoot];
    });
    // Settings-row cross-group drag - per explicit request ("make it
    // so that i can drag settings between groups"). Converted from a
    // plain '.dev-section-content' string selector to the same
    // function form as the group-drag call above, and given the
    // same deepest-first ordering (devGroupNestingDepth()) - a
    // latent instance of the identical shadowing bug (an outer
    // group's content always contains a nested group's own content)
    // was flagged but deliberately left unfixed in 2 earlier same-
    // day commits as a narrower, out-of-scope edge case; now
    // directly in scope, since unlimited group nesting depth is
    // only actually useful if a setting can also be reliably
    // dropped into a DEEPLY nested group, not just a top-level or
    // once-nested one. No cycle check needed here (unlike the group-
    // drag call above) - a setting row is never itself a container,
    // so it can never contain the group it's being dropped into.
    // Handle selector history: originally '.dev-section-content
    // .dev-label' (required the row to already be inside a group),
    // then widened to plain '.dev-label, .dev-trigger-btn' so the
    // ~10 loose top-level rows and every trigger button (a bare
    // <button>, never a .dev-label) could be dragged too. Now
    // narrowed to a single dedicated '.dev-row-drag-handle' icon -
    // per direct request, modeled on the Handy Dandies project's own
    // handle-only drag gating ("when i click and drag outside that
    // icon, it wont move or nest things. I like that."). This also
    // simplifies what used to be real click-vs-drag disambiguation
    // on .dev-trigger-btn itself (a real click had to stay
    // distinguishable from a hold-and-move-past-threshold drag,
    // since both started from the same element) - a trigger
    // button's own onclick now just always fires normally, since
    // dragging can no longer start on the button at all, only on
    // the dedicated handle beside it. injectRowDragHandles() (see
    // its own comment) adds this icon uniformly to every .dev-row,
    // loose or grouped alike, so no ancestor-scoping distinction is
    // needed here either.
    setupDragReorder('.dev-row-drag-handle', '.dev-row', null, (tabRoot, dragging) => {
        const groupContents = Array.from(tabRoot.querySelectorAll('.dev-section-content'));
        groupContents.sort((a, b) => devGroupNestingDepth(b, tabRoot) - devGroupNestingDepth(a, tabRoot));
        return groupContents;
    });
    // After the drag-reorder wiring above (icons need no drag
    // setup of their own, but this keeps related one-time init
    // calls grouped together) - see injectGroupLockIcons()'s own
    // comment. injectGroupDragHandles()/injectRowDragHandles() must
    // run before a user can actually drag anything, but their
    // ordering relative to the setupDragReorder() calls above
    // doesn't matter - those only ever register a document-level
    // listener that checks the handle selector at CLICK time, not
    // at registration time, and everything here runs synchronously
    // before the panel is interactive either way.
    injectGroupLockIcons();
    injectGroupUndockButtons();
    injectRowDeviceCheckboxes();
    refreshEmptyGroupVisibility('mobile');
    refreshEmptyGroupVisibility('landscape');
    injectGroupDeviceCheckboxes();
    injectGroupDragHandles();
    injectRowDragHandles();
    makeDevValuesEditable();
    makeDevSliderBoundsEditable();
    // Captures every dev-panel label/title's TRUE original text into
    // devTextOriginals (devTextOverrides is still empty the first
    // time this runs pre-settings-load) and applies any restored
    // override on top - safe/idempotent if called again later.
    applyDevTextOverrides();
    // Hotkey system initialization - render all badges and create
    // the Hotkeys subgroup inside Dev Panel.
    renderAllHotkeyBadges();
    ensureHotkeysSubgroup();
    devPanelBuilt = true;
}
