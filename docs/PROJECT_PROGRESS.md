# Clicko — Project Progress

**This is a live document, not a log.** It holds only the current picture —
where the project stands, what's next, and known open issues. The full
history lives in `docs/CHANGELOG.txt` (append-only, newest first).

A brand-new session should be able to read this file alone and know where
things stand.

--------------------------------------------------------------------------------

## Where the project stands (2026-10-08)

**Feature-complete.** No new features are planned; the remaining activity is
tuning dev-panel sliders and saving settings (Sync → `data/processed/
dev-panel-settings.json`).

**Code layout was just refactored (merged to `main` and deployed live
2026-10-08, after a checked Vercel preview).** Behavior is unchanged — proven, not assumed (see "How the refactor
was verified" below). What changed:

- `index.html` is now markup only (~300 KB, was 1.6 MB). Code lives in `src/`:
  - `src/css/main.css` — all page/dev-panel styles
  - `src/js/01-…07-*.js` — the game + dev panel, as 7 **classic** scripts that
    share one global scope (so every global, inline `onclick=`, and the
    Stage 2 modules' calls into them work exactly as before)
  - `src/js/stage2/*.mjs` — the 8 UI-engine (Inspector) integration modules,
    plus `shared.mjs`
- File boundaries are only at points a static load-order check proved safe:
  nothing that runs while an earlier file loads (including callbacks it
  registers) can reach a binding declared in a later file. That's why
  `04-core.js` (~10k lines) is one file — there is no safe cut inside it.
- Comments condensed to concise "why"/gotcha notes (~60-70% smaller); the
  historical narratives they used to carry are in the CHANGELOG.
- 5 dead functions removed; duplicated Mobile/Landscape renderer and
  `syncReal` helper merged.
- 3 dev-panel template fixes ported (deliberate behavior changes, separate
  commit): unassigned Ctrl/Alt combos (Ctrl+F/R/C…) are no longer swallowed;
  grabbing empty panel space to scroll no longer adds an undo step; locking a
  group locks/unlocks all its nested subgroups. Plus CSS var() fallbacks on
  the drag-handle height formula.
- Every persisted settings key (control ids, group `data-sid`s,
  `textOverrides`/`order` keys, CSS var names) is unchanged, so existing
  saved settings and the "set defaults" workflow work exactly as before.

### How the refactor was verified

`scripts/refactor-harness/` (kept for future tweaks):
- `astcheck.mjs` — proves two trees have identical JS (oxc AST), CSS
  (minified) and markup; used for every pure move/comment step.
- `run.js` + `harness.js` + `compare.js` — headless Chrome (no npm deps):
  pins the settings fixture, seeds `Math.random`, and captures root CSS vars,
  every game element's computed style + position, dev-panel DOM, Save/Copy
  payloads, and a sweep through all 1,821 dev-panel inputs, on desktop /
  mobile / landscape. Baseline-vs-baseline runs are identical apart from one
  measured animation-phase noise source (filtered in `compare.js`).
- `phase4-test.js` — targeted before/after checks for the 3 template fixes.

## What's next

1. Keep tuning via the dev panel as needed.

Older backlog items, possibly stale (carried over, not confirmed wanted):
re-tune Target Text Prefix/Suffix offsets after the 2026-09-19 anchor change;
brightness sliders next to the button/base color pickers; Accent Color #2/#3
+ Button Color template items (deliberately not ported in the refactor).

## Known issues (open, deliberately left as-is)

Found while condensing comments during the refactor — left unfixed by
decision (2026-10-08) to keep behavior identical:
- Copy Settings, Export, and Named Setting States don't include dev hotkeys
  (`devHotkeys`); only Sync/Save does.
- Landscape tab's Scroll Strength uses Mobile's value, not its own.
- Landscape per-frame-set click-burst values are never restored when
  switching frame sets (`restoreClickBurstFrameVars()` handles desktop/mobile
  only).
- Try Again, "?", Win and Lose are registered as Inspector objects but have
  no engine→Clicko sync entries in `08-engine-sync.mjs`.

Carried over from before the refactor:
- Text Edit Mode: right-click-editing Speed Display or Ms/Click Display
  detaches their child spans after commit (same bug class already fixed for
  Target Count's Prefix/Suffix).
- Round Breakdown Width/X Offset sliders can show a one-interaction-stale
  value right after a resize-handle drag (the persisted value is correct).
- `sliderExtrusionFontTrimAdjust` can't find its Mobile/Landscape group
  (Desktop's group is named "8-Bit Text Style (Start/Try Again/Round/
  Win-Lose)", Mobile/Landscape's lacks "Round").
- `syncTabOrderToDesktop()` only searches 2 levels deep when placing a
  device-only group with no Desktop counterpart.
- Round Breakdown relative-mode position doesn't re-run when the target
  resizes for other reasons (no ResizeObserver on the target).
