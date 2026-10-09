
// Desktop/Mobile/Landscape dev-panel tabs. Purely presentational: which tab is showing doesn't
// change which device's game rendering is active (that's isMobileActive(), from the real
// viewport) - every tab's sliders stay live-editable.
function switchDevPanelTab(tab) {
    // tab is 'desktop' | 'mobile' | 'landscape'.
    // Mobile/Landscape order mirrors Desktop's current order. Runs BEFORE the 'hidden' toggle so
    // the tab is already ordered when it becomes visible.
    if (tab === 'mobile') syncMobileOrderToDesktop();
    else if (tab === 'landscape') syncLandscapeOrderToDesktop();
    // State may have changed while this tab wasn't showing - re-sync checkbox display, group
    // cascade indeterminate state, and empty-group hiding for the tab about to show.
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
    // The panel's own styling is per tab, not tied to the real viewport.
    applyDevPanelOwnStyling(tab);
}

// Top-edge debug lines: a vertical bar from y=0 down to each element's plain
// getBoundingClientRect().top - the same measurement Text Edit Mode's bounding box uses.
// (Range.getBoundingClientRect() on the text node proved unreliable for this.)
// Runs as a self-rescheduling rAF loop rather than a resize listener (resize events proved
// unreliable on real devices); it stops once the checkbox is unchecked.
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
    // No line-height correction: measured, the glyph's visible top lands at the box top, and a
    // "+lineHeightPx" correction overshot badly.
    // Font Trim Adjust offsets ONLY the drawn line's endpoint, never the real element - applying
    // it to the element moves both text and measurement together, so the gap never closes.
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
    // Ignore while typing in a text field - otherwise typing "r" (e.g. "Round") triggers Reset
    // and wipes unsaved settings.
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

// Wires one 'change' handler to all 3 device copies of a single shared dev-tool toggle. The
// clicked copy drives onChange(checked); the others get .checked set directly (no 'change'
// event), so this can't recurse or double-apply.
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
// Sets every device copy's .checked directly (no 'change' event) - used for mutual exclusivity
// between two different synced groups (Preview Start vs Preview Try Again Text).
function setAllChecked(ids, checked) {
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.checked = checked; });
}

// Click counter checkbox (also shows the tap diagnostic log)
wireSyncedCheckboxGroup(['checkboxClickCounter', 'checkboxMobileClickCounter', 'checkboxLandscapeClickCounter'], (checked) => {
    clickCounter.classList.toggle('hidden', !checked);
    tapDiagnosticPanel.classList.toggle('hidden', !checked);
    // Rebuild once on open so logTapDiagnostic's incremental per-tap append can assume the DOM
    // is caught up.
    if (checked) { rebuildTapDiagnosticDisplay(); }
});

wireSyncedCheckboxGroup(['checkboxFlipButtonSvg', 'checkboxMobileFlipButtonSvg', 'checkboxLandscapeFlipButtonSvg'], (checked) => {
    cssVars['--flip-button-svg'] = checked ? 1 : 0;
    gameButton.classList.toggle('flip-svg', checked);
});

// Preview Round Text - forces gameText visible so its sliders can be tuned without playing.
// Unchecking just re-hides it; prior gameplay state is not restored.
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

// Preview Win Text - forces resultText visible in its WIN look.
wireSyncedCheckboxGroup(['checkboxPreviewWinText', 'checkboxMobilePreviewWinText', 'checkboxLandscapePreviewWinText'], (checked) => {
    if (checked) {
        resultText.textContent = overrideOr('winSymbol');
        resultText.classList.remove('result-lose');
        resultText.classList.add('result-win');
        resultText.classList.remove('hidden');
        // Also tint Target/Speed/Ms-per-click like a real win, so the Gameplay Win color
        // pickers can be previewed live.
        applyGameplayResultColor('win');
    } else {
        resultText.classList.add('hidden');
        applyGameplayResultColor(null);
    }
});

// Preview Lose Text - forces resultText visible in its LOSE look. A real loss shows a random
// tap-count message that needs real round data, so loseSymbol is used as stand-in content.
wireSyncedCheckboxGroup(['checkboxPreviewLoseText', 'checkboxMobilePreviewLoseText', 'checkboxLandscapePreviewLoseText'], (checked) => {
    if (checked) {
        resultText.textContent = overrideOr('loseSymbol');
        resultText.classList.remove('result-win');
        resultText.classList.add('result-lose');
        resultText.classList.remove('hidden');
        // Same as Preview Win Text above.
        applyGameplayResultColor('lose');
    } else {
        resultText.classList.add('hidden');
        applyGameplayResultColor(null);
    }
});

// Preview Start / Try Again Text - force startButton visible in each state via the real
// TEXT_EDIT_TARGETS.startButton.render(), so DOM, try-again-state class and anchors match.
// Mutually exclusive: checking one un-checks every device copy of the other.
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

// Text Edit Mode is a header icon button (#devTextEditModeBtn), not a checkbox group.

// Dev-only replay of the round-change blink sequence, incrementing the number each press.
// Deliberately NOT runRoundBlinkSequence(): that ends in showTargetAndSpeed(), which rolls a
// real target/speed and unhides the HUD. Keep this phase list in sync with that function.
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

// Wires the built-in "Dev Panel" styling controls. Bypasses cssVars/CSS_VAR_SLIDER_MAP on
// purpose: these are keyed by the viewed TAB, not isMobileActive(). Opacity and colors are
// desktop-only/shared (DEV_PANEL_STYLE_SHARED_KEYS); sizes are per tab.
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

    // Scroll Strength - native overflow scroll speed isn't CSS-tunable, so scale the wheel delta
    // manually using the visible tab's per-tab scrollStrength.
    const devScrollContent = document.querySelector('.dev-panel-scroll-content');
    if (devScrollContent) devScrollContent.addEventListener('wheel', (e) => {
        const isDesktopTab = !document.getElementById('desktopTabContent').classList.contains('hidden');
        const strength = (isDesktopTab ? devPanelStyle : mobileDevPanelStyle).scrollStrength;
        if (strength === 1) return; // native speed - let the browser handle it natively
        e.preventDefault();
        devScrollContent.scrollTop += e.deltaY * strength;
    }, { passive: false });
}

// The dev panel's left/top/height defaults are -1 sentinels, resolved here into real viewport
// numbers ONLY while still untouched, so a saved/dragged position is never overwritten.
// Runs twice: before first paint (no literal left:-1px) and again after loadSettings().
// (Round Breakdown needs no sentinel - its geometry is vw/vh-native.)
function resolvePositionSentinels() {
    // Reproduces the old fixed right:0/top:0/bottom:0 anchor.
    if (cssVars['--dev-panel-left-px'] === -1 && cssVars['--dev-panel-top-px'] === -1 && cssVars['--dev-panel-height-px'] === -1) {
        cssVars['--dev-panel-left-px'] = Math.max(0, window.innerWidth - cssVars['--dev-panel-width-px']);
        cssVars['--dev-panel-top-px'] = 0;
        cssVars['--dev-panel-height-px'] = window.innerHeight;
    }
}

// Initialize
// Built EAGERLY for every visitor (not in the lazy ensureDevPanelBuilt()): gameplay reads
// sliderStartingSpeed's .value as its source of truth, so without it no game can start.
renderGameMechanicsControls();
// Same eager exception: spawnClickBurst() reads the Left/Right Floor/Ceiling Angle inputs'
// .value on every tap - if missing, it throws inside handleGameButtonPress() and breaks round
// progression for real players. Must be called only once (duplicate ids otherwise).
renderClickBurstTextInputControls();
// Every other dev-panel row is lazily built by ensureDevPanelBuilt() (D key / DEV button, first
// use only) - building ~686 controls eagerly cost ~800ms of load time for every visitor.
// Stays EAGER (see 07-init.js): setupTextEditMode() (wires real game elements),
// setupTextEditPanelTriggers()/setupDevPanelTextEdit() (need only the static section-title
// shell; the latter uses one delegated listener on #devPanel, so later rows are covered), and
// resolvePositionSentinels()/applyActiveVars()/applyExtrusionStyles() (state + game elements
// only). Keep their relative order. devPanelBuilt is declared at the top of the script.
// ================================================================
// MOUSE LOG (built-in "Debug" group feature) - a live log of mouse/touch position, click type
// (incl. touch gestures), what it hit, plus device/viewport context entries and Save-to-file.
//
// SINGLE INSTANCE, Desktop-tab only - one real input stream regardless of which tab shows.
//
// Clicko's "DEBUG" group is a user-created custom group (internal data-sid "New Group (17)",
// renamed via devTextOverrides), so resolveDebugGroupSid() finds it by CURRENT override text.
// Called from ensureDevPanelBuilt() (overrides may still be empty - harmless no-op) AND after
// the async settings load (when overrides are populated - the call that actually succeeds).
const MOUSE_LOG_MAX_ENTRIES = 500;
const MOUSE_LOG_HOLD_MS = 500;
const MOUSE_LOG_MULTICLICK_MS = 350;
const MOUSE_LOG_MOVE_THRESHOLD_PX = 10;
let mouseLog = [];
let mouseLogEl = null;
let mouseLogPositionEnabled = false;
let mouseLogPositionIntervalMs = 1000;
let mouseLogPositionTimer = null;
// Both default OFF (opt-in): scroll events are high-volume noise, and keystrokes are
// privacy-sensitive (could capture real typed text).
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
// Current value of a form control for the Mouse Log line; null for non-form targets (buttons,
// group titles), which then omit the "= value" part entirely.
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
        // e.target may be the row's label rather than its control - fall back to the row's input.
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
// Clear Highscore button, directly in the Debug group. Idempotent by id; same lookup and dual
// sync/async call sites as buildMouseLogWidget() (overrides may be empty on the first call).
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
        // Deferred one macrotask: a checkbox's checked flip / select's selection happens in the
        // default click handling AFTER 'pointerup', so reading now would log the old value.
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
    // devPanelBuilt is set at the END, so a mid-build exception leaves it false and the next
    // call retries instead of leaving the panel stuck half-built.
    renderDesktopUniformControls();
    renderMobileUniformControls();
    renderLandscapeUniformControls();
    // MUST run after all 3 renders above - Mobile/Landscape static rows must already exist.
    syncDynamicDeviceRows();
    renderCompoundOffsetControls();
    renderDevPanelStyleControls();
    // Also called after the async settings load - see the MOUSE LOG section comment.
    buildMouseLogWidget();
    setupMouseLog();
    // Same dual-call-site reasoning.
    buildClearHighScoreButton();
    renderSpecialColorControls();
    renderDevPanelMiscControls();
    // renderClickBurstTextInputControls() is called eagerly at Initialize - don't call it here
    // (duplicate ids).
    setupDevPanelStyleControls();
    // Blend Mode dropdowns - shared cssVars-backed selects, not .dev-slider/.dev-color-picker,
    // so wired directly rather than through those generic loops.
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
    // Sync generated controls' DOM values from the live state objects (the source of truth),
    // correct before or after loadSettings() resolves; the async callback re-syncs if built.
    syncSlidersFromState();
    syncColorPickersFromState();
    syncDevPanelStyleControlsFromState();
    validateDevControlMappings();
    assertDevControlsRendered();
    setupTextAlignSelects();
    setupOffsetUnitCheckboxes();
    setupTextEdgeLockCheckboxes();
    setupClickBurstTextInputs();
    // Hide Target prefix/suffix checkboxes. buildCheckboxRow doesn't auto-wire, and these are
    // generated rows, so they must be wired here (wiring eagerly hits a null element).
    document.getElementById('checkboxHideTargetPrefix').addEventListener('change', (e) => {
        cssVars['--target-prefix-hidden'] = e.target.checked ? 1 : 0;
        targetCountPrefix.classList.toggle('hidden', e.target.checked);
    });
    document.getElementById('checkboxHideTargetSuffix').addEventListener('change', (e) => {
        cssVars['--target-suffix-hidden'] = e.target.checked ? 1 : 0;
        targetCountSuffix.classList.toggle('hidden', e.target.checked);
    });
    // Round Breakdown group - same manual wiring, plus the Font select (no generic handler).
    // Several checkboxes default to CHECKED here; applyLoadedSettings() may override them.
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
    // Number of .dev-section ancestors within tabRoot. Drag candidates are sorted DEEPEST-first
    // because setupDragReorder hit-tests with containers.find(pointer within rect), and an outer
    // group's rect always contains its nested groups' rects - the deepest match must win.
    function devGroupNestingDepth(contentEl, tabRoot) {
        let depth = 0;
        let cur = contentEl.parentElement;
        while (cur && cur !== tabRoot) {
            if (cur.classList.contains('dev-section')) depth++;
            cur = cur.parentElement;
        }
        return depth;
    }
    // Group drag, unlimited nesting depth. Targets: every group's content at any depth, then
    // tabRoot (to un-nest). Excludes the dragged group's own content and descendants (cycles).
    // Order matters: deepest-first, tabRoot LAST - tabRoot's rect contains everything, so if it
    // came first find() would always match it and nesting would be impossible.
    // Drag starts only from the '.dev-group-drag-handle' icon; the title's own onclick
    // (collapse/expand) is a separate element and unaffected.
    setupDragReorder('.dev-group-drag-handle', '.dev-section', null, (tabRoot, dragging) => {
        const groupContents = Array.from(tabRoot.querySelectorAll('.dev-section > .dev-section-content'))
            .filter(content => !dragging.contains(content));
        groupContents.sort((a, b) => devGroupNestingDepth(b, tabRoot) - devGroupNestingDepth(a, tabRoot));
        return [...groupContents, tabRoot];
    });
    // Settings-row drag between groups, same deepest-first ordering (same shadowing issue). No
    // cycle check needed - a row is never a container. Drag starts only from the
    // '.dev-row-drag-handle' icon (added to every .dev-row by injectRowDragHandles()), so
    // trigger buttons' own clicks need no click-vs-drag disambiguation.
    setupDragReorder('.dev-row-drag-handle', '.dev-row', null, (tabRoot, dragging) => {
        const groupContents = Array.from(tabRoot.querySelectorAll('.dev-section-content'));
        groupContents.sort((a, b) => devGroupNestingDepth(b, tabRoot) - devGroupNestingDepth(a, tabRoot));
        return groupContents;
    });
    // Order relative to setupDragReorder() doesn't matter - it checks handle selectors at
    // pointer time, and all of this runs before the panel is interactive.
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
    // Captures each label's true original text into devTextOriginals, then applies any
    // overrides on top. Idempotent.
    applyDevTextOverrides();
    // Hotkey badges + the Hotkeys subgroup inside Dev Panel.
    renderAllHotkeyBadges();
    ensureHotkeysSubgroup();
    devPanelBuilt = true;
}
