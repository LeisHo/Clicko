# Code Structure Summary

## Architecture Overview

Everything lives in one file, `index.html`: a `<style>` block, the page markup
(game elements + a large developer control panel), and one inline `<script>`
holding all game logic. There is no build step — the file that's edited is
the file that's deployed.

One exception: `api/save-settings.js`, a small Vercel serverless function
(CLAUDE.md Section 12l). The dev panel's SAVE button is git-only (no
`localStorage`, by explicit request - a deliberate departure from Section
12l's own "not just local, but also git" wording): it POSTs its settings
dump here, and the function commits it to
`data/processed/dev-panel-settings.json` in this repo via GitHub's
Contents API - LOAD/RESET (`loadSettings()`, now async) fetch that same
file back. This is what makes a saved setup visible from any device/
browser, including mobile (which has no local file access of its own to
write through with). Requires `GITHUB_TOKEN`/`DEV_PANEL_SAVE_SECRET`
Vercel env vars — see README.md.

Visual tuning is centered on CSS custom properties. Two parallel JS objects,
`cssVars`/`colorVars`/`fontVars` (desktop) and `mobileCssVars`/
`mobileColorVars`/`mobileFontVars` (mobile), hold every tunable value.
`applyActiveVars()` picks the active set based on `isMobileActive()`
(`MOBILE_MEDIA_QUERY = matchMedia('(max-width: 767px)')`) and writes it onto
`document.documentElement.style`, so the actual CSS just reads
`var(--whatever)`. A few settings are deliberately **not** device-split
(background color, click-frame-set) because they're genuinely one shared
value, not a per-breakpoint one — see the comments at their declarations.

## Main Modules (by section within index.html)

- **Game elements** — the button (base + dome SVG layers, swapped on press), click-burst particle layer, round/target/speed/result text overlays, round-breakdown panel.
- **Developer panel** — a large draggable/resizable floating panel, one collapsible section per visual subsystem (8-Bit Text Style, Main Button, Shadow, Click Burst, UI Button, Round Text, Win/Lose Text, Target Count, Speed Display, Game Mechanics, Background), plus a duplicated "Mobile Overrides" block for every section whose values are genuinely device-specific (Game Mechanics, Background, and 8-Bit Text Style are not duplicated, since none of them are actually per-device).
- **Game logic** — round/tap state machine, timing/difficulty ramp, win/lose detection.

## Key Functions

- `applyActiveVars()` — the single place that pushes the active (desktop or mobile) variable sets onto the DOM; also unconditionally re-applies the single shared `--bg-color`.
- `applyExtrusionStyles()` / `buildExtrusionShadow(depthPx, borderColor)` — the 8-bit "3D extruded" text effect (Start/Try Again/Round Text/Target/Speed/Win-Lose). CSS has no native depth parameter and a custom property can't loop, so this generates a stepped diagonal `text-shadow` stack (1 layer per px of depth) in JS and stores it in a `--*-shadow` custom property; the actual CSS rules just read `text-shadow: var(--extrusion-shadow)` etc. Driven by `extrusionVars` (single/shared, not mobile-split): one font + one depth + 2 colors shared by Start/TryAgain/Round, Target/Speed share the 2 colors but keep their own depth, Win/Lose share the font+depth but keep their own 2 color pairs.
- `applySliderValue(slider, value)` / `setupDevSliders()` — generic slider→cssVar wiring via `CSS_VAR_SLIDER_MAP`; also the shared apply path for the click-to-edit-a-number feature (typing a value beyond a slider's own min/max keeps the slider clamped but applies the real typed value). The 3 extrusion-depth sliders and the extrusion/win/lose color pickers are special-cased here since they write into `extrusionVars`, not a cssVar.
- `resolveDevControlId(id)` — maps any `sliderMobileX`/`colorMobileX`/`selectMobileX` dev-panel id to its desktop counterpart + an `isMobile` flag; the whole generic dev-panel wiring is built around this.
- `spawnClickBurst()` / `spawnClickBurstSide(zone, mirror, containerRect, buttonRect)` — spawns the pre-rendered click-burst particle frames (and their offset/skewed "cast shadow" copies) along a CSS motion path (`offset-path`) radiating from the tap point.
- `handleGameButtonPress()` / `handleGameButtonRelease()` — per-tap logic: debounce, tap counting, diagnostic logging.
- `scheduleMaxTimeCheck()` — the shrinking-time-window / auto-lose timer.
- `endGame(won, reason)` — win/lose resolution: sets the result color/text (`:)` / `:(`), shows the round breakdown, schedules the next round or a "try again" prompt.
- `startGame()` — resets state and starts a round.
- `copySettings()` / `saveSettings()` / `loadSettings()` — export/import of the full settings bundle. `copySettings()` is clipboard-only; `saveSettings()`/`loadSettings()` are git-only (see `api/save-settings.js` above), no `localStorage`.

## Dependencies

None on the client side — no npm packages, no CDN libraries. One external
asset: the Google Fonts stylesheet link (currently loads "Press Start 2P"
plus the game's other selectable fonts). `api/save-settings.js` (see above)
runs server-side on Vercel's Node runtime and calls GitHub's REST API via
the platform's built-in `fetch` — no npm dependency there either.

## Data Flow

```
dev-panel input (drag/type/pick)
    -> applySliderValue() / color-picker or font-select handler
    -> writes into cssVars/colorVars/fontVars (or their mobile twins)
    -> applyActiveVars()
    -> document.documentElement.style.setProperty(varName, value)
    -> CSS var(--x) in .style rules picks it up, repaints
```

Game-mechanics values (starting time, speed decrease, debounce, round/result
duration) are the one exception: they write directly into `gameState` /
`TAP_DEBOUNCE_MS` via `applyGameMechanicsSlider()`, not into a cssVar — there
is only one game in progress, so these were never truly per-device even when
the dev panel used to expose a duplicate "Mobile" copy of their sliders.

## Important Classes / State

- `gameState` — the live game state object (current round, tap count, target, max time, timing thresholds).
- `CSS_VAR_SLIDER_MAP` — desktop slider id → CSS variable name; the backbone of the generic slider system.
- `extrusionVars` — the 8-bit extruded text style's shared state (font, depth, fill/border colors, Target/Speed's own depths, Win/Lose's own color pairs). Single/shared, not mobile-split.
- `CLICK_FRAME_SETS` / `CLICK_FRAME_URLS` — the available pre-rendered click-burst art sets and their frame file paths under `data/BUTTON/CLICK/frames/`.
