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

Most recently (2026-09-20): 2nd fix for Round Breakdown's Auto Scroll
pausing on the Try Again "?" flash - direct follow-up ("Its better than
before, but its still happeing... it happens when the '?' dissppears
as well as when it reappears") confirmed the earlier tick()-side fix
(caching scrollHeight, see below) was real but incomplete. The flash's
own `visibility` toggle turned out to be independently expensive -
`#startButtonFlashCharExtrusion`'s text-shadow stacks dozens of layers
(one per pixel of extrusion depth, times an 8-direction border ring at
every depth), and repainting that stack on every show/hide was enough
on its own to stall the marquee, symmetric in both directions exactly
as reported. Fixed by switching the flash to `opacity` (0/1) plus
`will-change: opacity` - opacity on a will-change-promoted element is
compositor-only, never touching the main thread's paint pipeline the
way `visibility` does. Verified the mechanism directly (will-change
computed correctly, opacity alternates over real time, nothing else in
the codebase read this element's own `.visibility`) rather than
re-attempting frame-timing measurement in this session's own
browser-testing tool (already confirmed unreliable for this while
verifying the 1st fix). Isolated into its own commit the same way as
the 1st fix - 2 more concurrent sessions had their own substantial
uncommitted work (Undock/Dock, Button diameter's own vmin fix) sitting
in the same file; verified the extracted patch was exactly these 2
hunks before committing, restored their work afterward untouched.
Committed and pushed.

Before that (2026-09-20): the button itself (diameter, and its 4
dependent shadow/press-offset formulas) now also scales with both
viewport width AND height, not just width - a direct follow-up
("everything that scales with browser should scale with both browser
height and width. not just text") to the Scale-With-Browser text fix
below. Re-confirmed all 15 text font-size formulas were already fixed;
found one more always-on (non-toggle-gated) width-only mechanism -
`--button-diameter-vw` (the button's own width/height) plus 4
proportional formulas (shadow x/y position transform x2 rule-sites,
button height-offset/press-intensity translateY x2 rule-sites) - and
changed all of them from `var(--cq-vw, 1vw)`/bare `1vw` to `1vmin`.
Width and height both derive from the same term (height = width *
1.02598), so one shared vmin unit keeps the button's exact aspect
ratio while making the whole button respond to whichever viewport
dimension is smaller. Deliberately left the ~40 remaining cq-vw/cq-vh
occurrences untouched elsewhere - those are X/Y positional OFFSET
formulas, already correctly axis-matched, not part of this bug.
Verified: brace balance unchanged (2108/2108), grep confirms no other
size formula missed, live browser check showed zero new console
errors and a real non-zero rendered button width ("500px" via
getComputedStyle - a genuine positive signal, unlike several earlier
checks this session that could only fall back to CSS.supports()-only
verification). **Not committed/pushed yet** - awaiting explicit
instruction.

Before that (2026-09-20): ported Lock + Undock/Dock + the 3-icon
title-bar layout from TEMPLATE_DEV_PANEL.html into Clicko's own dev
panel - Undock had only ever been built in the template (an earlier
explicit scope choice), and a direct report ("i still dont see the
docking icon") surfaced that gap. Every group's title bar now shows,
right-to-left from the outer edge: Lock (already existed in Clicko,
unmoved), Undock (new, right:30px), the "Show in Mobile/Landscape"
checkbox (already existed, shifted from right:30px to right:52px to
make room). Clicking Undock moves a group's entire content into its
own floating, draggable, resizable panel (reusing a newly-generalized
`setupPanelResizeHandle()`); clicking Dock restores it to its exact
original tab/position via the same real-DOM-node-preservation technique
Undo/Delete already use. Session-only by design (never persisted) -
`buildSettingsSnapshot()` (the one function already shared by Save/
Copy/Undo-snapshot/Named Setting States in this codebase) now docks
everything back first, so nothing undocked is ever silently missing
from a save. Live-verified end to end on the real "UI TEXT" group (a
renamed custom group, internal sid "New Group (6)"). **Not committed/
pushed yet** - awaiting explicit instruction.

Before that (2026-09-20; the OTHER concurrent session's own note here
originally read "a different concurrent session" - corrected now that
the same session that made this change is the one continuing this
doc): Scale With
Browser text now scales with BOTH viewport width and height, not just
width - every occurrence of this formula shape (13 in the main
text-element CSS, plus 2 more in Round Breakdown's own separately-built
version) had its viewport-relative term changed from `1vw` (via an
inert legacy `--cq-vw` indirection) to `1vmin`, the standard CSS unit
for "whichever dimension is currently smaller" - so shrinking the
browser's height alone, not just its width, now correctly shrinks
Scale-With-Browser text too. Could not verify the actual rendered pixel
response to a real height-only resize in that session's own browser
tool (a known 0x0-viewport-while-backgrounded environment limitation) -
verified via CSS syntax validity and the formula's own math instead.
**Not committed/pushed yet** - awaiting explicit instruction (this is a
separate, still-uncommitted change sitting in the shared working tree,
not something this entry set's own session touched or verified).

Before that (2026-09-20): fixed Round Breakdown's Auto Scroll visibly
pausing every time the Try Again "?" flashes - `tick()` was reading
`track.scrollHeight` (a layout-forcing property) unconditionally on
EVERY frame, and the "?" flash's own periodic visibility toggle lands
on a heavily text-shadow-extruded element, so any tick() call landing
after a pending flash toggle forced an expensive synchronous style/
layout recalc mid-frame - stalling that frame, which read as a visible
pause even though the scroll's own state math was never actually wrong.
Fixed by caching the one-copy height once, at the moment the track is
duplicated, instead of re-measuring it every tick. Could not get a
trustworthy before/after frame-timing number from this session's own
browser-testing tool (confirmed it throttles/batches `requestAnimationFrame`
unpredictably while backgrounded) - verified correctness instead (still
duplicates exactly once, cached height matches a fresh read, transform
still progresses smoothly). Isolated into its own commit via a targeted
patch + stash, since the concurrent session above had its own
in-progress, not-yet-pushed Scale-With-Browser edit sitting in the same
file at the time - that edit was restored via stash pop, completely
untouched. Committed and pushed.

Before that (2026-09-19): fixed `findGroupContent()`'s direct-child-
only group lookup, which silently broke the "Show in Mobile/Landscape"
checkbox for any group that had been drag-nested under another group
(e.g. Round Breakdown under "UI TEXT") - direct report: checking
Auto Scroll On/Off's own Mobile checkbox did nothing. The lookup now
uses a descendant selector instead of a direct-child one, finding a
group wherever it currently lives - a strict superset of the old
matches, so nothing that worked before regressed. This is the same
root cause flagged (but not yet fixed) for the "group not found"
console-warning question earlier this session - fixing the one shared
lookup function resolved it for every affected group at once (Round
Text, High Score, Target Count Display, Speed/Ms-per-Click Display,
Start/Try Again Button all confirmed cleared, verified via
`syncDynamicDeviceRows()` + instrumented `console.warn`). One
remaining, unrelated case flagged in Open Questions below (a genuine
cross-tab group-NAME mismatch, not a nesting-depth issue - out of
scope for this fix). Committed and pushed.

Before that (2026-09-19): added a "Px" checkbox for Round Breakdown's
X/Y Offset, matching every other position-offset slider in this file -
migrated its 6 X/Y Offset slider entries (desktop/mobile/landscape) out
of the plain slider system and into the shared COMPOUND_OFFSET_CONTROLS/
buildCompoundOffsetRow() system every other element's own Px toggle
already uses. Since Round Breakdown doesn't run through the shared
applyTextAlignAnchors() (it has its own applyRoundBreakdownPosition(),
for its Align/Valign+Edge-Lock feature), the new per-device
`--round-breakdown-x/y-offset-unit-is-px` flags had to be wired in by
hand at 2 extra sites beyond the checkbox's own generic toggle handler:
applyRoundBreakdownPosition() itself, and endBreakdownDrag()'s end-of-
drag persistence + Edge Lock gap-conversion math (which would otherwise
have silently reverted a Px-mode value back to a vw/vh percentage on
the very next drag). **Not committed/pushed yet** - awaiting explicit
instruction.

Before that (2026-09-19): fixed Auto Scroll showing a single round's
data twice (direct report right after the marquee rework below shipped).
The rework's own duplicate-content-for-seamless-wrap technique was
applying UNCONDITIONALLY, so a single round's content - normally
shorter than the panel - rendered twice in the same view with nothing
to scroll it away. renderRoundBreakdown() now renders exactly one copy;
the tick() loop itself duplicates it lazily, only once it confirms the
single copy is actually taller than the visible panel.

Before that (2026-09-19): Round Breakdown's Auto Scroll is now a true
seamless marquee loop instead of scroll-then-snap-back-to-top - the
round rows render twice back-to-back in a new `.round-breakdown-scroll-
track` (only while Auto Scroll is on) and the animation now drives that
wrapper's own `transform: translateY()` instead of `table.scrollTop`
(the scrollTop approach was also the source of a reported jitter, since
it forces a layout/paint each frame) - the wrap-back-to-0 is invisible
since copy 2 at the end looks pixel-identical to copy 1 at the start.
Also fixed the panel's own Width/Height silently freezing at a fixed px
size the first time it was ever manually resized - the resize-handle's
live-drag feedback set an inline `style.width/height` that nothing ever
cleared afterward, permanently shadowing the CSS `vw`/`vh` rule (the
same pitfall `left`/`top` had already avoided, just not yet applied
here) - now cleared once the drag settles, so the panel's SIZE (not
just its position) correctly keeps scaling with the viewport on every
resize. Committed and pushed (0273a92..f7a5729).

Before that (2026-09-19): added a "Clear Highscore" button to the
dev panel's Debug group - resets both the in-memory value and its
`localStorage` persistence, then refreshes the on-screen number.
Reused Mouse Log's own `resolveDebugGroupSid()` + `findGroupContent()`
lookup and dual sync/async call-site pattern (Clicko's "DEBUG" group is
a user-renamed custom group, not a literal static one, so it has to be
found by current display name). Committed and pushed.

Before that (2026-09-19): dev-panel groups and settings can now be
reordered fully interleaved via drag (a group can land above/below/
between settings, not forced to sort separately from them) - fixed
across 3 systems: `setupDragReorder()`'s sibling-position comparison
(was same-type-only), `captureSection()`/`applySectionOrder()`'s
persistence shape (was 2 separate rowKeys/subgroups arrays with no
combined order between them - now one ordered `items` list, with a
fallback for an old-format saved settings file), and
`syncTabOrderToDesktop()`'s Desktop->Mobile/Landscape order-mirroring
translator (2 leftover-append sites were also writing to the wrong,
now-unread field). Built and verified in `.claude/TEMPLATE_DEV_PANEL.html`
first, then ported here. Committed and pushed (this doc's own earlier
"not committed/pushed" note was stale - confirmed on origin as of the
entry above).

Before that (2026-09-19): fixed the Round Breakdown panel showing on
startup instead of only on a loss (`renderRoundBreakdown()`'s own
un-hide call fires from `refreshAllTextOverrides()`, which runs on
every page load/resize, not just a real loss - now also gated on an
actual loss existing in `roundHistory`); converted X/Y Offset/Width/
Height from raw px to vw/vh-native sliders, matching every other
position/size dev-panel offset in this codebase (this also simplified
the recently-added Align/Valign edge-lock math - "gap from the right/
bottom edge" is just `100 - size - offset` in vw/vh, no
window.innerWidth/innerHeight lookup needed); added a Panel Opacity
slider that fades ONLY the background fill (moved onto a new `::before`
layer) while the border/outline/text/resize-handle stay fully opaque;
removed the title bar's remaining reserved space so the first data row
is genuinely the first thing in the panel (the drag handle is now a
zero-height, invisible absolutely-positioned strip); and preserved
multiple spaces in the panel's editable text (`white-space: pre-wrap`).
Confirmed, not fixed (pre-existing, outside this task's scope): the
Width/X-Offset slider's own displayed value can lag one interaction
behind a real resize-drag, since `syncSlidersFromState()` reads state
synchronously on pointerup while the ResizeObserver's own write is
async - this exact ordering already existed before this task. Committed
and pushed.

Before that (2026-09-19): a 15-item pass on the Round Breakdown panel
(built by a concurrent session, see below) - merged the Outline On/Off
checkbox with the panel's own previously-permanent border (toggling it
off now genuinely removes the line); removed the horizontal line under
the title and the "(won)"/"(lost)" round-name suffix; removed the "Time
To Hit Target" stat; added per-device Letter/Line Spacing for Round
Title/Data; added lost-round-only Title/Data color pickers; added
Horizontal/Vertical Alignment + Edge Lock for the panel's own position
(a new small mechanism, not the shared text-anchor system - see
applyRoundBreakdownPosition()'s own comment); added one Scale With
Browser checkbox for the whole panel (size + both font sizes, now just
font sizes - see above); added a Row Divider Lines On/Off checkbox;
registered the panel's 5 stat labels as a Text Edit Mode target (it had
none before); and built a full Auto Scroll subsystem (On/Off + loop,
Speed, Pause Before, Pause At End), which also disables manual
scrolling while active. Also added a "Saved" flash indicator to the dev
panel's HEADER Sync button specifically (the original bottom SYNC
button already had one, but it's not visible from the header without
scrolling back down). A real bug was found and fixed live: several of
the new "shared" controls (Align/Valign/Edge-Lock/Autoscroll) were
initially read through the same per-device lookup this group's
genuinely per-device sliders use, which silently no-op'd on Mobile/
Landscape - fixed to read desktop cssVars unconditionally instead,
matching this group's own established convention for shared toggles.
Committed and pushed (confirmed on origin as of the entry above - this
doc's own earlier "not committed/pushed" note was stale). The
currently-live saved settings predate several of the new/changed
defaults (outline-enabled, title/data colors) and will show their old
values until someone re-saves.

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
The panel's own hardcoded title text was also removed (superseded by
the 2026-09-19 entries above, which removed the title element's
reserved space entirely). Committed and pushed.

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

Immediate: commit and push the Auto Scroll seamless-marquee rework and
the Width/Height scaling fix (2026-09-19, see above) - currently
verified locally but not yet pushed, awaiting explicit instruction per
CLAUDE.md §9.

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

- **Known limitation, narrow edge case**: the Round Breakdown panel's
  Width and X Offset dev-panel sliders can show a one-interaction-stale
  value immediately after a real resize-handle drag - `endBreakdownResize()`
  calls `syncSlidersFromState()` synchronously on pointerup, but the
  ResizeObserver that actually writes the new width/height into cssVars
  fires asynchronously, so the sync can read the pre-resize value. The
  underlying persisted value itself is always correct (confirmed - a
  second sync, e.g. from any other settings-apply, catches it up); only
  the slider's own displayed number can lag by one interaction. This
  exact call ordering pre-dates the 2026-09-19 vw/vh conversion - not a
  new regression, not pursued (outside that task's own scope).
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
- **Fixed (2026-09-19)**: a dynamicDevice-opted control's "Show in Mobile/
  Landscape" checkbox used to only find its own group if that group was
  still a TOP-LEVEL section on that tab (`findGroupContent()`'s old
  direct-child lookup) - drag-nesting a group under another group broke
  it silently. See the entry above; `findGroupContent()` now searches
  the whole tab regardless of nesting depth.
- **Known limitation, narrow edge case**: one specific control
  (`sliderExtrusionFontTrimAdjust`, in the "8-Bit Text Style" group)
  still can't find its Mobile/Landscape group - NOT a nesting-depth
  issue (the fix above doesn't apply here). Desktop's own copy of this
  group is literally named "8-Bit Text Style (Start/Try Again/Round/
  Win-Lose)", but Mobile/Landscape's own static copy is named "8-Bit
  Text Style (Start/Try Again/Win-Lose)" (missing "Round") - a genuine
  cross-tab data-sid mismatch. `ensureDynamicDeviceRow()` always
  searches using the control's own DESKTOP-recorded group name, so it
  can never match Mobile/Landscape's differently-named copy. Not
  pursued - fixing it means deciding how to reconcile 2 different
  literal group names across tabs (rename one to match, or teach the
  lookup about a name-translation table), neither of which was asked
  for.
