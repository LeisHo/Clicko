# Clicko — Handoff Notes

## Current State

Working and deployed at clicko-one.vercel.app. Core game loop, dev panel,
click-burst artwork/shadows, and the 8-bit pixel 3D-extruded text style
(Start/Try Again/Round/Target/Speed/Win-Lose) are all live. Win/lose states
show as plain `:)` / `:(` (rotated 90deg to read correctly in the pixel
font), not text messages.

## Known Issues

None currently open. A user report that "try again?" only ever shows the same
message was investigated (code + `tryAgainMessages` pool checked directly) and
found to be correct, working randomization — most likely just small-sample
randomness (1-in-6 chance per occurrence that the first pool entry, which
reads as the "default", comes up), not a bug.

## Architecture Notes

- Single-file app (`index.html`) — CSS, markup, and JS all inline, no build step. See `docs/CODE_SUMMARY.md` for the details.
- Visual settings are CSS-var-driven and split desktop/mobile (`cssVars` vs `mobileCssVars`, etc.) **only** where a setting is genuinely device-specific (spatial layout, sizing). Game-mechanics timing and background color are intentionally single-source — see `applyGameMechanicsSlider()` and the unconditional `--bg-color` line in `applyActiveVars()`. Don't reintroduce a "Mobile" duplicate control for either without a real reason; a past dev-panel design had them and it was removed as redundant.
- Range sliders can be typed past their own min/max (`applySliderValue()` + `makeDevValuesEditable()`) — the slider control itself stays visually clamped, but the underlying setting takes the real typed value. This relies on native `<input type="range">` behavior (self-clamping `.value`) being worked around deliberately; don't "simplify" it back to a plain `slider.value = val` assignment.
- Click-burst shadow particles use `offset-rotate: 0deg` (not `auto`) specifically so their rotation stays fixed regardless of flight direction — this was a real, confirmed bug fix (see CHANGELOG, "2 frame sets" investigation). Don't change this without understanding why.

## Data Sources

No external data or APIs. Local static assets only:
- `data/BUTTON/` — button SVG artwork (base/dome, normal/pressed).
- `data/BUTTON/CLICK/frames/<SET>/frame_NN.png` — pre-rendered click-burst animation frames per frame set (`CLICK1`-`CLICK4`).
- Google Fonts (loaded via `<link>`) for all selectable typefaces.

No credentials/API keys involved anywhere in this project.

## Testing

No automated test suite. Validation is manual: a div-tag-balance check
(`python3 -c "import re; ..."`, counts `<div>` vs `</div>`) before every
push, since local `file://` preview is unreliable in this environment
(loads as a sandboxed `data:` URL with `localStorage` disabled). Real
functional verification happens live against the deployed Vercel URL after
each push, via direct DOM/JS inspection (not just visual assumption).

## Deployment

Push to `main` on GitHub (`LeisHo/Clicko`); Vercel auto-deploys from that
branch. Allow ~15s after push before the new deployment is live.

## Next Priority

The 8-bit pixel "3D extruded" text style is DONE and live (see
`docs/CHANGELOG.txt`'s "Added the 8-bit pixel 3D-extruded text style" entry
and `extrusionVars`/`applyExtrusionStyles()` in `docs/CODE_SUMMARY.md`).

Remaining queued item:

1. **Brightness sliders** for the button and base colors, alongside their existing color pickers. Requested, not yet implemented.

## Context for New Sessions

This project is worked in short, rapid, conversational iterations — features
and bug reports often arrive faster than they can be fully implemented in one
turn. `docs/CHANGELOG.txt` (newest-first, append-only) is the authoritative
record of what's actually shipped and why; treat this file's "Next Priority"
section as a snapshot that can go stale mid-session, and re-confirm scope
with the user before building anything large rather than assuming this doc is
current. Never `git add -A` — the working tree persistently carries unrelated
files (`data/BUTTON/Archived*/`, a deleted `BUTTON.ai`, a `datalog/` screen
recording folder) that must not be touched; stage `index.html` and
`docs/CHANGELOG.txt` explicitly (plus any specific new asset genuinely part
of the change).
