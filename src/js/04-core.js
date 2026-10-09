// Re-measures whenever the Number's own rendered BOX changes size for
// any reason - text content, font-size (including viewport-driven vw
// scaling on resize), letter-spacing - without needing to hook every
// individual cause by hand. Does NOT catch the Number merely MOVING
// without resizing (its own X/Y Offset sliders) - those are wired
// directly, see their own registration below.
new ResizeObserver(updateTargetAnchoredPositions).observe(targetCountNumber);
const speedDisplay = document.getElementById('speedDisplay');
const msPerClickDisplay = document.getElementById('msPerClickDisplay');
// Number/suffix children - see their own HTML comment. Cached here
// since every render call site below sets these individually now,
// instead of one combined speedDisplay.textContent/msPerClickDisplay.textContent.
const speedDisplayNumber = document.getElementById('speedDisplayNumber');
const speedDisplaySuffix = document.getElementById('speedDisplaySuffix');
const msPerClickDisplayNumber = document.getElementById('msPerClickDisplayNumber');
const msPerClickDisplaySuffix = document.getElementById('msPerClickDisplaySuffix');
const roundBreakdownPanel = document.getElementById('roundBreakdownPanel');
const roundBreakdownTable = document.getElementById('roundBreakdownTable');
const devPanel = document.getElementById('devPanel');
const clickCounter = document.getElementById('clickCounter');
const highScoreText = document.getElementById('highScoreText');
const highScoreLabel = document.getElementById('highScoreLabel');
const highScoreNumber = document.getElementById('highScoreNumber');
// High Score - per direct request, persisted via localStorage
// specifically ("okay yeah i want that localStorage type"), NOT
// the git-tracked dev-panel-settings.json sync (that's for dev
// panel tuning, commits on every save - completely wrong for a
// value that changes every time someone plays). "Achieved" round
// is gameState.currentRound at the moment of loss (round they
// reached, not necessarily completed) - see endGame()'s lose
// branch, where this is checked before that value resets to 0.
const HIGH_SCORE_KEY = 'clicko-high-score';
let highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY), 10) || 0;
function updateHighScoreDisplay() {
    highScoreNumber.textContent = highScore;
}
// Clear Highscore (Debug group dev-panel button) - per direct
// request. Resets both the in-memory value and its localStorage
// persistence, then refreshes the on-screen number immediately -
// same 3-step shape as checkHighScore()'s own update just below,
// minus the blink (a manual dev-tool reset isn't "achieving" a new
// score, so no celebratory flash).
function clearHighScore() {
    highScore = 0;
    localStorage.removeItem(HIGH_SCORE_KEY);
    updateHighScoreDisplay();
}
function checkHighScore(round) {
    if (round > highScore) {
        highScore = round;
        localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
        // Flashes to the new value instead of an instant swap -
        // see runHighScoreBlinkSequence()'s own comment. Only
        // reached when the score actually changed (the `if` above),
        // so "no flash when unchanged" is already satisfied by
        // this function simply not being entered.
        runHighScoreBlinkSequence(highScore);
    }
}
updateHighScoreDisplay();
const buttonAssembly = document.getElementById('buttonAssembly');
const clickBurstContainer = document.getElementById('clickBurstContainer');
const clickBurstShadowContainerRight = document.getElementById('clickBurstShadowContainerRight');
const clickBurstShadowContainerLeft = document.getElementById('clickBurstShadowContainerLeft');

// Click burst - comic-style "impact line" shapes flung out from the
// button/base seam on every accepted tap. See the .click-burst-*
// CSS (above) for why this is plain img+CSS-motion-path, not a
// canvas/particle engine. 4 pre-extracted frame sets, 10 frames each
// (see data/BUTTON/CLICK/frames/) - only the currently-selected set's
// frames are ever spawned. Frame artwork is drawn pointing straight
// up, oriented for the LEFT side of the button; spawns on the right
// half get mirrored (see spawnClickBurst()).
const CLICK_FRAME_SETS = ['CLICK1', 'CLICK2', 'CLICK3', 'CLICK4'];
const CLICK_FRAME_URLS = {};
for (const set of CLICK_FRAME_SETS) {
    CLICK_FRAME_URLS[set] = Array.from({ length: 10 }, (_, i) =>
        `data/BUTTON/CLICK/frames/${set}/frame_${String(i + 1).padStart(2, '0')}.png`);
}

// Rapid tapping shouldn't be able to pile up an unbounded number of
// animating/pending-cleanup DOM nodes - cap concurrent particles and
// simply skip spawning a new burst once at the ceiling (the existing
// ones finish and self-remove within a few hundred ms regardless, so
// this only ever skips during a genuinely fast streak, never causes a
// permanent backlog). Each particle spawns with a paired shadow (2
// DOM nodes), and every click is a fixed 4 real + 4 shadow per side
// (16 nodes total) - raised from the original 24 to keep a
// comparable real-particle ceiling.
const CLICK_BURST_MAX_CONCURRENT = 64;

// Spawn origins now come from an artist-authored reference curve
// instead of a procedural angle zone - data/BUTTON/CLICK GUIDE.svg,
// one open path per side, drawn in the SAME viewBox as the button/
// base artwork (0 0 589.79 605.11), so its coordinates map directly
// onto the rendered button's own bounding box. Per explicit request
// ("divide the curve into 4, and each piece will dictate where a
// click can generate from... every click, both side generates 4"):
// each curve is divided into 4 equal-ARC-LENGTH pieces (via the
// browser's own SVGPathElement.getTotalLength()/getPointAtLength(),
// not a hand-rolled bezier-length approximation - see the shadow-
// transform fix earlier this session for why hand-derived geometry
// math here is worth avoiding), and every click spawns exactly one
// particle at each of the 4 quarter-midpoints, replacing the
// previous random 2-4-count zone system entirely.
const CLICK_ROUTE_VIEWBOX_WIDTH = 589.79;
const CLICK_ROUTE_VIEWBOX_HEIGHT = 605.11;
// Left path in the guide SVG has a second, tiny disconnected
// subpath (a stray decorative mark, not part of the route) - only
// the first subpath (up to but excluding the second "M") is used.
const CLICK_ROUTE_LEFT_D = 'M206.69,393.13c-11.47-3.05-25.67-8.8-38.09-15.49l-10.32-5.55c-13.86-7.45-26.05-17.21-36.77-28.33-7.89-8.19-15.23-16.77-20.34-27.49-4.26-8.94-7.86-18.15-8.74-28.06l-.47-.22-.08-27.11c-.03-4.42-.45-8.92.3-13.28-.85-4.24-.16-8.6-.36-13.25-.75-17.19,2.01-33.76,8.23-49.8,8.63-22.27,22.75-41.65,40.11-57.67';
const CLICK_ROUTE_RIGHT_D = 'M466.47,128.9c7.67,7.27,14.66,15.25,20.87,23.9,16.36,22.79,26.45,50.52,25.47,78.4l-.11,3.18-.13,16.93v30.7s-.01.04-.01.04v1.8c0,8.7-2.66,16.73-5.85,24.64-4.33,10.71-10.78,19.9-18.1,28.31-14.74,16.93-25.07,23.95-44,35.08-16.56,9.74-34.42,17.31-53.19,22.83';

// Rendered off-canvas (position:absolute, 0x0, overflow:hidden) so
// getTotalLength()/getPointAtLength() work (they require the path
// to be laid out), without it being visible or affecting layout.
const clickRouteSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
clickRouteSvg.style.position = 'absolute';
clickRouteSvg.style.width = '0';
clickRouteSvg.style.height = '0';
clickRouteSvg.style.overflow = 'hidden';
const clickRouteLeftPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
clickRouteLeftPath.setAttribute('d', CLICK_ROUTE_LEFT_D);
const clickRouteRightPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
clickRouteRightPath.setAttribute('d', CLICK_ROUTE_RIGHT_D);
clickRouteSvg.appendChild(clickRouteLeftPath);
clickRouteSvg.appendChild(clickRouteRightPath);
document.body.appendChild(clickRouteSvg);

// Converts this codebase's own trig angle (0=rightward/3-o'clock,
// increasing clockwise since screen Y is down) back into the "user"
// angle convention (0=up, increasing clockwise) the 4 Floor/Ceiling
// inputs use - the exact inverse of clickBurstUserAngleToTrigRad()
// below, kept next to it.
function clickBurstTrigRadToUserDeg(rad) {
    let deg = rad * 180 / Math.PI + 90;
    return ((deg % 360) + 360) % 360;
}

// Whether a "user" angle (0=up, clockwise) falls within [floorDeg,
// ceilingDeg] - wrap-aware, so a range that crosses 360/0 (e.g.
// floor=350, ceiling=10) still works: normalizes both endpoints
// into [0,360) first, then tests the direct (non-wrapping) case
// floor<=ceiling normally, or the wrapping case (>=floor OR
// <=ceiling) when floor>ceiling after normalization.
function isUserDegInAngleRange(deg, floorDeg, ceilingDeg) {
    const d = ((deg % 360) + 360) % 360;
    const f = ((floorDeg % 360) + 360) % 360;
    const c = ((ceilingDeg % 360) + 360) % 360;
    return f <= c ? (d >= f && d <= c) : (d >= f || d <= c);
}

// Small fixed per-click angle jitter (not tied to any "zone slot"
// anymore - see below) so repeated clicks don't fly the identical
// path every time, per explicit request that flight paths
// "randomize somewhat per click."
const CLICK_BURST_ANGLE_JITTER_RAD = 8 * Math.PI / 180;

// Samples `count` origins from whichever STRETCH of the guide curve
// falls within [floorDeg, ceilingDeg], measured as the angle from
// the button's own center (viewBox center, since the guide SVG
// shares the button/base artwork's exact viewBox - angles are
// preserved under the uniform positive scale that maps viewBox
// space onto the button's rendered screen space, so filtering here
// is equivalent to filtering in screen space) to each point along
// the curve - per explicit clarification that the Floor/Ceiling
// inputs govern which PART of the curve qualifies as a spawn
// origin, not flight direction. A point outside that curve falls
// outside the range and is never used; points nowhere along the
// curve fall in range means this side generates 0 particles that
// click (not an error - a genuinely empty result).
//
// Each returned piece also carries {dirX, dirY} - the point's OWN
// outward radial direction from the button's center - used
// directly as flight direction in spawnClickBurstSide() instead of
// a separately-assigned zone-slot angle (the earlier design, which
// conflated "which part of the curve is eligible" with "which way
// does it fly" - this replaces both with the point's own natural
// geometry). Flight direction deliberately does NOT use the
// curve's own local TANGENT: this particular authored curve curls
// back on itself near its tip (confirmed by hand-tracing its path
// segments), so a tangent-following particle sampled from that
// stretch flies the wrong way (a real report: a stray particle
// launching toward ~1-2 o'clock instead of following the rest of
// its side) - the point's radial-from-center direction doesn't
// have this problem since it's derived from position, not the
// curve's local shape.
//
// Qualifying points are found by walking the curve at a fixed fine
// resolution (not a hand-derived bezier-angle formula) and testing
// each sample's angle - simple and robust for these short (~260-
// 266 unit) curves, and avoids assuming the curve's angle-from-
// center is monotonic along its length.
const CLICK_ROUTE_ANGLE_SCAN_RESOLUTION = 200;
// Real, measured per-tap lag (root cause of a direct "the animation on
// desktop is still very laggy" report): sampleClickRoutePiecesInAngleRange()
// used to call the SVG path's own getPointAtLength() 201 times, on
// BOTH sides, on EVERY single tap - 402 expensive DOM/geometry calls
// per click. Measured directly (performance.now() around a real
// press): spawnClickBurst() alone took 35-65ms per call, almost
// entirely this scan - more than 2 frame budgets of synchronous
// main-thread work on every tap, independent of and unrelated to any
// CSS transition timing (already fixed correctly in earlier rounds).
// clickRouteLeftPath/clickRouteRightPath's `d` attribute is set
// exactly once at page load and never reassigned (confirmed via
// grep - only the 2 initial setAttribute('d', ...) calls exist in
// the whole file), so the path's raw GEOMETRY never changes - only
// floorDeg/ceilingDeg (dev-panel sliders) can vary between calls,
// and those only affect the FILTER step below, never the expensive
// per-point geometry sampling itself. Cached per path element
// (computed once, lazily, on first use) so every tap after the
// first reuses the same 201 pre-sampled points and does only cheap
// array filtering - zero behavior change (the raw scan data is
// identical whether computed fresh or cached), purely eliminating
// ~400 redundant getPointAtLength() calls per tap after the first.
const clickRouteScanCache = new Map();
function getClickRouteScan(pathEl) {
    let scan = clickRouteScanCache.get(pathEl);
    if (scan) return scan;
    const total = pathEl.getTotalLength();
    const centerX = CLICK_ROUTE_VIEWBOX_WIDTH / 2, centerY = CLICK_ROUTE_VIEWBOX_HEIGHT / 2;
    scan = [];
    for (let i = 0; i <= CLICK_ROUTE_ANGLE_SCAN_RESOLUTION; i++) {
        const p = pathEl.getPointAtLength(total * i / CLICK_ROUTE_ANGLE_SCAN_RESOLUTION);
        const dx = p.x - centerX, dy = p.y - centerY;
        const deg = clickBurstTrigRadToUserDeg(Math.atan2(dy, dx));
        const len = Math.hypot(dx, dy) || 1;
        scan.push({ x: p.x, y: p.y, dirX: dx / len, dirY: dy / len, deg });
    }
    clickRouteScanCache.set(pathEl, scan);
    return scan;
}
function sampleClickRoutePiecesInAngleRange(pathEl, count, floorDeg, ceilingDeg) {
    const qualifying = getClickRouteScan(pathEl).filter(p => isUserDegInAngleRange(p.deg, floorDeg, ceilingDeg));
    if (qualifying.length === 0) return [];
    const points = [];
    for (let i = 0; i < count; i++) {
        const idx = Math.min(qualifying.length - 1, Math.floor((i + 0.5) / count * qualifying.length));
        points.push(qualifying[idx]);
    }
    return points;
}

// Resolves a 1-indexed, sign-aware CUTOFF (the "Hide Shadow - Frame
// Index A/B" dev-panel inputs) into the full set of piece indices
// it hides, against this burst's own pieces sorted top-to-bottom by
// viewBox Y - a positive N hides the top N (1 through N inclusive),
// a negative N hides the bottom |N| (-1 through N inclusive). E.g.
// 2 hides the top 2 (positions 1 and 2); -1 hides just the bottom 1.
// 0/empty hides nothing. Silently clamps to this burst's own actual
// piece count (e.g. a cutoff of 4 on a 3-piece burst just hides all
// 3) rather than erroring, since count is randomized per click.
// Hide Shadow spec parser - free-text list of positions/ranges, e.g.
// "0=>1, 3, -4=>-7", per explicit request replacing the old single-
// cutoff number input. Positions are 0-based from the TOP of this
// side's own top-to-bottom order (0 = topmost); a negative position
// counts from the BOTTOM instead (-1 = bottommost, -2 = second from
// bottom, etc.) - same addressing either endpoint of a "=>" range
// can use, in either order (min/max resolved after converting both
// to absolute indices, so "-4=>-7" and "-7=>-4" behave identically).
// Out-of-range positions are silently dropped, same "clamps rather
// than errors" spirit as the old cutoff input.
function resolveHideShadowPosition(position, count) {
    const idx = position >= 0 ? position : count + position;
    return (idx >= 0 && idx < count) ? idx : null;
}
function parseHideShadowSpec(spec, pieces) {
    const indices = new Set();
    const count = pieces.length;
    if (!spec || !count) return indices;
    // Position 0 = topmost piece, matching the old cutoff input's
    // own top-to-bottom addressing - resolve positions against this
    // sorted order, then translate back to real piece indices.
    const sorted = pieces.map((p, idx) => idx).sort((a, b) => pieces[a].y - pieces[b].y);
    spec.split(',').forEach(rawTerm => {
        const term = rawTerm.trim();
        if (!term) return;
        const rangeMatch = term.match(/^(-?\d+)\s*=>\s*(-?\d+)$/);
        if (rangeMatch) {
            const a = resolveHideShadowPosition(parseInt(rangeMatch[1], 10), count);
            const b = resolveHideShadowPosition(parseInt(rangeMatch[2], 10), count);
            if (a === null || b === null) return;
            for (let pos = Math.min(a, b); pos <= Math.max(a, b); pos++) indices.add(sorted[pos]);
        } else {
            const single = resolveHideShadowPosition(parseInt(term, 10), count);
            if (single !== null) indices.add(sorted[single]);
        }
    });
    return indices;
}

function spawnClickBurstSide(routePathEl, mirror, containerRect, buttonRect) {
    // Click frame set stays single/shared (see updateClickFrameSet()),
    // but distance/height/shadow-look were ALWAYS reading the desktop
    // cssVars object directly regardless of actual breakpoint - a
    // real, separate bug found while adding the shadow offset below
    // (which would have inherited the same mistake). Fixed by reading
    // through whichever set is actually active, matching every other
    // mobile-split cssVar in this file.
    const activeVars = isMobileActive() ? getActiveMobileVars() : cssVars;
    const frameSet = cssVars['--click-frame-set'] || 'CLICK1';
    const urls = CLICK_FRAME_URLS[frameSet];
    if (!urls) return;

    // resolveSpatialPx() is a no-op on desktop (real px already) -
    // on mobile it converts the stored vw number to actual current
    // -viewport px, per explicit request that these scale with
    // screen width on phones. buttonScale (Max/Min Button Scale)
    // is then layered on top of THAT, per direct follow-up request
    // ("make it follow the scale of the button") - so distance/
    // height/curve-offset track however much the button is
    // CURRENTLY visually scaled, on every device uniformly, same
    // relationship as .click-burst-particle's own CSS width rule.
    // curveAmountMultiplier is a dimensionless ratio applied to an
    // already-scaled slotDistance further down, so it doesn't need
    // its own multiplication here - it inherits the scaling
    // transitively.
    const buttonScale = computeButtonUserScale();
    const distance = resolveSpatialPx(activeVars['--click-burst-distance-px']) * buttonScale;
    const height = resolveSpatialPx(activeVars['--click-burst-height-px']) * buttonScale;
    const curveOffset = (resolveSpatialPx(activeVars['--click-burst-curve-offset-px']) || 0) * buttonScale;
    const curveAmountMultiplier = activeVars['--click-burst-curve-amount'];
    // Which per-side shadow container this burst's shadows belong
    // in - see spawnClickBurst(), which sets each one's transform.
    const shadowContainer = mirror ? clickBurstShadowContainerRight : clickBurstShadowContainerLeft;

    // Count rolled fresh per side per click, between the Floor/
    // Ceiling sliders (inclusive) - per explicit request ("3-5...
    // may be generated per side"), replacing the earlier fixed
    // count of 4. Floor is clamped so a misconfigured Ceiling below
    // it can't invert the random range.
    const countMin = Math.max(1, Math.round(activeVars['--click-burst-count-min']));
    const countMax = Math.max(countMin, Math.round(activeVars['--click-burst-count-max']));
    const count = countMin + Math.floor(Math.random() * (countMax - countMin + 1));

    // Floor/Ceiling angle inputs now filter WHICH PART of the guide
    // curve qualifies as a spawn origin (measured from the
    // button's own center), per explicit clarification - not
    // flight direction, which now comes from each qualifying
    // point's own radial position (see sampleClickRoutePiecesInAngleRange()).
    // Mobile-split (own "inputMobile..." ids) per explicit request -
    // these aren't wired through the generic resolveDevControlId/
    // CSS_VAR_SLIDER_MAP machinery (they're plain typed inputs, not
    // range sliders), so the isMobile branch is just picked here
    // directly rather than adding a new control type to that map.
    const mobilePrefix = isLandscapeActive() ? 'inputLandscape' : isMobileActive() ? 'inputMobile' : 'input';
    const floorId = `${mobilePrefix}ClickBurst${mirror ? 'Right' : 'Left'}FloorDeg`;
    const ceilingId = `${mobilePrefix}ClickBurst${mirror ? 'Right' : 'Left'}CeilingDeg`;
    const floorDeg = parseFloat(document.getElementById(floorId).value);
    const ceilingDeg = parseFloat(document.getElementById(ceilingId).value);
    const pieces = sampleClickRoutePiecesInAngleRange(routePathEl, count, floorDeg, ceilingDeg);

    // Hide Shadow - Frame Index A/B: A applies to the LEFT side
    // only, B to the RIGHT only (per explicit request - previously
    // both applied to both sides identically). Each is a free-text
    // list of positions/ranges like "0=>1, 3, -4=>-7" - see
    // parseHideShadowSpec(). Mobile-split, same reasoning as the
    // angle inputs above.
    const hideSpec = document.getElementById(`${mobilePrefix}ClickBurstHideShadowIndex${mirror ? 'B' : 'A'}`)?.value || '';
    const noShadowIndices = parseHideShadowSpec(hideSpec, pieces);

    for (let i = 0; i < pieces.length; i++) {
        // Checked per-particle, not once before the loop - a burst
        // starting 1-2 below the cap could otherwise still add its
        // full batch and overshoot it (see the dev-panel resize
        // handles' own identical fix earlier this session).
        // Shadows now live in their own containers (2, one per side
        // - see .click-burst-shadow-container) - sum all 3 so the
        // cap still bounds total DOM nodes, not just real particles.
        if (clickBurstContainer.children.length + clickBurstShadowContainerRight.children.length + clickBurstShadowContainerLeft.children.length >= CLICK_BURST_MAX_CONCURRENT) return;

        const q = pieces[i];
        // Map the guide curve's viewBox-space point onto the
        // button's own rendered bounding box - the guide SVG shares
        // the exact same viewBox proportions as the button/base
        // artwork, so this is the same scale/position mapping the
        // artwork's own <svg viewBox> already performs.
        let originX = (buttonRect.left - containerRect.left) + (q.x / CLICK_ROUTE_VIEWBOX_WIDTH) * buttonRect.width;
        let originY = (buttonRect.top - containerRect.top) + (q.y / CLICK_ROUTE_VIEWBOX_HEIGHT) * buttonRect.height;

        // Curve Offset: pushes the origin further from the button's
        // own center, radially outward along the existing center->
        // origin direction - "the larger the offset, the further
        // from the button the clicks are generated," per explicit
        // request. Zero by default (origin stays exactly on the
        // curve).
        if (curveOffset) {
            const buttonCenterX = (buttonRect.left - containerRect.left) + buttonRect.width / 2;
            const buttonCenterY = (buttonRect.top - containerRect.top) + buttonRect.height / 2;
            const toOriginX = originX - buttonCenterX, toOriginY = originY - buttonCenterY;
            const toOriginLen = Math.hypot(toOriginX, toOriginY) || 1;
            originX += (toOriginX / toOriginLen) * curveOffset;
            originY += (toOriginY / toOriginLen) * curveOffset;
        }

        // Flight direction is this point's OWN radial direction
        // from the button's center (q.dirX/dirY, computed in
        // sampleClickRoutePiecesInAngleRange() - viewBox-space, but
        // valid directly in screen space too since that mapping is
        // a uniform positive scale and angles survive it), with a
        // small fixed per-click jitter so repeated clicks don't fly
        // the identical path every time - per explicit request
        // that flight paths "randomize somewhat per click."
        const slotFraction = pieces.length > 1 ? i / (pieces.length - 1) : 0.5; // 0..1 across this side's own pieces, for the distance-stagger below
        const baseAngle = Math.atan2(q.dirY, q.dirX);
        const angle = baseAngle + (Math.random() - 0.5) * CLICK_BURST_ANGLE_JITTER_RAD;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);

        // Continue outward along this particle's own zone angle,
        // then lift upward by `height` independent of that
        // direction - "how far out" and "how high" stay two
        // orthogonal, independently tunable controls. Distance
        // staggered per piece (not every particle traveling the
        // exact same radius) for extra separation margin on top of
        // the angular separation above, plus a modest +/-10%
        // per-click jitter (same "randomize somewhat" request).
        const slotDistance = distance * (0.85 + slotFraction * 0.3) * (0.9 + Math.random() * 0.2);
        const endX = dirX * slotDistance;
        const endY = dirY * slotDistance - height;

        // Quadratic bezier control point, perpendicular to the
        // origin->end chord for a natural swoosh. Constrained to only
        // ever point upward/sideways, never downward: of the two
        // perpendicular directions, the one with a positive
        // (downward, in screen coords) Y component is flipped, so
        // the curve can never sag below its own straight chord.
        // Magnitude capped much lower than before (was up to 0.6x
        // distance) - a wide swoosh could swing a particle out of
        // its own angular slot and into a neighbor's, defeating the
        // whole point of separating them by angle in the first
        // place; this keeps the curve inside its own corridor while
        // still reading as organic movement, not a straight line.
        let perpX = -endY, perpY = endX;
        if (perpY > 0) { perpX = -perpX; perpY = -perpY; }
        const perpLen = Math.hypot(perpX, perpY) || 1;
        // Curviness multiplier: 0 = perfectly straight flight paths,
        // 1 = the original swoosh amount, higher = more pronounced
        // curve - per explicit request for a "straighten or curve
        // more" slider.
        const curveAmount = (0.1 + Math.random() * 0.15) * slotDistance * curveAmountMultiplier;
        const ctrlX = endX / 2 + (perpX / perpLen) * curveAmount;
        const ctrlY = endY / 2 + (perpY / perpLen) * curveAmount;

        const frameUrl = urls[Math.floor(Math.random() * urls.length)];
        const offsetPath = `path('M0,0 Q${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}')`;
        // Mirroring flips the shape BEFORE skewX applies (transform
        // composes right-to-left, and scaleX(-1) sits rightmost/
        // innermost below) - skewing an already-flipped shape by the
        // same angle is NOT equivalent to mirroring a skewed shape,
        // it comes out skewed the opposite way in the shape's own
        // local frame. Confirmed via a user report (left-side
        // shadows looked mirrored relative to the right side) and
        // verified by matrix composition: flip-then-skew(th) equals
        // skew(-th)-then-flip. Negating the skew angle specifically
        // when mirrored cancels that out (see spawnClickBurst(),
        // which builds each container's OWN transform using this
        // same sign rule) - both sides read as the same "cast
        // shadow" direction rather than opposite ones.

        const img = document.createElement('img');
        img.src = frameUrl;
        img.className = 'click-burst-particle';
        img.alt = '';
        img.style.left = originX + 'px';
        img.style.top = originY + 'px';
        img.style.offsetPath = offsetPath;
        if (mirror) img.style.transform = 'scaleX(-1)';

        // Paired shadow: same frame, flattened to gray, in its own
        // lower-z-index, per-side container (behind the button/base
        // - see .click-burst-shadow-container). Uses the EXACT SAME
        // left/top/offsetPath as the real particle above, completely
        // UNWARPED - the container itself (see spawnClickBurst())
        // already carries the real skew/stretch/rotate/translate
        // transform, pivoted at the button's own center, so the
        // browser's own transform math does the warping, identical
        // to how .shadow-caster-layer warps the real button/base
        // shadow. No JS re-derivation of that math needed or
        // wanted - a from-scratch reimplementation of it turned out
        // NOT to be equivalent (a modest ~40px input offset was
        // coming out amplified to ~127px), per explicit request to
        // just reuse the same transform as-is instead.
        //
        // Skipped entirely for whichever piece(s) the Hide Shadow
        // Frame Index A/B inputs resolve to (see noShadowIndices
        // above) - the real particle above still spawns normally
        // either way.
        if (!noShadowIndices.has(i)) {
            const shadow = document.createElement('img');
            shadow.src = frameUrl;
            shadow.className = 'click-burst-particle click-burst-particle-shadow';
            shadow.alt = '';
            shadow.style.left = originX + 'px';
            shadow.style.top = originY + 'px';
            shadow.style.offsetPath = offsetPath;
            // Final scale applied HERE, per-frame, not on the
            // shared shadow container - see buildTransform()'s own
            // comment in spawnClickBurst(). Each <img>'s own
            // transform-origin defaults to its own 50%/50% (its
            // own centroid), independent of the container's
            // button-centered transform-origin, so this shrinks the
            // frame in place without shifting its flight-path
            // position at all. scaleX(-1) and scale() are both pure
            // diagonal scale matrices, so their order doesn't
            // matter mathematically - kept as one combined string
            // either way.
            const finalScale = activeVars['--click-burst-shadow-final-scale'];
            shadow.style.transform = mirror ? `scaleX(-1) scale(${finalScale})` : `scale(${finalScale})`;
            shadow.addEventListener('animationend', () => shadow.remove());
            shadowContainer.appendChild(shadow);
        }

        img.addEventListener('animationend', () => img.remove());
        clickBurstContainer.appendChild(img);
    }
}

function spawnClickBurst() {
    const containerRect = clickBurstContainer.getBoundingClientRect();
    const buttonRect = buttonAssembly.getBoundingClientRect();

    // Set each shadow container's transform to a byte-for-byte copy
    // of .shadow-caster-layer's own CSS transform (same functions,
    // same order: translate outermost/last, then rotate, then
    // scale, then skewX, then scaleY innermost/first - see that
    // rule's own comment for why this exact order matters),
    // pivoted at the button's own center via transform-origin. Two
    // containers because the two sides need mirrored skew (see the
    // HTML comment on these elements) - right keeps the skew as-is,
    // left negates it, the same sign logic already proven correct
    // for the sprite-level mirror fix earlier this session.
    const activeVars = isMobileActive() ? getActiveMobileVars() : cssVars;
    const buttonCenterX = (buttonRect.left + buttonRect.width / 2) - containerRect.left;
    const buttonCenterY = (buttonRect.top + buttonRect.height / 2) - containerRect.top;
    const originStr = `${buttonCenterX}px ${buttonCenterY}px`;
    // Shadow x/y offset is now a percentage of the BUTTON's own
    // rendered width (matching .shadow-caster-layer's own CSS
    // formula - see its comment), not a flat px number - computed
    // directly from the already-measured buttonRect.width here
    // rather than re-deriving it from --button-diameter-vw/
    // window.innerWidth, which also correctly handles the rare case
    // where --button-min-diameter-px's floor is clamping the
    // button's actual rendered size below what vw alone would give.
    const shadowOffsetX = activeVars['--shadow-x-offset'] / 100 * buttonRect.width;
    const shadowOffsetY = activeVars['--shadow-y-offset'] / 100 * buttonRect.width;
    // --click-burst-shadow-final-scale is deliberately NOT part of
    // this container-level transform, even though it's the "final"
    // step conceptually - this transform's own transform-origin is
    // the BUTTON's center (set below), shared by every frame
    // currently flying in this container. A scale() here would
    // shrink every frame toward that ONE shared point, dragging
    // each frame's position toward the button center as it shrinks
    // - not what "make the shadow frames look smaller" means. Per
    // explicit follow-up clarification ("i want it to be scale by
    // their own centroid, not some other origin"), each frame needs
    // its OWN scale, pivoted at ITS OWN center (an element's
    // transform-origin defaults to its own 50%/50%, independent of
    // any parent's) - applied per-frame in spawnClickBurstSide()
    // instead, on the shadow <img> itself.
    const buildTransform = (skewDeg) => `translate(${shadowOffsetX}px, ${shadowOffsetY}px) rotate(${activeVars['--shadow-rotate']}deg) scale(${activeVars['--shadow-scale']}) skewX(${skewDeg}deg) rotate(${activeVars['--shadow-elongation-angle']}deg) scaleY(${activeVars['--shadow-elongation-intensity']}) rotate(${-activeVars['--shadow-elongation-angle']}deg)`;
    clickBurstShadowContainerRight.style.transformOrigin = originStr;
    clickBurstShadowContainerRight.style.transform = buildTransform(activeVars['--shadow-skew']);
    clickBurstShadowContainerLeft.style.transformOrigin = originStr;
    clickBurstShadowContainerLeft.style.transform = buildTransform(-activeVars['--shadow-skew']);

    // Every click triggers exactly 4 frames on BOTH sides (8 total),
    // one per quarter of that side's own guide curve.
    spawnClickBurstSide(clickRouteRightPath, true, containerRect, buttonRect);
    spawnClickBurstSide(clickRouteLeftPath, false, containerRect, buttonRect);
}

const tapDiagnosticPanel = document.getElementById('tapDiagnosticPanel');
const tapDiagnostic = document.getElementById('tapDiagnostic');
const tapDiagnosticLog = [];
// How many of tapDiagnosticLog's entries are currently reflected in the
// DOM - lets logTapDiagnostic append just the ONE new line most of the
// time instead of re-joining and re-rendering the whole (deliberately
// uncapped, ever-growing) array, per an earlier fix. See
// rebuildTapDiagnosticDisplay() below for when a full rebuild is
// actually needed (only when the DOM has fallen behind the array).
let tapDiagnosticRenderedCount = 0;
function rebuildTapDiagnosticDisplay() {
    tapDiagnostic.textContent = tapDiagnosticLog.join('\n');
    tapDiagnostic.scrollTop = 1e9; // clamped to max by the browser - avoids an explicit scrollHeight read (a forced synchronous reflow) right after a text rewrite.
    tapDiagnosticRenderedCount = tapDiagnosticLog.length;
}
let totalClickCount = 0;
let lastAcceptedTapTime = 0;
let lastAcceptedPointerType = null;
let lastAcceptedX = null;
let lastAcceptedY = null;
// Filter for a duplicate pointerdown event from a single physical press
// (e.g. a worn mouse microswitch reporting one press as two signals).
//
// This was previously OFF (0ms) by default: an earlier 250ms threshold was
// tested and found to reject genuine rapid taps - a practiced player
// naturally holds the mouse still between presses, so a real tap can land
// within a couple pixels of the last one just as easily as a duplicate can,
// and at 250ms that ambiguity extends into normal human tap-to-tap timing.
// A filter that eats a real tap causes a false loss, worse than occasionally
// letting a genuine duplicate through - so 0 (off) became the default.
//
// Re-enabled at a much TIGHTER 50ms, confirmed necessary via a real user
// report: a tap-diagnostic log showed a genuine duplicate at gap=21ms,
// 1px apart (physically too fast to be an intentional second human press -
// this session's own rapid-tap testing has never gone below ~125ms even at
// deliberately fast pace). 50ms sits comfortably below any observed genuine
// human tap-to-tap gap while still catching that kind of hardware chatter -
// a different regime than the old 250ms, not just a smaller version of it.
// Still fully adjustable (including back to 0) via the dev-panel slider.
let TAP_DEBOUNCE_MS = 50;
const TAP_DEBOUNCE_POS_TOLERANCE_PX = 3;
// Some mobile browsers fire a SECOND, synthetic "compatibility" mouse
// pointerdown roughly 300ms after a real touch tap, for elements where the
// touch's default action wasn't fully suppressed. That gap is way outside
// TAP_DEBOUNCE_MS, so it needs its own check: a mouse-type tap arriving
// shortly after a touch-type one is almost certainly this synthetic event,
// not a real second press.
const TOUCH_COMPAT_WINDOW_MS = 600;

// Keeps the dev panel fully on-screen regardless of viewport size -
// its position (--dev-panel-left-px/-top-px) is a single shared
// value, not mobile-split (deliberately - it's a dev-tool setting,
// not part of the game's own visual output), so a position tuned
// comfortably on a wide desktop screen can end up entirely
// off-screen on a narrower one. Traced directly to this: "the Dev
// panel moving isn't working in mobile" / "it's very big... not
// fully within the browser" - a desktop-tuned left position (e.g.
// 975px) is simply beyond a ~375-428px mobile viewport's own width,
// pushing the whole panel off-screen to the right where it can't be
// seen OR grabbed to drag back. Called from applyActiveVars(),
// which already fires on resize/breakpoint crossing - uses the
// panel's own actual rendered size, so it respects the existing
// max-width/max-height clamp too.
// The resize edges/corners straddle the panel's own border at -6px
// (see .dev-panel-resize-edge/-corner CSS) - clamping position to
// just the panel's own rect (0..viewport-width) let that 6px
// overhang go off-screen at the true edge, making the handle there
// partially ungrabbable. Every position clamp below keeps this much
// margin so the full handle - not just the panel's own box - always
// stays in frame, per explicit request ("the resize corners will
// always be in frame").
const DEV_PANEL_HANDLE_OVERHANG_PX = 6;
// Extra clamp margin from the true LEFT/RIGHT viewport edge, mobile
// only - keeps the panel (and its drag/resize hit-zones) from
// sitting flush against the physical screen edge, where Android's
// own system edge-swipe-back/-forward gesture can capture a touch
// before it ever reaches the page - no CSS/JS on the page can
// override that OS-level gesture once a touch starts inside its
// capture zone. Per direct report: resizing the panel from its
// right edge on mobile triggered Chrome's swipe-back navigation.
// Not applied on desktop/top/bottom - no equivalent gesture there.
const DEV_PANEL_MOBILE_EDGE_GESTURE_MARGIN_PX = 20;
function devPanelEdgeMarginX() {
    return DEV_PANEL_HANDLE_OVERHANG_PX + (isMobileActive() ? DEV_PANEL_MOBILE_EDGE_GESTURE_MARGIN_PX : 0);
}

function clampDevPanelPosition() {
    const rect = devPanel.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return; // hidden (display:none) - nothing to clamp yet
    const o = DEV_PANEL_HANDLE_OVERHANG_PX;
    const ox = devPanelEdgeMarginX();
    const maxLeft = Math.max(ox, window.innerWidth - rect.width - ox);
    const maxTop = Math.max(o, window.innerHeight - rect.height - o);
    const clampedLeft = Math.min(Math.max(ox, cssVars['--dev-panel-left-px']), maxLeft);
    const clampedTop = Math.min(Math.max(o, cssVars['--dev-panel-top-px']), maxTop);
    if (clampedLeft !== cssVars['--dev-panel-left-px']) {
        cssVars['--dev-panel-left-px'] = clampedLeft;
        document.documentElement.style.setProperty('--dev-panel-left-px', clampedLeft);
    }
    if (clampedTop !== cssVars['--dev-panel-top-px']) {
        cssVars['--dev-panel-top-px'] = clampedTop;
        document.documentElement.style.setProperty('--dev-panel-top-px', clampedTop);
    }
}

// Initialize CSS variables
// Applies whichever var set (desktop or mobile) matches the current
// viewport width. Called after every slider/color/font edit and on
// MOBILE_MEDIA_QUERY's change event (live breakpoint crossing) - editing
// the inactive mode's control just updates its stored value silently,
// since this always re-derives from isMobileActive() rather than from
// which control was touched.
// Keys resolveSpatialPx() applies to - kept in one place so
// applyActiveVars()'s push-to-root loop and every other read site
// stay in sync about which 5 keys are vw-on-mobile.
// --shadow-x-offset/-y-offset removed from this set - they're no
// longer resolved through resolveSpatialPx() at all (which only
// ever scaled with raw viewport width, and was a no-op on desktop
// entirely). .shadow-caster-layer's own CSS now scales them
// directly via var(--button-diameter-vw), in pure CSS, for both
// devices uniformly - see that rule's own comment. Leaving them in
// this set would have DOUBLE-scaled the mobile value (once here,
// again in the CSS formula).
const SPATIAL_VW_ON_MOBILE_KEYS = new Set([
    '--click-burst-distance-px', '--click-burst-height-px', '--click-burst-curve-offset-px',
]);

// Max/Min Button Scale - see cssVars'/mobileCssVars' own comments on
// these 2 keys for the full mechanism. Desktop and Landscape share
// one formula (linear interpolation between 2 fixed reference
// widths, both ends clamped); Mobile's is different in kind (a
// single reference width - its own max - with proportional shrink
// and a floor, no second reference width). Returns a plain
// multiplier, pushed to --button-user-scale and applied as an extra
// scale() on .button-assembly (see that rule's own comment) so the
// button, its base, and its shadow-caster all scale together.
const DESKTOP_BUTTON_SCALE_MIN_WIDTH = 768; // narrowest a Desktop-mode browser can be (the Mobile breakpoint's own upper edge)
const DESKTOP_BUTTON_SCALE_MAX_WIDTH = 1280; // "full screen" reference - this project's own established desktop reference width (see the font-size-px conversion's comment)
const MOBILE_BUTTON_SCALE_MAX_WIDTH = 767; // Mobile's own widest width (the breakpoint's own lower edge) - Max Scale is reached here
function computeButtonUserScale() {
    if (getActiveDeviceProfile() === 'mobile') {
        const maxScale = mobileCssVars['--button-max-scale'];
        const minScale = mobileCssVars['--button-min-scale'];
        const t = Math.max(0, Math.min(1, window.innerWidth / MOBILE_BUTTON_SCALE_MAX_WIDTH));
        return Math.max(minScale, Math.min(maxScale, maxScale * t));
    }
    // Desktop AND Landscape - Landscape deliberately reuses Desktop's
    // own values and formula against its own real width, per direct
    // request ("for now... use the same settings as desktop mode").
    const maxScale = cssVars['--button-max-scale'];
    const minScale = cssVars['--button-min-scale'];
    const t = Math.max(0, Math.min(1, (window.innerWidth - DESKTOP_BUTTON_SCALE_MIN_WIDTH) / (DESKTOP_BUTTON_SCALE_MAX_WIDTH - DESKTOP_BUTTON_SCALE_MIN_WIDTH)));
    return minScale + t * (maxScale - minScale);
}

function applyActiveVars() {
    const activeCssVars = isMobileActive() ? getActiveMobileVars() : cssVars;
    // Colors are no longer device-split at all - per explicit
    // request ("desktop tab will determine all color selection"),
    // mobileColorVars is never read here anymore (still exists as
    // an object so old saved settings don't error out loading it,
    // just nothing consults it). Always the desktop colorVars,
    // regardless of which breakpoint is active.
    for (const [key, value] of Object.entries(colorVars)) {
        document.documentElement.style.setProperty(key, value);
    }
    for (const [key, value] of Object.entries(activeCssVars)) {
        // The CSS rules that consume --click-burst-distance-px/etc.
        // and --shadow-x/y-offset expect a genuine px number (they
        // multiply by *1px themselves) - resolve the vw-on-mobile
        // value to actual current-viewport px before pushing it,
        // rather than changing every consuming calc() expression.
        const resolved = SPATIAL_VW_ON_MOBILE_KEYS.has(key) ? resolveSpatialPx(value) : value;
        document.documentElement.style.setProperty(key, resolved);
    }
    // Main Button's own X/Y offset unit (px/vw toggle) - unlike the
    // 9 text elements above, the button has no Text Align dropdown/
    // Edge Lock system to fold this into (see applyTextAlignAnchors()
    // for that side), so its unit is derived directly from its own
    // px-checkbox flag here, with no lock state to OR against.
    document.documentElement.style.setProperty('--button-x-unit', activeCssVars['--button-x-offset-unit-is-px'] ? '1px' : 'var(--cq-vw, 1vw)');
    document.documentElement.style.setProperty('--button-y-unit', activeCssVars['--button-y-offset-unit-is-px'] ? '1px' : 'var(--cq-vh, 1vh)');
    // Round-text/Try-Again blink timing - also not device-split,
    // same reasoning as the existing Game Mechanics timing sliders.
    // Dock POSITION (--round-dock-x/y-offset) stays in the normal
    // mobile-split loop above since it's spatial, not timing.
    document.documentElement.style.setProperty('--try-again-flash-duration-ms', cssVars['--try-again-flash-duration-ms']);
    document.documentElement.style.setProperty('--try-again-hold-duration-ms', cssVars['--try-again-hold-duration-ms']);
    document.documentElement.style.setProperty('--round-blink1-hide-ms', cssVars['--round-blink1-hide-ms']);
    document.documentElement.style.setProperty('--round-blink1-show-ms', cssVars['--round-blink1-show-ms']);
    document.documentElement.style.setProperty('--round-blink2-hide-ms', cssVars['--round-blink2-hide-ms']);
    document.documentElement.style.setProperty('--round-blink2-show-ms', cssVars['--round-blink2-show-ms']);
    document.documentElement.style.setProperty('--round-blink3-hide-ms', cssVars['--round-blink3-hide-ms']);
    document.documentElement.style.setProperty('--round-blink3-show-ms', cssVars['--round-blink3-show-ms']);
    document.documentElement.style.setProperty('--round-post-blink-hold-ms', cssVars['--round-post-blink-hold-ms']);
    document.documentElement.style.setProperty('--round-blink4-hide-ms', cssVars['--round-blink4-hide-ms']);
    document.documentElement.style.setProperty('--high-score-flash-delay-ms', cssVars['--high-score-flash-delay-ms']);
    // Max/Min Button Scale - re-derived live from the CURRENT real
    // width every time this function runs (on resize, not just on a
    // breakpoint crossing), same as a native CSS vw unit would be -
    // see computeButtonUserScale()'s own comment.
    document.documentElement.style.setProperty('--button-user-scale', computeButtonUserScale());
    // Dev panel's own size/position - also single/shared (cssVars
    // only, not mobile-split - see clampDevPanelPosition()'s own
    // comment), so it needs the same unconditional push: the main
    // loop above only pushes whichever set (desktop/mobile) is
    // currently ACTIVE, and these keys only exist in cssVars, so on
    // a mobile-width viewport they'd never reach the DOM at all -
    // the panel would silently keep whatever stale position/size it
    // had, ignoring a freshly loaded/restored value. Found while
    // investigating "does Copy/Save record the panel's size and
    // location" - the CAPTURE already worked, this was a RESTORE
    // gap specific to mobile viewports.
    document.documentElement.style.setProperty('--dev-panel-left-px', cssVars['--dev-panel-left-px']);
    document.documentElement.style.setProperty('--dev-panel-top-px', cssVars['--dev-panel-top-px']);
    document.documentElement.style.setProperty('--dev-panel-width-px', cssVars['--dev-panel-width-px']);
    document.documentElement.style.setProperty('--dev-panel-height-px', cssVars['--dev-panel-height-px']);
    // Base/Button Light Levels/Contrast/Floor/Ceiling - single/
    // shared (cssVars only, not mobile/landscape-split), same
    // reasoning as the dev-panel geometry above. Independent pairs
    // now (see applyLightLevels()'s own comment) - the BUTTON call
    // here is always the NORMAL (non-Lose) values; if Lose is
    // currently showing, applyGameplayResultColor('lose') (called
    // separately, wherever gameplay state changes) overrides the
    // button filter again right after this with the Lose-specific
    // values, same layering as every other gameplay-result
    // override in this file.
    applyLightLevels(cssVars['--base-light-levels'], cssVars['--base-light-levels-contrast'], cssVars['--base-light-levels-floor'], cssVars['--base-light-levels-ceiling'], 'baseGrayscaleTint');
    applyLightLevels(cssVars['--button-light-levels'], cssVars['--button-light-levels-contrast'], cssVars['--button-light-levels-floor'], cssVars['--button-light-levels-ceiling'], 'buttonGrayscaleTint');
    applyBlendModes(cssVars['--base-blend-mode'], cssVars['--button-blend-mode']);
    applySaturation(cssVars['--base-saturation'], cssVars['--button-saturation']);
    applyThinBaseState();
    // The 8-bit extrusion system (color/depth/border) is mobile-
    // split too (see mobileExtrusionVars) - re-apply it here so a
    // breakpoint crossing repaints it correctly, same as everything
    // else in this function.
    applyExtrusionStyles();
    // Button/base hue-rotate aren't part of cssVars (they're computed
    // on the fly from whichever color picker is active) - refresh them
    // here too so a breakpoint crossing repaints them correctly.
    refreshButtonHue();
    refreshBaseHue();
    clampDevPanelPosition();
    applyTextAlignAnchors();
    // Text Edit Mode overrides are mobile-split too (see
    // mobileTextOverrides) - re-render every editable slot here so
    // a breakpoint crossing immediately shows whichever device's
    // own wording is now active, same as everything else in this
    // function.
    refreshAllTextOverrides();
    // Re-establish the active Win/Lose tint if one is currently
    // showing - per direct report ("if im playing in desktop or
    // mobile mode, lose, if i switch to landscape mode, the
    // button/base color isnt correct"). The Light Levels reset
    // just above (baseGrayscaleTint/buttonGrayscaleTint) always
    // applies the NORMAL (non-result) filter unconditionally, on
    // every resize/orientation-change event - including rotating
    // into Landscape while a Lose/Win state is still on screen.
    // Nothing was re-triggering applyGameplayResultColor()
    // afterward to restore the override, so a device-profile
    // change mid-result silently wiped the button/base tint back
    // to normal with no code path to bring it back (the comment
    // 2 lines above this block already assumed
    // applyGameplayResultColor() would run again "right after
    // this," which is only true when gameplay state itself
    // changes - a pure resize/rotation was never one of those
    // triggers).
    if (resultText.classList.contains('result-win')) applyGameplayResultColor('win');
    else if (resultText.classList.contains('result-lose')) applyGameplayResultColor('lose');
    // Re-measures the Number's rendered edges for Prefix/Suffix's
    // own anchor-to-Number positioning (see updateTargetAnchoredPositions()'s
    // own comment) - this is the one function guaranteed to run
    // after EVERY value change (live slider ticks, batch Undo/Reset/
    // Load restores, and viewport/breakpoint changes alike), so
    // hooking it here covers every case that could move OR resize
    // the Number without needing to special-case individual slider
    // ids. Cheap (2 getBoundingClientRect() calls, no CSS
    // reapplication) - not the O(sliders x cssVars) pattern the
    // earlier Undo perf bug was about.
    updateTargetAnchoredPositions();
    // Round Breakdown's own Scale With Browser reference width (see
    // .round-breakdown-panel's own CSS comment) and Align/Valign +
    // Edge Lock position (see applyRoundBreakdownPosition()'s own
    // comment) - same "run on every apply" reasoning as
    // updateTargetAnchoredPositions() just above.
    if (roundBreakdownPanel) {
        const rbProfile = getActiveDeviceProfile();
        const rbScaleRef = rbProfile === 'mobile' ? 390 : (rbProfile === 'landscape' ? 844 : 1280);
        roundBreakdownPanel.style.setProperty('--round-breakdown-scale-ref-px', rbScaleRef);
        applyRoundBreakdownPosition();
    }
    // Keep the UI-Engine Inspector's own live element in sync with
    // ANY real dev-panel slider/select edit, not just edits made
    // through the Inspector itself (2026-09-20, direct request:
    // "fix that so all sliders are reactive to the ui inspector
    // settings" - after live-verifying that moving the real
    // "Prefix X Offset" slider directly left the Inspector's own
    // engine value stale at its page-load default, confirmed by
    // reading getEffectiveValue() before/after a direct real-
    // slider move). applyActiveVars() is the single choke point
    // already called after every real slider/select edit anywhere
    // in the file (the CSS_VAR_SLIDER_MAP-driven generic input
    // handling, every one-off listener, tab switches, resize) -
    // exactly the same role stage2SyncEngineToClicko()'s own
    // MutationObserver plays for Inspector-originated edits, just
    // the opposite direction. Defined in the Inspector-writeback
    // <script type="module"> block further down and bridged here
    // via window.* (a classic script can't see a module's own
    // top-level declarations directly - the reverse of how that
    // module already reads this file's own cssVars/etc.) - guarded
    // since this classic script runs before the deferred module
    // has loaded on first paint.
    if (typeof window.stage2SyncClickoToEngine === 'function') window.stage2SyncClickoToEngine();
    // Real dev-panel row visibility by current Inspector mode
    // (2026-09-20, "big pass") - same bridging reasoning as just
    // above. Covers initial page load (this function's own first
    // real call) and every other trigger generically; the
    // Inspector-writeback module ALSO calls this directly on its
    // own two branches for instant feedback the moment a mode
    // changes, since a pure mode switch (no value change) doesn't
    // always flow through anyChanged/applyActiveVars() above.
    if (typeof window.stage2SyncAllRowVisibility === 'function') window.stage2SyncAllRowVisibility();
}
MOBILE_MEDIA_QUERY.addEventListener('change', applyActiveVars);
// Belt-and-suspenders: some viewport-emulation/testing contexts don't
// reliably dispatch matchMedia's own 'change' event on a resize even
// though a real device rotation or window resize would - a plain
// window resize listener re-applies too, redundantly but harmlessly.
window.addEventListener('resize', applyActiveVars);

// Reads the color picker for whichever mode (desktop/mobile) is
// currently active and re-applies it - used both for live edits and
// for the breakpoint-change listener above.
// Always the desktop picker now - per explicit request ("desktop
// tab will determine all color selection"), the Mobile-tab copies
// of these pickers are removed entirely.
function refreshButtonHue() {
    // Null-guarded (same convention used throughout this file) -
    // colorButton is one of the panel's own generated color
    // pickers (renderSpecialColorControls(), inside
    // ensureDevPanelBuilt()) and applyActiveVars() - which calls
    // this - can run before the panel has been built (isDevAllowed
    // visitors trigger ensureDevPanelBuilt() eagerly, but a resize/
    // breakpoint-crossing applyActiveVars() call can still land in
    // the narrow window before that finishes). Nothing to refresh
    // FROM yet if the picker doesn't exist - setButtonHue() already
    // ran with its own hardcoded default elsewhere, and
    // syncColorPickersFromState() correctly re-syncs everything
    // once the panel is actually built.
    const el = document.getElementById('colorButton');
    if (el) setButtonHue(el.value);
}
function refreshBaseHue() {
    const el = document.getElementById('colorBase');
    if (el) setBaseHue(el.value);
}

// Game Mechanics dev-panel sliders aren't cssVars/extrusionVars - they
// write straight into gameState/TAP_DEBOUNCE_MS via
// applyGameMechanicsSlider() (see there), so unlike every other dev
// control they need their own explicit capture/restore list here for
// COPY/SAVE/load to include them at all (previously missing entirely -
// reported as "Starting Time isn't what I set" after a reload/dump-
// and-reapply, since these silently fell back to their HTML defaults).
const GAME_MECHANICS_SLIDER_IDS = ['sliderStartingSpeed', 'sliderSpeedDecrease', 'sliderSpeedDecreaseDecay', 'sliderSpeedDecreaseDecayTolerance', 'sliderSpeedTimeRounding', 'sliderCountdownRounding', 'sliderTapDebounce', 'sliderResultDuration', 'sliderTargetFloorBase', 'sliderTargetFloorIncrease', 'sliderTargetCeilingBase', 'sliderTargetCeilingIncrease'];

function captureGameMechanics() {
    const gameMechanics = {};
    GAME_MECHANICS_SLIDER_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) gameMechanics[id] = parseFloat(el.value);
    });
    return gameMechanics;
}

// Copy settings to clipboard
function copySettings() {
    const settings = { cssVars, colorVars, mobileCssVars, mobileColorVars, landscapeCssVars, landscapeColorVars, extrusionVars, mobileExtrusionVars, landscapeExtrusionVars, gameMechanics: captureGameMechanics(), devPanelStyle, mobileDevPanelStyle, landscapeDevPanelStyle, textOverrides, mobileTextOverrides, landscapeTextOverrides, textEditWrapWidths, clickBurstFrameVars, mobileClickBurstFrameVars, landscapeClickBurstFrameVars, clickBurstTextInputs, mobileClickBurstTextInputs, landscapeClickBurstTextInputs, sectionCollapseState: captureSectionCollapseState(), sectionOrder: captureSectionOrder(), devTextOverrides, devTextOverridesManual: Array.from(devTextOverridesManual), lockedGroups: Array.from(lockedGroups), devVisibility, devIndependence, devDeviceValues, stage2EngineOverrides, baseColor: document.getElementById('colorBase').value, buttonColor: document.getElementById('colorButton').value, buttonWinColor: document.getElementById('colorButtonWin').value, buttonLoseColor: document.getElementById('colorButtonLose').value };
    const text = JSON.stringify(settings, null, 2);
    try {
        navigator.clipboard.writeText(text).then(() => {
            alert('Settings copied to clipboard!');
        }).catch(() => {
            promptFallbackCopy(text);
        });
    } catch (e) {
        promptFallbackCopy(text);
    }
}

function promptFallbackCopy(text) {
    window.prompt('Clipboard access unavailable. Copy manually:', text);
}

function exportDevPanelSettings() {
    const settings = { cssVars, colorVars, mobileCssVars, mobileColorVars, landscapeCssVars, landscapeColorVars, extrusionVars, mobileExtrusionVars, landscapeExtrusionVars, gameMechanics: captureGameMechanics(), devPanelStyle, mobileDevPanelStyle, landscapeDevPanelStyle, textOverrides, mobileTextOverrides, landscapeTextOverrides, textEditWrapWidths, clickBurstFrameVars, mobileClickBurstFrameVars, landscapeClickBurstFrameVars, clickBurstTextInputs, mobileClickBurstTextInputs, landscapeClickBurstTextInputs, sectionCollapseState: captureSectionCollapseState(), sectionOrder: captureSectionOrder(), devTextOverrides, devTextOverridesManual: Array.from(devTextOverridesManual), lockedGroups: Array.from(lockedGroups), devVisibility, devIndependence, devDeviceValues, stage2EngineOverrides, baseColor: document.getElementById('colorBase').value, buttonColor: document.getElementById('colorButton').value, buttonWinColor: document.getElementById('colorButtonWin').value, buttonLoseColor: document.getElementById('colorButtonLose').value };
    const text = JSON.stringify(settings, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dev-panel-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Shared anti-abuse token for /api/save-settings (CLAUDE.md Section
// 12l) - NOT a real secret (it ships in this public page's source,
// same as every other client-side value here), just enough to keep
// a random visitor from spamming commits to the repo. Must match
// the DEV_PANEL_SAVE_SECRET env var set on the Vercel project - see
// README.md for setup.
const DEV_PANEL_SAVE_SECRET = 'PkrbMti03M6xm3FEThYXa8gGW_08BOGj';

// Push of a Save Settings dump to the git-tracked settings log
// (data/processed/dev-panel-settings.json) via the /api/save-
// settings serverless function - per explicit request, this is now
// the ONLY place SAVE writes to (no localStorage fallback), so a
// failed/unavailable sync means nothing was saved at all, not just
// a missed extra copy. The status label makes that failure clearly
// visible rather than silently doing nothing.
// Flashes the HEADER Sync button itself (devHeaderSyncBtn) with a
// temporary checkmark/X and tooltip - per direct request ("for the
// save button on the top panel, shwo some sort of indication of
// 'Saved' after i click it"). The original bottom SYNC button
// already had this feedback via #saveSyncStatus (see below), but
// that status text lives at the BOTTOM of the panel - not visible
// without scrolling back up, defeating the whole point of the
// header button existing (see its own "add a Sync button in the
// header too" comment). Called from every resolution point of
// saveSettings()/syncSettingsToRepo() below, success or failure,
// same as #saveSyncStatus's own text already does.
function flashDevHeaderSyncStatus(success, message) {
    const btn = document.getElementById('devHeaderSyncBtn');
    if (!btn) return;
    if (btn._syncFlashTimeout) clearTimeout(btn._syncFlashTimeout);
    btn.textContent = success ? '✅' : '❌';
    btn.title = message || (success ? 'Saved!' : 'Save failed');
    btn._syncFlashTimeout = setTimeout(() => {
        btn.textContent = '💾';
        btn.title = 'Sync (Save)';
    }, 1800);
}
function syncSettingsToRepo(settings) {
    const statusEl = document.getElementById('saveSyncStatus');
    if (statusEl) { statusEl.textContent = 'Saving...'; statusEl.style.color = ''; }
    fetch('/api/save-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Dev-Panel-Secret': DEV_PANEL_SAVE_SECRET },
        body: JSON.stringify(settings),
    }).then(async (resp) => {
        const data = await resp.json().catch(() => ({}));
        if (resp.ok && data.ok) {
            const msg = data.localDev ? 'Saved locally + synced' : 'Saved to repo';
            if (statusEl) { statusEl.textContent = msg; statusEl.style.color = 'var(--dev-accent-color)'; }
            flashDevHeaderSyncStatus(true, msg);
        } else {
            const msg = 'NOT saved: ' + (data.error || resp.status);
            if (statusEl) { statusEl.textContent = msg; statusEl.style.color = '#ff4444'; }
            flashDevHeaderSyncStatus(false, msg);
        }
    }).catch((err) => {
        const msg = 'NOT saved (offline?)';
        if (statusEl) { statusEl.textContent = msg; statusEl.style.color = '#ff4444'; }
        flashDevHeaderSyncStatus(false, msg);
    });
}

function buildSettingsSnapshot() {
    // Undock is session-only/never persisted (see dockAllUndockedGroups()'s
    // own comment) - dock everything back first so nothing captured
    // below is silently missing a group that currently lives inside
    // a floating panel instead of its normal tab location. This one
    // function is shared by Save/Copy/Undo-snapshot/Named Setting
    // States, so this single call covers all of them.
    dockAllUndockedGroups();
    return { cssVars, colorVars, mobileCssVars, mobileColorVars, landscapeCssVars, landscapeColorVars, extrusionVars, mobileExtrusionVars, landscapeExtrusionVars, gameMechanics: captureGameMechanics(), devPanelStyle, mobileDevPanelStyle, landscapeDevPanelStyle, textOverrides, mobileTextOverrides, landscapeTextOverrides, textEditWrapWidths, clickBurstFrameVars, mobileClickBurstFrameVars, landscapeClickBurstFrameVars, clickBurstTextInputs, mobileClickBurstTextInputs, landscapeClickBurstTextInputs, sectionCollapseState: captureSectionCollapseState(), sectionOrder: captureSectionOrder(), devTextOverrides, devTextOverridesManual: Array.from(devTextOverridesManual), lockedGroups: Array.from(lockedGroups), devVisibility, devIndependence, devDeviceValues, stage2EngineOverrides, baseColor: document.getElementById('colorBase').value, buttonColor: document.getElementById('colorButton').value, buttonWinColor: document.getElementById('colorButtonWin').value, buttonLoseColor: document.getElementById('colorButtonLose').value, devHotkeys };
}

// Save settings - git-only (data/processed/dev-panel-settings.json
// via syncSettingsToRepo() above), per explicit request, EXCEPT
// when opened directly as a local file with no server behind it
// (location.protocol === 'file:') - there's nothing to write the
// git-tracked log through in that mode (CLAUDE.md Section 12l's
// own exception), so this falls back to localStorage instead.
// Read and write are NOT symmetric here, deliberately -
// acquireSavedSettings() reads live from GitHub even on file://
// (a public read needs no server/secret, unlike a write), only
// falling back to this same localStorage key when that's
// unreachable.
function saveSettings() {
    const settings = buildSettingsSnapshot();
    // Undo is session-only, cleared the moment a real Save happens
    // (per direct clarification - "until i click save, then it
    // starts new again") - a hard line under everything before it.
    clearDevPanelUndoStack();
    if (typeof isDevAllowed === 'undefined' || isDevAllowed) {
        if (location.protocol === 'file:') {
            const statusEl = document.getElementById('saveSyncStatus');
            try {
                localStorage.setItem('clickoSettings', JSON.stringify(settings));
                const msg = 'Saved locally (no server - not synced to repo)';
                if (statusEl) { statusEl.textContent = msg; statusEl.style.color = 'var(--dev-accent-color)'; }
                flashDevHeaderSyncStatus(true, msg);
            } catch (e) {
                const msg = 'NOT saved (local storage unavailable)';
                if (statusEl) { statusEl.textContent = msg; statusEl.style.color = '#ff4444'; }
                flashDevHeaderSyncStatus(false, msg);
            }
        } else {
            syncSettingsToRepo(settings);
        }
    }
}

// Restores a saved setup - git-tracked settings log (data/processed/
// dev-panel-settings.json) per CLAUDE.md Section 12l, EXCEPT when
// there's no server to write/read that file through (opened as a
// bare local file - see acquireSavedSettings()'s own comment, 12l's
// own exception), where this reads back a localStorage fallback
// instead. Async either way (a fetch is never instant) - callers
// that need subsequent code to see the restored values must await
// this, see the Initialize block below.
async function loadSettings() {
    // Reset the Thin Base race-condition guard at the start of
    // EVERY load, not just the initial page-load one - Reset
    // (resetDevSettings() -> loadSettings() again) is a deliberate,
    // intentional re-application and must still be able to change
    // Thin Base even after the user has manually toggled it once;
    // the guard exists only to protect THIS SPECIFIC in-flight
    // fetch from a race with a toggle that happens while IT'S
    // pending, not to permanently lock Thin Base out of every
    // future load.
    thinBaseUserSet = false;
    const settings = await acquireSavedSettings();
    if (settings && typeof settings === 'object' && Object.keys(settings).length) {
        applyLoadedSettings(settings);
    }
}

function applySettingsSnapshotLive(settings) {
    if (!settings || typeof settings !== 'object' || !Object.keys(settings).length) return;
    applyLoadedSettings(settings);
    resolvePositionSentinels();
    applyActiveVars();
    applyExtrusionStyles();
    if (devPanelBuilt) {
        syncSlidersFromState();
        syncColorPickersFromState();
        syncDevPanelStyleControlsFromState();
        applyDevTextOverrides();
    }
    if (cssVars['--flip-button-svg']) gameButton.classList.add('flip-svg');
    else gameButton.classList.remove('flip-svg');
}

function shouldUseLocalSettingsSync() {
    const params = new URLSearchParams(location.search);
    if (params.has('no-dev-sync')) return false;
    if (params.has('dev-sync')) return true;
    return /^(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(location.hostname);
}

function connectLocalSettingsSync() {
    if (!shouldUseLocalSettingsSync() || typeof EventSource === 'undefined') return;
    const source = new EventSource('/api/settings-events');
    source.addEventListener('settings', (event) => {
        try {
            applySettingsSnapshotLive(JSON.parse(event.data));
        } catch (e) {
            console.warn('Failed to apply live settings sync', e);
        }
    });
}

let liveSettingsSyncTimeoutId = null;
function queueLiveSettingsPreviewSync() {
    if (!shouldUseLocalSettingsSync() || !(typeof isDevAllowed === 'undefined' || isDevAllowed)) return;
    if (liveSettingsSyncTimeoutId) clearTimeout(liveSettingsSyncTimeoutId);
    liveSettingsSyncTimeoutId = setTimeout(() => {
        liveSettingsSyncTimeoutId = null;
        fetch('/api/preview-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildSettingsSnapshot()),
        }).catch(() => {});
    }, 50);
}

function setupLiveSettingsPreviewSync() {
    if (!shouldUseLocalSettingsSync() || !(typeof isDevAllowed === 'undefined' || isDevAllowed)) return;
    devPanel.addEventListener('input', queueLiveSettingsPreviewSync, true);
    devPanel.addEventListener('change', queueLiveSettingsPreviewSync, true);
    devPanel.addEventListener('click', (event) => {
        if (event.target.closest('button, input[type="checkbox"], select')) {
            queueLiveSettingsPreviewSync();
        }
    }, true);
}

// Same repo/path GITHUB_REPO/SETTINGS_FILE_PATH default to server-
// side in api/save-settings.js - kept in sync manually, since the
// client can't read the function's own env vars. Update both
// together if either ever changes.
const SETTINGS_GITHUB_API_URL = 'https://api.github.com/repos/LeisHo/Clicko/contents/data/processed/dev-panel-settings.json?ref=main';

// Acquires the raw saved-settings object from whichever source
// applies. Git-only (fetches LIVE from GitHub's Contents API, not
// the same-origin static file - that file only reflects whatever
// was live at the LAST deployment, not the latest commit, so a
// save right after a deploy would look invisible until the next
// one; confirmed directly while testing 12l's rollout) EXCEPT when
// location.protocol === 'file:' - opened directly as a local file,
// no server behind it at all, so there is nothing to write/read
// the git-tracked log through (CLAUDE.md Section 12l's own
// exception) - that case falls back to this browser's own
// localStorage instead (the same key/behavior this project used
// before going git-only). Returns null if nothing's saved yet, or
// the source is unreachable/unparsable - callers treat that as
// "use defaults." No auth needed for a public repo's contents, but
// this DOES count against GitHub's unauthenticated rate limit (60
// req/hr/IP) - a real, accepted tradeoff for staying serverless on
// the read path; a failure here just falls back to defaults, same
// as any other unreachable-source case.
async function acquireSavedSettings() {
    // Tries the live GitHub fetch FIRST regardless of protocol - a
    // plain cross-origin HTTPS request to a public API, which
    // works identically whether this page is served over http(s)
    // or opened directly as a local file:// document. Per direct
    // report ("when i open the html file locally, not in a
    // server, everthing looks fucked") - root-caused to this
    // function previously skipping the GitHub fetch ENTIRELY for
    // file:// and relying on localStorage alone, which either has
    // nothing (silently falls back to whatever the hardcoded JS
    // defaults happen to currently say) or, worse, stale data left
    // over from some earlier local test session, silently
    // resurrected on every future local open with no way to tell
    // it's stale. Only the SAVE path genuinely can't work from
    // file:// (no server to hold the write-authorizing GitHub
    // token, per CLAUDE.md Section 12l) - reading a public repo's
    // public content needs no secret at all, so there was never a
    // real reason to restrict the READ side too. localStorage
    // stays as the fallback specifically for file:// with no
    // network path to GitHub reachable at all (offline, or the
    // unauthenticated rate limit hit).
    try {
        const resp = await fetch(SETTINGS_GITHUB_API_URL, {
            headers: { Accept: 'application/vnd.github+json' },
            cache: 'no-store',
        });
        if (resp.ok) {
            const data = await resp.json();
            const base64 = (data.content || '').replace(/\s/g, '');
            const jsonText = decodeURIComponent(escape(atob(base64)));
            return JSON.parse(jsonText);
        }
    } catch (e) {
        // network unavailable, rate-limited, malformed JSON, or (on
        // file://) no CORS path to GitHub from this browser - fall
        // through to the local fallback below.
    }
    if (location.protocol === 'file:') {
        try {
            const saved = localStorage.getItem('clickoSettings');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    }
    return null;
}

function applyLoadedSettings(settings) {
        try {
            Object.assign(cssVars, settings.cssVars);
            Object.assign(colorVars, settings.colorVars);
            Object.assign(mobileCssVars, settings.mobileCssVars);
            Object.assign(mobileColorVars, settings.mobileColorVars);
            // || structuredClone(cssVars)/(colorVars) - NOT the same
            // as the declare-time `structuredClone(cssVars)` seed
            // these 2 objects already have. That seed runs at
            // SCRIPT-PARSE time, before this async function ever
            // gets the real saved cssVars/colorVars above - so
            // without this fallback, whenever settings.landscapeX is
            // genuinely absent (e.g. the current desktop-seed
            // experiment - see landscapeCssVars' own declare-time
            // comment), landscapeCssVars/landscapeColorVars would
            // stay stuck on cssVars'/colorVars' STALE HARDCODED
            // DEFAULT forever, never picking up whatever Desktop's
            // sliders have actually been tuned to since - a real bug
            // found via direct report ("still showing the mobile
            // settings" - it wasn't even Mobile, it was Desktop's
            // OWN stale un-loaded default, which just happened to
            // look equally wrong). This re-derives from the NOW-
            // current, just-updated cssVars/colorVars on every load
            // when there's no explicit saved landscape override.
            Object.assign(landscapeCssVars, settings.landscapeCssVars || structuredClone(cssVars));
            Object.assign(landscapeColorVars, settings.landscapeColorVars || structuredClone(colorVars));
            // Text-align/valign dropdowns (setupTextAlignSelects())
            // write into cssVars/mobileCssVars on change, same as
            // every other cssVar-backed control - the underlying
            // VALUE was always captured/restored correctly via the
            // Object.assign above. What was missing: the <select>
            // elements' own displayed option never got synced to
            // match, so a genuinely-restored alignment still showed
            // the dropdown's default choice after a reload/RESET -
            // looked exactly like "not saved" even though the game
            // itself rendered correctly. Per direct report ("the
            // save button isnt savingg the dropdowns for lettte
            // alignment") - confirmed via the actual git-tracked
            // settings log that the data was there all along.
            document.querySelectorAll('.dev-align-select, .dev-valign-select').forEach(select => {
                const { device } = resolveDevControlId(select.id);
                const value = (device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars)[select.dataset.var];
                if (value !== undefined) select.value = value;
            });
            // Same restore-gap as the align/valign selects just
            // above, for the Edge Lock checkboxes beside them.
            document.querySelectorAll('.dev-edge-lock-checkbox').forEach(checkbox => {
                const { device } = resolveDevControlId(checkbox.id);
                const value = (device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars)[checkbox.dataset.var];
                if (value !== undefined) checkbox.checked = !!value;
            });
            Object.assign(extrusionVars, settings.extrusionVars);
            Object.assign(mobileExtrusionVars, settings.mobileExtrusionVars);
            // See landscapeCssVars' own comment above - same
            // declare-time-vs-load-time staleness fix.
            Object.assign(landscapeExtrusionVars, settings.landscapeExtrusionVars || structuredClone(extrusionVars));
            if (settings.gameMechanics) {
                GAME_MECHANICS_SLIDER_IDS.forEach(id => {
                    const value = settings.gameMechanics[id];
                    const el = document.getElementById(id);
                    if (el && value !== undefined) {
                        el.value = value;
                        applySliderValue(el, value);
                    }
                });
            }
            // Built-in "Dev Panel" styling (Section 12i) - restore
            // the underlying objects AND sync every slider/color
            // input's own DOM value (Object.assign alone wouldn't
            // move the visible control), then re-apply whichever
            // tab is currently active.
            if (settings.devPanelStyle) Object.assign(devPanelStyle, settings.devPanelStyle);
            if (settings.mobileDevPanelStyle) Object.assign(mobileDevPanelStyle, settings.mobileDevPanelStyle);
            // See landscapeCssVars' own comment above - same fix,
            // as an explicit else since this one's source assign is
            // itself conditional.
            if (settings.landscapeDevPanelStyle) Object.assign(landscapeDevPanelStyle, settings.landscapeDevPanelStyle);
            else Object.assign(landscapeDevPanelStyle, structuredClone(devPanelStyle));
            // opacity/bgColor/titleTextColor/nonTitleTextColor/
            // accentColor have no Mobile/Landscape id (null) -
            // desktop-only now, see DEV_PANEL_STYLE_SHARED_KEYS.
            const DEV_PANEL_STYLE_CONTROL_IDS = {
                titleFontSize: ['sliderDevPanelTitleFontSize', 'sliderMobileDevPanelTitleFontSize', 'sliderLandscapeDevPanelTitleFontSize'],
                tabFontSize: ['sliderDevTabFontSize', 'sliderMobileDevTabFontSize', 'sliderLandscapeDevTabFontSize'],
                groupTitleFontSize: ['sliderDevGroupTitleFontSize', 'sliderMobileDevGroupTitleFontSize', 'sliderLandscapeDevGroupTitleFontSize'],
                settingTitleFontSize: ['sliderDevSettingTitleFontSize', 'sliderMobileDevSettingTitleFontSize', 'sliderLandscapeDevSettingTitleFontSize'],
                buttonTextBorder: ['sliderDevButtonTextBorder', 'sliderMobileDevButtonTextBorder', 'sliderLandscapeDevButtonTextBorder'],
                scrollStrength: ['sliderDevScrollStrength', 'sliderMobileDevScrollStrength', 'sliderLandscapeDevScrollStrength'],
                opacity: ['sliderDevPanelOpacity', null, null],
                bgColor: ['colorDevPanelBg', null, null],
                titleTextColor: ['colorDevPanelTitleText', null, null],
                nonTitleTextColor: ['colorDevPanelNonTitleText', null, null],
                accentColor: ['colorDevPanelAccent', null, null],
                sliderColor: ['colorDevPanelSliderColor', null, null],
                groupTextColor: ['colorDevPanelGroupText', null, null],
                buttonTextColor: ['colorDevPanelButtonText', null, null],
                settingNumberColor: ['colorDevPanelSettingNumber', null, null],
                buttonHeight: ['sliderDevButtonHeight', 'sliderMobileDevButtonHeight', 'sliderLandscapeDevButtonHeight'],
                buttonTextLetterSpacing: ['sliderDevButtonTextLetterSpacing', null, null],
                tabTextLetterSpacing: ['sliderDevTabTextLetterSpacing', null, null],
                groupTextLetterSpacing: ['sliderDevGroupTextLetterSpacing', null, null],
                settingsTextLetterSpacing: ['sliderDevSettingsTextLetterSpacing', null, null],
                titleLetterSpacing: ['sliderDevPanelTitleLetterSpacing', 'sliderMobileDevPanelTitleLetterSpacing', 'sliderLandscapeDevPanelTitleLetterSpacing'],
                titleLineHeight: ['sliderDevPanelTitleLineHeight', 'sliderMobileDevPanelTitleLineHeight', 'sliderLandscapeDevPanelTitleLineHeight'],
                tabLineHeight: ['sliderDevTabLineHeight', 'sliderMobileDevTabLineHeight', 'sliderLandscapeDevTabLineHeight'],
                buttonLineHeight: ['sliderDevButtonLineHeight', 'sliderMobileDevButtonLineHeight', 'sliderLandscapeDevButtonLineHeight'],
                settingsLineHeight: ['sliderDevSettingsLineHeight', 'sliderMobileDevSettingsLineHeight', 'sliderLandscapeDevSettingsLineHeight'],
                groupLineHeight: ['sliderDevGroupLineHeight', 'sliderMobileDevGroupLineHeight', 'sliderLandscapeDevGroupLineHeight'],
                tabTextColor: ['colorDevPanelTabText', null, null],
                buttonFontSize: ['sliderDevButtonFontSize', 'sliderMobileDevButtonFontSize', 'sliderLandscapeDevButtonFontSize'],
            };
            Object.entries(DEV_PANEL_STYLE_CONTROL_IDS).forEach(([key, [deskId, mobId, landId]]) => {
                const deskEl = document.getElementById(deskId);
                if (deskEl) deskEl.value = devPanelStyle[key];
                const deskValEl = document.getElementById(deskId.replace(/^(slider|color)/, 'value'));
                if (deskValEl) deskValEl.textContent = devPanelStyle[key];
                if (mobId) {
                    const mobEl = document.getElementById(mobId);
                    if (mobEl) mobEl.value = mobileDevPanelStyle[key];
                    const mobValEl = document.getElementById(mobId.replace(/^(slider|color)/, 'value'));
                    if (mobValEl) mobValEl.textContent = mobileDevPanelStyle[key];
                }
                if (landId) {
                    const landEl = document.getElementById(landId);
                    if (landEl) landEl.value = landscapeDevPanelStyle[key];
                    const landValEl = document.getElementById(landId.replace(/^(slider|color)/, 'value'));
                    if (landValEl) landValEl.textContent = landscapeDevPanelStyle[key];
                }
            });
            // fontFamily (a <select>) and the 4 caps checkboxes need
            // their own restore logic - a <select>'s .textContent
            // would destroy its <option> children if routed through
            // the generic slider/color loop above, and a checkbox
            // needs .checked, not .value.
            // 'monospace' is no longer a valid option (removed per
            // explicit request) - a settings file saved before that
            // removal would otherwise restore an option a <select>
            // can't actually select, leaving nothing chosen.
            if (devPanelStyle.fontFamily === 'monospace') devPanelStyle.fontFamily = 'Arial, Helvetica, sans-serif';
            const fontFamilyEl = document.getElementById('selectDevPanelFontFamily');
            if (fontFamilyEl) fontFamilyEl.value = devPanelStyle.fontFamily;
            // Blend Mode selects - same DOM-value-sync gap class as
            // the color pickers (see syncColorPickersFromState()).
            const baseBlendEl = document.getElementById('selectBaseBlendMode');
            if (baseBlendEl && cssVars['--base-blend-mode']) baseBlendEl.value = cssVars['--base-blend-mode'];
            const buttonBlendEl = document.getElementById('selectButtonBlendMode');
            if (buttonBlendEl && cssVars['--button-blend-mode']) buttonBlendEl.value = cssVars['--button-blend-mode'];
            Object.entries(DEV_PANEL_CAPS_CLASS_MAP).forEach(([key, _cls]) => {
                const idMap = {
                    capsButtonText: 'checkboxDevCapsButtonText',
                    capsTabText: 'checkboxDevCapsTabText',
                    capsGroupNames: 'checkboxDevCapsGroupNames',
                    capsSettingsText: 'checkboxDevCapsSettingsText',
                    titleCapitalize: 'checkboxDevCapsTitleText',
                    titleBold: 'checkboxDevBoldTitle',
                    tabBold: 'checkboxDevBoldTab',
                    buttonBold: 'checkboxDevBoldButton',
                    settingsBold: 'checkboxDevBoldSettings',
                    groupBold: 'checkboxDevBoldGroup',
                };
                const el = document.getElementById(idMap[key]);
                if (el) el.checked = !!devPanelStyle[key];
            });
            applyDevPanelOwnStyling(
                !document.getElementById('mobileTabContent').classList.contains('hidden') ? 'mobile'
                : !document.getElementById('landscapeTabContent').classList.contains('hidden') ? 'landscape'
                : 'desktop'
            );
            // Base Color's own picked value was never actually
            // persisted before now - a real, separate gap from the
            // hue-rotate-can't-reach-white math issue, but likely
            // the DOMINANT reason tint "always defaults to red":
            // every reload silently reset it to the hardcoded
            // #eb2027 regardless of what was last picked, since
            // nothing ever saved/restored the input's own .value.
            // CRITICAL FIX (2026-09-20, direct report: "I don't see
            // anything when opened on vercel in mobile"/"the base
            // color changed"/"I think my color settings got lost on
            // mobile"). Root cause: every one of these 4 lines (and
            // ~15 more further down this same function, all fixed
            // in this same pass) called document.getElementById(id)
            // and immediately chained .value=/.checked= onto it,
            // completely unguarded - colorBase/colorButton/etc. are
            // real dev-panel-only elements that NEVER exist for a
            // non-dev visitor (ensureDevPanelBuilt() never runs).
            // For a real player, THIS was the very first one hit,
            // throwing immediately and aborting the entire rest of
            // applyLoadedSettings() (caught by its own outer
            // try/catch, logged as "Failed to parse saved
            // settings") - meaning color, text overrides, click
            // burst visuals, and everything else this huge function
            // restores had been silently reset to hardcoded
            // defaults for EVERY real, non-dev player, not just
            // this reporting user's mobile session or anything
            // caused by this session's own recent changes. Fixed by
            // null-guarding the (possibly-missing) input element's
            // OWN .value assignment while ALWAYS still applying the
            // real color effect directly (setBaseHue()/
            // setButtonHue()/style.setProperty already take a raw
            // hex string, independent of the input element existing
            // at all) - refreshBaseHue()/refreshButtonHue() were
            // dropped here specifically because THEY re-read FROM
            // the (possibly missing) input rather than from
            // settings.baseColor directly, which would silently
            // skip applying the color for a non-dev visitor even
            // once the crash itself was fixed.
            if (settings.baseColor) {
                const colorBaseEl = document.getElementById('colorBase');
                if (colorBaseEl) colorBaseEl.value = settings.baseColor;
                setBaseHue(settings.baseColor);
            }
            if (settings.buttonColor) {
                const colorButtonEl = document.getElementById('colorButton');
                if (colorButtonEl) colorButtonEl.value = settings.buttonColor;
                setButtonHue(settings.buttonColor);
            }
            if (settings.buttonWinColor) {
                const colorButtonWinEl = document.getElementById('colorButtonWin');
                if (colorButtonWinEl) colorButtonWinEl.value = settings.buttonWinColor;
                document.documentElement.style.setProperty('--button-win-tint-color', settings.buttonWinColor);
            }
            if (settings.buttonLoseColor) {
                const colorButtonLoseEl = document.getElementById('colorButtonLose');
                if (colorButtonLoseEl) colorButtonLoseEl.value = settings.buttonLoseColor;
                document.documentElement.style.setProperty('--button-lose-tint-color', settings.buttonLoseColor);
            }
            // Text Edit Mode overrides - restore the raw values then
            // re-render every editable slot from them (also picks
            // up the checkbox's own current state, not stored here,
            // since Text Edit Mode being ON/OFF isn't itself a
            // per-text override).
            if (settings.textOverrides) {
                Object.assign(textOverrides, settings.textOverrides);
                refreshAllTextOverrides();
            }
            if (settings.mobileTextOverrides) {
                Object.assign(mobileTextOverrides, settings.mobileTextOverrides);
                refreshAllTextOverrides();
            }
            // See landscapeCssVars' own comment above - same fix.
            if (settings.landscapeTextOverrides) {
                Object.assign(landscapeTextOverrides, settings.landscapeTextOverrides);
            } else {
                Object.assign(landscapeTextOverrides, structuredClone(textOverrides));
            }
            refreshAllTextOverrides();
            if (settings.textEditWrapWidths) {
                Object.assign(textEditWrapWidths, settings.textEditWrapWidths);
                applyAllTextEditWrapWidths();
            }
            // Click Burst per-frame-set memory - restore all 4
            // frame sets' remembered values, sync the Frame Set
            // select's own displayed option to match the restored
            // cssVars['--click-frame-set'] (a pre-existing gap for
            // this particular select, fixed here since it's now
            // directly load-bearing for which frame set's values
            // are shown), then restore that frame set's own values
            // into cssVars/mobileCssVars and every scoped slider.
            if (settings.clickBurstFrameVars) Object.assign(clickBurstFrameVars, settings.clickBurstFrameVars);
            if (settings.mobileClickBurstFrameVars) Object.assign(mobileClickBurstFrameVars, settings.mobileClickBurstFrameVars);
            // See landscapeCssVars' own comment above - same fix.
            // structuredClone (not Object.assign's shallow copy) for
            // the fallback specifically because clickBurstFrameVars
            // is nested (one sub-object per frame set) - a shallow
            // copy would share the SAME sub-object references
            // between landscapeClickBurstFrameVars and
            // clickBurstFrameVars, so tuning one frame set on either
            // tab would silently mutate the other's too.
            if (settings.landscapeClickBurstFrameVars) Object.assign(landscapeClickBurstFrameVars, settings.landscapeClickBurstFrameVars);
            else Object.assign(landscapeClickBurstFrameVars, structuredClone(clickBurstFrameVars));
            const frameSetSelect = document.getElementById('selectClickFrameSet');
            if (frameSetSelect && cssVars['--click-frame-set']) frameSetSelect.value = cssVars['--click-frame-set'];
            restoreClickBurstFrameVars(cssVars['--click-frame-set'] || 'CLICK1');
            // Hide Shadow spec + angle floor/ceiling text/number
            // inputs - previously never persisted at all (see
            // clickBurstTextInputs' own comment).
            if (settings.clickBurstTextInputs) Object.assign(clickBurstTextInputs, settings.clickBurstTextInputs);
            if (settings.mobileClickBurstTextInputs) Object.assign(mobileClickBurstTextInputs, settings.mobileClickBurstTextInputs);
            // See landscapeCssVars' own comment above - same fix.
            if (settings.landscapeClickBurstTextInputs) Object.assign(landscapeClickBurstTextInputs, settings.landscapeClickBurstTextInputs);
            else Object.assign(landscapeClickBurstTextInputs, structuredClone(clickBurstTextInputs));
            applyClickBurstTextInputs();
            applySectionOrder(settings.sectionOrder);
            applySectionCollapseState(settings.sectionCollapseState);
            // Rendered later by applyDevTextOverrides() (called from
            // the outer async settings-load IIFE, after this whole
            // function returns) - just restoring the data here,
            // matching every other settings.X -> liveState Object.assign
            // above.
            if (settings.devTextOverrides) Object.assign(devTextOverrides, settings.devTextOverrides);
            // Restores which of those overrides were typed directly
            // on their own tab (vs. auto-carried from Desktop by
            // syncTabOrderToDesktop()) - see devTextOverridesManual's
            // own comment. Falls back to an empty set for settings
            // saved before this field existed, same convention as
            // every other settings.X-missing case in this function.
            if (settings.devTextOverridesManual) devTextOverridesManual = new Set(settings.devTextOverridesManual);
            // Same fallback convention as devTextOverridesManual
            // just above. injectGroupLockIcons() is re-run right
            // after (not just left to whatever icons ensureDevPanelBuilt()
            // already created) since this load can genuinely
            // happen AFTER the panel was already built with
            // lockedGroups still empty (loadSettings() is async,
            // ensureDevPanelBuilt() is not) - without this, every
            // icon would show unlocked until manually reopened,
            // even for a group actually saved as locked.
            if (settings.lockedGroups) lockedGroups = new Set(settings.lockedGroups);
            if (devPanelBuilt) injectGroupLockIcons();
            // Dynamic Mobile/Landscape visibility/independence
            // state (2026-09-17) - same fallback-to-empty convention
            // as the fields above. syncDynamicDeviceRows() re-run
            // (not just left to whatever dynamic rows already exist)
            // for the same reason injectGroupLockIcons() is above -
            // this load can happen AFTER the panel was already built
            // with the state dicts still empty, so a saved "shown"
            // control needs its row actually (re)built now, and a
            // saved "hidden" one needs any stale row removed.
            if (settings.devVisibility) devVisibility = settings.devVisibility;
            if (settings.devIndependence) devIndependence = settings.devIndependence;
            if (settings.devDeviceValues) devDeviceValues = settings.devDeviceValues;
            if (settings.stage2EngineOverrides) stage2EngineOverrides = settings.stage2EngineOverrides;
            if (devPanelBuilt) { syncDynamicDeviceRows(); syncDeviceCheckboxesFromState(); refreshEmptyGroupVisibility('mobile'); refreshEmptyGroupVisibility('landscape'); injectGroupDeviceCheckboxes(); }
            // Mouse Log's own resolveDebugGroupSid() needs
            // devTextOverrides actually populated (just above) to
            // find the "DEBUG" group by its current display name -
            // this is the call site that actually succeeds on a
            // real page load, per that section's own top comment.
            if (devPanelBuilt) buildMouseLogWidget();
            // Clear Highscore button - same "real call site on a
            // real page load" reasoning as Mouse Log just above.
            if (devPanelBuilt) buildClearHighScoreButton();
            // Generic slider display-sync-after-load - every
            // CSS_VAR_SLIDER_MAP/EXTRUSION_SLIDER_MAP-driven slider's
            // underlying value already restores correctly via the
            // Object.assign calls above (and gets visibly applied via
            // applyActiveVars()/applyExtrusionStyles() right after
            // loadSettings() resolves), but the <input type="range">
            // element's own handle position/readout was never synced
            // to match - the same class of gap as the align/valign
            // dropdown fix above, generalized to every slider instead
            // of one control type (this file's own startup-IIFE
            // comment already flagged it as "a pre-existing gap
            // affecting every dev-panel control"). Runs last, after
            // every other restore step above (including the
            // click-burst frame-set re-derivation), so it reads
            // final, settled values.
            syncSlidersFromState();
            // Generic color-picker DOM-value sync - same gap-closing
            // shape as the slider sync loop just above, see
            // syncColorPickersFromState()'s own comment.
            syncColorPickersFromState();
            // Same gap, for the Dev Panel's OWN style controls
            // (its font-size/color/opacity/caps sliders and
            // pickers) - these live in devPanelStyle/mobile.../
            // landscape... (a separate object system from
            // cssVars/CSS_VAR_SLIDER_MAP), so neither sync above
            // ever touches them - see syncDevPanelStyleControlsFromState()'s
            // own comment for the full account (found while
            // porting the Named Setting States feature).
            syncDevPanelStyleControlsFromState();
            // Same gap, for the "Scale With Browser" checkboxes -
            // the CSS var they drive already applies correctly via
            // applyActiveVars() regardless (the actual font-size
            // effect is never wrong), but without this the checkbox
            // itself stays visually unchecked after a restore even
            // when its cssVar is genuinely 1 - confirmed live via a
            // direct applyLoadedSettings() call before adding this.
            document.querySelectorAll('.dev-scale-with-browser-checkbox').forEach(cb => {
                const { device, desktopId } = resolveDevControlId(cb.id);
                const varName = cb.getAttribute('data-css-var');
                if (!varName) return;
                cb.checked = !!(device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars)[varName];
            });
            // Same gap, for the 40 offset-unit (px/vw-vh) checkboxes -
            // see restoreOffsetUnitCheckboxes()'s own comment.
            restoreOffsetUnitCheckboxes();
            // Same gap, for the Flash-With-Round checkbox.
            // NULL-GUARDED (2026-09-20, see this function's own
            // color-restore comment above for the full root-cause
            // account) - every checkbox/select .checked/.value
            // assignment from here to the end of this function is a
            // real dev-panel-only element that doesn't exist for a
            // non-dev visitor; each is now read into a variable
            // first so the REAL effect (a classList.toggle or
            // style.setProperty, all already separate from the
            // checkbox's own display) still applies unconditionally.
            {
                const cbFlash = document.getElementById('checkboxGameplayResultFlashWithRound');
                if (cbFlash) cbFlash.checked = !!cssVars['--gameplay-result-flash-with-round'];
            }
            // Same gap, for Base Follows Win/Lose Color - also
            // needs the .game-container CLASS itself toggled (not
            // just the checkbox's own .checked display), since
            // setting .checked programmatically here doesn't fire
            // the checkbox's onchange handler that normally does
            // that.
            {
                const baseFollowsChecked = !!cssVars['--base-follows-result-color'];
                const cbBaseFollows = document.getElementById('checkboxBaseFollowsResultColor');
                if (cbBaseFollows) cbBaseFollows.checked = baseFollowsChecked;
                document.querySelector('.game-container').classList.toggle('base-follows-result-color', baseFollowsChecked);
            }
            // Same gap, for the 4 Hide Button/Base/Backing SVG/White
            // SVG checkboxes.
            [
                ['checkboxHideButton', '--hide-button-enabled', 'hide-button'],
                ['checkboxHideBase', '--hide-base-enabled', 'hide-base'],
                ['checkboxHideBackingSvg', '--hide-backing-svg-enabled', 'hide-backing-svg'],
                ['checkboxHideWhiteSvg', '--hide-white-svg-enabled', 'hide-white-svg'],
            ].forEach(([id, varName, className]) => {
                const checked = !!cssVars[varName];
                const cb = document.getElementById(id);
                if (cb) cb.checked = checked;
                buttonAssembly.classList.toggle(className, checked);
            });
            // Same gap, for the Hide High Score checkbox.
            {
                const hideHighScoreChecked = !!cssVars['--hide-high-score-enabled'];
                const cbHideHighScore = document.getElementById('checkboxHideHighScore');
                if (cbHideHighScore) cbHideHighScore.checked = hideHighScoreChecked;
                highScoreText.classList.toggle('hidden', hideHighScoreChecked);
            }
            // Same gap, for the Hide "Click"/Hide "x" (Target Text
            // Prefix/Suffix) checkboxes.
            [
                ['checkboxHideTargetPrefix', '--target-prefix-hidden', targetCountPrefix],
                ['checkboxHideTargetSuffix', '--target-suffix-hidden', targetCountSuffix],
            ].forEach(([id, varName, el]) => {
                const checked = !!cssVars[varName];
                const cb = document.getElementById(id);
                if (cb) cb.checked = checked;
                el.classList.toggle('hidden', checked);
            });
            // Same gap, for the Round Breakdown group's own 5
            // checkboxes (each a plain classList toggle, not a
            // CSS-var consumed via applyActiveVars() - see cssVars'
            // own comment on this group) plus the Font select
            // (writes a live CSS custom property directly, also
            // not covered by any generic restore loop).
            {
                const rbEnabled = cssVars['--round-breakdown-enabled'] !== 0;
                const cbRbEnabled = document.getElementById('checkboxRoundBreakdownEnabled');
                if (cbRbEnabled) cbRbEnabled.checked = rbEnabled;
                const rbResizer = cssVars['--round-breakdown-resizer-enabled'] !== 0;
                const cbRbResizer = document.getElementById('checkboxRoundBreakdownResizerEnabled');
                if (cbRbResizer) cbRbResizer.checked = rbResizer;
                roundBreakdownResizeHandle.classList.toggle('hidden', !rbResizer);
                const rbOutline = !!cssVars['--round-breakdown-outline-enabled'];
                const cbRbOutline = document.getElementById('checkboxRoundBreakdownOutlineEnabled');
                if (cbRbOutline) cbRbOutline.checked = rbOutline;
                roundBreakdownPanel.classList.toggle('rb-outline-on', rbOutline);
                const rbTitleBold = cssVars['--round-breakdown-title-bold'] !== 0;
                const cbRbTitleBold = document.getElementById('checkboxRoundBreakdownTitleBold');
                if (cbRbTitleBold) cbRbTitleBold.checked = rbTitleBold;
                roundBreakdownPanel.classList.toggle('rb-title-bold', rbTitleBold);
                const rbDataBold = !!cssVars['--round-breakdown-data-bold'];
                const cbRbDataBold = document.getElementById('checkboxRoundBreakdownDataBold');
                if (cbRbDataBold) cbRbDataBold.checked = rbDataBold;
                roundBreakdownPanel.classList.toggle('rb-data-bold', rbDataBold);
                const rbFont = cssVars['--round-breakdown-font-family'] || 'monospace';
                const rbFontEl = document.getElementById('selectRoundBreakdownFont');
                if (rbFontEl) rbFontEl.value = rbFont;
                document.documentElement.style.setProperty('--round-breakdown-font-family', rbFont);
                // Row Divider Lines, Scale With Browser, Align/
                // Valign + Edge Lock - same "not covered by any
                // generic restore loop" gap as the rest of this
                // group.
                const rbRowLines = cssVars['--round-breakdown-row-lines-enabled'] !== 0;
                const cbRbRowLines = document.getElementById('checkboxRoundBreakdownRowLinesEnabled');
                if (cbRbRowLines) cbRbRowLines.checked = rbRowLines;
                roundBreakdownPanel.classList.toggle('rb-row-lines-on', rbRowLines);
                const rbScaleWithBrowser = !!cssVars['--round-breakdown-scale-with-browser'];
                const cbRbScaleWithBrowser = document.getElementById('checkboxRoundBreakdownScaleWithBrowser');
                if (cbRbScaleWithBrowser) cbRbScaleWithBrowser.checked = rbScaleWithBrowser;
                document.documentElement.style.setProperty('--round-breakdown-scale-with-browser', rbScaleWithBrowser ? 1 : 0);
                const rbAlign = cssVars['--round-breakdown-align'] || 'left';
                const rbAlignEl = document.getElementById('selectRoundBreakdownAlign');
                if (rbAlignEl) rbAlignEl.value = rbAlign;
                const rbAlignEdgeLock = !!cssVars['--round-breakdown-align-edge-lock'];
                const cbRbAlignEdgeLock = document.getElementById('checkboxRoundBreakdownAlignEdgeLock');
                if (cbRbAlignEdgeLock) cbRbAlignEdgeLock.checked = rbAlignEdgeLock;
                const rbValign = cssVars['--round-breakdown-valign'] || 'top';
                const rbValignEl = document.getElementById('selectRoundBreakdownValign');
                if (rbValignEl) rbValignEl.value = rbValign;
                const rbValignEdgeLock = !!cssVars['--round-breakdown-valign-edge-lock'];
                const cbRbValignEdgeLock = document.getElementById('checkboxRoundBreakdownValignEdgeLock');
                if (cbRbValignEdgeLock) cbRbValignEdgeLock.checked = rbValignEdgeLock;
                const rbAutoscroll = !!cssVars['--round-breakdown-autoscroll-enabled'];
                const cbRbAutoscroll = document.getElementById('checkboxRoundBreakdownAutoscrollEnabled');
                if (cbRbAutoscroll) cbRbAutoscroll.checked = rbAutoscroll;
                roundBreakdownPanel.classList.toggle('rb-autoscroll-on', rbAutoscroll);
            }
            // Restore hotkeys and re-render all badges
            if (settings.devHotkeys) {
                devHotkeys = structuredClone(settings.devHotkeys);
                renderAllHotkeyBadges();
            }
        } catch(e) {
            // Now logs the real error (2026-09-20) - the generic
            // "Failed to parse saved settings" message alone made
            // this critical bug far harder to diagnose than it
            // needed to be; the underlying cause was never a parse
            // failure at all, just an unguarded DOM access.
            console.error('Failed to apply loaded settings:', e);
        }
}

// Named Setting States (Save/Use/Delete/Set as Default) - multiple
// named, full-panel-state snapshots to switch between without
// losing the actual synced settings - per direct request ("I want
// to try different UI settings but dont want to overwrite old
// settings... Refer to Hando project for this Save Use Delete Set
// Default functionality"). Generalizes Hando's own buildListPickerRow()
// (Save/Use/Rename/Delete for ONE named-item control, e.g. its
// Camera/Pose presets - see its own devPanel.js) up to the WHOLE
// panel's state instead - "different setting states" (plural,
// whole states), not a per-control preset list. Reuses this
// file's OWN existing settings shape/plumbing directly (the exact
// object copySettings()/saveSettings() already build, and
// applyLoadedSettings()) rather than a parallel capture system -
// ported from .claude/TEMPLATE_DEV_PANEL.html's own [JS-13b],
// adapted to call this project's real save pipeline (git-sync-or-
// localStorage, CLAUDE.md Section 12l) for "Set as Default"
// instead of the template's plain-localStorage-only version.
// Local-only (localStorage) regardless of whether the real Save/
// Sync pipeline is git-backed - these are draft/trial states, not
// meant to sync across devices themselves; only "Set as Default"
// ever reaches the git-tracked log, via the normal saveSettings().
//
// Save: prompts for a name, snapshots the current settings under
// it - asks before overwriting an existing name (the same fix
// Hando's own picker needed after a real duplicate-name bug, see
// its own comment: saving under a name that already existed used
// to silently create a 2nd, separate item instead of updating it).
// Use: applies the selected saved state to the live game/panel
// WITHOUT touching whatever Sync/Reset would restore - a
// reversible "try it", exactly the ask. Delete: removes the
// selected saved state only. Set as Default: applies the selected
// state, THEN runs it straight through saveSettings() - THAT's
// what actually replaces what Reset/a fresh load restores; Use
// alone never does.
const CLICKO_SAVED_STATES_KEY = 'clickoSavedDevPanelStates';
function getSavedDevPanelStates() {
    try {
        const raw = localStorage.getItem(CLICKO_SAVED_STATES_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}
function setSavedDevPanelStates(states) {
    // Silently no-ops on a storage failure (full/unavailable) -
    // same tolerance as saveSettings()'s own file:// fallback.
    try { localStorage.setItem(CLICKO_SAVED_STATES_KEY, JSON.stringify(states)); } catch (e) { /* ignore */ }
}
function renderSavedDevPanelStatesList() {
    const select = document.getElementById('devSavedStatesSelect');
    if (!select) return;
    const states = getSavedDevPanelStates();
    const prevValue = select.value;
    select.innerHTML = '';
    Object.keys(states).forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
    if (states[prevValue]) select.value = prevValue;
}
// Same settings shape copySettings()/saveSettings() build - kept
// as its own (3rd) copy of that object literal rather than
// factored out, consistent with how this file already duplicates
// it between those 2 existing functions.
function captureCurrentSettingsSnapshot() {
    return { cssVars, colorVars, mobileCssVars, mobileColorVars, landscapeCssVars, landscapeColorVars, extrusionVars, mobileExtrusionVars, landscapeExtrusionVars, gameMechanics: captureGameMechanics(), devPanelStyle, mobileDevPanelStyle, landscapeDevPanelStyle, textOverrides, mobileTextOverrides, landscapeTextOverrides, textEditWrapWidths, clickBurstFrameVars, mobileClickBurstFrameVars, landscapeClickBurstFrameVars, clickBurstTextInputs, mobileClickBurstTextInputs, landscapeClickBurstTextInputs, sectionCollapseState: captureSectionCollapseState(), sectionOrder: captureSectionOrder(), devTextOverrides, devTextOverridesManual: Array.from(devTextOverridesManual), lockedGroups: Array.from(lockedGroups), devVisibility, devIndependence, devDeviceValues, stage2EngineOverrides, baseColor: document.getElementById('colorBase').value, buttonColor: document.getElementById('colorButton').value, buttonWinColor: document.getElementById('colorButtonWin').value, buttonLoseColor: document.getElementById('colorButtonLose').value };
}
function saveNamedDevPanelState() {
    const name = prompt('Save current settings as:');
    if (!name) return;
    const states = getSavedDevPanelStates();
    if (states[name] && !confirm('"' + name + '" already exists. Overwrite it?')) return;
    states[name] = JSON.parse(JSON.stringify(captureCurrentSettingsSnapshot()));
    setSavedDevPanelStates(states);
    renderSavedDevPanelStatesList();
    const select = document.getElementById('devSavedStatesSelect');
    if (select) select.value = name;
}
// Shared by Use and Set as Default - applies a saved snapshot to
// the live game/panel via this file's own real apply function,
// then re-pushes the actual visual effect (applyLoadedSettings()
// itself only updates state objects + DOM control values, same
// as the async settings-load path this mirrors).
function applyNamedDevPanelState(state) {
    applyLoadedSettings(state);
    applyActiveVars();
    applyExtrusionStyles();
}
function useNamedDevPanelState() {
    const select = document.getElementById('devSavedStatesSelect');
    const name = select && select.value;
    if (!name) return;
    const states = getSavedDevPanelStates();
    if (states[name]) applyNamedDevPanelState(states[name]);
}
function deleteNamedDevPanelState() {
    const select = document.getElementById('devSavedStatesSelect');
    const name = select && select.value;
    if (!name) return;
    if (!confirm('Delete "' + name + '"?')) return;
    const states = getSavedDevPanelStates();
    delete states[name];
    setSavedDevPanelStates(states);
    renderSavedDevPanelStatesList();
}
function setNamedDevPanelStateAsDefault() {
    const select = document.getElementById('devSavedStatesSelect');
    const name = select && select.value;
    if (!name) return;
    const states = getSavedDevPanelStates();
    const state = states[name];
    if (!state) return;
    applyNamedDevPanelState(state);
    saveSettings();
}

// Update font functions - mobile counterparts write into mobileFontVars
// instead; applyActiveVars() decides which set is actually visible.
// The shared 8-bit style font (Start/Try Again/Round/Target/Speed/
// Win-Lose - all of them, per explicit request for one dropdown) -
// not mobile-split, so unlike applyFontSelection() above this writes
// straight into extrusionVars.font and re-applies via
// applyExtrusionStyles() instead of applyActiveVars().
function update8BitFont() {
    extrusionVars.font = `"${document.getElementById('select8BitFont').value}", monospace`;
    applyExtrusionStyles();
}

// Which set of pre-drawn click-burst frames to use - a single shared
// choice, not mobile/desktop-split like the visual cssVars above
// (there's one game running, and which artwork style to use isn't a
// screen-size-driven decision the way spatial layout is). Stored in
// cssVars purely so it rides along with copySettings()/saveSettings()
// for free - see its own declaration there.
//
// Per-frame-set (Click1-4) memory for the 8 "look and feel" sliders
// below (Speed/Scale/Distance/Height/Curve Offset/Curve Amount/
// Count Floor/Count Ceiling) - each frame style remembers its own
// tuning, independent per device, per explicit request ("each frame
// type... have their own scale and speed etc settings"). cssVars/
// mobileCssVars still hold the CURRENTLY ACTIVE frame set's values
// (unchanged - every existing render/slider path keeps working as-
// is); this is a memory layer alongside it, captured on every edit
// (applySliderValue()) and restored on every frame-set switch
// (restoreClickBurstFrameVars()) - including in-session edits never
// explicitly Saved, which is the whole point (switching back to a
// frame set shows whatever you last set it to THIS session, not the
// saved-to-disk value, until you actually click SAVE).
const CLICK_BURST_SCOPED_KEYS = ['--click-burst-speed-ms', '--click-burst-scale', '--click-burst-distance-px', '--click-burst-height-px', '--click-burst-curve-offset-px', '--click-burst-curve-amount', '--click-burst-count-min', '--click-burst-count-max'];
const CLICK_FRAME_SET_NAMES = ['CLICK1', 'CLICK2', 'CLICK3', 'CLICK4'];
function seedClickBurstFrameVars(sourceVars) {
    const seed = {};
    CLICK_BURST_SCOPED_KEYS.forEach(k => { seed[k] = sourceVars[k]; });
    const perFrame = {};
    CLICK_FRAME_SET_NAMES.forEach(name => { perFrame[name] = { ...seed }; });
    return perFrame;
}
const clickBurstFrameVars = seedClickBurstFrameVars(cssVars);
const mobileClickBurstFrameVars = seedClickBurstFrameVars(mobileCssVars);
const landscapeClickBurstFrameVars = seedClickBurstFrameVars(landscapeCssVars);

// Hide Shadow position spec + guide-curve angle floor/ceiling -
// plain typed text/number inputs (not sliders, not per-frame-set),
// previously read directly from the DOM at spawn-time with no JS
// mirror at all - confirmed via search that no code path ever wrote
// their value anywhere else, so Copy/Save/Load silently never
// included them, per direct report ("make sure the color picker
// settings are also copied and saved... as well as any dropdowns
// or text boxes"). Mirrored here so they persist like every other
// control - single shared value per tab (not per-frame-set, unlike
// CLICK_BURST_SCOPED_KEYS above), matching how they're actually
// read (mobilePrefix picks the tab, not the frame set).
const clickBurstTextInputs = {
    hideShadowIndexA: '0=>2', hideShadowIndexB: '',
    rightFloorDeg: 20, rightCeilingDeg: 135,
    leftFloorDeg: 230, leftCeilingDeg: 340,
};
const mobileClickBurstTextInputs = {
    hideShadowIndexA: '0=>2', hideShadowIndexB: '-2=>-1',
    rightFloorDeg: 20, rightCeilingDeg: 135,
    leftFloorDeg: 230, leftCeilingDeg: 340,
};
// Seeded from Desktop's (changed from Mobile - flip
// mobileClickBurstTextInputs back here to revert).
const landscapeClickBurstTextInputs = structuredClone(clickBurstTextInputs);
const CLICK_BURST_TEXT_INPUT_MAP = {
    'inputClickBurstHideShadowIndexA': [clickBurstTextInputs, 'hideShadowIndexA'],
    'inputClickBurstHideShadowIndexB': [clickBurstTextInputs, 'hideShadowIndexB'],
    'inputClickBurstRightFloorDeg': [clickBurstTextInputs, 'rightFloorDeg'],
    'inputClickBurstRightCeilingDeg': [clickBurstTextInputs, 'rightCeilingDeg'],
    'inputClickBurstLeftFloorDeg': [clickBurstTextInputs, 'leftFloorDeg'],
    'inputClickBurstLeftCeilingDeg': [clickBurstTextInputs, 'leftCeilingDeg'],
    'inputMobileClickBurstHideShadowIndexA': [mobileClickBurstTextInputs, 'hideShadowIndexA'],
    'inputMobileClickBurstHideShadowIndexB': [mobileClickBurstTextInputs, 'hideShadowIndexB'],
    'inputMobileClickBurstRightFloorDeg': [mobileClickBurstTextInputs, 'rightFloorDeg'],
    'inputMobileClickBurstRightCeilingDeg': [mobileClickBurstTextInputs, 'rightCeilingDeg'],
    'inputMobileClickBurstLeftFloorDeg': [mobileClickBurstTextInputs, 'leftFloorDeg'],
    'inputMobileClickBurstLeftCeilingDeg': [mobileClickBurstTextInputs, 'leftCeilingDeg'],
    'inputLandscapeClickBurstHideShadowIndexA': [landscapeClickBurstTextInputs, 'hideShadowIndexA'],
    'inputLandscapeClickBurstHideShadowIndexB': [landscapeClickBurstTextInputs, 'hideShadowIndexB'],
    'inputLandscapeClickBurstRightFloorDeg': [landscapeClickBurstTextInputs, 'rightFloorDeg'],
    'inputLandscapeClickBurstRightCeilingDeg': [landscapeClickBurstTextInputs, 'rightCeilingDeg'],
    'inputLandscapeClickBurstLeftFloorDeg': [landscapeClickBurstTextInputs, 'leftFloorDeg'],
    'inputLandscapeClickBurstLeftCeilingDeg': [landscapeClickBurstTextInputs, 'leftCeilingDeg'],
};
function setupClickBurstTextInputs() {
    Object.keys(CLICK_BURST_TEXT_INPUT_MAP).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const [store, key] = CLICK_BURST_TEXT_INPUT_MAP[id];
        el.addEventListener('input', () => {
            store[key] = (el.type === 'number') ? parseFloat(el.value) : el.value;
        });
        // These are plain, always-present inputs (no click-to-
        // create/commit step like the dev panel's other 2 text-
        // entry mechanisms) - previously had no keydown handling
        // at all, so Enter did nothing but the field stayed
        // focused. Same scroll guard as those other 2 (see
        // preserveDevPanelScroll's own comment - reported mobile-
        // only, most likely the on-screen keyboard closing), plus
        // Enter now blurs for consistency with every other dev-
        // panel text box instead of being the one place it didn't.
        el.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') { ev.preventDefault(); preserveDevPanelScroll(() => el.blur()); }
        });
    });
}
function applyClickBurstTextInputs() {
    Object.keys(CLICK_BURST_TEXT_INPUT_MAP).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const [store, key] = CLICK_BURST_TEXT_INPUT_MAP[id];
        el.value = store[key];
    });
}

// Restores a frame set's remembered 8 values into cssVars/
// mobileCssVars AND syncs every scoped slider's own DOM value/
// readout, desktop+mobile - Object.assign into cssVars alone
// wouldn't move a slider's thumb.
function restoreClickBurstFrameVars(frameSet) {
    CLICK_BURST_SCOPED_KEYS.forEach(varName => {
        cssVars[varName] = clickBurstFrameVars[frameSet][varName];
        mobileCssVars[varName] = mobileClickBurstFrameVars[frameSet][varName];
    });
    Object.keys(CSS_VAR_SLIDER_MAP).forEach(desktopId => {
        const varName = CSS_VAR_SLIDER_MAP[desktopId];
        if (!CLICK_BURST_SCOPED_KEYS.includes(varName)) return;
        const deskEl = document.getElementById(desktopId);
        if (deskEl) {
            deskEl.value = cssVars[varName];
            const v = document.getElementById(desktopId.replace('slider', 'value'));
            if (v) v.textContent = deskEl.value;
        }
        const mobId = 'sliderMobile' + desktopId.slice('slider'.length);
        const mobEl = document.getElementById(mobId);
        if (mobEl) {
            mobEl.value = mobileCssVars[varName];
            const v = document.getElementById(mobId.replace('slider', 'value'));
            if (v) v.textContent = mobEl.value;
        }
    });
    applyActiveVars();
}

function updateClickFrameSet() {
    const frameSet = document.getElementById('selectClickFrameSet').value;
    cssVars['--click-frame-set'] = frameSet;
    restoreClickBurstFrameVars(frameSet);
}

// Swaps which of the button's two hand-drawn SVGs (normal/pressed)
// is shown at rest vs while pressed - see .game-button.flip-svg's
// own CSS. A single shared setting, same reasoning as the click
// frame set above.
function updateFlipButtonSvg() {
    const flipped = document.getElementById('checkboxFlipButtonSvg').checked;
    cssVars['--flip-button-svg'] = flipped ? 1 : 0;
    gameButton.classList.toggle('flip-svg', flipped);
}

// Toggle section collapse
// Set while a genuine drag-reorder just finished on a section title,
// so the click that naturally follows a pointerup doesn't ALSO
// toggle the group open/closed - see setupDragReorder().
let sectionJustDragged = false;
function toggleSection(titleEl) {
    if (sectionJustDragged) { sectionJustDragged = false; return; }
    // Text Edit Mode repurposes a title click into renaming it
    // instead of collapsing its group - see openDevTextEditFor()'s
    // own comment.
    if (typeof textEditModeEnabled !== 'undefined' && textEditModeEnabled) {
        openDevTextEditFor(titleEl, getSectionKey(titleEl), true);
        return;
    }
    const content = titleEl.nextElementSibling;
    content.classList.toggle('collapsed');
    titleEl.textContent = content.classList.contains('collapsed') ? '▶ ' + titleEl.textContent.slice(2) : '▼ ' + titleEl.textContent.slice(2);
}

// Adds a new, empty, user-created group - per explicit request
// ("ALLOW ME TO ADD SETTING GROUPS IN THE DEV PANEL. ONCE I MAKE AN
// EMPTY GROUP I WILL DRAG SETTINGS INTO IT"). Built from the exact
// same .dev-section/.dev-section-title/.dev-section-content shape
// every built-in group uses - toggleSection(), setupDragReorder(),
// and Text Edit Mode's title-rename all already work on ANY element
// matching that shape, generically, with no awareness of which
// groups are "built-in" vs custom, so nothing else needs touching
// for a freshly-added group to be draggable/collapsible/renameable
// immediately. Persistence needs no new storage either -
// captureSectionOrder() already walks whatever .dev-section elements
// currently exist in the DOM (not a fixed built-in list), so a
// custom group naturally gets swept into sectionOrder on the next
// Save; applySectionOrder() was updated (see its own comment) to
// CREATE a missing section instead of silently skipping one it
// doesn't recognize, which is what actually lets a custom group -
// and whatever was dragged into it - survive a reload.
// Builds one empty .dev-section/.dev-section-title/.dev-section-content
// - shared by addDevGroup() (a live, user-initiated add) and
// applySectionOrder() (recreating a custom group that was saved in a
// PREVIOUS session but doesn't exist in this page's static HTML).
function createDevGroupElement(name) {
    const section = document.createElement('div');
    section.className = 'dev-section';
    const title = document.createElement('div');
    title.className = 'dev-section-title';
    title.setAttribute('onclick', 'toggleSection(this)');
    title.dataset.sid = name;
    title.textContent = '▼ ' + name;
    const content = document.createElement('div');
    content.className = 'dev-section-content';
    section.appendChild(title);
    section.appendChild(content);
    addGroupLockIcon(section);
    addGroupDragHandle(section);
    section.appendChild(buildGroupUndockButton(section));
    return section;
}

// Builds and appends one group's own lock-toggle icon - a SIBLING
// of .dev-section-title (see .dev-group-lock-icon's own CSS
// comment for why it can't live inside the title itself). Shared
// by createDevGroupElement() (a freshly-created group) and
// injectGroupLockIcons() (every group already in the DOM at
// panel-build time) - idempotent, so calling it twice on the same
// section (e.g. a custom group recreated by applySectionOrder()
// from saved data) just replaces the old icon rather than
// duplicating it.
function addGroupLockIcon(section) {
    const existing = section.querySelector(':scope > .dev-group-lock-icon');
    if (existing) existing.remove();
    const titleEl = section.querySelector(':scope > .dev-section-title');
    if (!titleEl) return;
    const icon = document.createElement('span');
    icon.className = 'dev-group-lock-icon';
    const key = getSectionKey(titleEl);
    icon.classList.toggle('locked', lockedGroups.has(key));
    icon.textContent = lockedGroups.has(key) ? '🔒' : '🔓';
    icon.title = lockedGroups.has(key) ? 'Locked - click to unlock' : 'Unlocked - click to lock';
    icon.addEventListener('click', (e) => {
        e.stopPropagation();
        const k = getSectionKey(titleEl);
        if (lockedGroups.has(k)) { lockedGroups.delete(k); icon.textContent = '🔓'; icon.title = 'Unlocked - click to lock'; icon.classList.remove('locked'); }
        else { lockedGroups.add(k); icon.textContent = '🔒'; icon.title = 'Locked - click to unlock'; icon.classList.add('locked'); }
    });
    // pointerdown also needs stopping - setupDragReorder() listens
    // at the document level, and the icon visually overlaps the
    // title bar (the group-reorder drag HANDLE), so without this a
    // click on the icon would also arm a group-drag underneath it.
    icon.addEventListener('pointerdown', (e) => e.stopPropagation());
    section.appendChild(icon);
}

// Toggleable Settings Group - ported 2026-09-28 from
// TEMPLATE_DEV_PANEL.html's own makeDevGroupToggleable(). A group
// whose own title bar carries a checkbox controlling the WHOLE
// group's on/off state - when off, the group's entire content
// area (including any nested subgroups, at any depth) is hidden
// as ONE unit via display:none on .dev-section-content, so
// nothing inside ever renders, including an otherwise-empty
// subgroup shell.
//
// Usage: register the toggle as a NORMAL checkbox control first
// (so it rides Copy/Save/Reset/Undo exactly like any other
// setting, no special-casing needed there), THEN call this to
// relocate its real, already-wired <input> into the group's own
// title bar:
//   registerDevControlArray([{ tab: 'desktop', group: 'My Group', id: 'myGroupEnabled', type: 'checkbox', label: 'Enabled', value: true }])
//   makeDevGroupToggleable('desktop', 'My Group', 'myGroupEnabled')
// A host reads that same checkbox's value like any other
// registered checkbox control to decide whether to actually
// apply that group's settings - this function only owns the
// UI/visibility side, not the "applied" half.
//
// UNLIKE the template, this checkbox is appended as a SIBLING of
// .dev-section-title (into .dev-section itself, matching
// addGroupLockIcon()'s own convention just above) rather than as
// a child of the title - Clicko has no withPreservedTitleCheckbox()
// equivalent (its title rewrite in toggleSection()/rename is a
// raw textContent replacement), so anything meant to survive that
// rewrite has to live outside the title's own text flow, same as
// the lock icon/undock button/device checkbox already do.
function makeDevGroupToggleable(tab, groupSid, ctrlId) {
    const titleEl = document.querySelector('#' + tab + 'TabContent > .dev-section > .dev-section-title[data-sid="' + groupSid.replace(/"/g, '\\"') + '"]');
    const cb = document.getElementById(ctrlId);
    if (!titleEl || !cb || cb.type !== 'checkbox') { console.warn('makeDevGroupToggleable: group or checkbox control not found', groupSid, ctrlId); return; }
    const section = titleEl.closest('.dev-section');
    const originalRow = cb.closest('.dev-row');

    cb.classList.add('dev-group-toggle-checkbox');
    cb.title = 'Enable/disable this whole group';
    cb.addEventListener('click', e => e.stopPropagation()); // don't also collapse/expand the group via the title's own onclick
    // Matches addGroupLockIcon()'s own drag-guard just above - the
    // checkbox visually overlaps the title bar (the group-reorder
    // drag HANDLE), so without this a click here would also arm a
    // group-drag underneath it.
    cb.addEventListener('pointerdown', e => e.stopPropagation());
    section.appendChild(cb);
    if (originalRow) originalRow.remove(); // the control's own default row is now redundant - the checkbox lives in the title bar instead

    function applyState() { section.classList.toggle('dev-section-group-disabled', !cb.checked); }
    cb.addEventListener('change', applyState);
    cb.addEventListener('input', applyState); // covers whichever event a Reset/Undo/Load restore dispatches
    applyState();
}

// Undock/Dock (2026-09-20, ported from TEMPLATE_DEV_PANEL.html,
// where it was built and verified first - see .dev-group-undock-btn's
// own CSS comment for the full direct-request history). Session-
// only by design - no position/size/undocked-state persistence
// across reload/Save/Sync (see dockAllUndockedGroups()'s own
// comment) - undocking is a live viewing convenience, not a saved
// layout choice.
const undockedGroups = new Map(); // sectionEl -> { panel, parent, nextSibling, btn }
function buildGroupUndockButton(sectionEl) {
    const btn = document.createElement('span');
    btn.className = 'dev-group-undock-btn';
    btn.textContent = '↗';
    btn.title = 'Undock this group into its own floating panel';
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleGroupUndock(sectionEl, btn);
    });
    // Same reasoning as addGroupLockIcon()'s own pointerdown guard
    // just above - this icon also overlaps the group-reorder drag
    // handle's own hit area.
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    return btn;
}
// Creates the floating panel a group's content moves into while
// undocked - own drag-to-move header + 8-handle resize (reusing
// setupPanelResizeHandle()'s now-generalized setLeftTop callback,
// see its own comment, plus the same .dev-panel-resize-edge/-corner
// CSS classes the main panel uses) - position/size held as plain
// inline styles, independent per undocked panel, never persisted.
function createUndockPanel(sectionEl, titleText) {
    const rect = sectionEl.getBoundingClientRect();
    const panel = document.createElement('div');
    panel.className = 'dev-undock-panel';
    panel.style.left = Math.round(rect.left) + 'px';
    panel.style.top = Math.round(rect.top) + 'px';
    panel.style.width = Math.max(240, Math.round(rect.width)) + 'px';
    panel.style.height = Math.min(window.innerHeight - Math.round(rect.top) - 20, Math.max(160, Math.round(rect.height) + 60)) + 'px';

    const header = document.createElement('div');
    header.className = 'dev-undock-panel-header';
    const titleSpan = document.createElement('span');
    titleSpan.textContent = titleText;
    const dockBtn = document.createElement('button');
    dockBtn.className = 'dev-undock-panel-dock-btn';
    dockBtn.textContent = 'DOCK';
    dockBtn.title = 'Dock this group back into the dev panel';
    dockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const entry = undockedGroups.get(sectionEl);
        if (entry) toggleGroupUndock(sectionEl, entry.btn);
    });
    header.appendChild(titleSpan);
    header.appendChild(dockBtn);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'dev-undock-panel-body';
    panel.appendChild(body);

    ['edge-top', 'edge-bottom', 'edge-left', 'edge-right', 'corner-tl', 'corner-tr', 'corner-bl', 'corner-br'].forEach(cls => {
        const handle = document.createElement('div');
        handle.className = (cls.indexOf('edge') === 0 ? 'dev-panel-resize-edge ' : 'dev-panel-resize-corner ') + cls;
        panel.appendChild(handle);
    });
    const setLeftTop = (key, value) => { panel.style[key] = value + 'px'; };
    setupPanelResizeHandle(panel, panel.querySelector('.edge-top'), null, 'top', setLeftTop);
    setupPanelResizeHandle(panel, panel.querySelector('.edge-bottom'), null, 'bottom', setLeftTop);
    setupPanelResizeHandle(panel, panel.querySelector('.edge-left'), 'left', null, setLeftTop);
    setupPanelResizeHandle(panel, panel.querySelector('.edge-right'), 'right', null, setLeftTop);
    setupPanelResizeHandle(panel, panel.querySelector('.corner-tl'), 'left', 'top', setLeftTop);
    setupPanelResizeHandle(panel, panel.querySelector('.corner-tr'), 'right', 'top', setLeftTop);
    setupPanelResizeHandle(panel, panel.querySelector('.corner-bl'), 'left', 'bottom', setLeftTop);
    setupPanelResizeHandle(panel, panel.querySelector('.corner-br'), 'right', 'bottom', setLeftTop);

    // Drag-to-move via the header, same pattern as the main dev
    // panel's own header drag handler, simplified (no mobile-edge-
    // swipe-gesture clamping - that's specifically a concern for
    // the ALWAYS-present main panel; an undocked panel is a
    // transient, opt-in convenience).
    let dragging = false;
    let dragStart = { pointerX: 0, pointerY: 0, left: 0, top: 0 };
    header.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        e.preventDefault();
        const r = panel.getBoundingClientRect();
        dragStart = { pointerX: e.clientX, pointerY: e.clientY, left: r.left, top: r.top };
        dragging = true;
        header.classList.add('dragging');
        try { header.setPointerCapture(e.pointerId); } catch (err) {}
    });
    document.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        if (e.buttons === 0) { endDrag(e); return; }
        const panelRect = panel.getBoundingClientRect();
        const dx = e.clientX - dragStart.pointerX;
        const dy = e.clientY - dragStart.pointerY;
        const newLeft = Math.max(0, Math.min(window.innerWidth - panelRect.width, dragStart.left + dx));
        const newTop = Math.max(0, Math.min(window.innerHeight - panelRect.height, dragStart.top + dy));
        panel.style.left = Math.round(newLeft) + 'px';
        panel.style.top = Math.round(newTop) + 'px';
    });
    function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        header.classList.remove('dragging');
        if (e && e.pointerId !== undefined && header.hasPointerCapture(e.pointerId)) header.releasePointerCapture(e.pointerId);
    }
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);
    header.addEventListener('lostpointercapture', endDrag);

    document.body.appendChild(panel);
    body.appendChild(sectionEl);
    return panel;
}
// Toggles ONE group between docked (living in its normal place
// inside the main dev panel) and undocked (living in its own
// floating panel - createUndockPanel() above). Docking back uses
// the saved parent + nextSibling reference to restore the EXACT
// original position, same real-DOM-node-preservation technique
// this file's own Undo/Delete already use for byte-identical
// restoration (not a rebuild from captured data, which could drift).
function toggleGroupUndock(sectionEl, btn) {
    const entry = undockedGroups.get(sectionEl);
    if (entry) {
        if (entry.nextSibling && entry.nextSibling.parentElement === entry.parent) {
            entry.parent.insertBefore(sectionEl, entry.nextSibling);
        } else {
            entry.parent.appendChild(sectionEl);
        }
        entry.panel.remove();
        undockedGroups.delete(sectionEl);
        btn.textContent = '↗';
        btn.title = 'Undock this group into its own floating panel';
        sectionEl.classList.remove('dev-group-undocked');
    } else {
        const parent = sectionEl.parentElement;
        const nextSibling = sectionEl.nextSibling;
        const titleEl = sectionEl.querySelector(':scope > .dev-section-title');
        const titleText = titleEl ? titleEl.textContent.replace(/^[▼▶]\s*/, '') : 'Group';
        const panel = createUndockPanel(sectionEl, titleText);
        undockedGroups.set(sectionEl, { panel, parent, nextSibling, btn });
        btn.textContent = '↙';
        btn.title = 'Dock this group back into the dev panel';
        sectionEl.classList.add('dev-group-undocked');
    }
}
// Docks every currently-undocked group back into place - called
// before any operation that captures/reads the panel's structure
// from its normal DOM location (Copy/Sync/Named Setting States/
// Undo snapshot), since an undocked group's .dev-section is no
// longer a descendant of its tab's #<tab>TabContent at all (it's
// inside a floating panel, appended to document.body) and would
// otherwise be silently invisible to captureSectionOrder()/
// buildSettingsSnapshot(). Keeps undocking a purely live/transient
// state, never a saved one.
function dockAllUndockedGroups() {
    Array.from(undockedGroups.keys()).forEach(sectionEl => {
        const entry = undockedGroups.get(sectionEl);
        if (entry) toggleGroupUndock(sectionEl, entry.btn);
    });
}

// One-time pass over every group already in the DOM when the
// panel is first built (createDevGroupElement() covers any group
// added or recreated AFTER this point - see its own call to
// addGroupLockIcon()). Tab-wide per tab content root, at any
// nesting depth (plain querySelectorAll, not :scope-limited) -
// nested groups need the icon too.
function injectGroupLockIcons() {
    ['desktopTabContent', 'mobileTabContent', 'landscapeTabContent'].forEach(tabId => {
        const tabEl = document.getElementById(tabId);
        if (!tabEl) return;
        tabEl.querySelectorAll('.dev-section').forEach(addGroupLockIcon);
    });
}
// Same static-group backfill as injectGroupLockIcons() above, for
// the Undock button instead - every group that predates this
// feature needs its button injected once, here; createDevGroupElement()
// above covers any group created AFTER this feature exists.
// Idempotent (skips a section that already has one) so it's safe
// to call again.
function injectGroupUndockButtons() {
    ['desktopTabContent', 'mobileTabContent', 'landscapeTabContent'].forEach(tabId => {
        const tabEl = document.getElementById(tabId);
        if (!tabEl) return;
        tabEl.querySelectorAll('.dev-section').forEach(section => {
            if (section.querySelector(':scope > .dev-group-undock-btn')) return;
            section.appendChild(buildGroupUndockButton(section));
        });
    });
}

// Builds and appends one group's own drag-handle icon - per direct
// request ("in Handy Dandies, the settings/group reorder/nesting is
// only triggered by the icon on the far left... when i click and
// drag outside that icon, it wont move or nest things. I like
// that."). Same SIBLING-of-.dev-section-title placement and same
// shared-by-createDevGroupElement()/injectGroupDragHandles()
// idempotent pattern as addGroupLockIcon() just above, for the
// identical reason (the title's rename mechanism rewrites its own
// entire textContent). setupDragReorder()'s own pointerdown
// listener already gates on handleSelector ('.dev-group-drag-
// handle', not '.dev-section-title' anymore - see its own call
// site below), so no click/pointerdown stopPropagation is needed
// here the way the lock icon needs it: this icon IS the handle,
// it's supposed to arm a drag, and it no longer visually overlaps
// the lock icon (opposite corners) so there's no accidental-
// double-arm risk to guard against either.
function addGroupDragHandle(section) {
    const existing = section.querySelector(':scope > .dev-group-drag-handle');
    if (existing) existing.remove();
    const titleEl = section.querySelector(':scope > .dev-section-title');
    if (!titleEl) return;
    const handle = document.createElement('span');
    handle.className = 'dev-group-drag-handle';
    handle.textContent = '⠿';
    handle.title = 'Drag to reorder or nest this group';
    section.appendChild(handle);
}

// One-time pass, same reasoning/scope as injectGroupLockIcons()
// just above (createDevGroupElement() covers any group added or
// recreated after this point via its own addGroupDragHandle() call).
function injectGroupDragHandles() {
    ['desktopTabContent', 'mobileTabContent', 'landscapeTabContent'].forEach(tabId => {
        const tabEl = document.getElementById(tabId);
        if (!tabEl) return;
        tabEl.querySelectorAll('.dev-section').forEach(addGroupDragHandle);
    });
}

// Row-level counterpart, for the same request. Unlike groups, no
// per-row DOM is ever created after page load in this project (see
// applySectionOrder()'s own comment - it only ever RELOCATES
// existing rows, never fabricates new ones), so a single one-time
// pass at panel-build time (see its own call site) is the complete
// fix - no "add handle at creation time" counterpart is needed the
// way groups need createDevGroupElement()'s own call. A plain FIRST
// CHILD of .dev-row, not of .dev-label - see .dev-row-drag-handle's
// own CSS comment for why that placement needs no absolute-
// positioning workaround the way the group handle does.
function injectRowDragHandles() {
    document.querySelectorAll('.dev-row').forEach(row => {
        if (row.querySelector(':scope > .dev-row-drag-handle')) return;
        const handle = document.createElement('span');
        handle.className = 'dev-row-drag-handle';
        handle.textContent = '⠿';
        handle.title = 'Drag to reorder or move to another group';
        row.insertBefore(handle, row.firstChild);
    });
}

// Walks UP from one selected element (a .dev-row or a whole selected
// .dev-section) to every GROUP that contains it, deepest first -
// never includes the element itself, only real ancestor groups.
// Relies on the fixed DOM shape every group already has:
// .dev-section > .dev-section-content > (rows and/or subsections) -
// so "el's parent is a .dev-section-content" is exactly "el sits
// directly inside some group", and that content's own parent is the
// .dev-section that owns it. A top-level item (direct child of
// tabEl, no containing custom group) naturally produces an empty
// chain, since tabEl itself is never a .dev-section-content.
function devSelectionAncestorGroupChain(el) {
    const chain = [];
    let node = el;
    while (node.parentElement && node.parentElement.classList.contains('dev-section-content')) {
        const sec = node.parentElement.parentElement;
        if (!sec || !sec.classList.contains('dev-section')) break;
        chain.push(sec);
        node = sec;
    }
    return chain;
}
// The DEEPEST group that contains every one of the given selected
// elements, or null if they share no common containing group (all
// top-level, or spanning two subtrees with nothing in common below
// the tab root). Per direct request (2026-09-20): "the added group
// should be within the same settings group that the selected
// settings were in. If selected settings...are within different
// setting groups, place the new group in the first layer of nest
// groups that both settings are within" - e.g. selecting something
// in "# Flashing" and something in "High Score", both nested inside
// "UI Text", should nest the new group in "UI Text"; selecting two
// things both already inside "# Flashing" should nest it directly
// in "# Flashing" instead.
function findDevSelectionCommonAncestorGroup(elements) {
    if (!elements.length) return null;
    const chains = elements.map(devSelectionAncestorGroupChain);
    const [first, ...rest] = chains;
    for (const candidate of first) {
        if (rest.every(chain => chain.includes(candidate))) return candidate;
    }
    return null;
}
function addDevGroup(tab) {
    const tabEl = document.getElementById(tab + 'TabContent');
    // Considers EVERY group in the tab, not just top-level siblings
    // - now that groups-within-groups exists (see getSectionKey()'s
    // own comment on why group KEYS stay flat/unprefixed rather
    // than depending on current nesting), a new group's name still
    // needs to be unique against an EXISTING NESTED group's name
    // too, or the two would collide in captured sectionOrder
    // despite being genuinely different groups - this applies
    // regardless of where the new group itself ends up placed below.
    const existingNames = new Set(
        Array.from(tabEl.querySelectorAll('.dev-section > .dev-section-title'))
            .map(t => t.dataset.sid)
    );
    let name = 'New Group';
    let n = 2;
    while (existingNames.has(name)) { name = 'New Group (' + n + ')'; n++; }
    const section = createDevGroupElement(name);
    const selectedInTab = Array.from(devPanelSelectedItems).filter(el => tabEl.contains(el));
    // Placement (2026-09-20 rework): when there's a selection, the
    // new group now nests inside the selection's own deepest common
    // containing group (see findDevSelectionCommonAncestorGroup()'s
    // own comment) instead of always landing at the top of the
    // tab's project-specific list. Only the no-selection (or
    // no-common-ancestor, e.g. an all-top-level selection) case
    // falls back to that original top-of-list placement.
    const commonAncestor = selectedInTab.length ? findDevSelectionCommonAncestorGroup(selectedInTab) : null;
    if (commonAncestor) {
        const targetContent = commonAncestor.querySelector(':scope > .dev-section-content');
        targetContent.insertBefore(section, targetContent.firstChild);
    } else {
        // Per direct request ("When I add a new group, place it at
        // the top of the list instead of the bottom") - inserted
        // right after the built-in Dev Panel/Debug groups, which
        // stay first per CLAUDE.md Section 12i/12i-1's own mandatory
        // ordering (buttons, then Dev Panel, then Debug, THEN any
        // project-specific groups) - so this is the top of the
        // project-specific group list, not a literal position-0
        // insert that would push a new custom group above those 2
        // mandatory ones. Falls back through Debug -> Dev Panel ->
        // position 0, not straight to position 0 the moment Debug
        // isn't found at the top level - a user (or an earlier
        // fold-into-new-group action) can legally nest Debug
        // somewhere else, and jumping straight to position 0 in
        // that case would incorrectly place a new custom group
        // above Dev Panel too. Clicko's own "DEBUG" group is a
        // renamed custom group (see resolveDebugGroupSid()'s own
        // comment), so its CURRENT internal sid is resolved at
        // runtime rather than assumed to be the literal string
        // "Debug" the way the template's own built-in group is.
        // Ported from TEMPLATE_DEV_PANEL.html (2026-09-16).
        const debugSid = resolveDebugGroupSid();
        const debugSection = debugSid ? tabEl.querySelector(':scope > .dev-section > .dev-section-title[data-sid="' + debugSid + '"]')?.closest('.dev-section') : null;
        const devPanelSection = tabEl.querySelector(':scope > .dev-section > .dev-section-title[data-sid="Dev Panel"]')?.closest('.dev-section');
        const anchorSection = debugSection || devPanelSection;
        if (anchorSection) {
            tabEl.insertBefore(section, anchorSection.nextSibling);
        } else {
            tabEl.insertBefore(section, tabEl.firstChild);
        }
    }
    // Per direct request ("when i hold the Shift key... Once
    // selected, when i click Add Group, the selected things will
    // automatically be placed within the new group") - fold any
    // current selection into the group just created, scoped to
    // THIS tab only (a selection lingering from a different tab,
    // if any, is left alone rather than silently vanishing/
    // relocating cross-tab - see setupDevGroupSelection()'s own
    // comment).
    const content = section.querySelector(':scope > .dev-section-content');
    if (selectedInTab.length) {
        selectedInTab.forEach(el => content.appendChild(el));
        clearDevSelection();
        injectRowDragHandles();
    }
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Shift+click (or right-click-armed plain click) multi-select -
// ported from TEMPLATE_DEV_PANEL.html (2026-09-16), per direct
// request ("when i hold the Shift key, I will be able to select a
// single or multiple settings or groups or a mix of the two...";
// then "If i right click the Add Group button, I want to be able
// to left click mutiple settings or groups to select them, then
// when i left click or right click Add Group again, all the
// selected items will be placed within the new group."). Holds
// real DOM elements directly (a .dev-row for a selected setting, a
// .dev-section for a selected group) rather than keys/ids - a
// selection is a short-lived, purely-runtime UI gesture with no
// persistence of its own (never saved/copied), and addDevGroup()
// above just needs to move these exact nodes.
const devPanelSelectedItems = new Set();
// Set by #devAddGroupBtn's own contextmenu handler
// (setupDevHeaderIconButtons()) - while true, a PLAIN left click
// also selects (no Shift needed). Shift+click keeps working
// regardless of this flag - the two triggers are additive, not
// mutually exclusive.
let devGroupSelectionArmed = false;
function toggleDevSelection(el) {
    if (devPanelSelectedItems.has(el)) {
        devPanelSelectedItems.delete(el);
        el.classList.remove('dev-selected');
    } else {
        devPanelSelectedItems.add(el);
        el.classList.add('dev-selected');
    }
}
function clearDevSelection() {
    devPanelSelectedItems.forEach(el => el.classList.remove('dev-selected'));
    devPanelSelectedItems.clear();
}
function disarmDevGroupSelection() {
    devGroupSelectionArmed = false;
    const btn = document.getElementById('devAddGroupBtn');
    if (btn) btn.classList.remove('armed');
}
// A capturing listener on the panel itself (not each row/title
// individually) so it works uniformly for every control type.
// Capturing + preventDefault/stopPropagation together ensure a
// Shift+click (or an armed plain click) SELECTS instead of also
// operating the control under the cursor (toggling a checkbox,
// collapsing a group via the title's own onclick, etc.). A
// group's own TITLE takes priority over a row match - Shift/armed-
// clicking a group's title bar selects the WHOLE group (the
// entire .dev-section, to be moved as one nested unit), not some
// nearby row.
function setupDevGroupSelection() {
    devPanel.addEventListener('click', (e) => {
        if (!e.shiftKey && !devGroupSelectionArmed) return;
        const titleEl = e.target.closest('.dev-section-title');
        const target = titleEl ? titleEl.closest('.dev-section') : e.target.closest('.dev-row');
        if (!target) return;
        e.preventDefault();
        e.stopPropagation();
        toggleDevSelection(target);
    }, true);
    // Per the request's own explicit clear condition - only a
    // click OUTSIDE the panel clears the selection; normal clicks/
    // drags inside the panel (adjusting a slider, collapsing a
    // group, switching tabs) leave it alone. Also disarms right-
    // click select-mode, same reasoning.
    document.addEventListener('click', (e) => {
        if (devPanel.contains(e.target)) return;
        if (devPanelSelectedItems.size) clearDevSelection();
        if (devGroupSelectionArmed) disarmDevGroupSelection();
    }, true);
}

// Whichever Desktop/Mobile/Landscape tab is currently showing -
// same idiom already used elsewhere in this file (see
// captureGameMechanics()'s own device-detection block) for "which
// tab am I actually looking at right now", reused here so the
// header's own Add Group/Collapse All buttons (single shared
// controls, not one per tab any more - see their own HTML comment)
// know which tab to act on.
function getActiveDevPanelTab() {
    return !document.getElementById('mobileTabContent').classList.contains('hidden') ? 'mobile'
        : !document.getElementById('landscapeTabContent').classList.contains('hidden') ? 'landscape'
        : 'desktop';
}
// "Collapse All" - per direct request. Collapses every group (any
// nesting depth) in the currently active tab that isn't already
// collapsed - reuses toggleSection()'s own collapse/expand
// mechanics directly (not a call to toggleSection() itself, since
// that also handles Text Edit Mode's click-to-rename branch,
// irrelevant here).
function collapseAllDevGroups() {
    const tabEl = document.getElementById(getActiveDevPanelTab() + 'TabContent');
    tabEl.querySelectorAll('.dev-section-title').forEach(titleEl => {
        const content = titleEl.nextElementSibling;
        if (!content || content.classList.contains('collapsed')) return;
        content.classList.add('collapsed');
        titleEl.textContent = '▶ ' + titleEl.textContent.slice(2);
    });
}
// Wires the 3 header icon buttons - ported from
// TEMPLATE_DEV_PANEL.html (2026-09-16). Called once from top-level
// init (alongside setupTextEditMode()) - always on, regardless of
// whether the panel's own controls have been lazily built yet,
// since the header is static markup present from first paint.
function setupDevHeaderIconButtons() {
    const textEditBtn = document.getElementById('devTextEditModeBtn');
    if (textEditBtn) {
        textEditBtn.classList.toggle('active', textEditModeEnabled);
        textEditBtn.addEventListener('click', () => {
            setTextEditModeEnabled(!textEditModeEnabled);
            textEditBtn.classList.toggle('active', textEditModeEnabled);
        });
    }
    const addGroupBtn = document.getElementById('devAddGroupBtn');
    if (addGroupBtn) {
        // A plain left click: if armed (a right-click already
        // started a selection), this is the "finalize" click -
        // create the group and fold the selection in, same as a
        // right-click would (see below). If NOT armed, it's just
        // the ORIGINAL, unchanged behavior - create an empty group
        // immediately.
        addGroupBtn.addEventListener('click', () => {
            addDevGroup(getActiveDevPanelTab());
            disarmDevGroupSelection();
        });
        // Right click: arms select mode on the FIRST right-click
        // (no group created yet - just starts letting plain left-
        // clicks select). A SECOND right-click, while already
        // armed, finalizes instead - matches "when i left click or
        // right click Add Group again" (either button, once
        // armed, does the same finalize action).
        addGroupBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (devGroupSelectionArmed) {
                addDevGroup(getActiveDevPanelTab());
                disarmDevGroupSelection();
            } else {
                if (typeof devDeleteGroupArmed !== 'undefined' && devDeleteGroupArmed) disarmDevDeleteGroup();
                devGroupSelectionArmed = true;
                addGroupBtn.classList.add('armed');
            }
        });
    }
    const collapseAllBtn = document.getElementById('devCollapseAllBtn');
    if (collapseAllBtn) collapseAllBtn.addEventListener('click', collapseAllDevGroups);
    const deleteGroupBtn = document.getElementById('devDeleteGroupBtn');
    if (deleteGroupBtn) {
        // A plain click arms/disarms (toggle) - unlike Add Group,
        // Delete Group has no OTHER click behavior to stay
        // compatible with, so it doesn't need Add Group's left-vs-
        // right-click distinction. Arming this also disarms Add
        // Group's own selection-arm mode (and vice versa, in
        // devSetupDeleteGroupClickHandler below) - both being armed
        // at once would make a single group-title click ambiguous
        // between "select it" and "delete it".
        deleteGroupBtn.addEventListener('click', () => {
            if (devDeleteGroupArmed) {
                disarmDevDeleteGroup();
            } else {
                disarmDevGroupSelection();
                devDeleteGroupArmed = true;
                deleteGroupBtn.classList.add('armed');
            }
        });
    }
}
let devDeleteGroupArmed = false;
function disarmDevDeleteGroup() {
    devDeleteGroupArmed = false;
    const btn = document.getElementById('devDeleteGroupBtn');
    if (btn) btn.classList.remove('armed');
}
// Walks target's own .dev-section AND every ancestor .dev-section
// (same walk-up shape as devSearchExpandAncestors/refreshGroupCascade-
// CheckboxState elsewhere in this file), refusing deletion if ANY
// of them is either mandatory standing scaffolding (Dev Panel/
// Debug - CLAUDE.md Section 12i/12i-1) or locked - per direct
// request ("any locked groups cannot be deleted, nor can the
// settings within it"). Checking the WHOLE ancestor chain (not
// just the immediate parent) is what makes "settings within it"
// correct for a setting nested several groups deep inside a
// locked one, and also means a setting living inside Dev Panel/
// Debug is refused the same way the group itself already was.
function findDevDeleteProtectionReason(el) {
    let sec = el.closest('.dev-section');
    while (sec) {
        const titleEl = sec.querySelector(':scope > .dev-section-title');
        if (titleEl) {
            const sid = titleEl.dataset.sid;
            if (sid === 'Dev Panel' || sid === resolveDebugGroupSid()) {
                return 'mandatory standing scaffolding (CLAUDE.md Section 12i/12i-1)';
            }
            if (lockedGroups.has(getSectionKey(titleEl))) {
                return 'locked ("' + titleEl.textContent.slice(2) + '")';
            }
        }
        sec = sec.parentElement ? sec.parentElement.closest('.dev-section') : null;
    }
    return null;
}
// Per direct request ("Add a delete group button next to the add
// group function. Functionally, I will click it, it highlights
// like the add group right click, then i will click a group to
// delete"), extended per direct follow-up ("Delete button should
// also allow me to delete single settings"). A capturing listener
// on the panel (same "title takes priority over row" pattern as
// setupDevGroupSelection()) so it works uniformly for a group (any
// nesting depth) or an individual setting row; preventDefault/
// stopPropagation stop the click from also collapsing the group
// via its own onclick.
function setupDevDeleteGroup() {
    devPanel.addEventListener('click', (e) => {
        if (!devDeleteGroupArmed) return;
        if (e.target.closest('#devDeleteGroupBtn')) return;
        const titleEl = e.target.closest('.dev-section-title');
        const target = titleEl ? titleEl.closest('.dev-section') : e.target.closest('.dev-row');
        if (!target) return;
        e.preventDefault();
        e.stopPropagation();
        const reason = findDevDeleteProtectionReason(target);
        if (reason) {
            console.warn('Delete: refused - ' + reason);
            disarmDevDeleteGroup();
            return;
        }
        // pushDevDeleteUndoEntry(), not the generic pointerdown-
        // based snapshot push - see that function's own comment
        // for why a plain value snapshot can't actually undo a
        // deletion. parent/nextSibling captured BEFORE remove() so
        // undo can put the node back in its exact original spot.
        const parent = target.parentElement;
        const nextSibling = target.nextElementSibling;
        target.remove();
        pushDevDeleteUndoEntry(target, parent, nextSibling);
        disarmDevDeleteGroup();
    }, true);
    document.addEventListener('click', (e) => {
        if (devPanel.contains(e.target)) return;
        if (devDeleteGroupArmed) disarmDevDeleteGroup();
    }, true);
}

// ================================================================
// SET HOTKEY FEATURE -- added 2026-09-30, direct request: bind a
// 1-2 letter SEQUENTIAL key combo (typed in order, not held
// simultaneously) to a checkbox/button/slider. Desktop only (never
// shown/armed/listened-for on a touch device -- "Do not show
// hotkeys on mobile").
// ================================================================
const devHotkeyIsTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
let devHotkeys = {}; // { [keySequence]: { id, type: 'checkbox'|'button'|'slider' } }
let devSetHotkeyArmed = false;
// Which element/control types are eligible -- explicitly excludes
// dropdowns (<select>), curve editors and color pickers (neither is
// a plain checkbox/range/button element so both are naturally
// excluded below without a special case), group-label buttons
// (expand/undock/lock, all live inside .dev-section-title), the row/
// group drag-handle (a <span>, not a button, also naturally
// excluded), and item-selector/list-picker rows (.dev-list-picker).
function getHotkeyEligibleTarget(e) {
    if (e.target.closest('.dev-section-title')) return null;
    if (e.target.closest('.dev-list-picker')) return null;
    if (e.target.closest('.dev-header-buttons')) return null;
    if (e.target.closest('.dev-slider-bound-editable')) return null;
    if (e.target.closest('.dev-hotkey-badge') || e.target.closest('.dev-hotkey-input')) return null;
    const checkbox = e.target.closest('input[type="checkbox"]');
    if (checkbox && checkbox.closest('.dev-row')) return { el: checkbox, type: 'checkbox' };
    const slider = e.target.closest('input[type="range"]');
    if (slider && slider.closest('.dev-row')) return { el: slider, type: 'slider' };
    const button = e.target.closest('button');
    if (button && button.closest('.dev-row, .dev-buttons')) return { el: button, type: 'button' };
    return null;
}
function disarmSetHotkey() {
    devSetHotkeyArmed = false;
    const btn = document.getElementById('devSetHotkeyBtn');
    if (btn) btn.classList.remove('armed');
}
function setupSetHotkeyButton() {
    const btn = document.getElementById('devSetHotkeyBtn');
    if (!btn) return;
    if (devHotkeyIsTouchDevice) { btn.style.display = 'none'; return; }
    btn.addEventListener('click', () => {
        if (devSetHotkeyArmed) {
            disarmSetHotkey();
        } else {
            disarmDevGroupSelection();
            disarmDevDeleteGroup();
            devSetHotkeyArmed = true;
            btn.classList.add('armed');
        }
    });
}
function insertHotkeyElementIntoRow(row, el, targetEl) {
    const handle = row.querySelector(':scope > .dev-row-drag-handle');
    if (handle) { row.insertBefore(el, handle); return; }
    if (targetEl && targetEl.parentNode === row) { row.insertBefore(el, targetEl); return; }
    row.insertBefore(el, row.firstChild || null);
}
function findExistingHotkeyKeyForControl(controlId) {
    for (const [key, entry] of Object.entries(devHotkeys)) { if (entry.id === controlId) return key; }
    return null;
}
function renderHotkeyBadgeForRow(row, controlId, controlType) {
    const existingEl = row.querySelector(':scope > [data-hotkey-target="' + controlId + '"]');
    if (existingEl) existingEl.remove();
    const key = findExistingHotkeyKeyForControl(controlId);
    if (!key) return;
    const badge = document.createElement('span');
    badge.className = 'dev-hotkey-badge';
    badge.dataset.hotkeyTarget = controlId;
    badge.textContent = key;
    badge.title = 'Double-click to edit, double-right-click to delete';
    let lastContextmenuAt = 0;
    badge.addEventListener('dblclick', (e) => {
        e.preventDefault(); e.stopPropagation();
        startHotkeyEdit(row, controlId, controlType, key);
    });
    badge.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        const now = performance.now();
        if (now - lastContextmenuAt < getHotkeySequenceWindowMs()) {
            pushDevPanelUndoSnapshot(); devRedoStack = [];
            delete devHotkeys[key];
            renderHotkeyBadgeForRow(row, controlId, controlType);
            refreshHotkeysListSubgroup();
        }
        lastContextmenuAt = now;
    });
    insertHotkeyElementIntoRow(row, badge, document.getElementById(controlId));
}
function startHotkeyEdit(row, controlId, controlType, existingKey) {
    const existingEl = row.querySelector(':scope > [data-hotkey-target="' + controlId + '"]');
    if (existingEl) existingEl.remove();
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'dev-hotkey-input';
    input.dataset.hotkeyTarget = controlId;
    input.maxLength = 2;
    if (existingKey) input.value = existingKey;
    insertHotkeyElementIntoRow(row, input, document.getElementById(controlId));
    input.focus(); input.select();
    let settled = false;
    function commit() {
        if (settled) return; settled = true;
        const typed = input.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 2);
        input.remove();
        if (typed) {
            pushDevPanelUndoSnapshot(); devRedoStack = [];
            if (existingKey && existingKey !== typed) delete devHotkeys[existingKey];
            devHotkeys[typed] = { id: controlId, type: controlType };
        } else if (existingKey) {
            pushDevPanelUndoSnapshot(); devRedoStack = [];
            delete devHotkeys[existingKey];
        }
        renderHotkeyBadgeForRow(row, controlId, controlType);
        refreshHotkeysListSubgroup();
    }
    function cancel() {
        if (settled) return; settled = true;
        input.remove();
        renderHotkeyBadgeForRow(row, controlId, controlType);
    }
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); cancel(); }
    });
    input.addEventListener('click', (ev) => ev.stopPropagation());
}
function startHotkeyEditForHeaderBtn(buttonEl, existingKey) {
    // Floating modal for header button hotkey assignment
    let modal = document.getElementById('devHotkeyModalInput');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'devHotkeyModalInput';
    modal.className = 'dev-hotkey-modal';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type hotkey (e.g., s, ctrl+s, shift+d)';
    input.maxLength = 20;
    if (existingKey) input.value = existingKey;
    modal.appendChild(input);
    document.body.appendChild(modal);
    input.focus(); input.select();
    let settled = false;
    function commit() {
        if (settled) return; settled = true;
        const typed = input.value.trim().toLowerCase().replace(/[^a-z0-9+]/g, '');
        modal.remove();
        if (typed) {
            pushDevPanelUndoSnapshot(); devRedoStack = [];
            if (existingKey && existingKey !== typed) delete devHotkeys[existingKey];
            devHotkeys[typed] = { id: buttonEl.id, type: 'button' };
        } else if (existingKey) {
            pushDevPanelUndoSnapshot(); devRedoStack = [];
            delete devHotkeys[existingKey];
        }
        refreshHotkeysListSubgroup();
    }
    function cancel() {
        if (settled) return; settled = true;
        modal.remove();
    }
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); cancel(); }
    });
}
function setupHotkeyAssignmentCapture() {
    if (devHotkeyIsTouchDevice) return;
    devPanel.addEventListener('click', (e) => {
        if (!devSetHotkeyArmed) return;
        if (e.target.closest('#devSetHotkeyBtn')) return;
        const eligible = getHotkeyEligibleTarget(e);
        if (!eligible) return;
        e.preventDefault();
        e.stopPropagation();
        const row = eligible.el.closest('.dev-row, .dev-buttons');
        if (!row) return;
        if (!eligible.el.id) { console.warn('Set Hotkey: target has no id, cannot bind'); return; }
        startHotkeyEdit(row, eligible.el.id, eligible.type, findExistingHotkeyKeyForControl(eligible.el.id));
    }, true);
    // Header button hotkey assignment (icon buttons, collapse, hide)
    devPanel.addEventListener('click', (e) => {
        if (!devSetHotkeyArmed) return;
        if (e.target.closest('#devSetHotkeyBtn')) return;
        const headerBtn = e.target.closest('.dev-header-icon-btn, .dev-collapse-btn, .dev-hide-btn');
        if (!headerBtn) return;
        e.preventDefault();
        e.stopPropagation();
        if (!headerBtn.id) { console.warn('Set Hotkey: header button has no id, cannot bind'); return; }
        startHotkeyEditForHeaderBtn(headerBtn, findExistingHotkeyKeyForControl(headerBtn.id));
    }, true);
    document.addEventListener('click', (e) => {
        if (devPanel.contains(e.target)) return;
        if (devSetHotkeyArmed) disarmSetHotkey();
    }, true);
}
function renderAllHotkeyBadges() {
    if (devHotkeyIsTouchDevice) return;
    const seenIds = new Set();
    Object.values(devHotkeys).forEach((entry) => seenIds.add(entry.id));
    document.querySelectorAll('.dev-hotkey-badge, .dev-hotkey-input').forEach((el) => {
        if (el.dataset.hotkeyTarget) seenIds.add(el.dataset.hotkeyTarget);
    });
    seenIds.forEach((id) => {
        if (!id) return;
        const el = document.getElementById(id);
        const row = el && el.closest('.dev-row, .dev-buttons');
        if (!row) return;
        const type = el.type === 'checkbox' ? 'checkbox' : el.type === 'range' ? 'slider' : 'button';
        renderHotkeyBadgeForRow(row, id, type);
    });
    refreshHotkeysListSubgroup();
}

// ================================================================
// Key-sequence detection engine -- keys typed IN ORDER within a
// configurable window (default 500ms), not held simultaneously.
// ================================================================
function getHotkeySequenceWindowMs() {
    const el = document.getElementById('sliderDevHotkeySequenceWindow');
    return el ? parseFloat(el.value) || 500 : 500;
}
let hotkeyKeyBuffer = '';
let hotkeyBufferTimer = null;
function resetHotkeyBuffer() {
    hotkeyKeyBuffer = '';
    if (hotkeyBufferTimer) { clearTimeout(hotkeyBufferTimer); hotkeyBufferTimer = null; }
}
function isTypingIntoAnInput(e) {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}
function processHotkeyBuffer() {
    const exact = devHotkeys[hotkeyKeyBuffer];
    const hasLongerPossibleMatch = hotkeyKeyBuffer.length === 1 && Object.keys(devHotkeys).some((k) => k.length === 2 && k.startsWith(hotkeyKeyBuffer));
    if (hasLongerPossibleMatch) {
        clearTimeout(hotkeyBufferTimer);
        hotkeyBufferTimer = setTimeout(() => {
            if (devHotkeys[hotkeyKeyBuffer]) triggerHotkey(devHotkeys[hotkeyKeyBuffer]);
            resetHotkeyBuffer();
        }, getHotkeySequenceWindowMs());
        return;
    }
    if (exact) triggerHotkey(exact);
    resetHotkeyBuffer();
}
function triggerHotkey(entry) {
    const el = document.getElementById(entry.id);
    if (!el) return;
    if (entry.type === 'checkbox') {
        pushDevPanelUndoSnapshot(); devRedoStack = [];
        el.checked = !el.checked;
        el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (entry.type === 'button') {
        pushDevPanelUndoSnapshot(); devRedoStack = [];
        el.click();
        if (typeof window.requestRender === 'function') window.requestRender();
    } else if (entry.type === 'slider') {
        enterSliderHotkeyMode(el);
    }
}
function buildModifierKeyCombo(e) {
    // Build modifier+key string for immediate lookup, e.g., "ctrl+s", "shift+d", "alt+c"
    // Normalize: always lowercase, exclude metaKey (cmd) since it conflicts with OS
    const mods = [];
    if (e.ctrlKey || e.metaKey) mods.push('ctrl'); // Treat Cmd as Ctrl on Mac
    if (e.shiftKey) mods.push('shift');
    if (e.altKey) mods.push('alt');
    if (mods.length === 0) return null; // No modifiers pressed
    const key = e.key.toLowerCase();
    // Only alphanumeric + common symbols (-, +, =, etc.) are valid
    if (!/^[a-z0-9\-+=\[\]\\;:'",.<>/?]$/i.test(key)) return null;
    return mods.join('+') + '+' + key;
}
function setupHotkeySequenceListener() {
    if (devHotkeyIsTouchDevice) return;
    document.addEventListener('keydown', (e) => {
        if (activeSliderHotkey) { handleSliderHotkeyModeKey(e); return; }
        if (isTypingIntoAnInput(e)) return;
        // Modifier+key combos trigger immediately (not buffered)
        const modCombo = buildModifierKeyCombo(e);
        if (modCombo) {
            e.preventDefault();
            if (devHotkeys[modCombo]) {
                triggerHotkey(devHotkeys[modCombo]);
            }
            return;
        }
        // Single alphanumeric keys are buffered (existing behavior)
        if (!/^[a-z0-9]$/i.test(e.key)) return;
        hotkeyKeyBuffer += e.key.toLowerCase();
        if (hotkeyKeyBuffer.length > 2) hotkeyKeyBuffer = hotkeyKeyBuffer.slice(-2);
        processHotkeyBuffer();
    });
}

// ================================================================
// Slider Hotkey Mode -- triggering a slider's hotkey doesn't change
// anything immediately; it arms arrow-key adjustment instead, shown
// via a small HUD next to the floating DEV toggle button.
// ================================================================
let activeSliderHotkey = null; // { el, baseStep, multiplier }
function getSliderHotkeyHud() {
    let hud = document.getElementById('devHotkeyHud');
    if (!hud) {
        hud = document.createElement('div');
        hud.id = 'devHotkeyHud';
        hud.className = 'dev-hotkey-hud';
        hud.style.display = 'none';
        document.body.appendChild(hud);
    }
    return hud;
}
function updateSliderHotkeyHud() {
    if (!activeSliderHotkey) return;
    const { el, baseStep, multiplier } = activeSliderHotkey;
    const label = el.closest('.dev-row')?.querySelector('.dev-label')?.textContent || el.id;
    const hud = getSliderHotkeyHud();
    hud.innerHTML = '<span class="dev-hotkey-hud-label">' + label + '</span> = ' + el.value + ' (step ' + (baseStep * multiplier) + ')';
    hud.style.display = 'block';
}
function enterSliderHotkeyMode(el) {
    pushDevPanelUndoSnapshot(); devRedoStack = [];
    activeSliderHotkey = { el, baseStep: parseFloat(el.step) || 1, multiplier: 1 };
    updateSliderHotkeyHud();
}
function exitSliderHotkeyMode() {
    activeSliderHotkey = null;
    const hud = document.getElementById('devHotkeyHud');
    if (hud) hud.style.display = 'none';
}
function handleSliderHotkeyModeKey(e) {
    if (!activeSliderHotkey) return;
    const { el, baseStep, multiplier } = activeSliderHotkey;
    if (e.key === 'Escape') { e.preventDefault(); exitSliderHotkeyMode(); return; }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); activeSliderHotkey.multiplier *= 10; updateSliderHotkeyHud(); return; }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); activeSliderHotkey.multiplier = Math.max(0.001, activeSliderHotkey.multiplier / 10); updateSliderHotkeyHud(); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = baseStep * multiplier * (e.key === 'ArrowUp' ? 1 : -1);
        const min = parseFloat(el.min), max = parseFloat(el.max);
        let val = (parseFloat(el.value) || 0) + step;
        if (!isNaN(min)) val = Math.max(min, val);
        if (!isNaN(max)) val = Math.min(max, val);
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        updateSliderHotkeyHud();
    }
}
function setupSliderHotkeyModeExitWatcher() {
    if (devHotkeyIsTouchDevice) return;
    ['input', 'change', 'click'].forEach((evtName) => {
        document.addEventListener(evtName, (e) => {
            if (!activeSliderHotkey) return;
            if (e.target === activeSliderHotkey.el) return;
            if (e.target.closest && e.target.closest('#devHotkeyHud')) return;
            exitSliderHotkeyMode();
        }, true);
    });
}

// ================================================================
// "Hotkeys" subgroup, inside the built-in "Dev Panel" group -- lists
// every current hotkey/function pair, with the same double-click-
// edit / double-right-click-delete interaction as an inline badge,
// plus the Sequence Window (Ms) timing slider.
// ================================================================
function ensureHotkeysSubgroup() {
    if (devHotkeyIsTouchDevice) return null;
    const devPanelSec = Array.from(document.querySelectorAll('#desktopTabContent > .dev-section')).find((s) => {
        const t = s.querySelector(':scope > .dev-section-title');
        return t && (t.dataset.sid || t.textContent.replace(/^[▼▶]\s*/, '')) === 'Dev Panel';
    });
    if (!devPanelSec) return null;
    const content = devPanelSec.querySelector(':scope > .dev-section-content');
    let existing = content.querySelector(':scope > .dev-section[data-sid="Hotkeys"]');
    if (existing) return existing;
    const g = createDevGroupElement('Hotkeys', 'desktop');
    content.appendChild(g);
    const gc = g.querySelector(':scope > .dev-section-content');
    const sliderRow = buildUniformControlRow({ id: 'sliderDevHotkeySequenceWindow', label: 'Hotkey Sequence Window (Ms)', type: 'slider', min: 100, max: 2000, step: 'any', value: 500, skipDeviceCheckbox: true });
    gc.appendChild(sliderRow);
    const listContainer = document.createElement('div');
    listContainer.id = 'devHotkeysListContainer';
    gc.appendChild(listContainer);
    return g;
}
function refreshHotkeysListSubgroup() {
    if (devHotkeyIsTouchDevice) return;
    const container = document.getElementById('devHotkeysListContainer');
    if (!container) return;
    container.innerHTML = '';
    const entries = Object.entries(devHotkeys);
    if (!entries.length) {
        const empty = document.createElement('div');
        empty.style.cssText = 'font-size:10px; color:#888; padding:2px 0;';
        empty.textContent = 'No hotkeys set yet.';
        container.appendChild(empty);
        return;
    }
    entries.forEach(([key, entry]) => {
        const el = document.getElementById(entry.id);
        const targetContainer = el ? el.closest('.dev-row, .dev-buttons') : null;
        const label = targetContainer?.querySelector('.dev-label')?.textContent || entry.id;
        const row = document.createElement('div');
        row.className = 'dev-row';
        row.style.cssText = 'display:flex; align-items:center; gap:6px;';
        const badge = document.createElement('span');
        badge.className = 'dev-hotkey-badge';
        badge.textContent = key;
        badge.title = 'Double-click to edit, double-right-click to delete';
        let lastContextmenuAt = 0;
        badge.addEventListener('dblclick', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (targetContainer) startHotkeyEdit(targetContainer, entry.id, entry.type, key);
        });
        badge.addEventListener('contextmenu', (e) => {
            e.preventDefault(); e.stopPropagation();
            const now = performance.now();
            if (now - lastContextmenuAt < getHotkeySequenceWindowMs()) {
                pushDevPanelUndoSnapshot(); devRedoStack = [];
                delete devHotkeys[key];
                if (targetContainer) renderHotkeyBadgeForRow(targetContainer, entry.id, entry.type);
                refreshHotkeysListSubgroup();
            }
            lastContextmenuAt = now;
        });
        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;
        row.appendChild(badge);
        row.appendChild(labelSpan);
        container.appendChild(row);
    });
}

// Infinite undo (2026-09-17) - per direct request ("Add... an undo
// button. It will undo any dev panel changes be it reordering,
// setting input change, renaming, group nesting, anything. And
// allow me to undo infinitely until the last save click"), later
// clarified as session-only ("the undo only remembers changes
// within that browser session. so if i refresh, the undo wont do
// anything... it rememebrs all changes from that moment, until i
// click save, then it starts new again").
//
// Implementation: a plain in-memory stack of FULL PANEL SNAPSHOTS
// (buildSettingsSnapshot() - the exact same object Copy/Save/Named
// Setting States already use), not a log of individual diffs. This
// is deliberate, not a shortcut - the dev panel's mutation surface
// is enormous (every slider/color/checkbox/select, drag-reorder of
// both groups and rows, rename, add/delete group, fold-into-group
// nesting, lock/unlock, visibility/independence toggles...) and
// buildSettingsSnapshot() ALREADY captures every one of those in
// one call (values, sectionOrder - which recursively captures
// group/row structure AND nesting, sectionCollapseState,
// devTextOverrides for renames, lockedGroups, devVisibility/
// devIndependence/devDeviceValues). A full-snapshot stack is
// simply the correct tool for "undo literally anything" - a
// per-field diff system would need its own bespoke handling for
// every one of those mutation shapes and still end up rebuilding
// the same full-state application logic applyLoadedSettings()
// already has to restore a group that no longer exists in the
// DOM (see its own "recreate a missing section" comment) - undo
// needs exactly that same capability for undoing a delete.
//
// WHEN a snapshot gets pushed: not wired into each of those dozen+
// mutation code paths individually. Instead, ONE capturing
// 'pointerdown' listener on the whole panel pushes a snapshot the
// FIRST time the pointer goes down inside it, gated to once per
// "gesture" (reset on pointerup/pointercancel) - pointerdown fires
// before essentially every kind of interaction this panel has
// (grabbing a drag handle, starting a slider drag, opening a
// color/select picker, clicking a checkbox, clicking a group title
// to rename or collapse, clicking Lock/Delete Group/Add Group),
// so this single hook captures the pre-action state for all of
// them without touching their own individual handlers. A multi-
// tick drag (a slider dragged across many 'input' events, or a
// reorder dragged across many pointermove events) is correctly
// captured as ONE undo step, not one per tick, since the gesture
// gate only pushes on the drag's own initial pointerdown.
let devUndoStack = [];
let devUndoGestureActive = false;
// Extension point for state Undo can't see on its own (ported
// 2026-09-28 from TEMPLATE_DEV_PANEL.html's own generalization of
// this exact mechanism). buildSettingsSnapshot() already includes
// stage2EngineOverrides directly, so Clicko's own concrete gap
// isn't missing snapshot DATA - it's that the pointerdown-gated
// push below is scoped to `devPanel`'s own DOM, and the UI-Engine
// Inspector (#stage2InspectorPanel) is a separate, sibling
// top-level element, never nested inside devPanel - so dragging an
// element via the Inspector never triggered a pre-change snapshot
// push at all (see setupDevPanelUndo()'s own extended listener
// below, which closes that specific gap). These 2 extension points
// are kept anyway, at template parity, for any FUTURE state that
// truly lives outside buildSettingsSnapshot()'s own JSON structure.
let devUndoCaptureExtra = null;
let devUndoApplyExtra = null;
// Save/Load's own equivalent of the pair above - same reasoning,
// different pipeline (template parity; unused for now since
// stage2EngineOverrides is already inside buildSettingsSnapshot()
// and saveSettings() already captures it that way).
let devSaveCaptureExtra = null;
let devSaveApplyExtra = null;
function pushDevPanelUndoSnapshot() {
    // Deep-cloned (JSON round-trip - every field buildSettingsSnapshot()
    // returns is already plain JSON-safe data, per its own
    // Array.from() conversions for the 2 Set fields) - REQUIRED,
    // not a defensive extra: buildSettingsSnapshot() returns its
    // cssVars/colorVars/etc. fields by plain reference, the SAME
    // live objects setupDevSliders()'s own 'input' handler mutates
    // in place on every future edit. Pushing the object literal
    // as-is (caught live: a slider dragged from 42.5 to 55, then
    // Undo, "restored" to 55 instead of 42.5) meant every
    // snapshot already on the stack silently changed underneath
    // Undo the moment ANY later edit touched the same underlying
    // state object, since they were never actually 2 separate
    // objects to begin with. Same reasoning applies to `extra`.
    const extra = devUndoCaptureExtra ? devUndoCaptureExtra() : undefined;
    devUndoStack.push({
        kind: 'snapshot',
        data: JSON.parse(JSON.stringify(buildSettingsSnapshot())),
        extra: extra !== undefined ? JSON.parse(JSON.stringify(extra)) : undefined
    });
}
// A SEPARATE undo-entry kind, specifically for deleting a group or
// setting (pushDevDeleteUndoEntry(), called from setupDevDeleteGroup()'s
// own click handler) - NOT just another pushDevPanelUndoSnapshot()
// call. A value-snapshot only captures VALUES/ORDER/renames -
// buildSettingsSnapshot()'s own sectionOrder can recreate a
// deleted GROUP as an empty shell (applySectionOrder()'s own
// "recreate a missing section" fallback), but has no equivalent
// way to recreate a deleted setting's actual control markup (its
// type/min/max/id aren't derivable from a bare row-key string),
// and even for a group, restoring the empty shell while all its
// own child rows/subgroups silently stay gone is NOT a real undo
// (caught live: deleting the "Background" group then clicking
// Undo brought the group NAME back but its own settings did not -
// confirmed by checking its restored row count). The fix: capture
// the REAL, LIVE DOM node being removed (not a clone - a live
// node keeps its own already-wired event listeners, so no
// re-wiring is needed on restore) plus exactly where it sat
// (parent + nextSibling), and put it straight back on undo -
// full-fidelity by construction, for a group (with all its own
// contents, at any nesting depth) or a single setting row alike.
function pushDevDeleteUndoEntry(node, parent, nextSibling) {
    devUndoStack.push({ kind: 'delete', node, parent, nextSibling });
    devRedoStack = []; // a genuine new edit invalidates any pending redo history
}
// Redo - direct request 2026-09-28, ported from
// TEMPLATE_DEV_PANEL.html's own generalization of this exact
// mechanism (which was itself originally ported FROM Clicko's
// undo stack before Redo was added on top). A separate LIFO
// stack, populated only by undoDevPanelChange()/redoDevPanelChange()
// themselves (never by a real edit directly - setupDevPanelUndo()'s
// own pointerdown listener clears it instead). For a 'delete'
// entry, undo and redo are exact mirror images of the same
// {node, parent, nextSibling} descriptor - reusing the SAME object
// for both directions is correct by construction, since
// re-inserting then re-removing the same node at the same anchor
// point is a well-defined, reversible pair of DOM operations.
let devRedoStack = [];
function undoDevPanelChange() {
    if (!devUndoStack.length) return;
    const entry = devUndoStack.pop();
    if (entry.kind === 'delete') {
        devRedoStack.push(entry); // redoing = deleting this same node again
        if (entry.nextSibling && entry.nextSibling.parentNode === entry.parent) {
            entry.parent.insertBefore(entry.node, entry.nextSibling);
        } else {
            entry.parent.appendChild(entry.node);
        }
    } else {
        const extra = devUndoCaptureExtra ? devUndoCaptureExtra() : undefined;
        devRedoStack.push({
            kind: 'snapshot',
            data: JSON.parse(JSON.stringify(buildSettingsSnapshot())),
            extra: extra !== undefined ? JSON.parse(JSON.stringify(extra)) : undefined
        });
        applySettingsSnapshotLive(entry.data);
        if (entry.extra !== undefined && devUndoApplyExtra) devUndoApplyExtra(entry.extra);
    }
}
function redoDevPanelChange() {
    if (!devRedoStack.length) return;
    const entry = devRedoStack.pop();
    if (entry.kind === 'delete') {
        devUndoStack.push(entry); // undoing the redo = re-inserting it again
        entry.node.remove();
    } else {
        pushDevPanelUndoSnapshot();
        applySettingsSnapshotLive(entry.data);
        if (entry.extra !== undefined && devUndoApplyExtra) devUndoApplyExtra(entry.extra);
    }
}
// How long a "gesture" is allowed to hold the undo-push gate open
// with no matching pointerup - see setupDevPanelUndo()'s own
// comment for why this exists (a real, confirmed bug: opening a
// NATIVE color picker, this panel's own <input type="color">
// controls, never delivers a pointerup back to the page at all -
// the OS-level picker dialog eats it - which permanently stuck
// devUndoGestureActive at true and silently broke EVERY undo push
// for the rest of the session after the first color picker use,
// exactly matching a real report of "undo does nothing" across
// checkboxes/sliders/group-deletion once a color picker had
// already been touched). Generous on purpose - real slider/reorder
// drags can legitimately run a few seconds; this is a safety net
// for a genuinely abandoned/swallowed gesture, not a normal timer.
const DEV_UNDO_GESTURE_TIMEOUT_MS = 2000;
let devUndoGestureTimer = null;
function resetDevUndoGesture() {
    devUndoGestureActive = false;
    if (devUndoGestureTimer) { clearTimeout(devUndoGestureTimer); devUndoGestureTimer = null; }
}
// Shared pointerdown gesture handler, extracted 2026-09-28 so it
// can be attached to BOTH devPanel AND #stage2InspectorPanel - the
// UI-Engine Inspector is a separate, sibling top-level element
// (never nested inside devPanel), so dragging an element's
// position/size via the Inspector never triggered a pre-change
// undo snapshot at all until this extension (stage2EngineOverrides
// was already captured correctly inside buildSettingsSnapshot()
// once a push DID happen - the gap was purely the push TRIGGER's
// scope, not missing snapshot data).
function handleDevUndoGesturePointerdown(e) {
    if (devUndoGestureActive) return;
    // While Delete Group/Setting is armed, the very next click
    // either deletes something (which pushes its own precise
    // pushDevDeleteUndoEntry() instead - see that function's
    // comment for why a plain snapshot can't undo a deletion)
    // or is refused/disarms with no mutation at all - a plain
    // value snapshot here would be a dead, unpoppable-to-any-
    // useful-state entry either way, so skip it.
    if (devDeleteGroupArmed) return;
    // THE root cause of a real, confirmed "Undo does literally
    // nothing" report (2026-09-17): the Undo button is itself
    // inside devPanel, so clicking it ALSO fires this same
    // capturing pointerdown listener - without this guard, a
    // click on Undo would push a snapshot of the CURRENT
    // (already-changed) state, then its own 'click' handler
    // immediately pops that SAME just-pushed entry, restoring
    // the current state onto itself - a complete no-op that
    // leaves the user's real prior change buried, untouched,
    // one slot deeper on the stack (confirmed live: after one
    // real edit + one real Undo click, devUndoStack.length was
    // 1, not the correct 0). Every one of THIS session's own
    // earlier tests used undoBtn.click() (the JS method) to
    // trigger Undo, which - as already independently
    // discovered once this session for a checkbox - does NOT
    // fire pointerdown/mousedown at all, only 'click' directly,
    // which is exactly why this never showed up in testing
    // despite extensive verification; only a REAL mouse click
    // (or a synthetic pointerdown+click pair) exposes it.
    // Redo button needs the exact same self-push guard as Undo,
    // for the identical reason (it's also inside devPanel).
    if (e.target.closest('#devUndoBtn') || e.target.closest('#devRedoBtn')) return;
    devUndoGestureActive = true;
    pushDevPanelUndoSnapshot();
    // A genuine new edit invalidates any pending redo history -
    // standard undo/redo semantics, direct request 2026-09-28.
    devRedoStack = [];
    // Belt-and-suspenders reset, on top of the real pointerup/
    // pointercancel/focus listeners below - if NONE of those
    // ever fire for some reason this hasn't been discovered
    // yet, the gate still can't stay stuck forever.
    devUndoGestureTimer = setTimeout(resetDevUndoGesture, DEV_UNDO_GESTURE_TIMEOUT_MS);
}
function setupDevPanelUndo() {
    devPanel.addEventListener('pointerdown', handleDevUndoGesturePointerdown, true);
    const inspectorPanel = document.getElementById('stage2InspectorPanel');
    if (inspectorPanel) inspectorPanel.addEventListener('pointerdown', handleDevUndoGesturePointerdown, true);
    document.addEventListener('pointerup', resetDevUndoGesture, true);
    document.addEventListener('pointercancel', resetDevUndoGesture, true);
    // Catches the native-picker-eats-pointerup case directly - the
    // window reliably regains focus the moment a native color/
    // file/date picker (or any other OS-level dialog) closes, even
    // though the page itself never saw a pointerup for the click
    // that opened it.
    window.addEventListener('focus', resetDevUndoGesture);
    const undoBtn = document.getElementById('devUndoBtn');
    if (undoBtn) undoBtn.addEventListener('click', undoDevPanelChange);
    const redoBtn = document.getElementById('devRedoBtn');
    if (redoBtn) redoBtn.addEventListener('click', redoDevPanelChange);
    // Ctrl+Z - standard undo shortcut, matching the D/R single-key
    // shortcuts this panel already has (Hide/Reset). Ctrl+Shift+Z
    // and Ctrl+Y (the 2 most common cross-platform Redo shortcuts)
    // added 2026-09-28. Ignored while focus is in a genuine
    // text-input context (a rename textarea, the search box) so it
    // doesn't fight the browser/OS's own native text-field undo/redo.
    document.addEventListener('keydown', (e) => {
        if (!(e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y') || !(e.ctrlKey || e.metaKey)) return;
        const tag = document.activeElement ? document.activeElement.tagName : '';
        if (tag === 'TEXTAREA' || (tag === 'INPUT' && document.activeElement.type === 'text')) return;
        e.preventDefault();
        const isRedo = (e.key === 'y' || e.key === 'Y') || ((e.key === 'z' || e.key === 'Z') && e.shiftKey);
        if (isRedo) redoDevPanelChange(); else undoDevPanelChange();
    });
}
// Clears the undo AND redo stacks - called from saveSettings()
// itself (per the request's own explicit "until i click save, then
// it starts new again"), so a Save draws a hard line under
// everything before it; nothing before a Save is ever undoable OR
// redoable after it.
function clearDevPanelUndoStack() {
    devUndoStack = [];
    devRedoStack = [];
}

// Ctrl+F-style search for group/setting names, ported from
// DickoClicko's own dpSearchInput mechanism (2026-09-17) via
// TEMPLATE_DEV_PANEL.html, re-scoped to whichever tab is currently
// active via getActiveDevPanelTab() (DickoClicko has a single flat
// group tree, no Desktop/Mobile/Landscape split). Deliberately does
// NOT highlight every match at once - per DickoClicko's own direct
// correction ("dont do the expanding and scroll thing if i havent
// hit enter yet"): typing only recomputes devSearchMatches and
// shows a plain "N found" count; only Enter (first press jumps to
// match 0) or Shift+Enter (previous, wrapping) actually navigates -
// and navigating to a NEW match first UNDOES whatever the PREVIOUS
// match's own navigation did (un-highlight, re-collapse whatever
// this mechanism itself had to expand), so only ONE match is ever
// expanded/highlighted at a time.
let devSearchMatches = [];
let devSearchActiveIndex = -1;
let devSearchActiveEl = null;
let devSearchExpandedGroups = [];

function collectDevSearchMatches(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const tabEl = document.getElementById(getActiveDevPanelTab() + 'TabContent');
    if (!tabEl) return [];
    const matches = [];
    // A single combined selector (not 2 separate querySelectorAll
    // calls) so matches come back in real document order for free.
    tabEl.querySelectorAll('.dev-section-title, .dev-row').forEach(node => {
        if (node.classList.contains('dev-section-title')) {
            // textContent always starts with a "▼ " or "▶ " collapse-
            // arrow prefix (toggleSection()'s own convention) -
            // stripped before matching so a search for "dev" doesn't
            // need the arrow glyph.
            const text = node.textContent.slice(2).toLowerCase();
            if (text.includes(q)) matches.push({ type: 'group', targetEl: node, sectionEl: node.closest('.dev-section') });
        } else {
            const label = node.querySelector(':scope > .dev-label');
            if (label && label.textContent.toLowerCase().includes(q)) {
                matches.push({ type: 'row', targetEl: label, rowEl: node });
            }
        }
    });
    return matches;
}

function devSearchCollapseExpanded() {
    devSearchExpandedGroups.forEach(sec => {
        const titleEl = sec.querySelector(':scope > .dev-section-title');
        const content = sec.querySelector(':scope > .dev-section-content');
        if (content) content.classList.add('collapsed');
        if (titleEl) titleEl.textContent = '▶ ' + titleEl.textContent.slice(2);
    });
    devSearchExpandedGroups = [];
}
function devSearchClearActiveHighlight() {
    if (devSearchActiveEl) devSearchActiveEl.classList.remove('dev-search-highlight-active');
    devSearchActiveEl = null;
}
// Undoes whatever the CURRENT match's own navigation did - always
// call this before moving to a different match (or abandoning the
// search).
function devSearchUndoCurrentMatch() {
    devSearchClearActiveHighlight();
    devSearchCollapseExpanded();
}
// startEl is the whole matched element (a .dev-section for a group
// match, a .dev-row for a row match) so walking up from its OWN
// parent correctly skips the matched group itself and only expands
// genuine ANCESTORS - a group's own title is always visible
// regardless of its own collapsed state, only its content needs
// expanding.
function devSearchExpandAncestors(startEl) {
    let sec = startEl.parentElement ? startEl.parentElement.closest('.dev-section') : null;
    while (sec) {
        const titleEl = sec.querySelector(':scope > .dev-section-title');
        const content = sec.querySelector(':scope > .dev-section-content');
        if (content && content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            if (titleEl) titleEl.textContent = '▼ ' + titleEl.textContent.slice(2);
            devSearchExpandedGroups.push(sec);
        }
        sec = sec.parentElement ? sec.parentElement.closest('.dev-section') : null;
    }
}
function devSearchUpdateCount() {
    const countEl = document.getElementById('devSearchCount');
    if (!countEl) return;
    const total = devSearchMatches.length;
    const input = document.getElementById('devSearchInput');
    if (!input || !input.value.trim()) countEl.textContent = '';
    else if (!total) countEl.textContent = '0 found';
    else if (devSearchActiveIndex === -1) countEl.textContent = total + ' found';
    else countEl.textContent = (devSearchActiveIndex + 1) + '/' + total;
}
function devSearchGoTo(index) {
    if (!devSearchMatches.length) return;
    devSearchUndoCurrentMatch();
    const n = devSearchMatches.length;
    devSearchActiveIndex = ((index % n) + n) % n;
    const m = devSearchMatches[devSearchActiveIndex];
    devSearchExpandAncestors(m.type === 'row' ? m.rowEl : m.sectionEl);
    m.targetEl.classList.add('dev-search-highlight-active');
    devSearchActiveEl = m.targetEl;
    m.targetEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    devSearchUpdateCount();
}
function setupDevSearch() {
    const input = document.getElementById('devSearchInput');
    if (!input) return;
    input.addEventListener('input', () => {
        devSearchUndoCurrentMatch();
        devSearchActiveIndex = -1;
        devSearchMatches = collectDevSearchMatches(input.value);
        devSearchUpdateCount();
    });
    input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (e.shiftKey) devSearchGoTo(devSearchActiveIndex - 1);
        else devSearchGoTo(devSearchActiveIndex + 1);
    });
    // Any click that isn't on the search input itself undoes the
    // current match's own highlight/expansion - same "click
    // elsewhere clears it" convention setupDevGroupSelection() uses.
    document.addEventListener('click', e => {
        if (e.target === input) return;
        if (devSearchActiveIndex === -1) return;
        devSearchUndoCurrentMatch();
        devSearchActiveIndex = -1;
        devSearchUpdateCount();
    }, true);
}

// Generic pointer-based drag-to-reorder - per CLAUDE.md Section 12e
// ("Both the collapsible groups themselves and the individual
// settings within a group can be reordered by dragging them up/
// down"). Pointer events (not native HTML5 draggable=true) for the
// same reason every other drag in this panel uses them - real touch
// support, matching the panel's own move/resize handles. A live
// "swap on crossing" reorder (no ghost/placeholder element): once
// past a small movement threshold (distinguishing an actual drag
// from a plain click - important for group titles, which already
// have their own click-to-toggle behavior), the dragged item is
// immediately moved in the DOM whenever the pointer crosses a
// sibling's own midpoint.
//   handleSelector: what starts a drag (e.g. '.dev-section-title'
//     for groups, '.dev-label' for settings - NOT the item's own
//     interactive control, so dragging a slider/checkbox/input
//     still works normally).
//   itemSelector: the element that actually moves (may differ from
//     the handle - a group's handle is its title, but the whole
//     .dev-section reorders).
//   onDrop: called once after a real drag completes, to persist the
//     new order.
//   crossContainerSelector: omitted for the group-drag call (groups
//     never leave their one shared parent, same single-container
//     behavior as before) - passed as '.dev-section-content' for the
//     setting-row call, per explicit request ("make it so that i can
//     drag settings between groups"), letting a dragged row cross
//     into a DIFFERENT group's content instead of only reordering
//     among its own group's existing siblings.
// Used for the SIBLING-POSITION comparison inside setupDragReorder()
// (not for `itemSelector`, which stays per-call and decides what the
// drag HANDLE actually picks up) - ported from TEMPLATE_DEV_PANEL.html
// (2026-09-19, direct request: "I want to be able to reorder nested
// groups and settings such that Nested groups can be placed above
// settings. there should be no prioritization in terms of settings
// area lways above groups or anyting liek that"). Before this, the
// 2 setupDragReorder() calls below (one for '.dev-section', one for
// '.dev-row') each only ever compared position against same-type
// siblings, since the sibling query used the call's own itemSelector -
// meaning a dragged group could never be interleaved with rows, and a
// dragged row could never be interleaved with groups.
const REORDERABLE_SIBLING_SELECTOR = ':scope > .dev-section, :scope > .dev-row';
function setupDragReorder(handleSelector, itemSelector, onDrop, crossContainerSelector) {
    let dragging = null;
    let startY = 0;
    let moved = false;
    // BUG (found live, direct report: "when i clcik and drag the
    // icon, it doesnt register. Instead my cursor becomes tot he
    // NA Icon... the dragging doesnt work" - intermittent, "if i
    // try eough, the ones that fail sometimes work"). Unlike every
    // other custom pointer-drag in this file (the panel's own
    // resize handles, its move-by-header drag, Round Breakdown's
    // title/resize handles - see their own pointerdown handlers),
    // this one never called setPointerCapture() on the handle. The
    // handle is only 22px wide/tall (see .dev-group-drag-handle's
    // own comment) with touch-action:none - without capture, a
    // fast pointer move can carry the cursor outside that tiny hit
    // area before the next pointermove tick lands, and the browser
    // re-evaluates touch-action against whatever's now underneath
    // (which DOES allow the gesture) mid-drag - exactly the
    // ambiguous state Chromium/the OS shows the native "not-
    // allowed" cursor for, and silently drops the gesture instead
    // of ever reaching this handler's own pointermove/pointerup.
    // Explains both symptoms at once: intermittent (depends on
    // pointer speed/path, not a fixed condition) and "retry
    // sometimes works" (a slower or more contained repeat gesture
    // never leaves the handle's bounds). Capturing the pointer on
    // the handle itself, same as every other drag handle here,
    // routes every subsequent event for this pointerId to it
    // regardless of where the cursor visually travels, removing
    // the ambiguity entirely.
    let capturedHandle = null;
    const THRESHOLD = 8;

    // Touch needs a hold-to-arm gate that mouse doesn't: the handles
    // no longer have touch-action:none (see the "cant scroll the Dev
    // panel in mobile browser" fix) so a normal swipe reaches native
    // scroll untouched - but that means a touch drag can't be
    // recognized by movement alone the way a mouse drag is (any
    // early movement has to be assumed to be a scroll, not a drag
    // attempt). Per explicit request/clarification ("click and hold
    // for more than a second... versus scrolling which i would
    // start scrolling faster than a second"): a touch only commits
    // to drag mode after being held still past TOUCH_HOLD_MS: real
    // movement before that fires cancels the hold and falls through
    // to the browser's own scroll, untouched. Mouse/pen keep the
    // original immediate, movement-threshold-based behavior below -
    // touch-action never governs them, so nothing was ever broken
    // there.
    const TOUCH_HOLD_MS = 1000;
    const TOUCH_HOLD_MOVE_TOLERANCE = 10;
    let pendingTouch = null; // { item, startX, startY, pointerId, timerId }

    function cancelPendingTouch() {
        if (pendingTouch) {
            clearTimeout(pendingTouch.timerId);
            pendingTouch = null;
        }
    }

    document.addEventListener('pointerdown', (e) => {
        const handle = e.target.closest(handleSelector);
        if (!handle) return;
        const item = handle.closest(itemSelector);
        if (!item) return;
        // Refuses to even START a drag on a .dev-row whose own
        // group is locked - see lockedGroups' own comment. Never
        // gates a .dev-section (group) itself, only a .dev-row
        // (setting) - a locked group can still be dragged/
        // reordered/nested as a whole, only its own contents are
        // frozen. item.closest('.dev-section') is the row's OWN
        // immediate group, not necessarily the tab root.
        if (item.matches('.dev-row')) {
            const ownSection = item.closest('.dev-section');
            const ownTitle = ownSection && ownSection.querySelector(':scope > .dev-section-title');
            if (ownTitle && lockedGroups.has(getSectionKey(ownTitle))) return;
        }

        // See capturedHandle's own top-of-function comment - routes
        // every subsequent pointer event for this pointerId to the
        // handle regardless of where the cursor travels, same
        // try/catch-wrapped best-effort convention as every other
        // setPointerCapture() call in this file.
        try { handle.setPointerCapture(e.pointerId); } catch (err) { /* best-effort only */ }
        capturedHandle = handle;

        if (e.pointerType === 'touch') {
            const startX0 = e.clientX, startY0 = e.clientY, pointerId = e.pointerId;
            cancelPendingTouch();
            pendingTouch = {
                item, startX: startX0, startY: startY0, pointerId,
                timerId: setTimeout(() => {
                    if (!pendingTouch || pendingTouch.pointerId !== pointerId) return;
                    pendingTouch = null;
                    dragging = item;
                    startY = startY0;
                    // Already committed via the hold, not a fresh
                    // movement-threshold crossing - start reordering
                    // on the very next move, same as a mouse drag
                    // that's already past THRESHOLD.
                    moved = true;
                    dragging.classList.add('dev-reorder-dragging');
                }, TOUCH_HOLD_MS),
            };
            return;
        }

        dragging = item;
        startY = e.clientY;
        moved = false;
    });

    document.addEventListener('pointermove', (e) => {
        if (pendingTouch && e.pointerId === pendingTouch.pointerId) {
            const dist = Math.hypot(e.clientX - pendingTouch.startX, e.clientY - pendingTouch.startY);
            if (dist > TOUCH_HOLD_MOVE_TOLERANCE) {
                // Moved before the hold committed - a real scroll
                // attempt, not a drag. Let native scrolling handle
                // it; never preventDefault a gesture we didn't arm.
                cancelPendingTouch();
            }
            return;
        }
        if (!dragging) return;
        if (!moved && Math.abs(e.clientY - startY) > THRESHOLD) {
            moved = true;
            dragging.classList.add('dev-reorder-dragging');
        }
        if (!moved) return;
        e.preventDefault();
        // BUG (found live, per direct report "reordering doesn't
        // work"): draggingIsBefore's sense was backwards in both
        // branches below. dragging.compareDocumentPosition(sib) &
        // DOCUMENT_POSITION_FOLLOWING means "sib follows dragging",
        // i.e. draggingIsBefore=true means dragging is CURRENTLY
        // before sib - the natural "drag it further down, past a
        // LATER sibling" case. That case needs draggingIsBefore to
        // be TRUE to swap past it (moving it after), but the old
        // code required `!draggingIsBefore` for the downward branch
        // and `draggingIsBefore` for the upward one - exactly
        // inverted, so neither branch could ever fire for the two
        // directions a real drag actually needs (dragging an item
        // down past a later sibling, or up past an earlier one) -
        // only the already-correctly-positioned (no-op) cases
        // matched. Confirmed via a live synthetic-drag test: the
        // dev-reorder-dragging class engaged correctly, but the DOM
        // order never changed regardless of direction, for either
        // group or setting drag-reorder (same shared function).
        if (crossContainerSelector) {
            // Cross-group drag: re-picks the TARGET container fresh on
            // every move (whichever one the pointer is currently
            // over, or nearest by center distance if between/above/
            // below all of them) instead of only ever considering
            // dragging's OWN current parent - this is what actually
            // lets a setting cross into a different group, not just
            // reorder within the one it started in. Deliberately a
            // simpler "insert before the first sibling whose midpoint
            // is below the pointer" pass (no draggingIsBefore
            // direction-tracking) - that scheme only made sense for a
            // single fixed container; recomputing which container is
            // even the target on every frame makes a directional
            // "is dragging currently before/after" comparison
            // meaningless the instant the container itself changes.
            // Only ever searches within dragging's own tab (Desktop
            // and Mobile settings are different elements entirely -
            // crossing between tabs would be meaningless).
            const tabRoot = dragging.closest('#desktopTabContent, #mobileTabContent, #landscapeTabContent');
            // crossContainerSelector is normally a plain CSS
            // selector string (querySelectorAll'd against tabRoot,
            // as before - the settings-row case). Groups-within-
            // groups (see setupDragReorder's own group-drag call
            // site) needs a container list that also includes
            // tabRoot ITSELF (to allow un-nesting back to the top
            // level) - querySelectorAll can never return its own
            // context node, only descendants, so a plain selector
            // string can't express "this element, plus some of its
            // descendants" in one query. Accepting a FUNCTION here
            // instead, for that one case, sidesteps that limitation
            // cleanly rather than bolting a special case onto the
            // string path.
            const containers = typeof crossContainerSelector === 'function'
                ? crossContainerSelector(tabRoot, dragging)
                : Array.from(tabRoot.querySelectorAll(crossContainerSelector));
            // BUG (found live, per direct report "cant seem to reorder
            // or modify group nesting"): a candidate container is
            // always a .dev-section-content div, but a COLLAPSED
            // group's content is display:none - getBoundingClientRect()
            // on a display:none element returns an all-zero rect, so
            // EVERY collapsed group's content ties at the exact same
            // degenerate {top:0,bottom:0,height:0}. Groups default to
            // collapsed (see toggleSection()), so this was the common
            // case, not an edge case: the "pointer is over this
            // container" check (e.clientY between r.top/r.bottom)
            // could basically never match a real y-coordinate against
            // top=bottom=0, and the "nearest by center" fallback below
            // degenerated to Math.abs(e.clientY - 0), identical for
            // every collapsed candidate - so the winner was essentially
            // arbitrary (whichever tied first in iteration order, or
            // tabRoot's own real-but-usually-farther rect), unrelated
            // to where the pointer actually was. Confirmed live: cross-
            // group drop worked correctly the instant the target
            // group was pre-expanded (real geometry), and degenerated
            // exactly as described the moment it was collapsed again.
            // Fixed with a hit-test rect that falls back to the
            // group's own TITLE BAR (always rendered, never zero-size)
            // whenever its content is collapsed - the title bar is
            // also the correct visual target to drop onto anyway,
            // since that's the only part of a collapsed group a user
            // can actually see and aim at. tabRoot itself (the
            // un-nest-to-top-level container) has no title-bar sibling
            // and is never display:none, so it's unaffected either way.
            function hitTestRect(c) {
                const r = c.getBoundingClientRect();
                if (r.height > 0) return r;
                const titleEl = c.previousElementSibling;
                return (titleEl && titleEl.classList.contains('dev-section-title')) ? titleEl.getBoundingClientRect() : r;
            }
            let targetContainer = containers.find(c => {
                const r = hitTestRect(c);
                return e.clientY >= r.top && e.clientY <= r.bottom;
            });
            if (!targetContainer) {
                let minDist = Infinity;
                containers.forEach(c => {
                    const r = hitTestRect(c);
                    const dist = Math.abs(e.clientY - (r.top + r.height / 2));
                    if (dist < minDist) { minDist = dist; targetContainer = c; }
                });
            }
            if (!targetContainer) return;
            // Combined selector (not the per-call itemSelector alone) -
            // see REORDERABLE_SIBLING_SELECTOR's own comment.
            const targetSiblings = Array.from(targetContainer.querySelectorAll(REORDERABLE_SIBLING_SELECTOR)).filter(el => el !== dragging);
            const before = targetSiblings.find(sib => e.clientY < sib.getBoundingClientRect().top + sib.getBoundingClientRect().height / 2);
            if (before) {
                targetContainer.insertBefore(dragging, before);
            } else {
                targetContainer.appendChild(dragging);
            }
            return;
        }
        const siblings = Array.from(dragging.parentElement.querySelectorAll(REORDERABLE_SIBLING_SELECTOR)).filter(el => el !== dragging);
        for (const sib of siblings) {
            const rect = sib.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            const draggingIsBefore = !!(dragging.compareDocumentPosition(sib) & Node.DOCUMENT_POSITION_FOLLOWING);
            if (e.clientY < mid && !draggingIsBefore) {
                sib.parentElement.insertBefore(dragging, sib);
                break;
            } else if (e.clientY >= mid && draggingIsBefore) {
                sib.parentElement.insertBefore(dragging, sib.nextSibling);
                break;
            }
        }
    }, { passive: false });

    // Releases the pointer capture taken in pointerdown above -
    // BEFORE the `if (!dragging) return` early exit, since capture
    // is taken on EVERY handle pointerdown (including a touch
    // still pending its hold-to-arm timer, where dragging is still
    // null) and has to be released even when a drag never actually
    // started, or it stays stuck captured on the handle for the
    // rest of that pointerId's lifetime.
    function releaseCapturedHandle(e) {
        if (!capturedHandle) return;
        try { if (capturedHandle.hasPointerCapture(e.pointerId)) capturedHandle.releasePointerCapture(e.pointerId); } catch (err) { /* best-effort only */ }
        capturedHandle = null;
    }
    document.addEventListener('pointerup', (e) => {
        if (pendingTouch && e.pointerId === pendingTouch.pointerId) cancelPendingTouch();
        releaseCapturedHandle(e);
        if (!dragging) return;
        dragging.classList.remove('dev-reorder-dragging');
        if (moved) {
            sectionJustDragged = true; // harmless no-op for the settings-row case, where nothing reads this flag
            if (onDrop) onDrop();
        }
        dragging = null;
        moved = false;
    });
    document.addEventListener('pointercancel', (e) => {
        if (pendingTouch && e.pointerId === pendingTouch.pointerId) cancelPendingTouch();
        releaseCapturedHandle(e);
        if (!dragging) return;
        dragging.classList.remove('dev-reorder-dragging');
        dragging = null;
        moved = false;
    });
}

// Persists which collapsible groups are open/closed across Copy/
// Save/Load - per explicit request ("if i refresh the page, those
// settings remain"). Keyed by each section-title's position among
// ALL .dev-section-title elements (DOM order is stable unless the
// panel's own HTML structure changes) rather than by title text,
// since desktop and mobile both have identically-named sections
// (e.g. "Round Text") that are genuinely separate DOM elements and
// should track their own collapsed state independently.
// Stable identity for a collapsible group - tab + title text, NOT
// DOM position. Per CLAUDE.md Section 12e, groups (and the settings
// within them) are now drag-reorderable, so a positional index
// would silently point at the WRONG group after any reorder -
// title text is stable across reorders (and across a save/reload)
// the same way a real id would be, without needing to add one to
// every section-title element. Desktop and Mobile each have their
// own "Round Text"/etc, hence the tab prefix.
function getSectionKey(titleEl) {
    const tab = titleEl.closest('#desktopTabContent') ? 'desktop' : titleEl.closest('#landscapeTabContent') ? 'landscape' : 'mobile';
    // data-sid is a frozen copy of this title's ORIGINAL text (see the
    // one-off script that added it to every .dev-section-title),
    // captured once so collapse-state/order stay correctly keyed even
    // after Dev Panel Text Edit Mode renames the VISIBLE title -
    // falls back to live text for any title that somehow lacks it
    // (shouldn't happen, but keeps this from ever mis-keying instead
    // of just degrading to the pre-data-sid behavior).
    // Deliberately NOT parent-prefixed for a nested group, despite
    // groups-within-groups now existing (see captureSection()'s own
    // comment) - an EARLIER version of this function prefixed a
    // subgroup's key with its CURRENT parent's key, which is
    // unstable: applySectionOrder() looks up a group by the key
    // ITS SAVED ENTRY was captured with, but on a fresh load (or
    // right after un-nesting) the group is CURRENTLY sitting
    // top-level in the DOM, so calling this function on it right
    // then computes the UNPREFIXED key instead - the two calls
    // disagree, the lookup misses, and applySectionOrder silently
    // creates a DUPLICATE group instead of moving the real one.
    // Caught via a direct capture->scramble->apply round-trip test
    // before shipping, not assumed safe. Kept simple/stable
    // instead: same tab+name key regardless of current nesting.
    // The resulting (rare) collision risk - a subgroup and some
    // other group sharing a name - is closed on the CREATION side
    // instead, in addDevGroup()'s own uniqueness check, which now
    // considers every group in the tab, not just top-level ones.
    return tab + ':' + (titleEl.dataset.sid || titleEl.textContent.replace(/^[▼▶]\s*/, ''));
}
function captureSectionCollapseState() {
    const state = {};
    document.querySelectorAll('.dev-section-title').forEach(titleEl => {
        state[getSectionKey(titleEl)] = titleEl.nextElementSibling.classList.contains('collapsed');
    });
    return state;
}
function applySectionCollapseState(state) {
    if (!state) return;
    document.querySelectorAll('.dev-section-title').forEach(titleEl => {
        const key = getSectionKey(titleEl);
        if (!(key in state)) return; // unknown group (e.g. saved before a later section was added) - leave at its own default
        const shouldCollapse = !!state[key];
        const content = titleEl.nextElementSibling;
        if (content.classList.contains('collapsed') !== shouldCollapse) {
            content.classList.toggle('collapsed');
            titleEl.textContent = content.classList.contains('collapsed') ? '▶ ' + titleEl.textContent.slice(2) : '▼ ' + titleEl.textContent.slice(2);
        }
    });
}

// Stable identity for a single setting ROW within a group - the id
// of whatever slider/color-picker/select/input it contains (every
// real setting row has exactly one), falling back to its own
// current position only for the rare row with no id'd control at
// all (nothing in this panel currently lacks one, but this keeps
// capture from throwing rather than silently mis-keying).
function getRowKey(row, fallbackIndex) {
    const idEl = row.querySelector('[id]');
    return idEl ? idEl.id : ('__row' + fallbackIndex);
}

// Order (groups within each tab, and settings within each group) -
// per CLAUDE.md Section 12e ("that order is saved state"). Captured/
// applied together with collapse state in one combined object so
// Copy/Save/Load only need one field for all of §12e's layout state.
// Captures one group's own direct rowKeys, plus (one level deep
// only) any subgroups it directly contains - per direct request
// ("make it so that i can have setting groups within setting
// groups"). ALL queries here are :scope-scoped (direct children
// only) - a plain descendant selector like '.dev-section-content
// .dev-row' would incorrectly also match rows belonging to a
// NESTED subgroup's own separate content div (they're still
// descendants of this section, just one level further in), double-
// counting/misattributing them to the wrong group.
// items: a SINGLE ordered list, interleaving rows and subgroups in
// real DOM order (2026-09-19, ported from TEMPLATE_DEV_PANEL.html) -
// replaces the old separate rowKeys/subgroups arrays, which could
// only ever express "all rows, then all subgroups" (or vice versa
// on restore), never an actual interleaved order. Direct request:
// "I want to be able to reorder nested groups and settings such
// that Nested groups can be placed above settings. there should be
// no prioritization in terms of settings area lways above groups
// or anyting liek that." rowKeys/subgroups are still populated
// alongside items (derived from it, not a 2nd source of truth) so
// anything still reading them directly (translateGroup() below,
// findByKey/collectKeys) keeps working unchanged.
function captureSection(sec) {
    const titleEl = sec.querySelector(':scope > .dev-section-title');
    const content = sec.querySelector(':scope > .dev-section-content');
    const items = Array.from(content.querySelectorAll(':scope > .dev-row, :scope > .dev-section')).map((el, i) => {
        return el.classList.contains('dev-row')
            ? { type: 'row', key: getRowKey(el, i) }
            : { type: 'group', section: captureSection(el) };
    });
    return {
        key: getSectionKey(titleEl),
        items,
        rowKeys: items.filter(it => it.type === 'row').map(it => it.key),
        subgroups: items.filter(it => it.type === 'group').map(it => it.section),
    };
}
function captureSectionOrder() {
    const result = {};
    ['desktopTabContent', 'mobileTabContent', 'landscapeTabContent'].forEach(tabId => {
        const tabEl = document.getElementById(tabId);
        if (!tabEl) return;
        const sections = Array.from(tabEl.querySelectorAll(':scope > .dev-section'));
        result[tabId] = sections.map(sec => captureSection(sec));
    });
    return result;
}
function applySectionOrder(order) {
    if (!order) return;
    ['desktopTabContent', 'mobileTabContent', 'landscapeTabContent'].forEach(tabId => {
        const tabEl = document.getElementById(tabId);
        const savedSections = order[tabId];
        if (!tabEl || !savedSections) return;
        // ALL groups anywhere in this tab (top-level AND nested,
        // one level - see captureSection()'s own comment), not just
        // tabEl's direct children - an EXISTING nested group
        // (created by a previous drag-to-nest + save) needs to be
        // FOUND here too, not recreated as a duplicate alongside it.
        const sectionsByKey = {};
        tabEl.querySelectorAll('.dev-section').forEach(sec => {
            sectionsByKey[getSectionKey(sec.querySelector(':scope > .dev-section-title'))] = sec;
        });
        // Built ONCE, across every row in the whole tab regardless of
        // which section currently contains it - not per-section, the
        // way this used to work. A row dragged into a DIFFERENT
        // group (see setupDragReorder()'s crossContainerSelector)
        // still lives under its ORIGINAL group in the DOM on a fresh
        // page load (nothing has moved it yet); a per-section lookup
        // would only ever find a row already sitting in that
        // section, so a cross-group move could never actually be
        // restored - appendChild below relocates the row from
        // wherever it currently is, same as it already did for
        // same-group reordering.
        // BUG (found live, per direct report "the ordering and
        // grouping and nesting of the Preview text boxes etc arent
        // being reflected, even in desktop mode"): was scoped to
        // '.dev-section-content > .dev-row' only - correctly widened
        // to tab-wide (not :scope-limited to one section) by an
        // earlier fix, per the comment above, but never widened to
        // also include a LOOSE row with no .dev-section-content
        // ancestor at all. The ~10 loose top-level rows (Preview
        // Round/Start/Try Again/Win/Lose Text, Click Counter, etc. -
        // see setupDragReorder()'s own comment on making them
        // groupable) sit directly under tabEl itself, so a row
        // dragged INTO a group from its loose starting position was
        // captured correctly by captureSectionOrder() (confirmed
        // live) but could never be found here to restore it into
        // that group on the next Reset/reload - it silently stayed
        // loose forever, looking like Sync "didn't work" even
        // though the save itself was correct. Widened to plain
        // '.dev-row' (every row in the tab, loose or grouped alike)
        // - safe, since a row's real identity is its own key
        // (getRowKey), not its current parent.
        const rowsByKey = {};
        tabEl.querySelectorAll('.dev-row').forEach((row, i) => {
            rowsByKey[getRowKey(row, i)] = row;
        });
        // Places one saved group (and, one level deep, its own
        // subgroups) into parentContainer - either tabEl itself
        // (top-level) or another group's own .dev-section-content
        // (nested). Recursive so the same logic builds both levels,
        // though only ever actually called 2 deep (savedSections
        // directly, then once more for each group's own subgroups
        // array) - matches captureSection()'s own 1-level cap.
        function placeSection(savedSec, parentContainer) {
            let sec = sectionsByKey[savedSec.key];
            if (!sec) {
                // Not a built-in group missing by mistake - this is
                // how a CUSTOM group (see addDevGroup()) survives a
                // reload: it doesn't exist in this page's static
                // HTML at all, only in the saved order, so it has to
                // be created fresh here rather than skipped. name is
                // the LAST segment of the key (after any '>' parent
                // prefixes and the leading "tab:" prefix - see
                // getSectionKey()'s own comment on how a subgroup's
                // key is built).
                const name = savedSec.key.split('>').pop().replace(/^(desktop|mobile|landscape):/, '');
                // BUG (found live, direct report "why do we have 2
                // mouse logs in the debug group"): "Mouse Log" is a
                // .dev-section, so a save made any time after it was
                // first built captures it in sectionOrder just like
                // any other group. On a real page load this
                // placeSection() run (called from loadSettings(), see
                // applySectionOrder(settings.sectionOrder) above)
                // happens BEFORE buildMouseLogWidget() (also called
                // from loadSettings(), a bit further down - it needs
                // devTextOverrides already populated to resolve the
                // "DEBUG" group by name, see that call site's own
                // comment) - so at THIS point the real Mouse Log
                // section never exists yet, and the generic
                // missing-custom-group path above would recreate an
                // empty shell of it, sitting right alongside the
                // real, fully-wired one buildMouseLogWidget() builds
                // moments later. Skip it here instead - it is never a
                // real custom group, always exactly one dynamically-
                // built widget that (re)creates and repopulates
                // itself.
                if (name === 'Mouse Log') return;
                sec = createDevGroupElement(name);
                sectionsByKey[savedSec.key] = sec;
            }
            parentContainer.appendChild(sec); // moves to the end, in saved order -> reproduces the full saved sequence
            const content = sec.querySelector(':scope > .dev-section-content');
            // Interleaved order (savedSec.items, see captureSection()'s
            // own comment) - falls back to the OLD "all rows, then all
            // subgroups" shape for a save made before this change, so
            // an existing saved dev-panel-settings.json still loads
            // correctly (just without any interleaving it never had
            // to begin with) instead of erroring or dropping content.
            if (savedSec.items) {
                savedSec.items.forEach(item => {
                    if (item.type === 'row') {
                        const row = rowsByKey[item.key];
                        if (row) content.appendChild(row);
                    } else {
                        placeSection(item.section, content);
                    }
                });
            } else {
                (savedSec.rowKeys || []).forEach(rowKey => {
                    const row = rowsByKey[rowKey];
                    if (row) content.appendChild(row);
                });
                (savedSec.subgroups || []).forEach(sub => placeSection(sub, content));
            }
        }
        savedSections.forEach(savedSec => placeSection(savedSec, tabEl));
    });
}

// Live, ongoing Desktop -> Mobile group/setting order mirroring -
// per direct follow-up to the earlier one-time sync ("Desktop and
// Mobile tabs still arent syncing... If i change it in desktop, the
// next time i click into mobile tab, it should match the Desktop
// tab"). One-directional by design, matching the literal request:
// Desktop is the source of truth, re-derived into Mobile's own
// order every time the Mobile tab is actually opened (not on a
// timer, not live mid-drag) - see switchDevPanelTab()'s own call.
// Ports the exact same translation the earlier one-time sync used
// (previously an external, one-off Node script mutating the saved
// JSON directly): match each Desktop group to its Mobile
// counterpart by title with any parenthetical suffix stripped
// (e.g. "8-Bit Text Style (Start/Try Again/Round/Win-Lose)" on
// Desktop and "(Start/Try Again/Win-Lose)" on Mobile are the same
// conceptual group); for each Desktop row id, derive the candidate
// Mobile id by inserting "Mobile" after the control-type prefix,
// keeping it only if that id actually exists among Mobile's real
// rows (desktop-only fields correctly drop out, not force-
// included); any Mobile-only row with no Desktop counterpart is
// appended at the end of its group, preserving its prior relative
// position, so nothing existing gets silently lost.
//
// A Desktop group with no title-matching Mobile group (e.g. a
// custom group created by dragging settings into their own group -
// see addDevGroup()) is now CREATED on Mobile too, per direct
// report ("the groups and settings order don't match... for
// example in Desktop settings I have a Win group and a Lose
// group. that doesn't exist in mobile tab" - Desktop's "Win/Lose
// Text" group renamed to "WIN" plus a custom group renamed to
// "LOSE" split Win/Lose apart, but Mobile still had them combined
// in one "Win/Lose Text" group with no matching split). Only
// created when the group actually has Mobile-translatable rows -
// a genuinely Desktop-only group with NO Mobile-relevant settings
// at all (Game Mechanics, Background) still correctly gets no
// Mobile counterpart, since there'd be nothing to put in it.
// Reuses the Desktop group's own rename (devTextOverrides), if it
// has one and Mobile's own copy doesn't already have an
// independent one, so a custom name like "LOSE" carries over
// instead of the newly-created group showing its raw internal
// name ("New Group (2)").
// Generalized so both Mobile and Landscape tabs can mirror Desktop's
// order/renames through the same logic - tabContentId is the tab's
// DOM container id ('mobileTabContent'/'landscapeTabContent'),
// tabPrefix is the id-infix ('Mobile'/'Landscape') and key-prefix
// (lowercased, e.g. 'mobile:'/'landscape:') this tab's rows/groups use.
// Nested groups (one level - see captureSection()'s own cap) ARE
// mirrored - per direct follow-up report ("How come [nested groups
// aren't] automatically matched in the Mobile and Landscape tabs?"
// after using the group-into-group nesting feature). The matching/
// translation logic below is otherwise UNCHANGED from the original
// flat-only version (title-strip matching, row-id prefix
// translation, rename carry-over, leftover-row/leftover-group
// passthrough) - restructured around 2 small recursive helpers
// (translateGroup/appendLeftoverRows) so the exact same logic
// naturally applies at both the top level and one level of nesting,
// rather than duplicating each pass by hand. Every DOM query below
// that used to be :scope-scoped to tabEl's direct children is now a
// plain (tab-wide) query instead, deliberately - a Desktop group's
// Mobile/Landscape counterpart may itself currently be sitting
// nested, top-level, or under a different parent than Desktop's;
// title-matching has to find it wherever it currently lives, and
// applySectionOrder() (unchanged, already nesting-aware since it
// was built for the manual-drag nesting feature) moves it into the
// newly-derived position regardless of where that lookup found it.
function syncTabOrderToDesktop(tabContentId, tabPrefix) {
    const keyPrefix = tabPrefix.toLowerCase() + ':';
    const desktopOrder = captureSectionOrder().desktopTabContent;
    const mobileTabEl = document.getElementById(tabContentId);
    if (!desktopOrder || !mobileTabEl) return;
    // Strips a trailing descriptive parenthetical for cross-tab
    // title matching (e.g. "8-Bit Text Style (Start/Try Again/
    // Round/Win-Lose)" on Desktop vs "(Start/Try Again/Win-Lose)"
    // on Mobile - same conceptual group). The negative lookahead
    // specifically EXCLUDES a purely-numeric parenthetical like
    // "(2)"/"(3)" - addDevGroup()'s own disambiguator for multiple
    // same-named custom groups (see its own "New Group (2)"
    // generation) - from being stripped too. Without this
    // exclusion, "New Group" and "New Group (2)" both normalized
    // to the identical "New Group" key, colliding in
    // mobileSectionsByNormTitle below (whichever DOM section got
    // inserted into that lookup last silently won, the other
    // became unreachable) - a real bug found via direct report,
    // confirmed live via getting genuinely different wrong section
    // orders on repeated calls (the DOM-iteration-order-dependent
    // overwrite race producing different results each time).
    const stripParen = title => title.replace(/\s*\((?!\d+\)\s*$)[^)]*\)\s*$/, '').trim();

    // Tab-wide (not :scope-scoped) - see this function's own top
    // comment on why nested groups need this.
    const mobileSectionsByNormTitle = {};
    mobileTabEl.querySelectorAll('.dev-section').forEach(sec => {
        const titleEl = sec.querySelector(':scope > .dev-section-title');
        const rawTitle = (titleEl.dataset.sid || titleEl.textContent.replace(/^[▼▶]\s*/, '')).trim();
        mobileSectionsByNormTitle[stripParen(rawTitle)] = sec;
    });
    // Already tab-wide even before this change (a plain descendant
    // selector from mobileTabEl, not :scope-anchored) - nested rows
    // were always included here. Widened further (same fix as
    // applySectionOrder()'s own rowsByKey, see its own comment) to
    // also include a LOOSE row with no .dev-section-content
    // ancestor - one of the ~10 loose top-level rows, dragged into
    // a Mobile-tab group, was otherwise invisible to this set and
    // silently dropped out of every translated group's rowKeys on
    // the next sync.
    const mobileRowIdSet = new Set();
    mobileTabEl.querySelectorAll('.dev-row [id]').forEach(el => mobileRowIdSet.add(el.id));
    const placedRowIds = new Set();
    const placedGroupKeys = new Set();
    let overridesChanged = false;

    // Translates ONE Desktop group into its Mobile/Landscape
    // equivalent - matches by title, translates its own rowKeys,
    // and recurses into `subgroups` (naturally bottoms out at one
    // level, since the nesting UI itself never allows a subgroup to
    // contain its own subgroup - see setupDragReorder()'s own
    // crossContainerSelector comment). Returns null only when the
    // group is genuinely Desktop-only with nothing at all to
    // mirror (no rows AND no subgroups either).
    // Mirrors ONE rename from its Desktop key onto its Mobile/
    // Landscape counterpart key, live, every sync - not just the
    // first time the counterpart is created. Skips a key this tab
    // has been independently renamed on directly (devTextOverridesManual
    // - see its own comment), so a deliberate Mobile/Landscape-only
    // name is never clobbered; otherwise keeps re-copying Desktop's
    // current value (including clearing it back to null when
    // Desktop's own rename is cleared), so a LATER Desktop rename
    // - not just the group's original creation - now actually
    // reaches Mobile/Landscape on the next tab switch. Used for both
    // group titles and individual setting/row labels below.
    function syncRename(desktopKey, mobileKey) {
        if (devTextOverridesManual.has(mobileKey)) return;
        const desktopVal = devTextOverrides[desktopKey] != null ? devTextOverrides[desktopKey] : null;
        if (devTextOverrides[mobileKey] !== desktopVal) {
            devTextOverrides[mobileKey] = desktopVal;
            overridesChanged = true;
        }
    }
    // Walks desktopGroup.items (the interleaved row/subgroup order -
    // 2026-09-19, ported from TEMPLATE_DEV_PANEL.html's own
    // captureSection()/translateGroup() fix, see its own comment)
    // instead of the old separate rowKeys/subgroups arrays, so a
    // row placed ABOVE a subgroup on Desktop mirrors that same
    // interleaved order onto Mobile/Landscape, not "all rows
    // first." Falls back to the pre-2026-09-19 rowKeys-then-
    // subgroups shape for a desktopGroup captured before this
    // change (there is none in practice - captureSectionOrder()
    // always produces the new shape now - but keeps this correct
    // even against an externally-sourced legacy sectionOrder).
    function translateGroup(desktopGroup) {
        const desktopTitle = desktopGroup.key.replace(/^desktop:/, '');
        const mobileSec = mobileSectionsByNormTitle[stripParen(desktopTitle)];
        const items = desktopGroup.items || [
            ...(desktopGroup.rowKeys || []).map(key => ({ type: 'row', key })),
            ...(desktopGroup.subgroups || []).map(section => ({ type: 'group', section })),
        ];
        const translatedItems = items.map(item => {
            if (item.type === 'row') {
                const desktopRowId = item.key;
                const mobileRowId = desktopRowId.replace(/^(slider|color|select|checkbox|input)/, '$1' + tabPrefix);
                if (mobileRowIdSet.has(mobileRowId) && !placedRowIds.has(mobileRowId)) {
                    placedRowIds.add(mobileRowId);
                    // Setting/row-label rename mirroring - previously
                    // only group TITLES carried over here, never
                    // individual setting names, so a Desktop row rename
                    // never reached its Mobile/Landscape counterpart at
                    // all (found via direct report - "setting names
                    // dont sync"). Same manual-override guard as titles.
                    syncRename(desktopRowId, mobileRowId);
                    return { type: 'row', key: mobileRowId };
                }
                return null;
            }
            const translatedSub = translateGroup(item.section);
            return translatedSub ? { type: 'group', section: translatedSub } : null;
        }).filter(Boolean);

        let mobileKey;
        if (!mobileSec) {
            if (translatedItems.length === 0) return null; // truly Desktop-only (Game Mechanics, Background) - nothing to mirror
            mobileKey = keyPrefix + desktopTitle;
        } else {
            mobileKey = getSectionKey(mobileSec.querySelector(':scope > .dev-section-title'));
        }
        placedGroupKeys.add(mobileKey);
        syncRename(desktopGroup.key, mobileKey);
        return {
            key: mobileKey,
            items: translatedItems,
            rowKeys: translatedItems.filter(it => it.type === 'row').map(it => it.key),
            subgroups: translatedItems.filter(it => it.type === 'group').map(it => it.section),
        };
    }
    const newMobileOrder = desktopOrder.map(translateGroup).filter(Boolean);

    // Any group (top-level OR nested) with no Desktop counterpart
    // passes through untouched, preserving its CURRENT nesting: a
    // top-level Mobile/Landscape-only group is appended at the end
    // of newMobileOrder; a NESTED Mobile/Landscape-only group is
    // appended into its current parent's translated subgroups list
    // if that parent survived translation, else (the parent itself
    // was Desktop-only and got dropped) it surfaces at the top
    // level instead of silently vanishing.
    function findTranslated(key) {
        for (const g of newMobileOrder) {
            if (g.key === key) return g;
            for (const sub of g.subgroups) if (sub.key === key) return sub;
        }
        return null;
    }
    mobileTabEl.querySelectorAll(':scope > .dev-section').forEach(topSec => {
        const topKey = getSectionKey(topSec.querySelector(':scope > .dev-section-title'));
        if (!placedGroupKeys.has(topKey)) {
            newMobileOrder.push(captureSection(topSec));
            placedGroupKeys.add(topKey);
            return;
        }
        const translatedParent = findTranslated(topKey);
        const content = topSec.querySelector(':scope > .dev-section-content');
        content.querySelectorAll(':scope > .dev-section').forEach(subSec => {
            const subKey = getSectionKey(subSec.querySelector(':scope > .dev-section-title'));
            if (!placedGroupKeys.has(subKey)) {
                const captured = captureSection(subSec);
                // Pushed into BOTH items and subgroups when landing
                // inside a translated PARENT group - same "items is
                // what placeSection() actually reads now" reasoning
                // as appendLeftoverRows()'s own identical fix just
                // below. Landing at the top level (newMobileOrder)
                // needs no such fix - that array IS what
                // applySectionOrder() reads directly, it has no
                // wrapping items/subgroups field of its own.
                if (translatedParent) {
                    translatedParent.items.push({ type: 'group', section: captured });
                    translatedParent.subgroups.push(captured);
                } else {
                    newMobileOrder.push(captured);
                }
                placedGroupKeys.add(subKey);
            }
        });
    });
    // Rows within a translated group with no Desktop counterpart get
    // appended at the end, preserving their prior relative order -
    // applied at every level (top and nested) via recursion.
    // :scope-scoped (unlike the original flat version's plain
    // descendant selector) so a nested subgroup's own rows are never
    // mistakenly swept into its PARENT's leftover pass - the
    // subgroup's own translateGroup/appendLeftoverRows call already
    // owns them.
    function appendLeftoverRows(group) {
        const rawTitle = group.key.replace(new RegExp('^' + keyPrefix), '');
        const sec = mobileSectionsByNormTitle[stripParen(rawTitle)];
        if (sec) {
            const content = sec.querySelector(':scope > .dev-section-content');
            Array.from(content.querySelectorAll(':scope > .dev-row')).forEach((row, i) => {
                const rowKey = getRowKey(row, i);
                if (!placedRowIds.has(rowKey)) {
                    // Pushed into BOTH items (what applySectionOrder()
                    // actually reads now - see placeSection()'s own
                    // comment) and the derived rowKeys, so this
                    // leftover row doesn't silently vanish on restore
                    // the way it would if only rowKeys were updated
                    // here (2026-09-19 - see the identical fix/
                    // comment in TEMPLATE_DEV_PANEL.html).
                    group.items.push({ type: 'row', key: rowKey });
                    group.rowKeys.push(rowKey);
                    placedRowIds.add(rowKey);
                }
            });
        }
        group.subgroups.forEach(appendLeftoverRows);
    }
    newMobileOrder.forEach(appendLeftoverRows);
    applySectionOrder({ [tabContentId]: newMobileOrder });
    // A newly-created group (see above) is painted with its raw
    // internal name by createDevGroupElement()/applySectionOrder() -
    // re-run the override painter now that devTextOverrides may
    // have gained a fresh entry for it, so a carried-over rename
    // (e.g. "LOSE") actually shows instead of "New Group (2)".
    if (overridesChanged) applyDevTextOverrides();
}
function syncMobileOrderToDesktop() {
    syncTabOrderToDesktop('mobileTabContent', 'Mobile');
}
function syncLandscapeOrderToDesktop() {
    syncTabOrderToDesktop('landscapeTabContent', 'Landscape');
}

// Color pickers not otherwise special-cased (colorBase/colorButton/
// colorButtonWin/colorButtonLose have their own dedicated handling -
// see setBaseHue()/setButtonHue() and applyLoadedSettings()). Moved
// to top-level scope (was function-locally scoped inside
// setupDevSliders()) so both the live 'input' listener AND
// syncColorPickersFromState() (the generic post-load DOM-value sync
// - per explicit request "make sure all color pickers in the dev
// panel reflect the current settings") can share one definition
// instead of drifting apart.
const COLOR_VAR_MAP = {
    'colorBg': '--bg-color',
    'colorRoundBreakdownOutline': '--round-breakdown-outline-color',
    'colorRoundBreakdownPanel': '--round-breakdown-panel-color',
    'colorRoundBreakdownTitle': '--round-breakdown-title-color',
    'colorRoundBreakdownData': '--round-breakdown-data-color',
    'colorRoundBreakdownLostTitle': '--round-breakdown-lost-title-color',
    'colorRoundBreakdownLostData': '--round-breakdown-lost-data-color',
};
// The 8-bit extrusion style's colors are mobile-split (see
// mobileExtrusionVars) but don't live in colorVars - they write
// straight into extrusionVars/mobileExtrusionVars (see
// applyExtrusionStyles()).
const EXTRUSION_COLOR_MAP = {
    'colorResultWinFill': 'winFillColor',
    'colorResultWinBorder': 'winBorderColor',
    'colorResultLoseFill': 'loseFillColor',
    'colorResultLoseBorder': 'loseBorderColor',
    'colorGameplayWinText': 'gameplayWinTextColor',
    'colorGameplayWinBorder': 'gameplayWinBorderColor',
    'colorGameplayLoseText': 'gameplayLoseTextColor',
    'colorGameplayLoseBorder': 'gameplayLoseBorderColor',
    'colorOverallBorder': 'overallBorderColor',
    'colorRoundExtrusionBorder': 'roundBorderColor',
    'colorTryAgainExtrusionBorder': 'tryAgainBorderColor',
    'colorTryAgainOverallBorder': 'tryAgainOverallBorderColor',
    'colorTryAgainQuestionMarkFill': 'questionMarkFillColor',
    'colorTryAgainQuestionMarkOverallBorder': 'questionMarkOverallBorderColor',
    'colorTargetExtrusionBorder': 'targetBorderColor',
    'colorSpeedExtrusionBorder': 'speedBorderColor',
    'colorMsPerClickExtrusionBorder': 'msPerClickBorderColor',
    'colorRoundOverallBorder': 'roundOverallBorderColor',
    'colorRoundDockExtrusionBorder': 'roundDockBorderColor',
    'colorRoundDockOverallBorder': 'roundDockOverallBorderColor',
    'colorHighScoreExtrusionBorder': 'highScoreBorderColor',
    'colorHighScoreOverallBorder': 'highScoreOverallBorderColor',
    'colorTargetOverallBorder': 'targetOverallBorderColor',
    'colorSpeedOverallBorder': 'speedOverallBorderColor',
    'colorMsPerClickOverallBorder': 'msPerClickOverallBorderColor',
};

// Desktop tab's "uniform" controls (plain CSS-var/extrusion-var
// sliders and color pickers, each with exactly one input and no
// extra bundled elements) - generated at runtime instead of
// hand-written HTML, per direct request to port the dev panel to
// the same "config array + generic builder" pattern DickoClicko/
// HANDO use. Deliberately narrower than a full port: the ~54
// BESPOKE controls (Dev Panel's own styling, Game Mechanics,
// Click Burst text inputs, and every X/Y-offset slider that has a
// bundled px/vw-unit checkbox in the same row) stay exactly as
// hand-written HTML for now - see the AskUserQuestion-confirmed
// scope decision before this was built. Extracted from the
// ORIGINAL static HTML via an automated script (not hand-
// transcribed) specifically to avoid transcription errors across
// 122 individually-tuned min/max/step/value numbers.
//
// The event-wiring/save/load/sync machinery below (setupDevSliders(),
// the load-time DOM-sync loop, syncColorPickersFromState(), etc.)
// already operates generically over whatever .dev-slider/
// .dev-color-picker elements exist in the DOM by id - it does not
// care whether an element was hand-written or generated, so none
// of that code needed to change. This only changes HOW the HTML
// gets into the DOM, not how it's read/written/persisted.
const DESKTOP_UNIFORM_CONTROLS = [
    { group: 'Main Button', id: 'sliderButtonDiameter', type: 'slider', label: 'Diameter (vw):', min: 5, max: 60, step: 0.5, value: 42.5 },
    { group: 'Main Button', id: 'sliderButtonMinDiameter', type: 'slider', label: 'Min Diameter (px, floor on narrow windows):', min: 0, max: 500, step: 5, value: 380 },
    { group: 'Main Button', id: 'sliderButtonHeight', type: 'slider', label: 'Height (offset, % of diameter):', min: -30, max: 30, step: 0.5, value: -4.5 },
    { group: 'Main Button', id: 'sliderButtonPressIntensity', type: 'slider', label: 'Press Intensity (% of diameter):', min: 0, max: 30, step: 0.5, value: 8 },
    { group: 'Main Button', id: 'sliderButtonPressMs', type: 'slider', label: 'Press Speed (ms, 0=instant):', min: 0, max: 200, step: 5, value: 10 },
    { group: 'Main Button', id: 'sliderButtonReleaseMs', type: 'slider', label: 'Release Speed (ms, 0=instant):', min: 0, max: 200, step: 5, value: 10 },
    { group: 'Main Button', id: 'sliderButtonMaxScale', type: 'slider', label: 'Max Button Scale (x, at 1280px+ width):', min: 0.5, max: 2, step: 0.01, value: 1 },
    { group: 'Main Button', id: 'sliderButtonMinScale', type: 'slider', label: 'Min Button Scale (x, at 768px width):', min: 0.1, max: 2, step: 0.01, value: 1 },
    { group: 'Main Button', id: 'sliderBaseLightLevels', type: 'slider', label: 'Base Light Levels:', min: -1, max: 1, step: 0.01, value: 0 },
    { group: 'Main Button', id: 'sliderBaseLightLevelsContrast', type: 'slider', label: 'Base Contrast:', min: 0, max: 3, step: 0.01, value: 1 },
    { group: 'Main Button', id: 'sliderBaseLightLevelFloor', type: 'slider', label: 'Base Light Level Floor:', min: 0, max: 1, step: 0.01, value: 0 },
    { group: 'Main Button', id: 'sliderBaseLightLevelCeiling', type: 'slider', label: 'Base Light Level Ceiling:', min: 0, max: 1, step: 0.01, value: 1 },
    { group: 'Main Button', id: 'sliderBaseSaturation', type: 'slider', label: 'Base Saturation (x):', min: 0, max: 3, step: 0.01, value: 1 },
    { group: 'Main Button', id: 'sliderButtonLightLevels', type: 'slider', label: 'Button Light Levels:', min: -1, max: 1, step: 0.01, value: 0 },
    { group: 'Main Button', id: 'sliderButtonLightLevelsContrast', type: 'slider', label: 'Button Contrast:', min: 0, max: 3, step: 0.01, value: 1 },
    { group: 'Main Button', id: 'sliderButtonLightLevelFloor', type: 'slider', label: 'Button Light Level Floor:', min: 0, max: 1, step: 0.01, value: 0 },
    { group: 'Main Button', id: 'sliderButtonLightLevelCeiling', type: 'slider', label: 'Button Light Level Ceiling:', min: 0, max: 1, step: 0.01, value: 1 },
    { group: 'Main Button', id: 'sliderButtonSaturation', type: 'slider', label: 'Button Saturation (x):', min: 0, max: 3, step: 0.01, value: 1 },
    { group: 'Main Button', id: 'sliderButtonLoseContrast', type: 'slider', label: 'Button Lose Contrast:', min: 0, max: 3, step: 0.01, value: 1 },
    { group: 'Main Button', id: 'sliderButtonLoseLightness', type: 'slider', label: 'Button Lose Lightness:', min: -1, max: 1, step: 0.01, value: 0 },
    { group: 'Shadow', id: 'sliderShadowX', type: 'slider', label: 'Shadow X (% of button width):', min: -55.15, max: 128.68, step: 0.1, value: 32.5368 },
    { group: 'Shadow', id: 'sliderShadowY', type: 'slider', label: 'Shadow Y (% of button width):', min: -73.53, max: 36.76, step: 0.1, value: 20.7721 },
    { group: 'Shadow', id: 'sliderShadowBlur', type: 'slider', label: 'Shadow Blur (px):', min: 0, max: 60, step: 1, value: 0 },
    { group: 'Shadow', id: 'sliderShadowScale', type: 'slider', label: 'Shadow Size (scale):', min: 0.1, max: 3, step: 0.05, value: 0.6 },
    { group: 'Shadow', id: 'sliderShadowSkew', type: 'slider', label: 'Shadow Skew (deg):', min: -90, max: 0, step: 1, value: -22 },
    { group: 'Shadow', id: 'sliderShadowElongationIntensity', type: 'slider', label: 'Elongation Intensity:', min: 0, max: 3, step: 0.1, value: 2 },
    { group: 'Shadow', id: 'sliderShadowElongationAngle', type: 'slider', label: 'Elongation Angle (deg):', min: 0, max: 360, step: 1, value: 0 },
    { group: 'Shadow', id: 'sliderShadowRotate', type: 'slider', label: 'Shadow Rotate (deg):', min: -90, max: 135, step: 1, value: 41 },
    { group: 'Click Burst', id: 'sliderClickBurstSpeed', type: 'slider', label: 'Animation Speed (ms):', min: 80, max: 1000, step: 10, value: 150 },
    { group: 'Click Burst', id: 'sliderClickBurstScale', type: 'slider', label: 'Frame Size (scale):', min: 0, max: 1, step: 0.01, value: 0.32 },
    { group: 'Click Burst', id: 'sliderClickBurstDistance', type: 'slider', label: 'Distance Out (px):', min: 10, max: 300, step: 5, value: 115 },
    { group: 'Click Burst', id: 'sliderClickBurstHeight', type: 'slider', label: 'Height / Lift (px):', min: 0, max: 200, step: 5, value: 0 },
    { group: 'Click Burst', id: 'sliderClickBurstCurveOffset', type: 'slider', label: 'Curve Offset (px):', min: 0, max: 150, step: 5, value: 80 },
    { group: 'Click Burst', id: 'sliderClickBurstCurveAmount', type: 'slider', label: 'Flight Path Curviness (x):', min: 0, max: 3, step: 0.05, value: 0 },
    { group: 'Click Burst', id: 'sliderClickBurstCountMin', type: 'slider', label: 'Count Per Side - Floor:', min: 1, max: 8, step: 1, value: 3 },
    { group: 'Click Burst', id: 'sliderClickBurstCountMax', type: 'slider', label: 'Count Per Side - Ceiling:', min: 1, max: 8, step: 1, value: 5 },
    { group: 'Click Burst', id: 'sliderClickBurstShadowFinalScale', type: 'slider', label: 'Shadow Final Scale:', min: 0, max: 1, step: 0.01, value: 1 },
    { group: '8-Bit Text Style (Start/Try Again/Round/Win-Lose)', id: 'sliderExtrusionFontTrimAdjust', type: 'slider', label: 'Font Trim Adjust:', min: -1, max: 1, step: 0.01, value: 0, dynamicDevice: true },
    { group: 'Start/Try Again Button', id: 'sliderTextFontSize', type: 'slider', label: 'Button Font Size (px):', min: 10, max: 400, step: 0.01, value: 197.38 },
    { group: 'Start/Try Again Button', id: 'sliderTextFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 15.42 },
    { group: 'Start/Try Again Button', id: 'sliderRoundExtrusionDepth', type: 'slider', label: 'Button Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 9 },
    { group: 'Start/Try Again Button', id: 'colorRoundExtrusionBorder', type: 'color', label: 'Button Text Color:', value: '#c41516' },
    { group: 'Start/Try Again Button', id: 'sliderRoundOverallBorderThickness', type: 'slider', label: 'Button Border Thickness (px):', min: 0, max: 20, step: 1, value: 7 },
    { group: 'Start/Try Again Button', id: 'colorRoundOverallBorder', type: 'color', label: 'Button Overall Border Color:', value: '#5c191d' },
    { group: 'Start/Try Again Button', id: 'sliderTextLetterSpacing', type: 'slider', label: 'Button Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Start/Try Again Button', id: 'sliderTextLineHeight', type: 'slider', label: 'Button Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Start/Try Again Button', id: 'sliderTryAgainTextFontSize', type: 'slider', label: 'Try Again Font Size (px):', min: 10, max: 400, step: 0.01, value: 165.63 },
    { group: 'Start/Try Again Button', id: 'sliderTryAgainTextFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 12.94 },
    { group: 'Start/Try Again Button', id: 'sliderTryAgainExtrusionDepth', type: 'slider', label: 'Try Again Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 9 },
    { group: 'Start/Try Again Button', id: 'colorTryAgainExtrusionBorder', type: 'color', label: 'Try Again Text Color:', value: '#c41516' },
    { group: 'Start/Try Again Button', id: 'sliderTryAgainOverallBorderThickness', type: 'slider', label: 'Try Again Border Thickness (px):', min: 0, max: 20, step: 1, value: 7 },
    { group: 'Start/Try Again Button', id: 'colorTryAgainOverallBorder', type: 'color', label: 'Try Again Overall Border Color:', value: '#5c191d' },
    { group: 'Start/Try Again Button', id: 'sliderTryAgainTextLetterSpacing', type: 'slider', label: 'Try Again Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 10 },
    { group: 'Start/Try Again Button', id: 'sliderTryAgainTextLineHeight', type: 'slider', label: 'Try Again Line Height:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Start/Try Again Button', id: 'sliderTryAgainFlashDuration', type: 'slider', label: 'Try Again "?" Flash Duration (ms):', min: 0, max: 1500, step: 10, value: 250 },
    { group: 'Start/Try Again Button', id: 'sliderTryAgainHoldDuration', type: 'slider', label: 'Try Again "?" Hold Duration (ms):', min: 0, max: 3000, step: 10, value: 1000 },
    { group: 'Rotation Animation', id: 'sliderTryAgainQuestionMarkFontSize', type: 'slider', label: '"?" Font Size (px):', min: 10, max: 500, step: 0.01, value: 257.15 },
    { group: 'Rotation Animation', id: 'sliderTryAgainQuestionMarkFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 20.09 },
    { group: 'Rotation Animation', id: 'colorTryAgainQuestionMarkFill', type: 'color', label: '"?" Color:', value: '#ffffff' },
    { group: 'Rotation Animation', id: 'sliderTryAgainQuestionMarkExtrusionDepth', type: 'slider', label: '"?" Extrusion Depth (px):', min: 0, max: 30, step: 1, value: 9 },
    { group: 'Rotation Animation', id: 'sliderTryAgainQuestionMarkOverallBorderThickness', type: 'slider', label: '"?" Overall Border Thickness (px):', min: 0, max: 30, step: 1, value: 17 },
    { group: 'Rotation Animation', id: 'colorTryAgainQuestionMarkOverallBorder', type: 'color', label: '"?" Overall Border Color:', value: '#59181b' },
    { group: 'Round Text', id: 'sliderRoundFontSize', type: 'slider', label: 'Text Font Size (px):', min: 5, max: 200, step: 0.01, value: 89.34 },
    { group: 'Round Text', id: 'sliderRoundFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 6.98 },
    { group: 'Round Text', id: 'sliderRoundDockExtrusionDepth', type: 'slider', label: 'Text Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 2 },
    { group: 'Round Text', id: 'colorRoundDockExtrusionBorder', type: 'color', label: 'Text Color:', value: '#000000' },
    { group: 'Round Text', id: 'sliderRoundDockOverallBorderThickness', type: 'slider', label: 'Text Border Thickness (px):', min: 0, max: 20, step: 1, value: 1 },
    { group: 'Round Text', id: 'colorRoundDockOverallBorder', type: 'color', label: 'Text Overall Border Color:', value: '#000000' },
    { group: 'Round Text', id: 'sliderRoundLetterSpacing', type: 'slider', label: 'Text Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Round Text', id: 'sliderRoundLineHeight', type: 'slider', label: 'Text Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Round Text', id: 'sliderRoundNumberXOffset', type: 'slider', label: 'Number X Offset (Px):', min: -50, max: 50, step: 1, value: 0 },
    { group: 'High Score', id: 'sliderHighScoreFontSize', type: 'slider', label: 'Font Size (px):', min: 5, max: 200, step: 0.01, value: 60 },
    { group: 'High Score', id: 'sliderHighScoreFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 5 },
    { group: 'High Score', id: 'sliderHighScoreExtrusionDepth', type: 'slider', label: 'Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 9 },
    { group: 'High Score', id: 'colorHighScoreExtrusionBorder', type: 'color', label: 'Text Color:', value: '#ffffff' },
    { group: 'High Score', id: 'sliderHighScoreOverallBorderThickness', type: 'slider', label: 'Border Thickness (px):', min: 0, max: 20, step: 1, value: 8 },
    { group: 'High Score', id: 'colorHighScoreOverallBorder', type: 'color', label: 'Overall Border Color:', value: '#bd0d07' },
    { group: 'High Score', id: 'sliderHighScoreLetterSpacing', type: 'slider', label: 'Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'High Score', id: 'sliderHighScoreLineHeight', type: 'slider', label: 'Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    // Per direct request ("give me a rotation slider for the high
    // score. I want to be able rotate it 90 degrees") - the CSS
    // custom property this drives (--high-score-rotate-deg) and
    // its transform: rotate(calc(var(...) * 1deg)) were already
    // wired into .high-score-text's own CSS rule and seeded into
    // both device cssVars objects (desktop/mobile, 0 default) -
    // pre-existing groundwork with no slider ever built for it
    // until now. -180 to 180 comfortably covers the requested 90
    // in either direction.
    { group: 'High Score', id: 'sliderHighScoreRotate', type: 'slider', label: 'Rotation (Deg):', min: -180, max: 180, step: 1, value: 0 },
    { group: 'High Score', id: 'sliderHighScoreFlashDelay', type: 'slider', label: 'Flash Delay (ms):', min: 0, max: 5000, step: 50, value: 0 },
    { group: 'Round Text', id: 'sliderRoundBlink1Hide', type: 'slider', label: 'Blink 1 - Disappear (ms):', min: 0, max: 1500, step: 10, value: 250 },
    { group: 'Round Text', id: 'sliderRoundBlink1Show', type: 'slider', label: 'Blink 1 - Reappear (ms):', min: 0, max: 1500, step: 10, value: 250 },
    { group: 'Round Text', id: 'sliderRoundBlink2Hide', type: 'slider', label: 'Blink 2 - Disappear (ms):', min: 0, max: 1500, step: 10, value: 250 },
    { group: 'Round Text', id: 'sliderRoundBlink2Show', type: 'slider', label: 'Blink 2 - Reappear (ms):', min: 0, max: 1500, step: 10, value: 250 },
    { group: 'Round Text', id: 'sliderRoundBlink3Hide', type: 'slider', label: 'Blink 3 - Disappear (ms):', min: 0, max: 1500, step: 10, value: 250 },
    { group: 'Round Text', id: 'sliderRoundBlink3Show', type: 'slider', label: 'Blink 3 - Reappear (ms):', min: 0, max: 1500, step: 10, value: 250 },
    { group: 'Round Text', id: 'sliderRoundBlink4Hide', type: 'slider', label: 'Blink 4 - Disappear (ms):', min: 0, max: 1500, step: 10, value: 250 },
    { group: 'Round Text', id: 'sliderRoundPostBlinkHold', type: 'slider', label: 'New Number Hold (ms):', min: 0, max: 2000, step: 10, value: 1300 },
    { group: 'Win/Lose Text', id: 'sliderResultWinFontSize', type: 'slider', label: 'Win Font Size (px):', min: 5, max: 300, step: 0.01, value: 172.8 },
    { group: 'Win/Lose Text', id: 'sliderResultWinFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 13.5 },
    { group: 'Win/Lose Text', id: 'sliderResultWinLetterSpacing', type: 'slider', label: 'Win Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Win/Lose Text', id: 'sliderResultLoseFontSize', type: 'slider', label: 'Lose Font Size (px):', min: 5, max: 300, step: 0.01, value: 172.8 },
    { group: 'Win/Lose Text', id: 'sliderResultLoseFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 13.5 },
    { group: 'Win/Lose Text', id: 'sliderResultLoseLetterSpacing', type: 'slider', label: 'Lose Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Win/Lose Text', id: 'sliderResultExtrusionDepth', type: 'slider', label: 'Extrusion Depth (px):', min: 0, max: 30, step: 1, value: 5 },
    { group: 'Win/Lose Text', id: 'sliderResultOverallBorderThickness', type: 'slider', label: 'Border Thickness (px):', min: 0, max: 20, step: 1, value: 5 },
    { group: 'Win/Lose Text', id: 'sliderResultExtrusionAngle', type: 'slider', label: 'Extrusion Angle (Deg):', min: 0, max: 360, step: 1, value: 45 },
    { group: 'Win/Lose Text', id: 'sliderResultLineHeight', type: 'slider', label: 'Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Win/Lose Text', id: 'colorResultWinFill', type: 'color', label: 'Win Fill Color:', value: '#f0fff4', dynamicDevice: true },
    { group: 'Win/Lose Text', id: 'colorResultWinBorder', type: 'color', label: 'Win Border Color:', value: '#22dd44' },
    { group: 'Win/Lose Text', id: 'colorResultLoseFill', type: 'color', label: 'Lose Fill Color:', value: '#d3a7a7', dynamicDevice: true },
    { group: 'Win/Lose Text', id: 'colorResultLoseBorder', type: 'color', label: 'Lose Border Color:', value: '#2c99dd' },
    { group: 'Win/Lose Text', id: 'colorGameplayWinText', type: 'color', label: 'Gameplay Win Text Color:', value: '#22dd44' },
    { group: 'Win/Lose Text', id: 'colorGameplayWinBorder', type: 'color', label: 'Gameplay Win Border/Extrusion Color:', value: '#22dd44' },
    { group: 'Win/Lose Text', id: 'colorGameplayLoseText', type: 'color', label: 'Gameplay Lose Text Color:', value: '#dd3333' },
    { group: 'Win/Lose Text', id: 'colorGameplayLoseBorder', type: 'color', label: 'Gameplay Lose Border/Extrusion Color:', value: '#dd3333' },
    { group: 'Target Count Display', id: 'colorTargetExtrusionBorder', type: 'color', label: 'Text Color:', value: '#000000' },
    { group: 'Target Count Display', id: 'colorTargetOverallBorder', type: 'color', label: 'Overall Border Color:', value: '#000000' },
    { group: 'Target Count Display', id: 'sliderTargetPrefixLineHeight', type: 'slider', label: 'Prefix Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Target Count Display', id: 'sliderTargetNumberLineHeight', type: 'slider', label: 'Number Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Target Count Display', id: 'sliderTargetSuffixLineHeight', type: 'slider', label: 'Suffix Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Target Count Display', id: 'sliderTargetPrefixExtrusionDepth', type: 'slider', label: 'Prefix Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 26 },
    { group: 'Target Count Display', id: 'sliderTargetPrefixOverallBorderThickness', type: 'slider', label: 'Prefix Border Thickness (px):', min: 0, max: 20, step: 1, value: 8 },
    { group: 'Target Count Display', id: 'sliderTargetPrefixLetterSpacing', type: 'slider', label: 'Prefix Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: -7 },
    { group: 'Target Count Display', id: 'sliderTargetNumberExtrusionDepth', type: 'slider', label: 'Number Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 26 },
    { group: 'Target Count Display', id: 'sliderTargetNumberOverallBorderThickness', type: 'slider', label: 'Number Border Thickness (px):', min: 0, max: 20, step: 1, value: 8 },
    { group: 'Target Count Display', id: 'sliderTargetNumberLetterSpacing', type: 'slider', label: 'Number Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: -7 },
    { group: 'Target Count Display', id: 'sliderTargetSuffixExtrusionDepth', type: 'slider', label: 'Suffix Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 26 },
    { group: 'Target Count Display', id: 'sliderTargetSuffixOverallBorderThickness', type: 'slider', label: 'Suffix Border Thickness (px):', min: 0, max: 20, step: 1, value: 8 },
    { group: 'Target Count Display', id: 'sliderTargetSuffixLetterSpacing', type: 'slider', label: 'Suffix Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: -7 },
    { group: 'Target Count Display', id: 'sliderTargetPrefixFontSize', type: 'slider', label: 'Prefix Font Size (px):', min: 5, max: 500, step: 1, value: 150 },
    { group: 'Target Count Display', id: 'sliderTargetPrefixFontSizeVw', type: 'slider', label: 'Prefix Font Size (vw):', min: 1, max: 60, step: 0.01, value: 11.72 },
    { group: 'Target Count Display', id: 'sliderTargetNumberFontSize', type: 'slider', label: 'Number Font Size (px):', min: 5, max: 500, step: 1, value: 500 },
    { group: 'Target Count Display', id: 'sliderTargetNumberFontSizeVw', type: 'slider', label: 'Number Font Size (vw):', min: 1, max: 60, step: 0.01, value: 39.06 },
    { group: 'Target Count Display', id: 'sliderTargetSuffixFontSize', type: 'slider', label: 'Suffix Font Size (px):', min: 5, max: 500, step: 1, value: 150 },
    { group: 'Target Count Display', id: 'sliderTargetSuffixFontSizeVw', type: 'slider', label: 'Suffix Font Size (vw):', min: 1, max: 60, step: 0.01, value: 11.72 },
    // X/Y Offset sliders for Prefix/Number/Suffix moved to
    // COMPOUND_OFFSET_CONTROLS (2026-09-20, direct request: "the X
    // and Y offset sliders for the target Number, Click and X
    // should be similar tot he other Ui text settings. THey are by
    // default vw and vh, unless i click the checkbox taht says
    // Px") - see that array's own comment on why all 3 parts'
    // checkboxes per axis share ONE flagVar.
    { group: 'Target Count Display', id: 'checkboxHideTargetPrefix', type: 'checkbox', label: 'Hide "Click" (Prefix)' },
    { group: 'Target Count Display', id: 'checkboxHideTargetSuffix', type: 'checkbox', label: 'Hide "x" (Suffix)' },
    { group: 'Speed Display (max ms between taps)', id: 'sliderSpeedFontSize', type: 'slider', label: 'Font Size (px):', min: 5, max: 300, step: 0.01, value: 89.34 },
    { group: 'Speed Display (max ms between taps)', id: 'sliderSpeedFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 6.98 },
    { group: 'Speed Display (max ms between taps)', id: 'sliderSpeedExtrusionDepth', type: 'slider', label: 'Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 19 },
    { group: 'Speed Display (max ms between taps)', id: 'colorSpeedExtrusionBorder', type: 'color', label: 'Text Color:', value: '#000000' },
    { group: 'Speed Display (max ms between taps)', id: 'sliderSpeedOverallBorderThickness', type: 'slider', label: 'Border Thickness (px):', min: 0, max: 20, step: 1, value: 1 },
    { group: 'Speed Display (max ms between taps)', id: 'colorSpeedOverallBorder', type: 'color', label: 'Overall Border Color:', value: '#000000' },
    { group: 'Speed Display (max ms between taps)', id: 'sliderSpeedLetterSpacing', type: 'slider', label: 'Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Speed Display (max ms between taps)', id: 'sliderSpeedNumberXOffset', type: 'slider', label: 'Countdown Number X Offset (Px):', min: -50, max: 50, step: 1, value: 0 },
    { group: 'Speed Display (max ms between taps)', id: 'sliderSpeedLineHeight', type: 'slider', label: 'Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Ms/Click Display', id: 'sliderMsPerClickFontSize', type: 'slider', label: 'Font Size (px):', min: 5, max: 300, step: 0.01, value: 69.89 },
    { group: 'Ms/Click Display', id: 'sliderMsPerClickFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 5.46 },
    { group: 'Ms/Click Display', id: 'sliderMsPerClickExtrusionDepth', type: 'slider', label: 'Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 8 },
    { group: 'Ms/Click Display', id: 'colorMsPerClickExtrusionBorder', type: 'color', label: 'Text Color:', value: '#ff0000' },
    { group: 'Ms/Click Display', id: 'sliderMsPerClickOverallBorderThickness', type: 'slider', label: 'Border Thickness (px):', min: 0, max: 20, step: 1, value: 1 },
    { group: 'Ms/Click Display', id: 'colorMsPerClickOverallBorder', type: 'color', label: 'Overall Border Color:', value: '#cc1b20' },
    { group: 'Ms/Click Display', id: 'sliderMsPerClickLetterSpacing', type: 'slider', label: 'Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Ms/Click Display', id: 'sliderMsPerClickNumberXOffset', type: 'slider', label: 'Number X Offset (Px):', min: -50, max: 50, step: 1, value: 0 },
    { group: 'Ms/Click Display', id: 'sliderMsPerClickLineHeight', type: 'slider', label: 'Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Ms/Click Display', id: 'sliderMsPerClickLine2Gap', type: 'slider', label: 'Line 2-3 Spacing (px):', min: -100, max: 200, step: 1, value: 0 },
    { group: 'Background', id: 'colorBg', type: 'color', label: 'Color:', value: '#ffffff' },
    // Round Breakdown group (nested under UI TEXT via sectionOrder,
    // see the "Round Breakdown" .dev-section markup near the end of
    // #desktopTabContent) - the design of the loss-screen round
    // breakdown box. checkbox/select/color entries here are single-
    // bucket/shared (auto-mirrored onto Mobile/Landscape via the
    // universal per-row "Show in Mobile/Landscape" system, CLAUDE.md
    // Section 12f-1); the 7 slider entries are genuinely per-device
    // (own copies in MOBILE_UNIFORM_CONTROLS/LANDSCAPE_UNIFORM_
    // CONTROLS below), matching X/Y/Width/Height's own pre-existing
    // per-device cssVars split.
    { group: 'Round Breakdown', id: 'checkboxRoundBreakdownEnabled', type: 'checkbox', label: 'Round Breakdown On/Off' },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownWidth', type: 'slider', label: 'Width (vw):', min: 10, max: 100, step: 0.1, value: 20 },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownHeight', type: 'slider', label: 'Height (vh):', min: 10, max: 100, step: 0.1, value: 45 },
    { group: 'Round Breakdown', id: 'checkboxRoundBreakdownResizerEnabled', type: 'checkbox', label: 'Panel Resizer On/Off' },
    { group: 'Round Breakdown', id: 'checkboxRoundBreakdownScaleWithBrowser', type: 'checkbox', label: 'Scale With Browser' },
    // Align/Valign + Edge Lock (see applyRoundBreakdownPosition()'s
    // own comment) - shared/single-bucket (not per-device) like this
    // group's other checkbox/select entries, per the comment on the
    // group's opening entry above.
    { group: 'Round Breakdown', id: 'selectRoundBreakdownAlign', type: 'select', label: 'Horizontal Alignment:', options: [
        { value: 'left', text: 'Left' },
        { value: 'right', text: 'Right' },
    ] },
    { group: 'Round Breakdown', id: 'checkboxRoundBreakdownAlignEdgeLock', type: 'checkbox', label: 'Horizontal Edge Lock' },
    { group: 'Round Breakdown', id: 'selectRoundBreakdownValign', type: 'select', label: 'Vertical Alignment:', options: [
        { value: 'top', text: 'Top' },
        { value: 'bottom', text: 'Bottom' },
    ] },
    { group: 'Round Breakdown', id: 'checkboxRoundBreakdownValignEdgeLock', type: 'checkbox', label: 'Vertical Edge Lock' },
    { group: 'Round Breakdown', id: 'selectRoundBreakdownFont', type: 'select', label: 'Font:', options: [
        { value: 'monospace', text: 'Monospace (Default)' },
        { value: 'Press Start 2P', text: 'Press Start 2P' },
        { value: 'VT323', text: 'VT323' },
        { value: 'Silkscreen', text: 'Silkscreen' },
        { value: 'Pixelify Sans', text: 'Pixelify Sans' },
        { value: 'Jersey 15', text: 'Jersey 15' },
        { value: 'DotGothic16', text: 'DotGothic16' },
        { value: 'Micro 5', text: 'Micro 5' },
        { value: 'Handjet', text: 'Handjet' },
        { value: 'Tiny5', text: 'Tiny5' },
        { value: 'Jacquard 12', text: 'Jacquard 12' },
        { value: 'Jacquarda Bastarda 9', text: 'Jacquarda Bastarda 9' },
        { value: 'Jersey 25', text: 'Jersey 25' },
        { value: 'Jersey 10', text: 'Jersey 10' },
        { value: 'Jersey 20', text: 'Jersey 20' },
        { value: 'Jacquard 24', text: 'Jacquard 24' },
        { value: 'Archivo Black', text: 'Archivo Black' },
        { value: 'Anton', text: 'Anton' },
        { value: 'Titan One', text: 'Titan One' },
        { value: 'Bungee', text: 'Bungee' },
        { value: 'Bungee Inline', text: 'Bungee Inline' },
        { value: 'Luckiest Guy', text: 'Luckiest Guy' },
        { value: 'Black Ops One', text: 'Black Ops One' },
        { value: 'Rubik Mono One', text: 'Rubik Mono One' },
        { value: 'Modak', text: 'Modak' },
        { value: 'Bowlby One', text: 'Bowlby One' },
    ] },
    { group: 'Round Breakdown', id: 'checkboxRoundBreakdownOutlineEnabled', type: 'checkbox', label: 'Outline On/Off' },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownOutlineThickness', type: 'slider', label: 'Outline Thickness (px):', min: 0, max: 20, step: 1, value: 2 },
    { group: 'Round Breakdown', id: 'colorRoundBreakdownOutline', type: 'color', label: 'Outline Color:', value: '#000000' },
    { group: 'Round Breakdown', id: 'checkboxRoundBreakdownRowLinesEnabled', type: 'checkbox', label: 'Row Divider Lines On/Off' },
    { group: 'Round Breakdown', id: 'colorRoundBreakdownPanel', type: 'color', label: 'Panel Color:', value: '#ffffff' },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownPanelOpacity', type: 'slider', label: 'Panel Opacity (Background Only):', min: 0, max: 1, step: 0.01, value: 0.94 },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownTitleFontSize', type: 'slider', label: 'Round Title Font Size (px):', min: 8, max: 60, step: 1, value: 16 },
    { group: 'Round Breakdown', id: 'checkboxRoundBreakdownTitleBold', type: 'checkbox', label: 'Round Title Bold' },
    { group: 'Round Breakdown', id: 'colorRoundBreakdownTitle', type: 'color', label: 'Round Title Color:', value: '#333333' },
    { group: 'Round Breakdown', id: 'colorRoundBreakdownLostTitle', type: 'color', label: 'Round Title Color (Lost Round):', value: '#cc0000' },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownTitleLetterSpacing', type: 'slider', label: 'Round Title Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownTitleLineHeight', type: 'slider', label: 'Round Title Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownDataFontSize', type: 'slider', label: 'Round Data Font Size (px):', min: 8, max: 40, step: 1, value: 15 },
    { group: 'Round Breakdown', id: 'checkboxRoundBreakdownDataBold', type: 'checkbox', label: 'Round Data Bold' },
    { group: 'Round Breakdown', id: 'colorRoundBreakdownData', type: 'color', label: 'Round Data Color:', value: '#333333' },
    { group: 'Round Breakdown', id: 'colorRoundBreakdownLostData', type: 'color', label: 'Round Data Color (Lost Round):', value: '#cc0000' },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownDataLetterSpacing', type: 'slider', label: 'Round Data Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownDataLineHeight', type: 'slider', label: 'Round Data Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    // Auto Scroll (see restartRoundBreakdownAutoscroll()'s own
    // comment) - shared/single-bucket like this group's other
    // checkbox entries.
    { group: 'Round Breakdown', id: 'checkboxRoundBreakdownAutoscrollEnabled', type: 'checkbox', label: 'Auto Scroll On/Off' },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownAutoscrollSpeed', type: 'slider', label: 'Auto Scroll Speed (px/sec):', min: 5, max: 300, step: 1, value: 30 },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownAutoscrollPauseBefore', type: 'slider', label: 'Pause Before Auto Scroll (ms):', min: 0, max: 10000, step: 100, value: 1500 },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownAutoscrollPauseEnd', type: 'slider', label: 'Pause At End Of Scroll (ms):', min: 0, max: 10000, step: 100, value: 1500 },
];
// Resolves a group's .dev-section-content by data-sid, warning on
// either 0 matches (group not found) or 2+ matches (a data-sid
// collision - the same shape of bug as the "New Group"/"New Group
// (2)" order-sync collision this session already hit once, just on
// the render side instead of the reorder side). Shared by every
// render*Controls() function below instead of each repeating its
// own querySelector call with only the missing-group case checked.
function findGroupContent(tabId, groupSid, callerName, ctrlId) {
    // Descendant selector (not a direct-child `>` combinator) - a
    // group is findable by its data-sid no matter how deep it's
    // been drag-nested, not just while it's still a top-level tab
    // child. Direct-child-only used to be fine for every call site
    // BUILT WHILE the panel is first constructed (static groups are
    // still top-level at that point, before applySectionOrder()
    // ever moves anything) - but ensureDynamicDeviceRow() (the
    // "Show in Mobile/Landscape" checkbox's own live row-creation)
    // runs on-demand, any time AFTER the page has already restored
    // its saved nesting, so it kept silently failing for any group
    // a user had organized under a custom wrapper (confirmed via
    // direct report - checking Round Breakdown's own Auto Scroll
    // On/Off for Mobile did nothing, console showing "group not
    // found" for it and several other now-nested groups). A
    // descendant selector still finds an UN-nested (top-level)
    // group exactly as before (strictly a superset of the old
    // matches, nothing that worked before can stop working) - the
    // existing "2+ matches" collision warning below is unchanged,
    // still catching a genuine data-sid duplicate.
    const matches = document.querySelectorAll('#' + tabId + 'TabContent .dev-section > .dev-section-title[data-sid="' + groupSid.replace(/"/g, '\\"') + '"]');
    if (matches.length === 0) {
        console.warn(callerName + ': group not found', groupSid, ctrlId);
        return null;
    }
    if (matches.length > 1) {
        console.warn(callerName + ': ' + matches.length + ' groups share this data-sid (using the first) - a rename/duplication collision', groupSid, ctrlId);
    }
    return matches[0].nextElementSibling;
}
// Split into one builder per control type (was a single function
// with 4 stacked type-branches, growing by one branch each time a
// new control shape showed up this session - slider/color, then
// select, then checkbox) + a thin dispatch table, per this
// session's own architecture review. buildUniformControlRow(ctrl)
// keeps its exact same signature/behavior for every existing call
// site - this is a pure reorganization, no output change.
function buildSliderRow(ctrl) {
    const row = document.createElement('div');
    row.className = 'dev-row';
    const label = document.createElement('span');
    label.className = 'dev-label';
    label.textContent = ctrl.label;
    row.appendChild(label);
    // Editable min/max bound labels at each end of the track,
    // ported 2026-09-28 from TEMPLATE_DEV_PANEL.html - same
    // click-to-type interaction as the value readout below
    // (makeDevSliderBoundsEditable()), but targets the slider's
    // own min/max instead of its current value.
    const minLabel = document.createElement('span');
    minLabel.className = 'dev-slider-bound dev-slider-bound-editable';
    minLabel.dataset.sliderId = ctrl.id;
    minLabel.dataset.bound = 'min';
    minLabel.textContent = ctrl.min;
    row.appendChild(minLabel);
    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'dev-slider';
    input.id = ctrl.id;
    input.min = ctrl.min;
    input.max = ctrl.max;
    input.step = ctrl.step;
    input.value = ctrl.value;
    row.appendChild(input);
    const maxLabel = document.createElement('span');
    maxLabel.className = 'dev-slider-bound dev-slider-bound-editable';
    maxLabel.dataset.sliderId = ctrl.id;
    maxLabel.dataset.bound = 'max';
    maxLabel.textContent = ctrl.max;
    row.appendChild(maxLabel);
    const value = document.createElement('span');
    value.className = 'dev-value';
    value.id = ctrl.id.replace(/^slider/, 'value');
    value.textContent = ctrl.value;
    row.appendChild(value);
    return row;
}
function buildColorRow(ctrl) {
    const row = document.createElement('div');
    row.className = 'dev-row';
    const label = document.createElement('span');
    label.className = 'dev-label';
    label.textContent = ctrl.label;
    row.appendChild(label);
    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'dev-color-picker';
    input.id = ctrl.id;
    input.value = ctrl.value;
    row.appendChild(input);
    // Optional small descriptive note (e.g. "(grayscale + tint)")
    // some color pickers have instead of a normal value readout.
    if (ctrl.note) {
        const note = document.createElement('span');
        note.className = 'dev-value';
        note.style.fontSize = '9px';
        note.style.color = '#888';
        note.textContent = ctrl.note;
        row.appendChild(note);
    }
    return row;
}
function buildSelectRow(ctrl) {
    const row = document.createElement('div');
    row.className = 'dev-row';
    const label = document.createElement('span');
    label.className = 'dev-label';
    label.textContent = ctrl.label;
    row.appendChild(label);
    const select = document.createElement('select');
    select.className = 'dev-select';
    select.id = ctrl.id;
    ctrl.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
    });
    row.appendChild(select);
    return row;
}
// Checkboxes use an inverted shape vs every other control here - a
// <label> wraps the checkbox FIRST, then a dev-label span for the
// text AFTER - so this doesn't share the label-first row skeleton
// the other 3 builders use.
function buildCheckboxRow(ctrl) {
    const row = document.createElement('div');
    row.className = 'dev-row';
    const wrapLabel = document.createElement('label');
    wrapLabel.style.cssText = 'display:flex; align-items:center; gap:6px; cursor:pointer;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = ctrl.id;
    wrapLabel.appendChild(input);
    const span = document.createElement('span');
    span.className = 'dev-label';
    span.style.minWidth = 'auto';
    span.textContent = ctrl.label;
    wrapLabel.appendChild(span);
    row.appendChild(wrapLabel);
    return row;
}
const UNIFORM_ROW_BUILDERS = {
    slider: buildSliderRow,
    color: buildColorRow,
    select: buildSelectRow,
    checkbox: buildCheckboxRow,
};
function buildUniformControlRow(ctrl) {
    const builder = UNIFORM_ROW_BUILDERS[ctrl.type];
    if (!builder) {
        console.error('buildUniformControlRow: unknown control type', ctrl.type, ctrl.id);
        const row = document.createElement('div');
        row.className = 'dev-row';
        return row;
    }
    return builder(ctrl);
}
// Appends each generated row into its matching group's
// .dev-section-content, found by data-sid (the group's frozen
// original title - see getSectionKey()'s own comment). Must run
// BEFORE setupDevSliders()/etc below so the generic event-wiring
// loops see these elements already in the DOM. Insertion order
// within a group doesn't need to match the original interleaving
// with bespoke rows - captureSectionOrder()/applySectionOrder()
// (via loadSettings(), which runs right after this) re-derives the
// real display order from saved data by row id regardless of
// where a row was inserted, the same way it already does for
// custom drag-created groups.
// Dynamic Mobile/Landscape visibility + independence (2026-09-17) -
// ported from TEMPLATE_DEV_PANEL.html's own [JS-4b0] system, itself
// the ancestor of DickoClicko's "Show On Mobile & Landscape"/
// independence checkboxes - per direct request to integrate
// DickoClicko's checkbox system into Clicko. Scoped to
// DESKTOP_UNIFORM_CONTROLS entries only (the ~54 hand-written
// "bespoke" rows are out of scope, matching the template's own
// scope note for non-uniform controls).
//
// UNLIKE the template (whose Desktop array is the only source, and
// every tab's row is either mirrored-from or independent-of it),
// Clicko's own MOBILE_UNIFORM_CONTROLS/LANDSCAPE_UNIFORM_CONTROLS
// are separate, independently-authored arrays - most Desktop
// controls already HAVE a real per-tab counterpart there (already
// independently tunable per §12f, no dynamicDevice needed).
// `dynamicDevice: true` is therefore meaningful on a Desktop
// control that has NO existing Mobile/Landscape counterpart (a
// genuinely SHARED control, e.g. most colors) - toggling "Show in
// Mobile/Landscape" DYNAMICALLY creates/destroys that tab's own row
// for it, cloning the desktop ctrl's own definition under a
// translated id - the template's own ensureDynamicTargetRow()
// concept, applied to a control that otherwise has zero rows
// outside Desktop.
let devVisibility = {}; // { [desktopId]: boolean } - see isDevRowVisible() for the real default when absent
let devIndependence = { mobile: {}, landscape: {} }; // { [desktopId]: boolean } - see isDevRowIndependent() for the real default when absent
let devDeviceValues = { mobile: {}, landscape: {} }; // { [desktopId]: lastIndependentValue } - retained even while hidden/non-independent

// { [stage2ElementId]: { position: {...}, size: {...} } } - a saved
// structural override for a UI-Engine Stage 2 element's position.mode
// (and size.mode, if present), captured by the Inspector-writeback
// module further down and restored (lazily, on next Inspector
// selection) by that same module. Direct report (2026-09-20): "i
// changed Position Mode for the Target Prefix X, saved, and on
// refresh its showing the old mode" - root cause, confirmed by
// reading the registration code: every Stage2 element's
// createUIElement({...}) call hardcodes its OWN position.mode at
// every page load (e.g. stage2TargetPrefixX always registers as
// mode:'anchor'), and Clicko's real save system had no concept of
// "position mode" at all - only cssVars-backed VALUE fields
// (offset/anchor/width/height/gap) were ever written back by the
// prior writeback fix, never the structural mode field itself. This
// is a plain classic-script `let` (same visibility pattern as
// cssVars/devVisibility above) so the writeback module can read the
// live binding, and applyLoadedSettings() below can wholesale-
// reassign it the same way it already does for devVisibility.
let stage2EngineOverrides = {};

// Universal application (2026-09-17, direct request: "regardless of
// existing situation, the checkboxes should exist... You simply
// need to adapt the existing settings (shared, unshared) to the
// new system... dont change my actual project input settings, just
// adapt the project to show the differences with the checkbox
// style") - EVERY DESKTOP_UNIFORM_CONTROLS entry gets both
// checkboxes now, not just the 3 originally opted-in via
// `dynamicDevice: true` (that flag is now vestigial - harmless if
// still present on old entries, never required). The REQUIREMENT
// that made this safe to do broadly, not just add-checkboxes-and-
// hope: every checkbox's DEFAULT state must reproduce EXACTLY what
// the panel already does today, for every one of the ~250 existing
// controls, with zero value changes - hasStaticDeviceCounterpart()
// below is what makes that possible, by checking whether a REAL
// static Mobile/Landscape array entry already exists for a given
// Desktop control (~102/153 do - "already independent" controls
// like most sliders; ~51/153 don't - "shared" controls like most
// colors, which showed on Desktop only until now).
function hasStaticDeviceCounterpart(desktopId, tab) {
    const targetId = dynamicDeviceTargetId(desktopId, tab);
    if (!targetId) return false;
    const arr = tab === 'landscape' ? LANDSCAPE_UNIFORM_CONTROLS : MOBILE_UNIFORM_CONTROLS;
    if (arr.some(c => c.id === targetId)) return true;
    // Fallback for a control OUTSIDE the DESKTOP_UNIFORM_CONTROLS/
    // MOBILE_UNIFORM_CONTROLS/LANDSCAPE_UNIFORM_CONTROLS array
    // system entirely - the many hand-authored "text settings
    // battery" rows (Round/High Score/Result Win/Lose/Target/
    // Speed/Ms-per-Click/Try Again/etc, per-device, static HTML,
    // never registered in any array). A real DOM element already
    // existing at this id means a real per-device value genuinely
    // exists for it - same reasoning as the array check above,
    // just for a control the array-driven system doesn't know
    // about. Safe for the array-driven system's OWN self-
    // referential timing (a control's own row, mid-construction,
    // isn't in the DOM yet at the moment this runs for it) because
    // the array check above already returns true for those first -
    // this fallback is only ever reached for a control the array
    // doesn't cover, and a hand-authored static row is present in
    // the DOM from initial page parse, well before any
    // render*Controls() call runs.
    return !!document.getElementById(targetId);
}
function findStaticDeviceCtrl(desktopId, tab) {
    const targetId = dynamicDeviceTargetId(desktopId, tab);
    if (!targetId) return null;
    const arr = tab === 'landscape' ? LANDSCAPE_UNIFORM_CONTROLS : MOBILE_UNIFORM_CONTROLS;
    return arr.find(c => c.id === targetId) || null;
}
// Reads the REAL, currently-loaded live value for a device/tab
// (not the static array's own `value:` literal, which is only a
// fallback default and can drift from what's actually live - same
// dual-source-of-truth risk this file already flags elsewhere) -
// used to seed devDeviceValues correctly when a category-B row is
// torn down (visibility unchecked) then rebuilt (rechecked), so
// the rebuilt row shows what was REALLY there, not a stale
// hardcoded default.
function readLiveDeviceValue(desktopId, tab) {
    const varName = CSS_VAR_SLIDER_MAP[desktopId];
    if (varName) return (tab === 'landscape' ? landscapeCssVars : mobileCssVars)[varName];
    const extrusionKey = EXTRUSION_SLIDER_MAP[desktopId];
    if (extrusionKey) return (tab === 'landscape' ? landscapeExtrusionVars : mobileExtrusionVars)[extrusionKey];
    const colorVarName = COLOR_VAR_MAP[desktopId];
    if (colorVarName) return (tab === 'landscape' ? landscapeColorVars : mobileColorVars)[colorVarName];
    const colorExtrusionKey = EXTRUSION_COLOR_MAP[desktopId];
    if (colorExtrusionKey) return (tab === 'landscape' ? landscapeExtrusionVars : mobileExtrusionVars)[colorExtrusionKey];
    return undefined;
}
// Default (when devVisibility[desktopId] was never explicitly set
// by a real checkbox interaction or a loaded save) reproduces
// TODAY's actual behavior exactly: visible if a real static
// Mobile OR Landscape row already exists anywhere for it (an
// "already independent" control was always shown on both tabs;
// asymmetric cases - confirmed only 2 of 153 controls,
// sliderButtonMaxScale/MinScale, which have Mobile but not
// Landscape - default to visible too, matching their Mobile
// presence, with Landscape seeded fresh from Desktop's own value
// the first time), hidden if neither exists (a "shared" control
// was never shown on Mobile/Landscape until now).
function isDevRowVisible(desktopId) {
    if (devVisibility[desktopId] !== undefined) return devVisibility[desktopId];
    return hasStaticDeviceCounterpart(desktopId, 'mobile') || hasStaticDeviceCounterpart(desktopId, 'landscape');
}
// Default (when devIndependence[tab][desktopId] was never
// explicitly set) reproduces TODAY's actual behavior exactly:
// independent (own value) if a real static row already exists for
// THIS tab specifically - matching that it already has its own
// real, separately-tuned value today; not independent (mirrors
// Desktop) only for a newly-shown-for-the-first-time "shared"
// control, which has never had its own Mobile/Landscape value to
// be independent WITH.
function isDevRowIndependent(tab, desktopId) {
    if (devIndependence[tab] && devIndependence[tab][desktopId] !== undefined) return devIndependence[tab][desktopId];
    return hasStaticDeviceCounterpart(desktopId, tab);
}

// Re-syncs every already-built .dev-visibility-checkbox/.dev-independence-checkbox
// element's own .checked DOM property from devVisibility/devIndependence -
// needed after a state restore (Undo/Reset/Load), since those only
// restore the underlying state objects, never touch checkbox elements
// that already exist in the DOM. Call BEFORE injectGroupDeviceCheckboxes()
// (group checkboxes are computed by reading these row checkboxes).
function syncDeviceCheckboxesFromState() {
    document.querySelectorAll('#desktopTabContent .dev-visibility-checkbox').forEach(cb => {
        const controlEl = cb.closest('.dev-row') && cb.closest('.dev-row').querySelector('[id]');
        if (!controlEl) return;
        cb.checked = isDevRowVisible(controlEl.id);
        // Also re-applies hide/show to any static (non-array-driven)
        // Mobile/Landscape counterpart - see syncStaticRowVisibility()'s
        // own comment. A no-op for an array-driven control (already
        // handled by syncDynamicDeviceRows(), called just before this
        // at every real call site).
        syncStaticRowVisibility(controlEl.id);
    });
    ['mobile', 'landscape'].forEach(tab => {
        document.querySelectorAll('#' + tab + 'TabContent .dev-independence-checkbox').forEach(cb => {
            const controlEl = cb.closest('.dev-row') && cb.closest('.dev-row').querySelector('[id]');
            if (!controlEl) return;
            const { desktopId } = resolveDevControlId(controlEl.id);
            cb.checked = isDevRowIndependent(tab, desktopId);
        });
    });
}

function readDevControlValue(id) {
    const el = document.getElementById(id);
    if (!el) return undefined;
    return el.type === 'checkbox' ? el.checked : el.value;
}
function writeDevControlValue(id, value) {
    const el = document.getElementById(id);
    if (!el || value === undefined) return;
    if (el.type === 'checkbox') el.checked = value; else el.value = value;
}
// desktopId -> that same control's Mobile/Landscape-prefixed id,
// mirroring resolveDevControlId()'s own inverse (that function
// strips a Mobile/Landscape infix; this inserts one) - e.g.
// 'colorResultWinFill' -> 'colorMobileResultWinFill'. Matches this
// project's established slider/color/select/checkbox-prefix
// convention.
function dynamicDeviceTargetId(desktopId, tab) {
    const infix = tab === 'landscape' ? 'Landscape' : 'Mobile';
    const m = desktopId.match(/^(slider|color|select|checkbox)(.+)$/);
    return m ? (m[1] + infix + m[2]) : null;
}
// Per-desktopId reentrancy guard (a Set, not one shared boolean -
// a different control's mirror must stay free to run while this
// one is mid-broadcast). Both mirror directions below check/set
// this before touching anything, which is what actually breaks the
// cycle - dispatching a mirrored value on a sibling tab's control
// ALSO triggers that tab's own onDevDynamicTargetEdited() listener
// (the exact same event, there's no way to tag it "synthetic"), so
// without this guard a Desktop edit -> Mobile write+dispatch ->
// Mobile's own "not independent, treat as a Desktop edit" listener
// -> Landscape write+dispatch -> Landscape's own listener -> Mobile
// write+dispatch again -> ... genuinely hangs the page forever (2
// earlier attempts at this - an exclude-the-originating-tab-only
// version, then a single shared boolean flag - both still looped
// between the 2 SIBLING tabs even though they correctly stopped
// the Desktop<->one-tab case; caught via a live synthetic-event
// test that hung for 45s before this Set-based version was tried).
const devDynamicBroadcastInProgress = new Set();
// Broadcasts Desktop's CURRENT value onto every non-independent
// Mobile/Landscape dynamic row for it, skipping `excludeTab` (the
// tab that originated this broadcast, if any - it already reflects
// this value, both in its own element and in setupDevSliders()'s
// already-applied cssVars, since dispatching there is what
// triggered this whole call in the first place).
function broadcastDesktopValue(desktopId, excludeTab) {
    if (devDynamicBroadcastInProgress.has(desktopId)) return;
    devDynamicBroadcastInProgress.add(desktopId);
    try {
        const value = readDevControlValue(desktopId);
        ['mobile', 'landscape'].forEach(tab => {
            if (tab === excludeTab) return;
            if (isDevRowIndependent(tab, desktopId)) return;
            const targetId = dynamicDeviceTargetId(desktopId, tab);
            const targetEl = document.getElementById(targetId);
            if (!targetEl) return;
            writeDevControlValue(targetId, value);
            targetEl.dispatchEvent(new Event(targetEl.type === 'checkbox' || targetEl.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
        });
    } finally {
        devDynamicBroadcastInProgress.delete(desktopId);
    }
}
// Live-mirrors a Desktop edit onto any currently-existing,
// non-independent Mobile/Landscape dynamic row for it - wired once
// per control (dataset guard, same pattern as the template's own
// targetEl.dataset.indepWired below).
function wireDesktopMirrorSource(controlEl, desktopId) {
    if (!controlEl || controlEl.dataset.mirrorWired) return;
    controlEl.dataset.mirrorWired = '1';
    const evt = controlEl.type === 'checkbox' || controlEl.tagName === 'SELECT' ? 'change' : 'input';
    controlEl.addEventListener(evt, () => broadcastDesktopValue(desktopId, null));
}
// Called when a Mobile/Landscape dynamic row is edited directly.
// While NOT independent, the edit is understood as editing
// Desktop's own value (which this row is just mirroring) - writes
// Desktop's own element directly (never dispatches there - that
// would re-enter this same handler via wireDesktopMirrorSource)
// and broadcasts to any OTHER non-independent sibling tab. The
// devDynamicBroadcastInProgress guard inside broadcastDesktopValue()
// is what actually makes it safe to call this unconditionally even
// while a broadcast for this SAME desktopId is already underway
// (e.g. this call itself was caused by that very broadcast) -
// it just no-ops instead of re-entering. While independent, this
// just updates this tab's own retained value.
function onDevDynamicTargetEdited(tab, desktopId, targetId) {
    if (isDevRowIndependent(tab, desktopId)) {
        devDeviceValues[tab][desktopId] = readDevControlValue(targetId);
        return;
    }
    writeDevControlValue(desktopId, readDevControlValue(targetId));
    broadcastDesktopValue(desktopId, tab);
}
// Desktop-only: "Show in Mobile/Landscape" - unchecking removes any
// existing dynamic Mobile/Landscape row for this control (next
// sync); checking restores it, seeded from devDeviceValues (or
// Desktop's current value, the first time).
function buildVisibilityCheckbox(controlEl, desktopId) {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'dev-visibility-checkbox';
    cb.title = 'Show in Mobile/Landscape';
    cb.checked = isDevRowVisible(desktopId);
    cb.addEventListener('click', e => e.stopPropagation());
    cb.addEventListener('change', () => {
        devVisibility[desktopId] = cb.checked;
        syncDynamicDeviceRows();
        syncStaticRowVisibility(desktopId);
        refreshEmptyGroupVisibility('mobile');
        refreshEmptyGroupVisibility('landscape');
        const sec = cb.closest('.dev-section');
        if (sec) refreshGroupCascadeCheckboxState(sec, 'visibility');
    });
    wireDesktopMirrorSource(controlEl, desktopId);
    return cb;
}
// Mobile/Landscape-only: "Independent from Desktop." Unchecking
// immediately snaps this row back to Desktop's current value;
// checking restores whatever this tab's own value was the last
// time it was independent (devDeviceValues), or leaves the current
// (mirrored) value in place the first time.
function buildIndependenceCheckbox(tab, desktopId, targetEl) {
    const targetId = targetEl ? targetEl.id : null;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'dev-independence-checkbox';
    cb.title = 'Independent from Desktop';
    cb.checked = isDevRowIndependent(tab, desktopId);
    cb.addEventListener('click', e => e.stopPropagation());
    cb.addEventListener('change', () => {
        devIndependence[tab][desktopId] = cb.checked;
        if (cb.checked) {
            const restored = devDeviceValues[tab][desktopId];
            if (restored !== undefined) writeDevControlValue(targetId, restored);
        } else {
            // Captures the CURRENT (about-to-be-overwritten) value
            // before snapping to Desktop's - otherwise a control
            // that defaults independent (a real category-B value,
            // never live-edited this session so onDevDynamicTargetEdited
            // never ran) loses its only copy of that tuned value the
            // first time it's unchecked, since devDeviceValues was
            // never populated for it. Found live via direct report
            // ("the previously set settings within the mobile and
            // landscape tab should still be retained... if i decide
            // to implement them again, the same settings will be
            // used") - confirmed via direct test (199.17 -> uncheck
            // -> 396.26 -> recheck -> stayed 396.26 instead of
            // restoring 199.17).
            devDeviceValues[tab][desktopId] = readDevControlValue(targetId);
            writeDevControlValue(targetId, readDevControlValue(desktopId));
        }
        const sec = cb.closest('.dev-section');
        if (sec) refreshGroupCascadeCheckboxState(sec, 'independence');
    });
    if (targetEl && !targetEl.dataset.indepWired) {
        targetEl.dataset.indepWired = '1';
        targetEl.addEventListener(targetEl.type === 'checkbox' || targetEl.tagName === 'SELECT' ? 'change' : 'input', () => onDevDynamicTargetEdited(tab, desktopId, targetId));
    }
    return cb;
}
// Group-level cascade checkboxes (2026-09-17, direct request: "in
// Mobile tab, the group and settings gets their own checkboxes" -
// group-level was explicitly part of the universal checkbox ask,
// not just per-setting). A SIBLING of .dev-section-title (same
// reasoning as the lock icon/drag handle just above it in this
// file: the title's own rename-mode rewrites its whole
// textContent, which would silently delete a child element).
// Desktop groups get ONE visibility cascade checkbox; Mobile/
// Landscape groups get ONE independence cascade checkbox - never
// both on the same group, matching which single checkbox kind
// that tab's own rows show. No persisted state of its own - its
// checked/indeterminate display is always COMPUTED from current
// children (recomputeGroupCascadeCheckboxState()), and a real
// click just writes through to every child row's real checkbox
// (and recurses into nested subgroups) - modeled directly on
// DickoClicko's own buildGroupIndependenceCheckbox()/
// buildGroupVisibilityCheckbox() (per direct request, "look at
// DickoClicko. its implemented correctly there").
function buildGroupCascadeCheckbox(sectionEl, kind) {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'dev-group-device-checkbox';
    cb.dataset.cascadeKind = kind;
    cb.title = kind === 'visibility' ? 'Show in Mobile/Landscape (whole group)' : 'Independent from Desktop (whole group)';
    cb.addEventListener('click', e => e.stopPropagation());
    cb.addEventListener('pointerdown', e => e.stopPropagation());
    cb.addEventListener('change', () => {
        const checked = cb.checked;
        const content = sectionEl.querySelector(':scope > .dev-section-content');
        if (!content) return;
        content.querySelectorAll(':scope > .dev-row [id]').forEach(idEl => {
            const rowCb = idEl.closest('.dev-row').querySelector(kind === 'visibility' ? '.dev-visibility-checkbox' : '.dev-independence-checkbox');
            if (rowCb && rowCb.checked !== checked) { rowCb.checked = checked; rowCb.dispatchEvent(new Event('change')); }
        });
        content.querySelectorAll(':scope > .dev-section').forEach(subSec => {
            const subCb = subSec.querySelector(':scope > .dev-group-device-checkbox[data-cascade-kind="' + kind + '"]');
            // subCb.indeterminate is checked separately from
            // subCb.checked !== checked - a subgroup already showing
            // checked:false/indeterminate:true (mixed) would
            // otherwise be silently skipped (false !== false is
            // false), leaving its own descendants completely
            // untouched by the cascade. Found live: unchecking a
            // large group (UI TEXT) left a nested mixed-state
            // subgroup (High Score) - and everything under it -
            // fully checked, never actually cascaded into at all.
            if (subCb && (subCb.indeterminate || subCb.checked !== checked)) {
                subCb.checked = checked;
                subCb.indeterminate = false;
                subCb.dispatchEvent(new Event('change'));
            }
        });
    });
    sectionEl.appendChild(cb);
    return cb;
}
// Recomputes ONE group's own cascade checkbox checked/indeterminate
// display from its CURRENT direct children (rows + subgroups) -
// never trusts stale state, always walks the live DOM, same
// "never trust static membership" reasoning as the lock icon/drag
// handle system. A child that's itself indeterminate propagates
// indeterminate upward (mixed-within-mixed is still mixed).
function recomputeGroupCascadeCheckboxState(sectionEl, kind) {
    const cb = sectionEl.querySelector(':scope > .dev-group-device-checkbox[data-cascade-kind="' + kind + '"]');
    if (!cb) return;
    const content = sectionEl.querySelector(':scope > .dev-section-content');
    if (!content) { cb.indeterminate = false; cb.checked = true; return; }
    const states = [];
    content.querySelectorAll(':scope > .dev-row [id]').forEach(idEl => {
        const rowCb = idEl.closest('.dev-row').querySelector(kind === 'visibility' ? '.dev-visibility-checkbox' : '.dev-independence-checkbox');
        if (rowCb) states.push(rowCb.checked);
    });
    content.querySelectorAll(':scope > .dev-section').forEach(subSec => {
        const subCb = subSec.querySelector(':scope > .dev-group-device-checkbox[data-cascade-kind="' + kind + '"]');
        if (subCb) states.push(subCb.indeterminate ? null : subCb.checked);
    });
    if (!states.length) { cb.indeterminate = false; cb.checked = true; return; }
    if (states.some(s => s === null) || states.some(s => s !== states[0])) {
        cb.indeterminate = true;
    } else {
        cb.indeterminate = false;
        cb.checked = states[0];
    }
}
// Recomputes sectionEl's OWN cascade checkbox, then walks every
// ancestor group doing the same - called after any individual row
// checkbox changes (both a real click and a group-cascade write-
// through), so an ancestor never shows a stale all-checked/all-
// unchecked state.
function refreshGroupCascadeCheckboxState(sectionEl, kind) {
    let sec = sectionEl;
    while (sec) {
        recomputeGroupCascadeCheckboxState(sec, kind);
        sec = sec.parentElement ? sec.parentElement.closest('.dev-section') : null;
    }
}
// One-time pass over every group already in the DOM, same "tab-
// wide, any nesting depth" pattern as injectGroupLockIcons() just
// above - a group's kind is fixed by which tab it's on (Desktop ->
// visibility, Mobile/Landscape -> independence), never both.
// Innermost-first (reversed document order) so a parent's own
// recompute sees its children's ALREADY-correct state, not their
// stale just-built default.
function injectGroupDeviceCheckboxes() {
    const desktopTab = document.getElementById('desktopTabContent');
    if (desktopTab) {
        const sections = Array.from(desktopTab.querySelectorAll('.dev-section')).reverse();
        sections.forEach(sec => {
            if (!sec.querySelector(':scope > .dev-group-device-checkbox[data-cascade-kind="visibility"]')) buildGroupCascadeCheckbox(sec, 'visibility');
            recomputeGroupCascadeCheckboxState(sec, 'visibility');
        });
    }
    ['mobileTabContent', 'landscapeTabContent'].forEach(tabId => {
        const tabEl = document.getElementById(tabId);
        if (!tabEl) return;
        const sections = Array.from(tabEl.querySelectorAll('.dev-section')).reverse();
        sections.forEach(sec => {
            if (!sec.querySelector(':scope > .dev-group-device-checkbox[data-cascade-kind="independence"]')) buildGroupCascadeCheckbox(sec, 'independence');
            recomputeGroupCascadeCheckboxState(sec, 'independence');
        });
    });
}
// Creates (or removes) one tab's own row for a Desktop control,
// based on its current visibility flag - universal now (2026-09-17,
// see devVisibility's own comment), not just for the originally
// opted-in controls. Prefers the REAL static Mobile/Landscape ctrl
// definition (findStaticDeviceCtrl()) when one exists - a
// category-B control's own min/max/label frequently differ from
// Desktop's (e.g. Main Button Diameter: Desktop 5-60, Mobile
// 5-120), so cloning Desktop's own definition (the ONLY option for
// a genuinely new category-A control, which has no real definition
// to prefer) would be wrong for category B. This path only
// actually runs for a category-B control when its row was torn
// down (visibility unchecked) and is now being rebuilt (rechecked)
// - on a normal page load, its STATIC row already exists (built by
// renderMobileUniformControls()/renderLandscapeUniformControls()
// BEFORE this function's own caller runs - see the ordering note
// at that call site) and this function just no-ops via the
// `existingEl` check below.
function ensureDynamicDeviceRow(desktopCtrl, tab) {
    const targetId = dynamicDeviceTargetId(desktopCtrl.id, tab);
    if (!targetId) return;
    const existingEl = document.getElementById(targetId);
    if (!isDevRowVisible(desktopCtrl.id)) {
        if (existingEl) existingEl.closest('.dev-row').remove();
        return;
    }
    if (existingEl) return; // already built (static or previously dynamic)
    const content = findGroupContent(tab, desktopCtrl.group, 'ensureDynamicDeviceRow', desktopCtrl.id);
    if (!content) return;
    const realCtrl = findStaticDeviceCtrl(desktopCtrl.id, tab);
    const targetCtrl = realCtrl ? Object.assign({}, realCtrl) : Object.assign({}, desktopCtrl, { id: targetId });
    delete targetCtrl.dynamicDevice;
    const row = buildUniformControlRow(targetCtrl);
    row.dataset.dynamicDeviceFor = desktopCtrl.id;
    const targetEl = row.querySelector('[id]');
    content.appendChild(row); // must be in the document before writeDevControlValue()'s own getElementById lookup and setupDevSliders()'s own wiring can find it
    const seeded = devDeviceValues[tab][desktopCtrl.id];
    const liveValue = readLiveDeviceValue(desktopCtrl.id, tab);
    writeDevControlValue(targetId, seeded !== undefined ? seeded : (liveValue !== undefined ? liveValue : readDevControlValue(desktopCtrl.id)));
    row.appendChild(buildIndependenceCheckbox(tab, desktopCtrl.id, targetEl));
    // Wires this brand-new slider/color-picker into the SAME
    // generic apply-on-input machinery every other control uses
    // (setupDevSliders()'s own [data-wired] guard makes this safe
    // to call again without double-wiring already-wired elements).
    setupDevSliders();
}
// Re-derives EVERY Desktop control's own Mobile/Landscape row from
// its current visibility flag - universal now, not just the
// originally opted-in controls (see devVisibility's own comment).
// Called whenever a visibility checkbox changes, and once after a
// settings load. Must NOT run until AFTER renderMobileUniformControls()/
// renderLandscapeUniformControls() have both already built their
// own STATIC rows - see this function's own call site for why (a
// category-B row must already exist as a real DOM element before
// this runs, or ensureDynamicDeviceRow() would build a SECOND,
// duplicate-id row for it that the static renderer then collides
// with moments later).
function syncDynamicDeviceRows() {
    DESKTOP_UNIFORM_CONTROLS.forEach(ctrl => {
        ensureDynamicDeviceRow(ctrl, 'mobile');
        ensureDynamicDeviceRow(ctrl, 'landscape');
    });
}

// Shows/hides an ALREADY-EXISTING (never removed/recreated) Mobile/
// Landscape row per its own devVisibility flag - the counterpart to
// ensureDynamicDeviceRow() above, but for a control OUTSIDE the
// DESKTOP_UNIFORM_CONTROLS array system: the many hand-authored
// "text settings battery" rows (Round/High Score/Result Win/Lose/
// Target/Speed/Ms-per-Click/Try Again/etc), found live when a group
// uncheck (WIN) correctly hid its 25 array-driven children but left
// 5 hand-authored ones (ScaleWithBrowser/X/Y/Align/Valign) visible -
// those rows had no checkbox at all, so nothing ever told them to
// hide. Uses a CSS class, not DOM removal, since these rows are
// static HTML that always exists - there's nothing to "recreate".
// Skips any row ensureDynamicDeviceRow() itself already manages
// (marked via data-dynamicDeviceFor) so the 2 mechanisms never
// fight over the same row.
function syncStaticRowVisibility(desktopId) {
    const visible = isDevRowVisible(desktopId);
    ['mobile', 'landscape'].forEach(tab => {
        const targetId = dynamicDeviceTargetId(desktopId, tab);
        if (!targetId) return;
        const el = document.getElementById(targetId);
        const row = el ? el.closest('.dev-row') : null;
        if (!row || row.dataset.dynamicDeviceFor) return;
        row.classList.toggle('dev-row-hidden-by-checkbox', !visible);
    });
}
// Backfills BOTH checkbox kinds onto every row the array-driven
// render*UniformControls() functions never touch - matching
// DickoClicko's own buildRow() (every control gets both checkboxes
// unconditionally, no "uniform" vs "bespoke" split at all - see
// that project's own buildRow(), referenced directly per request).
// Idempotent (skips a row that already has its checkbox) - safe to
// call repeatedly; only ever needs to run once in practice, since
// these rows are static HTML, never removed/recreated. Also applies
// each newly-covered row's own current visibility default
// immediately - a row defaulting hidden must actually BE hidden the
// first time this runs, not just show an unchecked checkbox while
// the row itself stays visible.
function injectRowDeviceCheckboxes() {
    document.querySelectorAll('#desktopTabContent .dev-row').forEach(row => {
        if (row.querySelector('.dev-visibility-checkbox')) return;
        const controlEl = row.querySelector('[id]');
        if (!controlEl) return;
        row.appendChild(buildVisibilityCheckbox(controlEl, controlEl.id));
    });
    ['mobile', 'landscape'].forEach(tab => {
        document.querySelectorAll('#' + tab + 'TabContent .dev-row').forEach(row => {
            if (row.querySelector('.dev-independence-checkbox')) return;
            const controlEl = row.querySelector('[id]');
            if (!controlEl) return;
            const { desktopId } = resolveDevControlId(controlEl.id);
            row.appendChild(buildIndependenceCheckbox(tab, desktopId, controlEl));
        });
    });
    document.querySelectorAll('#desktopTabContent .dev-row [id]').forEach(controlEl => {
        syncStaticRowVisibility(controlEl.id);
    });
}

// Auto-hides an ENTIRE Mobile/Landscape group (any nesting depth)
// the instant none of its own rows or subgroups are visible any
// more - matching DickoClicko's own refreshVisibilityUI() (its
// groupEl.style.display driven by "does .dp-group-body have any
// non-hidden child" check, referenced directly per request: "for
// Plan 1, and 3, reference DickoClicko. they do it right"). Direct
// report: unchecking a whole group correctly hid its real rows but
// left the empty group shell (and empty nested subgroups) visible
// on Mobile/Landscape. Depth-sorted deepest-first (same technique
// as refreshAllGroupCascadeCheckboxes()) so a parent's own "any
// visible child" check always sees its children's ALREADY-current
// hidden state, never a stale one. A row hidden via DOM removal
// (the array-driven dynamic-row system) is automatically excluded
// just by not existing in the query at all; a row hidden via the
// .dev-row-hidden-by-checkbox CSS class (the static-row system) is
// excluded via the :not() below - both hide mechanisms are
// correctly accounted for without this function needing to know
// which one applies to a given row.
function refreshEmptyGroupVisibility(tab) {
    const tabEl = document.getElementById(tab + 'TabContent');
    if (!tabEl) return;
    function depth(el) {
        let d = 0, cur = el.parentElement;
        while (cur) { if (cur.classList.contains('dev-section')) d++; cur = cur.parentElement; }
        return d;
    }
    const sections = Array.from(tabEl.querySelectorAll('.dev-section')).sort((a, b) => depth(b) - depth(a));
    sections.forEach(sec => {
        const content = sec.querySelector(':scope > .dev-section-content');
        if (!content) return;
        const hasVisibleRow = !!content.querySelector(':scope > .dev-row:not(.dev-row-hidden-by-checkbox)');
        const hasVisibleSubgroup = !!content.querySelector(':scope > .dev-section:not(.dev-section-hidden-empty)');
        sec.classList.toggle('dev-section-hidden-empty', !hasVisibleRow && !hasVisibleSubgroup);
    });
}

function renderDesktopUniformControls() {
    DESKTOP_UNIFORM_CONTROLS.forEach(ctrl => {
        const content = findGroupContent('desktop', ctrl.group, 'renderDesktopUniformControls', ctrl.id);
        if (!content) return;
        const row = buildUniformControlRow(ctrl);
        const controlEl = row.querySelector('[id]');
        row.appendChild(buildVisibilityCheckbox(controlEl, ctrl.id));
        content.appendChild(row);
    });
    // syncDynamicDeviceRows() deliberately NOT called here any more
    // - see that function's own comment for why it now has to wait
    // until after Mobile/Landscape's own static rendering.
}

// Mobile tab's own uniform controls - same pattern as Desktop's
// DESKTOP_UNIFORM_CONTROLS above, reusing the SAME buildUniformControlRow()
// (generic, not tab-specific). Group titles match Desktop's exactly
// (same conceptual groups, per the existing syncTabOrderToDesktop()
// title-matching convention) so the same data-sid lookup works, just
// scoped to #mobileTabContent.
const MOBILE_UNIFORM_CONTROLS = [
    { group: 'Main Button', id: 'sliderMobileButtonDiameter', type: 'slider', label: 'Diameter (vw):', min: 5, max: 120, step: 0.5, value: 77 },
    { group: 'Main Button', id: 'sliderMobileButtonMinDiameter', type: 'slider', label: 'Min Diameter (px, floor on narrow windows):', min: 0, max: 500, step: 5, value: 165 },
    { group: 'Main Button', id: 'sliderMobileButtonHeight', type: 'slider', label: 'Height (offset, % of diameter):', min: -30, max: 30, step: 0.5, value: -3.5 },
    { group: 'Main Button', id: 'sliderMobileButtonPressIntensity', type: 'slider', label: 'Press Intensity (% of diameter):', min: 0, max: 30, step: 0.5, value: 8.5 },
    { group: 'Main Button', id: 'sliderMobileButtonPressMs', type: 'slider', label: 'Press Speed (ms, 0=instant):', min: 0, max: 200, step: 5, value: 0 },
    { group: 'Main Button', id: 'sliderMobileButtonReleaseMs', type: 'slider', label: 'Release Speed (ms, 0=instant):', min: 0, max: 200, step: 5, value: 0 },
    { group: 'Main Button', id: 'sliderMobileButtonMaxScale', type: 'slider', label: 'Max Button Scale (x, at 767px width):', min: 0.5, max: 2, step: 0.01, value: 1 },
    { group: 'Main Button', id: 'sliderMobileButtonMinScale', type: 'slider', label: 'Min Button Scale (x, floor as width shrinks):', min: 0.1, max: 2, step: 0.01, value: 1 },
    { group: 'Shadow', id: 'sliderMobileShadowX', type: 'slider', label: 'Shadow X (% of button width):', min: -97.4, max: 220.78, step: 0.1, value: 27.4286 },
    { group: 'Shadow', id: 'sliderMobileShadowY', type: 'slider', label: 'Shadow Y (% of button width):', min: -129.87, max: 64.94, step: 0.1, value: 18.1818 },
    { group: 'Shadow', id: 'sliderMobileShadowBlur', type: 'slider', label: 'Shadow Blur (px):', min: 0, max: 60, step: 1, value: 0 },
    { group: 'Shadow', id: 'sliderMobileShadowScale', type: 'slider', label: 'Shadow Size (scale):', min: 0.1, max: 3, step: 0.05, value: 0.65 },
    { group: 'Shadow', id: 'sliderMobileShadowSkew', type: 'slider', label: 'Shadow Skew (deg):', min: -60, max: 60, step: 1, value: -37 },
    { group: 'Shadow', id: 'sliderMobileShadowElongationIntensity', type: 'slider', label: 'Elongation Intensity:', min: 1, max: 5, step: 0.1, value: 1 },
    { group: 'Shadow', id: 'sliderMobileShadowElongationAngle', type: 'slider', label: 'Elongation Angle (deg):', min: 0, max: 360, step: 1, value: 0 },
    { group: 'Shadow', id: 'sliderMobileShadowRotate', type: 'slider', label: 'Shadow Rotate (deg):', min: -180, max: 180, step: 1, value: 11 },
    { group: 'Click Burst', id: 'sliderMobileClickBurstSpeed', type: 'slider', label: 'Animation Speed (ms):', min: 80, max: 1000, step: 10, value: 180 },
    { group: 'Click Burst', id: 'sliderMobileClickBurstScale', type: 'slider', label: 'Frame Size (scale):', min: 0, max: 1, step: 0.01, value: 0.14 },
    { group: 'Click Burst', id: 'sliderMobileClickBurstDistance', type: 'slider', label: 'Distance Out (vw):', min: 0, max: 75, step: 0.5, value: 8 },
    { group: 'Click Burst', id: 'sliderMobileClickBurstHeight', type: 'slider', label: 'Height / Lift (vw):', min: 0, max: 50, step: 0.5, value: 1 },
    { group: 'Click Burst', id: 'sliderMobileClickBurstCurveOffset', type: 'slider', label: 'Curve Offset (vw):', min: 0, max: 40, step: 0.5, value: 6.5 },
    { group: 'Click Burst', id: 'sliderMobileClickBurstCurveAmount', type: 'slider', label: 'Flight Path Curviness (x):', min: 0, max: 3, step: 0.05, value: 0.2 },
    { group: 'Click Burst', id: 'sliderMobileClickBurstCountMin', type: 'slider', label: 'Count Per Side - Floor:', min: 1, max: 8, step: 1, value: 3 },
    { group: 'Click Burst', id: 'sliderMobileClickBurstCountMax', type: 'slider', label: 'Count Per Side - Ceiling:', min: 1, max: 8, step: 1, value: 5 },
    { group: 'Click Burst', id: 'sliderMobileClickBurstShadowFinalScale', type: 'slider', label: 'Shadow Final Scale:', min: 0, max: 1, step: 0.01, value: 1 },
    { group: 'Start/Try Again Button', id: 'sliderMobileTextFontSize', type: 'slider', label: 'Button Font Size (px):', min: 10, max: 400, step: 0.01, value: 78 },
    { group: 'Start/Try Again Button', id: 'sliderMobileTextFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 20 },
    { group: 'Start/Try Again Button', id: 'sliderMobileRoundExtrusionDepth', type: 'slider', label: 'Button Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 4 },
    { group: 'Start/Try Again Button', id: 'sliderMobileRoundOverallBorderThickness', type: 'slider', label: 'Button Border Thickness (px):', min: 0, max: 20, step: 1, value: 5 },
    { group: 'Start/Try Again Button', id: 'sliderMobileTextLetterSpacing', type: 'slider', label: 'Button Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Start/Try Again Button', id: 'sliderMobileTextLineHeight', type: 'slider', label: 'Button Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Start/Try Again Button', id: 'sliderMobileTryAgainTextFontSize', type: 'slider', label: 'Try Again Font Size (px):', min: 10, max: 400, step: 0.01, value: 78 },
    { group: 'Start/Try Again Button', id: 'sliderMobileTryAgainTextFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 20 },
    { group: 'Start/Try Again Button', id: 'sliderMobileTryAgainExtrusionDepth', type: 'slider', label: 'Try Again Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 9 },
    { group: 'Start/Try Again Button', id: 'sliderMobileTryAgainOverallBorderThickness', type: 'slider', label: 'Try Again Border Thickness (px):', min: 0, max: 20, step: 1, value: 5 },
    { group: 'Start/Try Again Button', id: 'sliderMobileTryAgainTextLetterSpacing', type: 'slider', label: 'Try Again Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Start/Try Again Button', id: 'sliderMobileTryAgainTextLineHeight', type: 'slider', label: 'Try Again Line Height:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Rotation Animation', id: 'sliderMobileTryAgainQuestionMarkFontSize', type: 'slider', label: '"?" Font Size (px):', min: 10, max: 500, step: 0.01, value: 78 },
    { group: 'Rotation Animation', id: 'sliderMobileTryAgainQuestionMarkFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 20 },
    { group: 'Rotation Animation', id: 'sliderMobileTryAgainQuestionMarkExtrusionDepth', type: 'slider', label: '"?" Extrusion Depth (px):', min: 0, max: 30, step: 1, value: 9 },
    { group: 'Rotation Animation', id: 'sliderMobileTryAgainQuestionMarkOverallBorderThickness', type: 'slider', label: '"?" Overall Border Thickness (px):', min: 0, max: 30, step: 1, value: 5 },
    { group: 'Round Text', id: 'sliderMobileRoundFontSize', type: 'slider', label: 'Text Font Size (px):', min: 5, max: 200, step: 0.01, value: 78 },
    { group: 'Round Text', id: 'sliderMobileRoundFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 20 },
    { group: 'Round Text', id: 'sliderMobileRoundDockExtrusionDepth', type: 'slider', label: 'Text Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 2 },
    { group: 'Round Text', id: 'sliderMobileRoundDockOverallBorderThickness', type: 'slider', label: 'Text Border Thickness (px):', min: 0, max: 20, step: 1, value: 1 },
    { group: 'Round Text', id: 'sliderMobileRoundLetterSpacing', type: 'slider', label: 'Text Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Round Text', id: 'sliderMobileRoundLineHeight', type: 'slider', label: 'Text Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Round Text', id: 'sliderMobileRoundNumberXOffset', type: 'slider', label: 'Number X Offset (Px):', min: -50, max: 50, step: 1, value: 0 },
    { group: 'High Score', id: 'sliderMobileHighScoreFontSize', type: 'slider', label: 'Font Size (px):', min: 5, max: 200, step: 0.01, value: 30 },
    { group: 'High Score', id: 'sliderMobileHighScoreFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 7 },
    { group: 'High Score', id: 'sliderMobileHighScoreExtrusionDepth', type: 'slider', label: 'Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 9 },
    { group: 'High Score', id: 'sliderMobileHighScoreOverallBorderThickness', type: 'slider', label: 'Border Thickness (px):', min: 0, max: 20, step: 1, value: 9 },
    { group: 'High Score', id: 'sliderMobileHighScoreLetterSpacing', type: 'slider', label: 'Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'High Score', id: 'sliderMobileHighScoreLineHeight', type: 'slider', label: 'Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'High Score', id: 'sliderMobileHighScoreRotate', type: 'slider', label: 'Rotation (Deg):', min: -180, max: 180, step: 1, value: 0 },
    { group: 'Win/Lose Text', id: 'sliderMobileResultWinFontSize', type: 'slider', label: 'Win Font Size (px):', min: 5, max: 300, step: 0.01, value: 18.6 },
    { group: 'Win/Lose Text', id: 'sliderMobileResultWinFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 4.77 },
    { group: 'Win/Lose Text', id: 'sliderMobileResultWinLetterSpacing', type: 'slider', label: 'Win Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Win/Lose Text', id: 'sliderMobileResultLoseFontSize', type: 'slider', label: 'Lose Font Size (px):', min: 5, max: 300, step: 0.01, value: 18.6 },
    { group: 'Win/Lose Text', id: 'sliderMobileResultLoseFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 4.77 },
    { group: 'Win/Lose Text', id: 'sliderMobileResultLoseLetterSpacing', type: 'slider', label: 'Lose Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Win/Lose Text', id: 'sliderMobileResultExtrusionDepth', type: 'slider', label: 'Extrusion Depth (px):', min: 0, max: 30, step: 1, value: 5 },
    { group: 'Win/Lose Text', id: 'sliderMobileResultOverallBorderThickness', type: 'slider', label: 'Border Thickness (px):', min: 0, max: 20, step: 1, value: 3 },
    { group: 'Win/Lose Text', id: 'sliderMobileResultExtrusionAngle', type: 'slider', label: 'Extrusion Angle (Deg):', min: 0, max: 360, step: 1, value: 45 },
    { group: 'Win/Lose Text', id: 'sliderMobileResultLineHeight', type: 'slider', label: 'Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Target Count Display', id: 'sliderMobileTargetPrefixLineHeight', type: 'slider', label: 'Prefix Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 0.65 },
    { group: 'Target Count Display', id: 'sliderMobileTargetNumberLineHeight', type: 'slider', label: 'Number Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 0.65 },
    { group: 'Target Count Display', id: 'sliderMobileTargetSuffixLineHeight', type: 'slider', label: 'Suffix Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 0.65 },
    { group: 'Target Count Display', id: 'sliderMobileTargetPrefixExtrusionDepth', type: 'slider', label: 'Prefix Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 20 },
    { group: 'Target Count Display', id: 'sliderMobileTargetPrefixOverallBorderThickness', type: 'slider', label: 'Prefix Border Thickness (px):', min: 0, max: 20, step: 1, value: 12 },
    { group: 'Target Count Display', id: 'sliderMobileTargetPrefixLetterSpacing', type: 'slider', label: 'Prefix Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Target Count Display', id: 'sliderMobileTargetNumberExtrusionDepth', type: 'slider', label: 'Number Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 20 },
    { group: 'Target Count Display', id: 'sliderMobileTargetNumberOverallBorderThickness', type: 'slider', label: 'Number Border Thickness (px):', min: 0, max: 20, step: 1, value: 12 },
    { group: 'Target Count Display', id: 'sliderMobileTargetNumberLetterSpacing', type: 'slider', label: 'Number Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Target Count Display', id: 'sliderMobileTargetSuffixExtrusionDepth', type: 'slider', label: 'Suffix Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 20 },
    { group: 'Target Count Display', id: 'sliderMobileTargetSuffixOverallBorderThickness', type: 'slider', label: 'Suffix Border Thickness (px):', min: 0, max: 20, step: 1, value: 12 },
    { group: 'Target Count Display', id: 'sliderMobileTargetSuffixLetterSpacing', type: 'slider', label: 'Suffix Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Target Count Display', id: 'sliderMobileTargetPrefixFontSize', type: 'slider', label: 'Prefix Font Size (px):', min: 5, max: 500, step: 1, value: 70 },
    { group: 'Target Count Display', id: 'sliderMobileTargetPrefixFontSizeVw', type: 'slider', label: 'Prefix Font Size (vw):', min: 1, max: 60, step: 0.01, value: 5.47 },
    { group: 'Target Count Display', id: 'sliderMobileTargetNumberFontSize', type: 'slider', label: 'Number Font Size (px):', min: 5, max: 500, step: 1, value: 238.44 },
    { group: 'Target Count Display', id: 'sliderMobileTargetNumberFontSizeVw', type: 'slider', label: 'Number Font Size (vw):', min: 1, max: 60, step: 0.01, value: 18.63 },
    { group: 'Target Count Display', id: 'sliderMobileTargetSuffixFontSize', type: 'slider', label: 'Suffix Font Size (px):', min: 5, max: 500, step: 1, value: 70 },
    { group: 'Target Count Display', id: 'sliderMobileTargetSuffixFontSizeVw', type: 'slider', label: 'Suffix Font Size (vw):', min: 1, max: 60, step: 0.01, value: 5.47 },
    // X/Y Offset sliders moved to COMPOUND_OFFSET_CONTROLS - see
    // its own comment (ported from the Desktop tab's identical note).
    { group: 'Speed Display (max ms between taps)', id: 'sliderMobileSpeedFontSize', type: 'slider', label: 'Font Size (px):', min: 5, max: 300, step: 0.01, value: 38.73 },
    { group: 'Speed Display (max ms between taps)', id: 'sliderMobileSpeedFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 9.93 },
    { group: 'Speed Display (max ms between taps)', id: 'sliderMobileSpeedExtrusionDepth', type: 'slider', label: 'Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 4 },
    { group: 'Speed Display (max ms between taps)', id: 'sliderMobileSpeedOverallBorderThickness', type: 'slider', label: 'Border Thickness (px):', min: 0, max: 20, step: 1, value: 1 },
    { group: 'Speed Display (max ms between taps)', id: 'sliderMobileSpeedLetterSpacing', type: 'slider', label: 'Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Speed Display (max ms between taps)', id: 'sliderMobileSpeedNumberXOffset', type: 'slider', label: 'Countdown Number X Offset (Px):', min: -50, max: 50, step: 1, value: 0 },
    { group: 'Speed Display (max ms between taps)', id: 'sliderMobileSpeedLineHeight', type: 'slider', label: 'Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Ms/Click Display', id: 'sliderMobileMsPerClickFontSize', type: 'slider', label: 'Font Size (px):', min: 5, max: 300, step: 0.01, value: 38.73 },
    { group: 'Ms/Click Display', id: 'sliderMobileMsPerClickFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 9.93 },
    { group: 'Ms/Click Display', id: 'sliderMobileMsPerClickExtrusionDepth', type: 'slider', label: 'Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 9 },
    { group: 'Ms/Click Display', id: 'sliderMobileMsPerClickOverallBorderThickness', type: 'slider', label: 'Border Thickness (px):', min: 0, max: 20, step: 1, value: 1 },
    { group: 'Ms/Click Display', id: 'sliderMobileMsPerClickLetterSpacing', type: 'slider', label: 'Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Ms/Click Display', id: 'sliderMobileMsPerClickNumberXOffset', type: 'slider', label: 'Number X Offset (Px):', min: -50, max: 50, step: 1, value: 0 },
    { group: 'Ms/Click Display', id: 'sliderMobileMsPerClickLineHeight', type: 'slider', label: 'Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Ms/Click Display', id: 'sliderMobileMsPerClickLine2Gap', type: 'slider', label: 'Line 2-3 Spacing (px):', min: -100, max: 200, step: 1, value: 0 },
    { group: 'Round Breakdown', id: 'sliderMobileRoundBreakdownWidth', type: 'slider', label: 'Width (vw):', min: 10, max: 100, step: 0.1, value: 80 },
    { group: 'Round Breakdown', id: 'sliderMobileRoundBreakdownHeight', type: 'slider', label: 'Height (vh):', min: 10, max: 100, step: 0.1, value: 40 },
    { group: 'Round Breakdown', id: 'sliderMobileRoundBreakdownOutlineThickness', type: 'slider', label: 'Outline Thickness (px):', min: 0, max: 20, step: 1, value: 2 },
    { group: 'Round Breakdown', id: 'sliderMobileRoundBreakdownTitleFontSize', type: 'slider', label: 'Round Title Font Size (px):', min: 8, max: 60, step: 1, value: 14 },
    { group: 'Round Breakdown', id: 'sliderMobileRoundBreakdownTitleLetterSpacing', type: 'slider', label: 'Round Title Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Round Breakdown', id: 'sliderMobileRoundBreakdownTitleLineHeight', type: 'slider', label: 'Round Title Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Round Breakdown', id: 'sliderMobileRoundBreakdownDataFontSize', type: 'slider', label: 'Round Data Font Size (px):', min: 8, max: 40, step: 1, value: 13 },
    { group: 'Round Breakdown', id: 'sliderMobileRoundBreakdownDataLetterSpacing', type: 'slider', label: 'Round Data Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Round Breakdown', id: 'sliderMobileRoundBreakdownDataLineHeight', type: 'slider', label: 'Round Data Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
];
function renderMobileUniformControls() {
    MOBILE_UNIFORM_CONTROLS.forEach(ctrl => {
        const content = findGroupContent('mobile', ctrl.group, 'renderMobileUniformControls', ctrl.id);
        if (!content) return;
        const row = buildUniformControlRow(ctrl);
        // "Independent from Desktop" checkbox (2026-09-17) - now
        // added to every STATIC row here too, not just a
        // dynamically-created one, so the universal checkbox
        // system (see devVisibility's own comment) covers
        // "already independent" controls (the ~102/153 with a
        // real Mobile row today) as well as newly-shown ones. This
        // control already has a Desktop counterpart by
        // construction (every MOBILE_UNIFORM_CONTROLS id maps back
        // via resolveDevControlId()), so desktopId is never null
        // here.
        const { desktopId } = resolveDevControlId(ctrl.id);
        const controlEl = row.querySelector('[id]');
        row.appendChild(buildIndependenceCheckbox('mobile', desktopId, controlEl));
        content.appendChild(row);
    });
}

// Landscape tab's own uniform controls - same pattern as Desktop's/
// Mobile's above, reusing the same buildUniformControlRow().
const LANDSCAPE_UNIFORM_CONTROLS = [
    { group: 'Main Button', id: 'sliderLandscapeButtonDiameter', type: 'slider', label: 'Diameter (vw):', min: 5, max: 120, step: 0.5, value: 77 },
    { group: 'Main Button', id: 'sliderLandscapeButtonMinDiameter', type: 'slider', label: 'Min Diameter (px, floor on narrow windows):', min: 0, max: 500, step: 5, value: 165 },
    { group: 'Main Button', id: 'sliderLandscapeButtonHeight', type: 'slider', label: 'Height (offset, % of diameter):', min: -30, max: 30, step: 0.5, value: -3.5 },
    { group: 'Main Button', id: 'sliderLandscapeButtonPressIntensity', type: 'slider', label: 'Press Intensity (% of diameter):', min: 0, max: 30, step: 0.5, value: 8.5 },
    { group: 'Main Button', id: 'sliderLandscapeButtonPressMs', type: 'slider', label: 'Press Speed (ms, 0=instant):', min: 0, max: 200, step: 5, value: 0 },
    { group: 'Main Button', id: 'sliderLandscapeButtonReleaseMs', type: 'slider', label: 'Release Speed (ms, 0=instant):', min: 0, max: 200, step: 5, value: 0 },
    { group: 'Shadow', id: 'sliderLandscapeShadowX', type: 'slider', label: 'Shadow X (% of button width):', min: -97.4, max: 220.78, step: 0.1, value: 27.4286 },
    { group: 'Shadow', id: 'sliderLandscapeShadowY', type: 'slider', label: 'Shadow Y (% of button width):', min: -129.87, max: 64.94, step: 0.1, value: 18.1818 },
    { group: 'Shadow', id: 'sliderLandscapeShadowBlur', type: 'slider', label: 'Shadow Blur (px):', min: 0, max: 60, step: 1, value: 0 },
    { group: 'Shadow', id: 'sliderLandscapeShadowScale', type: 'slider', label: 'Shadow Size (scale):', min: 0.1, max: 3, step: 0.05, value: 0.65 },
    { group: 'Shadow', id: 'sliderLandscapeShadowSkew', type: 'slider', label: 'Shadow Skew (deg):', min: -60, max: 60, step: 1, value: -37 },
    { group: 'Shadow', id: 'sliderLandscapeShadowElongationIntensity', type: 'slider', label: 'Elongation Intensity:', min: 1, max: 5, step: 0.1, value: 1 },
    { group: 'Shadow', id: 'sliderLandscapeShadowElongationAngle', type: 'slider', label: 'Elongation Angle (deg):', min: 0, max: 360, step: 1, value: 0 },
    { group: 'Shadow', id: 'sliderLandscapeShadowRotate', type: 'slider', label: 'Shadow Rotate (deg):', min: -180, max: 180, step: 1, value: 11 },
    { group: 'Click Burst', id: 'sliderLandscapeClickBurstSpeed', type: 'slider', label: 'Animation Speed (ms):', min: 80, max: 1000, step: 10, value: 180 },
    { group: 'Click Burst', id: 'sliderLandscapeClickBurstScale', type: 'slider', label: 'Frame Size (scale):', min: 0, max: 1, step: 0.01, value: 0.14 },
    { group: 'Click Burst', id: 'sliderLandscapeClickBurstDistance', type: 'slider', label: 'Distance Out (vw):', min: 0, max: 75, step: 0.5, value: 8 },
    { group: 'Click Burst', id: 'sliderLandscapeClickBurstHeight', type: 'slider', label: 'Height / Lift (vw):', min: 0, max: 50, step: 0.5, value: 1 },
    { group: 'Click Burst', id: 'sliderLandscapeClickBurstCurveOffset', type: 'slider', label: 'Curve Offset (vw):', min: 0, max: 40, step: 0.5, value: 6.5 },
    { group: 'Click Burst', id: 'sliderLandscapeClickBurstCurveAmount', type: 'slider', label: 'Flight Path Curviness (x):', min: 0, max: 3, step: 0.05, value: 0.2 },
    { group: 'Click Burst', id: 'sliderLandscapeClickBurstCountMin', type: 'slider', label: 'Count Per Side - Floor:', min: 1, max: 8, step: 1, value: 3 },
    { group: 'Click Burst', id: 'sliderLandscapeClickBurstCountMax', type: 'slider', label: 'Count Per Side - Ceiling:', min: 1, max: 8, step: 1, value: 5 },
    { group: 'Click Burst', id: 'sliderLandscapeClickBurstShadowFinalScale', type: 'slider', label: 'Shadow Final Scale:', min: 0, max: 1, step: 0.01, value: 1 },
    { group: 'Start/Try Again Button', id: 'sliderLandscapeTextFontSize', type: 'slider', label: 'Button Font Size (px):', min: 10, max: 400, step: 0.01, value: 78 },
    { group: 'Start/Try Again Button', id: 'sliderLandscapeTextFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 20 },
    { group: 'Start/Try Again Button', id: 'sliderLandscapeRoundExtrusionDepth', type: 'slider', label: 'Button Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 4 },
    { group: 'Start/Try Again Button', id: 'sliderLandscapeRoundOverallBorderThickness', type: 'slider', label: 'Button Border Thickness (px):', min: 0, max: 20, step: 1, value: 5 },
    { group: 'Start/Try Again Button', id: 'sliderLandscapeTextLetterSpacing', type: 'slider', label: 'Button Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Start/Try Again Button', id: 'sliderLandscapeTextLineHeight', type: 'slider', label: 'Button Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Start/Try Again Button', id: 'sliderLandscapeTryAgainTextFontSize', type: 'slider', label: 'Try Again Font Size (px):', min: 10, max: 400, step: 0.01, value: 78 },
    { group: 'Start/Try Again Button', id: 'sliderLandscapeTryAgainTextFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 20 },
    { group: 'Start/Try Again Button', id: 'sliderLandscapeTryAgainExtrusionDepth', type: 'slider', label: 'Try Again Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 9 },
    { group: 'Start/Try Again Button', id: 'sliderLandscapeTryAgainOverallBorderThickness', type: 'slider', label: 'Try Again Border Thickness (px):', min: 0, max: 20, step: 1, value: 5 },
    { group: 'Start/Try Again Button', id: 'sliderLandscapeTryAgainTextLetterSpacing', type: 'slider', label: 'Try Again Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Start/Try Again Button', id: 'sliderLandscapeTryAgainTextLineHeight', type: 'slider', label: 'Try Again Line Height:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Rotation Animation', id: 'sliderLandscapeTryAgainQuestionMarkFontSize', type: 'slider', label: '"?" Font Size (px):', min: 10, max: 500, step: 0.01, value: 78 },
    { group: 'Rotation Animation', id: 'sliderLandscapeTryAgainQuestionMarkFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 20 },
    { group: 'Rotation Animation', id: 'sliderLandscapeTryAgainQuestionMarkExtrusionDepth', type: 'slider', label: '"?" Extrusion Depth (px):', min: 0, max: 30, step: 1, value: 9 },
    { group: 'Rotation Animation', id: 'sliderLandscapeTryAgainQuestionMarkOverallBorderThickness', type: 'slider', label: '"?" Overall Border Thickness (px):', min: 0, max: 30, step: 1, value: 5 },
    { group: 'Round Text', id: 'sliderLandscapeRoundFontSize', type: 'slider', label: 'Text Font Size (px):', min: 5, max: 200, step: 0.01, value: 78 },
    { group: 'Round Text', id: 'sliderLandscapeRoundFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 20 },
    { group: 'Round Text', id: 'sliderLandscapeRoundDockExtrusionDepth', type: 'slider', label: 'Text Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 2 },
    { group: 'Round Text', id: 'sliderLandscapeRoundDockOverallBorderThickness', type: 'slider', label: 'Text Border Thickness (px):', min: 0, max: 20, step: 1, value: 1 },
    { group: 'Round Text', id: 'sliderLandscapeRoundLetterSpacing', type: 'slider', label: 'Text Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Round Text', id: 'sliderLandscapeRoundLineHeight', type: 'slider', label: 'Text Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Round Text', id: 'sliderLandscapeRoundNumberXOffset', type: 'slider', label: 'Number X Offset (Px):', min: -50, max: 50, step: 1, value: 0 },
    { group: 'High Score', id: 'sliderLandscapeHighScoreFontSize', type: 'slider', label: 'Font Size (px):', min: 5, max: 200, step: 0.01, value: 30 },
    { group: 'High Score', id: 'sliderLandscapeHighScoreFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 7 },
    { group: 'High Score', id: 'sliderLandscapeHighScoreExtrusionDepth', type: 'slider', label: 'Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 9 },
    { group: 'High Score', id: 'sliderLandscapeHighScoreOverallBorderThickness', type: 'slider', label: 'Border Thickness (px):', min: 0, max: 20, step: 1, value: 9 },
    { group: 'High Score', id: 'sliderLandscapeHighScoreLetterSpacing', type: 'slider', label: 'Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'High Score', id: 'sliderLandscapeHighScoreLineHeight', type: 'slider', label: 'Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'High Score', id: 'sliderLandscapeHighScoreRotate', type: 'slider', label: 'Rotation (Deg):', min: -180, max: 180, step: 1, value: 0 },
    { group: 'Win/Lose Text', id: 'sliderLandscapeResultWinFontSize', type: 'slider', label: 'Win Font Size (px):', min: 5, max: 300, step: 0.01, value: 18.6 },
    { group: 'Win/Lose Text', id: 'sliderLandscapeResultWinFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 4.77 },
    { group: 'Win/Lose Text', id: 'sliderLandscapeResultWinLetterSpacing', type: 'slider', label: 'Win Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Win/Lose Text', id: 'sliderLandscapeResultLoseFontSize', type: 'slider', label: 'Lose Font Size (px):', min: 5, max: 300, step: 0.01, value: 18.6 },
    { group: 'Win/Lose Text', id: 'sliderLandscapeResultLoseFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 4.77 },
    { group: 'Win/Lose Text', id: 'sliderLandscapeResultLoseLetterSpacing', type: 'slider', label: 'Lose Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Win/Lose Text', id: 'sliderLandscapeResultExtrusionDepth', type: 'slider', label: 'Extrusion Depth (px):', min: 0, max: 30, step: 1, value: 5 },
    { group: 'Win/Lose Text', id: 'sliderLandscapeResultOverallBorderThickness', type: 'slider', label: 'Border Thickness (px):', min: 0, max: 20, step: 1, value: 3 },
    { group: 'Win/Lose Text', id: 'sliderLandscapeResultExtrusionAngle', type: 'slider', label: 'Extrusion Angle (Deg):', min: 0, max: 360, step: 1, value: 45 },
    { group: 'Win/Lose Text', id: 'sliderLandscapeResultLineHeight', type: 'slider', label: 'Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetPrefixLineHeight', type: 'slider', label: 'Prefix Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetNumberLineHeight', type: 'slider', label: 'Number Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetSuffixLineHeight', type: 'slider', label: 'Suffix Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetPrefixExtrusionDepth', type: 'slider', label: 'Prefix Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 26 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetPrefixOverallBorderThickness', type: 'slider', label: 'Prefix Border Thickness (px):', min: 0, max: 20, step: 1, value: 8 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetPrefixLetterSpacing', type: 'slider', label: 'Prefix Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: -7 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetNumberExtrusionDepth', type: 'slider', label: 'Number Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 26 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetNumberOverallBorderThickness', type: 'slider', label: 'Number Border Thickness (px):', min: 0, max: 20, step: 1, value: 8 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetNumberLetterSpacing', type: 'slider', label: 'Number Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: -7 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetSuffixExtrusionDepth', type: 'slider', label: 'Suffix Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 26 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetSuffixOverallBorderThickness', type: 'slider', label: 'Suffix Border Thickness (px):', min: 0, max: 20, step: 1, value: 8 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetSuffixLetterSpacing', type: 'slider', label: 'Suffix Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: -7 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetPrefixFontSize', type: 'slider', label: 'Prefix Font Size (px):', min: 5, max: 500, step: 1, value: 150 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetPrefixFontSizeVw', type: 'slider', label: 'Prefix Font Size (vw):', min: 1, max: 60, step: 0.01, value: 11.72 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetNumberFontSize', type: 'slider', label: 'Number Font Size (px):', min: 5, max: 500, step: 1, value: 500 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetNumberFontSizeVw', type: 'slider', label: 'Number Font Size (vw):', min: 1, max: 60, step: 0.01, value: 39.06 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetSuffixFontSize', type: 'slider', label: 'Suffix Font Size (px):', min: 5, max: 500, step: 1, value: 150 },
    { group: 'Target Count Display', id: 'sliderLandscapeTargetSuffixFontSizeVw', type: 'slider', label: 'Suffix Font Size (vw):', min: 1, max: 60, step: 0.01, value: 11.72 },
    // X/Y Offset sliders moved to COMPOUND_OFFSET_CONTROLS - see
    // its own comment (ported from the Desktop tab's identical note).
    { group: 'Speed Display (max ms between taps)', id: 'sliderLandscapeSpeedFontSize', type: 'slider', label: 'Font Size (px):', min: 5, max: 300, step: 0.01, value: 38.73 },
    { group: 'Speed Display (max ms between taps)', id: 'sliderLandscapeSpeedFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 9.93 },
    { group: 'Speed Display (max ms between taps)', id: 'sliderLandscapeSpeedExtrusionDepth', type: 'slider', label: 'Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 4 },
    { group: 'Speed Display (max ms between taps)', id: 'sliderLandscapeSpeedOverallBorderThickness', type: 'slider', label: 'Border Thickness (px):', min: 0, max: 20, step: 1, value: 1 },
    { group: 'Speed Display (max ms between taps)', id: 'sliderLandscapeSpeedLetterSpacing', type: 'slider', label: 'Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Speed Display (max ms between taps)', id: 'sliderLandscapeSpeedNumberXOffset', type: 'slider', label: 'Countdown Number X Offset (Px):', min: -50, max: 50, step: 1, value: 0 },
    { group: 'Speed Display (max ms between taps)', id: 'sliderLandscapeSpeedLineHeight', type: 'slider', label: 'Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Ms/Click Display', id: 'sliderLandscapeMsPerClickFontSize', type: 'slider', label: 'Font Size (px):', min: 5, max: 300, step: 0.01, value: 38.73 },
    { group: 'Ms/Click Display', id: 'sliderLandscapeMsPerClickFontSizeVw', type: 'slider', label: 'Font Size (vw):', min: 1, max: 60, step: 0.01, value: 9.93 },
    { group: 'Ms/Click Display', id: 'sliderLandscapeMsPerClickExtrusionDepth', type: 'slider', label: 'Extrusion Depth (px):', min: 0, max: 20, step: 1, value: 9 },
    { group: 'Ms/Click Display', id: 'sliderLandscapeMsPerClickOverallBorderThickness', type: 'slider', label: 'Border Thickness (px):', min: 0, max: 20, step: 1, value: 1 },
    { group: 'Ms/Click Display', id: 'sliderLandscapeMsPerClickLetterSpacing', type: 'slider', label: 'Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Ms/Click Display', id: 'sliderLandscapeMsPerClickNumberXOffset', type: 'slider', label: 'Number X Offset (Px):', min: -50, max: 50, step: 1, value: 0 },
    { group: 'Ms/Click Display', id: 'sliderLandscapeMsPerClickLineHeight', type: 'slider', label: 'Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Ms/Click Display', id: 'sliderLandscapeMsPerClickLine2Gap', type: 'slider', label: 'Line 2-3 Spacing (px):', min: -100, max: 200, step: 1, value: 0 },
    { group: 'Round Breakdown', id: 'sliderLandscapeRoundBreakdownWidth', type: 'slider', label: 'Width (vw):', min: 10, max: 100, step: 0.1, value: 20 },
    { group: 'Round Breakdown', id: 'sliderLandscapeRoundBreakdownHeight', type: 'slider', label: 'Height (vh):', min: 10, max: 100, step: 0.1, value: 45 },
    { group: 'Round Breakdown', id: 'sliderLandscapeRoundBreakdownOutlineThickness', type: 'slider', label: 'Outline Thickness (px):', min: 0, max: 20, step: 1, value: 2 },
    { group: 'Round Breakdown', id: 'sliderLandscapeRoundBreakdownTitleFontSize', type: 'slider', label: 'Round Title Font Size (px):', min: 8, max: 60, step: 1, value: 16 },
    { group: 'Round Breakdown', id: 'sliderLandscapeRoundBreakdownTitleLetterSpacing', type: 'slider', label: 'Round Title Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Round Breakdown', id: 'sliderLandscapeRoundBreakdownTitleLineHeight', type: 'slider', label: 'Round Title Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
    { group: 'Round Breakdown', id: 'sliderLandscapeRoundBreakdownDataFontSize', type: 'slider', label: 'Round Data Font Size (px):', min: 8, max: 40, step: 1, value: 15 },
    { group: 'Round Breakdown', id: 'sliderLandscapeRoundBreakdownDataLetterSpacing', type: 'slider', label: 'Round Data Letter Spacing (px):', min: -10, max: 20, step: 0.5, value: 0 },
    { group: 'Round Breakdown', id: 'sliderLandscapeRoundBreakdownDataLineHeight', type: 'slider', label: 'Round Data Line Spacing:', min: 0.5, max: 3, step: 0.05, value: 1.2 },
];
function renderLandscapeUniformControls() {
    LANDSCAPE_UNIFORM_CONTROLS.forEach(ctrl => {
        const content = findGroupContent('landscape', ctrl.group, 'renderLandscapeUniformControls', ctrl.id);
        if (!content) return;
        const row = buildUniformControlRow(ctrl);
        // "Independent from Desktop" checkbox - see
        // renderMobileUniformControls()'s own identical comment.
        const { desktopId } = resolveDevControlId(ctrl.id);
        const controlEl = row.querySelector('[id]');
        row.appendChild(buildIndependenceCheckbox('landscape', desktopId, controlEl));
        content.appendChild(row);
    });
}

// The 60 X/Y-offset sliders (20 per tab) each bundled with their own
// px/vw-unit-toggle checkbox in the same row - excluded from the
// uniform-controls pass above since they're compound (2 inputs, not
// 1), generated separately here via their own row builder. Spans
// all 3 tabs in one config array (tagged with `tab`) since the
// shape is identical across all 3, just targeting a different
// #{tab}TabContent root.
const COMPOUND_OFFSET_CONTROLS = [
    { tab: 'desktop', group: 'Main Button', id: 'sliderButtonX', label: 'X Offset (vw):', min: -50, max: 50, step: 0.01, value: -1, checkboxId: 'checkboxButtonXOffsetUnitPx', checkboxFlagVar: '--button-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Main Button', id: 'sliderButtonY', label: 'Y Offset (vh):', min: -50, max: 50, step: 0.01, value: 5, checkboxId: 'checkboxButtonYOffsetUnitPx', checkboxFlagVar: '--button-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Start/Try Again Button', id: 'sliderTextX', label: 'Button X Offset (vw):', min: -40, max: 40, step: 0.01, value: -0.16, checkboxId: 'checkboxTextXOffsetUnitPx', checkboxFlagVar: '--text-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Start/Try Again Button', id: 'sliderTextY', label: 'Button Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -13.75, checkboxId: 'checkboxTextYOffsetUnitPx', checkboxFlagVar: '--text-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Start/Try Again Button', id: 'sliderTryAgainTextX', label: 'Try Again X Offset (vw):', min: -40, max: 40, step: 0.01, value: -0.16, checkboxId: 'checkboxTryAgainTextXOffsetUnitPx', checkboxFlagVar: '--try-again-text-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Start/Try Again Button', id: 'sliderTryAgainTextY', label: 'Try Again Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -13.75, checkboxId: 'checkboxTryAgainTextYOffsetUnitPx', checkboxFlagVar: '--try-again-text-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Rotation Animation', id: 'sliderTryAgainQuestionMarkX', label: '"?" X Offset (vw):', min: -50, max: 50, step: 0.01, value: -0.16, checkboxId: 'checkboxTryAgainQuestionMarkXOffsetUnitPx', checkboxFlagVar: '--try-again-question-mark-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Rotation Animation', id: 'sliderTryAgainQuestionMarkY', label: '"?" Y Offset (vh):', min: -50, max: 50, step: 0.01, value: 0.05, checkboxId: 'checkboxTryAgainQuestionMarkYOffsetUnitPx', checkboxFlagVar: '--try-again-question-mark-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Round Text', id: 'sliderRoundDockX', label: 'Text X Offset (vw):', min: -50, max: 50, step: 0.01, value: -43, checkboxId: 'checkboxRoundDockXOffsetUnitPx', checkboxFlagVar: '--round-dock-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Round Text', id: 'sliderRoundDockY', label: 'Text Y Offset (vh):', min: -50, max: 50, step: 0.01, value: 42.7, checkboxId: 'checkboxRoundDockYOffsetUnitPx', checkboxFlagVar: '--round-dock-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'High Score', id: 'sliderHighScoreX', label: 'X Offset (vw):', min: -50, max: 50, step: 0.01, value: 0, checkboxId: 'checkboxHighScoreXOffsetUnitPx', checkboxFlagVar: '--high-score-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'High Score', id: 'sliderHighScoreY', label: 'Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -42, checkboxId: 'checkboxHighScoreYOffsetUnitPx', checkboxFlagVar: '--high-score-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Win/Lose Text', id: 'sliderResultWinX', label: 'Win X Offset (vw):', min: -40, max: 40, step: 0.01, value: 0, checkboxId: 'checkboxResultWinXOffsetUnitPx', checkboxFlagVar: '--result-win-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Win/Lose Text', id: 'sliderResultWinY', label: 'Win Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -13, checkboxId: 'checkboxResultWinYOffsetUnitPx', checkboxFlagVar: '--result-win-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Win/Lose Text', id: 'sliderResultLoseX', label: 'Lose X Offset (vw):', min: -40, max: 40, step: 0.01, value: 0, checkboxId: 'checkboxResultLoseXOffsetUnitPx', checkboxFlagVar: '--result-lose-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Win/Lose Text', id: 'sliderResultLoseY', label: 'Lose Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -13, checkboxId: 'checkboxResultLoseYOffsetUnitPx', checkboxFlagVar: '--result-lose-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Speed Display (max ms between taps)', id: 'sliderSpeedX', label: 'X Offset (vw):', min: -50, max: 50, step: 0.01, value: 39.47, checkboxId: 'checkboxSpeedXOffsetUnitPx', checkboxFlagVar: '--speed-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Speed Display (max ms between taps)', id: 'sliderSpeedY', label: 'Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -14.85, checkboxId: 'checkboxSpeedYOffsetUnitPx', checkboxFlagVar: '--speed-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Ms/Click Display', id: 'sliderMsPerClickX', label: 'X Offset (vw):', min: -50, max: 50, step: 0.01, value: 40.2, checkboxId: 'checkboxMsPerClickXOffsetUnitPx', checkboxFlagVar: '--ms-per-click-x-offset-unit-is-px', checkboxLabel: 'Px' },
    // Round Breakdown's own X/Y Offset - moved here from the plain
    // slider system (2026-09-19, direct request: "also provide the
    // Px checkbox for x and y offset of the Round Breakdown
    // panel"). min/max kept at 0-100 (not the -50/50 every other
    // element here uses) - Round Breakdown's offset is always a
    // gap FROM an edge (0-100% of the viewport), never a centered
    // +/- offset, so the toggle's own vw<->px conversion applies
    // to this asymmetric range exactly the same way, just starting
    // from a different original range.
    { tab: 'desktop', group: 'Round Breakdown', id: 'sliderRoundBreakdownX', label: 'X Offset (vw):', min: 0, max: 100, step: 0.1, value: 65, checkboxId: 'checkboxRoundBreakdownXOffsetUnitPx', checkboxFlagVar: '--round-breakdown-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Round Breakdown', id: 'sliderRoundBreakdownY', label: 'Y Offset (vh):', min: 0, max: 100, step: 0.1, value: 5, checkboxId: 'checkboxRoundBreakdownYOffsetUnitPx', checkboxFlagVar: '--round-breakdown-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Ms/Click Display', id: 'sliderMsPerClickY', label: 'Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -14.88, checkboxId: 'checkboxMsPerClickYOffsetUnitPx', checkboxFlagVar: '--ms-per-click-y-offset-unit-is-px', checkboxLabel: 'Px' },
    // Target Count's Prefix/Number/Suffix X/Y offsets - per direct
    // request ("the X and Y offset sliders for the target Number,
    // Click and X should be similar tot he other Ui text
    // settings... unless i click the checkbox taht says Px").
    // Unlike every other element here, all 3 parts share ONE X
    // unit and ONE Y unit (--target-x-unit/--target-y-unit,
    // inherited from .target-count down to all 3 children - see
    // OFFSET_UNIT_FLAG_PREFIX's own comment and each part's own
    // CSS rule) - only the OFFSET AMOUNT is independent per part,
    // not the anchor/unit itself (a deliberate earlier scope
    // decision, not something this change reopens). So all 3
    // parts' X checkboxes share the SAME checkboxFlagVar
    // (--target-x-offset-unit-is-px), and all 3 Y checkboxes share
    // --target-y-offset-unit-is-px - setupOffsetUnitCheckboxes()
    // was generalized to convert/sync every slider bound to the
    // SAME flagVar+device together (previously assumed exactly one
    // slider per flagVar), so toggling any one of these 3 X
    // checkboxes converts and re-checks all 3 in lockstep, instead
    // of only the one that was clicked - see that function's own
    // comment.
    { tab: 'desktop', group: 'Target Count Display', id: 'sliderTargetPrefixXOffset', label: 'Prefix X Offset (vw):', min: -700, max: 700, step: 0.01, value: 49.20, checkboxId: 'checkboxTargetPrefixXOffsetUnitPx', checkboxFlagVar: '--target-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Target Count Display', id: 'sliderTargetPrefixYOffset', label: 'Prefix Y Offset (vh):', min: -700, max: 700, step: 0.01, value: 9.19, checkboxId: 'checkboxTargetPrefixYOffsetUnitPx', checkboxFlagVar: '--target-y-offset-unit-is-px', checkboxLabel: 'Px' },
    // Anchor-mode counterparts (2026-09-20, direct request: "if an
    // object is set to anchor mode, only show the anchor mode
    // relevant sliders. if its set to relative, only show the
    // relative sliders. but i should have x and y for both
    // instances") - only visible/relevant when that element's own
    // UI-Engine position.mode is switched to 'anchor' via the
    // Inspector (dynamic show/hide wired in the Inspector-writeback
    // module further down - see stage2SyncRowVisibility()). Share
    // the SAME --target-y-offset-unit-is-px flag as every other
    // Y slider in this group, no dedicated checkbox needed.
    { tab: 'desktop', group: 'Target Count Display', id: 'sliderTargetPrefixYAnchorOffset', label: 'Prefix Y Offset (Anchor Mode) (vh):', min: -700, max: 700, step: 0.01, value: 0 },
    { tab: 'desktop', group: 'Target Count Display', id: 'sliderTargetNumberXOffset', label: 'Number X Offset (vw):', min: -700, max: 700, step: 0.01, value: 200.24, checkboxId: 'checkboxTargetNumberXOffsetUnitPx', checkboxFlagVar: '--target-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Target Count Display', id: 'sliderTargetNumberYOffset', label: 'Number Y Offset (vh):', min: -700, max: 700, step: 0.01, value: -50.00, checkboxId: 'checkboxTargetNumberYOffsetUnitPx', checkboxFlagVar: '--target-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Target Count Display', id: 'sliderTargetSuffixXOffset', label: 'Suffix X Offset (vw):', min: -700, max: 700, step: 0.01, value: 324.34, checkboxId: 'checkboxTargetSuffixXOffsetUnitPx', checkboxFlagVar: '--target-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Target Count Display', id: 'sliderTargetSuffixYOffset', label: 'Suffix Y Offset (vh):', min: -700, max: 700, step: 0.01, value: 11.60, checkboxId: 'checkboxTargetSuffixYOffsetUnitPx', checkboxFlagVar: '--target-y-offset-unit-is-px', checkboxLabel: 'Px' },
    // Anchor-mode counterparts (2026-09-20) - same reasoning as
    // Prefix's above. Suffix genuinely has both axes tied to the
    // Number today, so both get one.
    { tab: 'desktop', group: 'Target Count Display', id: 'sliderTargetSuffixXAnchorOffset', label: 'Suffix X Offset (Anchor Mode) (vw):', min: -700, max: 700, step: 0.01, value: 0 },
    { tab: 'desktop', group: 'Target Count Display', id: 'sliderTargetSuffixYAnchorOffset', label: 'Suffix Y Offset (Anchor Mode) (vh):', min: -700, max: 700, step: 0.01, value: 0 },
    { tab: 'mobile', group: 'Main Button', id: 'sliderMobileButtonX', label: 'X Offset (vw):', min: -50, max: 50, step: 0.01, value: -2.32, checkboxId: 'checkboxMobileButtonXOffsetUnitPx', checkboxFlagVar: '--button-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Main Button', id: 'sliderMobileButtonY', label: 'Y Offset (vh):', min: -50, max: 50, step: 0.01, value: 16, checkboxId: 'checkboxMobileButtonYOffsetUnitPx', checkboxFlagVar: '--button-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Start/Try Again Button', id: 'sliderMobileTextX', label: 'Button X Offset (vw):', min: -40, max: 40, step: 0.01, value: 0, checkboxId: 'checkboxMobileTextXOffsetUnitPx', checkboxFlagVar: '--text-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Start/Try Again Button', id: 'sliderMobileTextY', label: 'Button Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -16.5, checkboxId: 'checkboxMobileTextYOffsetUnitPx', checkboxFlagVar: '--text-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Start/Try Again Button', id: 'sliderMobileTryAgainTextX', label: 'Try Again X Offset (vw):', min: -40, max: 40, step: 0.01, value: 0, checkboxId: 'checkboxMobileTryAgainTextXOffsetUnitPx', checkboxFlagVar: '--try-again-text-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Start/Try Again Button', id: 'sliderMobileTryAgainTextY', label: 'Try Again Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -0.49, checkboxId: 'checkboxMobileTryAgainTextYOffsetUnitPx', checkboxFlagVar: '--try-again-text-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Rotation Animation', id: 'sliderMobileTryAgainQuestionMarkX', label: '"?" X Offset (vw):', min: -50, max: 50, step: 0.01, value: 20, checkboxId: 'checkboxMobileTryAgainQuestionMarkXOffsetUnitPx', checkboxFlagVar: '--try-again-question-mark-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Rotation Animation', id: 'sliderMobileTryAgainQuestionMarkY', label: '"?" Y Offset (vh):', min: -50, max: 50, step: 0.01, value: 5.05, checkboxId: 'checkboxMobileTryAgainQuestionMarkYOffsetUnitPx', checkboxFlagVar: '--try-again-question-mark-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Round Text', id: 'sliderMobileRoundDockX', label: 'Text X Offset (vw):', min: -50, max: 50, step: 0.01, value: -30, checkboxId: 'checkboxMobileRoundDockXOffsetUnitPx', checkboxFlagVar: '--round-dock-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Round Text', id: 'sliderMobileRoundDockY', label: 'Text Y Offset (vh):', min: -50, max: 50, step: 0.01, value: 35, checkboxId: 'checkboxMobileRoundDockYOffsetUnitPx', checkboxFlagVar: '--round-dock-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'High Score', id: 'sliderMobileHighScoreX', label: 'X Offset (vw):', min: -50, max: 50, step: 0.01, value: 0, checkboxId: 'checkboxMobileHighScoreXOffsetUnitPx', checkboxFlagVar: '--high-score-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'High Score', id: 'sliderMobileHighScoreY', label: 'Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -35, checkboxId: 'checkboxMobileHighScoreYOffsetUnitPx', checkboxFlagVar: '--high-score-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Win/Lose Text', id: 'sliderMobileResultWinX', label: 'Win X Offset (vw):', min: -40, max: 40, step: 0.01, value: 0, checkboxId: 'checkboxMobileResultWinXOffsetUnitPx', checkboxFlagVar: '--result-win-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Win/Lose Text', id: 'sliderMobileResultWinY', label: 'Win Y Offset (vh):', min: -50, max: 50, step: 0.01, value: 1.46, checkboxId: 'checkboxMobileResultWinYOffsetUnitPx', checkboxFlagVar: '--result-win-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Win/Lose Text', id: 'sliderMobileResultLoseX', label: 'Lose X Offset (vw):', min: -40, max: 40, step: 0.01, value: 0, checkboxId: 'checkboxMobileResultLoseXOffsetUnitPx', checkboxFlagVar: '--result-lose-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Win/Lose Text', id: 'sliderMobileResultLoseY', label: 'Lose Y Offset (vh):', min: -50, max: 50, step: 0.01, value: 1.46, checkboxId: 'checkboxMobileResultLoseYOffsetUnitPx', checkboxFlagVar: '--result-lose-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Speed Display (max ms between taps)', id: 'sliderMobileSpeedX', label: 'X Offset (vw):', min: -50, max: 50, step: 0.01, value: -23, checkboxId: 'checkboxMobileSpeedXOffsetUnitPx', checkboxFlagVar: '--speed-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Speed Display (max ms between taps)', id: 'sliderMobileSpeedY', label: 'Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -19.5, checkboxId: 'checkboxMobileSpeedYOffsetUnitPx', checkboxFlagVar: '--speed-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Ms/Click Display', id: 'sliderMobileMsPerClickX', label: 'X Offset (vw):', min: -50, max: 50, step: 0.01, value: 24.76, checkboxId: 'checkboxMobileMsPerClickXOffsetUnitPx', checkboxFlagVar: '--ms-per-click-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Ms/Click Display', id: 'sliderMobileMsPerClickY', label: 'Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -26.84, checkboxId: 'checkboxMobileMsPerClickYOffsetUnitPx', checkboxFlagVar: '--ms-per-click-y-offset-unit-is-px', checkboxLabel: 'Px' },
    // Target Count's Prefix/Number/Suffix X/Y offsets - see the
    // Desktop tab's identical entries above for the full comment
    // on why all 3 parts' checkboxes share one flagVar per axis.
    { tab: 'mobile', group: 'Target Count Display', id: 'sliderMobileTargetPrefixXOffset', label: 'Prefix X Offset (vw):', min: -700, max: 700, step: 0.01, value: 37.50, checkboxId: 'checkboxMobileTargetPrefixXOffsetUnitPx', checkboxFlagVar: '--target-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Target Count Display', id: 'sliderMobileTargetPrefixYOffset', label: 'Prefix Y Offset (vh):', min: -700, max: 700, step: 0.01, value: -29.31, checkboxId: 'checkboxMobileTargetPrefixYOffsetUnitPx', checkboxFlagVar: '--target-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Target Count Display', id: 'sliderMobileTargetPrefixYAnchorOffset', label: 'Prefix Y Offset (Anchor Mode) (vh):', min: -700, max: 700, step: 0.01, value: 0 },
    { tab: 'mobile', group: 'Target Count Display', id: 'sliderMobileTargetNumberXOffset', label: 'Number X Offset (vw):', min: -700, max: 700, step: 0.01, value: 111.06, checkboxId: 'checkboxMobileTargetNumberXOffsetUnitPx', checkboxFlagVar: '--target-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Target Count Display', id: 'sliderMobileTargetNumberYOffset', label: 'Number Y Offset (vh):', min: -700, max: 700, step: 0.01, value: 34.90, checkboxId: 'checkboxMobileTargetNumberYOffsetUnitPx', checkboxFlagVar: '--target-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Target Count Display', id: 'sliderMobileTargetSuffixXOffset', label: 'Suffix X Offset (vw):', min: -700, max: 700, step: 0.01, value: 165.75, checkboxId: 'checkboxMobileTargetSuffixXOffsetUnitPx', checkboxFlagVar: '--target-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Target Count Display', id: 'sliderMobileTargetSuffixYOffset', label: 'Suffix Y Offset (vh):', min: -700, max: 700, step: 0.01, value: 16.02, checkboxId: 'checkboxMobileTargetSuffixYOffsetUnitPx', checkboxFlagVar: '--target-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Target Count Display', id: 'sliderMobileTargetSuffixXAnchorOffset', label: 'Suffix X Offset (Anchor Mode) (vw):', min: -700, max: 700, step: 0.01, value: 0 },
    { tab: 'mobile', group: 'Target Count Display', id: 'sliderMobileTargetSuffixYAnchorOffset', label: 'Suffix Y Offset (Anchor Mode) (vh):', min: -700, max: 700, step: 0.01, value: 0 },
    { tab: 'mobile', group: 'Round Breakdown', id: 'sliderMobileRoundBreakdownX', label: 'X Offset (vw):', min: 0, max: 100, step: 0.1, value: 10, checkboxId: 'checkboxMobileRoundBreakdownXOffsetUnitPx', checkboxFlagVar: '--round-breakdown-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'mobile', group: 'Round Breakdown', id: 'sliderMobileRoundBreakdownY', label: 'Y Offset (vh):', min: 0, max: 100, step: 0.1, value: 15, checkboxId: 'checkboxMobileRoundBreakdownYOffsetUnitPx', checkboxFlagVar: '--round-breakdown-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Main Button', id: 'sliderLandscapeButtonX', label: 'X Offset (vw):', min: -50, max: 50, step: 0.01, value: -2.32, checkboxId: 'checkboxLandscapeButtonXOffsetUnitPx', checkboxFlagVar: '--button-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Main Button', id: 'sliderLandscapeButtonY', label: 'Y Offset (vh):', min: -50, max: 50, step: 0.01, value: 16, checkboxId: 'checkboxLandscapeButtonYOffsetUnitPx', checkboxFlagVar: '--button-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Start/Try Again Button', id: 'sliderLandscapeTextX', label: 'Button X Offset (vw):', min: -40, max: 40, step: 0.01, value: 0, checkboxId: 'checkboxLandscapeTextXOffsetUnitPx', checkboxFlagVar: '--text-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Start/Try Again Button', id: 'sliderLandscapeTextY', label: 'Button Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -16.5, checkboxId: 'checkboxLandscapeTextYOffsetUnitPx', checkboxFlagVar: '--text-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Start/Try Again Button', id: 'sliderLandscapeTryAgainTextX', label: 'Try Again X Offset (vw):', min: -40, max: 40, step: 0.01, value: 0, checkboxId: 'checkboxLandscapeTryAgainTextXOffsetUnitPx', checkboxFlagVar: '--try-again-text-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Start/Try Again Button', id: 'sliderLandscapeTryAgainTextY', label: 'Try Again Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -0.49, checkboxId: 'checkboxLandscapeTryAgainTextYOffsetUnitPx', checkboxFlagVar: '--try-again-text-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Rotation Animation', id: 'sliderLandscapeTryAgainQuestionMarkX', label: '"?" X Offset (vw):', min: -50, max: 50, step: 0.01, value: 20, checkboxId: 'checkboxLandscapeTryAgainQuestionMarkXOffsetUnitPx', checkboxFlagVar: '--try-again-question-mark-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Rotation Animation', id: 'sliderLandscapeTryAgainQuestionMarkY', label: '"?" Y Offset (vh):', min: -50, max: 50, step: 0.01, value: 5.05, checkboxId: 'checkboxLandscapeTryAgainQuestionMarkYOffsetUnitPx', checkboxFlagVar: '--try-again-question-mark-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Round Text', id: 'sliderLandscapeRoundDockX', label: 'Text X Offset (vw):', min: -50, max: 50, step: 0.01, value: -30, checkboxId: 'checkboxLandscapeRoundDockXOffsetUnitPx', checkboxFlagVar: '--round-dock-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Round Text', id: 'sliderLandscapeRoundDockY', label: 'Text Y Offset (vh):', min: -50, max: 50, step: 0.01, value: 35, checkboxId: 'checkboxLandscapeRoundDockYOffsetUnitPx', checkboxFlagVar: '--round-dock-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'High Score', id: 'sliderLandscapeHighScoreX', label: 'X Offset (vw):', min: -50, max: 50, step: 0.01, value: 0, checkboxId: 'checkboxLandscapeHighScoreXOffsetUnitPx', checkboxFlagVar: '--high-score-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'High Score', id: 'sliderLandscapeHighScoreY', label: 'Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -35, checkboxId: 'checkboxLandscapeHighScoreYOffsetUnitPx', checkboxFlagVar: '--high-score-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Win/Lose Text', id: 'sliderLandscapeResultWinX', label: 'Win X Offset (vw):', min: -40, max: 40, step: 0.01, value: 0, checkboxId: 'checkboxLandscapeResultWinXOffsetUnitPx', checkboxFlagVar: '--result-win-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Win/Lose Text', id: 'sliderLandscapeResultWinY', label: 'Win Y Offset (vh):', min: -50, max: 50, step: 0.01, value: 1.46, checkboxId: 'checkboxLandscapeResultWinYOffsetUnitPx', checkboxFlagVar: '--result-win-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Win/Lose Text', id: 'sliderLandscapeResultLoseX', label: 'Lose X Offset (vw):', min: -40, max: 40, step: 0.01, value: 0, checkboxId: 'checkboxLandscapeResultLoseXOffsetUnitPx', checkboxFlagVar: '--result-lose-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Win/Lose Text', id: 'sliderLandscapeResultLoseY', label: 'Lose Y Offset (vh):', min: -50, max: 50, step: 0.01, value: 1.46, checkboxId: 'checkboxLandscapeResultLoseYOffsetUnitPx', checkboxFlagVar: '--result-lose-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Speed Display (max ms between taps)', id: 'sliderLandscapeSpeedX', label: 'X Offset (vw):', min: -50, max: 50, step: 0.01, value: -23, checkboxId: 'checkboxLandscapeSpeedXOffsetUnitPx', checkboxFlagVar: '--speed-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Speed Display (max ms between taps)', id: 'sliderLandscapeSpeedY', label: 'Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -19.5, checkboxId: 'checkboxLandscapeSpeedYOffsetUnitPx', checkboxFlagVar: '--speed-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Ms/Click Display', id: 'sliderLandscapeMsPerClickX', label: 'X Offset (vw):', min: -50, max: 50, step: 0.01, value: 24.76, checkboxId: 'checkboxLandscapeMsPerClickXOffsetUnitPx', checkboxFlagVar: '--ms-per-click-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Ms/Click Display', id: 'sliderLandscapeMsPerClickY', label: 'Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -26.84, checkboxId: 'checkboxLandscapeMsPerClickYOffsetUnitPx', checkboxFlagVar: '--ms-per-click-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Round Breakdown', id: 'sliderLandscapeRoundBreakdownX', label: 'X Offset (vw):', min: 0, max: 100, step: 0.1, value: 65, checkboxId: 'checkboxLandscapeRoundBreakdownXOffsetUnitPx', checkboxFlagVar: '--round-breakdown-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Round Breakdown', id: 'sliderLandscapeRoundBreakdownY', label: 'Y Offset (vh):', min: 0, max: 100, step: 0.1, value: 5, checkboxId: 'checkboxLandscapeRoundBreakdownYOffsetUnitPx', checkboxFlagVar: '--round-breakdown-y-offset-unit-is-px', checkboxLabel: 'Px' },
    // Target Count's Prefix/Number/Suffix X/Y offsets - see the
    // Desktop tab's identical entries above for the full comment
    // on why all 3 parts' checkboxes share one flagVar per axis.
    { tab: 'landscape', group: 'Target Count Display', id: 'sliderLandscapeTargetPrefixXOffset', label: 'Prefix X Offset (vw):', min: -700, max: 700, step: 0.01, value: 49.20, checkboxId: 'checkboxLandscapeTargetPrefixXOffsetUnitPx', checkboxFlagVar: '--target-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Target Count Display', id: 'sliderLandscapeTargetPrefixYOffset', label: 'Prefix Y Offset (vh):', min: -700, max: 700, step: 0.01, value: 9.19, checkboxId: 'checkboxLandscapeTargetPrefixYOffsetUnitPx', checkboxFlagVar: '--target-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Target Count Display', id: 'sliderLandscapeTargetPrefixYAnchorOffset', label: 'Prefix Y Offset (Anchor Mode) (vh):', min: -700, max: 700, step: 0.01, value: 0 },
    { tab: 'landscape', group: 'Target Count Display', id: 'sliderLandscapeTargetNumberXOffset', label: 'Number X Offset (vw):', min: -700, max: 700, step: 0.01, value: 200.24, checkboxId: 'checkboxLandscapeTargetNumberXOffsetUnitPx', checkboxFlagVar: '--target-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Target Count Display', id: 'sliderLandscapeTargetNumberYOffset', label: 'Number Y Offset (vh):', min: -700, max: 700, step: 0.01, value: -50.00, checkboxId: 'checkboxLandscapeTargetNumberYOffsetUnitPx', checkboxFlagVar: '--target-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Target Count Display', id: 'sliderLandscapeTargetSuffixXOffset', label: 'Suffix X Offset (vw):', min: -700, max: 700, step: 0.01, value: 324.34, checkboxId: 'checkboxLandscapeTargetSuffixXOffsetUnitPx', checkboxFlagVar: '--target-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Target Count Display', id: 'sliderLandscapeTargetSuffixYOffset', label: 'Suffix Y Offset (vh):', min: -700, max: 700, step: 0.01, value: 11.60, checkboxId: 'checkboxLandscapeTargetSuffixYOffsetUnitPx', checkboxFlagVar: '--target-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'landscape', group: 'Target Count Display', id: 'sliderLandscapeTargetSuffixXAnchorOffset', label: 'Suffix X Offset (Anchor Mode) (vw):', min: -700, max: 700, step: 0.01, value: 0 },
    { tab: 'landscape', group: 'Target Count Display', id: 'sliderLandscapeTargetSuffixYAnchorOffset', label: 'Suffix Y Offset (Anchor Mode) (vh):', min: -700, max: 700, step: 0.01, value: 0 },
];
function buildCompoundOffsetRow(ctrl) {
    const row = document.createElement('div');
    row.className = 'dev-row';
    const label = document.createElement('span');
    label.className = 'dev-label';
    label.textContent = ctrl.label;
    row.appendChild(label);
    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'dev-slider';
    input.id = ctrl.id;
    input.min = ctrl.min;
    input.max = ctrl.max;
    input.step = ctrl.step;
    input.value = ctrl.value;
    row.appendChild(input);
    const value = document.createElement('span');
    value.className = 'dev-value';
    value.id = ctrl.id.replace(/^slider/, 'value');
    value.textContent = ctrl.value;
    row.appendChild(value);
    const unitLabel = document.createElement('label');
    unitLabel.className = 'dev-offset-unit-label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'dev-offset-unit-checkbox';
    checkbox.id = ctrl.checkboxId;
    checkbox.dataset.slider = ctrl.id;
    checkbox.dataset.flagVar = ctrl.checkboxFlagVar;
    unitLabel.appendChild(checkbox);
    unitLabel.appendChild(document.createTextNode(ctrl.checkboxLabel));
    row.appendChild(unitLabel);
    return row;
}
function renderCompoundOffsetControls() {
    COMPOUND_OFFSET_CONTROLS.forEach(ctrl => {
        const content = findGroupContent(ctrl.tab, ctrl.group, 'renderCompoundOffsetControls', ctrl.id);
        if (!content) return;
        content.appendChild(buildCompoundOffsetRow(ctrl));
    });
}

// Dev Panel's own built-in styling group (CLAUDE.md 12i) - 31
// sliders/colors across all 3 tabs, all matching the same simple
// label+input(+value) shape as the uniform controls above, so they
// reuse buildUniformControlRow() unchanged. These write to
// devPanelStyle/mobileDevPanelStyle/landscapeDevPanelStyle (not
// cssVars) via setupDevPanelStyleControls()'s own dedicated,
// already-generic-by-id wiring - unaffected by how the row was
// created, same principle as every other port in this file.
const DEVPANEL_STYLE_CONTROLS = [
    { tab: 'desktop', id: 'sliderDevPanelTitleFontSize', type: 'slider', label: 'Title Font Size (px):', min: 6, max: 30, step: 1, value: 11 },
    { tab: 'desktop', id: 'sliderDevTabFontSize', type: 'slider', label: 'Tab Font Size (px):', min: 6, max: 30, step: 1, value: 12 },
    { tab: 'desktop', id: 'sliderDevGroupTitleFontSize', type: 'slider', label: 'Group Title Font Size (px):', min: 6, max: 30, step: 1, value: 11 },
    { tab: 'desktop', id: 'sliderDevSettingTitleFontSize', type: 'slider', label: 'Setting Title Font Size (px):', min: 6, max: 30, step: 1, value: 10 },
    { tab: 'desktop', id: 'sliderDevButtonTextBorder', type: 'slider', label: 'Button Text Border (px):', min: 0, max: 20, step: 1, value: 0 },
    { tab: 'desktop', id: 'sliderDevScrollStrength', type: 'slider', label: 'Dev Panel Scroll Strength (x):', min: 0.2, max: 5, step: 0.1, value: 1 },
    { tab: 'desktop', id: 'sliderDevPanelOpacity', type: 'slider', label: 'Opacity:', min: 0.1, max: 1, step: 0.01, value: 1 },
    { tab: 'desktop', id: 'colorDevPanelBg', type: 'color', label: 'Background Color:', value: '#000000' },
    { tab: 'desktop', id: 'colorDevPanelTitleText', type: 'color', label: 'Title Text Color:', value: '#ffffff' },
    { tab: 'desktop', id: 'colorDevPanelNonTitleText', type: 'color', label: 'Settings Title Text Color:', value: '#ffffff' },
    { tab: 'desktop', id: 'colorDevPanelAccent', type: 'color', label: 'Accent Color (Buttons/UI):', value: '#00ff00' },
    { tab: 'desktop', id: 'colorDevPanelSliderColor', type: 'color', label: 'Slider Color:', value: '#3b82f6' },
    { tab: 'desktop', id: 'colorDevPanelGroupLabelBg', type: 'color', label: 'Group Label Background Color:', value: '#134e4a' },
    { tab: 'desktop', id: 'colorDevPanelGroupText', type: 'color', label: 'Group Text Color:', value: '#5cc9ff' },
    { tab: 'desktop', id: 'colorDevPanelButtonText', type: 'color', label: 'Button Text Color:', value: '#000000' },
    { tab: 'desktop', id: 'colorDevPanelSettingNumber', type: 'color', label: 'Setting Number Text Color:', value: '#5cc9ff' },
    { tab: 'desktop', id: 'sliderDevButtonHeight', type: 'slider', label: 'Button Height (px):', min: 12, max: 60, step: 1, value: 24 },
    { tab: 'desktop', id: 'sliderDevButtonTextLetterSpacing', type: 'slider', label: 'Button Text Letter Spacing (px):', min: -2, max: 10, step: 0.1, value: 0 },
    { tab: 'desktop', id: 'sliderDevTabTextLetterSpacing', type: 'slider', label: 'Tab Text Letter Spacing (px):', min: -2, max: 10, step: 0.1, value: 0 },
    { tab: 'desktop', id: 'sliderDevGroupTextLetterSpacing', type: 'slider', label: 'Group Text Letter Spacing (px):', min: -2, max: 10, step: 0.1, value: 0 },
    { tab: 'desktop', id: 'sliderDevSettingsTextLetterSpacing', type: 'slider', label: 'Settings Text Letter Spacing (px):', min: -2, max: 10, step: 0.1, value: 0 },
    { tab: 'desktop', id: 'sliderDevValueFontSize', type: 'slider', label: 'Setting Number Font Size (px):', min: 6, max: 30, step: 1, value: 10 },
    { tab: 'desktop', id: 'sliderDevPanelTitleLetterSpacing', type: 'slider', label: 'Title Letter Spacing (px):', min: -2, max: 10, step: 0.1, value: 0 },
    { tab: 'desktop', id: 'sliderDevPanelTitleLineHeight', type: 'slider', label: 'Title Line Spacing (x):', min: 0.8, max: 3, step: 0.05, value: 1.2 },
    { tab: 'desktop', id: 'sliderDevTabLineHeight', type: 'slider', label: 'Tab Line Spacing (x):', min: 0.8, max: 3, step: 0.05, value: 1.2 },
    { tab: 'desktop', id: 'colorDevPanelTabText', type: 'color', label: 'Tab Text Color:', value: '#000000' },
    { tab: 'desktop', id: 'sliderDevButtonFontSize', type: 'slider', label: 'Button Text Font Size (px):', min: 6, max: 30, step: 1, value: 10 },
    { tab: 'desktop', id: 'sliderDevButtonLineHeight', type: 'slider', label: 'Button Text Line Spacing (x):', min: 0.8, max: 3, step: 0.05, value: 1.2 },
    { tab: 'desktop', id: 'sliderDevSettingsLineHeight', type: 'slider', label: 'Settings Text Line Spacing (x):', min: 0.8, max: 3, step: 0.05, value: 1.2 },
    { tab: 'desktop', id: 'sliderDevGroupLineHeight', type: 'slider', label: 'Group Text Line Spacing (x):', min: 0.8, max: 3, step: 0.05, value: 1.2 },
    { tab: 'mobile', id: 'sliderMobileDevPanelTitleFontSize', type: 'slider', label: 'Title Font Size (px):', min: 6, max: 30, step: 1, value: 11 },
    { tab: 'mobile', id: 'sliderMobileDevTabFontSize', type: 'slider', label: 'Tab Font Size (px):', min: 6, max: 30, step: 1, value: 12 },
    { tab: 'mobile', id: 'sliderMobileDevGroupTitleFontSize', type: 'slider', label: 'Group Title Font Size (px):', min: 6, max: 30, step: 1, value: 11 },
    { tab: 'mobile', id: 'sliderMobileDevSettingTitleFontSize', type: 'slider', label: 'Setting Title Font Size (px):', min: 6, max: 30, step: 1, value: 10 },
    { tab: 'mobile', id: 'sliderMobileDevButtonTextBorder', type: 'slider', label: 'Button Text Border (px):', min: 0, max: 20, step: 1, value: 0 },
    { tab: 'mobile', id: 'sliderMobileDevScrollStrength', type: 'slider', label: 'Dev Panel Scroll Strength (x):', min: 0.2, max: 5, step: 0.1, value: 1 },
    { tab: 'mobile', id: 'sliderMobileDevButtonHeight', type: 'slider', label: 'Button Height (px):', min: 12, max: 60, step: 1, value: 24 },
    { tab: 'mobile', id: 'sliderMobileDevValueFontSize', type: 'slider', label: 'Setting Number Font Size (px):', min: 6, max: 30, step: 1, value: 10 },
    // The 7 fields below were desktop-only until now (real bug
    // found live, direct report: "The new Dev Panel text settigns
    // we just added arent reflected in the Mobile and Landscape
    // tabs") - confirmed the SHARED-value propagation itself
    // worked fine (a Desktop change correctly reached Mobile's own
    // rendered CSS var), the actual gap was that these 7 simply
    // had no Mobile/Landscape control to look at or tune at all,
    // unlike every sibling font-size field in this same group,
    // which already has one. Moved out of DEV_PANEL_STYLE_SHARED_KEYS
    // (see its own comment) to become genuinely per-tab, matching
    // those siblings - the other 7 new fields (5 Bold toggles, Tab
    // Text Color, Title Capitalize) correctly stay shared, already
    // consistent with their own sibling colors/caps-toggles.
    { tab: 'mobile', id: 'sliderMobileDevPanelTitleLetterSpacing', type: 'slider', label: 'Title Letter Spacing (px):', min: -2, max: 10, step: 0.1, value: 0 },
    { tab: 'mobile', id: 'sliderMobileDevPanelTitleLineHeight', type: 'slider', label: 'Title Line Spacing (x):', min: 0.8, max: 3, step: 0.05, value: 1.2 },
    { tab: 'mobile', id: 'sliderMobileDevTabLineHeight', type: 'slider', label: 'Tab Line Spacing (x):', min: 0.8, max: 3, step: 0.05, value: 1.2 },
    { tab: 'mobile', id: 'sliderMobileDevButtonFontSize', type: 'slider', label: 'Button Text Font Size (px):', min: 6, max: 30, step: 1, value: 10 },
    { tab: 'mobile', id: 'sliderMobileDevButtonLineHeight', type: 'slider', label: 'Button Text Line Spacing (x):', min: 0.8, max: 3, step: 0.05, value: 1.2 },
    { tab: 'mobile', id: 'sliderMobileDevSettingsLineHeight', type: 'slider', label: 'Settings Text Line Spacing (x):', min: 0.8, max: 3, step: 0.05, value: 1.2 },
    { tab: 'mobile', id: 'sliderMobileDevGroupLineHeight', type: 'slider', label: 'Group Text Line Spacing (x):', min: 0.8, max: 3, step: 0.05, value: 1.2 },
    { tab: 'landscape', id: 'sliderLandscapeDevPanelTitleFontSize', type: 'slider', label: 'Title Font Size (px):', min: 6, max: 30, step: 1, value: 11 },
    { tab: 'landscape', id: 'sliderLandscapeDevTabFontSize', type: 'slider', label: 'Tab Font Size (px):', min: 6, max: 30, step: 1, value: 12 },
    { tab: 'landscape', id: 'sliderLandscapeDevGroupTitleFontSize', type: 'slider', label: 'Group Title Font Size (px):', min: 6, max: 30, step: 1, value: 11 },
    { tab: 'landscape', id: 'sliderLandscapeDevSettingTitleFontSize', type: 'slider', label: 'Setting Title Font Size (px):', min: 6, max: 30, step: 1, value: 10 },
    { tab: 'landscape', id: 'sliderLandscapeDevButtonTextBorder', type: 'slider', label: 'Button Text Border (px):', min: 0, max: 20, step: 1, value: 0 },
    { tab: 'landscape', id: 'sliderLandscapeDevScrollStrength', type: 'slider', label: 'Dev Panel Scroll Strength (x):', min: 0.2, max: 5, step: 0.1, value: 1 },
    { tab: 'landscape', id: 'sliderLandscapeDevButtonHeight', type: 'slider', label: 'Button Height (px):', min: 12, max: 60, step: 1, value: 24 },
    { tab: 'landscape', id: 'sliderLandscapeDevValueFontSize', type: 'slider', label: 'Setting Number Font Size (px):', min: 6, max: 30, step: 1, value: 10 },
    { tab: 'landscape', id: 'sliderLandscapeDevPanelTitleLetterSpacing', type: 'slider', label: 'Title Letter Spacing (px):', min: -2, max: 10, step: 0.1, value: 0 },
    { tab: 'landscape', id: 'sliderLandscapeDevPanelTitleLineHeight', type: 'slider', label: 'Title Line Spacing (x):', min: 0.8, max: 3, step: 0.05, value: 1.2 },
    { tab: 'landscape', id: 'sliderLandscapeDevTabLineHeight', type: 'slider', label: 'Tab Line Spacing (x):', min: 0.8, max: 3, step: 0.05, value: 1.2 },
    { tab: 'landscape', id: 'sliderLandscapeDevButtonFontSize', type: 'slider', label: 'Button Text Font Size (px):', min: 6, max: 30, step: 1, value: 10 },
    { tab: 'landscape', id: 'sliderLandscapeDevButtonLineHeight', type: 'slider', label: 'Button Text Line Spacing (x):', min: 0.8, max: 3, step: 0.05, value: 1.2 },
    { tab: 'landscape', id: 'sliderLandscapeDevSettingsLineHeight', type: 'slider', label: 'Settings Text Line Spacing (x):', min: 0.8, max: 3, step: 0.05, value: 1.2 },
    { tab: 'landscape', id: 'sliderLandscapeDevGroupLineHeight', type: 'slider', label: 'Group Text Line Spacing (x):', min: 0.8, max: 3, step: 0.05, value: 1.2 },
];
function renderDevPanelStyleControls() {
    DEVPANEL_STYLE_CONTROLS.forEach(ctrl => {
        const content = findGroupContent(ctrl.tab, 'Dev Panel', 'renderDevPanelStyleControls', ctrl.id);
        if (!content) return;
        content.appendChild(buildUniformControlRow(ctrl));
    });
}

// Desktop's 4 special-cased color pickers - each with its own
// "(...)" descriptive note instead of a plain value readout, and
// each read by ID inside setupDevSliders()'s generic color-picker
// handler (colorButton/colorBase trigger a hue-rotate refresh,
// colorButtonWin/-Lose are plain cssVar writes) - unaffected by
// how the row was created, same as every other port.
const SPECIAL_COLOR_CONTROLS = [
    { group: 'Main Button', id: 'colorButton', type: 'color', label: 'Color:', value: '#eb2027', note: '(grayscale + tint)' },
    { group: 'Main Button', id: 'colorButtonWin', type: 'color', label: 'Win Color:', value: '#22dd44', note: '(button tint on Win)' },
    { group: 'Main Button', id: 'colorButtonLose', type: 'color', label: 'Lose Color:', value: '#dd2222', note: '(button tint on Lose)' },
    { group: 'Main Button', id: 'colorBase', type: 'color', label: 'Base Color:', value: '#eb2027', note: '(grayscale + tint)' },
];
function renderSpecialColorControls() {
    SPECIAL_COLOR_CONTROLS.forEach(ctrl => {
        const content = findGroupContent('desktop', ctrl.group, 'renderSpecialColorControls', ctrl.id);
        if (!content) return;
        content.appendChild(buildUniformControlRow(ctrl));
    });
}

// Game Mechanics group (Desktop-only, single/shared - not device-
// split, see GAME_MECHANICS_SLIDER_IDS' own comment) - 13 sliders,
// same simple shape as the uniform controls, reusing
// buildUniformControlRow(). Read generically by ID via
// captureGameMechanics()/GAME_MECHANICS_SLIDER_IDS.forEach() -
// unaffected by how the row was created.
const GAME_MECHANICS_CONTROLS = [
    { id: 'sliderStartingSpeed', type: 'slider', label: 'Starting Time (ms):', min: 50, max: 800, step: 10, value: 500 },
    { id: 'sliderSpeedDecrease', type: 'slider', label: 'Speed Decrease (ms):', min: 5, max: 150, step: 5, value: 75 },
    { id: 'sliderSpeedDecreaseDecay', type: 'slider', label: 'Speed Decrease Decay (%):', min: 0, max: 100, step: 1, value: 75 },
    { id: 'sliderSpeedDecreaseDecayTolerance', type: 'slider', label: 'Speed Decrease Decay Tolerance (%):', min: 0, max: 100, step: 1, value: 5 },
    { id: 'sliderSpeedTimeRounding', type: 'slider', label: 'Speed Time Rounding (ms):', min: 1, max: 100, step: 1, value: 1 },
    { id: 'sliderCountdownRounding', type: 'slider', label: 'Countdown Display Rounding (ms):', min: 1, max: 100, step: 1, value: 100 },
    { id: 'sliderTapDebounce', type: 'slider', label: 'Debounce Window (ms, same pos only):', min: 0, max: 400, step: 10, value: 50 },
    { id: 'sliderResultDuration', type: 'slider', label: 'Result Text Duration (ms):', min: 200, max: 3000, step: 50, value: 1000 },
    { id: 'sliderTargetFloorBase', type: 'slider', label: 'Target Floor - Round 1:', min: 0, max: 30, step: 1, value: 2 },
    { id: 'sliderTargetFloorIncrease', type: 'slider', label: 'Target Floor - Increase Per Round:', min: 0, max: 10, step: 1, value: 0 },
    { id: 'sliderTargetCeilingBase', type: 'slider', label: 'Target Ceiling - Round 1:', min: 0, max: 60, step: 1, value: 30 },
    { id: 'sliderTargetCeilingIncrease', type: 'slider', label: 'Target Ceiling - Increase Per Round:', min: 0, max: 10, step: 1, value: 0 },
];
function renderGameMechanicsControls() {
    GAME_MECHANICS_CONTROLS.forEach(ctrl => {
        const content = findGroupContent('desktop', 'Game Mechanics', 'renderGameMechanicsControls', ctrl.id);
        if (!content) return;
        content.appendChild(buildUniformControlRow(ctrl));
    });
}

// Desktop-only "Dev Panel" group tail: the font-family select and 4
// capitalization checkboxes. Different control shapes from every
// other port above (a <select> with fixed options; checkboxes whose
// <label> wraps the input FIRST then a text span, inverted from the
// label-first convention used everywhere else) - handled by the
// 'select'/'checkbox' branches added to buildUniformControlRow().
// Read generically by ID elsewhere (setupDevPanelStyleControls()'s
// font-family wiring, the caps-checkbox id map) - unaffected by how
// the row was created.
const DEVPANEL_MISC_CONTROLS = [
    { tab: 'desktop', id: 'selectDevPanelFontFamily', type: 'select', label: 'Font (All Text):', options: [
        { value: "Arial, Helvetica, sans-serif", text: 'Arial' },
        { value: "Helvetica, Arial, sans-serif", text: 'Helvetica' },
        { value: "'Segoe UI', Arial, sans-serif", text: 'Segoe UI' },
        { value: "Verdana, Geneva, sans-serif", text: 'Verdana' },
        { value: "Tahoma, Geneva, sans-serif", text: 'Tahoma' },
        { value: "'Trebuchet MS', Arial, sans-serif", text: 'Trebuchet MS' },
        { value: "'Century Gothic', Arial, sans-serif", text: 'Century Gothic' },
        { value: "Calibri, Arial, sans-serif", text: 'Calibri' },
        { value: "'Lucida Sans Unicode', Arial, sans-serif", text: 'Lucida Sans' },
        { value: "'Open Sans', Arial, sans-serif", text: 'Open Sans' },
        { value: "Futura, 'Century Gothic', Arial, sans-serif", text: 'Futura' },
    ] },
    { tab: 'desktop', id: 'checkboxDevCapsButtonText', type: 'checkbox', label: 'Capitalize Button Text' },
    { tab: 'desktop', id: 'checkboxDevCapsTabText', type: 'checkbox', label: 'Capitalize Tab Text' },
    { tab: 'desktop', id: 'checkboxDevCapsGroupNames', type: 'checkbox', label: 'Capitalize Group Names' },
    { tab: 'desktop', id: 'checkboxDevCapsSettingsText', type: 'checkbox', label: 'Capitalize Settings Text' },
    { tab: 'desktop', id: 'checkboxDevCapsTitleText', type: 'checkbox', label: 'Capitalize Title Text' },
    { tab: 'desktop', id: 'checkboxDevBoldTitle', type: 'checkbox', label: 'Bold Title Text' },
    { tab: 'desktop', id: 'checkboxDevBoldTab', type: 'checkbox', label: 'Bold Tab Text' },
    { tab: 'desktop', id: 'checkboxDevBoldButton', type: 'checkbox', label: 'Bold Button Text' },
    { tab: 'desktop', id: 'checkboxDevBoldSettings', type: 'checkbox', label: 'Bold Settings Text' },
    { tab: 'desktop', id: 'checkboxDevBoldGroup', type: 'checkbox', label: 'Bold Group Text' },
];
function renderDevPanelMiscControls() {
    DEVPANEL_MISC_CONTROLS.forEach(ctrl => {
        const content = findGroupContent(ctrl.tab, 'Dev Panel', 'renderDevPanelMiscControls', ctrl.id);
        if (!content) return;
        content.appendChild(buildUniformControlRow(ctrl));
    });
}

// Click Burst's 6 text/number inputs (all 3 tabs = 18 total) - the
// last remaining category from the "finish it all" Method B port.
// Different shape from every prior port: plain text/number inputs
// (no slider, no value-readout span), read/written generically by
// ID via CLICK_BURST_TEXT_INPUT_MAP/setupClickBurstTextInputs(), not
// the CSS_VAR_SLIDER_MAP family - unaffected by how the row was
// created, same principle as every other port in this file.
function buildTextInputRow(ctrl) {
    const row = document.createElement('div');
    row.className = 'dev-row';
    const label = document.createElement('span');
    label.className = 'dev-label';
    label.textContent = ctrl.label;
    row.appendChild(label);
    const input = document.createElement('input');
    input.type = ctrl.inputType;
    input.className = 'dev-text-input' + (ctrl.wide ? ' dev-text-input-wide' : '');
    input.id = ctrl.id;
    if (ctrl.inputType === 'number' && ctrl.step !== undefined) input.step = ctrl.step;
    input.value = ctrl.value;
    row.appendChild(input);
    return row;
}
const CLICK_BURST_TEXT_INPUT_CONTROLS = (() => {
    const perTab = (tab, idPrefix) => [
        { tab, group: 'Click Burst', id: idPrefix + 'HideShadowIndexA', label: 'Hide Shadow (Left) - Frame Positions:', inputType: 'text', wide: true, value: '0=>2' },
        { tab, group: 'Click Burst', id: idPrefix + 'HideShadowIndexB', label: 'Hide Shadow (Right) - Frame Positions:', inputType: 'text', wide: true, value: '-2=>-1' },
        { tab, group: 'Click Burst', id: idPrefix + 'RightFloorDeg', label: 'Right Floor Angle (deg):', inputType: 'number', step: 1, value: 20 },
        { tab, group: 'Click Burst', id: idPrefix + 'RightCeilingDeg', label: 'Right Ceiling Angle (deg):', inputType: 'number', step: 1, value: 135 },
        { tab, group: 'Click Burst', id: idPrefix + 'LeftFloorDeg', label: 'Left Floor Angle (deg):', inputType: 'number', step: 1, value: 230 },
        { tab, group: 'Click Burst', id: idPrefix + 'LeftCeilingDeg', label: 'Left Ceiling Angle (deg):', inputType: 'number', step: 1, value: 340 },
    ];
    return [
        ...perTab('desktop', 'inputClickBurst'),
        ...perTab('mobile', 'inputMobileClickBurst'),
        ...perTab('landscape', 'inputLandscapeClickBurst'),
    ];
})();
function renderClickBurstTextInputControls() {
    CLICK_BURST_TEXT_INPUT_CONTROLS.forEach(ctrl => {
        const content = findGroupContent(ctrl.tab, ctrl.group, 'renderClickBurstTextInputControls', ctrl.id);
        if (!content) return;
        content.appendChild(buildTextInputRow(ctrl));
    });
}

// Setup dev sliders
// Visual/layout controls: desktop slider id -> cssVars key. Each has a
// "sliderMobile"-prefixed twin (see the Mobile Overrides dev-panel
// section) that writes into mobileCssVars instead - both are always
// stored, but only the set matching the current breakpoint is ever
// visibly applied (via applyActiveVars()).
const CSS_VAR_SLIDER_MAP = {
    'sliderButtonDiameter': '--button-diameter-vw',
    'sliderButtonMinDiameter': '--button-min-diameter-px',
    'sliderButtonHeight': '--button-height-offset-px',
    'sliderButtonPressIntensity': '--button-press-intensity-px',
    'sliderButtonX': '--button-x-offset-vw',
    'sliderButtonY': '--button-y-offset-vh',
    'sliderButtonReleaseMs': '--button-release-ms',
    'sliderButtonPressMs': '--button-press-ms',
    'sliderButtonMaxScale': '--button-max-scale',
    'sliderButtonMinScale': '--button-min-scale',
    'sliderBaseLightLevels': '--base-light-levels',
    'sliderBaseLightLevelsContrast': '--base-light-levels-contrast',
    'sliderBaseLightLevelFloor': '--base-light-levels-floor',
    'sliderBaseLightLevelCeiling': '--base-light-levels-ceiling',
    'sliderBaseSaturation': '--base-saturation',
    'sliderButtonLightLevels': '--button-light-levels',
    'sliderButtonLightLevelsContrast': '--button-light-levels-contrast',
    'sliderButtonLightLevelFloor': '--button-light-levels-floor',
    'sliderButtonLightLevelCeiling': '--button-light-levels-ceiling',
    'sliderButtonSaturation': '--button-saturation',
    'sliderButtonLoseContrast': '--button-lose-contrast',
    'sliderButtonLoseLightness': '--button-lose-lightness',
    'sliderClickBurstSpeed': '--click-burst-speed-ms',
    'sliderClickBurstScale': '--click-burst-scale',
    'sliderClickBurstDistance': '--click-burst-distance-px',
    'sliderClickBurstHeight': '--click-burst-height-px',
    'sliderClickBurstCurveOffset': '--click-burst-curve-offset-px',
    'sliderClickBurstCountMin': '--click-burst-count-min',
    'sliderClickBurstCountMax': '--click-burst-count-max',
    'sliderClickBurstCurveAmount': '--click-burst-curve-amount',
    'sliderClickBurstShadowFinalScale': '--click-burst-shadow-final-scale',
    'sliderShadowX': '--shadow-x-offset',
    'sliderShadowY': '--shadow-y-offset',
    'sliderShadowBlur': '--shadow-blur',
    'sliderShadowScale': '--shadow-scale',
    'sliderShadowSkew': '--shadow-skew',
    'sliderShadowElongationIntensity': '--shadow-elongation-intensity',
    'sliderShadowElongationAngle': '--shadow-elongation-angle',
    'sliderShadowRotate': '--shadow-rotate',
    // --text-font-size-vw/-x/-y-offset now drive the Start/Try
    // Again BUTTON (formerly Round Text's big-state position/size,
    // repurposed since Round Text no longer has a big state - see
    // the dev-panel section comment above .start-button's CSS).
    'sliderTextFontSize': '--text-font-size-px',
    'sliderTextFontSizeVw': '--text-font-size-vw',
    'sliderTextX': '--text-x-offset-vw',
    'sliderTextY': '--text-y-offset-vh',
    'sliderTextLetterSpacing': '--text-letter-spacing-px',
    'sliderTextLineHeight': '--text-line-height',
    'sliderTryAgainTextFontSize': '--try-again-text-font-size-px',
    'sliderTryAgainTextFontSizeVw': '--try-again-text-font-size-vw',
    'sliderTryAgainTextX': '--try-again-text-x-offset-vw',
    'sliderTryAgainTextY': '--try-again-text-y-offset-vh',
    'sliderTryAgainTextLetterSpacing': '--try-again-text-letter-spacing-px',
    'sliderTryAgainTextLineHeight': '--try-again-text-line-height',
    'sliderTryAgainQuestionMarkFontSize': '--try-again-question-mark-font-size-px',
    'sliderTryAgainQuestionMarkFontSizeVw': '--try-again-question-mark-font-size-vw',
    'sliderTryAgainQuestionMarkX': '--try-again-question-mark-x-offset-vw',
    'sliderTryAgainQuestionMarkY': '--try-again-question-mark-y-offset-vh',
    'sliderRoundDockX': '--round-dock-x-offset-vw',
    'sliderRoundDockY': '--round-dock-y-offset-vh',
    'sliderRoundNumberXOffset': '--round-number-x-offset-px',
    'sliderRoundFontSize': '--round-font-size-px',
    'sliderRoundFontSizeVw': '--round-font-size-vw',
    'sliderRoundLetterSpacing': '--round-letter-spacing-px',
    'sliderRoundLineHeight': '--round-line-height',
    'sliderHighScoreX': '--high-score-x-offset-vw',
    'sliderHighScoreY': '--high-score-y-offset-vh',
    'sliderHighScoreFontSize': '--high-score-font-size-px',
    'sliderHighScoreFontSizeVw': '--high-score-font-size-vw',
    'sliderHighScoreLetterSpacing': '--high-score-letter-spacing-px',
    'sliderHighScoreRotate': '--high-score-rotate-deg',
    'sliderHighScoreLineHeight': '--high-score-line-height',
    'sliderTryAgainFlashDuration': '--try-again-flash-duration-ms',
    'sliderTryAgainHoldDuration': '--try-again-hold-duration-ms',
    'sliderRoundBlink1Hide': '--round-blink1-hide-ms',
    'sliderRoundBlink1Show': '--round-blink1-show-ms',
    'sliderRoundBlink2Hide': '--round-blink2-hide-ms',
    'sliderRoundBlink2Show': '--round-blink2-show-ms',
    'sliderRoundBlink3Hide': '--round-blink3-hide-ms',
    'sliderRoundBlink3Show': '--round-blink3-show-ms',
    'sliderRoundPostBlinkHold': '--round-post-blink-hold-ms',
    'sliderRoundBlink4Hide': '--round-blink4-hide-ms',
    'sliderHighScoreFlashDelay': '--high-score-flash-delay-ms',
    'sliderTargetPrefixLineHeight': '--target-prefix-line-height',
    'sliderTargetNumberLineHeight': '--target-number-line-height',
    'sliderTargetSuffixLineHeight': '--target-suffix-line-height',
    'sliderTargetPrefixFontSize': '--target-prefix-font-size-px',
    'sliderTargetPrefixFontSizeVw': '--target-prefix-font-size-vw',
    'sliderTargetPrefixXOffset': '--target-prefix-x-offset-vw',
    'sliderTargetPrefixYOffset': '--target-prefix-y-offset-vh',
    'sliderTargetPrefixYAnchorOffset': '--target-prefix-y-anchor-offset-vh',
    'sliderTargetPrefixLetterSpacing': '--target-prefix-letter-spacing-px',
    'sliderTargetNumberFontSize': '--target-number-font-size-px',
    'sliderTargetNumberFontSizeVw': '--target-number-font-size-vw',
    'sliderTargetNumberXOffset': '--target-number-x-offset-vw',
    'sliderTargetNumberYOffset': '--target-number-y-offset-vh',
    'sliderTargetNumberLetterSpacing': '--target-number-letter-spacing-px',
    'sliderTargetSuffixFontSize': '--target-suffix-font-size-px',
    'sliderTargetSuffixFontSizeVw': '--target-suffix-font-size-vw',
    'sliderTargetSuffixXOffset': '--target-suffix-x-offset-vw',
    'sliderTargetSuffixYOffset': '--target-suffix-y-offset-vh',
    'sliderTargetSuffixXAnchorOffset': '--target-suffix-x-anchor-offset-vw',
    'sliderTargetSuffixYAnchorOffset': '--target-suffix-y-anchor-offset-vh',
    'sliderTargetSuffixLetterSpacing': '--target-suffix-letter-spacing-px',
    'sliderSpeedFontSize': '--speed-font-size-px',
    'sliderSpeedFontSizeVw': '--speed-font-size-vw',
    'sliderSpeedX': '--speed-x-offset-vw',
    'sliderSpeedY': '--speed-y-offset-vh',
    'sliderSpeedNumberXOffset': '--speed-number-x-offset-px',
    'sliderSpeedLetterSpacing': '--speed-letter-spacing-px',
    'sliderSpeedLineHeight': '--speed-line-height',
    'sliderMsPerClickFontSize': '--ms-per-click-font-size-px',
    'sliderMsPerClickFontSizeVw': '--ms-per-click-font-size-vw',
    'sliderMsPerClickX': '--ms-per-click-x-offset-vw',
    'sliderMsPerClickY': '--ms-per-click-y-offset-vh',
    'sliderMsPerClickNumberXOffset': '--ms-per-click-number-x-offset-px',
    'sliderMsPerClickLetterSpacing': '--ms-per-click-letter-spacing-px',
    'sliderMsPerClickLineHeight': '--ms-per-click-line-height',
    'sliderMsPerClickLine2Gap': '--ms-per-click-line2-gap-px',
    'sliderResultWinFontSize': '--result-win-font-size-px',
    'sliderResultWinFontSizeVw': '--result-win-font-size-vw',
    'sliderResultWinX': '--result-win-x-offset-vw',
    'sliderResultWinY': '--result-win-y-offset-vh',
    'sliderResultWinLetterSpacing': '--result-win-letter-spacing-px',
    'sliderResultLoseFontSize': '--result-lose-font-size-px',
    'sliderResultLoseFontSizeVw': '--result-lose-font-size-vw',
    'sliderResultLoseX': '--result-lose-x-offset-vw',
    'sliderResultLoseY': '--result-lose-y-offset-vh',
    'sliderResultLoseLetterSpacing': '--result-lose-letter-spacing-px',
    'sliderResultLineHeight': '--result-line-height',
    'sliderRoundBreakdownX': '--round-breakdown-left-vw',
    'sliderRoundBreakdownY': '--round-breakdown-top-vh',
    'sliderRoundBreakdownWidth': '--round-breakdown-width-vw',
    'sliderRoundBreakdownHeight': '--round-breakdown-height-vh',
    'sliderRoundBreakdownOutlineThickness': '--round-breakdown-outline-thickness-px',
    'sliderRoundBreakdownTitleFontSize': '--round-breakdown-title-font-size-px',
    'sliderRoundBreakdownTitleLetterSpacing': '--round-breakdown-title-letter-spacing-px',
    'sliderRoundBreakdownTitleLineHeight': '--round-breakdown-title-line-height',
    'sliderRoundBreakdownDataFontSize': '--round-breakdown-data-font-size-px',
    'sliderRoundBreakdownDataLetterSpacing': '--round-breakdown-data-letter-spacing-px',
    'sliderRoundBreakdownDataLineHeight': '--round-breakdown-data-line-height',
    'sliderRoundBreakdownAutoscrollSpeed': '--round-breakdown-autoscroll-speed-px-per-sec',
    'sliderRoundBreakdownAutoscrollPauseBefore': '--round-breakdown-autoscroll-pause-before-ms',
    'sliderRoundBreakdownAutoscrollPauseEnd': '--round-breakdown-autoscroll-pause-end-ms',
    'sliderRoundBreakdownPanelOpacity': '--round-breakdown-panel-opacity',
};

// Desktop slider id -> extrusionVars/mobileExtrusionVars/
// landscapeExtrusionVars key - generic handling for every
// extrusion depth/border-thickness slider, device-split via
// resolveDevControlId's device field (same convention as
// CSS_VAR_SLIDER_MAP above).
const EXTRUSION_SLIDER_MAP = {
    'sliderExtrusionFontTrimAdjust': 'fontTrimAdjust',
    'sliderExtrusionDepth': 'depth',
    'sliderTargetPrefixExtrusionDepth': 'targetPrefixDepth',
    'sliderTargetNumberExtrusionDepth': 'targetNumberDepth',
    'sliderTargetSuffixExtrusionDepth': 'targetSuffixDepth',
    'sliderSpeedExtrusionDepth': 'speedDepth',
    'sliderMsPerClickExtrusionDepth': 'msPerClickDepth',
    'sliderOverallBorderThickness': 'overallBorderThickness',
    'sliderTargetPrefixOverallBorderThickness': 'targetPrefixOverallBorderThickness',
    'sliderTargetNumberOverallBorderThickness': 'targetNumberOverallBorderThickness',
    'sliderTargetSuffixOverallBorderThickness': 'targetSuffixOverallBorderThickness',
    'sliderSpeedOverallBorderThickness': 'speedOverallBorderThickness',
    'sliderMsPerClickOverallBorderThickness': 'msPerClickOverallBorderThickness',
    'sliderRoundExtrusionDepth': 'roundDepth',
    'sliderRoundOverallBorderThickness': 'roundOverallBorderThickness',
    'sliderTryAgainExtrusionDepth': 'tryAgainDepth',
    'sliderTryAgainOverallBorderThickness': 'tryAgainOverallBorderThickness',
    'sliderRoundDockExtrusionDepth': 'roundDockDepth',
    'sliderRoundDockOverallBorderThickness': 'roundDockOverallBorderThickness',
    'sliderHighScoreExtrusionDepth': 'highScoreDepth',
    'sliderHighScoreOverallBorderThickness': 'highScoreOverallBorderThickness',
    'sliderTryAgainQuestionMarkExtrusionDepth': 'questionMarkDepth',
    'sliderTryAgainQuestionMarkOverallBorderThickness': 'questionMarkOverallBorderThickness',
    'sliderResultExtrusionDepth': 'resultDepth',
    'sliderResultOverallBorderThickness': 'resultOverallBorderThickness',
    'sliderResultExtrusionAngle': 'resultExtrusionAngle',
};

// Given any slider/color id (desktop OR its "Mobile"/"Landscape"-
// infixed twin), returns { device, desktopId } - e.g.
// 'sliderMobileButtonX' -> { device: 'mobile', desktopId: 'sliderButtonX' },
// 'sliderLandscapeButtonX' -> { device: 'landscape', desktopId: 'sliderButtonX' }.
function resolveDevControlId(id) {
    // "checkbox" added alongside slider/color/select - the Overall
    // Border on/off toggle is the first checkbox-type control to
    // need mobile-split resolution (checkboxMobileOverallBorder).
    const m = id.match(/^(slider|color|select|checkbox)(Mobile|Landscape)(.+)$/);
    if (m) return { device: m[2] === 'Landscape' ? 'landscape' : 'mobile', desktopId: m[1] + m[3] };
    return { device: 'desktop', desktopId: id };
}

// "Scale With Browser" checkboxes - per explicit request ("For each
// different text type, provide a checkbox to select if i want the
// text to scale with the browser"). Position (the X/Y offset
// sliders) already scales with viewport via vw/vh units; font-size
// was the one thing still fixed px. Each text type's checkbox
// toggles between its existing *-font-size-px value (unchanged
// behavior when off) and a separate *-font-size-vw value (see
// CSS_VAR_SLIDER_MAP's own *FontSizeVw entries and each font-size
// CSS rule's own blend-formula comment) - not a live px<->vw
// conversion, so switching modes can visibly jump if the two values
// haven't been tuned to look similar; that's an accepted tradeoff of
// keeping this a plain toggle instead of a resize-aware converter.
function updateScaleWithBrowser(checkboxId, cssVarName) {
    const { device } = resolveDevControlId(checkboxId);
    const checked = document.getElementById(checkboxId).checked;
    (device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars)[cssVarName] = checked ? 1 : 0;
    applyActiveVars();
}

// Px/vw-vh unit toggle for every X/Y Offset slider - per explicit
// request ("next to every text setting for x offset/y offset, add
// a checkbox... choose px or vw/vh as the units"). The offset's own
// stored cssVar (e.g. --target-x-offset-vw) always keeps holding
// whatever raw number the slider shows - only the UNIT that number
// gets multiplied by in the CSS formula changes (see
// applyTextAlignAnchors()'s Result-specific block and
// applyActiveVars()'s Button-specific lines for where that unit
// token is actually derived from this flag). Toggling the checkbox
// converts the slider's OWN current number to its equivalent under
// the new unit (using the current viewport as the vw/vh<->px
// reference) so the element doesn't visually jump - same on-screen
// position, different units to keep tuning in from there.
function setupOffsetUnitCheckboxes() {
    document.querySelectorAll('.dev-offset-unit-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const flagVar = checkbox.dataset.flagVar;
            const { device } = resolveDevControlId(checkbox.dataset.slider);
            const activeCssVars = device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars;
            const isX = flagVar.endsWith('-x-offset-unit-is-px');
            const refPx = isX ? window.innerWidth : window.innerHeight;
            const checkedNow = checkbox.checked;
            // vw/vh -> px when checking, px -> vw/vh when unchecking.
            const factor = checkedNow ? (refPx / 100) : (100 / refPx);
            activeCssVars[flagVar] = checkedNow ? 1 : 0;
            // A flagVar can be shared by more than one slider on the
            // SAME device (Target Count's Prefix/Number/Suffix all
            // share one --target-x-unit/--target-y-unit anchor - see
            // COMPOUND_OFFSET_CONTROLS' own comment) - previously
            // this only ever converted/re-checked the ONE checkbox
            // that was actually clicked, which for a shared flagVar
            // would silently leave the other 2 parts' numbers under
            // the OLD unit while the CSS formula now reads the NEW
            // one (a real visual jump) and their own checkboxes
            // unchecked despite the shared flag now being true.
            // Converting every checkbox/slider pair bound to this
            // exact flagVar+device together closes that gap - for
            // every OTHER element here (still exactly one slider per
            // flagVar), this loop body runs once, identical to the
            // old single-slider behavior.
            document.querySelectorAll('.dev-offset-unit-checkbox').forEach(cb => {
                if (cb.dataset.flagVar !== flagVar) return;
                if (resolveDevControlId(cb.dataset.slider).device !== device) return;
                const slider = document.getElementById(cb.dataset.slider);
                if (!slider) return;
                const oldValue = parseFloat(slider.value);
                const oldMin = parseFloat(slider.min);
                const oldMax = parseFloat(slider.max);
                const newValue = oldValue * factor;
                slider.min = Math.min(oldMin * factor, oldMax * factor);
                slider.max = Math.max(oldMin * factor, oldMax * factor);
                slider.value = newValue;
                cb.checked = checkedNow;
                // Pushes the converted number through the exact same
                // pipeline a real drag would use (also updates the
                // value-display span and re-applies live) - the flag
                // set above is what makes the SAME cssVar now read
                // under the new unit once applyTextAlignAnchors()/
                // applyActiveVars() (called by applySliderValue via
                // applyActiveVars()) recompute the unit token.
                applySliderValue(slider, newValue);
            });
            applyTextAlignAnchors();
        });
    });
}

// Restores the 40 offset-unit checkboxes' own .checked state after
// a settings load - the underlying flag cssVars restore correctly
// via the normal Object.assign (same as every other cssVar), but
// the checkbox's own DOM .checked property needs an explicit sync
// step, same category of gap the Scale With Browser checkboxes'
// own restore fix closed earlier this session. Doesn't need to
// widen the slider's own min/max itself - every offset slider is a
// normal CSS_VAR_SLIDER_MAP entry, so applyLoadedSettings()'s own
// generic slider-sync loop (which runs BEFORE this, per its own
// comment) already auto-expands whichever bound a restored
// out-of-range value crosses before setting el.value, the same
// rule this function would otherwise have had to duplicate.
function restoreOffsetUnitCheckboxes() {
    document.querySelectorAll('.dev-offset-unit-checkbox').forEach(checkbox => {
        const sliderId = checkbox.dataset.slider;
        const flagVar = checkbox.dataset.flagVar;
        const slider = document.getElementById(sliderId);
        if (!slider) return;
        const { device } = resolveDevControlId(sliderId);
        const activeCssVars = device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars;
        checkbox.checked = !!activeCssVars[flagVar];
    });
    applyTextAlignAnchors();
    applyActiveVars();
}

// Gameplay-mechanics sliders (Starting Max Time, Speed Decrease, etc.)
// are NOT a true per-device override the way visual settings are -
// there's only one game in progress, not a separate one per device. The
// mobile copies are a convenience duplicate that drive the exact same
// live gameState/TAP_DEBOUNCE_MS, useful for tuning difficulty while
// looking at the mobile section of the panel.
function applyGameMechanicsSlider(desktopId, value) {
    if (desktopId === 'sliderStartingSpeed') gameState.maxTimeMs = value;
    else if (desktopId === 'sliderSpeedDecrease') gameState.speedDecrease = value;
    else if (desktopId === 'sliderSpeedDecreaseDecay') gameState.speedDecreaseDecay = value / 100;
    else if (desktopId === 'sliderSpeedDecreaseDecayTolerance') gameState.speedDecreaseDecayTolerance = value;
    else if (desktopId === 'sliderSpeedTimeRounding') gameState.speedTimeRounding = value;
    else if (desktopId === 'sliderCountdownRounding') gameState.countdownRoundingIncrement = value;
    else if (desktopId === 'sliderTapDebounce') TAP_DEBOUNCE_MS = value;
    else if (desktopId === 'sliderResultDuration') gameState.resultDuration = value;
    else if (desktopId === 'sliderTargetFloorBase') gameState.targetFloorBase = value;
    else if (desktopId === 'sliderTargetFloorIncrease') gameState.targetFloorIncreasePerRound = value;
    else if (desktopId === 'sliderTargetCeilingBase') gameState.targetCeilingBase = value;
    else if (desktopId === 'sliderTargetCeilingIncrease') gameState.targetCeilingIncreasePerRound = value;
}

// Applies a value to whatever a slider controls (a cssVar or a
// game-mechanics special case) and refreshes its displayed number -
// factored out of the slider 'input' listener so the click-to-edit
// feature (see makeDevValuesEditable()) can reuse the exact same
// logic for a TYPED value, which can legitimately be outside the
// slider's own min/max (typing lets you go further than the slider
// can visually represent - see there for why that can't just reuse
// slider.dispatchEvent('input') directly). No duplicated apply logic
// either way.
// `deferApply` (2026-09-17) - per direct performance report ("Undo
// does not rever settings back... I cant interact wit hte dev
// panel for maybe 3 seconds"). Root-caused: syncSlidersFromState()
// (called by applyLoadedSettings() - i.e. every Undo/Reset/Load)
// calls this function once per slider, up to ~450 times
// (CSS_VAR_SLIDER_MAP + EXTRUSION_SLIDER_MAP entries x 3 device
// variants) - and applyActiveVars()/applyExtrusionStyles() each
// cost ~3.5ms on their own (confirmed via direct performance.now()
// measurement), so calling either ONCE PER SLIDER instead of once
// total after the whole batch is a genuine O(sliders x cssVars)
// blowup - measured at ~1.2s for this one function alone, out of
// a ~2.7s total Undo/Load. `deferApply=true` (syncSlidersFromState()'s
// own new call site, below) skips the expensive apply call here
// and lets the caller apply once, after its whole loop - the
// live 'input' listener (setupDevSliders()) and the click-to-type
// commit path both still call this with deferApply left false
// (undefined), unchanged, since a single live edit genuinely does
// need its own immediate visual feedback.
function applySliderValue(slider, value, deferApply) {
    const { device, desktopId } = resolveDevControlId(slider.id);
    const varName = CSS_VAR_SLIDER_MAP[desktopId];

    const extrusionKey = EXTRUSION_SLIDER_MAP[desktopId];

    if (varName) {
        (device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars)[varName] = value;
        // Click Burst per-frame-set memory - capture this edit into
        // the CURRENTLY selected frame set's own storage, so
        // switching frame sets and back preserves it even before
        // Save (see restoreClickBurstFrameVars()).
        if (CLICK_BURST_SCOPED_KEYS.includes(varName)) {
            const frameSet = cssVars['--click-frame-set'] || 'CLICK1';
            (device === 'landscape' ? landscapeClickBurstFrameVars : device === 'mobile' ? mobileClickBurstFrameVars : clickBurstFrameVars)[frameSet][varName] = value;
        }
        if (!deferApply) {
            applyActiveVars();
            // Button Lose Contrast/Lightness only have a visible
            // effect while resultText carries .result-lose (see
            // applyGameplayResultColor()'s own comment) -
            // applyActiveVars() above just reapplied the NORMAL
            // button light levels unconditionally (it doesn't know
            // about gameplay state), so re-apply the lose override
            // on top immediately if that's what's currently
            // showing - same live-preview-while-tuning reasoning
            // as the Gameplay Win/Lose Border color fix.
            if ((varName === '--button-lose-contrast' || varName === '--button-lose-lightness') && resultText.classList.contains('result-lose')) {
                applyGameplayResultColor('lose');
            }
        }
    } else if (extrusionKey) {
        (device === 'landscape' ? landscapeExtrusionVars : device === 'mobile' ? mobileExtrusionVars : extrusionVars)[extrusionKey] = value;
        if (!deferApply) applyExtrusionStyles();
    } else {
        applyGameMechanicsSlider(desktopId, value);
    }

    const valueId = slider.id.replace('slider', 'value');
    const valueEl = document.getElementById(valueId);
    if (valueEl && !valueEl.querySelector('input')) {
        valueEl.textContent = value.toFixed(value < 10 ? 2 : 1);
    }
}

// Text alignment dropdowns (left/center/right, and top/center/
// bottom) for All Text - per explicit request. Each select's own
// data-var names the exact cssVar it drives (e.g. --start-text-
// align / --start-text-valign), so this one generic handler covers
// both dropdowns x 6 texts x 2 tabs without a per-text map, same
// resolveDevControlId split as every slider/color above.
function setupTextAlignSelects() {
    document.querySelectorAll('.dev-align-select, .dev-valign-select').forEach(select => {
        select.addEventListener('change', () => {
            const { device } = resolveDevControlId(select.id);
            (device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars)[select.dataset.var] = select.value;
            applyActiveVars();
        });
    });
}

// Edge Lock checkboxes - one beside each align/valign dropdown
// above, per explicit request. When checked, that axis's offset
// stops scaling with the viewport and holds a constant px distance
// from whichever anchor (edge OR center) the align/valign dropdown
// currently selects - see applyTextAlignAnchors()'s own comment for
// the full mechanism. Same generic data-var + resolveDevControlId
// pattern as setupTextAlignSelects() above.
function setupTextEdgeLockCheckboxes() {
    document.querySelectorAll('.dev-edge-lock-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const { device } = resolveDevControlId(checkbox.id);
            const activeVars = device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars;
            // Read the element's CURRENT rendered position and
            // convert its offset number BEFORE the lock flag below
            // changes - see preserveVisualPositionOnLockToggle()'s
            // own comment for why (prevents the visual jump this
            // was built to fix).
            preserveVisualPositionOnLockToggle(checkbox.dataset.var, checkbox.checked, activeVars);
            activeVars[checkbox.dataset.var] = checkbox.checked ? 1 : 0;
            applyActiveVars();
        });
    });
}

// Alignment also sets the position ANCHOR point - see the
// .align-left/.align-right CSS (horizontal) and the --anchor-ty
// custom property (vertical, set per-element below since multiple
// elements share the same var name but need independent values).
// Called from applyActiveVars() so it re-evaluates on every cssVar
// change, breakpoint cross, and settings load, not just when a
// select itself changes.
const TEXT_ALIGN_TARGET_ELEMENT_IDS = {
    '--start-text-align': 'startButton',
    // Shares startButton with --start-text-align above (Start and
    // Try Again are one DOM element, two states) - see
    // applyTextAlignAnchors()'s own startButton-specific correction
    // for how the shared align-CLASS resolves to whichever of the 2
    // actually matches the state currently on screen.
    '--try-again-text-align': 'startButton',
    '--try-again-question-mark-text-align': 'startButtonFlashChar',
    '--round-text-align': 'gameText',
    '--high-score-text-align': 'highScoreText',
    '--target-text-align': 'targetCount',
    '--speed-text-align': 'speedDisplay',
    '--ms-per-click-text-align': 'msPerClickDisplay',
    '--result-text-align': 'resultText',
    // Main Button - per direct request ("provide a vertical and
    // horizontal align UI as well as Edge Lock checkboxes").
    // Named "-text-align" (not "-align") purely so it reuses the
    // SAME generic xPrefix derivation (varName.replace('-text-
    // align', '')) every other entry here relies on - the button
    // isn't text, but keeping the naming convention identical
    // avoids a special case in applyTextAlignAnchors() itself,
    // same tradeoff --try-again-question-mark-text-align already
    // made for a non-plain-text glyph.
    '--button-text-align': 'buttonAssembly',
};
// Top/Center/Bottom - per explicit request ("provide another one
// for top, center, and bottom so together I can get 'top-left'").
// Combines with horizontal align independently: horizontal is still
// class-based (.align-left/.align-right, unchanged - the resize-
// handle code reads those classes directly, see
// getTextEditAnchorSide()), vertical is a per-element --anchor-ty
// custom property so both axes compose freely without a 3x3
// combinatorial CSS rule matrix.
const TEXT_VALIGN_TARGET_ELEMENT_IDS = {
    '--start-text-valign': 'startButton',
    '--try-again-text-valign': 'startButton',
    '--try-again-question-mark-text-valign': 'startButtonFlashChar',
    '--round-text-valign': 'gameText',
    '--high-score-text-valign': 'highScoreText',
    '--target-text-valign': 'targetCount',
    '--speed-text-valign': 'speedDisplay',
    '--ms-per-click-text-valign': 'msPerClickDisplay',
    '--result-text-valign': 'resultText',
    '--button-text-valign': 'buttonAssembly',
};
const VALIGN_TY = { top: '0%', center: '-50%', bottom: '-100%' };
// NOTE: this project spent a long investigation (see CHANGELOG.txt,
// 2026-09-06) chasing a "Target/Ms-per-click drift on resize"
// report by adding a line-height-leading compensation formula to
// --anchor-ty (first a JS-measured correction, then several pure-
// CSS calc() variants accounting for line count and font-metric
// ratio). ALL of that was a misdiagnosis. Direct proof: with equal
// Y-offset numbers (20/20) and full compensation live, the elements'
// own getBoundingClientRect().top values were 33px apart (68.76 vs
// 35.34) - forcing --anchor-ty back to the plain, uncompensated
// VALIGN_TY value made both land at EXACTLY 20.00px. The
// compensation was solving a problem in a measurement
// (Range.getBoundingClientRect() on the text node) that never
// corresponded to the actual rendered element box in the first
// place - confirmed by the user via Text Edit Mode's own bounding
// box (plain el.getBoundingClientRect(), see
// updateTextEditBoundingBoxes() above), which they confirmed looks
// visually correct around the real text, and which the debug-line
// dev tool (see updateTopDebugLines()) was switched to match for
// the same reason. computeAnchorTy() is deliberately back to
// exactly what it was before that entire investigation began -
// valign alone determines --anchor-ty, nothing else.
function computeAnchorTy(valign) {
    return VALIGN_TY[valign] || VALIGN_TY.center;
}
// Edge Lock checkboxes - per explicit request/clarification: when
// checked, that AXIS's offset becomes a constant PX distance from
// whichever anchor point the align/valign dropdown currently
// selects (an edge OR the centerline - the checkbox doesn't care
// which), instead of scaling proportionally with the viewport.
// Stored as a plain boolean per align/valign var (e.g.
// --start-text-align-edge-lock), resolved here into 3 CSS custom
// properties per axis that each element's own left/top: calc(...)
// combines - see each element's own CSS comment for why BOTH the
// unit AND the base/sign have to change, not just the unit: 50%-
// of-viewport is itself a moving target as the viewport resizes, so
// an edge-aligned element locked via a unit swap alone still
// drifted (confirmed by direct measurement - a 380px viewport-width
// change moved a right-locked element by 190px, exactly half, i.e.
// the un-fixed 50% term). *-x-base/*-y-base: which point the offset
// is measured FROM (0%/50%/100%, matching left/center/right or
// top/center/bottom). *-x-sign/*-y-sign: whether increasing the
// offset moves the element away from that point (+1) or back
// toward center (-1, needed for right/bottom since their base is
// already the FAR edge). *-x-unit/*-y-unit: 1px (locked) vs the
// original 1vw/1vh (unlocked, proportional - unchanged default).
const EDGE_LOCK_BASE = { left: '0%', top: '0%', center: '50%', right: '100%', bottom: '100%' };
const EDGE_LOCK_SIGN = { left: 1, top: 1, center: 1, right: -1, bottom: -1 };
// Maps each align-loop xPrefix (derived from the align varName, e.g.
// '--round' from '--round-text-align') to that element's own OFFSET
// cssVar's prefix, wherever the 2 names diverge (e.g. Round's align
// var says '--round' but its offset var is '--round-dock-x-offset-
// vw', and Start's offset var is confusingly named '--text-x-offset-
// vw', not '--start-...'). Used only to look up each offset's own
// *-offset-unit-is-px flag (the new per-slider px/vw toggle) below -
// does not affect anything the existing Edge Lock code already read.
const OFFSET_UNIT_FLAG_PREFIX = {
    '--start': 'text',
    '--try-again': 'try-again-text',
    '--try-again-question-mark': 'try-again-question-mark',
    '--round': 'round-dock',
    '--high-score': 'high-score',
    '--target': 'target',
    '--speed': 'speed',
    '--ms-per-click': 'ms-per-click',
    '--button': 'button',
};
// Preserves an element's CURRENT visual position across an Edge
// Lock checkbox toggle, in EITHER direction - per direct request/
// report ("regardless of how i scale the browser size, the Button
// and the start text should always be equally center aligned and
// never misalign... Currently when i make the browser height
// different, the Start Text and the button seem to misalign").
// Root cause: toggling Edge Lock only ever swapped the offset's
// UNIT (vw/vh <-> px) while leaving its stored NUMBER untouched -
// harmless for an element already tuned near 0 in proportional
// mode (e.g. the button's own X offset, -1), but any element whose
// offset represents a large proportional distance (Start Text's
// own -44.34, "44% of viewport width left of center") jumped to a
// wildly different absolute distance the instant that same number
// got reinterpreted as pixels - a large, CONSTANT misalignment
// between differently-tuned elements once both are locked, not a
// live drift as the viewport resizes (confirmed via direct
// measurement before fixing: X position is provably stable across
// a height change once both are locked - the mismatch was already
// there, unchanged, at every height tested).
// Solves the left/top calc() formula backwards: given the
// element's own rendered left/top (read BEFORE this toggle's
// effects apply, still reflecting the OLD lock state) and the NEW
// base/sign/unit this toggle is about to activate, computes
// exactly which offset number reproduces that same visual
// position under the new unit - called from
// setupTextEdgeLockCheckboxes() before it writes the new lock
// flag and re-applies.
// Deliberately excludes Target (--target-*) and Result/Win-Lose
// (--result-*) - both have their own bespoke multi-element/multi-
// offset position systems (Target's Prefix/Number/Suffix anchor
// off each OTHER's own rendered edges, not just this shared base/
// sign formula - see updateTargetAnchoredPositions(); Result
// splits Win/Lose into 2 independent offset vars driven by one
// align var) that this generic single-offset-var conversion isn't
// safe to apply to blindly.
function preserveVisualPositionOnLockToggle(edgeLockVarName, willLock, activeVars) {
    const axis = edgeLockVarName.includes('-valign-') ? 'y' : 'x';
    const alignVarName = edgeLockVarName.replace('-edge-lock', '');
    const xPrefix = alignVarName.replace(/-text-(valign|align)$/, '');
    if (xPrefix === '--target' || xPrefix === '--result') return;
    const elId = (axis === 'x' ? TEXT_ALIGN_TARGET_ELEMENT_IDS : TEXT_VALIGN_TARGET_ELEMENT_IDS)[alignVarName];
    const el = elId && document.getElementById(elId);
    if (!el || !el.offsetParent) return;
    const offsetPrefix = OFFSET_UNIT_FLAG_PREFIX[xPrefix];
    if (!offsetPrefix) return;
    const offsetVarName = axis === 'x' ? ('--' + offsetPrefix + '-x-offset-vw') : ('--' + offsetPrefix + '-y-offset-vh');
    if (!(offsetVarName in activeVars)) return;
    const cs = getComputedStyle(el);
    const currentPx = parseFloat(axis === 'x' ? cs.left : cs.top);
    if (isNaN(currentPx)) return;
    const containerRect = el.offsetParent.getBoundingClientRect();
    const containerSize = axis === 'x' ? containerRect.width : containerRect.height;
    const align = activeVars[alignVarName] || 'center';
    const newBasePercent = willLock ? parseFloat(EDGE_LOCK_BASE[align] || '50%') : 50;
    const newBasePx = containerSize * newBasePercent / 100;
    const newSign = willLock ? (EDGE_LOCK_SIGN[align] || 1) : 1;
    const viewportSize = axis === 'x' ? window.innerWidth : window.innerHeight;
    const newUnitPx = willLock ? 1 : (viewportSize / 100);
    if (!newSign || !newUnitPx) return;
    activeVars[offsetVarName] = +(((currentPx - newBasePx) / newSign) / newUnitPx).toFixed(3);
}
function applyTextAlignAnchors() {
    const activeCssVars = isMobileActive() ? getActiveMobileVars() : cssVars;
    Object.entries(TEXT_ALIGN_TARGET_ELEMENT_IDS).forEach(([varName, elId]) => {
        const el = document.getElementById(elId);
        // Defensive null-guard, kept even though every current
        // target (including startButtonFlashChar, now a permanent
        // element - see its own HTML/CSS comment) always exists in
        // the DOM by the time this runs.
        if (!el) return;
        const align = activeCssVars[varName] || 'center';
        el.classList.remove('align-left', 'align-center', 'align-right');
        el.classList.add('align-' + align);
        const xPrefix = varName.replace('-text-align', '');
        // Result (Win/Lose)'s OWN unit is handled separately below,
        // not by the generic xUnit line further down - its unit
        // needs to split per-state while base/sign (set further
        // down, unconditionally, still correct for Result too)
        // stay shared, which this generic per-xPrefix loop can't
        // express for a single output property.
        const edgeLocked = !!activeCssVars[varName + '-edge-lock'];
        const offsetFlagPrefix = OFFSET_UNIT_FLAG_PREFIX[xPrefix];
        const pxToggled = offsetFlagPrefix ? !!activeCssVars['--' + offsetFlagPrefix + '-x-offset-unit-is-px'] : false;
        const xLocked = edgeLocked || pxToggled;
        if (xPrefix !== '--result') {
            el.style.setProperty(xPrefix + '-x-unit', xLocked ? '1px' : 'var(--cq-vw, 1vw)');
        }
        el.style.setProperty(xPrefix + '-x-base', edgeLocked ? EDGE_LOCK_BASE[align] : '50%');
        el.style.setProperty(xPrefix + '-x-sign', edgeLocked ? EDGE_LOCK_SIGN[align] : 1);
        // Target's own align-left/-right CSS override (see the
        // shared .target-count.align-left/-right rule) only ever
        // applied to #targetCount itself - now that Prefix/Number/
        // Suffix are each independently positioned (own left/top,
        // not inherited from the wrapper's box), each needs that
        // SAME class directly for its own horizontal anchor
        // transform to correctly follow Text Align, not just
        // --target-x-base/-sign (which DO already inherit as
        // custom properties, but the class-driven transform
        // override doesn't cascade the same way). classList isn't
        // an inherited CSS mechanism, so this has to be applied to
        // each of them explicitly, same alignment source as above.
        if (varName === '--target-text-align') {
            ['targetCountPrefix', 'targetCountNumber', 'targetCountSuffix'].forEach(partId => {
                const partEl = document.getElementById(partId);
                if (!partEl) return;
                partEl.classList.remove('align-left', 'align-center', 'align-right');
                partEl.classList.add('align-' + align);
            });
        }
    });
    // Result's OWN unit split (Win/Lose independent px/vw, base/sign
    // still shared per the CSS rule's own comment) - can't go
    // through the generic per-xPrefix loop above since it needs 2
    // DIFFERENT outputs (--result-win-x-unit/--result-lose-x-unit)
    // from ONE align var (--result-text-align)'s edge-lock state,
    // each OR'd with its own state's px checkbox.
    {
        const resultEdgeLocked = !!activeCssVars['--result-text-align-edge-lock'];
        const winPxToggled = !!activeCssVars['--result-win-x-offset-unit-is-px'];
        const losePxToggled = !!activeCssVars['--result-lose-x-offset-unit-is-px'];
        const resultEl = document.getElementById('resultText');
        if (resultEl) {
            resultEl.style.setProperty('--result-win-x-unit', (resultEdgeLocked || winPxToggled) ? '1px' : 'var(--cq-vw, 1vw)');
            resultEl.style.setProperty('--result-lose-x-unit', (resultEdgeLocked || losePxToggled) ? '1px' : 'var(--cq-vw, 1vw)');
        }
    }
    // startButton is shared by Start and Try Again (one DOM element,
    // two states, see --try-again-text-align's own comment) - the
    // loop above just set the align-CLASS from BOTH --start-text-align
    // and --try-again-text-align in map order, so whichever ran LAST
    // won regardless of which state is actually showing. Re-resolve
    // it here from whichever one actually matches, so the class
    // reflects the visible text, not iteration order. The per-prefix
    // offset vars set above are unaffected either way - each has its
    // own distinct custom property name and only the currently-
    // displayed state's own CSS rule ever reads its own.
    const startButtonEl = document.getElementById('startButton');
    const startAlignVarName = startButtonEl.classList.contains('try-again-state') ? '--try-again-text-align' : '--start-text-align';
    const startAlign = activeCssVars[startAlignVarName] || 'center';
    startButtonEl.classList.remove('align-left', 'align-center', 'align-right');
    startButtonEl.classList.add('align-' + startAlign);
    Object.entries(TEXT_VALIGN_TARGET_ELEMENT_IDS).forEach(([varName, elId]) => {
        const el = document.getElementById(elId);
        if (!el) return;
        const valign = activeCssVars[varName] || 'center';
        const yPrefix = varName.replace('-text-valign', '');
        el.style.setProperty('--anchor-ty', computeAnchorTy(valign));
        // See the X loop's own comment above - Result (Win/Lose)'s
        // unit is handled separately below, not by the generic
        // yUnit line further down.
        const edgeLocked = !!activeCssVars[varName + '-edge-lock'];
        const offsetFlagPrefix = OFFSET_UNIT_FLAG_PREFIX[yPrefix];
        const pxToggled = offsetFlagPrefix ? !!activeCssVars['--' + offsetFlagPrefix + '-y-offset-unit-is-px'] : false;
        const yLocked = edgeLocked || pxToggled;
        if (yPrefix !== '--result') {
            el.style.setProperty(yPrefix + '-y-unit', yLocked ? '1px' : 'var(--cq-vh, 1vh)');
        }
        el.style.setProperty(yPrefix + '-y-base', edgeLocked ? EDGE_LOCK_BASE[valign] : '50%');
        el.style.setProperty(yPrefix + '-y-sign', edgeLocked ? EDGE_LOCK_SIGN[valign] : 1);
    });
    // Result's OWN Y-unit split - same reasoning as the X-axis
    // block above.
    {
        const resultEdgeLockedY = !!activeCssVars['--result-text-valign-edge-lock'];
        const winPxToggledY = !!activeCssVars['--result-win-y-offset-unit-is-px'];
        const losePxToggledY = !!activeCssVars['--result-lose-y-offset-unit-is-px'];
        const resultElY = document.getElementById('resultText');
        if (resultElY) {
            resultElY.style.setProperty('--result-win-y-unit', (resultEdgeLockedY || winPxToggledY) ? '1px' : 'var(--cq-vh, 1vh)');
            resultElY.style.setProperty('--result-lose-y-unit', (resultEdgeLockedY || losePxToggledY) ? '1px' : 'var(--cq-vh, 1vh)');
        }
    }
    // Same startButton-is-shared correction as align above, for
    // --anchor-ty specifically (also just fought over by --start-
    // text-valign and --try-again-text-valign in map-iteration order).
    const startValignVarName = startButtonEl.classList.contains('try-again-state') ? '--try-again-text-valign' : '--start-text-valign';
    const startValign = activeCssVars[startValignVarName] || 'center';
    startButtonEl.style.setProperty('--anchor-ty', computeAnchorTy(startValign));
    // The "?" glyph's Y position now DELIBERATELY tracks wherever
    // Try Again itself vertically sits - per direct follow-up
    // request ("i want the '?' y position to be dependent on the
    // try again"), reversing the earlier position-INDEPENDENCE fix
    // for the Y axis only (X stays fully independent, untouched).
    // startButtonFlashChar is a SIBLING of startButton, not its
    // descendant (see its own HTML/CSS comment on why) - it can't
    // just read --try-again-y-base/-sign/-unit directly, because
    // this whole align/valign system intentionally scopes those 3
    // as INLINE custom properties on each target element itself
    // (set via el.style.setProperty two loops up), not on :root,
    // so several elements can carry independent align/valign
    // settings without colliding - and CSS custom-property
    // inheritance only flows down the DOM tree, never sideways
    // between siblings. (--try-again-text-y-offset-vh itself,
    // unlike base/sign/unit, IS already globally visible - it's
    // one of the plain cssVars applyActiveVars() pushes onto
    // :root, not something this function sets - so only the 3
    // terms below actually need mirroring.) Copies whichever of
    // --try-again-y-base/-sign/-unit was just computed onto
    // startButtonEl above (always Try Again's real current values
    // regardless of which state is actually showing - see this
    // loop's own header comment) onto startButtonFlashChar under
    // its own "parent-y-*" names, which its own top: calc() (see
    // its CSS) composes with its own Y offset as an ADDITIONAL
    // delta on top, not a replacement.
    const questionMarkEl = document.getElementById('startButtonFlashChar');
    if (questionMarkEl) {
        questionMarkEl.style.setProperty('--try-again-question-mark-parent-y-base', startButtonEl.style.getPropertyValue('--try-again-y-base') || '50%');
        questionMarkEl.style.setProperty('--try-again-question-mark-parent-y-sign', startButtonEl.style.getPropertyValue('--try-again-y-sign') || '1');
        questionMarkEl.style.setProperty('--try-again-question-mark-parent-y-unit', startButtonEl.style.getPropertyValue('--try-again-y-unit') || 'var(--cq-vh, 1vh)');
    }
}

// Text Edit Mode - per explicit request ("I can click on any text
// and change the actual text content itself. So I can rename
// things or change wording"). Keyed by named SLOT, not by element,
// because several elements show two different static strings
// depending on game state (Start/Try Again, Win/Lose) and two show
// a static suffix beside a LIVE number (Speed/Ms-per-click) that
// must keep updating - editing overrides only the static wording,
// never freezes a live value. Target Count's Prefix/Suffix wording
// ("CLICK "/" X") are each their own editable slot below.
let textEditModeEnabled = false;
// Desktop and Mobile now have their own independent text overrides
// - per explicit request ("if i edit text for desktop, it wont edit
// automatically for mobile. If I dont edit it, then they stay the
// same"). Same shape, same convention as every other per-device
// dev-panel setting in this project (CLAUDE.md Section 12f): both
// start out all-null (meaning "use TEXT_OVERRIDE_DEFAULTS"), so an
// untouched slot reads identically on both until one is actually
// edited - editing one device's slot only ever writes to that
// device's own object, never the other's.
const textOverrides = {
    startLabel: null, tryAgainLabel: 'Try\nagain', roundLabel: null,
    winSymbol: null, loseSymbol: null, speedSuffix: null, msPerClickSuffix: ' ms\n/ \nCLICK',
    targetPrefix: null, targetSuffix: null, highScoreLabel: null,
};
const mobileTextOverrides = {
    startLabel: null, tryAgainLabel: null, roundLabel: null,
    winSymbol: null, loseSymbol: null, speedSuffix: null, msPerClickSuffix: 'ms\n/  \nCLICK',
    targetPrefix: null, targetSuffix: null, highScoreLabel: null,
};
// Seeded from Desktop's (changed from Mobile - flip
// mobileTextOverrides back here to revert).
const landscapeTextOverrides = structuredClone(textOverrides);
const TEXT_OVERRIDE_DEFAULTS = {
    startLabel: 'START', tryAgainLabel: 'Try again', roundLabel: 'ROUND',
    winSymbol: ':)', loseSymbol: ':(', speedSuffix: ' ms', msPerClickSuffix: 'ms / \nCLICK',
    // Defaults changed from '' per direct request ("The Target
    // Text now says 'Click ___ x'"), then capitalized per explicit
    // follow-up request - targetSuffix reuses the exact same
    // overrideOr() mechanism as targetPrefix for consistency. Both
    // are independently hideable via their own checkboxes
    // regardless of wording, and each is now its own directly
    // right-click-editable TEXT_EDIT_TARGETS entry (targetCount
    // Prefix/Suffix below).
    targetPrefix: 'CLICK ', targetSuffix: ' X',
    highScoreLabel: 'HIGH SCORE',
    // Round Breakdown's 5 stat labels, newline-joined - see
    // TEXT_EDIT_TARGETS.roundBreakdownTable's own comment.
    roundBreakdownLabels: 'Click Count Target:\nClicks:\nAverage Click Speed:\nFastest Click:\nSlowest Click:',
};
// The currently-ACTIVE override object - same isMobileActive()
// viewport check every other per-device value in this file reads
// from (see applyExtrusionStyles()'s own ext = isMobileActive() ?
// ... pattern), not a separate/independent notion of "mobile".
function activeTextOverrides() {
    return isMobileActive() ? getActiveMobileTextOverrides() : textOverrides;
}
function overrideOr(slot) {
    const v = activeTextOverrides()[slot];
    return (v !== null && v !== undefined) ? v : TEXT_OVERRIDE_DEFAULTS[slot];
}

// elementId -> how to determine which slot is currently showing,
// how to pull out any live numeric prefix that must survive the
// edit (Speed/Ms-per-click only), and how to re-render after a
// commit/load. render(slot, prefix) always fully recomputes the
// element's content from scratch - never touches the input DOM
// node directly - so it's safe to reuse for both a live commit and
// a settings-load restore.
const TEXT_EDIT_TARGETS = {
    startButton: {
        // startButtonFlashChar is now a permanent sibling element
        // (see its own HTML/CSS comment), always present - the
        // canonical try-again-state class is what actually tracks
        // which slot is showing, same as resultText's own
        // classList-based check just below.
        getSlot: () => startButton.classList.contains('try-again-state') ? 'tryAgainLabel' : 'startLabel',
        render: (slot) => {
            if (slot === 'tryAgainLabel') {
                startButton.textContent = overrideOr('tryAgainLabel');
                startButton.classList.add('try-again-state');
                document.getElementById('startButtonFlashChar').classList.remove('hidden');
            } else {
                startButton.textContent = overrideOr('startLabel');
                startButton.classList.remove('try-again-state');
                document.getElementById('startButtonFlashChar').classList.add('hidden');
            }
            // startButton's own shared align-class/--anchor-ty needs
            // to track whichever state this render() call just
            // switched to (see applyTextAlignAnchors()'s own
            // comment) - startButtonFlashChar's own anchors get
            // recomputed in the same pass since it's a permanent
            // element now, not something that only exists once Try
            // Again first renders.
            applyTextAlignAnchors();
        },
    },
    gameTextLabel: {
        getSlot: () => 'roundLabel',
        render: () => { gameTextLabel.textContent = overrideOr('roundLabel'); },
    },
    highScoreLabel: {
        getSlot: () => 'highScoreLabel',
        render: () => { highScoreLabel.textContent = overrideOr('highScoreLabel'); },
    },
    resultText: {
        getSlot: () => resultText.classList.contains('result-win') ? 'winSymbol' : 'loseSymbol',
        render: (slot) => { resultText.textContent = overrideOr(slot); },
    },
    speedDisplay: {
        getSlot: () => 'speedSuffix',
        // Reads the live number straight from its own span now
        // (see the HTML/JS-reference comments on speedDisplayNumber)
        // instead of regex-scraping it back out of the combined
        // text - simpler and can't be confused by digits in the
        // suffix, same reasoning as targetCount's own getPrefix().
        getPrefix: () => speedDisplayNumber.textContent || '0',
        render: (slot, prefix) => {
            speedDisplayNumber.textContent = prefix != null ? prefix : '0';
            speedDisplaySuffix.textContent = overrideOr(slot);
        },
    },
    // Target Count's Prefix ("CLICK ") and Suffix (" X") are each
    // their own independent TEXT_EDIT_TARGETS entry, one per real
    // DOM span - per direct report that editing them while they
    // shared one combined entry (keyed to the whole #targetCount
    // div, wrapping all 3 spans) "looked stuck" after commit. Root
    // cause: openTextEditFor() wipes the target element's innerHTML
    // to inject its textarea, then on commit calls render() to
    // rebuild it - but the combined entry's render() wrote into the
    // targetCountPrefix/Number/Suffix span REFERENCES directly,
    // which by then were the ORIGINAL span nodes already detached
    // from the DOM by that innerHTML wipe (only #targetCount's own
    // children got cleared, not reattached), so the edit silently
    // wrote into 3 orphaned nodes while the leftover, never-removed
    // textarea stayed visible in the actual DOM. Splitting into
    // one-el-per-slot entries (matching every other simple target
    // in this map, e.g. gameTextLabel/resultText) avoids the whole
    // class of bug: el IS the span, so innerHTML-wipe-then-
    // textContent-rebuild always targets the same live node.
    targetCountPrefix: {
        getSlot: () => 'targetPrefix',
        render: (slot) => { targetCountPrefix.textContent = overrideOr(slot); },
    },
    // The Number is live gameplay data (gameState.targetCount), not
    // static wording - per explicit direct decision, it gets its
    // own bounding box/position handling in Text Edit Mode (for
    // visual consistency with Prefix/Suffix, and it already has its
    // own font-size/X/Y sliders) but stays non-right-click-editable,
    // matching how every other live number in this file (Round,
    // Speed, Ms-per-click) is never itself a rename target - only
    // the wording around it is. editable:false is read by
    // setupTextEditMode()'s contextmenu handler below to skip
    // opening an editor for this one entry while still giving it a
    // bounding box (updateTextEditBoundingBoxes() doesn't check the
    // flag) and blocking stray gameplay clicks during edit mode
    // (setupTextEditMode()'s pointerdown/up/click guard doesn't
    // check it either - both are correct/desired for a non-editable
    // target too).
    targetCountNumber: {
        editable: false,
        getSlot: () => null,
        render: () => { targetCountNumber.textContent = String(gameState.targetCount); },
    },
    targetCountSuffix: {
        getSlot: () => 'targetSuffix',
        render: (slot) => { targetCountSuffix.textContent = overrideOr(slot); },
    },
    msPerClickDisplay: {
        getSlot: () => 'msPerClickSuffix',
        // See speedDisplay's own getPrefix() comment - same reasoning.
        getPrefix: () => msPerClickDisplayNumber.textContent || gameState.maxTimeMs.toFixed(0),
        render: (slot, prefix) => {
            msPerClickDisplayNumber.textContent = prefix != null ? prefix : gameState.maxTimeMs.toFixed(0);
            renderMsPerClickSuffix(overrideOr(slot));
        },
    },
    // Round Breakdown's 5 stat-line labels ("Click Count Target:",
    // "Clicks:", etc.) - per direct report ("Text Edit mode doesnt
    // work for Round breakdown text") plus a follow-up clarifying
    // question: the panel's own title is intentionally empty (see
    // .round-breakdown-title's CSS comment) and the per-round NUMBERS
    // are live data, not wording, so the 5 label prefixes are what's
    // actually editable here. Unlike every other target above, there
    // is no single stable per-label DOM element to right-click (the
    // labels live inside per-round rows that don't exist until
    // roundHistory has entries, and repeat once per round) - so this
    // one target edits all 5 as ONE newline-joined block on the
    // always-present table container instead of registering 5
    // separate targets. Plain Enter still commits (see the shared
    // keydown handler's own comment) - use Shift+Enter between
    // labels while editing, same as any other multi-line target
    // here (msPerClickSuffix, above). render() just re-runs
    // renderRoundBreakdown(), which reads this same override to
    // rebuild every row's labels - see its own comment.
    roundBreakdownTable: {
        getSlot: () => 'roundBreakdownLabels',
        render: () => { renderRoundBreakdown(); },
    },
};

// The suffix text can hold 2 embedded newlines (e.g. default
// "ms / \nCLICK" on Desktop, "ms\n/  \nCLICK" on Mobile - see
// TEXT_OVERRIDE_DEFAULTS.msPerClickSuffix) rendered via
// white-space:pre-wrap, giving a 3-line layout: line 1 is the
// number + the suffix's first segment, line 2 is the text between
// the two newlines, line 3 is whatever follows the second newline.
// A single CSS line-height applies the SAME gap to every line
// pair - per direct request ("the current slider controls the
// spacing between line 1 and 2, the 2nd will control the spacing
// between line 2 and 3"), the text after the 2nd newline is split
// into its own block-level child span here so a second, additive
// CSS var (--ms-per-click-line2-gap-px, see its own CSS/slider)
// can nudge just that one line-pair's gap without touching the
// shared line-height. Uses raw DOM text nodes (not innerHTML
// string-concat) so no HTML-escaping is needed for arbitrary typed
// text. Text Edit Mode's own textarea round-trip is unaffected -
// it reads/writes the override STRING directly (see
// openTextEditFor()/commit()), never this rendered DOM structure.
function renderMsPerClickSuffix(text) {
    msPerClickDisplaySuffix.textContent = '';
    const firstNl = text.indexOf('\n');
    const secondNl = firstNl === -1 ? -1 : text.indexOf('\n', firstNl + 1);
    if (secondNl === -1) {
        msPerClickDisplaySuffix.appendChild(document.createTextNode(text));
        return;
    }
    msPerClickDisplaySuffix.appendChild(document.createTextNode(text.slice(0, secondNl + 1)));
    const line3 = document.createElement('span');
    line3.className = 'ms-per-click-extra-line';
    line3.textContent = text.slice(secondNl + 1);
    msPerClickDisplaySuffix.appendChild(line3);
}

function refreshAllTextOverrides() {
    Object.keys(TEXT_EDIT_TARGETS).forEach(elId => {
        const cfg = TEXT_EDIT_TARGETS[elId];
        const slot = cfg.getSlot();
        const prefix = cfg.getPrefix ? cfg.getPrefix() : null;
        cfg.render(slot, prefix);
    });
}

// Text Edit Mode's checkbox toggles more than the flag - these
// elements are deliberately pointer-events:none during normal play
// (so they don't block taps meant for the button underneath/near
// them), which ALSO silently blocked Text Edit Mode's own click
// handler - confirmed the bug via a real click, not the .click()
// DOM-method calls used in earlier testing, which bypass CSS
// pointer-events entirely and so falsely looked like they worked.
// Re-enabled only while Text Edit Mode is actually on.
function setTextEditModeEnabled(enabled) {
    textEditModeEnabled = enabled;
    Object.keys(TEXT_EDIT_TARGETS).forEach(elId => {
        document.getElementById(elId).style.pointerEvents = enabled ? 'auto' : '';
    });
    if (enabled) {
        updateTextEditBoundingBoxes();
    } else {
        stopTextEditBoundingBoxes();
    }
}

// Bounding-box overlay for every currently-visible TEXT_EDIT_TARGETS
// element, per explicit request ("I should see the bounding box of
// every text object"). Also makes an otherwise-invisible interaction
// gap obvious: some of these elements can overlap on screen (e.g.
// Win/Lose Text sits at the same position as the Start button
// whenever "Preview Win Text" forces it visible for tuning) - with
// pointer-events re-enabled by Text Edit Mode above, a right-click
// there resolves to whichever overlapping element is topmost in
// z-order, not necessarily the one the user meant. Seeing both boxes
// overlap makes that ambiguity visible instead of silently editing
// the wrong slot. One box element per target, reused/repositioned
// every frame rather than recreated - runs only while Text Edit Mode
// is on (dev-only), so the per-frame cost (6 getBoundingClientRect
// calls) is negligible.
const textEditBoxEls = {};
const textEditHandleEls = {};
let textEditBoxesRafId = null;
function ensureTextEditBox(elId) {
    let box = textEditBoxEls[elId];
    if (!box) {
        box = document.createElement('div');
        box.className = 'text-edit-bbox';
        document.body.appendChild(box);
        textEditBoxEls[elId] = box;

        const left = document.createElement('div');
        left.className = 'text-edit-bbox-handle';
        setupTextEditResizeHandle(left, elId, 'left');
        document.body.appendChild(left);

        const right = document.createElement('div');
        right.className = 'text-edit-bbox-handle';
        setupTextEditResizeHandle(right, elId, 'right');
        document.body.appendChild(right);

        textEditHandleEls[elId] = { left, right };
    }
    return box;
}
// resizeDrag is non-null only while a handle is actively being
// dragged - updateTextEditBoundingBoxes() skips repositioning that
// one element's box/handles from the live DOM rect while dragging
// (the drag handler itself is what's actively changing the width,
// so re-measuring from the DOM every frame would just echo back the
// same value 1 frame late - no functional difference, but skipping
// it avoids fighting the drag with redundant writes).
let textEditResizeDrag = null;
function updateTextEditBoundingBoxes() {
    Object.keys(TEXT_EDIT_TARGETS).forEach(elId => {
        if (textEditResizeDrag && textEditResizeDrag.elId === elId) return;
        const el = document.getElementById(elId);
        const box = ensureTextEditBox(elId);
        const handles = textEditHandleEls[elId];
        if (!el || el.offsetParent === null) {
            box.style.display = 'none';
            handles.left.style.display = 'none';
            handles.right.style.display = 'none';
            return;
        }
        const rect = el.getBoundingClientRect();
        box.style.display = 'block';
        box.style.left = rect.left + 'px';
        box.style.top = rect.top + 'px';
        box.style.width = rect.width + 'px';
        box.style.height = rect.height + 'px';
        positionTextEditHandles(elId, rect);
    });
    if (textEditModeEnabled) {
        textEditBoxesRafId = requestAnimationFrame(updateTextEditBoundingBoxes);
    }
}
function positionTextEditHandles(elId, rect) {
    const handles = textEditHandleEls[elId];
    if (!handles) return;
    handles.left.style.display = 'block';
    handles.left.style.left = (rect.left - 5) + 'px';
    handles.left.style.top = rect.top + 'px';
    handles.left.style.height = rect.height + 'px';
    handles.right.style.display = 'block';
    handles.right.style.left = (rect.right - 5) + 'px';
    handles.right.style.top = rect.top + 'px';
    handles.right.style.height = rect.height + 'px';
}
function stopTextEditBoundingBoxes() {
    if (textEditBoxesRafId !== null) cancelAnimationFrame(textEditBoxesRafId);
    textEditBoxesRafId = null;
    Object.values(textEditBoxEls).forEach(box => { box.style.display = 'none'; });
    Object.values(textEditHandleEls).forEach(h => { h.left.style.display = 'none'; h.right.style.display = 'none'; });
}

// Per-element wrap width - drag a bounding-box edge to set how wide
// that text element may grow before wrapping to a new line, per
// explicit request ("resize text boxes in text edit mode... control
// when the text goes to the next line"). null (default) means no
// override - the element keeps its normal shrink-to-fit auto width,
// identical to today's behavior. white-space:pre-line (added
// earlier for Shift+Enter) already wraps at a constrained width on
// its own, so applying this is just a max-width - no white-space
// change needed.
const textEditWrapWidths = {
    startButton: null, gameTextLabel: null, resultText: null,
    speedDisplay: 540.1875, targetCountPrefix: null, targetCountNumber: null, targetCountSuffix: null, msPerClickDisplay: 188.640625,
};
const TEXT_EDIT_WRAP_MIN_PX = 20;
function applyTextEditWrapWidth(elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    const w = textEditWrapWidths[elId];
    // width, not max-width - these elements are shrink-to-fit
    // (inline-block/auto), so max-width can only ever CAP them
    // smaller than their natural content size, never force them
    // WIDER than it - confirmed via direct report ("it lets me
    // shrink the box, but not expand it"). An explicit width both
    // shrinks (forcing a wrap) and expands (adding empty space
    // past the content) correctly.
    el.style.width = (w !== null && w !== undefined) ? w + 'px' : '';
}
function applyAllTextEditWrapWidths() {
    Object.keys(textEditWrapWidths).forEach(applyTextEditWrapWidth);
}
// anchorSide: which edge of THIS element is fixed by its current
// text-align anchor (see the .align-left/.align-right CSS and
// applyTextAlignAnchors()) - 'left' means the left edge is pinned
// (translate(0%,...)), so only the RIGHT handle can actually move
// that edge; 'right' mirrors it (only LEFT handle moves); center
// (default) grows/shrinks symmetrically around the anchor, so
// either handle works but the dragged edge itself moves at half the
// pointer's speed (the opposite edge mirrors it) - an accepted
// dev-tool tradeoff rather than doubling the delta, since getting
// that fully 1:1 for every anchor mode is a much larger lift for a
// dev-only control.
function getTextEditAnchorSide(el) {
    if (el.classList.contains('align-left')) return 'left';
    if (el.classList.contains('align-right')) return 'right';
    return 'center';
}
function setupTextEditResizeHandle(handleEl, elId, side) {
    handleEl.addEventListener('pointerdown', (e) => {
        if (!textEditModeEnabled) return;
        const el = document.getElementById(elId);
        if (!el) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = el.getBoundingClientRect();
        const anchorSide = getTextEditAnchorSide(el);
        // Dragging the edge that IS the anchor's own fixed side
        // can't move that edge (it's pinned by CSS) - no-op rather
        // than silently doing the wrong thing.
        if ((side === 'left' && anchorSide === 'left') || (side === 'right' && anchorSide === 'right')) return;
        textEditResizeDrag = {
            elId, side, anchorSide,
            startX: e.clientX,
            startWidth: rect.width,
        };
        handleEl.setPointerCapture(e.pointerId);
    });
    handleEl.addEventListener('pointermove', (e) => {
        if (!textEditResizeDrag || textEditResizeDrag.elId !== elId) return;
        const dx = e.clientX - textEditResizeDrag.startX;
        const signed = (textEditResizeDrag.side === 'right') ? dx : -dx;
        const speed = (textEditResizeDrag.anchorSide === 'center') ? 2 : 1;
        const newWidth = Math.max(TEXT_EDIT_WRAP_MIN_PX, textEditResizeDrag.startWidth + signed * speed);
        textEditWrapWidths[elId] = newWidth;
        applyTextEditWrapWidth(elId);
        const el = document.getElementById(elId);
        if (el) positionTextEditHandles(elId, el.getBoundingClientRect());
    });
    ['pointerup', 'pointercancel'].forEach(evt => {
        handleEl.addEventListener(evt, (e) => {
            if (!textEditResizeDrag || textEditResizeDrag.elId !== elId) return;
            textEditResizeDrag = null;
            try { handleEl.releasePointerCapture(e.pointerId); } catch (err) {}
        });
    });
}

// Opens the actual inline-textarea edit UI for one TEXT_EDIT_TARGETS
// element - factored out of the game-canvas contextmenu handler
// below so the dev-panel section-title right-click (see
// setupTextEditPanelTriggers()) can trigger the exact same edit,
// not a separate reimplementation. If the element isn't currently
// visible in-game (e.g. Win/Lose Text before a round ends, or the
// dev panel is simply covering it) there'd otherwise be nothing to
// see/type into once triggered from the panel - temporarily clears
// its `hidden` class for the duration of the edit and restores
// whatever hidden state it actually had on commit/cancel, per
// explicit follow-up request ("also allow me to right click to
// change the text in the dev panel").
function openTextEditFor(elId) {
    const el = document.getElementById(elId);
    const cfg = TEXT_EDIT_TARGETS[elId];
    if (el.querySelector('.text-edit-input')) return; // already editing
    const wasHidden = el.classList.contains('hidden');
    if (wasHidden) el.classList.remove('hidden');
    const slot = cfg.getSlot();
    const prefix = cfg.getPrefix ? cfg.getPrefix() : null;
    // Saved as the actual ORIGINAL CHILD NODE OBJECTS, not an
    // innerHTML string - per direct bug report ("right-click-
    // editing either the Ms/Click Display or the Speed Display...
    // permanently removes its child spans... after committing").
    // Root cause: msPerClickDisplay/speedDisplay are 2-child
    // wrapper targets (elId is the WRAPPER, not the editable span
    // itself - see their own TEXT_EDIT_TARGETS comment) whose
    // render() writes into cached top-level references
    // (speedDisplayNumber/-Suffix etc, also read directly by other
    // code like runRoundBlinkSequence's flash array) - clearing
    // via innerHTML='' detaches those exact node OBJECTS from the
    // DOM, and restoring from an innerHTML STRING (the old
    // approach) would create brand-new elements instead of
    // reattaching the same ones, permanently stranding every
    // cached reference. Reattaching the SAME node objects by
    // identity (replaceChildren with the saved array, not a
    // string) keeps every existing cached reference valid again
    // the moment they're put back, before render() writes into
    // them - this is what actually fixes the bug, not the
    // textarea-swap mechanism itself, which is otherwise
    // unchanged and stays correct for every other (single-
    // element, elId-is-the-span) target too.
    const originalChildren = Array.from(el.childNodes);
    // <textarea>, not <input> - Shift+Enter needs to insert
    // an actual newline, which a single-line <input> can
    // never hold, per explicit request.
    const input = document.createElement('textarea');
    input.className = 'text-edit-input';
    input.rows = 1;
    input.value = overrideOr(slot);
    el.replaceChildren(input);
    input.focus();
    input.select();
    let settled = false;
    function commit() {
        if (settled) return;
        settled = true;
        const typed = input.value;
        // Writes to whichever device is ACTIVE right now
        // (viewport width at commit time), never both - see
        // activeTextOverrides().
        activeTextOverrides()[slot] = (typed === '' || typed === TEXT_OVERRIDE_DEFAULTS[slot]) ? null : typed;
        // Reattach the original nodes BEFORE rendering (see this
        // function's own comment above) - for a multi-child
        // wrapper target this restores speedDisplayNumber/-Suffix
        // (etc) to a live, attached state again so render()'s
        // write into them actually shows up; for every other
        // (single-element) target this is a harmless no-op
        // immediately overwritten by render()'s own textContent
        // assignment.
        el.replaceChildren(...originalChildren);
        cfg.render(slot, prefix);
        if (wasHidden) el.classList.add('hidden');
    }
    function cancel() {
        if (settled) return;
        settled = true;
        el.replaceChildren(...originalChildren);
        if (wasHidden) el.classList.add('hidden');
    }
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (ev) => {
        // Plain Enter commits; Shift+Enter inserts a newline
        // (textarea's own default behavior - just don't
        // intercept it) - per explicit request.
        if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); input.blur(); }
        else if (ev.key === 'Escape') cancel();
    });
    input.addEventListener('click', (ev) => ev.stopPropagation());
}

function setupTextEditMode() {
    Object.keys(TEXT_EDIT_TARGETS).forEach(elId => {
        const el = document.getElementById(elId);
        // Text Edit Mode overrides any normal click/tap function on
        // these elements while it's on - per explicit request, so
        // editing wording on a real button (startButton, whose
        // pointerdown/pointerup normally starts the game) doesn't
        // also trigger gameplay. Capture phase + stopImmediate-
        // Propagation() so this runs BEFORE and fully blocks the
        // element's own bubble-phase gameplay listeners regardless
        // of registration order.
        ['pointerdown', 'pointerup', 'click'].forEach(evtName => {
            el.addEventListener(evtName, (e) => {
                if (!textEditModeEnabled) return;
                if (el.querySelector('.text-edit-input')) return; // actively editing - let the input handle its own clicks/cursor placement normally
                e.stopImmediatePropagation();
                e.preventDefault();
            }, true);
        });
        // Right-click (contextmenu), not left-click, per explicit
        // request - preventDefault suppresses the native context menu.
        el.addEventListener('contextmenu', (e) => {
            if (!textEditModeEnabled) return;
            e.stopPropagation();
            e.preventDefault();
            // editable:false (targetCountNumber - see its own
            // comment) still gets the bounding box/click-guard
            // above, just no editor - it's live gameplay data, not
            // static wording.
            if (TEXT_EDIT_TARGETS[elId].editable === false) return;
            openTextEditFor(elId);
        });
    });
}

// Right-click a relevant dev-panel section title (Desktop or Mobile
// tab, either works - openTextEditFor()/activeTextOverrides() write
// to whichever DEVICE is actually rendering, same as the canvas
// right-click already does, regardless of which tab is open) to
// edit that element's wording too - per explicit follow-up request.
// Each relevant title carries data-text-edit-target="<elId>" (see
// the HTML) naming which TEXT_EDIT_TARGETS key it maps to.
function setupTextEditPanelTriggers() {
    document.querySelectorAll('[data-text-edit-target]').forEach(titleEl => {
        titleEl.addEventListener('contextmenu', (e) => {
            if (!textEditModeEnabled) return;
            e.stopPropagation();
            e.preventDefault();
            openTextEditFor(titleEl.dataset.textEditTarget);
        });
    });
}

// Dev Panel's own text (group/section titles, individual setting
// labels) is ALSO renameable in Text Edit Mode - per explicit
// follow-up request ("i should be able to edit Dev Panel text as
// well (Dev Panel Header group text, settings text, etc)"). Unlike
// TEXT_EDIT_TARGETS above (a handful of named elements, each with
// real state-dependent slots like Start/Try Again), every editable
// Dev Panel text is just itself - one key, one string, no slot
// branching - so this is a flat key->text map instead of a second
// TEXT_EDIT_TARGETS-shaped table. Keys reuse identifiers this file
// already treats as stable/reorder-proof for the exact same reason:
// section titles use getSectionKey() (data-sid-backed - see its own
// comment, added specifically so renaming a title can't silently
// break its collapse-state/order persistence); setting labels reuse
// getRowKey()'s own convention (the row's one real control id)
// directly, since every real .dev-label already sits in a .dev-row
// with exactly one [id] element.
let devTextOverrides = {};
// Tracks which devTextOverrides keys were typed directly into that
// exact tab (via commit() below), as opposed to carried over by
// syncTabOrderToDesktop()'s own group/row-rename mirroring. Needed
// so the sync can tell "Mobile/Landscape still has its auto-carried
// Desktop name, keep following Desktop" apart from "the user
// independently renamed this on Mobile/Landscape itself, leave it
// alone" - both looked identical as a bare non-null devTextOverrides
// entry before this, which is why a Desktop rename only ever landed
// once (the very first sync) and never again after that - see
// syncTabOrderToDesktop()'s own comment on this fix.
let devTextOverridesManual = new Set();
// Locked groups - per direct request ("add a lock icon that i can
// select. If selected, the settings within that group cannot be
// reordered or moved into another group"). Keyed the same way as
// devTextOverrides/sectionCollapseState (getSectionKey(titleEl) -
// stable, DOM-position-independent). Deliberately scoped to ONLY
// the settings INSIDE a locked group, matching exactly what was
// asked - the locked group ITSELF can still be dragged/reordered/
// nested as a whole; only its own rows can't be reordered within
// it or dragged out to another group. Enforced in setupDragReorder()
// itself (search "lockedGroups.has") by refusing to even START a
// drag on a .dev-row whose own closest .dev-section is locked -
// this single check satisfies BOTH halves of the request at once,
// since a drag that never starts can neither reorder in place nor
// be dropped into a different group.
// Dev Panel and Debug start locked by default on every tab, ported
// 2026-09-28 from TEMPLATE_DEV_PANEL.html - these 2 are Clicko's
// own mandatory built-in groups (CLAUDE.md 12i/12i-1), so locking
// them out of the box protects them from an accidental drag/delete
// the same way findDevDeleteProtectionReason() already refuses to
// delete them outright. A project (or a fresh visitor with no
// saved settings yet) can still unlock either via its own lock
// icon if it genuinely wants to reorganize them; loadSettings()'s
// own `if (settings.lockedGroups) lockedGroups = ...` still
// overrides this default the instant real saved data resolves.
let lockedGroups = new Set(
    ['desktop', 'mobile', 'landscape'].flatMap(tab => [tab + ':Dev Panel', tab + ':Debug'])
);
// no override is stored yet. Derived from the DOM itself (there are
// 26 section titles + ~300 setting labels - hand-listing every
// default the way TEXT_OVERRIDE_DEFAULTS does for the ~8 game-text
// slots would just duplicate what the HTML already says).
const devTextOriginals = {};

function getDevLabelKey(labelEl) {
    const row = labelEl.closest('.dev-row');
    const control = row ? row.querySelector('[id]') : null;
    return control ? control.id : null; // no stable key available - don't offer editing
}

function devTextOriginalFor(key, currentText) {
    if (!(key in devTextOriginals)) devTextOriginals[key] = currentText;
    return devTextOriginals[key];
}

// Renders every currently-known override (or each element's own
// original text) - called once on initial paint (capturing true
// originals into devTextOriginals, since devTextOverrides starts
// empty) and again after a settings load resolves (this time
// actually applying whatever was restored), same 2-pass pattern as
// every other setting in this file. Section titles keep their own
// "▼ "/"▶ " collapse arrow (2 chars) untouched, only the text after
// it is ever read as - or replaced by - an override, matching
// toggleSection()'s own slice(2) convention exactly.
function applyDevTextOverrides() {
    document.querySelectorAll('.dev-section-title').forEach(titleEl => {
        const key = getSectionKey(titleEl);
        const arrow = titleEl.textContent.slice(0, 2);
        const original = devTextOriginalFor(key, titleEl.textContent.slice(2));
        titleEl.textContent = arrow + (devTextOverrides[key] != null ? devTextOverrides[key] : original);
    });
    document.querySelectorAll('.dev-label').forEach(labelEl => {
        const key = getDevLabelKey(labelEl);
        if (!key) return;
        const original = devTextOriginalFor(key, labelEl.textContent);
        labelEl.textContent = devTextOverrides[key] != null ? devTextOverrides[key] : original;
    });
}

// Guards against the dev panel's own scroll position jumping when
// committing a text-box edit - direct report ("when i type into a
// text box and press enter. It scrolls me to the bottom of the dev
// panel"), confirmed mobile-only (a real Enter keypress against all
// 3 dev-panel text-entry mechanisms below - the slider value box,
// the group/label rename box, and the Click Burst frame-position
// boxes - produced zero scroll change when tested live on desktop).
// The most likely real cause is the on-screen keyboard closing on
// Enter/blur and the browser's own keyboard-avoidance logic
// re-settling scroll position against the panel's own small (~80px
// tall) .dev-panel-scroll-content once the visual viewport grows
// back - not reproducible here since this environment has no real
// virtual keyboard to trigger that resize. Rather than chase one
// specific mobile browser's exact timing, this just captures the
// panel's scrollTop before the commit and forces it back
// afterward, repeatedly over the ~300ms a keyboard-close animation
// typically takes (iOS/Android both land in the low hundreds of
// ms) - covers a synchronous jump (restored on the same tick and
// next frame) and a delayed one (the keyboard's own resize event
// firing after its close animation finishes) alike, regardless of
// which one is actually responsible.
function preserveDevPanelScroll(fn) {
    const scroller = document.querySelector('.dev-panel-scroll-content');
    const before = scroller ? scroller.scrollTop : null;
    fn();
    if (!scroller || before == null) return;
    const restore = () => { scroller.scrollTop = before; };
    restore();
    requestAnimationFrame(restore);
    [50, 150, 300].forEach(ms => setTimeout(restore, ms));
}

// Generic dev-panel text editor - same textarea-swap UX as
// openTextEditFor() above, without that function's slot/prefix
// machinery (nothing here has more than one possible string).
// isTitle controls whether the leading "▼ "/"▶ " arrow is preserved
// outside the editable text.
function openDevTextEditFor(el, key, isTitle) {
    if (!key || el.querySelector('.text-edit-input')) return;
    const arrow = isTitle ? el.textContent.slice(0, 2) : '';
    const original = devTextOriginalFor(key, isTitle ? el.textContent.slice(2) : el.textContent);
    const currentValue = devTextOverrides[key] != null ? devTextOverrides[key] : original;
    const originalHTML = el.innerHTML;
    const input = document.createElement('textarea');
    input.className = 'text-edit-input';
    input.rows = 1;
    input.value = currentValue;
    el.textContent = '';
    if (isTitle) el.appendChild(document.createTextNode(arrow));
    el.appendChild(input);
    input.focus();
    input.select();
    // Stop this drag-handle element's own document-level pointerdown
    // listener (setupDragReorder) from ever seeing events that
    // originate inside the textarea - otherwise selecting/typing
    // text could be misread as the start of a reorder-drag.
    input.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    input.addEventListener('click', (ev) => ev.stopPropagation());
    let settled = false;
    function commit() {
        if (settled) return;
        settled = true;
        const typed = input.value;
        devTextOverrides[key] = (typed === '' || typed === original) ? null : typed;
        // A real, direct edit on THIS tab marks the key manual (so
        // syncTabOrderToDesktop() stops overwriting it from
        // Desktop); clearing it back to the original text un-marks
        // it, reverting to auto-following Desktop's own name again -
        // see devTextOverridesManual's own comment.
        if (devTextOverrides[key] != null) devTextOverridesManual.add(key);
        else devTextOverridesManual.delete(key);
        el.textContent = arrow + (devTextOverrides[key] != null ? devTextOverrides[key] : original);
    }
    function cancel() {
        if (settled) return;
        settled = true;
        el.innerHTML = originalHTML;
    }
    input.addEventListener('blur', () => preserveDevPanelScroll(commit));
    input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); input.blur(); }
        else if (ev.key === 'Escape') cancel();
    });
}

// Setting-label click-to-edit - delegated single listener on the
// panel itself rather than one per label (~300 of them). Capture
// phase + preventDefault so clicking a checkbox row's label text
// doesn't also toggle that checkbox (native <label> behavior -
// clicking anywhere inside a <label> activates its associated
// control unless the click's default is prevented). Section titles
// don't need an entry here - toggleSection() IS their click handler
// already (inline onclick), intercepted there instead of adding a
// second, competing listener on the same element.
function setupDevPanelTextEdit() {
    devPanel.addEventListener('click', (e) => {
        if (!textEditModeEnabled) return;
        const label = e.target.closest('.dev-label');
        if (!label) return;
        if (label.querySelector('.text-edit-input')) return;
        if (sectionJustDragged) { sectionJustDragged = false; return; }
        e.preventDefault();
        e.stopPropagation();
        openDevTextEditFor(label, getDevLabelKey(label), false);
    }, true);
}

// Per explicit request ("make sure all color pickers in the dev
// panel reflect the current settings") - a real, previously-known
// gap (this file's own Round 1 comment already flagged color
// pickers as "left out of scope" for the generic post-load sync
// that sliders got). colorBase/colorButton/colorButtonWin/
// colorButtonLose are skipped here - they're special-cased (not
// stored via COLOR_VAR_MAP/EXTRUSION_COLOR_MAP) and already have
// their own dedicated restore in applyLoadedSettings(); Dev Panel
// styling colors are likewise already covered by
// DEV_PANEL_STYLE_CONTROL_IDS's own restore loop and simply won't
// match either map below, so they're harmlessly skipped too.
// Generic .dev-slider DOM-value sync from live state (cssVars/
// mobileCssVars/landscapeCssVars/extrusionVars/etc, via
// CSS_VAR_SLIDER_MAP/EXTRUSION_SLIDER_MAP) - extracted from
// applyLoadedSettings()'s own inline loop (still called from there,
// unchanged) so it can ALSO run once synchronously right after
// setupDevSliders(), before loadSettings()'s async fetch resolves.
// Closes the brief window where a Method-B-generated control's
// initial DOM value comes from its own config array's separately-
// typed `value:` literal (which can drift from the real live
// default - the same class of dual-source-of-truth risk flagged
// during this session's own architecture review) - this makes that
// literal purely a fallback for the instant before this runs,
// never the value a user actually sees for more than one paint.
function syncSlidersFromState() {
    [CSS_VAR_SLIDER_MAP, EXTRUSION_SLIDER_MAP].forEach(map => {
        const isExtrusionMap = map === EXTRUSION_SLIDER_MAP;
        Object.keys(map).forEach(desktopId => {
            const key = map[desktopId];
            [desktopId, desktopId.replace(/^(slider|color|select|checkbox)/, '$1Mobile'), desktopId.replace(/^(slider|color|select|checkbox)/, '$1Landscape')].forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                const { device } = resolveDevControlId(id);
                const source = isExtrusionMap
                    ? (device === 'landscape' ? landscapeExtrusionVars : device === 'mobile' ? mobileExtrusionVars : extrusionVars)
                    : (device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars);
                const value = source[key];
                if (value === undefined) return;
                // Auto-expand whichever bound crosses, same rule as
                // the click-to-type commit path (CLAUDE.md Section
                // 12h) - otherwise a live value past the slider's
                // hardcoded min/max pins the handle at that extreme.
                if (typeof value === 'number') {
                    const min = parseFloat(el.min);
                    const max = parseFloat(el.max);
                    if (!isNaN(max) && value > max) el.max = String(value + Math.abs(value) * 0.2);
                    if (!isNaN(min) && value < min) el.min = String(value - Math.abs(value) * 0.2);
                }
                el.value = value;
                // deferApply=true - see applySliderValue()'s own
                // comment. Batched into ONE applyActiveVars()/
                // applyExtrusionStyles() call after both loops
                // finish, instead of once per slider (up to ~450
                // calls otherwise) - this was the actual ~1.2s of
                // this function's own measured ~2.7s Undo/Load
                // cost.
                applySliderValue(el, value, true);
            });
        });
    });
    applyActiveVars();
    applyExtrusionStyles();
}
function syncColorPickersFromState() {
    const SPECIAL_CASED_IDS = ['colorButton', 'colorBase', 'colorButtonWin', 'colorButtonLose'];
    document.querySelectorAll('.dev-color-picker').forEach(picker => {
        const { device, desktopId } = resolveDevControlId(picker.id);
        if (SPECIAL_CASED_IDS.includes(desktopId)) return;
        const extrusionKey = EXTRUSION_COLOR_MAP[desktopId];
        if (extrusionKey) {
            picker.value = (device === 'landscape' ? landscapeExtrusionVars : device === 'mobile' ? mobileExtrusionVars : extrusionVars)[extrusionKey];
            return;
        }
        const varName = COLOR_VAR_MAP[desktopId];
        if (varName) {
            picker.value = (device === 'landscape' ? landscapeColorVars : device === 'mobile' ? mobileColorVars : colorVars)[varName];
        }
    });
}

// Restores the Dev Panel's OWN style controls' DOM state (slider
// handle + its .dev-value readout, color swatch, font <select>,
// every checkbox) from devPanelStyle/mobileDevPanelStyle/
// landscapeDevPanelStyle - a real, pre-existing gap found while
// porting the Named Setting States feature (Save/Use/Delete/Set
// as Default) from the shared dev-panel template: these controls
// live in their own separate object system (not CSS_VAR_SLIDER_
// MAP/COLOR_VAR_MAP), so syncSlidersFromState()/
// syncColorPickersFromState() (which only cover those 2 maps)
// silently skip every one of them - confirmed live, same
// underlying pattern already flagged in this file's own comment
// a few lines above ("loadSettings() doesn't sync any control's
// displayed value from a restored setting - a pre-existing gap
// affecting every dev-panel control, not specific to this one"),
// just for THIS specific sub-system rather than every checkbox in
// general (a bigger, separately-scoped problem, not fixed here).
// Reset already silently had this bug; it only became visible
// once Named Setting States' "Use" made restoring saved state on
// demand (not just on page load) an actual user-facing action.
// Same id/key lists as setupDevPanelStyleControls()'s own wiring
// arrays, kept as an intentionally separate copy here rather than
// hoisting those (function-local) arrays out - lower-risk on this
// scale of file than refactoring an already-working function.
function syncDevPanelStyleControlsFromState() {
    const sliderKeys = [
        ['titleFontSize', 'sliderDevPanelTitleFontSize', 'sliderMobileDevPanelTitleFontSize', 'sliderLandscapeDevPanelTitleFontSize'],
        ['tabFontSize', 'sliderDevTabFontSize', 'sliderMobileDevTabFontSize', 'sliderLandscapeDevTabFontSize'],
        ['groupTitleFontSize', 'sliderDevGroupTitleFontSize', 'sliderMobileDevGroupTitleFontSize', 'sliderLandscapeDevGroupTitleFontSize'],
        ['settingTitleFontSize', 'sliderDevSettingTitleFontSize', 'sliderMobileDevSettingTitleFontSize', 'sliderLandscapeDevSettingTitleFontSize'],
        ['buttonTextBorder', 'sliderDevButtonTextBorder', 'sliderMobileDevButtonTextBorder', 'sliderLandscapeDevButtonTextBorder'],
        ['scrollStrength', 'sliderDevScrollStrength', 'sliderMobileDevScrollStrength', 'sliderLandscapeDevScrollStrength'],
        ['buttonHeight', 'sliderDevButtonHeight', 'sliderMobileDevButtonHeight', 'sliderLandscapeDevButtonHeight'],
        ['buttonTextLetterSpacing', 'sliderDevButtonTextLetterSpacing', null, null],
        ['tabTextLetterSpacing', 'sliderDevTabTextLetterSpacing', null, null],
        ['groupTextLetterSpacing', 'sliderDevGroupTextLetterSpacing', null, null],
        ['settingsTextLetterSpacing', 'sliderDevSettingsTextLetterSpacing', null, null],
        ['valueFontSize', 'sliderDevValueFontSize', 'sliderMobileDevValueFontSize', 'sliderLandscapeDevValueFontSize'],
        ['titleLetterSpacing', 'sliderDevPanelTitleLetterSpacing', 'sliderMobileDevPanelTitleLetterSpacing', 'sliderLandscapeDevPanelTitleLetterSpacing'],
        ['titleLineHeight', 'sliderDevPanelTitleLineHeight', 'sliderMobileDevPanelTitleLineHeight', 'sliderLandscapeDevPanelTitleLineHeight'],
        ['tabLineHeight', 'sliderDevTabLineHeight', 'sliderMobileDevTabLineHeight', 'sliderLandscapeDevTabLineHeight'],
        ['buttonFontSize', 'sliderDevButtonFontSize', 'sliderMobileDevButtonFontSize', 'sliderLandscapeDevButtonFontSize'],
        ['buttonLineHeight', 'sliderDevButtonLineHeight', 'sliderMobileDevButtonLineHeight', 'sliderLandscapeDevButtonLineHeight'],
        ['settingsLineHeight', 'sliderDevSettingsLineHeight', 'sliderMobileDevSettingsLineHeight', 'sliderLandscapeDevSettingsLineHeight'],
        ['groupLineHeight', 'sliderDevGroupLineHeight', 'sliderMobileDevGroupLineHeight', 'sliderLandscapeDevGroupLineHeight'],
    ];
    sliderKeys.forEach(([key, deskId, mobId, landId]) => {
        [[deskId, devPanelStyle], [mobId, mobileDevPanelStyle], [landId, landscapeDevPanelStyle]].forEach(([id, store]) => {
            if (!id) return;
            const el = document.getElementById(id);
            if (!el) return;
            el.value = store[key];
            const valEl = document.getElementById(id.replace('slider', 'value'));
            if (valEl && !valEl.querySelector('input')) valEl.textContent = el.value;
        });
    });
    const opacityEl = document.getElementById('sliderDevPanelOpacity');
    if (opacityEl) {
        opacityEl.value = devPanelStyle.opacity;
        const valEl = document.getElementById('valueDevPanelOpacity');
        if (valEl && !valEl.querySelector('input')) valEl.textContent = opacityEl.value;
    }
    const colorKeys = [
        ['bgColor', 'colorDevPanelBg'], ['titleTextColor', 'colorDevPanelTitleText'], ['nonTitleTextColor', 'colorDevPanelNonTitleText'],
        ['accentColor', 'colorDevPanelAccent'], ['sliderColor', 'colorDevPanelSliderColor'], ['groupLabelBgColor', 'colorDevPanelGroupLabelBg'],
        ['groupTextColor', 'colorDevPanelGroupText'], ['buttonTextColor', 'colorDevPanelButtonText'],
        ['settingNumberColor', 'colorDevPanelSettingNumber'], ['tabTextColor', 'colorDevPanelTabText'],
    ];
    colorKeys.forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el) el.value = devPanelStyle[key];
    });
    const fontEl = document.getElementById('selectDevPanelFontFamily');
    if (fontEl) fontEl.value = devPanelStyle.fontFamily;
    const capsCheckboxKeys = [
        ['capsButtonText', 'checkboxDevCapsButtonText'], ['capsTabText', 'checkboxDevCapsTabText'],
        ['capsGroupNames', 'checkboxDevCapsGroupNames'], ['capsSettingsText', 'checkboxDevCapsSettingsText'],
        ['titleCapitalize', 'checkboxDevCapsTitleText'], ['titleBold', 'checkboxDevBoldTitle'],
        ['tabBold', 'checkboxDevBoldTab'], ['buttonBold', 'checkboxDevBoldButton'],
        ['settingsBold', 'checkboxDevBoldSettings'], ['groupBold', 'checkboxDevBoldGroup'],
    ];
    capsCheckboxKeys.forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el) el.checked = !!devPanelStyle[key];
    });
}

// Startup validation: every generic slider/color config array entry
// must resolve to a real key in whichever map actually drives it
// (CSS_VAR_SLIDER_MAP/EXTRUSION_SLIDER_MAP for sliders, COLOR_VAR_
// MAP/EXTRUSION_COLOR_MAP/the special-cased button-color ids for
// colors) - a typo'd id here would otherwise silently render a
// control that moves nothing, with no error until someone notices
// the setting doesn't do anything (per this session's own
// architecture review). Scoped to the "uniform-shaped" config
// arrays (Desktop/Mobile/Landscape uniform, compound-offset,
// special-colors) - Dev Panel style/Game Mechanics/select-checkbox
// controls have their own dedicated, explicitly-named wiring
// instead of generic map lookup, so a mismatch there is already a
// hard no-op/ReferenceError at that specific call site, not a
// silent one needing this same kind of check.
function validateDevControlMappings() {
    const SPECIAL_COLOR_IDS = ['colorButton', 'colorBase', 'colorButtonWin', 'colorButtonLose'];
    const arrays = [
        ['DESKTOP_UNIFORM_CONTROLS', DESKTOP_UNIFORM_CONTROLS],
        ['MOBILE_UNIFORM_CONTROLS', MOBILE_UNIFORM_CONTROLS],
        ['LANDSCAPE_UNIFORM_CONTROLS', LANDSCAPE_UNIFORM_CONTROLS],
        ['COMPOUND_OFFSET_CONTROLS', COMPOUND_OFFSET_CONTROLS],
        ['SPECIAL_COLOR_CONTROLS', SPECIAL_COLOR_CONTROLS],
    ];
    let badCount = 0;
    arrays.forEach(([name, arr]) => {
        arr.forEach(ctrl => {
            const { desktopId } = resolveDevControlId(ctrl.id);
            if (ctrl.type === 'slider') {
                if (!(desktopId in CSS_VAR_SLIDER_MAP) && !(desktopId in EXTRUSION_SLIDER_MAP)) {
                    console.error('validateDevControlMappings: unmapped slider id', name, ctrl.id, '(resolved to', desktopId + ')');
                    badCount++;
                }
            } else if (ctrl.type === 'color') {
                if (!SPECIAL_COLOR_IDS.includes(desktopId) && !(desktopId in COLOR_VAR_MAP) && !(desktopId in EXTRUSION_COLOR_MAP)) {
                    console.error('validateDevControlMappings: unmapped color id', name, ctrl.id, '(resolved to', desktopId + ')');
                    badCount++;
                }
            }
        });
    });
    if (badCount > 0) console.error('validateDevControlMappings: ' + badCount + ' control(s) have no live mapping - see errors above.');
    return badCount;
}

// Load-order tripwire: every render*Controls() call must run before
// this point (right before setupDevSliders() sets up the generic
// event-wiring, which is currently enforced only by where each call
// physically sits in this file). If a future edit ever inserts a
// new render call AFTER setupDevSliders() by mistake, the controls
// it creates would exist in the DOM but never get wired up, with no
// error - this checks every config-array control actually made it
// into the DOM by this point, so that kind of ordering mistake
// fails loudly instead of silently.
function assertDevControlsRendered() {
    const allArrays = [
        DESKTOP_UNIFORM_CONTROLS, MOBILE_UNIFORM_CONTROLS, LANDSCAPE_UNIFORM_CONTROLS,
        COMPOUND_OFFSET_CONTROLS, DEVPANEL_STYLE_CONTROLS, SPECIAL_COLOR_CONTROLS,
        GAME_MECHANICS_CONTROLS, DEVPANEL_MISC_CONTROLS, CLICK_BURST_TEXT_INPUT_CONTROLS,
    ];
    let missing = 0;
    allArrays.forEach(arr => {
        arr.forEach(ctrl => {
            if (!document.getElementById(ctrl.id)) missing++;
        });
    });
    if (missing > 0) {
        console.error('assertDevControlsRendered: ' + missing + ' generated control(s) missing from the DOM at setup time - a render*Controls() call may be missing, misordered, or its group lookup failed (see findGroupContent warnings above).');
    }
    return missing;
}

function setupDevSliders() {
    // dataset guard (2026-09-17) - makes this function safe to call
    // again after new elements are added to the DOM post-initial-
    // build (dynamicDevice's own ensureDynamicDeviceRow() does
    // exactly this), without double-wiring every element that was
    // already wired the first time.
    const sliders = document.querySelectorAll('.dev-slider:not([data-wired])');
    sliders.forEach(slider => {
        slider.dataset.wired = '1';
        slider.addEventListener('input', (e) => {
            applySliderValue(e.target, parseFloat(e.target.value));
        });
    });

    // Setup color pickers (COLOR_VAR_MAP/EXTRUSION_COLOR_MAP are now
    // top-level - see their own comment there).
    const colorPickers = document.querySelectorAll('.dev-color-picker:not([data-wired])');
    colorPickers.forEach(picker => {
        picker.dataset.wired = '1';
        picker.addEventListener('input', (e) => {
            const { device, desktopId } = resolveDevControlId(e.target.id);

            if (desktopId === 'colorButton') {
                // The button is real artwork (SVG), not a flat CSS fill - recolor it by
                // hue-rotating away from the artwork's own reference color.
                refreshButtonHue();
                return;
            }
            if (desktopId === 'colorBase') {
                refreshBaseHue();
                return;
            }
            // Win/Lose button tint - per explicit request ("provide
            // a color picker for Win Color, and Lose Color... tints
            // for the button svg when the player Wins or Loses").
            // Plain CSS custom properties, overridden by
            // .game-container:has(#resultText.result-win/-lose)
            // (see its own CSS comment) - no game-logic JS needed,
            // stays correct regardless of which of the several
            // existing call sites toggles resultText's win/lose
            // class.
            if (desktopId === 'colorButtonWin') {
                document.documentElement.style.setProperty('--button-win-tint-color', e.target.value);
                return;
            }
            if (desktopId === 'colorButtonLose') {
                document.documentElement.style.setProperty('--button-lose-tint-color', e.target.value);
                return;
            }

            const extrusionKey = EXTRUSION_COLOR_MAP[desktopId];
            if (extrusionKey) {
                (device === 'landscape' ? landscapeExtrusionVars : device === 'mobile' ? mobileExtrusionVars : extrusionVars)[extrusionKey] = e.target.value;
                applyExtrusionStyles();
                // The 4 Gameplay Win/Lose colors (Target/Speed/Ms-
                // per-click's OWN tint while a result is showing -
                // not resultText's ":)"/":(" symbol, that's the
                // separate Win/Lose section's own colors) are read
                // ONLY by applyGameplayResultColor(), which
                // applyExtrusionStyles() above never calls - per
                // direct report ("gameplay win Border/Extrusion
                // color doesnt work. It stays the same color"),
                // confirmed by reading the code: this picker's own
                // value was updating correctly, it just never got
                // pushed to the actual --target-fill-color/-
                // extrusion-shadow (etc.) CSS vars until the NEXT
                // real win/lose transition, so tuning it while a
                // result was currently showing (or via the Preview
                // Win/Lose Text checkboxes - see their own updated
                // handlers) had no visible effect at all. Re-apply
                // immediately using whichever result state (if any)
                // is currently showing, matching every other color
                // picker's already-instant feedback.
                if (GAMEPLAY_RESULT_COLOR_FIELDS.includes(extrusionKey)) {
                    applyGameplayResultColor(resultText.classList.contains('result-win') ? 'win' : resultText.classList.contains('result-lose') ? 'lose' : null);
                }
                return;
            }

            const varName = COLOR_VAR_MAP[desktopId];
            if (varName) {
                (device === 'landscape' ? landscapeColorVars : device === 'mobile' ? mobileColorVars : colorVars)[varName] = e.target.value;
                applyActiveVars();
            }
        });
    });

    // Overall Border on/off toggle(s) for the 8-bit extrusion style -
    // desktop and its Mobile Overrides twin (checkboxMobileOverallBorder),
    // same generic isMobile-split pattern as every other dev-panel
    // control, matched via the shared .dev-overall-border-checkbox
    // class since checkboxes aren't covered by .dev-slider/.dev-
    // color-picker's own generic loops above.
    document.querySelectorAll('.dev-overall-border-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const { device } = resolveDevControlId(e.target.id);
            (device === 'landscape' ? landscapeExtrusionVars : device === 'mobile' ? mobileExtrusionVars : extrusionVars).overallBorderEnabled = e.target.checked;
            applyExtrusionStyles();
        });
    });
}

// Lets you click any slider's displayed number and type an exact
// value instead of only dragging - including a value beyond the
// slider's own min/max, per explicit request ("the slider stays the
// same but I get to set it higher than the limits"). Generic, not
// 50+ per-slider handlers: reuses the same id convention
// setupDevSliders() already relies on (sliderXyz <-> valueXyz) to
// find each span's matching slider, then applies the typed value via
// the same applySliderValue() the normal drag path uses - no
// parallel value-setting logic to keep in sync.
//
// Can't just set slider.value to an out-of-range number and dispatch
// 'input' the way the original version of this did: a native
// <input type="range"> silently CLAMPS its own .value to [min,max]
// the instant you assign it, so an out-of-range typed number would
// never actually reach applySliderValue() at all - confirmed this is
// real range-input behavior, not an assumption. Fixed by clamping
// only what gets written to the SLIDER (so it still displays/drags
// normally afterward - "the slider stays the same") while applying
// the actual typed value separately, unclamped.
//
// Only spans with an id AND a matching range slider become editable
// (.dev-value-editable) - the decorative color-picker labels share
// the base .dev-value class but have neither.
function makeDevValuesEditable() {
    document.querySelectorAll('.dev-value[id]').forEach(valueEl => {
        const sliderId = valueEl.id.replace(/^value/, 'slider');
        const slider = document.getElementById(sliderId);
        if (!slider || slider.type !== 'range') return;
        valueEl.classList.add('dev-value-editable');
    });

    document.addEventListener('click', (e) => {
        const valueEl = e.target.closest('.dev-value-editable');
        if (!valueEl || valueEl.querySelector('input')) return;
        const slider = document.getElementById(valueEl.id.replace(/^value/, 'slider'));
        if (!slider) return;

        const originalText = valueEl.textContent;
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'dev-value-edit-input';
        input.value = slider.value;
        // Deliberately no min/max/step on this temporary input -
        // those would hint/restrict back to the slider's own range,
        // exactly what typing a value out of range is meant to
        // bypass.
        valueEl.textContent = '';
        valueEl.appendChild(input);
        input.focus();
        input.select();

        let settled = false;
        function commit() {
            if (settled) return;
            settled = true;
            let val = parseFloat(input.value);
            if (isNaN(val)) val = parseFloat(slider.value);
            // Auto-expand whichever bound the typed value crosses to
            // typed-value +/- 20%, per the project-wide dev-panel
            // standard (CLAUDE.md Section 12h) - so a typed
            // out-of-range value doesn't end up visually pinned at
            // the slider's old extreme. Replaces the previous
            // behavior of clamping the slider's own displayed value
            // while only the applied value went past it.
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            if (val > max) slider.max = String(val + Math.abs(val) * 0.2);
            if (val < min) slider.min = String(val - Math.abs(val) * 0.2);
            slider.value = val;
            // Remove the temporary <input> BEFORE calling
            // applySliderValue() - that function's own textContent
            // update is guarded by "!valueEl.querySelector('input')"
            // (so it doesn't clobber the input while you're still
            // typing), but leaving the input in place after commit
            // left that guard permanently blocking every future
            // update to this value, including from just dragging
            // the slider normally afterward - a real reported bug
            // ("when I use the slider again, the number doesn't
            // update").
            input.remove();
            applySliderValue(slider, val);
        }
        function cancel() {
            if (settled) return;
            settled = true;
            valueEl.textContent = originalText;
        }
        input.addEventListener('blur', () => preserveDevPanelScroll(commit));
        input.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
            else if (ev.key === 'Escape') cancel();
        });
        // The click that opened this input would otherwise also
        // bubble to the document-level listener above and could
        // re-trigger this same handler on the same element.
        input.addEventListener('click', (ev) => ev.stopPropagation());
    });
}

// Click-to-type a slider's own MIN or MAX bound (as opposed to its
// current value, above) - the 2 small labels at each end of the
// track, ported 2026-09-28 from TEMPLATE_DEV_PANEL.html. Parallel
// structure to makeDevValuesEditable() but keyed by
// data-slider-id/data-bound rather than an id-prefix swap, since a
// bound label isn't itself "the value" of anything with its own id.
function makeDevSliderBoundsEditable() {
    document.addEventListener('click', (e) => {
        const boundEl = e.target.closest('.dev-slider-bound-editable');
        if (!boundEl || boundEl.querySelector('input')) return;
        const slider = document.getElementById(boundEl.dataset.sliderId);
        if (!slider) return;
        const kind = boundEl.dataset.bound;
        const originalText = boundEl.textContent;
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'dev-value-edit-input';
        input.step = slider.step || 'any';
        input.value = kind === 'min' ? slider.min : slider.max;
        boundEl.textContent = '';
        boundEl.appendChild(input);
        input.focus();
        input.select();

        let settled = false;
        function commit() {
            if (settled) return;
            settled = true;
            let val = parseFloat(input.value);
            if (isNaN(val)) val = parseFloat(kind === 'min' ? slider.min : slider.max);
            if (kind === 'min') slider.min = String(val); else slider.max = String(val);
            // Clamp the current value into the new range, same as
            // a direct value-edit's own overshoot handling - and
            // re-apply through applySliderValue() (Clicko's own
            // "commit a slider value to game state" function,
            // rather than the template's generic 'input' event
            // dispatch) only when the value actually changed.
            const curVal = parseFloat(slider.value);
            const newMin = parseFloat(slider.min), newMax = parseFloat(slider.max);
            let clampedVal = curVal;
            if (curVal < newMin) clampedVal = newMin;
            if (curVal > newMax) clampedVal = newMax;
            input.remove();
            boundEl.textContent = val;
            if (clampedVal !== curVal) {
                slider.value = clampedVal;
                applySliderValue(slider, clampedVal);
            }
        }
        function cancel() {
            if (settled) return;
            settled = true;
            boundEl.textContent = originalText;
        }
        input.addEventListener('blur', () => preserveDevPanelScroll(commit));
        input.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
            else if (ev.key === 'Escape') cancel();
        });
        input.addEventListener('click', (ev) => ev.stopPropagation());
    });
}

// Base/backing AND button/pressed-button recolor - genuine
// grayscale + levels + overlay-tint (see #baseGrayscaleTint/
// #buttonGrayscaleTint filter defs, .base-tint-flood/
// .button-tint-flood CSS), not hue-rotate. Feeds the picked color
// straight into the relevant filter's feFlood as the actual tint,
// so ANY color (including white/gray) works correctly - hue-rotate
// could only ever rotate the source's own existing saturation
// around the color wheel, never desaturate to white/gray (and, once
// the source artwork itself became grayscale, hue-rotate stopped
// doing anything at all - zero saturation, nothing left to rotate).
function setBaseHue(hex) {
    document.documentElement.style.setProperty('--base-tint-color', hex);
}
function setButtonHue(hex) {
    document.documentElement.style.setProperty('--button-tint-color', hex);
}

// Light Levels/Floor/Ceiling - per explicit request ("Base Light
// Levels should just be Light Levels. It should affect all svgs")
// - ONE shared brightness/floor/ceiling, pushed into BOTH filters'
// feFuncR/G/B (.light-levels-func, shared class - both filters'
// levels stages use it) so base/backing/button/pressed all respond
// identically. slope/intercept aren't part of the CSS-stylable
// filter-primitive subset in most browsers, so this sets the SVG
// attributes directly rather than going through a CSS custom
// property (unlike flood-color, which IS CSS-stylable). Combines
// all 3 sliders into ONE linear transform per the standard levels
// formula: output = floor + (input * gain) * (ceiling - floor) -
// gain brightens/dims before the floor/ceiling remap, floor lifts
// the darkest possible output, ceiling caps the brightest. Defaults
// (gain=1, floor=0, ceiling=1) reduce to slope=1/intercept=0 -
// exactly the old single-slope behavior, unchanged until tuned.
// Redefined per explicit clarification: "I want it to control how
// white every shade is. if its set to max, everything is white. if
// its at 0, everything is black. This includes even if a color
// tint is applied." A pure multiplicative gain can't do this (0
// input * any gain is still 0 - shadows could never turn white),
// so `level` is now a -1..1 LERP toward black (-1) or white (+1),
// passing through the true/original grayscale at 0 (neutral). The
// "even with a tint applied" part falls out for free from Overlay
// blend's own math (base=1 -> result=1 regardless of blend color,
// base=0 -> result=0 regardless of blend color) - no extra work
// needed there, just getting the grayscale layer itself to reach
// true 0/1 at the extremes.
//   level>=0: v1 = input*(1-level) + level      [lerp toward white]
//   level<0:  v1 = input*(1+level)               [lerp toward black]
// Contrast (per explicit request, "under Light Levels... a contrast
// slider") pivots v1 around the 0.5 midpoint, default 1 = neutral:
//   v2 = (v1-0.5)*contrast + 0.5
// Floor/Ceiling (existing sliders) remap the final range as before:
//   output = floor + v2*(ceiling-floor)
// All 3 stages are linear in `input`, so they compose into ONE
// slope+intercept (same reasoning as the original gain+floor+
// ceiling version) - see the derivation in this project's own
// CHANGELOG for this entry.
// filterId scopes which SVG filter's own feFuncR/G/B trio gets this
// slope/intercept - #baseGrayscaleTint and #buttonGrayscaleTint
// each have their own separate trio (see the HTML's own comment),
// so Base and Button can carry independent Light Levels/Contrast/
// Floor/Ceiling now - per direct follow-up request ("give me a
// contrast and lightness slider for the base overall"), reversing
// an earlier explicit request that unified them into one shared
// set (see the cssVars declaration's own comment on this reversal).
function applyLightLevels(level, contrast, floor, ceiling, filterId) {
    const slope1 = 1 - Math.abs(level);
    const intercept1 = Math.max(level, 0);
    const range = ceiling - floor;
    const slope = slope1 * contrast * range;
    const intercept = (intercept1 * contrast + 0.5 * (1 - contrast)) * range + floor;
    document.querySelectorAll('#' + filterId + ' .light-levels-func').forEach(el => {
        el.setAttribute('slope', slope);
        el.setAttribute('intercept', intercept);
    });
}

// Blend Mode dropdowns (Button/Base Color) - per explicit request.
// feBlend's own `mode` attribute isn't part of the CSS-stylable
// filter-primitive subset reliably cross-browser (unlike flood-
// color), so this sets it directly, same reasoning as
// applyLightLevels()'s slope/intercept above.
function applyBlendModes(baseMode, buttonMode) {
    document.getElementById('baseTintBlend').setAttribute('mode', baseMode);
    document.getElementById('buttonTintBlend').setAttribute('mode', buttonMode);
}

// Saturation (Base/Button) - per explicit request. See the matching
// feColorMatrix primitives' own comment for why this targets the
// already-tinted result rather than SourceGraphic.
function applySaturation(baseSat, buttonSat) {
    document.getElementById('baseSaturationMatrix').setAttribute('values', baseSat);
    document.getElementById('buttonSaturationMatrix').setAttribute('values', buttonSat);
}

// Thin vs Regular base+backing artwork - per explicit request.
// Same shape as updateFlipButtonSvg()'s normal/pressed swap: a
// shared cssVars flag (persisted like any other) plus a class
// toggle on the common ancestor, but also syncs the checkbox's own
// displayed state (closing the exact gap updateFlipButtonSvg()'s
// own comment already flags as pre-existing and unaddressed there).
// thinBaseUserSet guards against a real race: loadSettings() is an
// async fetch that can still be in flight when the user interacts
// with the panel - if they toggle Thin Base before it resolves, the
// fetch's own (likely stale/unsaved) --thin-base-enabled value would
// otherwise silently overwrite their live toggle the instant it
// completes (applyActiveVars() -> applyThinBaseState() re-runs
// post-load). Once the user has touched it directly, their own
// value wins over that one-time post-load reapplication.
let thinBaseUserSet = false;
function updateThinBase() {
    const thin = document.getElementById('checkboxThinBase').checked;
    cssVars['--thin-base-enabled'] = thin ? 1 : 0;
    buttonAssembly.classList.toggle('thin-base', thin);
    thinBaseUserSet = true;
}
function applyThinBaseState() {
    if (thinBaseUserSet) return;
    const thin = !!cssVars['--thin-base-enabled'];
    buttonAssembly.classList.toggle('thin-base', thin);
    const cb = document.getElementById('checkboxThinBase');
    if (cb) cb.checked = thin;
}

// Dev panel drag - same pattern as the round-breakdown panel's own
// title-bar drag (see there for the setPointerCapture-ordering note).
// A single shared position/size (cssVars only, not mobile-split),
// matching --dev-panel-width-px's existing convention. Hooked to the
// whole .dev-header bar, not just the "DEV" text inside it - the
// text is only ~18px wide (its own intrinsic size) while the header
// visually spans the panel's full width, so a listener on the text
// alone left most of that visible bar as dead space that silently
// swallowed real drag attempts (reported as "can't move it left" -
// confirmed via elementFromPoint() that a drag starting anywhere in
// that dead space simply never reached this handler at all).
const devPanelHeader = document.querySelector('.dev-header');
let isDraggingDevPanel = false;
let devPanelDragStart = { pointerX: 0, pointerY: 0, panelLeft: 0, panelTop: 0 };

devPanelHeader.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return; // Collapse/Hide keep their own click behavior
    // Same explicit preventDefault as the resize handles just got -
    // per the same mobile "drag cuts out early" report, which named
    // both dragging and resizing.
    e.preventDefault();
    const rect = devPanel.getBoundingClientRect();
    devPanelDragStart = { pointerX: e.clientX, pointerY: e.clientY, panelLeft: rect.left, panelTop: rect.top };
    isDraggingDevPanel = true;
    devPanelHeader.classList.add('dragging');
    try { devPanelHeader.setPointerCapture(e.pointerId); } catch (err) { /* best-effort only */ }
});

document.addEventListener('pointermove', (e) => {
    if (!isDraggingDevPanel) return;
    // Recovery for a dropped gesture - per direct report ("in
    // mobile, I still can't drag the dev panel up and down"),
    // live-reproduced: a touch-drag's pointerdown fired (isDragging
    // flipped true, pointer capture set) but no further pointermove/
    // pointerup/pointercancel ever arrived - isDraggingDevPanel got
    // stuck true forever, which would also break EVERY subsequent
    // pointer interaction on the page (this same flag gates this
    // handler unconditionally). If a move event ever DOES arrive
    // with no button/touch actually down, the real gesture already
    // ended without us seeing it - treat it as an implicit end
    // rather than acting on stale drag-start data.
    if (e.buttons === 0) { endDevPanelDrag(e); return; }
    const dx = e.clientX - devPanelDragStart.pointerX;
    const dy = e.clientY - devPanelDragStart.pointerY;
    const panelRect = devPanel.getBoundingClientRect();
    const o = DEV_PANEL_HANDLE_OVERHANG_PX;
    const ox = devPanelEdgeMarginX();
    const newLeft = Math.max(ox, Math.min(window.innerWidth - panelRect.width - ox, devPanelDragStart.panelLeft + dx));
    const newTop = Math.max(o, Math.min(window.innerHeight - panelRect.height - o, devPanelDragStart.panelTop + dy));
    cssVars['--dev-panel-left-px'] = Math.round(newLeft);
    cssVars['--dev-panel-top-px'] = Math.round(newTop);
    // Bare number, matching every other cssVar's convention (see
    // applyActiveVars()) - the CSS itself is calc(var(...) * 1px),
    // so a value already suffixed with 'px' here produces px*px,
    // which this browser silently resolves to HALF the intended
    // offset rather than rejecting outright (confirmed via direct
    // getComputedStyle readback: '64px' rendered as top:32px, while
    // bare '64' correctly rendered as top:64px). The cssVars object
    // itself was always being set correctly - only this live-drag
    // DOM write had the extra unit, so the bug was invisible in the
    // stored settings and only showed up as the panel visually
    // trailing the cursor at half-distance during an active drag.
    document.documentElement.style.setProperty('--dev-panel-left-px', newLeft);
    document.documentElement.style.setProperty('--dev-panel-top-px', newTop);
});

function endDevPanelDrag(e) {
    if (!isDraggingDevPanel) return;
    isDraggingDevPanel = false;
    devPanelHeader.classList.remove('dragging');
    if (e && e.pointerId !== undefined && devPanelHeader.hasPointerCapture(e.pointerId)) {
        devPanelHeader.releasePointerCapture(e.pointerId);
    }
}
document.addEventListener('pointerup', endDevPanelDrag);
document.addEventListener('pointercancel', endDevPanelDrag);
// lostpointercapture fires whenever the browser/OS revokes capture
// for ANY reason, including a native gesture recognizer stepping in
// mid-touch - a more direct signal than waiting for pointerup/
// pointercancel, which the live-reproduced stuck-drag case above
// showed can both simply never arrive.
devPanelHeader.addEventListener('lostpointercapture', endDevPanelDrag);

function toggleDevPanelCollapsed() {
    const collapsed = devPanel.classList.toggle('panel-collapsed');
    document.getElementById('devCollapseBtn').textContent = collapsed ? '▢' : '▁';
    // .panel-collapsed's own height:auto!important was initially
    // trusted to size the panel from its one real visible child
    // (.dev-header) via ordinary flex auto-sizing - live-testing
    // that assumption turned out to be misleading for a while (a
    // long chase through flex-basis/overflow/position tweaks that
    // never moved the computed height) before the actual cause
    // surfaced: max-height was computing to 0px, because the test
    // tab's own viewport was reporting 0x0 (this environment's own
    // recurring fresh-tab artifact, not a real browser bug or
    // anything about this panel's CSS). Left as a direct JS
    // measurement anyway rather than reverting back to relying on
    // auto-sizing alone - explicit and easy to verify at a glance,
    // and avoids re-depending on flex behavior across however many
    // children happen to be hidden in any future collapsed layout.
    if (collapsed) {
        const headerHeight = devPanelHeader.getBoundingClientRect().height;
        const panelPadding = parseFloat(getComputedStyle(devPanel).paddingTop) + parseFloat(getComputedStyle(devPanel).paddingBottom);
        devPanel.style.setProperty('height', (headerHeight + panelPadding) + 'px', 'important');
    } else {
        devPanel.style.removeProperty('height');
    }
}

// Custom resize handles (native CSS `resize` isn't touch-draggable on
// most mobile browsers - see the handles' own CSS comment). Generic
// factory, not 8 near-duplicate handlers: xEdge/yEdge say which
// side(s) this particular handle moves. 'right'/'bottom' just grow
// from the fixed opposite side (like the original corner handle
// did); 'left'/'top' also have to shift the panel's own left/top by
// however much the size actually changed (post-clamp), so the
// OPPOSITE edge - not the dragged one - is what stays visually
// fixed, matching how every OS window resize behaves. Writes
// width/height directly onto the element (mirroring how the old
// width-only resizer worked); the existing ResizeObserver below
// catches whatever size results and persists it, same as before -
// only left/top need explicit persistence here, since those aren't
// covered by that observer.
// `setLeftTop(key, value)` (optional, 2026-09-20 - added for the
// Undock feature's own floating panels, see createUndockPanel())
// lets a caller other than the main dev panel persist a left/top
// change its OWN way - defaults to the original dev-panel-specific
// CSS-custom-property behavior when omitted, so every existing
// call site (the main panel's own 8 handles) is completely
// unaffected by this generalization.
function setupPanelResizeHandle(panel, handle, xEdge, yEdge, setLeftTop) {
    setLeftTop = setLeftTop || ((key, value) => {
        cssVars['--dev-panel-' + key + '-px'] = value;
        document.documentElement.style.setProperty('--dev-panel-' + key + '-px', value);
    });
    let dragging = false;
    let start = { pointerX: 0, pointerY: 0, left: 0, top: 0, width: 0, height: 0 };

    handle.addEventListener('pointerdown', (e) => {
        // Explicit preventDefault, on top of the CSS touch-action:none
        // already on this element - per direct report that resize
        // drags on mobile were still cutting out after ~5-10px.
        // touch-action:none alone doesn't guarantee every mobile
        // browser suppresses its own default touch handling (long-
        // press/callout, momentum-scroll priming, etc.) the instant
        // a touch starts; calling this directly removes any doubt.
        e.preventDefault();
        const rect = panel.getBoundingClientRect();
        start = { pointerX: e.clientX, pointerY: e.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        dragging = true;
        try { handle.setPointerCapture(e.pointerId); } catch (err) { /* best-effort only */ }
    });

    document.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        // Same dropped-gesture recovery as the header drag above -
        // see its own comment for the live-reproduced symptom this
        // guards against (a stuck `dragging` flag that would
        // otherwise silently absorb every future pointer move).
        if (e.buttons === 0) { end(e); return; }
        const cs = getComputedStyle(panel);
        const minW = parseFloat(cs.minWidth) || 0, maxW = parseFloat(cs.maxWidth) || Infinity;
        const minH = parseFloat(cs.minHeight) || 0, maxH = parseFloat(cs.maxHeight) || Infinity;
        const dx = e.clientX - start.pointerX;
        const dy = e.clientY - start.pointerY;

        let newWidth = start.width, newLeft = start.left;
        if (xEdge === 'right') {
            newWidth = Math.max(minW, Math.min(maxW, start.width + dx));
            // Same edge-gesture margin as the title-bar drag (see
            // devPanelEdgeMarginX) - without this, resizing from the
            // right edge could grow the panel's right border (and
            // its own resize handle) right up against the true
            // screen edge, into Android's own back-gesture zone.
            const maxWidthFromEdge = window.innerWidth - start.left - devPanelEdgeMarginX();
            newWidth = Math.min(newWidth, Math.max(minW, maxWidthFromEdge));
        } else if (xEdge === 'left') {
            newWidth = Math.max(minW, Math.min(maxW, start.width - dx));
            newLeft = start.left + (start.width - newWidth);
            // Don't let the left edge push the panel (or its own
            // -6px-overhang resize handle) off the left of the
            // viewport - matches the title-bar drag's own clamp.
            // Re-derives width from the clamped left so the RIGHT
            // edge (the one NOT being dragged) still stays exactly
            // fixed even when this clamp kicks in.
            const clampedLeft = Math.max(devPanelEdgeMarginX(), newLeft);
            if (clampedLeft !== newLeft) {
                newWidth = newWidth - (clampedLeft - newLeft);
                newLeft = clampedLeft;
            }
        }

        let newHeight = start.height, newTop = start.top;
        if (yEdge === 'bottom') {
            newHeight = Math.max(minH, Math.min(maxH, start.height + dy));
        } else if (yEdge === 'top') {
            newHeight = Math.max(minH, Math.min(maxH, start.height - dy));
            newTop = start.top + (start.height - newHeight);
            // Same viewport-edge clamp, top side.
            const clampedTop = Math.max(DEV_PANEL_HANDLE_OVERHANG_PX, newTop);
            if (clampedTop !== newTop) {
                newHeight = newHeight - (clampedTop - newTop);
                newTop = clampedTop;
            }
        }

        panel.style.width = newWidth + 'px';
        panel.style.height = newHeight + 'px';
        if (xEdge === 'left') {
            setLeftTop('left', Math.round(newLeft));
            // NOT also panel.style.left for the main dev panel case
            // (the DEFAULT setLeftTop above already avoids this;
            // the Undock panel's OWN setLeftTop deliberately DOES
            // set panel.style.left directly instead, since that
            // panel has no CSS-custom-property-driven position to
            // shadow in the first place) - that direct inline write
            // permanently shadows the CSS rule (left: calc(var(
            // --dev-panel-left-px) * 1px)) regardless of the custom
            // property's value, which is exactly what broke the
            // header drag-to-move afterward: per direct report
            // ("i cant drag the dev panel up and down on desktop...
            // though i can vertically resize it freely"), resizing
            // from an edge once was enough to permanently pin the
            // position via this inline style, so every later
            // --dev-panel-top-px/-left-px write from dragging the
            // header (setupDevPanelHeader's pointermove handler,
            // above) kept updating the custom property with zero
            // visible effect. The setProperty() call above already
            // re-renders the position immediately - this line was
            // never needed for the resize itself to work.
        }
        if (yEdge === 'top') {
            setLeftTop('top', Math.round(newTop));
            // See the xEdge === 'left' branch's own comment just
            // above - same bug, same fix, vertical axis.
        }
    });

    function end(e) {
        if (!dragging) return;
        dragging = false;
        if (e && e.pointerId !== undefined && handle.hasPointerCapture(e.pointerId)) {
            handle.releasePointerCapture(e.pointerId);
        }
    }
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
    handle.addEventListener('lostpointercapture', end);
}

// Named Setting States - static/eager markup (same as Copy/Sync/
// Reset above it), not gated behind ensureDevPanelBuilt()'s lazy
// build, so its own list needs populating here too.
renderSavedDevPanelStatesList();
setupPanelResizeHandle(devPanel, document.getElementById('devPanelResizeTop'), null, 'top');
setupPanelResizeHandle(devPanel, document.getElementById('devPanelResizeBottom'), null, 'bottom');
setupPanelResizeHandle(devPanel, document.getElementById('devPanelResizeLeft'), 'left', null);
setupPanelResizeHandle(devPanel, document.getElementById('devPanelResizeRight'), 'right', null);
setupPanelResizeHandle(devPanel, document.getElementById('devPanelResizeTL'), 'left', 'top');
setupPanelResizeHandle(devPanel, document.getElementById('devPanelResizeTR'), 'right', 'top');
setupPanelResizeHandle(devPanel, document.getElementById('devPanelResizeBL'), 'left', 'bottom');
setupPanelResizeHandle(devPanel, document.getElementById('devPanelResizeBR'), 'right', 'bottom');

// Native `resize` sets width/height directly on the element - catch
// the result here and persist it, same as the round-breakdown panel.
new ResizeObserver((entries) => {
    for (const entry of entries) {
        const w = Math.round(entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width);
        const h = Math.round(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
        if (w > 0 && h > 0) {
            cssVars['--dev-panel-width-px'] = w;
            cssVars['--dev-panel-height-px'] = h;
        }
    }
}).observe(devPanel);

// Round breakdown panel - draggable (by its title bar) and natively
// resizable (CSS `resize: both` on the panel itself, see its own
// CSS rule). Both persist into whichever cssVars set is currently
// active (desktop/mobile) the same way every other dev-panel
// setting does, so copySettings()/saveSettings() pick them up with
// no extra code. Pointer events (not just mouse) since this panel
// is shown to real players on a loss, not just used as a dev tool -
// it should be draggable on touch too.
const roundBreakdownTitle = document.querySelector('.round-breakdown-title');
let isDraggingBreakdown = false;
let breakdownDragStart = { pointerX: 0, pointerY: 0, panelLeft: 0, panelTop: 0 };

roundBreakdownTitle.addEventListener('pointerdown', (e) => {
    // Compute the drag-start snapshot FIRST - setPointerCapture can
    // throw (e.g. for a pointerId the browser doesn't consider
    // currently active), which would silently abort the rest of
    // this handler if it ran first, leaving breakdownDragStart at
    // its stale value. Capture is a best-effort robustness aid, not
    // load-bearing - pointermove/pointerup are on `document` (below,
    // matching the existing dev-panel resizer's own pattern) so
    // dragging still tracks correctly even if capture fails.
    const rect = roundBreakdownPanel.getBoundingClientRect();
    breakdownDragStart = { pointerX: e.clientX, pointerY: e.clientY, panelLeft: rect.left, panelTop: rect.top };
    isDraggingBreakdown = true;
    roundBreakdownTitle.classList.add('dragging');
    try { roundBreakdownTitle.setPointerCapture(e.pointerId); } catch (err) { /* best-effort only */ }
});

document.addEventListener('pointermove', (e) => {
    if (!isDraggingBreakdown) return;
    const dx = e.clientX - breakdownDragStart.pointerX;
    const dy = e.clientY - breakdownDragStart.pointerY;
    const panelRect = roundBreakdownPanel.getBoundingClientRect();
    // Clamp so the panel can't be dragged fully off-screen. Live
    // feedback during the drag itself stays real-px, direct-
    // cursor-following (set as inline style, not the calc()-based
    // CSS rule) - X/Y Offset's underlying storage is vw/vh (see
    // below + the sliders' own comment), but converting on every
    // single pointermove tick and re-deriving px from THAT would
    // just be lossy round-tripping for no benefit while the drag is
    // actively live.
    const newLeft = Math.max(0, Math.min(window.innerWidth - panelRect.width, breakdownDragStart.panelLeft + dx));
    const newTop = Math.max(0, Math.min(window.innerHeight - panelRect.height, breakdownDragStart.panelTop + dy));
    roundBreakdownPanel.style.left = newLeft + 'px';
    roundBreakdownPanel.style.top = newTop + 'px';
});

function endBreakdownDrag(e) {
    if (!isDraggingBreakdown) return;
    isDraggingBreakdown = false;
    roundBreakdownTitle.classList.remove('dragging');
    if (e && e.pointerId !== undefined && roundBreakdownTitle.hasPointerCapture(e.pointerId)) {
        roundBreakdownTitle.releasePointerCapture(e.pointerId);
    }
    // Persist the drag's final real-px position as vw/vh, ONCE,
    // here at drag-end (not per-tick, matching the dev panel's own
    // drag-persistence pattern) - reads the panel's own live
    // getBoundingClientRect() rather than re-deriving from
    // pointermove's last delta, so this is correct regardless of
    // how the live drag above computed its position.
    {
        const activeVars = isMobileActive() ? getActiveMobileVars() : cssVars;
        const rect = roundBreakdownPanel.getBoundingClientRect();
        // X/Y Offset Px checkbox (see applyRoundBreakdownPosition()'s
        // own comment) - stores the real px directly when checked,
        // instead of always converting to a vw/vh percentage; a
        // drag would otherwise silently overwrite a px-mode value
        // with a fresh percentage every time, reverting the toggle.
        activeVars['--round-breakdown-left-vw'] = activeVars['--round-breakdown-x-offset-unit-is-px'] ? Math.round(rect.left) : +(rect.left / window.innerWidth * 100).toFixed(3);
        activeVars['--round-breakdown-top-vh'] = activeVars['--round-breakdown-y-offset-unit-is-px'] ? Math.round(rect.top) : +(rect.top / window.innerHeight * 100).toFixed(3);
    }
    // Align/Valign + Edge Lock (dev-panel controls) - while dragging,
    // pointermove above always writes a plain absolute left/top (the
    // panel follows the cursor directly, same as before this
    // feature). If Align/Valign is edge-locked, --round-breakdown-
    // left-vw/-top-vh need to mean "gap from the locked edge" (see
    // applyRoundBreakdownPosition()'s own comment) everywhere else,
    // so re-derive that gap here, once, right after the drag that
    // just set an absolute position - not on every pointermove tick.
    {
        // Align/Valign/Edge Lock are shared/single-bucket (always
        // read from desktop cssVars, never the per-device object -
        // see this group's own opening comment) - width/height/left/
        // top ARE per-device, so those still come from activeVars.
        const activeVars = isMobileActive() ? getActiveMobileVars() : cssVars;
        const align = cssVars['--round-breakdown-align'] || 'left';
        const valign = cssVars['--round-breakdown-valign'] || 'top';
        // In vw/vh, "gap from the right/bottom edge" is just
        // 100 - size - offset - no window.innerWidth/innerHeight
        // needed at all (100vw/100vh IS the full viewport by
        // definition), simpler than the old px-based math here.
        // In Px mode (see applyRoundBreakdownPosition()'s own
        // comment), the equivalent gap needs the real viewport
        // size back, same as the pre-vw-conversion math did.
        const widthVw = activeVars['--round-breakdown-width-vw'] || 20;
        const heightVh = activeVars['--round-breakdown-height-vh'] || 45;
        const widthPx = widthVw / 100 * window.innerWidth;
        const heightPx = heightVh / 100 * window.innerHeight;
        if (align === 'right' && cssVars['--round-breakdown-align-edge-lock']) {
            activeVars['--round-breakdown-left-vw'] = activeVars['--round-breakdown-x-offset-unit-is-px']
                ? Math.round(window.innerWidth - widthPx - activeVars['--round-breakdown-left-vw'])
                : +(100 - widthVw - activeVars['--round-breakdown-left-vw']).toFixed(3);
        }
        if (valign === 'bottom' && cssVars['--round-breakdown-valign-edge-lock']) {
            activeVars['--round-breakdown-top-vh'] = activeVars['--round-breakdown-y-offset-unit-is-px']
                ? Math.round(window.innerHeight - heightPx - activeVars['--round-breakdown-top-vh'])
                : +(100 - heightVh - activeVars['--round-breakdown-top-vh']).toFixed(3);
        }
    }
    // X/Y Offset dev-panel sliders - keep their displayed value in
    // sync with a direct drag, per explicit request ("responsive to
    // if i click and drag the box around"). Only at drag END (not
    // every pointermove) - syncSlidersFromState() walks every
    // slider in CSS_VAR_SLIDER_MAP, and per this file's own
    // documented Undo/Load performance lesson, that's cheap ONCE
    // per gesture (its own internal deferApply batching) but would
    // add up fast called on every drag tick.
    syncSlidersFromState();
    applyRoundBreakdownPosition();
}
document.addEventListener('pointerup', endBreakdownDrag);
document.addEventListener('pointercancel', endBreakdownDrag);

// Custom resize handle - same reasoning and pattern as the dev
// panel's own (native CSS `resize` isn't touch-draggable on most
// mobile browsers, and this panel is shown to real players on
// mobile after a loss, making that gap more important here, not
// less).
const roundBreakdownResizeHandle = document.getElementById('roundBreakdownResizeHandle');
let isResizingBreakdown = false;
let breakdownResizeStart = { pointerX: 0, pointerY: 0, width: 0, height: 0 };

roundBreakdownResizeHandle.addEventListener('pointerdown', (e) => {
    const rect = roundBreakdownPanel.getBoundingClientRect();
    breakdownResizeStart = { pointerX: e.clientX, pointerY: e.clientY, width: rect.width, height: rect.height };
    isResizingBreakdown = true;
    try { roundBreakdownResizeHandle.setPointerCapture(e.pointerId); } catch (err) { /* best-effort only */ }
});

document.addEventListener('pointermove', (e) => {
    if (!isResizingBreakdown) return;
    const cs = getComputedStyle(roundBreakdownPanel);
    const minW = parseFloat(cs.minWidth) || 0, maxW = parseFloat(cs.maxWidth) || Infinity;
    const minH = parseFloat(cs.minHeight) || 0, maxH = parseFloat(cs.maxHeight) || Infinity;
    const newWidth = Math.max(minW, Math.min(maxW, breakdownResizeStart.width + (e.clientX - breakdownResizeStart.pointerX)));
    const newHeight = Math.max(minH, Math.min(maxH, breakdownResizeStart.height + (e.clientY - breakdownResizeStart.pointerY)));
    roundBreakdownPanel.style.width = newWidth + 'px';
    roundBreakdownPanel.style.height = newHeight + 'px';
});

function endBreakdownResize(e) {
    if (!isResizingBreakdown) return;
    isResizingBreakdown = false;
    if (e && e.pointerId !== undefined && roundBreakdownResizeHandle.hasPointerCapture(e.pointerId)) {
        roundBreakdownResizeHandle.releasePointerCapture(e.pointerId);
    }
    // Width/Height dev-panel sliders - same reasoning as
    // endBreakdownDrag()'s own sync call just above.
    syncSlidersFromState();
    // Safety-net duplicate of the ResizeObserver's own inline-
    // style cleanup (see its own comment) - ResizeObserver
    // callbacks fire on their own async batch timing, not
    // synchronously with this pointerup handler, so there's no
    // strict guarantee its !isResizingBreakdown-gated cleanup
    // always lands after this flag flips false above. Harmless if
    // the observer already did it (removeProperty on an already-
    // unset property is a no-op).
    roundBreakdownPanel.style.removeProperty('width');
    roundBreakdownPanel.style.removeProperty('height');
}
document.addEventListener('pointerup', endBreakdownResize);
document.addEventListener('pointercancel', endBreakdownResize);

// Native `resize` (the panel's own CSS) sets width/height directly on
// the element - catch the result here and persist it the same way,
// converting real-px (getBoundingClientRect etc. are inherently px)
// to vw/vh at this one persistence boundary.
new ResizeObserver((entries) => {
    const activeVars = isMobileActive() ? getActiveMobileVars() : cssVars;
    for (const entry of entries) {
        const w = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (w > 0 && h > 0) {
            activeVars['--round-breakdown-width-vw'] = +(w / window.innerWidth * 100).toFixed(3);
            activeVars['--round-breakdown-height-vh'] = +(h / window.innerHeight * 100).toFixed(3);
        }
    }
    // Clears the resize-drag handler's own inline style.width/
    // height (set for live feedback WHILE dragging, see its own
    // pointermove handler above) now that the equivalent vw/vh has
    // been captured - per direct report ("if i shrink the browser
    // slightly, the height and placement look slightly off. It
    // should be scaling smoothly"): an inline px width/height
    // permanently shadows the CSS rule below (`width: calc(var(
    // --round-breakdown-width-vw) * 1vw)`) regardless of the
    // custom property's later value, exactly the same pitfall
    // already avoided for left/top (see this ResizeObserver's own
    // next line, and endBreakdownDrag()'s identical left/top
    // comment) - it just hadn't been applied to width/height yet.
    // Leaving these set meant the panel's SIZE silently stopped
    // tracking the viewport the instant it was ever resized once,
    // even though its POSITION kept recalculating correctly on
    // every resize (via applyRoundBreakdownPosition() below) -
    // producing exactly the "placement looks slightly off" symptom,
    // since that position math is computed from the (correctly
    // rescaling) vw/vh values while the panel's REAL on-screen size
    // stayed frozen at its old px. Guarded on !isResizingBreakdown -
    // this observer also fires DURING an active drag (the handle's
    // own pointermove sets style.width/height on every tick, which
    // is itself a size change ResizeObserver reports), and clearing
    // the inline style mid-drag would fight that same-frame live
    // feedback instead of just cleaning up after it ends.
    if (!isResizingBreakdown) {
        roundBreakdownPanel.style.removeProperty('width');
        roundBreakdownPanel.style.removeProperty('height');
    }
    // Re-anchor to the locked edge (if any) now that width/height
    // changed - e.g. a right-edge-locked panel should grow/shrink
    // AWAY from the right edge, not just get wider while its left
    // edge stays put. Comes free from applyRoundBreakdownPosition()
    // always recomputing left/top from the CURRENT width/height.
    applyRoundBreakdownPosition();
}).observe(roundBreakdownPanel);

// Align/Valign + Edge Lock (dev-panel controls: Horizontal/Vertical
// Alignment selects, Horizontal/Vertical Edge Lock checkboxes) - per
// direct request ("Provide the Left right align and top bottom
// align settings for the Round breakdown panel. Also the Edge Lock
// selector."). This panel is a draggable position:fixed box, so it
// gets its own small, analogous mechanism instead of being forced
// through the generic centered/translate(-50%) text-anchor system
// every OTHER element's Align/Valign/Edge Lock uses (see
// applyTextAlignAnchors()'s own comment): --round-breakdown-left-vw/
// -top-vh mean "gap from the LEFT/TOP edge" when Align/Valign is
// left/top (unchanged from before this feature), or "gap from the
// RIGHT/BOTTOM edge" when Align/Valign is right/bottom AND that
// axis is edge-locked - matching this codebase's existing
// convention that the Align/Valign dropdown alone has no visual
// effect until Edge Lock is also checked (see
// applyTextAlignAnchors()'s "Unlocked (defaults) is untouched"
// comment) - so Right/Bottom without Edge Lock is a deliberate
// no-op, not a bug, for consistency with every other element's own
// Align+Edge-Lock pairing in this file. Called instead of relying
// on a pure-CSS calc() (unlike the text-anchor system) because this
// panel already has JS-driven position via drag/resize, and keeping
// this logic in one place alongside the drag/resize code it has to
// cooperate with was simpler and less error-prone than splitting it
// across CSS and JS.
// Maps a Stage 2 engine element id back to the real DOM element it
// represents, for Round Breakdown's own relative-mode rendering
// below (relativeTo is user-chosen via the Inspector - could be
// ANY registered object, unlike Target Suffix/Prefix's fixed,
// hardcoded relationship to Target Number specifically). Covers
// every object currently offered by the Inspector's own Object
// picker; a ResultText id maps to the shared #resultText element
// (Win and Lose both render through it), TryAgain to the shared
// #startButton (a class-toggled state, not a separate element).
function stage2ResolveRelativeToDomElement(elementId) {
    const map = {
        stage2HighScoreX: 'highScoreText',
        stage2StartX: 'startButton', stage2TryAgainX: 'startButton',
        stage2TryAgainQuestionMarkX: 'startButtonFlashChar',
        stage2WinX: 'resultText', stage2LoseX: 'resultText',
        stage2RoundTextX: 'gameText',
        stage2SpeedX: 'speedDisplay', stage2MsPerClickX: 'msPerClickDisplay',
        stage2TargetNumberX: 'targetCountNumber',
        stage2TargetSuffix: 'targetCountSuffix',
        stage2TargetPrefixX: 'targetCountPrefix', stage2TargetPrefixY: 'targetCountPrefix',
        stage2ButtonX: 'buttonAssembly',
    };
    const domId = map[elementId];
    return domId ? document.getElementById(domId) : null;
}
// Round Breakdown relative-mode positioning (2026-09-23) - direct
// follow-up: "When i change the anchor settings to relative, i
// still want the xy offset sliders to choose the gap." Unlike
// Target Suffix/Prefix (a pure-CSS var-reference switch - see
// updateTargetAnchoredPositions()'s own comment), Round Breakdown's
// position was ALWAYS plain JS-computed anchor math with no concept
// of "relative to another element" at all, so this needed genuinely
// new logic, not just wiring. Same simplification this codebase
// already established for Target Suffix/Prefix: MODE and GAP have
// real effect; the specific myAnchor/targetAnchor 9-point choice
// does not (updateTargetAnchoredPositions() reads only .mode from
// stage2EngineOverrides, never myAnchor/targetAnchor either) -
// hardcoded here to top-left-of-panel relative to bottom-left-of-
// target, matching the exact relationship the user's own earlier
// Inspector exploration already used. Re-measured on every call to
// applyRoundBreakdownPosition() (window resize, and every real
// slider/Inspector edit via reapply()) - does NOT independently
// watch the target element for a resize caused by some OTHER,
// unrelated control (e.g. live-editing the target's own font size
// via its own real slider) the way updateTargetAnchoredPositions()'s
// dedicated ResizeObserver does; a disclosed v1 simplification,
// not a full dependency-tracking system - good enough for the
// common case (choosing the relation, then tuning gap) but a
// genuinely independent resize of the target won't re-trigger this
// until the next window resize or Round Breakdown edit.
function stage2ApplyRoundBreakdownRelativePosition(saved) {
    const relPos = saved.position;
    const targetEl = stage2ResolveRelativeToDomElement(relPos.relativeTo);
    if (!targetEl || !roundBreakdownPanel.offsetParent) return false;
    const containerRect = roundBreakdownPanel.offsetParent.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const gap = (relPos.gap && typeof relPos.gap === 'object') ? relPos.gap : {};
    const gapXPx = parseFloat(gap.x) || 0;
    const gapYPx = parseFloat(gap.y) || 0;
    const left = (targetRect.left - containerRect.left) + gapXPx;
    const top = (targetRect.bottom - containerRect.top) + gapYPx;
    roundBreakdownPanel.style.left = left + 'px';
    roundBreakdownPanel.style.top = top + 'px';
    return true;
}
function applyRoundBreakdownPosition() {
    if (!roundBreakdownPanel || isDraggingBreakdown) return;
    const savedRb = (typeof stage2EngineOverrides !== 'undefined') ? stage2EngineOverrides['stage2RoundBreakdownX'] : null;
    if (savedRb && savedRb.position && savedRb.position.mode === 'relative') {
        if (stage2ApplyRoundBreakdownRelativePosition(savedRb)) return;
        // relativeTo target not resolvable (e.g. not yet rendered,
        // or an id that no longer exists) - fall through to the
        // normal anchor-mode formula below rather than leaving the
        // panel at a stale or undefined position.
    }
    // Align/Valign/Edge Lock: shared, always cssVars (see
    // endBreakdownDrag()'s identical fix/comment - a real bug found
    // via live testing on a narrow/Mobile-active viewport: reading
    // these through activeVars silently no-op'd on Mobile/Landscape
    // since neither var object has these keys, only desktop cssVars
    // does). Width/height/left/top ARE per-device, and (per direct
    // request) now vw/vh-native, so the real px position for THIS
    // viewport is derived here, once, at render time.
    const activeVars = isMobileActive() ? getActiveMobileVars() : cssVars;
    const align = cssVars['--round-breakdown-align'] || 'left';
    const valign = cssVars['--round-breakdown-valign'] || 'top';
    const widthVw = activeVars['--round-breakdown-width-vw'] || 20;
    const heightVh = activeVars['--round-breakdown-height-vh'] || 45;
    const offsetXVw = activeVars['--round-breakdown-left-vw'] || 0;
    const offsetYVh = activeVars['--round-breakdown-top-vh'] || 0;
    const width = widthVw / 100 * window.innerWidth;
    const height = heightVh / 100 * window.innerHeight;
    // X/Y Offset Px checkbox (2026-09-19, "also provide the Px
    // checkbox for x and y offset of the Round Breakdown panel") -
    // per-device, same as the offset values themselves. When
    // checked, the stored number is ALREADY px (setupOffsetUnitCheckboxes()'s
    // own toggle handler converts it at flip time), so it's used
    // directly instead of being treated as a vw/vh percentage.
    const offsetX = activeVars['--round-breakdown-x-offset-unit-is-px'] ? offsetXVw : offsetXVw / 100 * window.innerWidth;
    const offsetY = activeVars['--round-breakdown-y-offset-unit-is-px'] ? offsetYVh : offsetYVh / 100 * window.innerHeight;
    const left = (align === 'right' && cssVars['--round-breakdown-align-edge-lock']) ? (window.innerWidth - width - offsetX) : offsetX;
    const top = (valign === 'bottom' && cssVars['--round-breakdown-valign-edge-lock']) ? (window.innerHeight - height - offsetY) : offsetY;
    roundBreakdownPanel.style.left = left + 'px';
    roundBreakdownPanel.style.top = top + 'px';
}
window.addEventListener('resize', applyRoundBreakdownPosition);

// Game logic
// Round Text no longer grows to a "big" state or animates at all -
// per explicit request, it always renders at its one permanent
// look (.game-text's CSS reads --round-dock-* directly, unconditionally).
// dockRoundText()/undockRoundText() are gone entirely - there's
// nothing left to toggle between.
function showRoundText(roundNum) {
    gameState.canTap = false;
    // Captured BEFORE resultText's own .result-lose class gets
    // cleared below - per direct report ("when a player loses, and
    // they click try again, the numbers flashing animation should
    // also occur"). Try Again always resets gameState.currentRound
    // to 1 (see startGame()), which very often EQUALS whatever
    // round the player just lost on (most commonly round 1 itself,
    // the single most frequent case) - hadPreviousRound below only
    // triggers the blink/flash sequence when the displayed number
    // actually differs from the new one, so a same-number reset
    // silently skipped the whole sequence, flash checkbox and all.
    // Forces it back on specifically for a Lose->Try Again
    // transition, regardless of whether the number happens to
    // match - a genuinely fresh page load (nothing shown yet) is
    // still correctly excluded, since gameTextNumber.textContent
    // is empty at that point either way.
    const wasLoseTransition = resultText.classList.contains('result-lose');
    gameText.classList.remove('hidden');
    // Hidden here explicitly (not left for showTargetAndSpeed() to
    // hide later) - a REAL pre-existing overlap, found while
    // building this: the win path's resultText (":)"), never
    // explicitly hidden until showTargetAndSpeed() ran at the END
    // of the round-announcement phase, was staying on screen for
    // the entire announcement window, directly on top of it. Per
    // explicit request the Round text must never overlap the
    // Win/Lose text, so it's hidden right here instead, before the
    // announcement even starts.
    resultText.classList.add('hidden');
    // Per explicit request ("provide me a checkbox, when selected,
    // all 3 of those texts will flash along with the round
    // number") - when the flash checkbox is on, don't flatly hide
    // them for the whole announcement; runRoundBlinkSequence()'s
    // own step() toggles their visibility in lockstep with the
    // round number's own blink phases instead. Default (off)
    // behavior is completely unchanged - flat hide, same as
    // always.
    if (!cssVars['--gameplay-result-flash-with-round']) {
        targetCount.classList.add('hidden');
        speedDisplay.classList.add('hidden');
        msPerClickDisplay.classList.add('hidden');
    }

    // "Round" is always this - it's a separate element from the
    // number specifically so it never has to move or re-render
    // when the number blinks/changes (see #gameTextLabel's own CSS
    // comment).
    gameTextLabel.textContent = overrideOr('roundLabel');

    const hadPreviousRound = (!!gameTextNumber.textContent && gameTextNumber.textContent !== String(roundNum)) || wasLoseTransition;
    if (!hadPreviousRound) {
        // Nothing to blink away from (very first round of a game,
        // or already showing this exact round) - just show it and
        // start gameplay immediately, no held announcement delay.
        // Per direct request ("the Round Text should appear the
        // same time as the other text when i click start") -
        // Target/Speed/Ms-per-click were only hidden a moment
        // earlier in THIS function specifically so Round Text could
        // have its own brief solo announcement before gameplay
        // began; calling showTargetAndSpeed() synchronously right
        // back removes that stagger entirely for the very first
        // round of a game, so everything appears together in the
        // same paint. Round transitions AFTER a win (the blink-
        // sequence branch below) are unaffected - not what was
        // asked here, and that hold has a real purpose (showing the
        // OLD number before it blinks away).
        gameTextNumber.textContent = roundNum;
        gameTextNumber.style.visibility = 'visible';
        showTargetAndSpeed();
        return;
    }

    // The OLD number stays on screen (still at its one permanent
    // size), then runs the blink sequence immediately, then starts
    // gameplay. Corrected 2026-09-14 per direct request ("remove
    // round duration") - there used to be a hold here (the "Round
    // Text Duration" slider) before the blink sequence started;
    // removed, along with the slider itself - the blink now begins
    // the instant the round transition is logged.
    runRoundBlinkSequence(roundNum);
}

// Flashes the OLD round number 3 complete times (hide/show x3),
// THEN reveals the new value - per explicit request ("make it 3
// flashes, then the new number"). Each flash's hide/show duration
// is its own slider (6 total). The word "Round" is untouched
// throughout - only #gameTextNumber's visibility toggles (not its
// removal from layout - see its own CSS comment for why that
// specifically avoids shifting "Round").
function runRoundBlinkSequence(roundNum) {
    const phases = [
        { visible: false, ms: cssVars['--round-blink1-hide-ms'] },
        { visible: true, ms: cssVars['--round-blink1-show-ms'] },
        { visible: false, ms: cssVars['--round-blink2-hide-ms'] },
        { visible: true, ms: cssVars['--round-blink2-show-ms'] },
        { visible: false, ms: cssVars['--round-blink3-hide-ms'] },
        { visible: true, ms: cssVars['--round-blink3-show-ms'] },
        // Per direct follow-up request ("add a Blink 4 - Disappear
        // slider, after which the new round number shows") -
        // supersedes the earlier parallel-timer "disappear after"
        // design (which showed the new number immediately then hid
        // it again, and needed a same-tick-race fix). This is
        // simpler and race-free by construction: a genuine 4th
        // phase in the SAME sequential chain as Blink 1-3, still
        // showing the OLD number, hidden for its own duration -
        // ONLY once this phase elapses does the swap to the new
        // number happen, below.
        { visible: false, ms: cssVars['--round-blink4-hide-ms'] },
    ];
    let i = 0;
    function step() {
        if (i >= phases.length) {
            gameTextNumber.textContent = roundNum;
            gameTextNumber.style.visibility = 'visible';
            // When flashing with the round number, Target/Speed/
            // Ms-per-click's FINAL (new-round) values must appear in
            // the SAME paint as the round number - per explicit
            // request ("make them show up the same time as the
            // round number"). showTargetAndSpeed() is what actually
            // computes those final values and reveals them (it also
            // flips gameState.canTap true, starting gameplay), so it
            // has to run right here instead of after the extra
            // --round-post-blink-hold-ms wait below - that wait was
            // otherwise re-introducing exactly the stagger being
            // asked to remove (round number flips immediately, but
            // the other 3 stayed hidden at their last blink-phase
            // state for the full hold duration before finally
            // updating). Default (flag off) behavior is unchanged -
            // still holds before showTargetAndSpeed() runs.
            if (cssVars['--gameplay-result-flash-with-round']) {
                showTargetAndSpeed();
                return;
            }
            // Holds the new number on screen for its own duration
            // (--round-post-blink-hold-ms) before gameplay starts -
            // per explicit request for a dedicated slider covering
            // this gap. There's no longer a separate hold BEFORE
            // the blink sequence starts (see this function's own
            // top-level comment) - this is the only hold now.
            setTimeout(() => {
                showTargetAndSpeed();
            }, cssVars['--round-post-blink-hold-ms']);
            return;
        }
        const phase = phases[i++];
        gameTextNumber.style.visibility = phase.visible ? 'visible' : 'hidden';
        // Per explicit request ("provide me a checkbox, when
        // selected, all 3 of those texts will flash along with the
        // round number") - see showRoundText()'s own comment for
        // why they're not flatly hidden for the announcement when
        // this is on. Toggles ONLY the live NUMBER, never any static
        // word alongside it - per direct follow-up request ("i want
        // only the numbers to blink, not the words"). targetCount is
        // toggled as a whole element since it's always a bare number
        // during real gameplay (no word ever renders inside it live -
        // see its own TEXT_EDIT_TARGETS comment); speedDisplay/
        // msPerClickDisplay each have their own number/suffix child
        // spans specifically for this (see their own HTML comment) -
        // only *Number is touched, so " ms"/"CLICK" etc. stay put
        // and visible throughout, same as "ROUND" already does
        // alongside gameTextNumber above.
        if (cssVars['--gameplay-result-flash-with-round']) {
            // targetCount used to be toggled as a whole element
            // here (it had no separate word to preserve, unlike
            // speed/msPerClick) - now that it has its own Prefix/
            // Suffix spans too, blinks targetCountNumber AND
            // targetCountSuffix ("x") together - per direct request
            // ("the Target 'x' should flash with the Target
            // number"), same as "ms"/"CLICK" stay static alongside
            // their own numbers.
            [targetCountNumber, targetCountSuffix, speedDisplayNumber, msPerClickDisplayNumber].forEach(el => {
                el.style.visibility = phase.visible ? 'visible' : 'hidden';
            });
        }
        setTimeout(step, phase.ms);
    }
    step();
}

// High Score blink - per direct request ("when the current
// highscore has been beaten. The high score number will flash
// alongside the other numbers to transition to the new number.
// If the highscore number doesnt require change then there will
// be no flash"). Corrected 2026-09-14 per 2 direct follow-ups:
// (1) "it doesn't need its own animation flashing settings. It
// will just use the same settings that it already have" - reuses
// the round number's own Blink 1-4 timers (--round-blink1 through
// --round-blink4-hide-ms) below, not a dedicated set (an earlier
// version of this function had its own '--high-score-blink*-ms'
// fields - removed). (2) "I want its own delay slider such that
// it's not hard coded to come after this win lose text. It can
// happen at the same time or during or after, just depending on
// what delay I set it as" - --high-score-flash-delay-ms (High
// Score dev-panel group's own "Flash Delay (ms):" slider, default
// 0 = starts the same instant as the loss, matching this
// function's original synchronous-trigger behavior) delays the
// START of the sequence below by that many ms; deliberately NO
// hardcoded relationship enforced against Result Text Duration
// (sliderResultDuration) - per explicit follow-up ("never mind...
// the win-lose text duration can be longer than the flash
// durations as long as the flashing delay accounts for that"),
// tuning the two against each other is left to this slider, not a
// clamp in code. Only called at all when checkHighScore() has
// already confirmed the score actually changed, so "no flash when
// unchanged" needs no separate guard here.
function runHighScoreBlinkSequence(newScore) {
    const phases = [
        { visible: false, ms: cssVars['--round-blink1-hide-ms'] },
        { visible: true, ms: cssVars['--round-blink1-show-ms'] },
        { visible: false, ms: cssVars['--round-blink2-hide-ms'] },
        { visible: true, ms: cssVars['--round-blink2-show-ms'] },
        { visible: false, ms: cssVars['--round-blink3-hide-ms'] },
        { visible: true, ms: cssVars['--round-blink3-show-ms'] },
        { visible: false, ms: cssVars['--round-blink4-hide-ms'] },
    ];
    let i = 0;
    function step() {
        if (i >= phases.length) {
            highScoreNumber.textContent = newScore;
            highScoreNumber.style.visibility = 'visible';
            return;
        }
        const phase = phases[i++];
        highScoreNumber.style.visibility = phase.visible ? 'visible' : 'hidden';
        setTimeout(step, phase.ms);
    }
    setTimeout(step, cssVars['--high-score-flash-delay-ms'] || 0);
}

// Blinks the "?" in "Try again?" - per explicit request. Hold
// (visible) then Flash (hidden) then repeat, for as long as the
// Try Again state is on screen - stopped via stopTryAgainFlash()
// whenever that state ends (a new game starts, or an R-key reset).
// Corrected 2026-09-14 per direct request ("Flashing is the
// default and only option now. The previous ? rotating animation
// is now defunct."): this used to branch into an alternate
// rotate-mode animation (tickTryAgainRotate()/
// easeTryAgainRotateProgress(), both removed) - flash is now the
// only behavior.
function startTryAgainFlash() {
    stopTryAgainFlash();
    function cycle(visible) {
        const charEl = document.getElementById('startButtonFlashChar');
        if (!charEl) return; // defensive only - this is a permanent element now
        // opacity, not visibility - see #startButtonFlashChar's own
        // will-change:opacity CSS comment for why (a visibility
        // toggle forces a real repaint of this element's own heavy
        // multi-layer extrusion shadow on the main thread; opacity
        // on a will-change-promoted element is compositor-only).
        // pointer-events:none already makes this element ignore
        // clicks regardless of visibility state, so nothing else
        // depended on the old visibility-specific behavior.
        charEl.style.opacity = visible ? '1' : '0';
        const delay = visible ? cssVars['--try-again-hold-duration-ms'] : cssVars['--try-again-flash-duration-ms'];
        tryAgainFlashTimeoutId = setTimeout(() => cycle(!visible), delay);
    }
    cycle(true);
}

function stopTryAgainFlash() {
    if (tryAgainFlashTimeoutId) { clearTimeout(tryAgainFlashTimeoutId); tryAgainFlashTimeoutId = null; }
}

function showTargetAndSpeed() {
    const targetFloor = gameState.targetFloorBase + (gameState.currentRound - 1) * gameState.targetFloorIncreasePerRound;
    // Ceiling mirrors the floor's own base+per-round-increase shape -
    // per explicit request that the target range be independently
    // capped at both ends. Clamped to never fall below targetFloor
    // (e.g. if the ceiling's own increase is set slower than the
    // floor's) so the random range below is never inverted/negative.
    const targetCeiling = Math.max(targetFloor, gameState.targetCeilingBase + (gameState.currentRound - 1) * gameState.targetCeilingIncreasePerRound);
    // Re-roll until it differs from the PREVIOUS round's target -
    // per explicit request that target numbers never repeat back to
    // back. Only re-rolls when there's a real previous round to
    // avoid (skipped on round 1) AND the range actually has more
    // than one possible value (targetCeiling > targetFloor) - a
    // single-value range can never avoid repeating by definition,
    // so that guard prevents an infinite loop rather than silently
    // failing to satisfy an impossible constraint.
    const previousTargetCount = gameState.targetCount;
    do {
        gameState.targetCount = Math.floor(Math.random() * (targetCeiling - targetFloor + 1)) + targetFloor;
    } while (gameState.currentRound > 1 && targetCeiling > targetFloor && gameState.targetCount === previousTargetCount);
    // Round 1 plays at exactly the Starting Time slider value, no
    // decrease applied - per explicit request/correction. startGame()
    // already sets gameState.maxTimeMs straight from that slider, so
    // skipping the whole decrease/rounding/floor block on round 1
    // leaves it untouched. Every other round's math is unchanged -
    // the exponent below still counts from round 1 (currentRound - 1),
    // it just never gets evaluated when currentRound is 1.
    if (gameState.currentRound > 1) {
        // effectiveDecrease shrinks each round when speedDecreaseDecay
        // < 1 (exponential decay, compounded per round - see its own
        // gameState comment) - per explicit request that the speed-
        // limit increase gets smaller at higher rounds. Floored at 1ms
        // rather than continuing to decay toward 0 - per explicit
        // follow-up ("once it hits 1ms per round, it just stays at 1
        // from there on").
        const baseSpeedDecrease = gameState.speedDecrease * Math.pow(gameState.speedDecreaseDecay, gameState.currentRound - 1);
        // Tolerance jitter: a fresh +/- speedDecreaseDecayTolerance%
        // random swing applied to THIS round's decay only (not
        // compounded into the exponent future rounds are based on) -
        // per explicit request, re-rolled every round.
        const toleranceFraction = gameState.speedDecreaseDecayTolerance / 100;
        const jitter = 1 + (Math.random() * 2 - 1) * toleranceFraction;
        const effectiveSpeedDecrease = Math.max(1, baseSpeedDecrease * jitter);
        let nextMaxTimeMs = gameState.maxTimeMs - effectiveSpeedDecrease;
        // Rounds to the nearest multiple of speedTimeRounding (1 = no-op)
        // BEFORE the 100ms floor below, so the floor still holds exactly
        // even if rounding would otherwise push a near-floor value under it.
        if (gameState.speedTimeRounding > 1) {
            nextMaxTimeMs = Math.round(nextMaxTimeMs / gameState.speedTimeRounding) * gameState.speedTimeRounding;
        }
        gameState.maxTimeMs = Math.max(100, nextMaxTimeMs);
    }
    // currentTapCount and friends are correctly PER-ROUND state - reset
    // here every time a new round begins, same as always.
    gameState.currentTapCount = 0;
    gameState.isCountingTaps = false;
    stopRoundCountdown();
    currentRoundTaps = [];
    roundStartTime = Date.now();
    // totalClickCount and lastAcceptedTapTime are NOT per-round state -
    // they're the session-wide click counter/debounce-history, and used
    // to reset here too (this function runs at the start of EVERY round,
    // not just the first). That silently wiped whatever the counter
    // showed mid-session on every round transition, while the tap-
    // diagnostic log (which never resets) kept every entry regardless -
    // a real, confirmed source of "the log shows more taps than the
    // counter/than I counted" reports, since the two could silently
    // diverge at any round boundary. Removed - both are now genuinely
    // session-wide, only ever reset by startGame() (a fresh game) or
    // the dev 'r' reset shortcut, matching the tap log's own lifetime
    // and guaranteeing the visible counter and the log can never
    // disagree again.
    //
    // gameText (Round Text) is deliberately NOT hidden here anymore -
    // it's already been docked to its small corner position by
    // showRoundText()'s own setTimeout (see there) and stays visible
    // throughout gameplay instead of disappearing.
    resultText.classList.add('hidden');
    // The next round genuinely begins here - this is the single
    // choke point every code path funnels through (the fast path
    // in showRoundText() itself, and both branches of
    // runRoundBlinkSequence()'s own completion) - so it's also
    // where the button/base's Win/Lose tint (driven purely by
    // resultText carrying .result-win/.result-lose, see the
    // :has() CSS rule's own comment) should revert, not any
    // earlier. Per direct report ("the button and base color
    // looks wrong after i click try again... should stay the
    // same color as the gameplay lose colors [through the
    // announcement]"): this used to run at the very START of
    // showRoundText(), the instant Try Again was clicked - firing
    // well before the round announcement/blink sequence even
    // began, while every OTHER lose-tint mechanism (Target/Speed/
    // Ms-per-click/Round Text's fill color, the button/base's own
    // Light Levels contrast/lightness override just below) stayed
    // tinted correctly until this exact point. Moved here so
    // every gameplay-result-color mechanism reverts in lockstep.
    resultText.classList.remove('result-win', 'result-lose');
    // The next round begins here - reverts Target/Speed/Ms-per-
    // click back to their normal (untinted) color, per explicit
    // request (any flash-with-round-number toggling started during
    // the just-finished announcement is moot from here on, since
    // every remove('hidden') below unconditionally makes them
    // visible again anyway, AND the explicit style.visibility resets
    // just below undo runRoundBlinkSequence()'s own toggling of
    // those same elements - its last phase always ends on
    // visible:false, and classList.remove('hidden') alone doesn't
    // touch a separate inline style.visibility, so without this
    // reset targetCount/targetCountSuffix/speedDisplayNumber/
    // msPerClickDisplayNumber would stay invisible forever after
    // the very first flash-with-round announcement). targetCountSuffix
    // (the "x") is included here per direct bug report ("after a
    // round, the 'x' dissappears") - it was added to
    // runRoundBlinkSequence()'s own toggle array later (per "the
    // Target 'x' should flash with the Target number") but this
    // restore was never updated to match, so once the flash-with-
    // round checkbox is on (the default), the very first round
    // transition left it hidden permanently - the other 3 elements'
    // own restore already worked, so it looked selectively broken
    // rather than absent.
    applyGameplayResultColor(null);
    targetCountNumber.style.visibility = 'visible';
    targetCountSuffix.style.visibility = 'visible';
    speedDisplayNumber.style.visibility = 'visible';
    msPerClickDisplayNumber.style.visibility = 'visible';
    targetCountNumber.textContent = gameState.targetCount;
    targetCount.classList.remove('hidden');
    // Countdown's total budget, rounded to a whole number per
    // explicit follow-up request (see startRoundCountdown()/
    // tickRoundCountdown() for the live ticking display, which only
    // begins on the round's first tap; until then this just shows
    // the static starting value, exactly like this did before).
    gameState.roundTotalTimeMs = gameState.maxTimeMs * gameState.targetCount;
    gameState.countdownStartTime = null;
    speedDisplayNumber.textContent = gameState.roundTotalTimeMs.toFixed(0);
    speedDisplaySuffix.textContent = ' ms';
    speedDisplay.classList.remove('hidden');
    // The raw per-click rate, shown above the countdown - per
    // explicit request, since the countdown itself only shows the
    // TOTAL round budget now.
    msPerClickDisplayNumber.textContent = gameState.maxTimeMs.toFixed(0);
    renderMsPerClickSuffix(overrideOr('msPerClickSuffix'));
    msPerClickDisplay.classList.remove('hidden');
    // Target/Speed/Ms-per-click were just revealed from hidden -
    // re-run so their align/edge-lock/unit vars (set by
    // applyTextAlignAnchors(), not just --anchor-ty) are current.
    applyTextAlignAnchors();

    // Reset button color
    refreshButtonHue();

    // Only now is tapping actually meaningful - target/speed are visible
    gameState.canTap = true;
}

function logTapDiagnostic(pointerType, gapMs, outcome, e) {
    const gapText = gapMs === null ? 'first' : gapMs + 'ms';
    const n = tapDiagnosticLog.length + 1;
    // Position + pointer identity - the piece needed to actually distinguish a
    // software duplicate (same x/y, same pointerId) from a genuinely separate
    // contact (different x/y and/or a different pointerId, e.g. a trackpad
    // picking up a second point) rather than guessing from timing alone.
    const x = e ? Math.round(e.clientX) : '?';
    const y = e ? Math.round(e.clientY) : '?';
    const pid = e ? e.pointerId : '?';
    const primary = e ? e.isPrimary : '?';
    tapDiagnosticLog.push(`${n}. ${outcome} | type=${pointerType} | gap=${gapText} | pos=(${x},${y}) | id=${pid} | primary=${primary}`);
    // The array itself is deliberately uncapped (full session history,
    // per an earlier request). A previous fix skipped rendering while
    // the panel is hidden (its default state) - real, but NOT enough:
    // the user tests with this panel actually OPEN (visible in every
    // one of their screen recordings), and re-joining + re-rendering
    // the WHOLE array as text on every single tap is O(n) work that
    // grows with total taps this session - directly matching "the
    // more I click and the faster I click, the more the lag" once a
    // session has accumulated many dozens of taps across a long
    // testing conversation. Now appends just the ONE new line (a
    // single DOM text-node append, O(1)) instead, falling back to a
    // full rebuild only if the DOM has actually fallen behind the
    // array (e.g. entries piled up while the panel was hidden) -
    // rebuildTapDiagnosticDisplay() (called when the panel is toggled
    // visible, see the checkbox handler below) keeps this the common,
    // fast path rather than the exception.
    if (!tapDiagnosticPanel.classList.contains('hidden')) {
        if (tapDiagnosticRenderedCount === tapDiagnosticLog.length - 1) {
            const line = tapDiagnosticLog[tapDiagnosticLog.length - 1];
            tapDiagnostic.appendChild(document.createTextNode((tapDiagnosticRenderedCount > 0 ? '\n' : '') + line));
            tapDiagnostic.scrollTop = 1e9;
            tapDiagnosticRenderedCount = tapDiagnosticLog.length;
        } else {
            rebuildTapDiagnosticDisplay();
        }
    }
}

function copyTapDiagnosticLog() {
    const text = tapDiagnosticLog.join('\n');
    const btn = document.querySelector('.tap-diagnostic-copy-btn');
    const originalText = btn.textContent;

    function showFeedback(msg) {
        btn.textContent = msg;
        setTimeout(() => { btn.textContent = originalText; }, 1500);
    }

    // Fallback that doesn't depend on the Clipboard API or blocking dialogs
    // (both alert/prompt and navigator.clipboard can be unavailable in some
    // sandboxed/embedded contexts) - the classic textarea+execCommand trick.
    function fallbackCopy() {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            showFeedback(ok ? 'COPIED!' : 'FAILED');
        } catch (e) {
            showFeedback('FAILED');
        }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showFeedback('COPIED!');
        }).catch(fallbackCopy);
    } else {
        fallbackCopy();
    }
}

function handleGameButtonPress(pointerType, e) {
    // Visual press feedback, the click counter, and the tap diagnostic all
    // work regardless of game state - responsive on the landing page too.
    // The counter resets at the start of every round (see showTargetAndSpeed);
    // it isn't gated to "after Round 1 starts" the way actual gameplay is.
    // Press gets its own independent transition duration, set right
    // before the class that actually triggers the transition - see
    // .game-button's own CSS comment for why this can't just be a
    // second static CSS rule.
    const activeCssVarsForPress = isMobileActive() ? getActiveMobileVars() : cssVars;
    const pressMs = activeCssVarsForPress['--button-press-ms'];
    if (pressMs > 0) {
        // Set the transition inline, directly and completely, rather than
        // through --button-active-transition-ms - a leftover non-zero
        // value in that custom property (from an earlier non-zero-
        // duration press/release) would otherwise survive into a LATER
        // zero-duration one, since the zero branch below never touches
        // it, only overrides the `transition` shorthand it feeds.
        gameButton.style.transition = `transform ${pressMs}ms ease-out`;
        gameButton.classList.add('pressed');
    } else {
        // transition:none (not just a 0ms transition) forces the pressed
        // position to apply instantly even if a still-easing transition
        // from a prior rapid tap hasn't fully settled yet - a genuinely
        // zero duration should never be subject to the interruption
        // tradeoff described above for a real (non-zero) duration.
        gameButton.style.transition = 'none';
        gameButton.classList.add('pressed');
        void gameButton.offsetHeight;
    }
    shadowCasterButtonLayer.classList.add('pressed');
    setShadowButtonPressed(true);

    const now = Date.now();
    const isFirstTap = lastAcceptedTapTime === 0;
    const gapMs = isFirstTap ? null : now - lastAcceptedTapTime;
    const posDist = (isFirstTap || !e) ? null :
        Math.hypot(e.clientX - lastAcceptedX, e.clientY - lastAcceptedY);

    // Debounce: 50ms by default (see TAP_DEBOUNCE_MS's declaration above for
    // why). Rejection still requires BOTH a short gap AND near-identical
    // position, since time alone can't safely separate a hardware duplicate
    // from a genuinely fast real tap.
    if (!isFirstTap && gapMs < TAP_DEBOUNCE_MS && posDist !== null && posDist <= TAP_DEBOUNCE_POS_TOLERANCE_PX) {
        logTapDiagnostic(pointerType, gapMs, 'rejected-bounce', e);
        return;
    }

    // Some mobile browsers fire a synthetic compatibility mouse pointerdown
    // ~300ms after a real touch tap. Catch that specific pattern even though
    // it's outside the debounce window above.
    if (!isFirstTap && pointerType === 'mouse' && lastAcceptedPointerType === 'touch' && gapMs < TOUCH_COMPAT_WINDOW_MS) {
        logTapDiagnostic(pointerType, gapMs, 'rejected-touch-compat', e);
        return;
    }

    lastAcceptedTapTime = now;
    lastAcceptedPointerType = pointerType;
    if (e) { lastAcceptedX = e.clientX; lastAcceptedY = e.clientY; }
    logTapDiagnostic(pointerType, gapMs, 'accepted', e);
    spawnClickBurst();

    totalClickCount++;
    clickCounter.textContent = totalClickCount;

    // Everything below is real gameplay logic - only meaningful once a round
    // has actually started and the target/speed are visible.
    if (!gameState.isPlaying || !gameState.canTap) return;

    // There is no minimum-speed floor - tap as fast as you want, every tap
    // counts immediately. The round has one total time budget
    // (roundTotalTimeMs = maxTimeMs * targetCount, see
    // showTargetAndSpeed()) instead of a per-tap ceiling: if it runs
    // out before the target is reached, you lose - see
    // startRoundCountdown() below.
    gameState.isCountingTaps = true;
    gameState.currentTapCount++;
    currentRoundTaps.push(now);

    if (gameState.currentTapCount > gameState.targetCount) {
        // Overshot - lose immediately, no waiting for any timer.
        stopRoundCountdown();
        endGame(false, 'too-many');
        return;
    }

    // Per-click ceiling - per direct request/confirmation ("when
    // the click duration is more than the time/click number, I
    // dont lose. fix that"): lose immediately if the gap since the
    // PREVIOUS tap THIS ROUND exceeds maxTimeMs (the "ms/click"
    // setting), independent of the aggregate round countdown below.
    // Only checked from the 2nd tap onward - the first tap has no
    // prior tap this round to measure a gap against (time-to-
    // first-tap isn't constrained by this ceiling, same as before).
    if (currentRoundTaps.length > 1) {
        const gapSinceLastRoundTap = currentRoundTaps[currentRoundTaps.length - 1] - currentRoundTaps[currentRoundTaps.length - 2];
        if (gapSinceLastRoundTap > gameState.maxTimeMs) {
            stopRoundCountdown();
            endGame(false, 'too-slow');
            return;
        }
    }

    // Countdown starts on the round's FIRST accepted tap, not
    // before - per explicit request.
    if (gameState.currentTapCount === 1) {
        startRoundCountdown();
    }
    // (Re)arm the per-click ceiling's own ACTIVE timer on every
    // accepted tap, including the tap that reaches exactly
    // targetCount - per direct follow-up report that the reactive
    // check above never fires at all if the player simply stops
    // tapping (there's no later tap to react to), AND per a later,
    // separate direct request describing the intended win sequence
    // exactly: reach target -> this same per-click timer counts
    // down -> if it elapses with no further tap, win immediately.
    // See armPerClickTimeout() for the win-vs-lose branch this
    // timer takes when it actually fires.
    //
    // An EARLIER version of this project skipped arming (and
    // explicitly cleared) this timer once target was reached,
    // because at the time armPerClickTimeout()'s own fire handler
    // always resolved as a loss unconditionally - re-arming at
    // target meant this timer fired (falsely declaring "too-slow")
    // well before the aggregate round countdown got a chance to
    // declare the correct win, since maxTimeMs*targetCount is
    // essentially always later than (this tap's time)+maxTimeMs
    // for any targetCount > 1. That was real, but skipping the arm
    // was the wrong fix for it - it just made reaching target wait
    // out the much slower aggregate countdown instead. The actual
    // fix belongs in armPerClickTimeout() itself (checking
    // currentTapCount === targetCount when it fires), which is
    // already in place below - so arming unconditionally here, on
    // every accepted tap with no exception, is correct once again.
    armPerClickTimeout();
}

// Countdown timer replacing the old per-tap re-armed ceiling - per
// explicit request ("the moment the first click occurs, the
// countdown timer starts counting down. And when the time runs out,
// they lose"). One continuous timer for the whole round instead of
// one re-armed after every tap: a single setTimeout fires the loss
// at roundTotalTimeMs, while a separate requestAnimationFrame loop
// (tickRoundCountdown) redraws the remaining time into speedDisplay
// every frame - decoupled so the VISUAL update rate has nothing to
// do with the actual loss-timing accuracy (setTimeout), same
// reasoning as any timer/display split.
function startRoundCountdown() {
    gameState.countdownStartTime = Date.now();
    gameState.checkTimeoutId = setTimeout(() => {
        // The round resolves HERE, not on the tap that reaches
        // target (see handleGameButtonPress) - win if exactly at
        // target when time runs out, undershoot otherwise. Overshoot
        // still ends the round immediately elsewhere, so this can
        // never fire after an overshoot has already happened.
        if (gameState.currentTapCount === gameState.targetCount) {
            endGame(true);
        } else {
            endGame(false, 'not-enough');
        }
    }, gameState.roundTotalTimeMs);
    tickRoundCountdown();
}

function tickRoundCountdown() {
    const elapsed = Date.now() - gameState.countdownStartTime;
    let remaining = Math.max(0, gameState.roundTotalTimeMs - elapsed);
    // Countdown Display Rounding (Game Mechanics) - rounds the LIVE
    // ticking display to the nearest multiple; 1 = no rounding
    // (reproduces the exact-ms display this always had before).
    if (gameState.countdownRoundingIncrement > 1) {
        remaining = Math.round(remaining / gameState.countdownRoundingIncrement) * gameState.countdownRoundingIncrement;
    }
    // Rounded to a whole number - per explicit follow-up request
    // (reversing the initial "doesn't need to be rounded" ask).
    speedDisplayNumber.textContent = remaining.toFixed(0);
    speedDisplaySuffix.textContent = overrideOr('speedSuffix');
    if (remaining > 0 && gameState.isCountingTaps) {
        gameState.countdownRafId = requestAnimationFrame(tickRoundCountdown);
    }
}

// Per-click ceiling's own ACTIVE timer - (re)armed on every accepted
// tap (see handleGameButtonPress), independent of the aggregate
// round countdown above. Fires the loss ON ITS OWN if silence
// outlasts maxTimeMs, rather than waiting for a later tap to
// reactively notice the gap was too long - per direct follow-up
// report ("the lose screen should trigger the moment the Ms/Click
// time has passed since the last click", not only on the next tap).
function armPerClickTimeout() {
    if (gameState.perClickTimeoutId) { clearTimeout(gameState.perClickTimeoutId); }
    gameState.perClickTimeoutId = setTimeout(() => {
        gameState.perClickTimeoutId = null;
        if (!gameState.isPlaying || !gameState.canTap) return;
        stopRoundCountdown();
        // Exactly at target when this fires means the player
        // reached the goal and simply stopped tapping - win
        // immediately rather than waiting for the aggregate round
        // countdown to separately expire. Per explicit request:
        // "player clicks the right amount of times... timer counts
        // to see if player clicks again within the minimum time
        // duration per click... if [it] passes, immediately trigger
        // win". Below target still means genuinely too slow (the
        // pre-existing behavior, unchanged) - and above target can
        // never reach this point at all, since the overshoot check
        // in handleGameButtonPress() already ends the round the
        // instant a tap pushes the count past target.
        if (gameState.currentTapCount === gameState.targetCount) {
            endGame(true);
        } else {
            endGame(false, 'too-slow');
        }
    }, gameState.maxTimeMs);
}

function stopRoundCountdown() {
    if (gameState.checkTimeoutId) { clearTimeout(gameState.checkTimeoutId); gameState.checkTimeoutId = null; }
    if (gameState.countdownRafId) { cancelAnimationFrame(gameState.countdownRafId); gameState.countdownRafId = null; }
    if (gameState.perClickTimeoutId) { clearTimeout(gameState.perClickTimeoutId); gameState.perClickTimeoutId = null; }
}

function handleGameButtonRelease() {
    const activeCssVarsForRelease = isMobileActive() ? getActiveMobileVars() : cssVars;
    const releaseMs = activeCssVarsForRelease['--button-release-ms'];
    if (releaseMs > 0) {
        // See handleGameButtonPress()'s matching branch for why this is
        // set directly rather than through --button-active-transition-ms.
        gameButton.style.transition = `transform ${releaseMs}ms ease-out`;
        gameButton.classList.remove('pressed');
    } else {
        // transition:none guarantees instant release even mid-
        // interrupted-transition - see handleGameButtonPress().
        gameButton.style.transition = 'none';
        gameButton.classList.remove('pressed');
        void gameButton.offsetHeight;
    }
    shadowCasterButtonLayer.classList.remove('pressed');
    setShadowButtonPressed(false);
}

function endGame(won, reason) {
    gameState.isCountingTaps = false;
    gameState.canTap = false;
    stopRoundCountdown();

    const gaps = [];
    for (let i = 1; i < currentRoundTaps.length; i++) {
        gaps.push(currentRoundTaps[i] - currentRoundTaps[i - 1]);
    }
    // The tap that brought the count up to target, if the round ever reached
    // it (true for a win, and for an overshoot loss too - overshoot means
    // count passed through target on an earlier tap before going over).
    const targetReachedAt = currentRoundTaps.length >= gameState.targetCount
        ? currentRoundTaps[gameState.targetCount - 1] : null;
    roundHistory.push({
        round: gameState.currentRound,
        target: gameState.targetCount,
        clicks: currentRoundTaps.length,
        avgGapMs: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null,
        fastestGapMs: gaps.length ? Math.min(...gaps) : null,
        slowestGapMs: gaps.length ? Math.max(...gaps) : null,
        timeToTargetMs: targetReachedAt !== null ? targetReachedAt - roundStartTime : null,
        won,
    });

    if (won) {
        setButtonHue('#22dd44');
        // Tracks the highest round actually WON this run, separate
        // from gameState.currentRound (which keeps advancing past
        // this on every win, and at a loss reflects the round you
        // were ON, not the last one you beat) - per direct
        // correction ("Hgishcore should be the number of the round
        // you had beat. not the round you lost at."). See
        // checkHighScore()'s own call site below.
        gameState.lastRoundWon = gameState.currentRound;
        // Replaced the randomized winMessages pool with a plain ":)"
        // per explicit request - winMessages itself is left in place
        // (harmless unused data) rather than deleted, in case this is
        // revisited.
        resultText.textContent = overrideOr('winSymbol');
        resultText.classList.remove('result-lose');
        resultText.classList.add('result-win');
        resultText.classList.remove('hidden');
        // Per explicit request, Target/Speed/Ms-per-click no longer
        // disappear on win/lose - they just change color (reverted
        // in showTargetAndSpeed(), once the next round begins - and
        // if the flash checkbox is on, flashed in sync with the
        // round number by runRoundBlinkSequence() itself once that
        // starts). See applyGameplayResultColor()'s own comment.
        applyGameplayResultColor('win');

        setTimeout(() => {
            // High Score check moved here (2026-09-20 fix, and
            // corrected same-day to THIS exact point rather than
            // firing synchronously at the moment of winning) - a
            // new high score is now reflected (flashed + updated)
            // the instant the round that beats it is won, not only
            // once the run finally ends in a loss (previously
            // checkHighScore() was only called from the lose branch
            // below, so a new high round left the displayed high
            // score stale until the player eventually lost, by
            // which point they were already several rounds further
            // in). Called from inside THIS setTimeout specifically
            // - not synchronously right after the win above - so
            // its own flash (runHighScoreBlinkSequence(), which
            // reuses these same --round-blink*-ms timers) starts at
            // the exact same tick as showRoundText()'s own
            // runRoundBlinkSequence() just below, per direct
            // request ("the high score number should flash
            // alongside the other numbers flashing"). Firing it
            // synchronously at win time instead (an earlier version
            // of this fix did exactly that) would start the high
            // score's flash immediately while the round number's
            // own flash doesn't begin until gameState.resultDuration
            // later - not "alongside" at all, just an earlier,
            // separate flash. checkHighScore()'s --high-score-flash-
            // delay-ms slider still applies on top of this shared
            // start point for further manual offsetting.
            checkHighScore(gameState.lastRoundWon);
            gameState.currentRound++;
            showRoundText(gameState.currentRound);
        }, gameState.resultDuration);
    } else {
        setButtonHue('#dd3333');
        // High Score check - safety-net call. The real trigger is
        // now in the win branch above (2026-09-20 fix - see its own
        // comment), firing the instant a new high round is beaten
        // rather than waiting for the run to end. This call stays
        // as a no-op fallback (round === highScore by the time a
        // loss happens, so its `if` won't fire again) in case a run
        // somehow ends without ever passing through the win branch.
        // Corrected 2026-09-14 per direct correction ("Hgishcore
        // should be the number of the round you had beat. not the
        // round you lost at."): uses gameState.lastRoundWon (the
        // last round actually completed/won this run, 0 if none)
        // instead of gameState.currentRound (the round you were ON
        // when you lost, which is never a round you beat).
        checkHighScore(gameState.lastRoundWon);
        // Same replacement as the win case above - plain ":(" instead
        // of the randomized tooManyMessages/notEnoughMessages pools
        // (and the trailing "(count/target)" suffix, which was part
        // of the same "randomized text" being replaced).
        resultText.textContent = overrideOr('loseSymbol');
        resultText.classList.remove('result-win');
        resultText.classList.add('result-lose');
        resultText.classList.remove('hidden');
        renderRoundBreakdown();
        // See the win branch's own comment above.
        applyGameplayResultColor('lose');

        setTimeout(() => {
            // Fixed literal text, not the randomized tryAgainMessages
            // pool (left declared but unused, same as winMessages/
            // tooManyMessages/notEnoughMessages) and no "ROUND X ·"
            // prefix - per explicit request, this button says only
            // "Try again?" and nothing else. The "?" is its own
            // permanent sibling element (see its own HTML/CSS
            // comment) so it can blink independently - see
            // startTryAgainFlash() - and position independently of
            // wherever this button itself currently sits.
            startButton.textContent = overrideOr('tryAgainLabel');
            startButton.classList.add('try-again-state');
            startButton.classList.remove('hidden');
            document.getElementById('startButtonFlashChar').classList.remove('hidden');
            // Re-resolves startButton's own shared align-class/
            // --anchor-ty, and startButtonFlashChar's own Text
            // Align/Valign anchors, to the Try Again state that just
            // became current (see applyTextAlignAnchors()'s own
            // comment).
            applyTextAlignAnchors();
            startTryAgainFlash();
            resultText.classList.add('hidden');
            gameState.isPlaying = false;
            gameState.currentRound = 0;
            gameState.maxTimeMs = parseFloat(document.getElementById('sliderStartingSpeed').value);
        }, gameState.resultDuration);
    }
}

function fmtMs(ms) {
    return ms === null ? 'N/A' : Math.round(ms) + ' ms';
}

// Builds the loss-screen round breakdown: one row per round played this run
// (including rounds already won before the eventual loss), each showing its
// target, tap-speed stats, and how long it took to reach the target count.
function renderRoundBreakdown() {
    // Text Edit Mode's 5 editable stat labels - see
    // TEXT_EDIT_TARGETS.roundBreakdownTable's own comment. Falls
    // back to the individual TEXT_OVERRIDE_DEFAULTS strings (not a
    // blank label) if the override has been edited down to fewer
    // than 5 lines, so a partial/mid-edit override never blanks out
    // a label outright.
    const defaultLabels = TEXT_OVERRIDE_DEFAULTS.roundBreakdownLabels.split('\n');
    const labelLines = overrideOr('roundBreakdownLabels').split('\n');
    const [targetLabel, clicksLabel, avgSpeedLabel, fastestLabel, slowestLabel] = defaultLabels.map((d, i) => labelLines[i] ?? d);
    const rows = roundHistory.map(r => `
                <div class="round-breakdown-row${r.won ? '' : ' round-breakdown-row-lost'}">
                    <div class="round-breakdown-row-title">Round ${r.round}</div>
                    <div class="round-breakdown-row-data">${targetLabel} ${r.target}</div>
                    <div class="round-breakdown-row-data">${clicksLabel} ${r.clicks}</div>
                    <div class="round-breakdown-row-data">${avgSpeedLabel} ${fmtMs(r.avgGapMs)}</div>
                    <div class="round-breakdown-row-data">${fastestLabel} ${fmtMs(r.fastestGapMs)}</div>
                    <div class="round-breakdown-row-data">${slowestLabel} ${fmtMs(r.slowestGapMs)}</div>
                </div>
            `).join('');
    // ONE copy inside a .round-breakdown-scroll-track while Auto
    // Scroll is enabled (manual-scroll mode stays exactly as
    // before: a single copy, no wrapper, native overflow
    // scrolling). restartRoundBreakdownAutoscroll()'s own tick()
    // duplicates this track's content a 2nd time itself, but ONLY
    // once it's confirmed the content actually needs to scroll -
    // doing that duplication here unconditionally was a real bug
    // (direct report: "when I lose on the first round, the round
    // breakdown shows the data for Round 1 twice") - a single
    // round's content is normally shorter than the panel, so a
    // 2nd copy rendered eagerly was simply visible below the
    // first, in the same view, with nothing to scroll it away.
    roundBreakdownTable.innerHTML = cssVars['--round-breakdown-autoscroll-enabled']
        ? '<div class="round-breakdown-scroll-track">' + rows + '</div>'
        : rows;
    // Round Breakdown On/Off (dev-panel checkbox) - per direct
    // request ("If turned off, the breakdown wont be shown"), gate
    // right here at the one call site that ever un-hides the panel,
    // rather than a separate persistent visibility mechanism.
    // ALSO gated on an actual loss existing in roundHistory (added
    // per direct report - "Round Breakdown is currently showing on
    // startup. make sure it only shows on Lose") - this function is
    // ALSO called generically by refreshAllTextOverrides() (runs on
    // every page load and every window resize/orientation change,
    // to restore Text Edit Mode's saved label overrides - see
    // TEXT_EDIT_TARGETS.roundBreakdownTable's own comment), which
    // has nothing to do with an actual loss just happening - without
    // this guard, that generic sweep un-hid the panel on every
    // fresh page load even with an empty roundHistory.
    const hasLoss = roundHistory.some(r => !r.won);
    if (cssVars['--round-breakdown-enabled'] !== 0 && hasLoss) {
        roundBreakdownPanel.classList.remove('hidden');
    }
    restartRoundBreakdownAutoscroll();
}

// Auto Scroll On/Off/Speed/Pause-Before/Pause-At-End (dev-panel
// controls) - per direct request, reworked 2026-09-19 into a true
// seamless marquee loop per direct follow-up feedback ("I didnt
// want it to jump back to the top. Instead, I wanted the existing
// shown text to continue scrolling, and the text just begins again
// after the last entry... Round 1, Round 2, Round 3, Last Round,
// Round 1, Round 2... It should be smooth and continuous" / "the
// auto scrolling dosnt quite look very smooth. its a bit
// jittery"). See .round-breakdown-scroll-track's own CSS comment
// for the technique (2 duplicated copies, animate transform:
// translateY() instead of scrollTop - both the seamless-wrap fix
// and the smoothness fix come from the same change, since
// scrollTop writes are what caused the jitter in the first place).
// State machine: wait pauseBeforeMs -> translate from 0 up to ONE
// copy's height at speedPxPerSec -> wait pauseEndMs (frozen at
// that position - Round N still fully visible, per "then it will
// continue to scroll upwards" implying the pause happens WITH the
// last round showing, not after it's already scrolled past) ->
// reset the translate back to 0 (invisible, since copy 2 at that
// scroll position is pixel-identical to copy 1 at position 0) ->
// repeat. roundBreakdownAutoscrollToken invalidates any in-flight
// requestAnimationFrame loop from a PRIOR call (panel re-rendered,
// autoscroll re-toggled, settings reloaded, etc.) - the standard
// "increment a token, have the old loop's own stale closure check
// it and bail" pattern, since an rAF callback can't otherwise be
// cancelled by reference once scheduled under a changed context.
let roundBreakdownAutoscrollToken = 0;
function stopRoundBreakdownAutoscroll() {
    roundBreakdownAutoscrollToken++;
}
function restartRoundBreakdownAutoscroll() {
    stopRoundBreakdownAutoscroll();
    // Shared/single-bucket, always desktop cssVars - see
    // applyRoundBreakdownPosition()'s own comment on this exact bug
    // class (reading a shared var through the per-device activeVars
    // object silently no-ops on Mobile/Landscape).
    if (!cssVars['--round-breakdown-autoscroll-enabled']) {
        roundBreakdownPanel.classList.remove('rb-autoscroll-on');
        return;
    }
    roundBreakdownPanel.classList.add('rb-autoscroll-on');
    const myToken = roundBreakdownAutoscrollToken;
    const table = roundBreakdownTable;
    let state = 'pause-before';
    let offset = 0;
    let stateStartTime = performance.now();
    let lastFrameTime = stateStartTime;
    // Cached once the track is duplicated (see below), NOT re-read
    // every frame any more - per direct report ("every time the '?'
    // flashes, the autoscroll pauses a bit"). Root cause: this used
    // to read track.scrollHeight unconditionally on EVERY tick -
    // scrollHeight forces the browser to flush any pending style/
    // layout work synchronously before it can answer, and the Try
    // Again "?" flash's own periodic visibility toggle (on a
    // heavily text-shadow-extruded element, see #startButtonFlash-
    // CharExtrusion's own CSS comment) is exactly this kind of
    // pending work - so every flash tick that happened to land
    // inside a tick() call forced an expensive synchronous style/
    // layout recalc right there on the main thread, stalling that
    // frame and reading as a visible pause in the scroll, even
    // though nothing about the scroll's own state was ever
    // actually paused. one copy's height never changes once the
    // track is built (renderRoundBreakdown() always creates a
    // fresh track for any real content change, which already
    // restarts this whole function - see its own call site), so
    // there was never a reason to re-measure it every frame in the
    // first place.
    let oneCopyHeight = null;
    function tick(now) {
        if (myToken !== roundBreakdownAutoscrollToken) return; // superseded/stopped
        if (roundBreakdownPanel.classList.contains('hidden')) return; // game restarted etc.
        const track = table.querySelector(':scope > .round-breakdown-scroll-track');
        if (!track) return; // renderRoundBreakdown() only builds one while autoscroll-enabled - see its own comment
        const dt = now - lastFrameTime;
        lastFrameTime = now;
        const speedPxPerSec = cssVars['--round-breakdown-autoscroll-speed-px-per-sec'] || 30;
        const pauseBeforeMs = cssVars['--round-breakdown-autoscroll-pause-before-ms'] || 1500;
        const pauseEndMs = cssVars['--round-breakdown-autoscroll-pause-end-ms'] || 1500;
        // renderRoundBreakdown() renders only ONE copy - the 2nd,
        // duplicate copy needed for the seamless wrap (see
        // .round-breakdown-scroll-track's own CSS comment) is added
        // HERE instead, lazily, and only once the single copy is
        // actually confirmed taller than the visible panel (real
        // bug found live: duplicating unconditionally meant a
        // SINGLE round's content, normally shorter than the panel,
        // rendered twice in the same view with nothing to scroll it
        // away - "when I lose on the first round, the round
        // breakdown shows the data for Round 1 twice"). Guarded by
        // dataset.duplicated so this only ever runs once per track
        // element; a later renderRoundBreakdown() call always
        // creates a brand-new track (fresh dataset), so a size
        // change (a new round added) is naturally re-evaluated
        // from scratch rather than compounding.
        if (!track.dataset.duplicated) {
            if (track.scrollHeight <= table.clientHeight) {
                // Single copy already fits without scrolling - stay
                // put and keep checking each frame in case more
                // rounds get added later in the same run. Still a
                // per-frame scrollHeight read, but only while
                // genuinely waiting for more rounds to arrive (a
                // narrow, already-unusual window), not for the
                // entire steady-state scroll loop.
                requestAnimationFrame(tick);
                return;
            }
            track.innerHTML += track.innerHTML;
            track.dataset.duplicated = '1';
            // Exactly 2 identical copies now, so one copy's height
            // is always half the track's own full scrollHeight -
            // measured ONCE, right here, not on every future tick.
            oneCopyHeight = track.scrollHeight / 2;
        }
        if (state === 'pause-before') {
            if (now - stateStartTime >= pauseBeforeMs) state = 'scrolling';
        } else if (state === 'scrolling') {
            offset += speedPxPerSec * (dt / 1000);
            if (offset >= oneCopyHeight) {
                offset = oneCopyHeight;
                state = 'pause-end';
                stateStartTime = now;
            }
        } else if (state === 'pause-end') {
            if (now - stateStartTime >= pauseEndMs) {
                offset = 0; // seamless - copy 2 here looks identical to copy 1 at 0
                state = 'pause-before';
                stateStartTime = now;
            }
        }
        track.style.transform = 'translateY(-' + offset + 'px)';
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}
