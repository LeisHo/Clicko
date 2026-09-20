# Clicko — Project Progress

**This is a live document, not a log.** It holds only the current picture —
what's being worked on right now, what's recently done, and what's next. It
does **not** accumulate a running history of every past session; that
history already lives in `docs/CHANGELOG.txt` (the append-only, authoritative
record — see CLAUDE.md §4a/§4). Rewritten in place at each real update, not
appended to.

This doc functionally doubles as a handoff document: a brand-new AI chat
with no prior context should be able to read this file alone and know
exactly where the project currently stands, and pick up the work seamlessly
from there.

--------------------------------------------------------------------------------

## Currently working on

Nothing in progress. Development here proceeds as rapid, conversational
iteration — no formal phase plan; features and bug reports arrive and get
resolved within the same session. There are 2+ Claude sessions frequently
active in this shared working tree at once (one has recently focused on
dev-panel architecture/nesting, another on Target/Speed/Ms-per-click/High
Score text behavior) — check `git status`/`git diff` on `index.html` before
editing, and preserve any concurrent session's uncommitted work exactly (see
CLAUDE.md §5).

## Recently completed

The dev panel's own architecture had a major couple of days: it's now a
mature, fully "Method B" (config-array-driven, no hand-written control HTML)
system with:
- **Unlimited group-nesting depth** — groups can be dragged into groups into
  groups, no longer capped at 1 level; settings can be dragged into a
  deeply-nested group too. (The 1-level cap itself was only ever a
  drag-target restriction, not a real data-model limit — `captureSection()`/
  `applySectionOrder()` were already fully recursive.)
- **Desktop → Mobile/Landscape group-order/rename sync**, extended to mirror
  nested groups too — re-derives automatically whenever you switch into the
  Mobile/Landscape tab.
- **Lazy dev-panel build** — its ~686 controls now only construct on first
  open (D key / DEV button / an eager build for `?dev=1` visitors, since the
  panel is visible-by-default for them), not unconditionally on every page
  load. Fixed a real player-facing load-time regression this surfaced
  (Game Mechanics controls had to stay eager — `startGame()`/`endGame()`
  read `sliderStartingSpeed`'s live DOM value as their actual source of
  truth, not a JS default).
- **Startup dev-panel flash, fully fixed** (2 separate root causes, both
  closed): the panel briefly showing for non-dev visitors before JS hid it,
  and — a second, later-found bug — a dev-mode visitor's panel briefly
  rendering at a wrong (viewport-centered) position before its saved
  left/top/width/height loaded.

Target Text (`targetCount`) also had a full architecture pass: split from
one bare number into independent Prefix ("Click ")/Number/Suffix (" x")
spans, each with its own font-size/X/Y-offset/letter-spacing/extrusion-depth/
border-thickness, plus independent hide checkboxes and Text Edit Mode
targets. Along the way, fixed a "stuck after edit" Text Edit Mode bug caused
by a detached-DOM-node pattern (see Open questions below — the same bug
still affects Speed/Ms-per-click Display, not yet fixed there).

Other recent features: a High Score display (localStorage-persisted, its
own full settings group, now correctly joins the win/lose color tint);
Ms/Click Display's suffix can now have an independently-tunable 2nd line
gap (for its 3-line mobile layout); Target Count's "Scale With Browser"
checkbox (blends each part's own px/vw font-size pair).

Most recently (2026-09-19): a 15-item pass on the Round Breakdown panel
(built by a concurrent session, see below) - merged the Outline On/Off
checkbox with the panel's own previously-permanent border (toggling it
off now genuinely removes the line); removed the horizontal line under
the title and the "(won)"/"(lost)" round-name suffix; removed the "Time
To Hit Target" stat; added per-device Letter/Line Spacing for Round
Title/Data; added lost-round-only Title/Data color pickers; added
Horizontal/Vertical Alignment + Edge Lock for the panel's own position
(a new small mechanism, not the shared text-anchor system - see
applyRoundBreakdownPosition()'s own comment); added one Scale With
Browser checkbox for the whole panel (size + both font sizes); added a
Row Divider Lines On/Off checkbox; registered the panel's 5 stat labels
as a Text Edit Mode target (it had none before); and built a full Auto
Scroll subsystem (On/Off + loop, Speed, Pause Before, Pause At End),
which also disables manual scrolling while active. Also added a
"Saved" flash indicator to the dev panel's HEADER Sync button
specifically (the original bottom SYNC button already had one, but it's
not visible from the header without scrolling back down). A real bug
was found and fixed live: several of the new "shared" controls
(Align/Valign/Edge-Lock/Autoscroll) were initially read through the
same per-device lookup this group's genuinely per-device sliders use,
which silently no-op'd on Mobile/Landscape - fixed to read desktop
cssVars unconditionally instead, matching this group's own established
convention for shared toggles. **Not committed/pushed** - awaiting
explicit instruction. The currently-live saved settings predate several
of the new/changed defaults (outline-enabled, title/data colors) and
will show their old values until someone re-saves.

Just before that (2026-09-19): the dev panel's own header (title + all its
buttons) now correctly stays above scrolled-past content - it already
used `position: sticky` but had no explicit `z-index`, so later siblings
painted over it during a scroll (sticky alone only pins position, it
doesn't guarantee paint order). Also added a 2nd Sync (Save) button
directly in the header, so it's reachable without scrolling back up.
Committed and pushed (94bd993..92b6886) - note this was done via a
hand-isolated 2-hunk commit + a stash-hold-rebase-pop, since another
Claude session was actively working on the Round Breakdown feature
(below) in this same shared working tree at the time; their own
uncommitted work was preserved untouched throughout.

Just before that (2026-09-19): a new "ROUND BREAKDOWN" dev-panel group (18
controls - On/Off, Resizer On/Off, X/Y/Width/Height, Font [the existing
15 "8-Bit Text Style" pixel fonts plus 10 new thick sans-serif Google
Fonts], Outline On/Off/Thickness/Color, Panel Color, Title/Data Font
Size/Bold/Color) for the loss-screen round breakdown panel's design,
nested under UI TEXT (a real top-level static group elsewhere in the
page, relocated there via a direct `sectionOrder` edit to
`data/processed/dev-panel-settings.json` - the config-array control
system can only target a group already present in static HTML, so a
user-organized custom group like UI TEXT can't be targeted directly).
The panel's own hardcoded title text was also removed (the drag-handle
element itself stays, just empty). **Not yet committed/pushed** (a
separate, still-active Claude session's own work) - the `sectionOrder`
nesting won't take visible effect on the live site until this is
pushed, since production `loadSettings()` reads the settings file from
GitHub's API, not this local copy.

Before that (2026-09-19): Target Text's Prefix/Number/Suffix each got
their own independent Line Spacing slider (replacing the old single
shared one, same "shared -> per-part" migration this group's other
properties already went through). Committed and pushed
(ff687a5..219a34f).

Just before that (2026-09-19): Target Text's Prefix ("Click") Y position
and Suffix ("x") X/Y position are now anchored to the Number's own
rendered edges (bottom for Prefix; right+bottom for Suffix), instead of
the old shared group anchor point - a new `updateTargetAnchoredPositions()`
measures the Number's real `getBoundingClientRect()` live (via a
ResizeObserver plus a hook in `applyActiveVars()`) and exposes it as 2
new CSS custom properties the Prefix/Suffix `top`/`left` formulas now
read. The existing X/Y Offset sliders are unchanged - they still nudge
from whatever the reference point is, just a different one now. **Their
current values were tuned against the OLD reference point and will
likely need re-tuning** to restore the previous visual layout - this
wasn't auto-compensated (not asked for, would require guessing).
Committed and pushed (d8708d8..d767a55).

2026-09-17 (several sessions in one day, referencing DickoClicko as the
correctness target throughout): the per-control Mobile/Landscape
checkbox system - "Show in Mobile/Landscape" (Desktop) / "Independent
from Desktop" (Mobile/Landscape), plus a group-level cascade checkbox -
was made universal across all controls (previously opted into only 3
demo controls), including the ~130 hand-authored "text settings battery"
rows the array-driven system didn't originally cover, then had 3 more
real bugs found and fixed via direct reports: a value-preserving default
so existing per-device tuning was never altered by the migration; a
mixed-state (indeterminate) nested subgroup that the cascade silently
skipped; an unchecked group's own value getting lost instead of retained
for next time; an empty group staying visible as a shell instead of
auto-hiding; and checkbox/cascade display going stale across a tab
switch. Same day, also: Delete Group/Setting, a full session-scoped
infinite Undo system (3 real bugs found and fixed, including a stuck
gesture-gate on native color pickers and a ~2.7s perf bug from a
per-slider O(sliders × cssVars) reapply), a Ctrl+F-style search bar, and
several header-button/UI polish items. Everything in this whole
multi-day effort is committed/pushed to Clicko's own repo and ported to
`.claude/TEMPLATE_DEV_PANEL.html` (not a git repo - "ported" there means
the file itself is current, via the standing archive-then-edit script).

See `docs/CHANGELOG.txt` for full details and reasoning on all of the
above — every item here has its own detailed dated entry there.

## What's next

Immediate: commit and push both pending Round Breakdown changes
(2026-09-19) - the original 18-control group (its `sectionOrder` nesting
under UI TEXT won't be visible on the live site until pushed) and this
session's own 15-item follow-up pass (outline/border merge, Align/Valign+
Edge Lock, Scale With Browser, Auto Scroll, Text Edit Mode, etc.) - both
currently verified locally but not yet pushed, awaiting explicit
instruction per CLAUDE.md §9.

Likely next: re-tune Target Text's Prefix ("Click") Y Offset and Suffix
("x") X/Y Offset sliders (Desktop/Mobile/Landscape, all 3 tabs) - their
current values were calibrated against the OLD shared anchor point,
before the 2026-09-19 change made them relative to the Number's own
rendered edges instead. Not otherwise queued.

One old, possibly-stale backlog item from an earlier phase, never
implemented and not recently mentioned — surfaced here in case it's still
wanted, not because it's a confirmed priority: brightness sliders for the
button and base colors, alongside their existing color pickers.

## Open questions / blockers

- **Known bug, not yet fixed**: right-click-editing either the Speed
  Display or the Ms/Click Display in Text Edit Mode permanently detaches
  their child spans from the DOM after committing (the same "stuck"
  bug class already fixed for Target Count's Prefix/Suffix — `openTextEditFor()`
  wipes the shared wrapper's `innerHTML` while these 2 multi-child targets'
  `render()` functions write into now-detached cached node references).
  Confirmed pre-existing and reproducible; flagged but deliberately not
  fixed yet (out of scope for the task that found it).
- **Known limitation, narrow edge case**: `syncTabOrderToDesktop()`'s
  `findTranslated()` helper only searches 2 levels deep when placing a
  Mobile/Landscape-only orphan group with no Desktop counterpart — correct
  for the (now-unlimited-depth) main translation logic itself, but a
  device-only extra group nested 3+ levels deep with no Desktop counterpart
  could land at the wrong level. Requires both 3+ levels of nesting and a
  device-only group at that specific depth to matter; not pursued.
- **Known limitation, narrow edge case**: the reported "white screen, then
  ~1.5s total load" (beyond the now-fixed dev-panel flash itself) was
  flagged as a separate, larger load-performance question — a single large
  inline-script file plus a render-blocking Google Fonts stylesheet pulling
  25 font families (was 15; +10 with the 2026-09-19 Round Breakdown Font
  control) — and not pursued as its own task yet.
- **Known limitation, narrow edge case**: a dynamicDevice-opted control's
  "Show in Mobile/Landscape" checkbox can only create that tab's row if the
  control's own group already exists as a TOP-LEVEL section on that tab
  (`findGroupContent()`'s own direct-child lookup, shared by every uniform
  control, not something new to this feature) — if the group has been
  drag-nested under another group on that tab (or doesn't exist there at
  all), the checkbox silently no-ops with a console warning rather than
  creating the group itself. Not pursued (would mean auto-creating a
  possibly-unwanted group); the underlying mirror/independence mechanism
  itself is fully verified correct once a target group exists.
