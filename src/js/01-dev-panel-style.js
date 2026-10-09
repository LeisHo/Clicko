
// Declared first thing in the script on purpose: the DEV toggle button's onclick can fire as
// soon as its HTML is parsed, before a `let` placed near ensureDevPanelBuilt() would leave its
// temporal dead zone ("Cannot access 'devPanelBuilt' before initialization").
let devPanelBuilt = false;
// CSS Variables initialization
// Built-in "Dev Panel" self-styling settings. Keyed by which dev-panel TAB is being viewed
// (see switchDevPanelTab()/applyDevPanelOwnStyling()), not by isMobileActive(), so they live
// outside cssVars/mobileCssVars.
const devPanelStyle = {
    titleFontSize: 22,
    tabFontSize: 12,
    groupTitleFontSize: 11,
    settingTitleFontSize: 12,
    // Vertical padding (px) above/below button text; buttons use min-height + this padding so
    // growing it actually grows the button.
    buttonTextBorder: 0,
    // Wheel-scroll multiplier for .dev-panel-scroll-content (native overflow scroll speed can't
    // be tuned in CSS, so the wheel listener scales the delta manually). 1 = native speed.
    scrollStrength: 0.2,
    opacity: 1,
    bgColor: '#000000',
    titleTextColor: '#ffffff',
    // Labelled "Settings Title Text Color"; colors .dev-label. Internal name/var kept as
    // nonTitleTextColor / --dev-panel-non-title-text-color to avoid a rename ripple.
    nonTitleTextColor: '#ffffff',
    // Accent for buttons/interactive controls (borders, value readouts, tabs, etc.).
    accentColor: '#3ac8e4',
    // Native range-input thumb/track tint (CSS accent-color), separate from accentColor.
    sliderColor: '#3b82f6',
    // Group (section) title text color. Seeded to the real saved accentColor (#5cc9ff), not
    // the stale accentColor literal above, so it looks unchanged when no saved value exists.
    groupTextColor: '#5cc9ff',
    // Text color for dev-panel buttons (not tabs - see tabTextColor).
    buttonTextColor: '#000000',
    // .dev-value/.dev-value-edit-input readout text color (seeded like groupTextColor).
    settingNumberColor: '#5cc9ff',
    // Font for all text inside the panel.
    fontFamily: 'Verdana, Geneva, sans-serif',
    // Per-category capitalize toggles (text-transform:uppercase), kept separate on purpose.
    capsButtonText: true,
    capsTabText: true,
    capsGroupNames: true,
    capsSettingsText: false,
    // Per-category letter-spacing (px).
    buttonTextLetterSpacing: 0,
    tabTextLetterSpacing: 0,
    groupTextLetterSpacing: 0,
    settingsTextLetterSpacing: 0,
    // Shared height for every dev-panel button.
    buttonHeight: 21,
    bodyFontSize: 11,
    // Font size for .dev-value/.dev-value-edit-input readouts. Per-tab.
    valueFontSize: 10,
    // Also drives the "+ Add Group" button background (.dev-add-group-btn).
    groupLabelBgColor: '#134e4a',
    // Line spacing, Title letter spacing/capitalize, Tab text color, Buttons font size and
    // per-category Bold - completing the 5-category text battery (Title, Tab, Buttons,
    // Settings, Group).
    titleLetterSpacing: 0,
    titleLineHeight: 1.2,
    tabLineHeight: 1.2,
    buttonLineHeight: 1.2,
    settingsLineHeight: 1.2,
    groupLineHeight: 1.2,
    tabTextColor: '#000000',
    // Single font size for all dev-panel buttons (.dev-buttons, hide/collapse/toggle/trigger).
    buttonFontSize: 10,
    // Per-category Bold toggles, seeded to each category's previous visual weight.
    titleBold: true,
    tabBold: true,
    buttonBold: true,
    settingsBold: false,
    groupBold: true,
    titleCapitalize: false,
};
// Mobile has its own explicit defaults rather than inheriting desktop's tuning via the clone.
const mobileDevPanelStyle = { ...devPanelStyle };
mobileDevPanelStyle.titleFontSize = 11;
mobileDevPanelStyle.settingTitleFontSize = 10;
mobileDevPanelStyle.accentColor = '#00ff00';
mobileDevPanelStyle.buttonHeight = 24;
// Synced to the git-tracked settings log.
mobileDevPanelStyle.scrollStrength = 1;
mobileDevPanelStyle.fontFamily = 'monospace';
mobileDevPanelStyle.capsButtonText = false;
mobileDevPanelStyle.capsTabText = false;
mobileDevPanelStyle.capsGroupNames = false;
// Landscape panel look is independent per tab; seeded as a clone of Desktop's tuning (swap in
// mobileDevPanelStyle here to seed from Mobile instead).
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

// Keys that always resolve from desktop's devPanelStyle regardless of active tab (colors,
// opacity, font, caps/bold toggles and similar cosmetic settings). Size/spacing values
// (font sizes, line heights, button height/font size) must NOT be added here - they are
// per-tab and need their own Mobile/Landscape controls.
const DEV_PANEL_STYLE_SHARED_KEYS = ['opacity', 'bgColor', 'titleTextColor', 'nonTitleTextColor', 'accentColor', 'sliderColor', 'fontFamily', 'capsButtonText', 'capsTabText', 'capsGroupNames', 'capsSettingsText', 'buttonTextLetterSpacing', 'tabTextLetterSpacing', 'groupTextLetterSpacing', 'settingsTextLetterSpacing', 'groupLabelBgColor', 'groupTextColor', 'buttonTextColor', 'settingNumberColor', 'tabTextColor', 'titleBold', 'tabBold', 'buttonBold', 'settingsBold', 'groupBold', 'titleCapitalize'];
// Boolean toggles applied as CSS classes on devPanel (text-transform has no "conditional on a
// custom property" form), so they're kept out of DEV_PANEL_STYLE_VAR_MAP. Bold reuses this.
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
    // tab: 'desktop' | 'mobile' | 'landscape', or a legacy boolean (true = desktop).
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
