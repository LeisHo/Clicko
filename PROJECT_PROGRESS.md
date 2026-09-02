# Clicko — Project Progress

## Current Status

Actively developed and deployed at clicko-one.vercel.app. Core game loop,
click-burst visual feedback, and an extensive live-tunable dev panel are all
working. Visual identity has converged on an 8-bit arcade look: pixel fonts
everywhere, pre-rendered click-burst sprite art, and (as of the latest work)
a pixel "3D extruded" text-shadow treatment on most on-screen text.

No formal phase plan — development proceeds as rapid, conversational
iteration (features and bug reports arrive and get resolved within the same
session). `docs/CHANGELOG.txt` (newest-first, append-only) is the
authoritative record of what's shipped; the rough evolution so far:

## Phases / Milestones (informal, retrospective)

- **Core game loop** — tap-to-target mechanic, shrinking time window, round progression.
- **Two-part button redesign + settings system** — base/dome SVG artwork, dev-panel sliders/color pickers, copy/save/load settings.
- **Click-burst particle system** — pre-rendered sprite-frame bursts along a motion path, with cast "shadow" copies matching the main button/base shadow's look.
- **8-bit arcade visual identity** — arcade pixel font as the default everywhere, then a dedicated "3D extruded" pixel-text style (shared font/depth/color controls) applied across Start/Try Again/Round/Target/Speed/Win-Lose.
- **Dev-panel cleanup** — removing controls that were never truly per-device (Game Mechanics, Background Color) rather than leaving them as duplicated UI.

## Recent Work

- Switched default fonts to "Press Start 2P" (8-bit arcade style) across the game.
- Let dev-panel slider values be typed beyond a slider's own min/max.
- Fixed 2 real click-burst-shadow bugs (missing projection offset, mirrored skew on one side) plus a mobile-breakpoint gap found while fixing them.
- Found and fixed the actual cause of a "2 click-frame-sets" visual report: shadow particles were rendering as an unrecognizable sliver shape, not a darkened copy — fixed via `offset-rotate`.
- Replaced randomized win/lose messages with plain `:)` / `:(` (rotated 90° to read correctly in the pixel font).
- Removed the dev panel's redundant "Mobile Overrides" duplicates for Game Mechanics and Background Color — both were already single shared values under the hood, not genuinely per-device.
- Added the 8-bit pixel 3D-extruded text style: 1 shared font dropdown (5 curated 8-bit Google Fonts) + depth slider + 2 colors for Start/Try Again/Round Text; Target/Speed share the 2 colors with their own depth; Win/Lose share font+depth with their own 2 color pairs (green/red default).

## Next Steps

- Brightness sliders for the button and base colors, alongside their existing color pickers (requested, not yet implemented).

## Blockers / Issues

None currently open.
