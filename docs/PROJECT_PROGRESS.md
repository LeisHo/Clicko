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

Most recently (2026-09-17): 3 more real gaps in the checkbox system,
all referencing DickoClicko as the correctness target: (1) unchecking
"Independent from Desktop" on a control that defaulted independent
(never live-edited, so its value was never captured into
devDeviceValues) permanently lost that value - fixed by capturing the
current value before the uncheck overwrites it with Desktop's; (2) an
empty group (every setting/subgroup within it hidden) stayed visible as
an empty shell on Mobile/Landscape instead of hiding itself -
`refreshEmptyGroupVisibility()` ports DickoClicko's own
`refreshVisibilityUI()` pattern; (3) checkbox/cascade/empty-group
display could go stale across a tab switch - `switchDevPanelTab()` now
re-syncs all of it for whichever tab is about to show. Ported to the
template too. Committed and pushed (94ccb25..48b3688).

Prior to that (2026-09-17): fixed a 3rd real bug in the group cascade
checkbox - it silently skipped a nested subgroup already in a mixed
(indeterminate) state, since its own `checked !== checked` comparison
read a mixed subgroup's `checked:false` as "already matches, nothing to
do". Reproduced via direct user repro (unchecking "UI TEXT" left its
nested "High Score" subgroup, 28 rows, fully visible on Mobile). Fixed
by also cascading whenever a subgroup is `indeterminate`, not just when
its `.checked` differs. Ported to the template too. Committed and pushed
(3510f06..b41d266).

Prior to that (2026-09-17): fixed the checkbox system not covering ~130
hand-authored "text settings battery" rows (Round/High Score/Result
Win/Lose/Target/Speed/Ms-per-Click/Try Again/etc.) - these predate and
sit entirely outside the array-driven DESKTOP_UNIFORM_CONTROLS system
the universal-checkbox work below actually touched, so they never had a
checkbox at all (found via 2 direct reports: Sync/Save not persisting
the checkbox feature, and unchecking a group not hiding all its children
on Mobile/Landscape - reproduced live with the WIN group, where 5 of 30
children stayed visible). Fixed generically rather than touching each of
Clicko's ~10 separate rendering systems: `hasStaticDeviceCounterpart()`
now also falls back to a DOM-existence check; `injectRowDeviceCheckboxes()`
backfills both checkbox kinds onto any row lacking one; `syncStaticRowVisibility()`
shows/hides an existing static row via a CSS class instead of DOM
removal (these rows always exist, nothing to "recreate"). Checkbox
counts grew 153->285 (desktop)/102->155 (mobile+landscape each).
Committed and pushed (488e772..77cc6f6).

Prior to that (2026-09-17): the per-control Mobile/Landscape checkbox
system was applied universally to all 153 array-driven uniform controls
(previously opted into only 3 demo controls), with a new group-level
cascade checkbox on top and a value-preserving category-aware default
(controls that already had a real independent per-device value default
checked/independent; controls that were desktop-only/shared default
unchecked/hidden - zero existing control values were altered). Building
it surfaced and fixed a real Undo bug: restoring devVisibility/
devIndependence state (Undo/Reset/Load) correctly reverted the
underlying state but never re-synced an already-existing checkbox
element's own `.checked` display - fixed with a new
syncDeviceCheckboxesFromState() pass. Committed and pushed
(050e808..7d48ee8), then ported to `.claude/TEMPLATE_DEV_PANEL.html`
too (made universal-by-default there as well, per the user's own
explicit confirmation; found and fixed 2 template-specific correctness
issues the port surfaced - the built-in Dev-Panel-style controls and
the Mouse Log interval slider both needed an explicit exclusion flag,
`skipDeviceCheckbox`, since they have their own separate mechanisms
outside the registered-control system this feature's category-aware
default relies on) - not yet committed to the shared `.claude/` template
(pending, separate from Clicko's own repo).

Prior to that (2026-09-17): Delete Group/Setting (a header button; click,
then click a group OR a single setting to delete it - refuses a locked
group or anything inside one, and the 2 mandatory built-in groups) and a
full session-scoped infinite undo system (Ctrl+Z or the header Undo button;
in-memory, cleared the moment Save is clicked, lost on refresh) - hit 3
real bugs across development, all since fixed and reverified with real
(not `.click()`-simulated) mouse-event sequences. The 3rd and most
stubborn: the Undo button's own click was self-canceling (it lived inside
the same panel-wide pointerdown listener that pushes undo snapshots, so
clicking Undo pushed a throwaway snapshot of the just-changed state and
then immediately popped that same entry, restoring nothing) - survived 2
earlier "fixed and verified" rounds specifically because every test used
the JS `.click()` method on the Undo button, which never fires
pointerdown/mousedown and so never exercised the buggy path; only a real
mouse click does. Root-caused via one direct diagnostic
(`devUndoStack.length` after a real edit + a real Undo click printed 1,
not the correct 0) rather than more guessing. The other 2: Undo could get
permanently stuck doing nothing the moment a native color picker was ever
opened (the OS dialog eats the pointerup my "one push per gesture" gate
needed to reset - now has a 2s safety timeout plus a window-focus listener
as 2 independent recovery paths), deletion-undo was rebuilt on real
DOM-node capture/reinsertion instead of the original value-snapshot
approach (which could only recreate a deleted group as an empty shell and
couldn't recreate a deleted setting at all), and — the most severe of the
3 — Undo/Reset/Load were taking ~2.7 seconds and freezing the panel, traced
to a real O(sliders × cssVars) bug (a shared "apply everything" function
was being called once per slider instead of once per batch); fixed, now
~100ms (~26x faster), also documented in the template (CLAUDE.md §12e) as
a design lesson even though the template's own sync mechanism doesn't have
this specific bug. Also: a Ctrl+F-style search bar
for group/setting names (ported from DickoClicko, in both Clicko and the
template); the template's own per-control "Show in Mobile/Landscape"/
"Independent from Desktop" checkbox system, newly ported into Clicko's own
uniform-control rendering pipeline (opted in on 3 real controls so far: 2
colors + 1 slider — more can opt in the same way); locked groups' padlock
icon now reads full-opacity at rest and dims on hover. The dev panel's
header now has icon buttons for Text Edit Mode/Add Group/Delete/Undo/
Collapse All (replacing the old standalone checkbox and 3 per-tab
"+ Add Group" buttons); right-click-arming "+ Add Group" lets a plain click
select settings/groups to fold into a new group (additive to the existing
Shift+click); new groups insert at the top of the list (after Dev Panel/
Debug); the group drag-handle icon is centered at any font-size/nesting
depth. The header-button/selection/drag-handle work and the search bar were
ported from `.claude/TEMPLATE_DEV_PANEL.html`; Delete/Undo were not (not
explicitly requested for both this time — a natural follow-up).

See `docs/CHANGELOG.txt` for full details and reasoning on all of the above
— every item here has its own detailed dated entry there.

## What's next

Nothing specifically queued. This whole effort (universal checkbox
system, group-level cascade checkboxes, the "text settings battery" row
fix, and the mixed-state cascade bug fix) is fully committed and pushed
to Clicko's own repo, and ported to `.claude/TEMPLATE_DEV_PANEL.html`
too (that file isn't under git - `J:\CLAUDE\PROJECTS\.claude` has no
`.git` at all - so "ported" there just means the file itself is
up to date, via the standing archive-then-edit script).

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
  15 font families — and not pursued as its own task yet.
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
