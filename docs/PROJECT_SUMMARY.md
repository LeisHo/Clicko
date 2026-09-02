# Clicko — Project Summary

## Overview

Clicko is a browser-based tapping/reflex game: hit a big central button exactly
the required number of times before a shrinking time window runs out. Built as
a single self-contained HTML file, deployed to Vercel at clicko-one.vercel.app.

## Scope

**In scope:** the game itself (button interaction, timing/difficulty logic,
click-burst visual feedback, round progression, win/lose states) and an
extensive in-page developer panel for live-tuning nearly every visual
parameter (position, size, color, font, shadow, animation) without touching
code, separately for desktop and mobile breakpoints where the setting is
genuinely device-specific.

**Out of scope:** no backend, no accounts, no persistence beyond an optional
localStorage settings save/load and a copy-to-clipboard settings export. No
build step or bundler — the deployed artifact is the same `index.html` edited
directly.

## Key Objectives

- A responsive, satisfying tap-timing game that works well on both desktop and mobile.
- A visual style built around pre-rendered 8-bit-style click-burst artwork and an arcade pixel font.
- A dev panel thorough enough to tune the entire visual language live, in-browser, without redeploying for every tweak.

## Deliverables

- `index.html` — the entire game (structure, styling, and logic in one file).
- `data/BUTTON/` — button artwork (SVG base/dome layers, pressed states) and the `CLICK/frames/` pre-rendered click-burst frame sets.
- `docs/CHANGELOG.txt` — append-only, newest-first log of every shipped change and the reasoning behind it.

## Timeline

No formal milestones — this is driven by an ongoing, iterative session-by-session feature/bugfix cycle (see `docs/CHANGELOG.txt` for the real history; entries are dated).

## Technical Approach

Vanilla HTML/CSS/JS, no framework or build tool. Nearly all visual tuning is
exposed as CSS custom properties (`cssVars`/`mobileCssVars` in the inline
`<script>`), driven live by the dev panel's sliders/color pickers/selects and
applied via `applyActiveVars()`, which switches between the desktop and
mobile variable sets based on `MOBILE_MEDIA_QUERY` (`max-width: 767px`). A
setting is only device-split when it's genuinely device-specific (spatial
layout, sizing); shared game state (timing/difficulty) and page-wide values
(background color, click-frame-set, and the 8-bit extruded text style) are
intentionally single-source rather than duplicated per breakpoint. The visual
identity is built around an 8-bit pixel-art look: pre-rendered click-burst
frame art, a curated set of 8-bit Google Fonts, and a JS-generated "3D
extruded" text-shadow effect applied to most on-screen text. See
`docs/CODE_SUMMARY.md` for the detailed architecture.
