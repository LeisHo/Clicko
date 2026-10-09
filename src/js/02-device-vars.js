
const cssVars = {
    '--button-diameter-vw': 42.5,
    // A floor only engages below floor/0.425 px of viewport width; 380 engages below ~894px so
    // it actually works for narrowed desktop windows (smaller values never fire before the
    // 767px mobile breakpoint).
    '--button-min-diameter-px': 380,
    '--button-height-offset-px': -4.5,
    '--button-press-intensity-px': 8,
    '--button-x-offset-vw': -1,
    '--button-x-offset-unit-is-px': 0,
    '--button-y-offset-vh': 6,
    '--button-y-offset-unit-is-px': 0,
    // Horizontal/Vertical Align + Edge Lock (dev-panel controls).
    '--button-text-align': 'center',
    '--button-text-valign': 'center',
    '--button-text-align-edge-lock': 0,
    '--button-text-valign-edge-lock': 0,
    '--button-release-ms': 0,
    '--button-press-ms': 0,
    // Extra multiplier on the button's vw sizing, applied to .button-assembly (button, base and
    // shadow-caster scale together). computeButtonUserScale() lerps Min Scale at 768px to Max
    // Scale at 1280px+, clamped. Landscape reuses these same values/formula. 1 = no-op.
    '--button-max-scale': 1,
    '--button-min-scale': 1,
    // Base/backing recolor uses grayscale+levels+multiply-tint (#baseGrayscaleTint filter defs);
    // hue-rotate can't desaturate to white/gray. --base-tint-color is set directly in
    // setBaseHue(), not stored here. Independent Base/Button pairs: Floor/Ceiling set the output
    // range, Contrast pivots around 0.5 (see applyLightLevels()). 0/1/0/1 = identity.
    '--base-light-levels': 0,
    '--base-light-levels-contrast': 1.19,
    '--base-light-levels-floor': 0,
    '--base-light-levels-ceiling': 1,
    '--button-light-levels': 0,
    '--button-light-levels-contrast': 1.19,
    '--button-light-levels-floor': 0,
    '--button-light-levels-ceiling': 1,
    // Saturation, 1 = unchanged (feColorMatrix type="saturate" default) - see applySaturation().
    '--base-saturation': 1,
    '--button-saturation': 1,
    // Lose-only override for the button's contrast/lightness (floor/ceiling unchanged); active
    // only while resultText has .result-lose - see applyGameplayResultColor().
    '--button-lose-contrast': 1.19,
    '--button-lose-lightness': 0,
    // Base tracks the button's win/lose tint unless turned off.
    '--base-follows-result-color': 1,
    // feBlend mode for each filter's tint step.
    '--base-blend-mode': 'color',
    '--button-blend-mode': 'color',
    // Regular (0) vs Thin (1) base+backing artwork. Shared, not device-split.
    '--thin-base-enabled': 0,
    // Layer-visibility toggles (Button/Base/Backing SVG/White SVG). Shared.
    '--hide-button-enabled': 0,
    '--hide-base-enabled': 0,
    '--hide-backing-svg-enabled': 0,
    '--hide-white-svg-enabled': 0,
    '--click-burst-speed-ms': 250,
    '--click-burst-scale': 0.32,
    '--click-burst-distance-px': 115,
    '--click-burst-height-px': 0,
    '--click-burst-curve-offset-px': 80,
    '--click-burst-count-min': 3,
    '--click-burst-count-max': 5,
    '--click-burst-curve-amount': 0,
    // Final scale-down for the click-burst SHADOW containers only (buildTransform()), applied
    // after every other shadow modifier. 1 = no change.
    '--click-burst-shadow-final-scale': 0.64,
    // Not a real CSS var (nothing reads it via var()) - stored here only so copySettings()/
    // saveSettings() persist it. Shared, not mobile-split (see updateClickFrameSet()).
    '--click-frame-set': 'CLICK3',
    // Also not a real CSS var; stored here for persistence.
    '--flip-button-svg': 0,
    // % of the button's own rendered width (not px) - see .shadow-caster-layer's CSS.
    '--shadow-x-offset': 24.25,
    '--shadow-y-offset': 17.17,
    '--shadow-blur': 0,
    '--shadow-scale': 0.55,
    '--shadow-skew': -8,
    // Elongation along an arbitrary axis: rotate(angle) scaleY(intensity) rotate(-angle).
    // Angle 0 = vertical (Y), 90 = horizontal (X), CSS rotate() direction in between.
    '--shadow-elongation-intensity': 1.9,
    '--shadow-elongation-angle': 76,
    '--shadow-rotate': 0,
    // Formerly Round Text's big-state values; now drive the Start/Try Again BUTTON's
    // position/size (see .start-button's CSS).
    '--text-font-size-px': 396.26,
    '--text-font-size-vw': 19.57,
    '--text-scale-with-browser': 1,
    '--text-x-offset-vw': 1.44,
    '--text-x-offset-unit-is-px': 0,
    '--text-y-offset-vh': -7.66,
    '--text-y-offset-unit-is-px': 0,
    '--text-letter-spacing-px': 18.5,
    '--text-line-height': 1.4,
    '--start-text-align': 'center',
    '--start-text-valign': 'center',
    // Try Again's alignment, independent from Start's. Both states share ONE element
    // (startButton), so applyTextAlignAnchors() picks the pair matching the currently displayed
    // state for the shared align class; the computed custom properties are distinctly prefixed.
    '--try-again-text-align': 'center',
    '--try-again-text-valign': 'center',
    '--try-again-text-align-edge-lock': 0,
    '--try-again-text-valign-edge-lock': 0,
    // The "?" glyph's own alignment, independent from the "Try again" text.
    '--try-again-question-mark-text-align': 'center',
    '--try-again-question-mark-text-valign': 'center',
    '--try-again-question-mark-text-align-edge-lock': 0,
    '--try-again-question-mark-text-valign-edge-lock': 0,
    // Edge Lock flags (Desktop) - see applyTextAlignAnchors(). 0/1 like every other flag here.
    '--start-text-align-edge-lock': 0,
    '--start-text-valign-edge-lock': 0,
    // Try Again's own font-size/position, independent from Start's (.start-button.try-again-state).
    '--try-again-text-font-size-px': 204.83,
    '--try-again-text-font-size-vw': 9.38,
    '--try-again-text-scale-with-browser': 0,
    '--try-again-text-x-offset-vw': -0.16,
    '--try-again-text-x-offset-unit-is-px': 0,
    '--try-again-text-y-offset-vh': -9.05,
    '--try-again-text-y-offset-unit-is-px': 0,
    // Try Again's own letter/line spacing, independent from Start's.
    '--try-again-text-letter-spacing-px': 17.5,
    '--try-again-text-line-height': 0.85,
    // The "?" glyph's own font-size/position (position:fixed, screen-center vw/vh origin like
    // other elements). Positions the glyph's rendered center, not the whole Try Again box.
    '--try-again-question-mark-font-size-px': 341.37,
    '--try-again-question-mark-font-size-vw': 20.09,
    '--try-again-question-mark-scale-with-browser': 0,
    '--try-again-question-mark-x-offset-vw': 1.08,
    '--try-again-question-mark-x-offset-unit-is-px': 0,
    '--try-again-question-mark-y-offset-vh': 35.61,
    '--try-again-question-mark-y-offset-unit-is-px': 0,
    // Round Text's single permanent position (no separate "big" state) and own font size.
    '--round-dock-x-offset-vw': 58,
    '--round-dock-x-offset-unit-is-px': 0,
    // Fine px nudge for just the live round/countdown/ms-per-click NUMBER, on top of the block offset.
    '--round-number-x-offset-px': 0,
    '--round-dock-y-offset-vh': -27.22,
    '--round-dock-y-offset-unit-is-px': 0,
    '--round-font-size-px': 176.55,
    '--round-font-size-vw': 16.38,
    '--round-scale-with-browser': 0,
    '--round-letter-spacing-px': 4.5,
    '--round-line-height': 1.2,
    '--round-text-align': 'left',
    '--round-text-valign': 'bottom',
    '--round-text-align-edge-lock': 1,
    '--round-text-valign-edge-lock': 1,
    // High Score text, same field shape as Round Text.
    '--high-score-x-offset-vw': 0,
    '--high-score-x-offset-unit-is-px': 0,
    '--high-score-y-offset-vh': -42,
    '--high-score-y-offset-unit-is-px': 0,
    '--high-score-font-size-px': 60,
    '--high-score-font-size-vw': 5,
    '--high-score-scale-with-browser': 0,
    '--high-score-letter-spacing-px': 0,
    '--high-score-line-height': 1.2,
    '--high-score-rotate-deg': 0,
    '--high-score-text-align': 'center',
    '--high-score-text-valign': 'top',
    '--high-score-text-align-edge-lock': 0,
    '--high-score-text-valign-edge-lock': 0,
    // Hide High Score. Shared, like the other Hide toggles.
    '--hide-high-score-enabled': 0,
    // "?" blink in "Try again?": Flash = time HIDDEN, Hold = time VISIBLE (startTryAgainFlash()).
    '--try-again-flash-duration-ms': 340,
    '--try-again-hold-duration-ms': 1550,
    '--round-blink1-hide-ms': 350,
    '--round-blink1-show-ms': 400,
    '--round-blink2-hide-ms': 380,
    '--round-blink2-show-ms': 450,
    '--round-blink3-hide-ms': 400,
    '--round-blink3-show-ms': 500,
    // How long the NEW number holds after the blink sequence, before docking into gameplay. The
    // only post-win hold (see runRoundBlinkSequence()).
    '--round-post-blink-hold-ms': 1300,
    // 4th sequential blink phase (hide only, still the OLD number), in the same phases chain as
    // Blink 1-3; the new number is revealed only after it elapses, avoiding a same-tick race.
    '--round-blink4-hide-ms': 250,
    // High Score blinks only when beaten, reusing the round's Blink 1-4 timings; only the start
    // delay is its own (see runHighScoreBlinkSequence()).
    '--high-score-flash-delay-ms': 0,
    // When on, Target/Speed/Ms-per-click blink in sync with the round number on round
    // transitions instead of flatly hiding/reappearing. Shared, not device-split (see
    // runRoundBlinkSequence()/showRoundText()).
    '--gameplay-result-flash-with-round': 1,
    // Target Prefix ("Click")/Number/Suffix ("x"): independent font size and full X/Y position
    // each (vw/vh, same shape as other independent elements).
    '--target-prefix-font-size-px': 150,
    '--target-prefix-font-size-vw': 11.72,
    '--target-prefix-x-offset-vw': 49.20,
    '--target-prefix-y-offset-vh': 9.19,
    // Anchor-mode offset, used only when Prefix's UI-Engine position.mode isn't the default
    // 'relative' (see updateTargetAnchoredPositions()). Prefix X has no mode, so Y only.
    '--target-prefix-y-anchor-offset-vh': 0,
    '--target-number-font-size-px': 500,
    '--target-number-font-size-vw': 39.06,
    '--target-number-x-offset-vw': 200.24,
    '--target-number-y-offset-vh': -50.00,
    '--target-suffix-font-size-px': 150,
    '--target-suffix-font-size-vw': 11.72,
    '--target-suffix-x-offset-vw': 324.34,
    '--target-suffix-y-offset-vh': 11.60,
    // Anchor-mode offsets for Suffix (both axes are tied to the Number in relative mode).
    '--target-suffix-x-anchor-offset-vw': 0,
    '--target-suffix-y-anchor-offset-vh': 0,
    // Shared by Prefix/Number/Suffix - see COMPOUND_OFFSET_CONTROLS' comment.
    '--target-x-offset-unit-is-px': 0,
    '--target-y-offset-unit-is-px': 0,
    // Extrusion Depth/Border Thickness Scale With Browser - a DISTINCT mechanism from Font Size's
    // Scale With Browser (see scaledExtrusionPx() in applyExtrusionStyles()).
    '--round-extrusion-scale-with-browser': 0,
    '--try-again-extrusion-scale-with-browser': 0,
    '--try-again-question-mark-extrusion-scale-with-browser': 0,
    '--round-dock-extrusion-scale-with-browser': 0,
    '--high-score-extrusion-scale-with-browser': 0,
    '--target-prefix-extrusion-scale-with-browser': 0,
    '--target-number-extrusion-scale-with-browser': 0,
    '--target-suffix-extrusion-scale-with-browser': 0,
    '--speed-extrusion-scale-with-browser': 0,
    '--ms-per-click-extrusion-scale-with-browser': 0,
    '--result-extrusion-scale-with-browser': 0,
    // One shared flag blends ALL 3 target parts' px/vw font sizes (not per part).
    '--target-scale-with-browser': 1,
    // Hide "Click"/"x" independently. Shared (content visibility, not spatial).
    '--target-prefix-hidden': 0,
    '--target-suffix-hidden': 0,
    // Per-part letter spacing (Prefix/Number/Suffix).
    '--target-prefix-letter-spacing-px': -7,
    '--target-number-letter-spacing-px': -7,
    '--target-suffix-letter-spacing-px': -7,
    '--target-prefix-line-height': 1.2,
    '--target-number-line-height': 1.2,
    '--target-suffix-line-height': 1.2,
    '--target-text-align': 'left',
    '--target-text-valign': 'top',
    '--target-text-align-edge-lock': 1,
    '--target-text-valign-edge-lock': 1,
    '--speed-font-size-px': 109.68,
    '--speed-font-size-vw': 6.2,
    '--speed-scale-with-browser': 0,
    '--speed-x-offset-vw': 38.27,
    '--speed-x-offset-unit-is-px': 0,
    '--speed-number-x-offset-px': 0,
    '--speed-y-offset-vh': -0.81,
    '--speed-y-offset-unit-is-px': 0,
    '--speed-letter-spacing-px': 6.5,
    '--speed-line-height': 1.2,
    '--speed-text-align': 'right',
    '--speed-text-valign': 'bottom',
    '--speed-text-align-edge-lock': 1,
    '--speed-text-valign-edge-lock': 1,
    // "___ms / click" display (gameState.maxTimeMs), since the countdown shows the TOTAL round
    // budget rather than the per-click rate.
    '--ms-per-click-font-size-px': 109.68,
    '--ms-per-click-font-size-vw': 9.38,
    '--ms-per-click-scale-with-browser': 0,
    '--ms-per-click-x-offset-vw': 41.55,
    '--ms-per-click-x-offset-unit-is-px': 0,
    '--ms-per-click-number-x-offset-px': 0,
    '--ms-per-click-y-offset-vh': 67.15,
    '--ms-per-click-y-offset-unit-is-px': 0,
    '--ms-per-click-letter-spacing-px': 7.5,
    '--ms-per-click-line-height': 0.9,
    '--ms-per-click-line2-gap-px': 0,
    '--ms-per-click-text-align': 'right',
    '--ms-per-click-text-valign': 'top',
    '--ms-per-click-text-align-edge-lock': 1,
    '--ms-per-click-text-valign-edge-lock': 1,
    '--result-win-font-size-px': 300,
    '--result-win-font-size-vw': 19.13,
    '--result-win-scale-with-browser': 0,
    '--result-win-x-offset-vw': 0,
    '--result-win-x-offset-unit-is-px': 0,
    '--result-win-y-offset-vh': -102.29,
    '--result-win-y-offset-unit-is-px': 0,
    '--result-win-letter-spacing-px': 0,
    '--result-lose-font-size-px': 310,
    '--result-lose-font-size-vw': 16.64,
    '--result-lose-scale-with-browser': 0,
    '--result-lose-x-offset-vw': 0,
    '--result-lose-x-offset-unit-is-px': 0,
    '--result-lose-y-offset-vh': -93,
    '--result-lose-y-offset-unit-is-px': 0,
    '--result-lose-letter-spacing-px': 0,
    '--result-line-height': 1.2,
    '--result-text-align': 'center',
    '--result-text-valign': 'center',
    '--result-text-align-edge-lock': 1,
    '--result-text-valign-edge-lock': 1,
    '--dev-panel-width-px': 178,
    // Sentinels - overridden with real viewport-computed values at load time (see below).
    '--dev-panel-left-px': 26,
    '--dev-panel-top-px': 6,
    '--dev-panel-height-px': 120,
    // vw/vh-native panel geometry (see .round-breakdown-panel's CSS).
    '--round-breakdown-width-vw': 20,
    '--round-breakdown-height-vh': 45,
    '--round-breakdown-left-vw': 65,
    '--round-breakdown-top-vh': 5,
    '--round-breakdown-x-offset-unit-is-px': 0,
    '--round-breakdown-y-offset-unit-is-px': 0,
    // Round Breakdown (UI TEXT > Round Breakdown): on/off flags are shared (desktop cssVars only,
    // applied via classList toggles); the numeric px values are per-device (see mobileCssVars).
    '--round-breakdown-enabled': 1,
    '--round-breakdown-resizer-enabled': 1,
    '--round-breakdown-font-family': 'monospace',
    // The outline is the panel's ONLY edge line (see .round-breakdown-panel.rb-outline-on).
    '--round-breakdown-outline-enabled': 1,
    '--round-breakdown-outline-thickness-px': 2,
    '--round-breakdown-row-lines-enabled': 1,
    '--round-breakdown-title-font-size-px': 16,
    '--round-breakdown-title-bold': 1,
    '--round-breakdown-title-letter-spacing-px': 0,
    '--round-breakdown-title-line-height': 1.2,
    '--round-breakdown-data-font-size-px': 15,
    '--round-breakdown-data-bold': 0,
    '--round-breakdown-data-letter-spacing-px': 0,
    '--round-breakdown-data-line-height': 1.2,
    '--round-breakdown-scale-with-browser': 0,
    '--round-breakdown-align': 'left',
    '--round-breakdown-align-edge-lock': 0,
    '--round-breakdown-valign': 'top',
    '--round-breakdown-valign-edge-lock': 0,
    '--round-breakdown-autoscroll-enabled': 0,
    '--round-breakdown-autoscroll-speed-px-per-sec': 30,
    '--round-breakdown-autoscroll-pause-before-ms': 1500,
    '--round-breakdown-autoscroll-pause-end-ms': 1500,
    // Opacity of the background FILL only (.round-breakdown-panel::before), not the whole panel.
    '--round-breakdown-panel-opacity': 0.94,
};

// Color variables
const colorVars = {
    '--button-color': '#ff3333',
    '--bg-color': '#ffffff',
    '--round-breakdown-outline-color': '#000000',
    '--round-breakdown-panel-color': '#ffffff',
    '--round-breakdown-title-color': '#333333',
    '--round-breakdown-data-color': '#333333',
    '--round-breakdown-lost-title-color': '#cc0000',
    '--round-breakdown-lost-data-color': '#cc0000',
};


// 8-bit extruded text style for Start/Try Again/Round Text/Target/Speed/Win-Lose. `font` is the
// ONE shared font control and is NOT mobile-split; everything else here is (see
// mobileExtrusionVars and the isMobileActive() picks in buildCombinedShadow()/
// applyExtrusionStyles()). depth/fillColor/borderColor are the shared controls for
// Start+TryAgain+WinLose (depth) and those plus Target+Speed (colors); others have their own.
const extrusionVars = {
    font: '"Micro 5", monospace',
    // Fine-tune for the Target/Ms-per-click debug-line measurement only (measureGlyphTop()), not the
    // real text boxes. text-box-edge "cap" uses the font file's OS/2 sCapHeight metric, often
    // approximate on display fonts, and CSS has no native way to correct it. Unitless multiplier
    // of font-size added to the debug line's endpoint (positive = down). Applying it to the real
    // boxes moves line and text together and never closes the gap. Shared: a font property.
    fontTrimAdjust: 0,
    depth: 5,
    fillColor: '#ffffff',
    borderColor: '#000000',
    // NOTE: round* (not roundDock*) style the Start/Try Again BUTTON - see below.
    roundDepth: 4,
    roundBorderColor: '#ffffff',
    roundOverallBorderThickness: 14,
    // Elements with their own border thickness also get their own border color.
    roundOverallBorderColor: '#0b3864',
    // Try Again's own colors, independent from Start's.
    tryAgainBorderColor: '#ffffff',
    tryAgainOverallBorderColor: '#431114',
    // Try Again's own depth/thickness.
    tryAgainDepth: 9,
    tryAgainOverallBorderThickness: 7,
    // The "?" glyph's own fill color.
    questionMarkFillColor: '#ffffff',
    // The "?" glyph's own extrusion/border; questionMarkFillColor also colors its extrusion trail.
    questionMarkDepth: 5,
    questionMarkOverallBorderThickness: 4,
    questionMarkOverallBorderColor: '#401013',
    // roundDepth/roundBorderColor/roundOverallBorder* above style the Start/Try Again BUTTON
    // (repurposed: Round Text has no "big" state). roundDock* below are Round Text's only
    // extrusion look; its position/font size are read directly by .game-text's CSS.
    roundDockDepth: 9,
    roundDockBorderColor: '#ffffff',
    roundDockOverallBorderThickness: 8,
    roundDockOverallBorderColor: '#bd0d07',
    // High Score, same shape as roundDock* (colors forced-desktop, see EXTRUSION_COLOR_FIELD_NAMES).
    highScoreDepth: 9,
    highScoreBorderColor: '#ffffff',
    highScoreOverallBorderThickness: 8,
    highScoreOverallBorderColor: '#bd0d07',
    // Target/Speed own border colors (fill color stays shared).
    targetBorderColor: '#ffffff',
    targetOverallBorderColor: '#b60300',
    // Per-part depth/thickness; Target border colors above stay shared across parts.
    targetPrefixDepth: 26,
    targetPrefixOverallBorderThickness: 8,
    targetNumberDepth: 26,
    targetNumberOverallBorderThickness: 8,
    targetSuffixDepth: 26,
    targetSuffixOverallBorderThickness: 8,
    speedDepth: 11,
    speedBorderColor: '#ffffff',
    speedOverallBorderColor: '#b60300',
    // "___ms / click" label's own extrusion group.
    msPerClickDepth: 10,
    msPerClickBorderColor: '#ffffff',
    msPerClickOverallBorderColor: '#b60300',
    winFillColor: '#ffffff',
    winBorderColor: '#401013',
    loseFillColor: '#ffffff',
    loseBorderColor: '#401013',
    // Target/Speed/Ms-per-click stay visible on win/lose and recolor until the next round. One
    // shared pair per state for all 3 (see applyGameplayResultColor()).
    gameplayWinTextColor: '#ffffff',
    gameplayWinBorderColor: '#2b8f00',
    gameplayLoseTextColor: '#ffffff',
    gameplayLoseBorderColor: '#dd3333',
    // Win/Lose outer extrusion shape, shared between win and lose (text colors are win*/lose*).
    resultDepth: 8,
    resultOverallBorderThickness: 5,
    // Shared by Win and Lose. 45 = the original fixed diagonal and is special-cased in
    // buildExtrusionShadow(), not just the trig formula's limit.
    resultExtrusionAngle: 45,
    // Overall border wrapping the text+extrusion silhouette. One shared on/off toggle; color is
    // shared for Start/TryAgain/Win-Lose and per-element where an element has its own thickness.
    overallBorderEnabled: true,
    overallBorderColor: '#24f031',
    overallBorderThickness: 20,
    speedOverallBorderThickness: 8,
    msPerClickOverallBorderThickness: 8,
};

// Mobile counterpart to extrusionVars - same shape minus `font` (shared, desktop-only).
const mobileExtrusionVars = {
    depth: 5,
    fillColor: '#ffffff',
    borderColor: '#000000',
    roundDepth: 9,
    roundBorderColor: '#c41516',
    roundOverallBorderThickness: 9,
    roundOverallBorderColor: '#c41516',
    tryAgainBorderColor: '#c41516',
    tryAgainOverallBorderColor: '#c41516',
    tryAgainDepth: 9,
    tryAgainOverallBorderThickness: 5,
    questionMarkFillColor: '#c41516',
    questionMarkDepth: 8,
    questionMarkOverallBorderThickness: 9,
    questionMarkOverallBorderColor: '#c41516',
    roundDockDepth: 9,
    roundDockBorderColor: '#c41516',
    roundDockOverallBorderThickness: 9,
    roundDockOverallBorderColor: '#c41516',
    // High Score colors are forced-desktop (EXTRUSION_COLOR_FIELD_NAMES); only depth/thickness matter.
    highScoreDepth: 9,
    highScoreBorderColor: '#c41516',
    highScoreOverallBorderThickness: 9,
    highScoreOverallBorderColor: '#c41516',
    targetBorderColor: '#ff0000',
    targetOverallBorderColor: '#cc1b20',
    targetPrefixDepth: 20,
    targetPrefixOverallBorderThickness: 12,
    targetNumberDepth: 20,
    targetNumberOverallBorderThickness: 12,
    targetSuffixDepth: 20,
    targetSuffixOverallBorderThickness: 12,
    speedDepth: 8,
    speedBorderColor: '#ff0000',
    speedOverallBorderColor: '#cc1b20',
    msPerClickDepth: 18,
    msPerClickBorderColor: '#ff0000',
    msPerClickOverallBorderColor: '#cc1b20',
    winFillColor: '#ffffff',
    winBorderColor: '#22dd44',
    loseFillColor: '#ffffff',
    loseBorderColor: '#dd3333',
    gameplayWinTextColor: '#22dd44',
    gameplayWinBorderColor: '#22dd44',
    gameplayLoseTextColor: '#dd3333',
    gameplayLoseBorderColor: '#dd3333',
    resultDepth: 5,
    resultOverallBorderThickness: 3,
    resultExtrusionAngle: 45,
    overallBorderEnabled: true,
    overallBorderColor: '#000000',
    overallBorderThickness: 3,
    speedOverallBorderThickness: 8,
    msPerClickOverallBorderThickness: 8,
};
// Landscape extrusion vars, seeded from Desktop (use mobileExtrusionVars to seed from Mobile).
const landscapeExtrusionVars = structuredClone(extrusionVars);

// Stepped diagonal text-shadow stack (1 layer per px of depth) to fake a solid pixel extrusion;
// text-shadow has no depth parameter and CSS vars can't loop. Stored in a --*-shadow property
// by applyExtrusionStyles(). angleDeg omitted or exactly 45 uses the original integer formula
// (the trig path gives float noise at 45). Other angles scale by sqrt(2) so per-step reach
// matches the original (1px,1px) diagonal step.
function buildExtrusionShadow(depthPx, borderColor, angleDeg) {
    const steps = Math.round(depthPx);
    if (steps <= 0) return 'none';
    const layers = [];
    if (angleDeg == null || angleDeg === 45) {
        for (let i = 1; i <= steps; i++) {
            layers.push(`${i}px ${i}px 0 ${borderColor}`);
        }
    } else {
        const rad = angleDeg * Math.PI / 180;
        const dx = Math.SQRT2 * Math.cos(rad);
        const dy = Math.SQRT2 * Math.sin(rad);
        for (let i = 1; i <= steps; i++) {
            layers.push(`${(i * dx).toFixed(3)}px ${(i * dy).toFixed(3)}px 0 ${borderColor}`);
        }
    }
    return layers.join(', ');
}

// "Overall border" ring around the combined text+extrusion silhouette (no CSS primitive for
// that): 8 offset copies at the border thickness, repeated at EVERY extrusion step 0..depth so
// the diagonal sides are bordered too. The ring must sweep along the same angle as the
// extrusion trail, else a custom angle yields a mismatched down-right blob; the 45/null special
// case mirrors buildExtrusionShadow() so default output is unchanged.
function buildBorderRingShadow(depthPx, thicknessPx, borderColor, angleDeg) {
    const steps = Math.round(depthPx);
    const thickness = Math.round(thicknessPx);
    if (thickness <= 0) return '';
    const directions = [
        [thickness, 0], [-thickness, 0], [0, thickness], [0, -thickness],
        [thickness, thickness], [thickness, -thickness], [-thickness, thickness], [-thickness, -thickness],
    ];
    let stepX = 1, stepY = 1;
    if (angleDeg != null && angleDeg !== 45) {
        const rad = angleDeg * Math.PI / 180;
        stepX = Math.SQRT2 * Math.cos(rad);
        stepY = Math.SQRT2 * Math.sin(rad);
    }
    const layers = [];
    for (let i = 0; i <= steps; i++) {
        for (const [dx, dy] of directions) {
            layers.push(`${(i * stepX + dx).toFixed(3)}px ${(i * stepY + dy).toFixed(3)}px 0 ${borderColor}`);
        }
    }
    return layers.join(', ');
}

// Ring is painted first (furthest back) so the extrusion paints over it except at the outer edge.
function buildCombinedShadow(depthPx, extrusionColor, thicknessPx, ringColor, enabled, angleDeg) {
    const parts = [];
    if (enabled) {
        const ring = buildBorderRingShadow(depthPx, thicknessPx, ringColor, angleDeg);
        if (ring) parts.push(ring);
    }
    const extrusion = buildExtrusionShadow(depthPx, extrusionColor, angleDeg);
    if (extrusion !== 'none') parts.push(extrusion);
    return parts.length ? parts.join(', ') : 'none';
}

// Color fields here are desktop-only (always read from extrusionVars); every other field
// (depth, thickness, enabled toggle) stays per-device. Listed explicitly because key names
// can't be relied on (e.g. overallBorderEnabled lives in the same object).
const EXTRUSION_COLOR_FIELD_NAMES = [
    'fillColor', 'borderColor', 'roundBorderColor', 'roundOverallBorderColor',
    'tryAgainBorderColor', 'tryAgainOverallBorderColor', 'questionMarkFillColor',
    'questionMarkOverallBorderColor', 'roundDockBorderColor', 'roundDockOverallBorderColor',
    'highScoreBorderColor', 'highScoreOverallBorderColor',
    'targetBorderColor', 'targetOverallBorderColor', 'speedBorderColor', 'speedOverallBorderColor',
    'msPerClickBorderColor', 'msPerClickOverallBorderColor', 'winFillColor', 'winBorderColor',
    'loseFillColor', 'loseBorderColor', 'overallBorderColor',
    'gameplayWinTextColor', 'gameplayWinBorderColor',
    'gameplayLoseTextColor', 'gameplayLoseBorderColor',
];
// Reference viewport (px) the raw extrusion px sliders were tuned against. Scaling uses vmin
// (min of width/height), not width only.
const EXTRUSION_SCALE_REF_PX = 1280;
// Pushes the active device's extrusion vars to CSS (font and colors always from desktop
// extrusionVars). Extrusion/border Scale With Browser must be applied here in JS, not via CSS
// calc(), because the shadow is a discrete integer-stepped string. Reruns on every resize via
// applyActiveVars().
function applyExtrusionStyles() {
    const root = document.documentElement.style;
    const deviceExt = isMobileActive() ? getActiveMobileExtrusionVars() : extrusionVars;
    const ext = { ...deviceExt };
    // Scale flags live in cssVars/mobileCssVars/landscapeCssVars, not extrusionVars. Must be
    // resolved inside the function, NOT at module scope: isMobileActive() reads
    // LANDSCAPE_TOUCH_QUERY (declared later -> TDZ crash during init), and a module-level value
    // would go stale across breakpoint/tab changes.
    const activeCssVarsForScale = isMobileActive() ? getActiveMobileVars() : cssVars;
    function scaledExtrusionPx(rawPx, flagVar) {
        if (!activeCssVarsForScale[flagVar]) return rawPx;
        return rawPx / EXTRUSION_SCALE_REF_PX * Math.min(window.innerWidth, window.innerHeight);
    }
    EXTRUSION_COLOR_FIELD_NAMES.forEach(field => { ext[field] = extrusionVars[field]; });
    root.setProperty('--extrusion-font', extrusionVars.font);
    // Start/Try Again button's extrusion (see .start-button).
    root.setProperty('--round-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.roundDepth, '--round-extrusion-scale-with-browser'), ext.roundBorderColor, scaledExtrusionPx(ext.roundOverallBorderThickness, '--round-extrusion-scale-with-browser'), ext.roundOverallBorderColor, ext.overallBorderEnabled));
    // Try Again's own colors and depth/thickness (.start-button.try-again-state).
    root.setProperty('--try-again-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.tryAgainDepth, '--try-again-extrusion-scale-with-browser'), ext.tryAgainBorderColor, scaledExtrusionPx(ext.tryAgainOverallBorderThickness, '--try-again-extrusion-scale-with-browser'), ext.tryAgainOverallBorderColor, ext.overallBorderEnabled));
    // The "?" glyph's own extrusion/border.
    root.setProperty('--try-again-question-mark-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.questionMarkDepth, '--try-again-question-mark-extrusion-scale-with-browser'), ext.questionMarkFillColor, scaledExtrusionPx(ext.questionMarkOverallBorderThickness, '--try-again-question-mark-extrusion-scale-with-browser'), ext.questionMarkOverallBorderColor, ext.overallBorderEnabled));
    // Round Text's extrusion, read by .game-text's CSS.
    root.setProperty('--round-dock-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.roundDockDepth, '--round-dock-extrusion-scale-with-browser'), ext.roundDockBorderColor, scaledExtrusionPx(ext.roundDockOverallBorderThickness, '--round-dock-extrusion-scale-with-browser'), ext.roundDockOverallBorderColor, ext.overallBorderEnabled));
    root.setProperty('--high-score-shadow', buildCombinedShadow(scaledExtrusionPx(ext.highScoreDepth, '--high-score-extrusion-scale-with-browser'), ext.highScoreBorderColor, scaledExtrusionPx(ext.highScoreOverallBorderThickness, '--high-score-extrusion-scale-with-browser'), ext.highScoreOverallBorderColor, ext.overallBorderEnabled));
    // Per-part target shadows (#targetCountPrefix/Number/Suffix read their own); color shared.
    root.setProperty('--target-prefix-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.targetPrefixDepth, '--target-prefix-extrusion-scale-with-browser'), ext.targetBorderColor, scaledExtrusionPx(ext.targetPrefixOverallBorderThickness, '--target-prefix-extrusion-scale-with-browser'), ext.targetOverallBorderColor, ext.overallBorderEnabled));
    root.setProperty('--target-number-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.targetNumberDepth, '--target-number-extrusion-scale-with-browser'), ext.targetBorderColor, scaledExtrusionPx(ext.targetNumberOverallBorderThickness, '--target-number-extrusion-scale-with-browser'), ext.targetOverallBorderColor, ext.overallBorderEnabled));
    root.setProperty('--target-suffix-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.targetSuffixDepth, '--target-suffix-extrusion-scale-with-browser'), ext.targetBorderColor, scaledExtrusionPx(ext.targetSuffixOverallBorderThickness, '--target-suffix-extrusion-scale-with-browser'), ext.targetOverallBorderColor, ext.overallBorderEnabled));
    root.setProperty('--speed-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.speedDepth, '--speed-extrusion-scale-with-browser'), ext.speedBorderColor, scaledExtrusionPx(ext.speedOverallBorderThickness, '--speed-extrusion-scale-with-browser'), ext.speedOverallBorderColor, ext.overallBorderEnabled));
    root.setProperty('--ms-per-click-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.msPerClickDepth, '--ms-per-click-extrusion-scale-with-browser'), ext.msPerClickBorderColor, scaledExtrusionPx(ext.msPerClickOverallBorderThickness, '--ms-per-click-extrusion-scale-with-browser'), ext.msPerClickOverallBorderColor, ext.overallBorderEnabled));
    root.setProperty('--result-win-fill-color', ext.winFillColor);
    // Win/Lose ring reuses each state's own border color for both trail and ring, so they can't
    // disagree.
    root.setProperty('--result-win-shadow', buildCombinedShadow(scaledExtrusionPx(ext.resultDepth, '--result-extrusion-scale-with-browser'), ext.winBorderColor, scaledExtrusionPx(ext.resultOverallBorderThickness, '--result-extrusion-scale-with-browser'), ext.winBorderColor, ext.overallBorderEnabled, ext.resultExtrusionAngle));
    root.setProperty('--result-lose-fill-color', ext.loseFillColor);
    root.setProperty('--result-lose-shadow', buildCombinedShadow(scaledExtrusionPx(ext.resultDepth, '--result-extrusion-scale-with-browser'), ext.loseBorderColor, scaledExtrusionPx(ext.resultOverallBorderThickness, '--result-extrusion-scale-with-browser'), ext.loseBorderColor, ext.overallBorderEnabled, ext.resultExtrusionAngle));
    // Each element's "Text Color" picker (its *BorderColor field) also drives the glyph's fill.
    root.setProperty('--round-fill-color', ext.roundBorderColor);
    root.setProperty('--try-again-fill-color', ext.tryAgainBorderColor);
    root.setProperty('--try-again-question-mark-fill-color', ext.questionMarkFillColor);
    root.setProperty('--round-dock-fill-color', ext.roundDockBorderColor);
    root.setProperty('--high-score-fill-color', ext.highScoreBorderColor);
    root.setProperty('--target-fill-color', ext.targetBorderColor);
    root.setProperty('--speed-fill-color', ext.speedBorderColor);
    root.setProperty('--ms-per-click-fill-color', ext.msPerClickBorderColor);
}

// Tints Target/Speed(countdown)/Ms-per-click (plus Round and High Score) on win/lose without
// hiding them, by overriding their --*-fill-color/--*-extrusion-shadow properties. state null
// reverts by re-running applyExtrusionStyles(), which recomputes the normal values.
// Keys applyGameplayResultColor() reads; setupDevSliders()' color handler uses this to re-apply
// the currently showing result tint when one of these pickers changes.
const GAMEPLAY_RESULT_COLOR_FIELDS = ['gameplayWinTextColor', 'gameplayWinBorderColor', 'gameplayLoseTextColor', 'gameplayLoseBorderColor'];
function applyGameplayResultColor(state) {
    if (!state) {
        applyExtrusionStyles();
        // applyExtrusionStyles() doesn't cover the SVG light-levels filters, so revert them explicitly.
        applyLightLevels(cssVars['--button-light-levels'], cssVars['--button-light-levels-contrast'], cssVars['--button-light-levels-floor'], cssVars['--button-light-levels-ceiling'], 'buttonGrayscaleTint');
        // Base revert is a no-op unless --base-follows-result-color applied the Lose override.
        applyLightLevels(cssVars['--base-light-levels'], cssVars['--base-light-levels-contrast'], cssVars['--base-light-levels-floor'], cssVars['--base-light-levels-ceiling'], 'baseGrayscaleTint');
        return;
    }
    const root = document.documentElement.style;
    const deviceExt = isMobileActive() ? getActiveMobileExtrusionVars() : extrusionVars;
    const textColor = state === 'win' ? extrusionVars.gameplayWinTextColor : extrusionVars.gameplayLoseTextColor;
    const borderColor = state === 'win' ? extrusionVars.gameplayWinBorderColor : extrusionVars.gameplayLoseBorderColor;
    // Lose-only button Contrast/Lightness override (Floor/Ceiling stay normal); reverted by the
    // !state branch at the start of the next round (showTargetAndSpeed()).
    if (state === 'lose') {
        applyLightLevels(cssVars['--button-lose-lightness'], cssVars['--button-lose-contrast'], cssVars['--button-light-levels-floor'], cssVars['--button-light-levels-ceiling'], 'buttonGrayscaleTint');
        // With Base Follows Result Color on, the base gets the same Lose Contrast/Lightness, with
        // the base's own Floor/Ceiling.
        if (cssVars['--base-follows-result-color']) {
            applyLightLevels(cssVars['--button-lose-lightness'], cssVars['--button-lose-contrast'], cssVars['--base-light-levels-floor'], cssVars['--base-light-levels-ceiling'], 'baseGrayscaleTint');
        }
    }
    root.setProperty('--target-fill-color', textColor);
    root.setProperty('--speed-fill-color', textColor);
    root.setProperty('--ms-per-click-fill-color', textColor);
    // Round Text and High Score join the same tint (reverted by the !state branch).
    root.setProperty('--round-dock-fill-color', textColor);
    root.setProperty('--high-score-fill-color', textColor);
    // Pass the tinted borderColor for BOTH the extrusion trail and the ring color so the whole
    // extrusion+ring recolors, not half. Same per-part split as applyExtrusionStyles().
    root.setProperty('--target-prefix-extrusion-shadow', buildCombinedShadow(deviceExt.targetPrefixDepth, borderColor, deviceExt.targetPrefixOverallBorderThickness, borderColor, deviceExt.overallBorderEnabled));
    root.setProperty('--target-number-extrusion-shadow', buildCombinedShadow(deviceExt.targetNumberDepth, borderColor, deviceExt.targetNumberOverallBorderThickness, borderColor, deviceExt.overallBorderEnabled));
    root.setProperty('--target-suffix-extrusion-shadow', buildCombinedShadow(deviceExt.targetSuffixDepth, borderColor, deviceExt.targetSuffixOverallBorderThickness, borderColor, deviceExt.overallBorderEnabled));
    root.setProperty('--speed-extrusion-shadow', buildCombinedShadow(deviceExt.speedDepth, borderColor, deviceExt.speedOverallBorderThickness, borderColor, deviceExt.overallBorderEnabled));
    root.setProperty('--ms-per-click-extrusion-shadow', buildCombinedShadow(deviceExt.msPerClickDepth, borderColor, deviceExt.msPerClickOverallBorderThickness, borderColor, deviceExt.overallBorderEnabled));
    root.setProperty('--round-dock-extrusion-shadow', buildCombinedShadow(deviceExt.roundDockDepth, borderColor, deviceExt.roundDockOverallBorderThickness, borderColor, deviceExt.overallBorderEnabled));
    root.setProperty('--high-score-shadow', buildCombinedShadow(deviceExt.highScoreDepth, borderColor, deviceExt.highScoreOverallBorderThickness, borderColor, deviceExt.overallBorderEnabled));
}

// Mobile overrides, applied instead of cssVars when MOBILE_MEDIA_QUERY matches (see
// applyActiveVars()). Explicit values, NOT a spread-clone of cssVars, which would clobber
// diverged mobile tuning. --dev-panel-width-px is intentionally excluded (dev-tool only).
const mobileCssVars = {
    '--button-diameter-vw': 77,
    '--button-min-diameter-px': 165,
    '--button-height-offset-px': -3.5,
    '--button-press-intensity-px': 8.5,
    '--button-x-offset-vw': -2.32,
    '--button-x-offset-unit-is-px': 0,
    '--button-y-offset-vh': 9.37,
    '--button-y-offset-unit-is-px': 0,
    '--button-text-align': 'center',
    '--button-text-valign': 'center',
    '--button-text-align-edge-lock': 0,
    '--button-text-valign-edge-lock': 0,
    '--button-release-ms': 0,
    '--button-press-ms': 0,
    // Mobile's Max/Min Button Scale: Max at 767px (the breakpoint), scale shrinks proportionally
    // with width below that, floored at Min (see computeButtonUserScale()). 1 = no-op.
    '--button-max-scale': 1,
    '--button-min-scale': 1,
    '--click-burst-speed-ms': 180,
    '--click-burst-scale': 0.14,
    // The click-burst distance/height/curve-offset keys hold a VW number on mobile despite the
    // "-px" names; resolveSpatialPx() converts at point of use against the current viewport.
    // Desktop values are genuine px.
    '--click-burst-distance-px': 8,
    '--click-burst-height-px': 1,
    '--click-burst-curve-offset-px': 6.5,
    '--click-burst-count-min': 3,
    '--click-burst-count-max': 5,
    '--click-burst-curve-amount': 0.2,
    '--click-burst-shadow-final-scale': 1,
    // % of the button's own rendered width (see the desktop object).
    '--shadow-x-offset': 27.4286,
    '--shadow-y-offset': 18.1818,
    '--shadow-blur': 0,
    '--shadow-scale': 0.65,
    '--shadow-skew': -37,
    '--shadow-elongation-intensity': 1,
    '--shadow-elongation-angle': 0,
    '--shadow-rotate': 11,
    '--text-font-size-px': 199.17,
    '--text-font-size-vw': 38.67,
    '--text-scale-with-browser': 1,
    '--text-x-offset-vw': 0.96,
    '--text-x-offset-unit-is-px': 0,
    '--text-y-offset-vh': 1.81,
    '--text-y-offset-unit-is-px': 0,
    '--text-letter-spacing-px': -0.5,
    '--text-line-height': 1.3,
    '--start-text-align': 'center',
    '--start-text-valign': 'center',
    '--start-text-align-edge-lock': 0,
    '--start-text-valign-edge-lock': 0,
    '--try-again-text-align': 'center',
    '--try-again-text-valign': 'center',
    '--try-again-text-align-edge-lock': 0,
    '--try-again-text-valign-edge-lock': 0,
    '--try-again-question-mark-text-align': 'center',
    '--try-again-question-mark-text-valign': 'center',
    '--try-again-question-mark-text-align-edge-lock': 0,
    '--try-again-question-mark-text-valign-edge-lock': 0,
    '--try-again-text-font-size-px': 143.8,
    '--try-again-text-font-size-vw': 20,
    '--try-again-text-scale-with-browser': 1,
    '--try-again-text-x-offset-vw': -0.88,
    '--try-again-text-x-offset-unit-is-px': 0,
    '--try-again-text-y-offset-vh': 0.36,
    '--try-again-text-y-offset-unit-is-px': 0,
    '--try-again-text-letter-spacing-px': 9.5,
    '--try-again-text-line-height': 0.85,
    // See the desktop cssVars comment (mobile viewport).
    '--try-again-question-mark-font-size-px': 224.6,
    '--try-again-question-mark-font-size-vw': 20,
    '--try-again-question-mark-scale-with-browser': 0,
    '--try-again-question-mark-x-offset-vw': 1.63,
    '--try-again-question-mark-x-offset-unit-is-px': 0,
    '--try-again-question-mark-y-offset-vh': 24.45,
    '--try-again-question-mark-y-offset-unit-is-px': 0,
    '--round-dock-x-offset-vw': 37.47,
    '--round-dock-x-offset-unit-is-px': 0,
    '--round-number-x-offset-px': 0,
    '--round-dock-y-offset-vh': 1.08,
    '--round-dock-y-offset-unit-is-px': 0,
    '--round-font-size-px': 80.76,
    '--round-font-size-vw': 20,
    '--round-scale-with-browser': 0,
    '--round-letter-spacing-px': -1,
    '--round-line-height': 1.2,
    '--round-text-align': 'left',
    '--round-text-valign': 'bottom',
    '--round-text-align-edge-lock': 1,
    '--round-text-valign-edge-lock': 1,
    // High Score. --hide-high-score-enabled is shared and declared in desktop cssVars only.
    '--high-score-x-offset-vw': 0,
    '--high-score-x-offset-unit-is-px': 0,
    '--high-score-y-offset-vh': -35,
    '--high-score-y-offset-unit-is-px': 0,
    '--high-score-font-size-px': 30,
    '--high-score-font-size-vw': 7,
    '--high-score-scale-with-browser': 0,
    '--high-score-letter-spacing-px': 0,
    '--high-score-line-height': 1.2,
    '--high-score-rotate-deg': 0,
    '--high-score-text-align': 'center',
    '--high-score-text-valign': 'top',
    '--high-score-text-align-edge-lock': 0,
    '--high-score-text-valign-edge-lock': 0,
    '--target-prefix-font-size-px': 70,
    '--target-prefix-font-size-vw': 5.47,
    '--target-prefix-x-offset-vw': 37.50,
    '--target-prefix-y-offset-vh': -29.31,
    '--target-prefix-y-anchor-offset-vh': 0,
    '--target-prefix-letter-spacing-px': 0,
    '--target-number-font-size-px': 238.44,
    '--target-number-font-size-vw': 18.63,
    '--target-number-x-offset-vw': 111.06,
    '--target-number-y-offset-vh': 34.90,
    '--target-number-letter-spacing-px': 0,
    '--target-suffix-font-size-px': 70,
    '--target-suffix-font-size-vw': 5.47,
    '--target-suffix-x-offset-vw': 165.75,
    '--target-suffix-y-offset-vh': 16.02,
    '--target-suffix-x-anchor-offset-vw': 0,
    '--target-suffix-y-anchor-offset-vh': 0,
    '--target-suffix-letter-spacing-px': 0,
    // Shared by all 3 parts - see COMPOUND_OFFSET_CONTROLS' comment.
    '--target-x-offset-unit-is-px': 0,
    '--target-y-offset-unit-is-px': 0,
    // Extrusion Depth/Border Thickness Scale With Browser - see cssVars' matching block.
    '--round-extrusion-scale-with-browser': 0,
    '--try-again-extrusion-scale-with-browser': 0,
    '--try-again-question-mark-extrusion-scale-with-browser': 0,
    '--round-dock-extrusion-scale-with-browser': 0,
    '--high-score-extrusion-scale-with-browser': 0,
    '--target-prefix-extrusion-scale-with-browser': 0,
    '--target-number-extrusion-scale-with-browser': 0,
    '--target-suffix-extrusion-scale-with-browser': 0,
    '--speed-extrusion-scale-with-browser': 0,
    '--ms-per-click-extrusion-scale-with-browser': 0,
    '--result-extrusion-scale-with-browser': 0,
    '--target-scale-with-browser': 1,
    '--target-prefix-line-height': 0.65,
    '--target-number-line-height': 0.65,
    '--target-suffix-line-height': 0.65,
    '--target-text-align': 'left',
    '--target-text-valign': 'top',
    '--target-text-align-edge-lock': 1,
    '--target-text-valign-edge-lock': 1,
    '--speed-font-size-px': 53.81,
    '--speed-font-size-vw': 9.93,
    '--speed-scale-with-browser': 0,
    '--speed-x-offset-vw': 37.05,
    '--speed-x-offset-unit-is-px': 0,
    '--speed-number-x-offset-px': 0,
    '--speed-y-offset-vh': 77.55,
    '--speed-y-offset-unit-is-px': 0,
    '--speed-letter-spacing-px': 7,
    '--speed-line-height': 1.45,
    '--speed-text-align': 'left',
    '--speed-text-valign': 'bottom',
    '--speed-text-align-edge-lock': 1,
    '--speed-text-valign-edge-lock': 1,
    '--ms-per-click-font-size-px': 81.4,
    '--ms-per-click-font-size-vw': 14.86,
    '--ms-per-click-scale-with-browser': 1,
    '--ms-per-click-x-offset-vw': 49.25,
    '--ms-per-click-x-offset-unit-is-px': 1,
    '--ms-per-click-number-x-offset-px': 0,
    '--ms-per-click-y-offset-vh': 20,
    '--ms-per-click-y-offset-unit-is-px': 1,
    '--ms-per-click-letter-spacing-px': -0.5,
    '--ms-per-click-line-height': 0.65,
    '--ms-per-click-line2-gap-px': 0,
    '--ms-per-click-text-align': 'right',
    '--ms-per-click-text-valign': 'top',
    '--ms-per-click-text-align-edge-lock': 1,
    '--ms-per-click-text-valign-edge-lock': 1,
    '--result-win-font-size-px': 131.7,
    '--result-win-font-size-vw': 4.77,
    '--result-win-scale-with-browser': 1,
    '--result-win-x-offset-vw': 0,
    '--result-win-x-offset-unit-is-px': 0,
    '--result-win-y-offset-vh': 1.4598726114649683,
    '--result-win-y-offset-unit-is-px': 0,
    '--result-win-letter-spacing-px': 0,
    '--result-lose-font-size-px': 142.19,
    '--result-lose-font-size-vw': 4.77,
    '--result-lose-scale-with-browser': 1,
    '--result-lose-x-offset-vw': 0,
    '--result-lose-x-offset-unit-is-px': 0,
    '--result-lose-y-offset-vh': 1.46,
    '--result-lose-y-offset-unit-is-px': 0,
    '--result-lose-letter-spacing-px': 0,
    '--result-line-height': 1.2,
    '--result-text-align': 'center',
    '--result-text-valign': 'center',
    '--result-text-align-edge-lock': 0,
    '--result-text-valign-edge-lock': 0,
    '--round-breakdown-width-vw': 80,
    '--round-breakdown-height-vh': 40,
    '--round-breakdown-left-vw': 10,
    '--round-breakdown-top-vh': 15,
    '--round-breakdown-x-offset-unit-is-px': 0,
    '--round-breakdown-y-offset-unit-is-px': 0,
    '--round-breakdown-outline-thickness-px': 2,
    '--round-breakdown-title-font-size-px': 14,
    '--round-breakdown-title-letter-spacing-px': 0,
    '--round-breakdown-title-line-height': 1.2,
    '--round-breakdown-data-font-size-px': 13,
    '--round-breakdown-data-letter-spacing-px': 0,
    '--round-breakdown-data-line-height': 1.2,
};
// Landscape profile: a real touchscreen phone in landscape gets its own tuning instead of
// Desktop's or Mobile's portrait values. Seeded from Desktop (use mobileCssVars to seed from
// Mobile), retuned via the Landscape dev-panel tab.
const landscapeCssVars = structuredClone(cssVars);
const mobileColorVars = {
    '--button-color': '#ff3333',
    // No --bg-color: background is a single shared value (colorVars only; see applyActiveVars()).
};
// Landscape color vars, seeded from Desktop.
const landscapeColorVars = structuredClone(colorVars);

// Crossing this breakpoint (resize/rotation) re-applies the active var set live.
const MOBILE_MEDIA_QUERY = window.matchMedia('(max-width: 767px)');
// A touchscreen device in landscape gets its own profile, checked FIRST and independent of
// width so a wide landscape phone isn't treated as Desktop. (hover:none) and (pointer:coarse)
// keep wide desktop windows out; orientation alone can't tell them apart.
const LANDSCAPE_TOUCH_QUERY = window.matchMedia('(hover: none) and (pointer: coarse) and (orientation: landscape)');
function isLandscapeActive() {
    return LANDSCAPE_TOUCH_QUERY.matches;
}
// True for either non-Desktop profile (Mobile or Landscape). Use getActiveDeviceProfile() where
// the data differs per sub-profile.
function isMobileActive() {
    return isLandscapeActive() || MOBILE_MEDIA_QUERY.matches;
}
function getActiveDeviceProfile() {
    if (isLandscapeActive()) return 'landscape';
    return MOBILE_MEDIA_QUERY.matches ? 'mobile' : 'desktop';
}
// Pick the Mobile vs Landscape sibling so call sites can keep a 2-way
// "isMobileActive() ? getActiveXVars() : X" ternary.
function getActiveMobileVars() {
    return isLandscapeActive() ? landscapeCssVars : mobileCssVars;
}
function getActiveMobileExtrusionVars() {
    return isLandscapeActive() ? landscapeExtrusionVars : mobileExtrusionVars;
}
function getActiveMobileTextOverrides() {
    return isLandscapeActive() ? landscapeTextOverrides : mobileTextOverrides;
}

// Desktop: value is px, returned as-is. Mobile/Landscape: value is vw, converted against the
// current window.innerWidth at point of use (not cached) so resize/rotation is picked up live.
function resolveSpatialPx(value) {
    return isMobileActive() ? value * window.innerWidth / 100 : value;
}
