
// Dev panel lazy-build flag - declared here, first thing in the
// main script, deliberately far from ensureDevPanelBuilt()'s own
// definition (near the bottom, in "Initialize") - a `let` binding
// stays in its temporal dead zone until this exact line executes,
// and the DEV toggle button's onclick can fire the instant its own
// HTML is parsed (line ~3466), long before this ~568KB script has
// finished executing far enough to reach a declaration placed near
// the end. Confirmed via a real reproduction (not just reasoned
// about): clicking the DEV button immediately after navigation hit
// "Cannot access 'devPanelBuilt' before initialization" every
// time. Declaring it in the first few lines of the script instead
// means it initializes within microseconds of the script starting,
// effectively closing the window entirely.
let devPanelBuilt = false;
// CSS Variables initialization
// Built-in "Dev Panel" panel-styling settings - CLAUDE.md Section
// 12i. Independent per TAB (not per real device viewport, unlike
// everything else in cssVars/mobileCssVars) - see
// switchDevPanelTab()/applyDevPanelOwnStyling(). Plain objects, not
// part of cssVars, since they're keyed by which tab is currently
// being VIEWED, not by isMobileActive(). Defaults reproduce the
// panel's previous hardcoded look closely - the one deliberate
// exception is background: this used to be a single rgba(0,0,0,0.95)
// value; now split into a solid bgColor + a separate whole-panel
// opacity control per the spec's own 2 separate settings, so a
// fresh load is very slightly more opaque (1.0) than before (0.95)
// until tuned - a disclosed, minor default difference, not a bug.
const devPanelStyle = {
    titleFontSize: 22,
    tabFontSize: 12,
    groupTitleFontSize: 11,
    settingTitleFontSize: 12,
    // Vertical padding above/below a button's own text (COPY/RESET/
    // SAVE, Hide, Collapse, tabs) - per explicit request ("how much
    // space is above and below the text"). 0 reproduces the
    // previous fixed-height look exactly until tuned - see the
    // buttons' own CSS (min-height + this padding, instead of a
    // fixed height, so growing this actually grows the button).
    buttonTextBorder: 0,
    // Wheel-scroll multiplier for .dev-panel-scroll-content's own
    // internal scrolling - native overflow:auto scroll speed can't
    // be tuned via CSS, so this scales a manually-applied wheel
    // delta instead (see the wheel listener below). 1 matches the
    // browser's native unscaled speed.
    scrollStrength: 0.2,
    opacity: 1,
    bgColor: '#000000',
    titleTextColor: '#ffffff',
    // Renamed from "Non-Title Text Color" to "Settings Title Text
    // Color" per explicit request ("make it work as such") - now
    // specifically colors .dev-label (the settings row text: "Font
    // Size (px):" etc.), not the panel's generic base-cascade text
    // color it used to (every other real text element already has
    // its own explicit color rule - group titles/accent, button
    // text/black-on-accent, value readouts/accent - so nothing was
    // actually left relying on that generic fallback). The JS/CSS
    // var name itself (nonTitleTextColor / --dev-panel-non-title-
    // text-color) is unchanged internally to avoid an unrelated
    // rename ripple - only its label and what it targets changed.
    nonTitleTextColor: '#ffffff',
    // Accent color for every button/interactive control that used
    // to be hardcoded green (#0f0) - COPY/RESET/SAVE, Collapse,
    // Hide, tabs, sliders' value readout, color-picker/select/
    // text-input borders, etc. Now also drives group (section)
    // title text color - per explicit request - previously a
    // separate hardcoded cyan.
    accentColor: '#3ac8e4',
    // Native range-input thumb/track tint (browser accent-color) -
    // a separate control from accentColor above, which only ever
    // governed buttons/borders/value-readout text, never the
    // slider's own native color (previously hardcoded blue, the
    // browser default). Per explicit request.
    sliderColor: '#3b82f6',
    // Group (section) title text color, decoupled back out from
    // Accent Color per direct *D* request ("Group Text Color") -
    // Accent Color had absorbed this (see accentColor's own
    // comment above, "previously a separate hardcoded cyan")
    // after an earlier request to fold it in; this restores an
    // independent control instead, same decompose-don't-bundle
    // reasoning as every other single-purpose color here. Seeded
    // to the REAL currently-saved accentColor value (read directly
    // from the git-tracked settings log at the moment this field
    // was added, #5cc9ff - NOT this object's own hardcoded
    // accentColor literal above, which is itself long stale
    // relative to the real saved value since loadSettings()
    // always overrides it) so .dev-section-title's own color is
    // visually unchanged on first load after this deploys, even
    // though this brand-new field has no entry in the saved JSON
    // yet to override it with.
    groupTextColor: '#5cc9ff',
    // Text color for every dev-panel button (COPY/RESET/SAVE,
    // Named Setting States' SAVE/USE/DELETE/SET DEFAULT, Hide,
    // Collapse, Trigger buttons) - per direct *D* request ("Dev
    // Panel Button Text Color"). All of these previously hardcoded
    // color:#000 directly in their own CSS rule; seeded to that
    // same black so nothing changes visually until tuned. No
    // longer covers tabs - carved out into tabTextColor below, its
    // own dedicated control, per the later 5-category text battery
    // request (Tab Title is its own category, not "Buttons Text").
    buttonTextColor: '#000000',
    // Setting Number (the .dev-value/.dev-value-edit-input
    // readout next to every slider) text color - per direct
    // follow-up request ("provide a color picker for Setting
    // Number text"). Was tied to Accent Color with no independent
    // control; seeded to the current accentColor value (same
    // real-current-value approach as groupTextColor above, not
    // this object's own stale accentColor literal) so nothing
    // visually changes until retuned.
    settingNumberColor: '#5cc9ff',
    // Applies to every bit of text inside the panel - per explicit
    // request for a font selector. Defaults to Arial now that
    // Monospace was removed as an option per explicit request
    // ("Provide Futura as a font option. Remove Monospace").
    fontFamily: 'Verdana, Geneva, sans-serif',
    // 4 independent capitalize toggles (text-transform:uppercase),
    // one per text category named in the request - kept as
    // separate booleans rather than one shared toggle so each
    // category can be capitalized independently (CLAUDE.md Section
    // 12n #1, decompose don't bundle).
    capsButtonText: true,
    capsTabText: true,
    capsGroupNames: true,
    capsSettingsText: false,
    // 4 independent letter-spacing sliders (px), same per-category
    // decomposition as the capitalize toggles above - per explicit
    // *D* request.
    buttonTextLetterSpacing: 0,
    tabTextLetterSpacing: 0,
    groupTextLetterSpacing: 0,
    settingsTextLetterSpacing: 0,
    // Shared height for every dev-panel button (COPY/RESET/SAVE,
    // Collapse, Hide, Desktop/Mobile tabs, Trigger Round Number
    // Flash) - per explicit request. ~24px reproduces the previous
    // look closely (COPY/RESET/SAVE's implicit padding+line-height,
    // and Collapse/Hide's old fixed 22px, both landed close to this).
    buttonHeight: 21,
    bodyFontSize: 11,
    // Setting-number readout/click-to-edit boxes (.dev-value/
    // .dev-value-edit-input) - per explicit request ("provide a
    // font size slider for all setting number displays"). Per-tab
    // like every other font size above, not desktop-only.
    valueFontSize: 10,
    // Also drives the "+ Add Group" button's own background
    // (styled like the Desktop/Mobile/Landscape tab buttons
    // otherwise - see .dev-add-group-btn) so both stay visually
    // tied to the same color - per explicit request.
    groupLabelBgColor: '#134e4a',
    // Per explicit request for a full Font Size/Letter Spacing/Line
    // Spacing/Text Color/Bold/Capitalize battery across 5 text
    // categories (Dev Panel Title, Tab Title, Buttons Text,
    // Settings Text, Group Name Text) - most of the 30 implied
    // fields already existed from earlier same-session work (font
    // sizes, 4 letter-spacings, 4 capitalize toggles, most colors -
    // see titleFontSize/tabFontSize/groupTitleFontSize/
    // settingTitleFontSize, *TextLetterSpacing, caps*, titleTextColor/
    // nonTitleTextColor("Settings Title Text Color")/groupTextColor
    // above), so only the genuinely missing fields are added here:
    // every category's Line Spacing and Bold (none existed before),
    // Dev Panel Title's own Letter Spacing and Capitalize (the other
    // 3 categories already had these), Tab Title's own dedicated
    // Text Color (previously shared with Buttons via
    // buttonTextColor - carved out into its own control, see
    // .dev-tab-btn's CSS for the corresponding scope change), and
    // Buttons Text's own Font Size (previously 3 different hardcoded
    // per-element sizes - unified under one control, defaulted to
    // .dev-buttons button's own 10px; .dev-hide-btn/.dev-collapse-btn/
    // .dev-toggle-btn visibly shrink from their old hardcoded 14px/
    // 11px, a disclosed, immediately-retunable tradeoff of giving
    // this a single shared control per the request's own structure).
    titleLetterSpacing: 0,
    titleLineHeight: 1.2,
    tabLineHeight: 1.2,
    buttonLineHeight: 1.2,
    settingsLineHeight: 1.2,
    groupLineHeight: 1.2,
    // Carved out of buttonTextColor (see that field's own comment) -
    // seeded to the same black so .dev-tab-btn's color is visually
    // unchanged on first load.
    tabTextColor: '#000000',
    // Unifies .dev-buttons button (10px), .dev-hide-btn/.dev-collapse-
    // btn (14px), .dev-toggle-btn (11px), and .dev-trigger-btn
    // (previously borrowed settingTitleFontSize) under one control -
    // seeded to .dev-buttons button's own 10px, the majority/primary
    // "Buttons Text" example.
    buttonFontSize: 10,
    // Bold toggles, one per category - none existed before; each
    // seeded to match that category's own CURRENT hardcoded/inherited
    // weight so nothing visually changes on first load: Title
    // inherited bold from .dev-header, Tab/Buttons/Group each had
    // their own hardcoded font-weight:bold, Settings (.dev-label)
    // had no font-weight rule at all (browser default/normal).
    titleBold: true,
    tabBold: true,
    buttonBold: true,
    settingsBold: false,
    groupBold: true,
    // Title's own Capitalize toggle - the other 3 pre-existing
    // categories already had theirs (capsButtonText/capsTabText/
    // capsGroupNames/capsSettingsText); defaults false since "DEV"
    // is a literal-uppercase string already unaffected either way.
    titleCapitalize: false,
};
// Mobile deliberately does NOT inherit the desktop tuning above via
// this clone - a "set defaults" dump had Mobile's own tab showing
// the ORIGINAL values (11/10/#00ff00/24) while Desktop got the new
// ones, so mobile's own defaults are restored explicitly after the
// clone rather than left to inherit whatever desktop's literal
// currently says.
const mobileDevPanelStyle = { ...devPanelStyle };
mobileDevPanelStyle.titleFontSize = 11;
mobileDevPanelStyle.settingTitleFontSize = 10;
mobileDevPanelStyle.accentColor = '#00ff00';
mobileDevPanelStyle.buttonHeight = 24;
// Synced to the current git-tracked settings log (per explicit
// "set the current save settings on Git as the default" request) -
// these had drifted from desktop's own tuning same as the 4 above,
// just not yet captured as their own explicit override line.
mobileDevPanelStyle.scrollStrength = 1;
mobileDevPanelStyle.fontFamily = 'monospace';
mobileDevPanelStyle.capsButtonText = false;
mobileDevPanelStyle.capsTabText = false;
mobileDevPanelStyle.capsGroupNames = false;
// Landscape's own dev-panel geometry/look - independent per-tab like
// Desktop/Mobile already are (CLAUDE.md 12f: the panel's own size/
// position is always independent per device). Seeded as a clone of
// Desktop's current tuning (changed from Mobile per direct request
// "let's try all settings pulled from desktop... be ready to change
// it back" - flip mobileDevPanelStyle back here to revert) so
// nothing looks different until retuned.
const landscapeDevPanelStyle = structuredClone(devPanelStyle);

const DEV_PANEL_STYLE_VAR_MAP = {
    titleFontSize: '--dev-panel-title-font-size-px',
    tabFontSize: '--dev-tab-font-size-px',
    groupTitleFontSize: '--dev-group-title-font-size-px',
    settingTitleFontSize: '--dev-setting-title-font-size-px',
    buttonTextBorder: '--dev-button-text-border-px',
    scrollStrength: '--dev-scroll-strength',
    opacity: '--dev-panel-opacity',
    bgColor: '--dev-panel-bg-color',
    titleTextColor: '--dev-panel-title-text-color',
    nonTitleTextColor: '--dev-panel-non-title-text-color',
    accentColor: '--dev-accent-color',
    sliderColor: '--dev-slider-color',
    groupTextColor: '--dev-panel-group-text-color',
    buttonTextColor: '--dev-panel-button-text-color',
    settingNumberColor: '--dev-value-text-color',
    fontFamily: '--dev-panel-font-family',
    buttonHeight: '--dev-button-height-px',
    buttonTextLetterSpacing: '--dev-button-text-letter-spacing-px',
    tabTextLetterSpacing: '--dev-tab-text-letter-spacing-px',
    groupTextLetterSpacing: '--dev-group-text-letter-spacing-px',
    settingsTextLetterSpacing: '--dev-settings-text-letter-spacing-px',
    valueFontSize: '--dev-value-font-size-px',
    groupLabelBgColor: '--dev-group-label-bg-color',
    titleLetterSpacing: '--dev-panel-title-letter-spacing-px',
    titleLineHeight: '--dev-panel-title-line-height',
    tabLineHeight: '--dev-tab-line-height',
    buttonLineHeight: '--dev-button-text-line-height',
    settingsLineHeight: '--dev-settings-line-height',
    groupLineHeight: '--dev-group-text-line-height',
    tabTextColor: '--dev-tab-text-color',
    buttonFontSize: '--dev-button-text-font-size-px',
};

// Opacity + all 4 colors are desktop-only now - per explicit
// request ("Dev Panel colors is dictated by desktop settings.
// remove from mobile. same for opacity"), always resolve from
// devPanelStyle regardless of which tab is active. Every other
// field (font sizes, button height) stays genuinely per-tab.
// sliderColor/fontFamily/the 4 caps toggles joined the same
// desktop-only bucket - cosmetic/non-spatial settings, same
// category as the colors/opacity already here, not something that
// needs its own Mobile-tab copy.
// Corrected 2026-09-14 (real bug found live, direct report: "The
// new Dev Panel text settigns we just added arent reflected in
// the Mobile and Landscape tabs") - titleLetterSpacing/
// titleLineHeight/tabLineHeight/buttonLineHeight/settingsLineHeight/
// groupLineHeight/buttonFontSize were wrongly dumped into this
// shared bucket when added; every one of them is a size/spacing
// value whose direct sibling (titleFontSize, tabFontSize,
// groupTitleFontSize, settingTitleFontSize, buttonHeight - none of
// which are in this list) is already genuinely per-tab, so being
// shared broke the established per-category consistency, and
// (more concretely) meant these 7 had no Mobile/Landscape DOM
// control to view or tune at all, unlike their siblings. Moved
// out - now genuinely per-tab, matching those siblings. The other
// 7 new fields (titleBold/tabBold/buttonBold/settingsBold/
// groupBold/titleCapitalize/tabTextColor) correctly STAY here -
// already consistent with their own sibling colors/caps-toggles,
// which were shared by deliberate original design, not a bug.
const DEV_PANEL_STYLE_SHARED_KEYS = ['opacity', 'bgColor', 'titleTextColor', 'nonTitleTextColor', 'accentColor', 'sliderColor', 'fontFamily', 'capsButtonText', 'capsTabText', 'capsGroupNames', 'capsSettingsText', 'buttonTextLetterSpacing', 'tabTextLetterSpacing', 'groupTextLetterSpacing', 'settingsTextLetterSpacing', 'groupLabelBgColor', 'groupTextColor', 'buttonTextColor', 'settingNumberColor', 'tabTextColor', 'titleBold', 'tabBold', 'buttonBold', 'settingsBold', 'groupBold', 'titleCapitalize'];
// The capitalize toggles apply as CSS classes (text-transform has
// no "conditional on a custom property" form), not as raw CSS
// variable values - kept out of DEV_PANEL_STYLE_VAR_MAP for that
// reason, applied here instead. The 5 Bold toggles (added later,
// one per text category) reuse this exact same class-toggle
// mechanism - font-weight COULD be driven by a raw var directly,
// but a class stays consistent with every other boolean-style
// toggle already in this map rather than introducing a 2nd pattern
// for one property.
const DEV_PANEL_CAPS_CLASS_MAP = {
    capsButtonText: 'dev-caps-button-text',
    capsTabText: 'dev-caps-tab-text',
    capsGroupNames: 'dev-caps-group-names',
    capsSettingsText: 'dev-caps-settings-text',
    titleCapitalize: 'dev-caps-title-text',
    titleBold: 'dev-bold-title',
    tabBold: 'dev-bold-tab',
    buttonBold: 'dev-bold-button',
    settingsBold: 'dev-bold-settings',
    groupBold: 'dev-bold-group',
};
function applyDevPanelOwnStyling(tab) {
    // tab is 'desktop' | 'mobile' | 'landscape', OR (legacy call
    // sites not yet updated to pass a tab name) a boolean, where
    // true means desktop - kept so a stray old boolean call site
    // still resolves correctly rather than silently misbehaving.
    const resolvedTab = typeof tab === 'boolean' ? (tab ? 'desktop' : 'mobile') : tab;
    const style = resolvedTab === 'desktop' ? devPanelStyle : resolvedTab === 'mobile' ? mobileDevPanelStyle : landscapeDevPanelStyle;
    for (const [key, varName] of Object.entries(DEV_PANEL_STYLE_VAR_MAP)) {
        const value = DEV_PANEL_STYLE_SHARED_KEYS.includes(key) ? devPanelStyle[key] : style[key];
        document.documentElement.style.setProperty(varName, value);
    }
    for (const [key, className] of Object.entries(DEV_PANEL_CAPS_CLASS_MAP)) {
        devPanel.classList.toggle(className, !!devPanelStyle[key]);
    }
}
