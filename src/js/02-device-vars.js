
const cssVars = {
    '--button-diameter-vw': 42.5,
    // 380, not some smaller "safe-looking" number - at this
    // diameter, a floor only actually engages below floor/0.425 px
    // of viewport width; anything under ~326px never fires at all
    // before the 767px mobile breakpoint takes over first, making it
    // silently inert for the exact "narrowed desktop window"
    // scenario this control exists for. 380 engages below ~894px -
    // a real, noticeable floor across genuinely narrow-but-desktop
    // widths, invisible above that.
    '--button-min-diameter-px': 380,
    '--button-height-offset-px': -4.5,
    '--button-press-intensity-px': 8,
    '--button-x-offset-vw': -1,
    '--button-x-offset-unit-is-px': 0,
    '--button-y-offset-vh': 6,
    '--button-y-offset-unit-is-px': 0,
    // Horizontal/Vertical Align + Edge Lock (dev-panel controls) -
    // defaults preserve the button's pre-existing always-centered
    // behavior exactly (center/center, unlocked) until tuned.
    '--button-text-align': 'center',
    '--button-text-valign': 'center',
    '--button-text-align-edge-lock': 0,
    '--button-text-valign-edge-lock': 0,
    '--button-release-ms': 0,
    '--button-press-ms': 0,
    // Max/Min Button Scale - an extra multiplier on top of the
    // button's normal vw-based sizing (applied to .button-assembly
    // as a whole, so the button, its base, AND its shadow-caster
    // all scale together), per direct request. Desktop's own
    // formula (see computeButtonUserScale()) interpolates linearly
    // between Min Scale at 768px (the narrowest a Desktop-mode
    // browser can be) and Max Scale at 1280px ("full screen" -
    // this project's own established desktop reference width, see
    // the font-size-px conversion's comment) and beyond, clamped
    // at both ends. Landscape reuses these exact values and this
    // exact formula against its own real width - per direct
    // request ("for now, for landscape mobile mode, use the same
    // settings as desktop mode"), not its own independent pair.
    // Both default to 1 (no-op) until spread apart.
    '--button-max-scale': 1,
    '--button-min-scale': 1,
    // Base/backing recolor - grayscale+levels+multiply-tint (see
    // #baseGrayscaleTint filter defs), replacing the old hue-rotate
    // approach which could never reach white/gray from the red
    // source (hue-rotate can't desaturate). --base-tint-color isn't
    // stored here - it's set directly from colorBase's own value in
    // setBaseHue(). This one IS: the grayscale layer's own
    // brightness before tinting, single/shared like Base Color
    // itself (not mobile-split, not per Main Button diameter etc.).
    // Split back into independent Base/Button pairs - per direct
    // follow-up request ("give me a contrast and lightness slider
    // for the base overall"). REVERSES an earlier explicit request
    // ("Light Levels should just be Light Levels. It should affect
    // all svgs" - the single shared value these used to be) - a
    // deliberate, informed reversal this time, not an oversight;
    // see applyLightLevels()'s own updated comment. Both pairs
    // seeded identically (matching the shared value's own former
    // contrast=1.19 tuning) so today's exact look is reproduced
    // unchanged for BOTH base and button until either is retuned
    // independently. Floor/ceiling define the final output range,
    // Contrast pivots around the 0.5 midpoint (see
    // applyLightLevels()'s own formula comment) - 0 level, 1
    // contrast, 0 floor, 1 ceiling would reduce to the identity
    // transform.
    '--base-light-levels': 0,
    '--base-light-levels-contrast': 1.19,
    '--base-light-levels-floor': 0,
    '--base-light-levels-ceiling': 1,
    '--button-light-levels': 0,
    '--button-light-levels-contrast': 1.19,
    '--button-light-levels-floor': 0,
    '--button-light-levels-ceiling': 1,
    // Saturation - per explicit request ("give me a saturation
    // slider for both button and base"). 1 = unchanged, matching
    // feColorMatrix type="saturate"'s own spec default - see
    // applySaturation()/the matching filter primitives' own
    // comments.
    '--base-saturation': 1,
    '--button-saturation': 1,
    // Lose-only OVERRIDE for the button's own contrast/level (floor/
    // ceiling stay whatever --button-light-levels-floor/-ceiling
    // above are set to) - per direct request ("provide me 2 sliders
    // to control the button contrast and lightness at a lose").
    // Defaults reproduce --button-light-levels/-contrast's own
    // defaults exactly (0 level, 1.19 contrast) so Lose looks
    // identical to normal until deliberately tuned apart. See
    // applyGameplayResultColor()'s own comment for the lifecycle
    // (active only while resultText carries .result-lose).
    '--button-lose-contrast': 1.19,
    '--button-lose-lightness': 0,
    // Originally opt-in/off by default; per direct follow-up
    // request ("upon win or lose, the base will change color when
    // the button changes color") this is now the default - the
    // base always tracks the button's own win/lose tint unless
    // explicitly turned off via the checkbox. See the matching CSS
    // rule's own comment.
    '--base-follows-result-color': 1,
    // Blend mode for each filter's own tint step (feBlend) - per
    // explicit request for a dropdown. 'overlay' matches the
    // existing hardcoded default until changed.
    '--base-blend-mode': 'color',
    '--button-blend-mode': 'color',
    // Regular (false/0) vs Thin (true/1) base+backing artwork - per
    // explicit request, single/shared like the base tint above.
    '--thin-base-enabled': 0,
    // 4 independent layer-visibility toggles (Hide Button/Base/
    // Backing SVG/White SVG) - per explicit request, all off by
    // default. Single/shared like Thin Base above.
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
    // Final scale-down for the click-burst SHADOW containers only
    // (buildTransform() in JS), applied after every other shadow
    // modifier - see the dev-panel HTML comment for the full
    // reasoning. 1 = no change from the pre-existing look.
    '--click-burst-shadow-final-scale': 0.64,
    // Not truly a CSS var (nothing reads it via var()) - piggybacking
    // on this object purely so the frame-set choice is included in
    // copySettings()/saveSettings() for free, matching every other
    // dev-panel setting's persistence. Shared, not mobile-split (see
    // updateClickFrameSet()) - only ever read from here directly.
    '--click-frame-set': 'CLICK3',
    // Also not a true CSS var, same reasoning - piggybacks on this
    // object purely for free persistence via copySettings().
    '--flip-button-svg': 0,
    // Rescaled from raw px (177, 113 - the live git-tracked
    // settings log's current values at the time of this fix, more
    // current than this file's own stale 198/136) to % of the
    // button's own rendered width, preserving today's exact
    // appearance at this session's 1280px test width (button
    // rendered at 544px wide: 177/544*100, 113/544*100) - see
    // .shadow-caster-layer's own CSS comment for why the unit
    // changed.
    '--shadow-x-offset': 24.25,
    '--shadow-y-offset': 17.17,
    '--shadow-blur': 0,
    '--shadow-scale': 0.55,
    '--shadow-skew': -8,
    // Replaces the previous 3 separate axis-locked stretch vars
    // (--shadow-stretch/-x/-45, one fixed direction each) with a
    // single continuous elongation - per explicit request ("replace
    // the 3 elongation sliders with these 2 - elongation intensity,
    // elongation angle"). Angle 0 = vertical (the Y-axis), 90 =
    // horizontal (X-axis), matching CSS rotate()'s own rotation
    // direction for everything in between - per explicit spec.
    // Implemented as rotate(angle) scaleY(intensity) rotate(-angle):
    // the pre-rotation aligns whatever axis sits at `angle` from
    // vertical onto the real Y-axis, scaleY stretches THAT axis,
    // and the post-rotation restores the original orientation - the
    // standard way to scale along a continuously-variable arbitrary
    // axis (a strict generalization of the old fixed-axis
    // rotate(45)/rotate(-45) trick the previous 45deg slider used).
    // Defaults (2, 0) reproduce the exact prior desktop look: at
    // angle 0 the pre/post rotations are both 0deg (no-ops), so the
    // formula collapses to a plain scaleY(intensity) - identical to
    // the old Y-only --shadow-stretch (X/45 were both already
    // inactive at 1, i.e. no stretch on those axes).
    '--shadow-elongation-intensity': 1.9,
    '--shadow-elongation-angle': 76,
    '--shadow-rotate': 0,
    // Formerly Round Text's big-state position/size - repurposed to
    // drive the Start/Try Again BUTTON's position/size instead,
    // since Round Text no longer has a big state at all and the
    // button now borrows this exact look per explicit request (see
    // .start-button's own CSS comment).
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
    // Try Again's own alignment, independent from Start's above -
    // per direct follow-up request. Try Again and Start share ONE
    // DOM element (startButton), so applyTextAlignAnchors() special-
    // cases it to pick whichever of these 2 var pairs matches the
    // CURRENTLY DISPLAYED state for the shared align-CLASS (see its
    // own comment) - the -x/-y-base/-sign/-unit custom properties
    // computed from each pair still coexist independently either
    // way, since they're distinctly prefixed.
    '--try-again-text-align': 'center',
    '--try-again-text-valign': 'center',
    '--try-again-text-align-edge-lock': 0,
    '--try-again-text-valign-edge-lock': 0,
    // The "?" glyph's own alignment, independent from the "Try
    // again" text above - per the same direct request.
    '--try-again-question-mark-text-align': 'center',
    '--try-again-question-mark-text-valign': 'center',
    '--try-again-question-mark-text-align-edge-lock': 0,
    '--try-again-question-mark-text-valign-edge-lock': 0,
    // Edge Lock checkboxes (Desktop) - see applyTextAlignAnchors()'s
    // own comment. 0/1, not boolean, matching every other flag var
    // in this object.
    '--start-text-align-edge-lock': 0,
    '--start-text-valign-edge-lock': 0,
    // Try Again's own font-size/position, independent from Start's -
    // per explicit request. Starts matching Start's own values until
    // tuned - see .start-button.try-again-state's CSS.
    '--try-again-text-font-size-px': 204.83,
    '--try-again-text-font-size-vw': 9.38,
    '--try-again-text-scale-with-browser': 0,
    '--try-again-text-x-offset-vw': -0.16,
    '--try-again-text-x-offset-unit-is-px': 0,
    '--try-again-text-y-offset-vh': -9.05,
    '--try-again-text-y-offset-unit-is-px': 0,
    // Try Again's own letter/line spacing, independent from
    // Start's above - per explicit request ("also give me letter
    // spacing and line spacing for the Try again text"). Starts
    // matching Start's own values until tuned, same convention as
    // the font-size/position split above.
    '--try-again-text-letter-spacing-px': 17.5,
    '--try-again-text-line-height': 0.85,
    // The "?" glyph's own font-size/position, independent from the
    // "Try again" text above - per explicit request. Was inline
    // text before (flowed right after "Try again", no independent
    // placement at all) - now position:fixed like every other
    // element, same screen-center vw/vh origin (CLAUDE.md Section
    // 12k). Defaults are a live measurement of exactly where the
    // "?" already rendered under the old inline layout, so shipping
    // this causes no visual jump - not the same numbers as Try
    // Again's own X/Y above, since those position the whole button/
    // text box, not this glyph's rendered center.
    '--try-again-question-mark-font-size-px': 341.37,
    '--try-again-question-mark-font-size-vw': 20.09,
    '--try-again-question-mark-scale-with-browser': 0,
    '--try-again-question-mark-x-offset-vw': 1.08,
    '--try-again-question-mark-x-offset-unit-is-px': 0,
    '--try-again-question-mark-y-offset-vh': 35.61,
    '--try-again-question-mark-y-offset-unit-is-px': 0,
    // Round Text's ONE permanent position - it no longer has a
    // separate "big" state to dock away from (see .game-text's own
    // CSS comment). Font-size now has its own independent slider
    // (--round-font-size-vw) - per explicit request; it used to
    // always MATCH --speed-font-size-vw, no longer does.
    '--round-dock-x-offset-vw': 58,
    '--round-dock-x-offset-unit-is-px': 0,
    // Independent fine nudge for just the live round/countdown/ms-
    // per-click NUMBER, on top of each element's own whole-block
    // X offset above - per direct request for 3 dedicated sliders.
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
    // High Score - per direct request ("Add a Highscore text with
    // its own font settings like the others... make it its own
    // settings group"). Same field shape as Round Text above.
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
    // Hide High Score - per direct request. Single/shared like the
    // Hide Button/Base/Backing SVG/White SVG checkboxes.
    '--hide-high-score-enabled': 0,
    // The "?" in "Try again?" blinks while that text is shown - per
    // explicit request. Flash = how long it's HIDDEN; Hold = how
    // long it's VISIBLE before the next flash - see
    // startTryAgainFlash().
    '--try-again-flash-duration-ms': 340,
    '--try-again-hold-duration-ms': 1550,
    '--round-blink1-hide-ms': 350,
    '--round-blink1-show-ms': 400,
    '--round-blink2-hide-ms': 380,
    '--round-blink2-show-ms': 450,
    '--round-blink3-hide-ms': 400,
    '--round-blink3-show-ms': 500,
    // How long the NEW number holds on screen (still at big/held
    // scale) after the blink sequence finishes, before docking
    // into gameplay - per explicit request for a dedicated slider
    // for this gap. Corrected 2026-09-14: this used to be
    // described as "separate from gameState.roundDuration (the
    // hold BEFORE the blink starts)" - that hold was removed
    // (see runRoundBlinkSequence()'s own comment on the same
    // date), so this is now the only post-win hold left.
    '--round-post-blink-hold-ms': 1300,
    // Per direct follow-up request ("add a Blink 4 - Disappear
    // slider, after which the new round number shows") - a genuine
    // 4th sequential blink phase (hide only, still showing the OLD
    // number), run in the SAME phases chain as Blink 1-3. The new
    // number is only revealed once this phase elapses, so there's
    // no separate "hide it again after showing it" step and no
    // same-tick-race risk the way an earlier parallel-timer design
    // of this feature had. Defaulted to 250, matching Blink 1-3's
    // own hide-phase default.
    '--round-blink4-hide-ms': 250,
    // High Score blink - per direct request ("when the current
    // highscore has been beaten. The high score number will flash
    // alongside the other numbers to transition to the new
    // number. If the highscore number doesnt require change then
    // there will be no flash"). Corrected 2026-09-14 per direct
    // follow-up ("it doesn't need its own animation flashing
    // settings. It will just use the same settings that it
    // already have"): runHighScoreBlinkSequence() now reuses the
    // round number's own Blink 1-4 timers above (--round-blink1
    // through --round-blink4-hide-ms) instead of a dedicated set -
    // the earlier dedicated '--high-score-blink*-ms' fields this
    // comment used to introduce are removed. What genuinely is
    // dedicated to High Score is WHEN that shared sequence starts,
    // not how long each phase takes - see
    // --high-score-flash-delay-ms below and
    // runHighScoreBlinkSequence()'s own comment.
    '--high-score-flash-delay-ms': 0,
    // Per explicit request ("provide me a checkbox, when selected,
    // all 3 of those texts will flash along with the round
    // number") - shared/not device-split, same convention as the
    // round-blink timings above. See runRoundBlinkSequence()'s and
    // showRoundText()'s own comments for how this is consumed.
    // Defaulted ON per direct follow-up request - previously OFF
    // meant Target/Speed/Ms-per-click flatly hid/reappeared around
    // every round transition (after Try Again, and after a Win)
    // instead of blinking in sync with the round number the way the
    // user actually wanted.
    '--gameplay-result-flash-with-round': 1,
    // Prefix/Number/Suffix independent font-size + full X/Y
    // position - per direct request ("separate font size, y
    // offset, x offset sliders for the 'Click', number, and 'x'",
    // later "I want the target 'click', number, x, to be separate
    // entities, who's size and xy offsets aren't dependent").
    // Number's font-size defaults to the SAME value
    // --target-font-size-px already had, so its own visual size
    // was unchanged by the original split; Prefix/Suffix (new
    // words, previously not shown at all) default to a smaller,
    // visually-reasonable fraction rather than inheriting the same
    // huge number-sized default. The X/Y Offset (vw/vh) values
    // below replace the old shared-wrapper-position + small-px-
    // nudge design (see git history) with each part's own full,
    // independent position (same shape as every other independent
    // element) - defaults computed live from the exact pre-change
    // visual layout (measured getBoundingClientRect() centers
    // relative to .game-container, using the real saved-git
    // settings, not the hardcoded ones) so this migration is
    // visually a no-op until re-tuned.
    '--target-prefix-font-size-px': 150,
    '--target-prefix-font-size-vw': 11.72,
    '--target-prefix-x-offset-vw': 49.20,
    '--target-prefix-y-offset-vh': 9.19,
    // Anchor-mode counterparts (2026-09-20) - only ever used when
    // Prefix/Suffix's own UI-Engine position.mode is switched away
    // from the default 'relative' via the Inspector (see
    // updateTargetAnchoredPositions()'s own comment). Default 0 -
    // never tuned before, since this mode didn't exist previously;
    // Prefix has no anchor-mode X (X was never mode-dependent, see
    // #targetCountPrefix's own CSS comment), so only Y gets one.
    '--target-prefix-y-anchor-offset-vh': 0,
    '--target-number-font-size-px': 500,
    '--target-number-font-size-vw': 39.06,
    '--target-number-x-offset-vw': 200.24,
    '--target-number-y-offset-vh': -50.00,
    '--target-suffix-font-size-px': 150,
    '--target-suffix-font-size-vw': 11.72,
    '--target-suffix-x-offset-vw': 324.34,
    '--target-suffix-y-offset-vh': 11.60,
    // Anchor-mode counterparts (2026-09-20) - same reasoning as
    // Prefix's above. Suffix genuinely has both axes tied to the
    // Number today (no independent mode yet for either), so both
    // X and Y get one.
    '--target-suffix-x-anchor-offset-vw': 0,
    '--target-suffix-y-anchor-offset-vh': 0,
    // Shared by all 3 parts (Prefix/Number/Suffix), not per-part -
    // see COMPOUND_OFFSET_CONTROLS' own comment on why.
    '--target-x-offset-unit-is-px': 0,
    '--target-y-offset-unit-is-px': 0,
    // Extrusion Depth/Border Thickness Scale With Browser - see
    // applyExtrusionStyles()'s own scaledExtrusionPx() comment for
    // why this is a DISTINCT mechanism from Font Size's own Scale
    // With Browser flags below, despite the similar name. Off by
    // default (0), same as every existing Font Size flag except
    // Target's own (matches that convention, not a new default
    // philosophy).
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
    // Scale With Browser - per direct request, reintroduced after
    // the earlier wrapper-level one was removed as vestigial (it
    // stopped affecting anything once Prefix/Number/Suffix each
    // got their own px-only font-size). One shared flag blends
    // ALL 3 parts' own px/vw pair together (not 3 independent
    // checkboxes) - matches the single checkbox actually asked
    // for. Defaults ON per explicit follow-up request.
    '--target-scale-with-browser': 1,
    // Hide Prefix/Suffix - per direct request for checkboxes to
    // hide "Click"/"x" independently. Single/shared (not per-tab)
    // like every other show/hide toggle in this file (Hide
    // Button/Base/etc.) - a content visibility choice, not a
    // spatial one.
    '--target-prefix-hidden': 0,
    '--target-suffix-hidden': 0,
    // Letter Spacing decomposed from one shared --target-letter-
    // spacing-px into 3 independent per-part vars - per direct
    // follow-up request ("provide me letter spacing sliders for all
    // 3 as well"), same decomposition as Font Size/X/Y Offset above.
    // All 3 seeded with the OLD shared value (-7) so the deploy is
    // visually identical until tuned.
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
    // Shows gameState.maxTimeMs as "___ms / click", above the
    // countdown timer - per explicit request, since the countdown
    // display shows the TOTAL round budget and no longer shows the
    // underlying per-click rate itself. Default position sits just
    // above --speed-y-offset-vh at a smaller font, until tuned.
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
    // Sentinels (never a real dragged/resized value in practice,
    // since the drag/resize logic always clamps to >=0) - overridden
    // with real viewport-computed values at load time, see below.
    '--dev-panel-left-px': 26,
    '--dev-panel-top-px': 6,
    '--dev-panel-height-px': 120,
    // X/Y Offset/Width/Height are vw/vh-native (per direct request -
    // see .round-breakdown-panel's own CSS comment) - defaults
    // below place the panel in roughly the same right-side, modest-
    // size area the old px defaults (1562/54/320/450 at whatever
    // viewport those were tuned against) intended, not a literal
    // pixel-preserving conversion (the old numbers don't correspond
    // to sensible vw/vh values at every viewport - Mobile's own old
    // 1240px left, for one, was never actually on-screen for a real
    // phone width).
    '--round-breakdown-width-vw': 20,
    '--round-breakdown-height-vh': 45,
    '--round-breakdown-left-vw': 65,
    '--round-breakdown-top-vh': 5,
    '--round-breakdown-x-offset-unit-is-px': 0,
    '--round-breakdown-y-offset-unit-is-px': 0,
    // Round Breakdown dev-panel group (UI TEXT > Round Breakdown) -
    // the On/Off-style flags below are single-bucket/shared (only
    // ever read from this desktop cssVars, applied via JS classList
    // toggles rather than a per-device CSS custom property) - same
    // convention as --hide-button-enabled etc. above. The 3 numeric
    // px values ARE per-device (see mobileCssVars' own copies).
    '--round-breakdown-enabled': 1,
    '--round-breakdown-resizer-enabled': 1,
    '--round-breakdown-font-family': 'monospace',
    // Outline default flipped 0->1 (2026-09-19) - was a SEPARATE
    // layer on top of a permanent hardcoded border, defaulting off
    // was correct back then; now it's the panel's ONLY edge-line
    // mechanism (see .round-breakdown-panel.rb-outline-on's own CSS
    // comment), so it needs to default on to match the pre-existing
    // always-visible line's appearance.
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
    // Panel Opacity (dev-panel slider) - opacity of the background
    // FILL only (see .round-breakdown-panel::before's own CSS
    // comment), not the whole panel. Defaults to 0.94, matching the
    // panel's original pre-Panel-Color hardcoded rgba() alpha, so a
    // fresh/never-tuned install looks the same as before either
    // control existed.
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

// fontVars/mobileFontVars used to live here (--ui-font/--text-font,
// then just --numbers-font once those merged into extrusionVars.font)
// - removed entirely now that Target/Speed also read
// extrusionVars.font via --extrusion-font, per explicit request that
// every 8-bit-capable text share ONE font control. No cssVar/object
// left behind for it - nothing reads --numbers-font anymore.

// 8-bit extruded text style - covers Start/Try Again/Round Text/
// Target/Speed/Win-Lose. `font` is the ONE shared font control for
// ALL of them (a single dropdown, per explicit request) and is NOT
// mobile-split, like --click-frame-set - a page-wide stylistic
// choice, not a per-device one. Everything else here (depth,
// colors, overall-border settings) IS mobile-split - see
// mobileExtrusionVars below and the isMobileActive() picks in
// buildCombinedShadow()/applyExtrusionStyles() - per explicit
// request that color/extrusion/border settings be independently
// tunable per device like the rest of the visual system. depth/
// fillColor/borderColor are the shared controls for Start+TryAgain+
// WinLose (depth) and Start+TryAgain+WinLose+Target+Speed (the 2
// colors); Round/Target/Speed each have their own depth and colors;
// win*/lose* are Win/Lose's own separate color pair.
const extrusionVars = {
    font: '"Micro 5", monospace',
    // Manual fine-tune for the Target/Ms-per-click debug-line tool's
    // own measurement (measureGlyphTop(), see its own comment) - NOT
    // applied to the real .target-count/.ms-per-click-display boxes
    // themselves. Exists because text-box-edge's "cap" value reads a
    // METRIC BAKED INTO THE FONT FILE (the OS/2 table's sCapHeight
    // field), not the actual rendered ink of a specific glyph - that
    // field is commonly missing/approximate on decorative/display
    // fonts (confirmed via research, not guessed), leaving a small
    // residual (a couple px) mismatch CSS itself currently has no
    // native way to fine-tune (an open, unresolved w3c/csswg-drafts
    // issue as of this comment). Unitless, same convention as line-
    // height: a multiplier of the element's own font-size, added to
    // the debug line's drawn endpoint (positive moves it down), so
    // the line can be dragged onto the real glyph edge by eye
    // without moving the actual on-screen text - an earlier version
    // applied this to the real boxes via margin-top instead, which
    // moved the debug line and the real text by the same amount and
    // so never closed the gap between them; reverted per direct
    // correction. Single, shared value (not mobile-split) - same
    // reasoning as font itself just above: this is a property of
    // the FONT FILE, not a per-device layout choice.
    fontTrimAdjust: 0,
    depth: 5,
    fillColor: '#ffffff',
    borderColor: '#000000',
    // Round Text used to share the group's depth/border-thickness/
    // border-color; now fully decoupled with its own copies of all
    // 3, same as Target/Speed already had for depth - per explicit
    // request. Font, fill color, and size/position stay shared/own
    // as before (unaffected).
    roundDepth: 4,
    roundBorderColor: '#ffffff',
    roundOverallBorderThickness: 14,
    // Own overall-border-ring color too, decoupled from the shared
    // overallBorderColor below - since Round has its own border
    // THICKNESS slider, it also gets its own border COLOR, per
    // explicit request ("for all text that have their own border
    // thickness, I can select the border color").
    roundOverallBorderColor: '#0b3864',
    // Try Again's own border/extrusion colors, independent from
    // Start's above - per explicit request; starts matching Start's
    // own colors until tuned, same convention as the font-size/
    // position split.
    tryAgainBorderColor: '#ffffff',
    tryAgainOverallBorderColor: '#431114',
    // Depth/thickness, independent from Start/Round's own
    // roundDepth/roundOverallBorderThickness - per direct follow-up
    // request ("give me extrusion depth, border thickness sliders
    // for Try Again"), completing the same independence color
    // already had. Starts matching Start/Round's own current values
    // until tuned.
    tryAgainDepth: 9,
    tryAgainOverallBorderThickness: 7,
    // The "?" glyph's own fill color, independent from the "Try
    // again" text's own color above - per explicit request ("I
    // dont see separate size, color, and x y sliders for the
    // question mark"). Starts matching tryAgainBorderColor above
    // until tuned, same convention as every other split.
    questionMarkFillColor: '#ffffff',
    // The "?" glyph's own extrusion depth/border, independent from
    // "Try again" text's roundDepth/roundOverallBorderThickness/
    // tryAgainOverallBorderColor above - per explicit follow-up
    // request ("also provde the question mark its own extrusion
    // and border sliders"). questionMarkFillColor above doubles as
    // the extrusion's own trail color, same one-picker-drives-both
    // convention as every other element's "Text Color". Starts
    // matching the shared values above until tuned.
    questionMarkDepth: 5,
    questionMarkOverallBorderThickness: 4,
    questionMarkOverallBorderColor: '#401013',
    // roundDepth/roundBorderColor/roundOverallBorderThickness/
    // roundOverallBorderColor above now style the Start/Try Again
    // BUTTON instead of Round Text - repurposed since Round Text no
    // longer has a "big" state at all (see .start-button/.game-text
    // CSS comments). roundDockDepth/etc below are Round Text's ONE
    // permanent extrusion look - originally its own independent
    // "docked (small) state" copy, kept as-is now that it's the
    // only state. Position (--round-dock-x/y-offset-vw/vh, in
    // cssVars) and font-size (always matches --speed-font-size-vw)
    // are read directly by .game-text's CSS, unconditionally.
    roundDockDepth: 9,
    roundDockBorderColor: '#ffffff',
    roundDockOverallBorderThickness: 8,
    roundDockOverallBorderColor: '#bd0d07',
    // High Score - per direct request. Same field shape as
    // roundDock* above (colors forced-desktop, see
    // EXTRUSION_COLOR_FIELD_NAMES).
    highScoreDepth: 9,
    highScoreBorderColor: '#ffffff',
    highScoreOverallBorderThickness: 8,
    highScoreOverallBorderColor: '#bd0d07',
    // Target/Speed now also get their OWN border/extrusion color,
    // decoupled from the shared borderColor above (fill color stays
    // shared) - per explicit request ("border colors for each of
    // the texts that have their own extrusion").
    targetBorderColor: '#ffffff',
    targetOverallBorderColor: '#b60300',
    // Depth/Border Thickness decomposed from one shared
    // targetDepth/targetOverallBorderThickness pair into 3
    // independent per-part sets - per direct follow-up request
    // ("extrusion depth and border thickness for all 3"), same
    // decomposition already applied to Font Size/X/Y Offset and
    // Letter Spacing above. Color (targetBorderColor/
    // targetOverallBorderColor just above) stays SHARED - only
    // depth/thickness were asked for. All 3 seeded with the OLD
    // shared targetDepth(26)/targetOverallBorderThickness(8) values
    // so the deploy is visually identical until tuned.
    targetPrefixDepth: 26,
    targetPrefixOverallBorderThickness: 8,
    targetNumberDepth: 26,
    targetNumberOverallBorderThickness: 8,
    targetSuffixDepth: 26,
    targetSuffixOverallBorderThickness: 8,
    speedDepth: 11,
    speedBorderColor: '#ffffff',
    speedOverallBorderColor: '#b60300',
    // "___ms / click" label above the countdown - own extrusion
    // group, same shape as Target/Speed's own copies above.
    msPerClickDepth: 10,
    msPerClickBorderColor: '#ffffff',
    msPerClickOverallBorderColor: '#b60300',
    winFillColor: '#ffffff',
    winBorderColor: '#401013',
    loseFillColor: '#ffffff',
    loseBorderColor: '#401013',
    // Target/Speed(countdown)/Ms-per-click no longer disappear on
    // win/lose - per explicit request ("I dont want the Target
    // Text, MS/Click text, nor the countdown to dissappear. They
    // will simply change color... then when the next round begins,
    // it reverts back to original color"). One shared pair per
    // state (not per-element) - applies uniformly to all 3, per
    // "Provide me 4 sliders" (not 12). See applyGameplayResultColor().
    gameplayWinTextColor: '#ffffff',
    gameplayWinBorderColor: '#2b8f00',
    gameplayLoseTextColor: '#ffffff',
    gameplayLoseBorderColor: '#dd3333',
    // Win/Lose's own extrusion depth/border thickness/border color -
    // per explicit request ("extrusion and border settings for the
    // Win/Lose text"), same independent-per-element pattern as
    // Target/Speed/Ms-per-click above (fill/border TEXT color stays
    // the already-existing win/lose split above; these 3 are the
    // outer extrusion shape, shared between win and lose like
    // Target's single depth/thickness/color apply regardless of any
    // "state"). Starts matching the shared depth/overallBorder*
    // values below until tuned.
    resultDepth: 8,
    resultOverallBorderThickness: 5,
    // Shared by Win and Lose (matching resultDepth/
    // resultOverallBorderThickness above) - per direct follow-up
    // request ("Provide me a slider to control the extrusion angle
    // for both"). 45 reproduces the ORIGINAL fixed-diagonal look
    // exactly (see buildExtrusionShadow()'s own comment on why 45
    // is special-cased, not just the trig formula's own limit).
    resultExtrusionAngle: 45,
    // Overall border/outline wrapping the combined text+extrusion
    // silhouette (not just the glyph) - one shared on/off toggle
    // for everyone, but color now mirrors thickness: shared for
    // Start/TryAgain/Win-Lose (which only ever had shared
    // thickness), own for Target/Speed/Round (which each have
    // their own thickness slider - see roundOverallBorderColor/
    // targetOverallBorderColor/speedOverallBorderColor above).
    overallBorderEnabled: true,
    overallBorderColor: '#24f031',
    overallBorderThickness: 20,
    speedOverallBorderThickness: 8,
    msPerClickOverallBorderThickness: 8,
};

// Mobile counterpart to extrusionVars above - same shape, minus
// `font` (that stays single/shared only in extrusionVars, see the
// comment there). Cloned from the desktop defaults at declaration
// time so mobile starts out identical - including colors matching
// desktop, per explicit request - until tuned separately via the
// dev panel's Mobile Overrides section, same convention
// mobileCssVars/mobileColorVars already follow.
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
    // High Score - colors are forced-desktop (see
    // EXTRUSION_COLOR_FIELD_NAMES), only depth/thickness matter here.
    highScoreDepth: 9,
    highScoreBorderColor: '#c41516',
    highScoreOverallBorderThickness: 9,
    highScoreOverallBorderColor: '#c41516',
    targetBorderColor: '#ff0000',
    targetOverallBorderColor: '#cc1b20',
    // Seeded with the OLD shared targetDepth(20)/
    // targetOverallBorderThickness(12) values - see desktop's own
    // comment on this same decomposition.
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
// Landscape's own extrusion vars - seeded as a clone of Desktop's
// current tuning (changed from Mobile per direct request "let's
// try all settings pulled from desktop... be ready to change it
// back" - flip mobileExtrusionVars back here to revert),
// independently adjustable later.
const landscapeExtrusionVars = structuredClone(extrusionVars);

// Builds a stepped diagonal text-shadow stack (1 layer per px of
// depth) - the CSS-native way to fake a solid pixel-block 3D
// extrusion, since text-shadow has no built-in "depth" parameter and
// CSS custom properties can't loop. Recomputed into a plain string
// and stored in a --*-shadow custom property whenever depth/color
// changes (see applyExtrusionStyles()).
// angleDeg is optional - omitted (or exactly 45) reproduces the
// ORIGINAL fixed-diagonal formula byte-for-byte (every element
// except Win/Lose never passes it at all), rather than computing
// 45 through the trig branch below, which would land at the same
// geometric point but as a floating-point value (e.g. 0.9999999999
// instead of exactly 1) due to sqrt(2)*cos(45deg) not being exactly
// 1 in IEEE 754 - a harmless sub-pixel difference in practice, but
// an avoidable one, so every untouched call site keeps its exact
// original output. Off-45 angles scale by sqrt(2) so the PER-STEP
// reach at any angle matches the original's own per-step reach at
// 45 (each step originally moved by sqrt(2) px of actual diagonal
// distance, despite reading "1px 1px" - see the geometry: an X,Y
// step of (1,1) has magnitude sqrt(1^2+1^2)=sqrt(2), not 1).
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

// Builds the "overall border" ring - a stroke wrapping the OUTSIDE
// of the combined text+extrusion shape, not just the glyph. There's
// no CSS primitive for "outline the union of a glyph and its
// diagonal shadow stack", so this fakes it the same way a plain
// text-stroke is faked with text-shadow: a ring of copies offset in
// 8 directions by the border thickness. Doing that ring at EVERY
// extrusion step (0 = the glyph's own front face, through depth =
// the backmost step), not just once, means the ring's copies fill in
// the full diagonal length too - the net effect thickens the whole
// front-to-back band on all sides, which is what "wraps the text and
// the extrusion combined" needs (a ring only at the front and back
// faces would leave the diagonal sides unbordered).
// angleDeg (added alongside Win/Lose text's own adjustable Extrusion
// Angle): the ring used to always sweep along the fixed classic
// diagonal (step i added directly to both x and y, i.e. the same
// as angleDeg=45) regardless of what angle the extrusion trail
// itself was using - harmless while every extruded element shared
// one fixed direction, but once Win/Lose text got its own
// adjustable angle, the ring kept sweeping down-right at every
// depth while the trail correctly rotated to the new angle,
// producing 2 differently-angled effects layered on the same
// glyph (confirmed live: isolating each in a side-by-side test
// element showed the ring's own accumulated sweep forming a solid
// down-right blob completely independent of the trail's actual
// direction). Mirrors buildExtrusionShadow's own angleDeg==null||
// ===45 special case exactly, so every OTHER element (which never
// passes a custom angle) renders byte-for-byte the same numbers
// as before - only Win/Lose text's own ring direction changes.
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

// Combines the border ring (painted first/furthest back, so the
// extrusion fill paints over it everywhere except right at the
// outer edge - the visible "outline" effect) with the existing
// extrusion stack, per element (each has its own depth and/or
// thickness/color - see the comment on extrusionVars above).
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

// Pushes the ACTIVE (desktop or mobile) extrusion vars onto the DOM
// as CSS custom properties - font is always read from the desktop
// extrusionVars object specifically (it's the one single/shared
// field, see the comment on extrusionVars above), everything else
// from whichever set isMobileActive() selects. The shadow stacks
// are precomputed per element since each needs its own depth and/or
// border color (see the comment on extrusionVars above).
// Every color-type field in extrusionVars/mobileExtrusionVars - per
// explicit request ("desktop tab will determine all color
// selection"), these no longer vary by device at all, while every
// OTHER field there (depth, overall-border thickness, the
// enabled toggle) stays per-device, unaffected. Listed explicitly
// rather than inferred from key names, since e.g.
// overallBorderEnabled isn't a color despite living in the same
// object.
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
// Reference viewport width the raw px sliders were tuned against -
// same simplification as Round Breakdown's own Scale With Browser
// (CLAUDE.md Section 12p's own note on this pattern): derives an
// effective px value from ONE stored number and a ratio to this
// reference, rather than requiring a 2nd explicit vw slider per
// element. vmin-based (Math.min of width/height), not vw-only -
// per this session's own earlier width-only Scale-With-Browser bug
// fix, applied correctly here from the start.
const EXTRUSION_SCALE_REF_PX = 1280;
// Per direct request ("for every text object with a Border
// Thickness and Extrusion Depth slider, add a checkbox that sets
// if those values also scales with Browser" / "right now
// extrusion and border seem to not scale"). Unlike Font Size's own
// Scale With Browser (a pure CSS calc() blend - see each element's
// own font-size rule), Extrusion Depth/Border Thickness feed into
// buildCombinedShadow()/buildExtrusionShadow(), which JS-computes
// a DISCRETE, integer-pixel-stepped text-shadow STRING - there's
// no live CSS calc() to blend into, so scaling has to happen HERE,
// by computing an effective px value from the flag+viewport before
// ever calling buildCombinedShadow(). This function already reruns
// on every resize (called from applyActiveVars(), which is
// window.resize-listened), so no new resize listener is needed -
// just feeding a viewport-relative number through the existing
// pipeline.
function applyExtrusionStyles() {
    const root = document.documentElement.style;
    const deviceExt = isMobileActive() ? getActiveMobileExtrusionVars() : extrusionVars;
    const ext = { ...deviceExt };
    // Mirrors applyTextAlignAnchors()'s own device resolution -
    // these flags live in cssVars/mobileCssVars/landscapeCssVars
    // (paralleling Font Size's own Scale With Browser flags), not
    // in extrusionVars/deviceExt, even though the RAW depth/
    // thickness numbers they modulate do live there. Recomputed
    // fresh on every call (NOT hoisted to module scope) - a
    // module-scope version of this line crashed with "Cannot
    // access 'LANDSCAPE_TOUCH_QUERY' before initialization" (a
    // real TDZ bug found live: isMobileActive() -> isLandscapeActive()
    // reads a const declared much further down the file, which is
    // fine once the whole script has finished its own top-to-
    // bottom initial run, but not if evaluated as part of THAT
    // same initial run - which a module-level statement here
    // would be, since this function itself is only ever CALLED
    // later, well after full script init). Local to the function
    // body sidesteps that entirely and also fixes what would
    // otherwise be a real staleness bug (a module-level value
    // would never update across a desktop<->mobile breakpoint
    // crossing or a Desktop/Mobile/Landscape tab switch).
    const activeCssVarsForScale = isMobileActive() ? getActiveMobileVars() : cssVars;
    function scaledExtrusionPx(rawPx, flagVar) {
        if (!activeCssVarsForScale[flagVar]) return rawPx;
        return rawPx / EXTRUSION_SCALE_REF_PX * Math.min(window.innerWidth, window.innerHeight);
    }
    EXTRUSION_COLOR_FIELD_NAMES.forEach(field => { ext[field] = extrusionVars[field]; });
    root.setProperty('--extrusion-font', extrusionVars.font);
    // Now the Start/Try Again button's extrusion look, not Round
    // Text's (which no longer has a "big" state) - see .start-button.
    root.setProperty('--round-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.roundDepth, '--round-extrusion-scale-with-browser'), ext.roundBorderColor, scaledExtrusionPx(ext.roundOverallBorderThickness, '--round-extrusion-scale-with-browser'), ext.roundOverallBorderColor, ext.overallBorderEnabled));
    // Try Again's own colors, same depth/thickness as Start (see
    // .start-button.try-again-state's CSS). Depth/thickness now
    // independent from Start/Round's own roundDepth/
    // roundOverallBorderThickness too - per direct follow-up
    // request, completing the same independence color already had.
    root.setProperty('--try-again-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.tryAgainDepth, '--try-again-extrusion-scale-with-browser'), ext.tryAgainBorderColor, scaledExtrusionPx(ext.tryAgainOverallBorderThickness, '--try-again-extrusion-scale-with-browser'), ext.tryAgainOverallBorderColor, ext.overallBorderEnabled));
    // The "?" glyph's own extrusion/border, independent from the
    // "Try again" text above - per explicit request.
    root.setProperty('--try-again-question-mark-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.questionMarkDepth, '--try-again-question-mark-extrusion-scale-with-browser'), ext.questionMarkFillColor, scaledExtrusionPx(ext.questionMarkOverallBorderThickness, '--try-again-question-mark-extrusion-scale-with-browser'), ext.questionMarkOverallBorderColor, ext.overallBorderEnabled));
    // Round Text's one permanent extrusion look - read directly by
    // .game-text's CSS, unconditionally.
    root.setProperty('--round-dock-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.roundDockDepth, '--round-dock-extrusion-scale-with-browser'), ext.roundDockBorderColor, scaledExtrusionPx(ext.roundDockOverallBorderThickness, '--round-dock-extrusion-scale-with-browser'), ext.roundDockOverallBorderColor, ext.overallBorderEnabled));
    root.setProperty('--high-score-shadow', buildCombinedShadow(scaledExtrusionPx(ext.highScoreDepth, '--high-score-extrusion-scale-with-browser'), ext.highScoreBorderColor, scaledExtrusionPx(ext.highScoreOverallBorderThickness, '--high-score-extrusion-scale-with-browser'), ext.highScoreOverallBorderColor, ext.overallBorderEnabled));
    // Depth/thickness decomposed into 3 independent per-part shadows
    // (Prefix/Number/Suffix each read their own --target-X-
    // extrusion-shadow directly - see #targetCountPrefix/Number/
    // Suffix's own CSS) - color stays shared, per direct request.
    root.setProperty('--target-prefix-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.targetPrefixDepth, '--target-prefix-extrusion-scale-with-browser'), ext.targetBorderColor, scaledExtrusionPx(ext.targetPrefixOverallBorderThickness, '--target-prefix-extrusion-scale-with-browser'), ext.targetOverallBorderColor, ext.overallBorderEnabled));
    root.setProperty('--target-number-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.targetNumberDepth, '--target-number-extrusion-scale-with-browser'), ext.targetBorderColor, scaledExtrusionPx(ext.targetNumberOverallBorderThickness, '--target-number-extrusion-scale-with-browser'), ext.targetOverallBorderColor, ext.overallBorderEnabled));
    root.setProperty('--target-suffix-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.targetSuffixDepth, '--target-suffix-extrusion-scale-with-browser'), ext.targetBorderColor, scaledExtrusionPx(ext.targetSuffixOverallBorderThickness, '--target-suffix-extrusion-scale-with-browser'), ext.targetOverallBorderColor, ext.overallBorderEnabled));
    root.setProperty('--speed-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.speedDepth, '--speed-extrusion-scale-with-browser'), ext.speedBorderColor, scaledExtrusionPx(ext.speedOverallBorderThickness, '--speed-extrusion-scale-with-browser'), ext.speedOverallBorderColor, ext.overallBorderEnabled));
    root.setProperty('--ms-per-click-extrusion-shadow', buildCombinedShadow(scaledExtrusionPx(ext.msPerClickDepth, '--ms-per-click-extrusion-scale-with-browser'), ext.msPerClickBorderColor, scaledExtrusionPx(ext.msPerClickOverallBorderThickness, '--ms-per-click-extrusion-scale-with-browser'), ext.msPerClickOverallBorderColor, ext.overallBorderEnabled));
    root.setProperty('--result-win-fill-color', ext.winFillColor);
    // Overall Border ring now reuses each state's OWN Border Color
    // (winBorderColor/loseBorderColor) for both the extrusion trail
    // AND the ring, instead of a separate shared "Overall Border
    // Color (Win+Lose)" picker - per direct request ("Win has its
    // own color picker for that, and so does Lose. use that
    // input"). Removes the mismatched-color problem at its root
    // (the ring and trail can no longer disagree, by construction)
    // rather than requiring the shared picker to be kept in sync by
    // hand.
    root.setProperty('--result-win-shadow', buildCombinedShadow(scaledExtrusionPx(ext.resultDepth, '--result-extrusion-scale-with-browser'), ext.winBorderColor, scaledExtrusionPx(ext.resultOverallBorderThickness, '--result-extrusion-scale-with-browser'), ext.winBorderColor, ext.overallBorderEnabled, ext.resultExtrusionAngle));
    root.setProperty('--result-lose-fill-color', ext.loseFillColor);
    root.setProperty('--result-lose-shadow', buildCombinedShadow(scaledExtrusionPx(ext.resultDepth, '--result-extrusion-scale-with-browser'), ext.loseBorderColor, scaledExtrusionPx(ext.resultOverallBorderThickness, '--result-extrusion-scale-with-browser'), ext.loseBorderColor, ext.overallBorderEnabled, ext.resultExtrusionAngle));
    // Each element's own "Text Color" picker now IS its glyph's real
    // fill, not just the extrusion/shadow layer's color - per direct
    // report ("my text currently shows as white" - the glyph was
    // always the single shared Fill Color above, never these
    // per-element pickers, despite the "Text Color" label implying
    // otherwise). Reuses the SAME already-editable *BorderColor
    // field each picker already writes to, rather than adding new
    // controls - one picker, one color, drives both the flat glyph
    // and the extrusion/border effect behind it.
    root.setProperty('--round-fill-color', ext.roundBorderColor);
    root.setProperty('--try-again-fill-color', ext.tryAgainBorderColor);
    root.setProperty('--try-again-question-mark-fill-color', ext.questionMarkFillColor);
    root.setProperty('--round-dock-fill-color', ext.roundDockBorderColor);
    root.setProperty('--high-score-fill-color', ext.highScoreBorderColor);
    root.setProperty('--target-fill-color', ext.targetBorderColor);
    root.setProperty('--speed-fill-color', ext.speedBorderColor);
    root.setProperty('--ms-per-click-fill-color', ext.msPerClickBorderColor);
}

// Tints Target/Speed(countdown)/Ms-per-click on win/lose without
// hiding them - per explicit request ("I dont want the Target
// Text, MS/Click text, nor the countdown to dissappear. They will
// simply change color... then when the next round begins, it
// reverts back to original color"). state: 'win'/'lose' overrides
// all 3 elements' own --*-fill-color/--*-extrusion-shadow CSS
// custom properties directly (the exact same properties their own
// normal CSS rules already read - see applyExtrusionStyles() above
// - so this needs no new CSS, just a temporary override written on
// top); state: null reverts by simply re-running
// applyExtrusionStyles(), which recomputes each element's own
// normal (untinted) values from scratch, overwriting this
// override with no separate "restore" data path needed.
// The 4 extrusionVars keys applyGameplayResultColor() itself reads -
// used by the generic color-picker handler (setupDevSliders()) to
// know when a picker change needs an immediate re-apply of the
// CURRENTLY showing result tint, not just the usual
// applyExtrusionStyles() (see that handler's own comment).
const GAMEPLAY_RESULT_COLOR_FIELDS = ['gameplayWinTextColor', 'gameplayWinBorderColor', 'gameplayLoseTextColor', 'gameplayLoseBorderColor'];
function applyGameplayResultColor(state) {
    if (!state) {
        applyExtrusionStyles();
        // Reverts the button's own light-levels filter back to its
        // NORMAL (non-Lose) contrast/lightness - see the 'lose'
        // branch below's own comment for why this needs a separate,
        // explicit revert here (applyExtrusionStyles() above only
        // covers extrusion/color, not this SVG filter).
        applyLightLevels(cssVars['--button-light-levels'], cssVars['--button-light-levels-contrast'], cssVars['--button-light-levels-floor'], cssVars['--button-light-levels-ceiling'], 'buttonGrayscaleTint');
        // Same revert for the base filter - harmless/a no-op if
        // --base-follows-result-color was never on (the base's own
        // filter was never touched in that case, so this just
        // reapplies the same normal values it already had), but
        // required when it WAS on (see the 'lose' branch below).
        applyLightLevels(cssVars['--base-light-levels'], cssVars['--base-light-levels-contrast'], cssVars['--base-light-levels-floor'], cssVars['--base-light-levels-ceiling'], 'baseGrayscaleTint');
        return;
    }
    const root = document.documentElement.style;
    const deviceExt = isMobileActive() ? getActiveMobileExtrusionVars() : extrusionVars;
    const textColor = state === 'win' ? extrusionVars.gameplayWinTextColor : extrusionVars.gameplayLoseTextColor;
    const borderColor = state === 'win' ? extrusionVars.gameplayWinBorderColor : extrusionVars.gameplayLoseBorderColor;
    // Button Lose Contrast/Lightness (2 dedicated sliders) override
    // the button's own SVG filter ONLY while Lose is showing - per
    // direct request ("provide me 2 sliders to control the button
    // contrast and lightness at a lose"), same on/off lifecycle as
    // every other gameplay-result override here (reverted by the
    // !state branch above, called from showTargetAndSpeed() at the
    // start of the next round). Floor/Ceiling stay the NORMAL
    // Button Light Levels' own values - only Contrast/Lightness
    // (Level) get a dedicated Lose-specific pair, per the 2
    // sliders actually asked for.
    if (state === 'lose') {
        applyLightLevels(cssVars['--button-lose-lightness'], cssVars['--button-lose-contrast'], cssVars['--button-light-levels-floor'], cssVars['--button-light-levels-ceiling'], 'buttonGrayscaleTint');
        // Base Follows Win/Lose Color (per direct follow-up request,
        // "that should include the Button Lose Contrasts and Button
        // Lose Lightnss") - when that checkbox is on, the SAME Lose
        // override also drives the base's own filter, not just the
        // button's. Reuses the button's own Lose Contrast/Lightness
        // sliders (no separate Base-specific pair - "include" means
        // apply the same values, not add new ones), but the BASE's
        // own Floor/Ceiling, matching how the button branch above
        // uses the button's own Floor/Ceiling rather than the
        // Lose-specific pair not existing for that either.
        if (cssVars['--base-follows-result-color']) {
            applyLightLevels(cssVars['--button-lose-lightness'], cssVars['--button-lose-contrast'], cssVars['--base-light-levels-floor'], cssVars['--base-light-levels-ceiling'], 'baseGrayscaleTint');
        }
    }
    root.setProperty('--target-fill-color', textColor);
    root.setProperty('--speed-fill-color', textColor);
    root.setProperty('--ms-per-click-fill-color', textColor);
    // Round Text ("ROUND X") joins the same tint - per direct
    // request ("the Round number should also change color to
    // match the other numbers"), on both win and lose. Reverted
    // for free by the !state branch above (applyExtrusionStyles()
    // already recomputes --round-dock-fill-color/-extrusion-shadow
    // from scratch), same as Target/Speed/Ms-per-click.
    root.setProperty('--round-dock-fill-color', textColor);
    // High Score joins the same tint, on both win and lose - per
    // direct request ("Highscore number changes the same time as
    // when the win text is shown... will also change the same
    // color as the other numbers" / "On lose screen, Highscore and
    // number will change color like the other text"). Reverted for
    // free by the !state branch above, same as Round Text.
    root.setProperty('--high-score-fill-color', textColor);
    // buildCombinedShadow(depthPx, extrusionColor, thicknessPx,
    // ringColor, enabled) takes TWO separate colors - the extrusion
    // depth trail (arg 2) and the outer "Overall Border" ring (arg
    // 4), normally each element's own independently-tuned colors
    // (targetBorderColor vs targetOverallBorderColor, etc). Per
    // direct report ("gameplay win and lose border color doesnt
    // change the actual color o the border and extrusion"): this
    // function was only ever passing the gameplay borderColor as
    // the EXTRUSION color, while the ring color stayed hardcoded to
    // the element's own normal, non-gameplay overall-border color
    // (deviceExt.targetOverallBorderColor etc) - invisible in an
    // earlier verification pass that only checked the combined
    // text-shadow string CONTAINED the test color somewhere, not
    // that BOTH parts used it. Passing borderColor for both now
    // makes "Gameplay Win/Lose Border" genuinely recolor the whole
    // extrusion+ring look, not just half of it.
    // Same 3-way per-part split as applyExtrusionStyles() above,
    // each with its own depth/thickness but the shared tinted
    // borderColor for both shadow args, same as the normal
    // (non-tinted) call does with targetBorderColor/
    // targetOverallBorderColor.
    root.setProperty('--target-prefix-extrusion-shadow', buildCombinedShadow(deviceExt.targetPrefixDepth, borderColor, deviceExt.targetPrefixOverallBorderThickness, borderColor, deviceExt.overallBorderEnabled));
    root.setProperty('--target-number-extrusion-shadow', buildCombinedShadow(deviceExt.targetNumberDepth, borderColor, deviceExt.targetNumberOverallBorderThickness, borderColor, deviceExt.overallBorderEnabled));
    root.setProperty('--target-suffix-extrusion-shadow', buildCombinedShadow(deviceExt.targetSuffixDepth, borderColor, deviceExt.targetSuffixOverallBorderThickness, borderColor, deviceExt.overallBorderEnabled));
    root.setProperty('--speed-extrusion-shadow', buildCombinedShadow(deviceExt.speedDepth, borderColor, deviceExt.speedOverallBorderThickness, borderColor, deviceExt.overallBorderEnabled));
    root.setProperty('--ms-per-click-extrusion-shadow', buildCombinedShadow(deviceExt.msPerClickDepth, borderColor, deviceExt.msPerClickOverallBorderThickness, borderColor, deviceExt.overallBorderEnabled));
    root.setProperty('--round-dock-extrusion-shadow', buildCombinedShadow(deviceExt.roundDockDepth, borderColor, deviceExt.roundDockOverallBorderThickness, borderColor, deviceExt.overallBorderEnabled));
    root.setProperty('--high-score-shadow', buildCombinedShadow(deviceExt.highScoreDepth, borderColor, deviceExt.highScoreOverallBorderThickness, borderColor, deviceExt.overallBorderEnabled));
}

// Mobile overrides - same shape as cssVars/colorVars, applied
// instead of the desktop set whenever the viewport matches
// MOBILE_MEDIA_QUERY (see applyActiveVars() below). Cloned from the
// desktop defaults at startup so mobile starts out identical to desktop
// until tuned separately via the dev panel's Mobile Overrides section.
// --dev-panel-width-px is intentionally excluded - it's a dev-tool-only
// setting, not part of the actual game's visual output.
// No longer cloned from cssVars via spread - once desktop and mobile
// values have actually diverged (as they now have, per tuning), a
// spread-clone at load time would silently overwrite the mobile
// tuning with whatever the desktop defaults happen to be. Explicit
// values here instead.
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
    // Max/Min Button Scale, Mobile's own pair - see the Desktop
    // declaration's own comment for the full mechanism. Mobile's
    // formula (computeButtonUserScale()) is different in kind, not
    // just in numbers: Max Scale is reached at 767px (Mobile's own
    // widest width, the existing breakpoint), and scale shrinks
    // proportionally with width below that, floored at Min Scale -
    // there's no second reference width to interpolate toward the
    // way Desktop has 1280px, per direct request ("at 767px width
    // it will be max scale on mobile side, and Min scale will just
    // cap how small it can get"). Both default to 1 (no-op).
    '--button-max-scale': 1,
    '--button-min-scale': 1,
    '--click-burst-speed-ms': 180,
    '--click-burst-scale': 0.14,
    // These 5 keys (through --shadow-y-offset below) hold a VW
    // number on MOBILE despite their "-px"/plain names - per
    // explicit request that mobile's spatial/motion values scale
    // with screen width instead of being fixed px (so they "look
    // correct on all phone types"), rather than a literal px
    // count. Desktop's cssVars object keeps genuine px numbers,
    // completely unaffected - see resolveSpatialPx() for where the
    // vw->px resolution actually happens (at the point of use,
    // against the CURRENT viewport, not baked in here). Converted
    // from the previous flat px defaults (45/0/35/106/88) using a
    // 412px reference width (Chrome on a Google Pixel 9a, inferred
    // from matching the Pixel 9's confirmed 412x915 CSS-pixel
    // viewport - not a Pixel-9a-specific measurement).
    '--click-burst-distance-px': 8,
    '--click-burst-height-px': 1,
    '--click-burst-curve-offset-px': 6.5,
    '--click-burst-count-min': 3,
    '--click-burst-count-max': 5,
    '--click-burst-curve-amount': 0.2,
    '--click-burst-shadow-final-scale': 1,
    // Rescaled from "% of viewport width" (the old resolveSpatialPx
    // semantics: 21.12, 14) to "% of the button's own rendered
    // width" - a deterministic conversion since button width was
    // already button-diameter-vw% of viewport width: 21.12*100/77,
    // 14*100/77. Same reasoning as the desktop object above.
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
    // See the desktop cssVars' own comment - same live-measured-
    // default reasoning, mobile viewport.
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
    // High Score - see the matching desktop cssVars block's own
    // comment. --hide-high-score-enabled is NOT repeated here -
    // single/shared, declared once in desktop cssVars only.
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
    // Shared by all 3 parts, not per-part - see
    // COMPOUND_OFFSET_CONTROLS' own comment.
    '--target-x-offset-unit-is-px': 0,
    '--target-y-offset-unit-is-px': 0,
    // Extrusion Depth/Border Thickness Scale With Browser - see
    // cssVars' own identical block above.
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
// Landscape's own cssVars - the actual point of this whole feature:
// a real touchscreen phone in landscape gets its OWN tuned button/
// text positions and sizes instead of either the (wrong) Desktop
// profile or Mobile's portrait-tuned ones stretched sideways.
// Seeded as a clone of Desktop's current values (changed from
// Mobile per direct request "let's try all settings pulled from
// desktop... be ready to change it back" - flip mobileCssVars back
// here, and the saved settings JSON's landscape* keys back to
// their pre-switch values via git history, to revert) so nothing
// looks different until these are independently retuned via the
// Landscape dev-panel tab.
const landscapeCssVars = structuredClone(cssVars);
const mobileColorVars = {
    '--button-color': '#ff3333',
    // No --bg-color here - the background color is a single shared
    // value (colorVars['--bg-color'] only), see applyActiveVars().
};
// Landscape's own color vars - seeded as a clone of Desktop's
// (changed from Mobile - flip mobileColorVars back here to revert).
const landscapeColorVars = structuredClone(colorVars);
// mobileFontVars used to live here - removed along with fontVars,
// see the comment near the desktop declaration above.

// Auto-switches live: crossing this breakpoint (resizing the browser,
// rotating a phone) re-applies whichever var set is now active, no
// manual toggle needed.
const MOBILE_MEDIA_QUERY = window.matchMedia('(max-width: 767px)');
// A real touchscreen device (phone/tablet) held in landscape gets its
// OWN "Landscape" profile (landscapeCssVars etc., own dev-panel tab)
// - checked FIRST and independently of raw pixel width, so a wide
// landscape phone (e.g. 844px) is never mistaken for Desktop just
// because it crosses the 767px Mobile breakpoint (the original bug
// this whole feature exists to fix). Gated on (hover:none) and
// (pointer:coarse) so an ordinary wide desktop browser window is
// never mistaken for a rotated phone - orientation:landscape alone
// can't tell those apart.
const LANDSCAPE_TOUCH_QUERY = window.matchMedia('(hover: none) and (pointer: coarse) and (orientation: landscape)');
function isLandscapeActive() {
    return LANDSCAPE_TOUCH_QUERY.matches;
}
// True for either non-Desktop profile (Mobile-portrait OR Landscape)
// - most call sites just want "is this some kind of phone", not
// which specific one; see getActiveDeviceProfile() for the 3-way
// split used wherever the actual DATA differs per sub-profile
// (cssVars/mobileCssVars/landscapeCssVars and its siblings).
function isMobileActive() {
    return isLandscapeActive() || MOBILE_MEDIA_QUERY.matches;
}
function getActiveDeviceProfile() {
    if (isLandscapeActive()) return 'landscape';
    return MOBILE_MEDIA_QUERY.matches ? 'mobile' : 'desktop';
}
// The 5 device-object pairs below (cssVars, extrusionVars,
// colorVars, textOverrides, clickBurstFrameVars) each have a 3rd
// Landscape sibling now - these helpers pick the correct one so
// every render-side "isMobileActive() ? mobileX : X" ternary only
// needs to change its middle term to "getActiveXVars()" once,
// rather than becoming its own 3-way ternary at every call site.
function getActiveMobileVars() {
    return isLandscapeActive() ? landscapeCssVars : mobileCssVars;
}
function getActiveMobileExtrusionVars() {
    return isLandscapeActive() ? landscapeExtrusionVars : mobileExtrusionVars;
}
function getActiveMobileTextOverrides() {
    return isLandscapeActive() ? landscapeTextOverrides : mobileTextOverrides;
}

// Resolves one of the 5 mobile "spatial/motion" cssVar values
// (click-burst distance/height/curve-offset, shadow x/y-offset)
// into an actual PX number for the CURRENT viewport - per explicit
// request that these specific values scale with screen width on
// mobile (so the same settings "look correct on all phone types")
// instead of being a fixed px count that reads differently
// relative to the (vw-scaled) button on a narrow vs. wide phone.
// On desktop these values are still genuine px numbers, returned
// as-is, completely unaffected. On mobile/landscape the stored
// number is a VW value (see mobileCssVars' own comment on these 5
// keys), multiplied by the CURRENT real window.innerWidth here (no
// rotation happens anymore, so the true viewport width is always
// the correct reference for both sub-profiles), at the point of
// use - not cached - so a real device rotation/resize is picked up
// live, same as a native CSS vw unit would be.
function resolveSpatialPx(value) {
    return isMobileActive() ? value * window.innerWidth / 100 : value;
}
