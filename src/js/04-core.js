// Re-measures whenever the Number's rendered box resizes (text, font-size, letter-spacing).
// Does NOT catch pure moves (X/Y Offset sliders) - those are wired directly below.
new ResizeObserver(updateTargetAnchoredPositions).observe(targetCountNumber);
const speedDisplay = document.getElementById('speedDisplay');
const msPerClickDisplay = document.getElementById('msPerClickDisplay');
// Number/suffix children are set individually by every render call site below.
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
// High Score persists via localStorage, NOT the git-tracked settings sync (that commits on
// every save). Value is gameState.currentRound at loss - checked in endGame() before it resets.
const HIGH_SCORE_KEY = 'clicko-high-score';
let highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY), 10) || 0;
function updateHighScoreDisplay() {
    highScoreNumber.textContent = highScore;
}
// Clear Highscore (Debug button): no blink, since a manual reset isn't a new score.
function clearHighScore() {
    highScore = 0;
    localStorage.removeItem(HIGH_SCORE_KEY);
    updateHighScoreDisplay();
}
function checkHighScore(round) {
    if (round > highScore) {
        highScore = round;
        localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
            // Flash to the new value (see runHighScoreBlinkSequence()); only reached on change.
        runHighScoreBlinkSequence(highScore);
    }
}
updateHighScoreDisplay();
const buttonAssembly = document.getElementById('buttonAssembly');
const clickBurstContainer = document.getElementById('clickBurstContainer');
const clickBurstShadowContainerRight = document.getElementById('clickBurstShadowContainerRight');
const clickBurstShadowContainerLeft = document.getElementById('clickBurstShadowContainerLeft');

// Click burst - comic "impact line" frames flung from the button/base seam on every accepted
// tap (plain img + CSS motion, not a particle engine). Artwork points up, oriented for the LEFT
// side; right-side spawns are mirrored (see spawnClickBurst()).
const CLICK_FRAME_SETS = ['CLICK1', 'CLICK2', 'CLICK3', 'CLICK4'];
const CLICK_FRAME_URLS = {};
for (const set of CLICK_FRAME_SETS) {
    CLICK_FRAME_URLS[set] = Array.from({ length: 10 }, (_, i) =>
        `data/BUTTON/CLICK/frames/${set}/frame_${String(i + 1).padStart(2, '0')}.png`);
}

// Cap concurrent particle DOM nodes; skip new bursts at the ceiling (existing ones self-remove
// within a few hundred ms). Each click is 4 real + 4 shadow per side = 16 nodes.
const CLICK_BURST_MAX_CONCURRENT = 64;

// Spawn origins come from an artist-authored guide curve (data/BUTTON/CLICK GUIDE.svg), drawn in
// the SAME viewBox as the button/base artwork so coordinates map onto the button's bounding box.
// Uses the browser's getTotalLength()/getPointAtLength() rather than hand-rolled bezier math.
const CLICK_ROUTE_VIEWBOX_WIDTH = 589.79;
const CLICK_ROUTE_VIEWBOX_HEIGHT = 605.11;
// The left path's SVG has a stray second subpath - only the first subpath is used here.
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

// Inverse of clickBurstUserAngleToTrigRad(): trig angle (0=3 o'clock, clockwise since screen Y
// is down) -> "user" angle (0=up, clockwise) used by the Floor/Ceiling inputs.
function clickBurstTrigRadToUserDeg(rad) {
    let deg = rad * 180 / Math.PI + 90;
    return ((deg % 360) + 360) % 360;
}

// Wrap-aware range test in user degrees: floor>ceiling (after normalizing) means the range
// crosses 360/0, e.g. floor=350, ceiling=10.
function isUserDegInAngleRange(deg, floorDeg, ceilingDeg) {
    const d = ((deg % 360) + 360) % 360;
    const f = ((floorDeg % 360) + 360) % 360;
    const c = ((ceilingDeg % 360) + 360) % 360;
    return f <= c ? (d >= f && d <= c) : (d >= f || d <= c);
}

// Small per-click angle jitter so repeated clicks don't fly identical paths.
const CLICK_BURST_ANGLE_JITTER_RAD = 8 * Math.PI / 180;

// Samples `count` origins from the stretch of the guide curve whose angle from the button center
// falls in [floorDeg, ceilingDeg] (viewBox space is a uniform scale of screen space, so angles
// are preserved). Floor/Ceiling select WHERE on the curve spawns are allowed, not flight
// direction. No qualifying points = 0 particles that side (not an error).
// Each piece carries {dirX, dirY}: its radial direction from center, used as flight direction.
// Don't use the curve's local tangent - the curve curls back near its tip, so tangent-following
// particles fly the wrong way.
// The curve is scanned at a fixed resolution because angle-from-center isn't monotonic along it.
const CLICK_ROUTE_ANGLE_SCAN_RESOLUTION = 200;
// The scan (201 getPointAtLength() calls per side) was the main per-tap lag (35-65ms). Path
// geometry is set once at load and never changes, so the scan is cached per path element; only
// the cheap angle filter runs per tap. If a path's `d` ever becomes mutable, invalidate this cache.
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

// Hide Shadow spec parser - free-text list like "0=>1, 3, -4=>-7". Positions are 0-based from the
// TOP of this side's top-to-bottom order; negatives count from the bottom (-1 = bottommost).
// Range endpoints may be in either order. Out-of-range positions are silently dropped.
function resolveHideShadowPosition(position, count) {
    const idx = position >= 0 ? position : count + position;
    return (idx >= 0 && idx < count) ? idx : null;
}
function parseHideShadowSpec(spec, pieces) {
    const indices = new Set();
    const count = pieces.length;
    if (!spec || !count) return indices;
    // Resolve positions against top-to-bottom order, then map back to real piece indices.
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
    // Read through the active (mobile vs desktop) var set, not the desktop cssVars directly.
    const activeVars = isMobileActive() ? getActiveMobileVars() : cssVars;
    const frameSet = cssVars['--click-frame-set'] || 'CLICK1';
    const urls = CLICK_FRAME_URLS[frameSet];
    if (!urls) return;

    // resolveSpatialPx() is a no-op on desktop; on mobile it converts stored vw to px. All are then
    // multiplied by the button's current visual scale (same as .click-burst-particle's width).
    // curveAmountMultiplier is dimensionless and inherits the scaling via slotDistance.
    const buttonScale = computeButtonUserScale();
    const distance = resolveSpatialPx(activeVars['--click-burst-distance-px']) * buttonScale;
    const height = resolveSpatialPx(activeVars['--click-burst-height-px']) * buttonScale;
    const curveOffset = (resolveSpatialPx(activeVars['--click-burst-curve-offset-px']) || 0) * buttonScale;
    const curveAmountMultiplier = activeVars['--click-burst-curve-amount'];
    // Per-side shadow container; spawnClickBurst() sets each one's transform.
    const shadowContainer = mirror ? clickBurstShadowContainerRight : clickBurstShadowContainerLeft;

    // Count rolled per side per click within Floor/Ceiling (inclusive); max is clamped >= min so a
    // misconfigured Ceiling can't invert the range.
    const countMin = Math.max(1, Math.round(activeVars['--click-burst-count-min']));
    const countMax = Math.max(countMin, Math.round(activeVars['--click-burst-count-max']));
    const count = countMin + Math.floor(Math.random() * (countMax - countMin + 1));

    // Floor/Ceiling angles filter which part of the curve can spawn (see
    // sampleClickRoutePiecesInAngleRange()). These are plain typed inputs, not CSS_VAR_SLIDER_MAP
    // sliders, so the device-specific id prefix is picked here directly.
    const mobilePrefix = isLandscapeActive() ? 'inputLandscape' : isMobileActive() ? 'inputMobile' : 'input';
    const floorId = `${mobilePrefix}ClickBurst${mirror ? 'Right' : 'Left'}FloorDeg`;
    const ceilingId = `${mobilePrefix}ClickBurst${mirror ? 'Right' : 'Left'}CeilingDeg`;
    const floorDeg = parseFloat(document.getElementById(floorId).value);
    const ceilingDeg = parseFloat(document.getElementById(ceilingId).value);
    const pieces = sampleClickRoutePiecesInAngleRange(routePathEl, count, floorDeg, ceilingDeg);

    // Hide Shadow A applies to the LEFT side only, B to the RIGHT only (see parseHideShadowSpec()).
    const hideSpec = document.getElementById(`${mobilePrefix}ClickBurstHideShadowIndex${mirror ? 'B' : 'A'}`)?.value || '';
    const noShadowIndices = parseHideShadowSpec(hideSpec, pieces);

    for (let i = 0; i < pieces.length; i++) {
        // Checked per particle (not once before the loop) so a batch can't overshoot the cap.
        // Sums all 3 containers so the cap bounds total DOM nodes, shadows included.
        if (clickBurstContainer.children.length + clickBurstShadowContainerRight.children.length + clickBurstShadowContainerLeft.children.length >= CLICK_BURST_MAX_CONCURRENT) return;

        const q = pieces[i];
        // Map the viewBox-space point onto the button's rendered box (same viewBox as the artwork).
        let originX = (buttonRect.left - containerRect.left) + (q.x / CLICK_ROUTE_VIEWBOX_WIDTH) * buttonRect.width;
        let originY = (buttonRect.top - containerRect.top) + (q.y / CLICK_ROUTE_VIEWBOX_HEIGHT) * buttonRect.height;

        // Curve Offset pushes the origin radially outward from the button center (0 = on curve).
        if (curveOffset) {
            const buttonCenterX = (buttonRect.left - containerRect.left) + buttonRect.width / 2;
            const buttonCenterY = (buttonRect.top - containerRect.top) + buttonRect.height / 2;
            const toOriginX = originX - buttonCenterX, toOriginY = originY - buttonCenterY;
            const toOriginLen = Math.hypot(toOriginX, toOriginY) || 1;
            originX += (toOriginX / toOriginLen) * curveOffset;
            originY += (toOriginY / toOriginLen) * curveOffset;
        }

        // Flight direction = the point's radial direction from center (valid in screen space since
        // the viewBox mapping is a uniform scale), plus small per-click jitter.
        const slotFraction = pieces.length > 1 ? i / (pieces.length - 1) : 0.5; // 0..1 across this side's own pieces, for the distance-stagger below
        const baseAngle = Math.atan2(q.dirY, q.dirX);
        const angle = baseAngle + (Math.random() - 0.5) * CLICK_BURST_ANGLE_JITTER_RAD;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);

        // Travel outward, then lift up by `height` - distance and height are independent controls.
        // Distance is staggered per piece plus +/-10% jitter for extra separation.
        const slotDistance = distance * (0.85 + slotFraction * 0.3) * (0.9 + Math.random() * 0.2);
        const endX = dirX * slotDistance;
        const endY = dirY * slotDistance - height;

        // Quadratic bezier control point perpendicular to the chord, flipped so it never points
        // downward (curve never sags below its chord). Magnitude kept small so a particle can't
        // swing out of its angular slot into a neighbor's.
        let perpX = -endY, perpY = endX;
        if (perpY > 0) { perpX = -perpX; perpY = -perpY; }
        const perpLen = Math.hypot(perpX, perpY) || 1;
        // Curviness multiplier: 0 = straight, 1 = original swoosh, higher = more curve.
        const curveAmount = (0.1 + Math.random() * 0.15) * slotDistance * curveAmountMultiplier;
        const ctrlX = endX / 2 + (perpX / perpLen) * curveAmount;
        const ctrlY = endY / 2 + (perpY / perpLen) * curveAmount;

        const frameUrl = urls[Math.floor(Math.random() * urls.length)];
        const offsetPath = `path('M0,0 Q${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}')`;
        // Mirroring flips the shape BEFORE skewX applies (transforms compose right-to-left), and
        // flip-then-skew(th) == skew(-th)-then-flip. So the mirrored side negates the skew angle
        // (see spawnClickBurst()) to make both sides read as the same cast-shadow direction.

        const img = document.createElement('img');
        img.src = frameUrl;
        img.className = 'click-burst-particle';
        img.alt = '';
        img.style.left = originX + 'px';
        img.style.top = originY + 'px';
        img.style.offsetPath = offsetPath;
        if (mirror) img.style.transform = 'scaleX(-1)';

        // Paired shadow: same frame, grayed, in a lower-z per-side container behind the button.
        // Uses the SAME unwarped left/top/offsetPath as the real particle - the container carries
        // the skew/stretch/rotate/translate transform (pivoted at button center), same as
        // .shadow-caster-layer. Don't re-derive that math in JS: a reimplementation wasn't
        // equivalent (amplified offsets). Skipped for pieces selected by Hide Shadow A/B.
        if (!noShadowIndices.has(i)) {
            const shadow = document.createElement('img');
            shadow.src = frameUrl;
            shadow.className = 'click-burst-particle click-burst-particle-shadow';
            shadow.alt = '';
            shadow.style.left = originX + 'px';
            shadow.style.top = originY + 'px';
            shadow.style.offsetPath = offsetPath;
            // Final scale is per-frame, not on the container, so each frame shrinks around its own
            // centroid (img's default transform-origin) without shifting its flight position.
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

    // Each shadow container's transform must be a byte-for-byte copy of .shadow-caster-layer's CSS
    // transform (same functions, same order - see that rule), pivoted at button center. Two
    // containers because the sides need mirrored skew: right keeps it, left negates it.
    const activeVars = isMobileActive() ? getActiveMobileVars() : cssVars;
    const buttonCenterX = (buttonRect.left + buttonRect.width / 2) - containerRect.left;
    const buttonCenterY = (buttonRect.top + buttonRect.height / 2) - containerRect.top;
    const originStr = `${buttonCenterX}px ${buttonCenterY}px`;
    // Shadow x/y offset is a % of the button's rendered width (matches .shadow-caster-layer's
    // formula). Uses measured buttonRect.width, which also respects the min-diameter px floor.
    const shadowOffsetX = activeVars['--shadow-x-offset'] / 100 * buttonRect.width;
    const shadowOffsetY = activeVars['--shadow-y-offset'] / 100 * buttonRect.width;
    // --click-burst-shadow-final-scale is deliberately NOT in this container transform: its origin
    // is the shared button center, so scaling here would drag every frame toward it. It's applied
    // per-frame in spawnClickBurstSide() instead, pivoting on each frame's own center.
    const buildTransform = (skewDeg) => `translate(${shadowOffsetX}px, ${shadowOffsetY}px) rotate(${activeVars['--shadow-rotate']}deg) scale(${activeVars['--shadow-scale']}) skewX(${skewDeg}deg) rotate(${activeVars['--shadow-elongation-angle']}deg) scaleY(${activeVars['--shadow-elongation-intensity']}) rotate(${-activeVars['--shadow-elongation-angle']}deg)`;
    clickBurstShadowContainerRight.style.transformOrigin = originStr;
    clickBurstShadowContainerRight.style.transform = buildTransform(activeVars['--shadow-skew']);
    clickBurstShadowContainerLeft.style.transformOrigin = originStr;
    clickBurstShadowContainerLeft.style.transform = buildTransform(-activeVars['--shadow-skew']);

    // Each click spawns on both sides, from that side's guide curve.
    spawnClickBurstSide(clickRouteRightPath, true, containerRect, buttonRect);
    spawnClickBurstSide(clickRouteLeftPath, false, containerRect, buttonRect);
}

const tapDiagnosticPanel = document.getElementById('tapDiagnosticPanel');
const tapDiagnostic = document.getElementById('tapDiagnostic');
const tapDiagnosticLog = [];
// How many tapDiagnosticLog entries are in the DOM, so logTapDiagnostic can append one line instead
// of re-rendering the whole (uncapped) array. Full rebuild only when the DOM has fallen behind.
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
// Filter for a duplicate pointerdown from one physical press (e.g. worn mouse microswitch).
// Kept tight (50ms): 250ms rejected genuine rapid taps (players hold the mouse still, so position
// can't disambiguate), and eating a real tap causes a false loss. Observed hardware duplicates
// were ~21ms apart; genuine human taps never went below ~125ms. Adjustable (incl. 0) via dev panel.
let TAP_DEBOUNCE_MS = 50;
const TAP_DEBOUNCE_POS_TOLERANCE_PX = 3;
// Some mobile browsers fire a synthetic "compatibility" mouse pointerdown ~300ms after a touch tap,
// outside TAP_DEBOUNCE_MS - a mouse tap shortly after a touch tap is treated as that synthetic event.
const TOUCH_COMPAT_WINDOW_MS = 600;

// Keeps the dev panel on-screen: its position is one shared (non-device-split) value, so a
// desktop-tuned position can sit entirely off a narrow mobile viewport. Called from
// applyActiveVars() (fires on resize/breakpoint) and uses the panel's rendered size.
// Resize handles overhang the border by 6px (see .dev-panel-resize-edge/-corner CSS); every
// position clamp keeps this margin so the full handle stays grabbable on-screen.
const DEV_PANEL_HANDLE_OVERHANG_PX = 6;
// Extra left/right clamp margin on mobile only: Android's OS edge-swipe back/forward gesture
// captures touches near the screen edge before the page sees them (resizing from the right edge
// triggered swipe-back). No equivalent on desktop or top/bottom.
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
// applyActiveVars() applies whichever var set matches the current viewport; it always re-derives
// from the active profile, so editing an inactive mode's control just stores the value silently.
// Keys resolveSpatialPx() applies to (vw on mobile). Shadow x/y offsets are NOT here - their CSS
// scales them via --button-diameter-vw; adding them here would double-scale on mobile.
const SPATIAL_VW_ON_MOBILE_KEYS = new Set([
    '--click-burst-distance-px', '--click-burst-height-px', '--click-burst-curve-offset-px',
]);

// Max/Min Button Scale (see cssVars'/mobileCssVars' comments on these keys). Desktop/Landscape:
// linear interpolation between 2 reference widths, clamped. Mobile: proportional shrink from a
// single reference width, with a floor. Pushed to --button-user-scale as an extra scale() on
// .button-assembly so button, base, and shadow-caster scale together.
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
    // Desktop AND Landscape - Landscape deliberately reuses Desktop's values and formula.
    const maxScale = cssVars['--button-max-scale'];
    const minScale = cssVars['--button-min-scale'];
    const t = Math.max(0, Math.min(1, (window.innerWidth - DESKTOP_BUTTON_SCALE_MIN_WIDTH) / (DESKTOP_BUTTON_SCALE_MAX_WIDTH - DESKTOP_BUTTON_SCALE_MIN_WIDTH)));
    return minScale + t * (maxScale - minScale);
}

function applyActiveVars() {
    const activeCssVars = isMobileActive() ? getActiveMobileVars() : cssVars;
    // Colors aren't device-split: always desktop colorVars. mobileColorVars still exists only so
    // old saved settings load without error.
    for (const [key, value] of Object.entries(colorVars)) {
        document.documentElement.style.setProperty(key, value);
    }
    for (const [key, value] of Object.entries(activeCssVars)) {
        // Consuming CSS multiplies by 1px itself, so resolve vw-on-mobile values to px here.
        const resolved = SPATIAL_VW_ON_MOBILE_KEYS.has(key) ? resolveSpatialPx(value) : value;
        document.documentElement.style.setProperty(key, resolved);
    }
    // Main Button X/Y offset unit (px/vw): no Edge Lock system here, so it comes straight from
    // its px-checkbox flag (unlike text elements, see applyTextAlignAnchors()).
    document.documentElement.style.setProperty('--button-x-unit', activeCssVars['--button-x-offset-unit-is-px'] ? '1px' : 'var(--cq-vw, 1vw)');
    document.documentElement.style.setProperty('--button-y-unit', activeCssVars['--button-y-offset-unit-is-px'] ? '1px' : 'var(--cq-vh, 1vh)');
    // Blink timing isn't device-split (dock POSITION is, via the loop above).
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
    // Re-derived from the current width on every run, like a native vw unit.
    document.documentElement.style.setProperty('--button-user-scale', computeButtonUserScale());
    // Dev panel size/position live only in cssVars (not device-split), so they need this
    // unconditional push - the loop above only pushes the ACTIVE set, which on mobile would leave
    // restored values never reaching the DOM.
    document.documentElement.style.setProperty('--dev-panel-left-px', cssVars['--dev-panel-left-px']);
    document.documentElement.style.setProperty('--dev-panel-top-px', cssVars['--dev-panel-top-px']);
    document.documentElement.style.setProperty('--dev-panel-width-px', cssVars['--dev-panel-width-px']);
    document.documentElement.style.setProperty('--dev-panel-height-px', cssVars['--dev-panel-height-px']);
    // Base/Button Light Levels etc. are shared (cssVars only). This always applies the NORMAL
    // button values; a showing Lose state is re-applied after this (see below).
    applyLightLevels(cssVars['--base-light-levels'], cssVars['--base-light-levels-contrast'], cssVars['--base-light-levels-floor'], cssVars['--base-light-levels-ceiling'], 'baseGrayscaleTint');
    applyLightLevels(cssVars['--button-light-levels'], cssVars['--button-light-levels-contrast'], cssVars['--button-light-levels-floor'], cssVars['--button-light-levels-ceiling'], 'buttonGrayscaleTint');
    applyBlendModes(cssVars['--base-blend-mode'], cssVars['--button-blend-mode']);
    applySaturation(cssVars['--base-saturation'], cssVars['--button-saturation']);
    applyThinBaseState();
    // Extrusion system is device-split too (see mobileExtrusionVars) - repaint on breakpoint change.
    applyExtrusionStyles();
    // Button/base hue-rotate are computed from the active color picker, not cssVars.
    refreshButtonHue();
    refreshBaseHue();
    clampDevPanelPosition();
    applyTextAlignAnchors();
    // Text Edit overrides are device-split - re-render so the active device's wording shows.
    refreshAllTextOverrides();
    // Re-establish the active Win/Lose tint: the Light Levels calls above always reset to the
    // NORMAL filter, and a resize/rotation mid-result would otherwise leave it wiped.
    if (resultText.classList.contains('result-win')) applyGameplayResultColor('win');
    else if (resultText.classList.contains('result-lose')) applyGameplayResultColor('lose');
    // Re-measure the Number's edges for Prefix/Suffix anchoring. This function runs after EVERY
    // value change (sliders, Undo/Reset/Load, resize), so hooking here covers all cases. Cheap.
    updateTargetAnchoredPositions();
    // Round Breakdown's Scale With Browser reference width and Align/Edge Lock position.
    if (roundBreakdownPanel) {
        const rbProfile = getActiveDeviceProfile();
        const rbScaleRef = rbProfile === 'mobile' ? 390 : (rbProfile === 'landscape' ? 844 : 1280);
        roundBreakdownPanel.style.setProperty('--round-breakdown-scale-ref-px', rbScaleRef);
        applyRoundBreakdownPosition();
    }
    // Keep the UI-Engine Inspector's element in sync with any real dev-panel edit (this is the
    // choke point for all of them - the reverse of stage2SyncEngineToClicko()'s observer).
    // Defined in a later <script type="module"> and bridged via window.*; guarded because this
    // classic script runs before the deferred module loads.
    if (typeof window.stage2SyncClickoToEngine === 'function') window.stage2SyncClickoToEngine();
    // Dev-panel row visibility by Inspector mode - same bridging/guard. The module also calls this
    // directly on mode switches, which don't always flow through here.
    if (typeof window.stage2SyncAllRowVisibility === 'function') window.stage2SyncAllRowVisibility();
}
MOBILE_MEDIA_QUERY.addEventListener('change', applyActiveVars);
// Some emulation contexts don't fire matchMedia 'change' on resize - re-apply on resize too.
window.addEventListener('resize', applyActiveVars);

// Always reads the desktop color picker (Mobile-tab copies were removed).
function refreshButtonHue() {
    // Null-guarded: applyActiveVars() can run on resize before the dev panel (which creates this
    // picker) is built. syncColorPickersFromState() re-syncs once it exists.
    const el = document.getElementById('colorButton');
    if (el) setButtonHue(el.value);
}
function refreshBaseHue() {
    const el = document.getElementById('colorBase');
    if (el) setBaseHue(el.value);
}

// Game Mechanics sliders write straight into gameState/TAP_DEBOUNCE_MS (not cssVars), so they
// need this explicit capture/restore list for Copy/Save/Load to include them.
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

// Anti-abuse token for /api/save-settings - NOT a real secret (ships in page source). Must match
// the DEV_PANEL_SAVE_SECRET env var on the Vercel project (see README.md).
const DEV_PANEL_SAVE_SECRET = 'PkrbMti03M6xm3FEThYXa8gGW_08BOGj';

// syncSettingsToRepo() pushes a Save dump to data/processed/dev-panel-settings.json via
// /api/save-settings. Over http(s) this is the ONLY place Save writes (no localStorage fallback),
// so failure means nothing was saved - hence the visible status.
// flashDevHeaderSyncStatus() flashes the header Sync button too, since #saveSyncStatus sits at
// the bottom of the panel. Called from every resolution point, success or failure.
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
    // Undock is session-only, so dock everything back first or floating groups would be missing
    // from the capture. Shared by Save/Copy/Undo-snapshot/Named States.
    dockAllUndockedGroups();
    return { cssVars, colorVars, mobileCssVars, mobileColorVars, landscapeCssVars, landscapeColorVars, extrusionVars, mobileExtrusionVars, landscapeExtrusionVars, gameMechanics: captureGameMechanics(), devPanelStyle, mobileDevPanelStyle, landscapeDevPanelStyle, textOverrides, mobileTextOverrides, landscapeTextOverrides, textEditWrapWidths, clickBurstFrameVars, mobileClickBurstFrameVars, landscapeClickBurstFrameVars, clickBurstTextInputs, mobileClickBurstTextInputs, landscapeClickBurstTextInputs, sectionCollapseState: captureSectionCollapseState(), sectionOrder: captureSectionOrder(), devTextOverrides, devTextOverridesManual: Array.from(devTextOverridesManual), lockedGroups: Array.from(lockedGroups), devVisibility, devIndependence, devDeviceValues, stage2EngineOverrides, baseColor: document.getElementById('colorBase').value, buttonColor: document.getElementById('colorButton').value, buttonWinColor: document.getElementById('colorButtonWin').value, buttonLoseColor: document.getElementById('colorButtonLose').value, devHotkeys };
}

// Save: git-only, except on file:// (no server to write through) where it falls back to
// localStorage. Read/write are deliberately asymmetric: acquireSavedSettings() reads live from
// GitHub even on file:// (public read needs no secret), using localStorage only if unreachable.
function saveSettings() {
    const settings = buildSettingsSnapshot();
    // Undo is session-only and cleared on every real Save.
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

// Restores saved settings (git-tracked log, or localStorage fallback on file://). Async - callers
// that need the restored values must await this (see the Initialize block below).
async function loadSettings() {
    // Reset the Thin Base race guard on EVERY load: it only protects an in-flight fetch from a
    // concurrent manual toggle, and Reset must still be able to change Thin Base.
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

// Must match GITHUB_REPO/SETTINGS_FILE_PATH defaults in api/save-settings.js - kept in sync
// manually (the client can't read the function's env vars). Update both together.
const SETTINGS_GITHUB_API_URL = 'https://api.github.com/repos/LeisHo/Clicko/contents/data/processed/dev-panel-settings.json?ref=main';

// Fetches LIVE from GitHub's Contents API, not the same-origin static file (that only reflects the
// last deployment, so a fresh save would look invisible). Falls back to localStorage on file://.
// Returns null if nothing's saved or unreachable/unparsable - callers use defaults. Counts against
// GitHub's unauthenticated rate limit (60 req/hr/IP) - an accepted tradeoff.
async function acquireSavedSettings() {
    // Try GitHub first regardless of protocol (works from file:// too). Relying on localStorage
    // alone for file:// produced missing or silently-stale settings. Only SAVE needs a server.
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
        // Network unavailable, rate-limited, malformed JSON, or no CORS path - fall through.
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
            // `|| structuredClone(...)` is NOT redundant with the declare-time seed: that seed runs
            // at parse time with stale hardcoded defaults. Re-derive from the just-loaded desktop
            // vars when no explicit landscape override is saved.
            Object.assign(landscapeCssVars, settings.landscapeCssVars || structuredClone(cssVars));
            Object.assign(landscapeColorVars, settings.landscapeColorVars || structuredClone(colorVars));
            // The values were restored by Object.assign above, but the <select>s' displayed
            // option must be synced explicitly or a restored alignment looks unsaved.
            document.querySelectorAll('.dev-align-select, .dev-valign-select').forEach(select => {
                const { device } = resolveDevControlId(select.id);
                const value = (device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars)[select.dataset.var];
                if (value !== undefined) select.value = value;
            });
            // Same display-sync for the Edge Lock checkboxes.
            document.querySelectorAll('.dev-edge-lock-checkbox').forEach(checkbox => {
                const { device } = resolveDevControlId(checkbox.id);
                const value = (device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars)[checkbox.dataset.var];
                if (value !== undefined) checkbox.checked = !!value;
            });
            Object.assign(extrusionVars, settings.extrusionVars);
            Object.assign(mobileExtrusionVars, settings.mobileExtrusionVars);
            // Same declare-time-vs-load-time staleness fix as landscapeCssVars above.
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
            // Built-in Dev Panel styling: restore objects AND each control's DOM value
            // (Object.assign alone doesn't move the visible control), then re-apply the active tab.
            if (settings.devPanelStyle) Object.assign(devPanelStyle, settings.devPanelStyle);
            if (settings.mobileDevPanelStyle) Object.assign(mobileDevPanelStyle, settings.mobileDevPanelStyle);
            // Same landscape staleness fix, as an explicit else since the assign is conditional.
            if (settings.landscapeDevPanelStyle) Object.assign(landscapeDevPanelStyle, settings.landscapeDevPanelStyle);
            else Object.assign(landscapeDevPanelStyle, structuredClone(devPanelStyle));
            // null Mobile/Landscape ids = desktop-only keys (see DEV_PANEL_STYLE_SHARED_KEYS).
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
            // fontFamily (<select>) and caps checkboxes need their own restore: routing a <select>
            // through the loop above (.textContent) would destroy its <option>s, and checkboxes
            // need .checked. 'monospace' was removed as an option - remap old saves to a valid one.
            if (devPanelStyle.fontFamily === 'monospace') devPanelStyle.fontFamily = 'Arial, Helvetica, sans-serif';
            const fontFamilyEl = document.getElementById('selectDevPanelFontFamily');
            if (fontFamilyEl) fontFamilyEl.value = devPanelStyle.fontFamily;
            // Blend Mode selects - same DOM-value sync gap as the color pickers.
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
            // Base/Button/Win/Lose colors. These inputs are dev-panel-only and DON'T EXIST for
            // non-dev visitors, so every element access in this function must be null-guarded -
            // an unguarded throw here aborts the whole restore for every real player. The color
            // effect is applied directly from the saved hex (not refreshBaseHue()/
            // refreshButtonHue(), which read from the possibly-missing input).
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
            // Text Edit overrides: restore raw values, then re-render every editable slot.
            if (settings.textOverrides) {
                Object.assign(textOverrides, settings.textOverrides);
                refreshAllTextOverrides();
            }
            if (settings.mobileTextOverrides) {
                Object.assign(mobileTextOverrides, settings.mobileTextOverrides);
                refreshAllTextOverrides();
            }
            // Same landscape fallback as landscapeCssVars above.
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
            // Click Burst per-frame-set memory: restore all sets, sync the Frame Set select's
            // displayed option, then restore that set's values into the vars and scoped sliders.
            if (settings.clickBurstFrameVars) Object.assign(clickBurstFrameVars, settings.clickBurstFrameVars);
            if (settings.mobileClickBurstFrameVars) Object.assign(mobileClickBurstFrameVars, settings.mobileClickBurstFrameVars);
            // Same landscape fallback; structuredClone (not shallow) because clickBurstFrameVars is
            // nested - shared sub-objects would make tuning one tab silently mutate the other.
            if (settings.landscapeClickBurstFrameVars) Object.assign(landscapeClickBurstFrameVars, settings.landscapeClickBurstFrameVars);
            else Object.assign(landscapeClickBurstFrameVars, structuredClone(clickBurstFrameVars));
            const frameSetSelect = document.getElementById('selectClickFrameSet');
            if (frameSetSelect && cssVars['--click-frame-set']) frameSetSelect.value = cssVars['--click-frame-set'];
            restoreClickBurstFrameVars(cssVars['--click-frame-set'] || 'CLICK1');
            // Hide Shadow spec + angle floor/ceiling inputs (see clickBurstTextInputs).
            if (settings.clickBurstTextInputs) Object.assign(clickBurstTextInputs, settings.clickBurstTextInputs);
            if (settings.mobileClickBurstTextInputs) Object.assign(mobileClickBurstTextInputs, settings.mobileClickBurstTextInputs);
            // Same landscape fallback as landscapeCssVars above.
            if (settings.landscapeClickBurstTextInputs) Object.assign(landscapeClickBurstTextInputs, settings.landscapeClickBurstTextInputs);
            else Object.assign(landscapeClickBurstTextInputs, structuredClone(clickBurstTextInputs));
            applyClickBurstTextInputs();
            applySectionOrder(settings.sectionOrder);
            applySectionCollapseState(settings.sectionCollapseState);
            // Data only - rendered later by applyDevTextOverrides() from the outer load IIFE.
            if (settings.devTextOverrides) Object.assign(devTextOverrides, settings.devTextOverrides);
            // Which overrides were typed on their own tab vs auto-carried from Desktop by
            // syncTabOrderToDesktop() (see devTextOverridesManual).
            if (settings.devTextOverridesManual) devTextOverridesManual = new Set(settings.devTextOverridesManual);
            // Re-inject lock icons: loadSettings() is async, so the panel may already have been
            // built with lockedGroups empty.
            if (settings.lockedGroups) lockedGroups = new Set(settings.lockedGroups);
            if (devPanelBuilt) injectGroupLockIcons();
            // Dynamic Mobile/Landscape visibility/independence state. Rows are re-synced for the
            // same reason as lock icons: the panel may already be built with empty state.
            if (settings.devVisibility) devVisibility = settings.devVisibility;
            if (settings.devIndependence) devIndependence = settings.devIndependence;
            if (settings.devDeviceValues) devDeviceValues = settings.devDeviceValues;
            if (settings.stage2EngineOverrides) stage2EngineOverrides = settings.stage2EngineOverrides;
            if (devPanelBuilt) { syncDynamicDeviceRows(); syncDeviceCheckboxesFromState(); refreshEmptyGroupVisibility('mobile'); refreshEmptyGroupVisibility('landscape'); injectGroupDeviceCheckboxes(); }
            // Mouse Log needs devTextOverrides populated (above) to find the DEBUG group by its
            // display name - this is the call site that succeeds on a real page load.
            if (devPanelBuilt) buildMouseLogWidget();
            // Clear Highscore button - same reasoning as Mouse Log.
            if (devPanelBuilt) buildClearHighScoreButton();
            // Sync every map-driven slider's handle/readout to the restored values (Object.assign
            // alone doesn't move the visible control). Runs after every restore step above
            // (incl. frame-set re-derivation) so it reads final values.
            syncSlidersFromState();
            // Same DOM-value sync for color pickers.
            syncColorPickersFromState();
            // Same for the Dev Panel's own style controls (devPanelStyle* is a separate object
            // system, untouched by the two syncs above).
            syncDevPanelStyleControlsFromState();
            // Same display-sync for "Scale With Browser" checkboxes (the CSS effect is already
            // correct via applyActiveVars()).
            document.querySelectorAll('.dev-scale-with-browser-checkbox').forEach(cb => {
                const { device, desktopId } = resolveDevControlId(cb.id);
                const varName = cb.getAttribute('data-css-var');
                if (!varName) return;
                cb.checked = !!(device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars)[varName];
            });
            // Same, for the offset-unit (px/vw-vh) checkboxes.
            restoreOffsetUnitCheckboxes();
            // Same, for Flash-With-Round. From here on every control is dev-panel-only and
            // null-guarded (see the color comment above); real effects (classList/setProperty)
            // still apply unconditionally.
            {
                const cbFlash = document.getElementById('checkboxGameplayResultFlashWithRound');
                if (cbFlash) cbFlash.checked = !!cssVars['--gameplay-result-flash-with-round'];
            }
            // Base Follows Win/Lose Color: also toggle the .game-container class, since setting
            // .checked programmatically doesn't fire the onchange handler that normally does it.
            {
                const baseFollowsChecked = !!cssVars['--base-follows-result-color'];
                const cbBaseFollows = document.getElementById('checkboxBaseFollowsResultColor');
                if (cbBaseFollows) cbBaseFollows.checked = baseFollowsChecked;
                document.querySelector('.game-container').classList.toggle('base-follows-result-color', baseFollowsChecked);
            }
            // Hide Button/Base/Backing SVG/White SVG checkboxes.
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
            // Hide High Score checkbox.
            {
                const hideHighScoreChecked = !!cssVars['--hide-high-score-enabled'];
                const cbHideHighScore = document.getElementById('checkboxHideHighScore');
                if (cbHideHighScore) cbHideHighScore.checked = hideHighScoreChecked;
                highScoreText.classList.toggle('hidden', hideHighScoreChecked);
            }
            // Hide "Click"/"x" (Target Text Prefix/Suffix) checkboxes.
            [
                ['checkboxHideTargetPrefix', '--target-prefix-hidden', targetCountPrefix],
                ['checkboxHideTargetSuffix', '--target-suffix-hidden', targetCountSuffix],
            ].forEach(([id, varName, el]) => {
                const checked = !!cssVars[varName];
                const cb = document.getElementById(id);
                if (cb) cb.checked = checked;
                el.classList.toggle('hidden', checked);
            });
            // Round Breakdown checkboxes (plain classList toggles, not applyActiveVars() vars) and
            // the Font select (writes a CSS property directly) - no generic restore loop covers these.
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
                // Row Divider Lines, Scale With Browser, Align/Valign + Edge Lock - same gap.
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
            // Log the real error - failures here are usually unguarded DOM access, not parsing.
            console.error('Failed to apply loaded settings:', e);
        }
}

// Named Setting States (Save/Use/Delete/Set as Default): whole-panel snapshots to try without
// losing the synced settings. Reuses the existing settings shape and applyLoadedSettings()
// (ported from TEMPLATE_DEV_PANEL.html [JS-13b]). Stored in localStorage only - these are trial
// states; only "Set as Default" reaches the git log, via saveSettings().
// Save asks before overwriting an existing name (else it would duplicate). Use applies without
// touching what Sync/Reset restores. Set as Default = apply + saveSettings().
const CLICKO_SAVED_STATES_KEY = 'clickoSavedDevPanelStates';
function getSavedDevPanelStates() {
    try {
        const raw = localStorage.getItem(CLICKO_SAVED_STATES_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}
function setSavedDevPanelStates(states) {
    // Silently no-ops on storage failure (full/unavailable).
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
// Same settings shape as copySettings()/exportDevPanelSettings() - a duplicated object literal;
// keep all copies (and buildSettingsSnapshot()) in sync when adding a field.
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
// Shared by Use and Set as Default. applyLoadedSettings() only updates state + control values,
// so re-push the visual effect afterwards.
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

// Update font functions - mobile counterparts write into mobileFontVars; applyActiveVars() picks
// the visible set. The shared 8-bit font (all game text) isn't device-split, so it writes straight
// into extrusionVars.font and re-applies via applyExtrusionStyles().
function update8BitFont() {
    extrusionVars.font = `"${document.getElementById('select8BitFont').value}", monospace`;
    applyExtrusionStyles();
}

// Click frame set is a single shared choice (not device-split), stored in cssVars so it rides
// along with Copy/Save.
// Per-frame-set memory for the 8 look-and-feel sliders, per device. cssVars/mobileCssVars still
// hold the ACTIVE set's values; this layer is captured on every edit (applySliderValue()) and
// restored on frame-set switch (restoreClickBurstFrameVars()), including unsaved in-session edits.
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

// Hide Shadow spec + angle floor/ceiling: plain text/number inputs mirrored here so Copy/Save/Load
// include them. One value per tab (not per frame set), matching how spawn code reads them.
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
// Seeded from Desktop (was Mobile - swap to mobileClickBurstTextInputs to revert).
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
        // Enter blurs (consistent with other dev-panel text boxes), wrapped in the same scroll
        // guard (see preserveDevPanelScroll) against the mobile keyboard-close scroll jump.
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

// Restores a frame set's remembered values into cssVars/mobileCssVars AND syncs each scoped
// slider's DOM value/readout (Object.assign alone doesn't move a thumb). Desktop + mobile only.
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

// Swaps which button SVG (normal/pressed) shows at rest vs pressed (see .game-button.flip-svg).
// Single shared setting.
function updateFlipButtonSvg() {
    const flipped = document.getElementById('checkboxFlipButtonSvg').checked;
    cssVars['--flip-button-svg'] = flipped ? 1 : 0;
    gameButton.classList.toggle('flip-svg', flipped);
}

// Toggle section collapse
// Set right after a drag-reorder on a section title so the trailing click doesn't also toggle it
// (see setupDragReorder()).
let sectionJustDragged = false;
function toggleSection(titleEl) {
    if (sectionJustDragged) { sectionJustDragged = false; return; }
    // Text Edit Mode turns a title click into a rename (see openDevTextEditFor()).
    if (typeof textEditModeEnabled !== 'undefined' && textEditModeEnabled) {
        openDevTextEditFor(titleEl, getSectionKey(titleEl), true);
        return;
    }
    const content = titleEl.nextElementSibling;
    content.classList.toggle('collapsed');
    titleEl.textContent = content.classList.contains('collapsed') ? '▶ ' + titleEl.textContent.slice(2) : '▼ ' + titleEl.textContent.slice(2);
}

// Adds a new, empty user-created group. Uses the same .dev-section shape as built-in groups, so
// toggleSection(), setupDragReorder(), and Text Edit rename work generically. Persistence comes
// free: captureSectionOrder() walks whatever sections exist, and applySectionOrder() CREATES a
// missing section on load (that's what lets custom groups survive a reload).
// createDevGroupElement() is shared by addDevGroup() and applySectionOrder().
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

// Builds one group's lock-toggle icon as a SIBLING of .dev-section-title (the title's rename
// rewrites its whole textContent). Idempotent: replaces an existing icon instead of duplicating.
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
    // Stop pointerdown too: the icon overlaps the title bar (group drag handle), and
    // setupDragReorder() listens at document level, so a click would otherwise arm a group drag.
    icon.addEventListener('pointerdown', (e) => e.stopPropagation());
    section.appendChild(icon);
}

// Toggleable Settings Group: a checkbox on the group's title bar hides the WHOLE content area
// (display:none on .dev-section-content, nested subgroups included) as one unit.
// Usage: register the toggle as a normal checkbox control first (so it rides Copy/Save/Reset/
// Undo), THEN call this to relocate its already-wired <input> into the title bar:
//   registerDevControlArray([{ tab: 'desktop', group: 'My Group', id: 'myGroupEnabled', type: 'checkbox', label: 'Enabled', value: true }])
//   makeDevGroupToggleable('desktop', 'My Group', 'myGroupEnabled')
// This only owns visibility; the host reads the checkbox value to decide whether to apply.
// Appended as a SIBLING of .dev-section-title (unlike the template) because Clicko's title
// rename/toggle is a raw textContent replacement that would wipe a child element.
function makeDevGroupToggleable(tab, groupSid, ctrlId) {
    const titleEl = document.querySelector('#' + tab + 'TabContent > .dev-section > .dev-section-title[data-sid="' + groupSid.replace(/"/g, '\\"') + '"]');
    const cb = document.getElementById(ctrlId);
    if (!titleEl || !cb || cb.type !== 'checkbox') { console.warn('makeDevGroupToggleable: group or checkbox control not found', groupSid, ctrlId); return; }
    const section = titleEl.closest('.dev-section');
    const originalRow = cb.closest('.dev-row');

    cb.classList.add('dev-group-toggle-checkbox');
    cb.title = 'Enable/disable this whole group';
    cb.addEventListener('click', e => e.stopPropagation()); // don't also collapse/expand the group via the title's own onclick
    // Same drag guard as addGroupLockIcon(): checkbox overlaps the group drag handle.
    cb.addEventListener('pointerdown', e => e.stopPropagation());
    section.appendChild(cb);
    if (originalRow) originalRow.remove(); // the control's own default row is now redundant - the checkbox lives in the title bar instead

    function applyState() { section.classList.toggle('dev-section-group-disabled', !cb.checked); }
    cb.addEventListener('change', applyState);
    cb.addEventListener('input', applyState); // covers whichever event a Reset/Undo/Load restore dispatches
    applyState();
}

// Undock/Dock: session-only by design - no position/size/undocked-state persistence across
// reload/Save/Sync; undocking is a live viewing convenience, not a saved layout.
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
    // Same drag guard as addGroupLockIcon(): icon overlaps the group drag handle's hit area.
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    return btn;
}
// Floating panel a group's content moves into while undocked: own header drag + 8-handle resize
// (reuses setupPanelResizeHandle()'s setLeftTop callback). Geometry is inline styles, never persisted.
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

    // Header drag-to-move, simplified vs the main panel (no mobile edge-swipe clamping needed for
    // a transient, opt-in panel).
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
// Toggles one group between docked and undocked. Docking restores via saved parent+nextSibling
// (real DOM node preserved, not rebuilt from data), so the exact original position comes back.
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
// Docks every undocked group back - call before anything that reads panel structure (Copy/Sync/
// Named States/Undo snapshot): an undocked .dev-section lives under document.body, so
// captureSectionOrder()/buildSettingsSnapshot() would otherwise silently miss it.
function dockAllUndockedGroups() {
    Array.from(undockedGroups.keys()).forEach(sectionEl => {
        const entry = undockedGroups.get(sectionEl);
        if (entry) toggleGroupUndock(sectionEl, entry.btn);
    });
}

// One-time pass at panel build over every group (any nesting depth); groups created later get
// their icon via createDevGroupElement().
function injectGroupLockIcons() {
    ['desktopTabContent', 'mobileTabContent', 'landscapeTabContent'].forEach(tabId => {
        const tabEl = document.getElementById(tabId);
        if (!tabEl) return;
        tabEl.querySelectorAll('.dev-section').forEach(addGroupLockIcon);
    });
}
// Same one-time backfill as injectGroupLockIcons(), for the Undock button. Idempotent.
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

// Builds one group's drag-handle icon - reorder/nesting starts ONLY from this icon. Sibling of
// .dev-section-title for the same rename reason as addGroupLockIcon(). No stopPropagation needed:
// this IS the drag handle (setupDragReorder() gates on '.dev-group-drag-handle').
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

// One-time pass, same scope as injectGroupLockIcons(); later groups get it via createDevGroupElement().
function injectGroupDragHandles() {
    ['desktopTabContent', 'mobileTabContent', 'landscapeTabContent'].forEach(tabId => {
        const tabEl = document.getElementById(tabId);
        if (!tabEl) return;
        tabEl.querySelectorAll('.dev-section').forEach(addGroupDragHandle);
    });
}

// Row-level drag handles. No rows are ever created after load (applySectionOrder() only relocates
// existing ones), so this one-time pass is complete. Plain first child of .dev-row.
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

// Every ancestor GROUP of a selected .dev-row/.dev-section, deepest first (excludes el itself).
// Relies on the fixed shape .dev-section > .dev-section-content > (rows/subsections); top-level
// items yield an empty chain since tabEl is never a .dev-section-content.
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
// Deepest group containing all given selected elements, or null if none (all top-level, or
// disjoint subtrees). A new group from a selection nests there.
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
    // Uniqueness check spans EVERY group in the tab (nested too): group keys are flat/unprefixed
    // (see getSectionKey()), so a duplicate nested name would collide in captured sectionOrder.
    const existingNames = new Set(
        Array.from(tabEl.querySelectorAll('.dev-section > .dev-section-title'))
            .map(t => t.dataset.sid)
    );
    let name = 'New Group';
    let n = 2;
    while (existingNames.has(name)) { name = 'New Group (' + n + ')'; n++; }
    const section = createDevGroupElement(name);
    const selectedInTab = Array.from(devPanelSelectedItems).filter(el => tabEl.contains(el));
    // With a selection, nest inside its deepest common containing group; otherwise (no selection or
    // no common ancestor) fall back to the top of the project-specific list.
    const commonAncestor = selectedInTab.length ? findDevSelectionCommonAncestorGroup(selectedInTab) : null;
    if (commonAncestor) {
        const targetContent = commonAncestor.querySelector(':scope > .dev-section-content');
        targetContent.insertBefore(section, targetContent.firstChild);
    } else {
        // Insert right after the mandatory built-in groups (Dev Panel, then Debug stay first). Fallback
        // chain Debug -> Dev Panel -> position 0: Debug may be legally nested elsewhere, and jumping
        // straight to 0 would put the new group above Dev Panel. Clicko's DEBUG is a renamed custom
        // group, so its sid is resolved at runtime.
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
    // Fold the current selection into the new group - THIS tab's items only; a selection lingering
    // from another tab is left alone rather than relocated cross-tab.
    const content = section.querySelector(':scope > .dev-section-content');
    if (selectedInTab.length) {
        selectedInTab.forEach(el => content.appendChild(el));
        clearDevSelection();
        injectRowDragHandles();
    }
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Shift+click (or right-click-armed plain click) multi-select. Holds real DOM elements
// (.dev-row / .dev-section): the selection is runtime-only (never saved/copied) and addDevGroup()
// just moves these exact nodes.
const devPanelSelectedItems = new Set();
// Set by #devAddGroupBtn's contextmenu handler; while true a plain click also selects.
// Shift+click works regardless - the two triggers are additive.
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
// Capturing listener on the panel so it works for every control type; preventDefault +
// stopPropagation make a selecting click NOT also operate the control (checkbox, collapse).
// A group's TITLE takes priority over a row match and selects the whole .dev-section.
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
    // Only a click OUTSIDE the panel clears the selection (and disarms select mode).
    document.addEventListener('click', (e) => {
        if (devPanel.contains(e.target)) return;
        if (devPanelSelectedItems.size) clearDevSelection();
        if (devGroupSelectionArmed) disarmDevGroupSelection();
    }, true);
}

// Whichever Desktop/Mobile/Landscape tab is showing - the shared header buttons act on it.
function getActiveDevPanelTab() {
    return !document.getElementById('mobileTabContent').classList.contains('hidden') ? 'mobile'
        : !document.getElementById('landscapeTabContent').classList.contains('hidden') ? 'landscape'
        : 'desktop';
}
// Collapses every not-yet-collapsed group (any depth) in the active tab. Reuses toggleSection()'s
// mechanics directly, not toggleSection() itself (which also has a Text Edit Mode rename branch).
function collapseAllDevGroups() {
    const tabEl = document.getElementById(getActiveDevPanelTab() + 'TabContent');
    tabEl.querySelectorAll('.dev-section-title').forEach(titleEl => {
        const content = titleEl.nextElementSibling;
        if (!content || content.classList.contains('collapsed')) return;
        content.classList.add('collapsed');
        titleEl.textContent = '▶ ' + titleEl.textContent.slice(2);
    });
}
// Wires the header icon buttons. Called once from top-level init, regardless of whether the
// panel's controls are lazily built yet - the header is static markup present from first paint.
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
        // Left click: if armed (by a right-click), finalize - create the group and fold in the
        // selection. If not armed, just create an empty group immediately.
        addGroupBtn.addEventListener('click', () => {
            addDevGroup(getActiveDevPanelTab());
            disarmDevGroupSelection();
        });
        // Right click: first one arms select mode (no group yet); a second while armed finalizes.
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
        // Plain click toggles armed state. Arming Delete disarms Add Group's select mode and vice versa -
        // both armed at once would make a title click ambiguous between select and delete.
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
// Refuses deletion if target's own .dev-section OR any ancestor is mandatory scaffolding
// (Dev Panel/Debug) or locked. Checking the whole chain covers settings nested deep inside a
// locked or mandatory group.
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
// Delete mode: a capturing panel listener (title takes priority over row, as in
// setupDevGroupSelection()) deletes a group (any depth) or a single setting row;
// preventDefault/stopPropagation stop the click from also collapsing the group.
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
        // Uses pushDevDeleteUndoEntry(), not a value snapshot (which can't undo a deletion).
        // parent/nextSibling captured BEFORE remove() so undo restores the exact spot.
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
// SET HOTKEY FEATURE -- binds a 1-2 letter SEQUENTIAL key combo (typed in order, not held) to a
// checkbox/button/slider. Desktop only: never shown/armed/listened-for on touch devices.
// ================================================================
const devHotkeyIsTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
let devHotkeys = {}; // { [keySequence]: { id, type: 'checkbox'|'button'|'slider' } }
let devSetHotkeyArmed = false;
// Eligible targets: plain checkbox/range/button elements only. Excludes <select>, curve editors,
// color pickers, group-label buttons inside .dev-section-title, drag handles (<span>), and
// .dev-list-picker rows.
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

// Infinite, session-only undo; cleared on Save (nothing before a Save is undoable).
// Stack of FULL PANEL SNAPSHOTS (buildSettingsSnapshot(), same object Copy/Save use), not diffs:
// the mutation surface is huge (values, reorder, rename, nesting, lock, visibility...) and the
// snapshot already captures all of it in one call.
// Pushes come from ONE capturing 'pointerdown' listener on the panel, gated once per gesture
// (reset on pointerup/pointercancel), so a multi-tick slider/reorder drag is ONE undo step and no
// individual mutation handler needs wiring.
let devUndoStack = [];
let devUndoGestureActive = false;
// Extension point for state outside buildSettingsSnapshot()'s JSON (template parity).
// stage2EngineOverrides is already in the snapshot; the Inspector gap was the push trigger's
// scope, closed in setupDevPanelUndo().
let devUndoCaptureExtra = null;
let devUndoApplyExtra = null;
// Save/Load equivalent of the pair above (template parity; currently unused).
let devSaveCaptureExtra = null;
let devSaveApplyExtra = null;
function pushDevPanelUndoSnapshot() {
    // Deep-clone is REQUIRED: buildSettingsSnapshot() returns cssVars/colorVars/etc. by reference,
    // and those live objects are mutated in place on later edits - an un-cloned snapshot would
    // silently change under Undo. Same applies to `extra`.
    const extra = devUndoCaptureExtra ? devUndoCaptureExtra() : undefined;
    devUndoStack.push({
        kind: 'snapshot',
        data: JSON.parse(JSON.stringify(buildSettingsSnapshot())),
        extra: extra !== undefined ? JSON.parse(JSON.stringify(extra)) : undefined
    });
}
// Separate undo-entry kind for deleting a group/setting. A value snapshot can't recreate a
// deleted row's control markup (type/min/max/id aren't derivable from a row key), and restoring
// only an empty group shell isn't a real undo. So store the REAL live node (keeps its wired
// listeners) plus parent + nextSibling, and reinsert it on undo.
function pushDevDeleteUndoEntry(node, parent, nextSibling) {
    devUndoStack.push({ kind: 'delete', node, parent, nextSibling });
    devRedoStack = []; // a genuine new edit invalidates any pending redo history
}
// Redo: separate LIFO stack, populated only by undo/redo themselves; a real edit clears it
// (setupDevPanelUndo()'s pointerdown). A 'delete' entry's {node, parent, nextSibling} serves both
// directions - reinsert/remove at the same anchor are exact inverses.
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
// Max time a gesture may hold the undo-push gate open without a pointerup. Needed because a
// NATIVE color picker eats the pointerup, which otherwise sticks devUndoGestureActive=true and
// silently breaks every later undo push. Generous so real multi-second drags aren't cut short.
const DEV_UNDO_GESTURE_TIMEOUT_MS = 2000;
let devUndoGestureTimer = null;
function resetDevUndoGesture() {
    devUndoGestureActive = false;
    if (devUndoGestureTimer) { clearTimeout(devUndoGestureTimer); devUndoGestureTimer = null; }
}
// Shared pointerdown gesture handler, attached to BOTH devPanel and #stage2InspectorPanel (a
// sibling top-level element) so Inspector drags also push a pre-change undo snapshot.
function handleDevUndoGesturePointerdown(e) {
    if (devUndoGestureActive) return;
    // While Delete is armed the next click either deletes (pushing its own delete entry) or makes
    // no mutation, so a value snapshot here would be useless - skip.
    if (devDeleteGroupArmed) return;
    // Undo/Redo buttons live inside devPanel: without this guard, clicking Undo pushes a snapshot of
    // the CURRENT state and then immediately pops that same entry - a silent no-op. Note: el.click()
    // never fires pointerdown, so tests must dispatch real pointerdown+click to exercise this path.
    if (e.target.closest('#devUndoBtn') || e.target.closest('#devRedoBtn')) return;
    devUndoGestureActive = true;
    pushDevPanelUndoSnapshot();
    // A new edit invalidates pending redo history (standard undo/redo semantics).
    devRedoStack = [];
    // Safety-net reset in case none of pointerup/pointercancel/focus ever fires.
    devUndoGestureTimer = setTimeout(resetDevUndoGesture, DEV_UNDO_GESTURE_TIMEOUT_MS);
}
function setupDevPanelUndo() {
    devPanel.addEventListener('pointerdown', handleDevUndoGesturePointerdown, true);
    const inspectorPanel = document.getElementById('stage2InspectorPanel');
    if (inspectorPanel) inspectorPanel.addEventListener('pointerdown', handleDevUndoGesturePointerdown, true);
    document.addEventListener('pointerup', resetDevUndoGesture, true);
    document.addEventListener('pointercancel', resetDevUndoGesture, true);
    // Window regains focus when a native picker/OS dialog closes, even though the page never saw
    // the pointerup - catches the stuck-gesture case directly.
    window.addEventListener('focus', resetDevUndoGesture);
    const undoBtn = document.getElementById('devUndoBtn');
    if (undoBtn) undoBtn.addEventListener('click', undoDevPanelChange);
    const redoBtn = document.getElementById('devRedoBtn');
    if (redoBtn) redoBtn.addEventListener('click', redoDevPanelChange);
    // Ctrl+Z undo; Ctrl+Shift+Z / Ctrl+Y redo. Ignored in genuine text-input contexts (rename
    // textarea, search box) so the browser's native text undo isn't fought.
    document.addEventListener('keydown', (e) => {
        if (!(e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y') || !(e.ctrlKey || e.metaKey)) return;
        const tag = document.activeElement ? document.activeElement.tagName : '';
        if (tag === 'TEXTAREA' || (tag === 'INPUT' && document.activeElement.type === 'text')) return;
        e.preventDefault();
        const isRedo = (e.key === 'y' || e.key === 'Y') || ((e.key === 'z' || e.key === 'Z') && e.shiftKey);
        if (isRedo) redoDevPanelChange(); else undoDevPanelChange();
    });
}
// Clears undo AND redo stacks - called from saveSettings() so a Save draws a hard line.
function clearDevPanelUndoStack() {
    devUndoStack = [];
    devRedoStack = [];
}

// Ctrl+F-style search of group/setting names in the active tab. Typing only recomputes
// devSearchMatches and shows a count; only Enter / Shift+Enter navigate. Moving to a new match
// first UNDOES the previous match's highlight/expansion, so only one is ever expanded at a time.
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
    // One combined selector so matches come back in document order.
    tabEl.querySelectorAll('.dev-section-title, .dev-row').forEach(node => {
        if (node.classList.contains('dev-section-title')) {
            // Strip the leading collapse-arrow prefix (toggleSection()'s convention) before matching.
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
// Undoes the current match's navigation - call before moving to another match or abandoning.
function devSearchUndoCurrentMatch() {
    devSearchClearActiveHighlight();
    devSearchCollapseExpanded();
}
// startEl is the whole matched element; walking up from its PARENT expands only genuine
// ancestors (a group's own title is always visible regardless of collapse).
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
    // Any click off the search input clears the current match's highlight/expansion.
    document.addEventListener('click', e => {
        if (e.target === input) return;
        if (devSearchActiveIndex === -1) return;
        devSearchUndoCurrentMatch();
        devSearchActiveIndex = -1;
        devSearchUpdateCount();
    }, true);
}

// Generic pointer-based drag-to-reorder (pointer events, not HTML5 draggable, for real touch
// support). Live swap-on-crossing reorder, no ghost element; a small movement threshold
// distinguishes a drag from a click (group titles also click-to-toggle).
//   handleSelector: what starts a drag (not the row's own control, so sliders still work).
//   itemSelector: the element that actually moves (a whole .dev-section for groups).
//   onDrop: called once after a real drag, to persist the new order.
//   crossContainerSelector: omitted = stay in one parent; otherwise lets an item move into a
//     different group's content (string selector, or a function - see below).
// Sibling comparison uses this combined selector (not itemSelector) so groups and rows can be
// freely interleaved.
const REORDERABLE_SIBLING_SELECTOR = ':scope > .dev-section, :scope > .dev-row';
function setupDragReorder(handleSelector, itemSelector, onDrop, crossContainerSelector) {
    let dragging = null;
    let startY = 0;
    let moved = false;
    // setPointerCapture() on the handle is required: the handle is tiny with touch-action:none, and a
    // fast move can leave its hit area mid-drag, making the browser show a not-allowed cursor and drop
    // the gesture intermittently. Capture routes all events for this pointerId to the handle.
    let capturedHandle = null;
    const THRESHOLD = 8;

    // Touch needs hold-to-arm: handles allow native scroll (no touch-action:none), so early movement
    // must be treated as scroll. A touch commits to drag only after being held still TOUCH_HOLD_MS;
    // moving earlier cancels and falls through to native scroll. Mouse/pen use the movement threshold.
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
        // Don't start a drag on a .dev-row whose own group is locked. A locked .dev-section itself can
        // still be moved/nested as a whole - only its contents are frozen.
        if (item.matches('.dev-row')) {
            const ownSection = item.closest('.dev-section');
            const ownTitle = ownSection && ownSection.querySelector(':scope > .dev-section-title');
            if (ownTitle && lockedGroups.has(getSectionKey(ownTitle))) return;
        }

        // See capturedHandle above. try/catch: best-effort, same as other setPointerCapture() calls.
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
                    // Already committed via the hold - start reordering on the very next move.
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
                // Moved before the hold committed = a scroll attempt; let native scrolling handle it and never
                // preventDefault a gesture we didn't arm.
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
        // draggingIsBefore === true means dragging currently precedes sib (DOCUMENT_POSITION_FOLLOWING):
        // moving down past a later sibling needs it TRUE, moving up past an earlier one needs it FALSE.
        if (crossContainerSelector) {
            // Cross-container drag: re-picks the target container on every move (the one under the pointer,
            // else nearest by center), then inserts before the first sibling whose midpoint is below the
            // pointer - no direction tracking, since the container itself can change between frames.
            // Restricted to dragging's own tab.
            const tabRoot = dragging.closest('#desktopTabContent, #mobileTabContent, #landscapeTabContent');
            // crossContainerSelector may be a FUNCTION (group-nesting case): the container list must include
            // tabRoot itself (to un-nest to top level), which querySelectorAll can never return.
            const containers = typeof crossContainerSelector === 'function'
                ? crossContainerSelector(tabRoot, dragging)
                : Array.from(tabRoot.querySelectorAll(crossContainerSelector));
            // A collapsed group's content is display:none -> all-zero rect, so every collapsed candidate tied
            // and the hit test picked arbitrarily. Fall back to the group's title bar (always rendered, and
            // the only part a user can aim at). tabRoot is never display:none, so unaffected.
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
            // Combined selector - see REORDERABLE_SIBLING_SELECTOR.
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

    // Release BEFORE the `if (!dragging) return` exit: capture is taken on every handle pointerdown
    // (including a touch still pending hold-to-arm), and must be released even if no drag started.
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

// Stable group identity = tab + title, NOT DOM position: groups are drag-reorderable, so an index
// would point at the wrong group after a reorder. Tab prefix because Desktop/Mobile/Landscape have
// identically-named but separate groups.
function getSectionKey(titleEl) {
    const tab = titleEl.closest('#desktopTabContent') ? 'desktop' : titleEl.closest('#landscapeTabContent') ? 'landscape' : 'mobile';
    // data-sid is a frozen copy of the ORIGINAL title, so keys survive Text Edit Mode renames (falls
    // back to live text if missing). Deliberately NOT parent-prefixed for nested groups: a
    // nesting-dependent key disagrees between capture and fresh load, so applySectionOrder() would
    // miss the lookup and create a DUPLICATE group. Name-collision risk is closed on the creation side
    // instead (addDevGroup()'s tab-wide uniqueness check).
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

// Stable row identity = id of its control (every real row has exactly one); positional fallback
// only so capture never throws.
function getRowKey(row, fallbackIndex) {
    const idEl = row.querySelector('[id]');
    return idEl ? idEl.id : ('__row' + fallbackIndex);
}

// Order (groups within each tab, settings within each group) is saved state, captured together
// with collapse state. Captures one group's direct rows plus one level of subgroups.
// ALL queries are :scope-scoped (direct children) so a nested subgroup's rows aren't
// double-counted into its parent.
// items: one ordered list interleaving rows and subgroups in real DOM order. rowKeys/subgroups are
// still derived from it so existing readers (translateGroup(), findByKey/collectKeys) keep working.
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
        // ALL groups in the tab (top-level and nested), so an existing nested group is found and moved,
        // not recreated as a duplicate.
        const sectionsByKey = {};
        tabEl.querySelectorAll('.dev-section').forEach(sec => {
            sectionsByKey[getSectionKey(sec.querySelector(':scope > .dev-section-title'))] = sec;
        });
        // Built once across EVERY row in the tab (loose top-level rows too, not just grouped ones): on a
        // fresh load a row saved into another group still sits in its original spot, so it must be
        // findable regardless of current parent. A row's identity is its key, not its parent.
        const rowsByKey = {};
        tabEl.querySelectorAll('.dev-row').forEach((row, i) => {
            rowsByKey[getRowKey(row, i)] = row;
        });
        // Places one saved group (and, recursively, its subgroups) into parentContainer - tabEl or
        // another group's .dev-section-content. Matches captureSection()'s one-level nesting cap.
        function placeSection(savedSec, parentContainer) {
            let sec = sectionsByKey[savedSec.key];
            if (!sec) {
                // A CUSTOM group (addDevGroup()) exists only in saved order, not in static HTML, so it must be
                // created here. name = last key segment with any '>' prefixes and the 'tab:' prefix stripped.
                const name = savedSec.key.split('>').pop().replace(/^(desktop|mobile|landscape):/, '');
                // Skip 'Mouse Log': it's a dynamically built widget that buildMouseLogWidget() creates AFTER this
                // runs (it needs devTextOverrides to resolve DEBUG), so recreating it here would leave an empty
                // duplicate shell next to the real one.
                if (name === 'Mouse Log') return;
                sec = createDevGroupElement(name);
                sectionsByKey[savedSec.key] = sec;
            }
            parentContainer.appendChild(sec); // moves to the end, in saved order -> reproduces the full saved sequence
            const content = sec.querySelector(':scope > .dev-section-content');
            // Interleaved order via savedSec.items; falls back to the old "all rows, then all subgroups" shape
            // so older saved dev-panel-settings.json files still load.
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

// Live one-directional Desktop -> Mobile/Landscape order/rename mirroring, run each time that tab
// is opened (see switchDevPanelTab()), not on a timer or mid-drag.
// - Groups match by title with a descriptive parenthetical stripped.
// - Desktop row ids translate by inserting the tab prefix after the control-type prefix, kept
//   only if that id really exists on the target tab (desktop-only fields drop out).
// - Target-only rows/groups with no Desktop counterpart are appended, preserving relative order.
// - A Desktop group with no counterpart is CREATED on the target tab if it has translatable rows
//   (purely Desktop-only groups like Game Mechanics/Background get none), carrying over its rename.
// tabContentId: 'mobileTabContent'/'landscapeTabContent'; tabPrefix: 'Mobile'/'Landscape'
// (lowercased for key prefixes). Nested groups (one level) are mirrored via the recursive
// translateGroup/appendLeftoverRows helpers. Lookups are tab-wide (not :scope) because a
// counterpart may currently sit at a different nesting level; applySectionOrder() moves it.
function syncTabOrderToDesktop(tabContentId, tabPrefix) {
    const keyPrefix = tabPrefix.toLowerCase() + ':';
    const desktopOrder = captureSectionOrder().desktopTabContent;
    const mobileTabEl = document.getElementById(tabContentId);
    if (!desktopOrder || !mobileTabEl) return;
    // Strips a trailing descriptive parenthetical for cross-tab title matching. The lookahead keeps a
    // purely numeric "(2)" (addDevGroup()'s disambiguator) - otherwise "New Group" and
    // "New Group (2)" collide in mobileSectionsByNormTitle and one becomes unreachable.
    const stripParen = title => title.replace(/\s*\((?!\d+\)\s*$)[^)]*\)\s*$/, '').trim();

    // Tab-wide (not :scope) - nested groups need matching too.
    const mobileSectionsByNormTitle = {};
    mobileTabEl.querySelectorAll('.dev-section').forEach(sec => {
        const titleEl = sec.querySelector(':scope > .dev-section-title');
        const rawTitle = (titleEl.dataset.sid || titleEl.textContent.replace(/^[▼▶]\s*/, '')).trim();
        mobileSectionsByNormTitle[stripParen(rawTitle)] = sec;
    });
    // Tab-wide, including LOOSE rows with no .dev-section-content ancestor (same reason as
    // applySectionOrder()'s rowsByKey) - otherwise such rows drop out of translated groups.
    const mobileRowIdSet = new Set();
    mobileTabEl.querySelectorAll('.dev-row [id]').forEach(el => mobileRowIdSet.add(el.id));
    const placedRowIds = new Set();
    const placedGroupKeys = new Set();
    let overridesChanged = false;

    // translateGroup(): translates one Desktop group (title match, rowKeys, recursing into
    // subgroups); returns null only when there's nothing at all to mirror.
    // syncRename(): mirrors a Desktop rename onto the counterpart key on every sync (including
    // clearing it). Skips keys independently renamed on this tab (devTextOverridesManual) so a
    // deliberate per-tab name is never clobbered. Used for group titles and row labels.
    function syncRename(desktopKey, mobileKey) {
        if (devTextOverridesManual.has(mobileKey)) return;
        const desktopVal = devTextOverrides[desktopKey] != null ? devTextOverrides[desktopKey] : null;
        if (devTextOverrides[mobileKey] !== desktopVal) {
            devTextOverrides[mobileKey] = desktopVal;
            overridesChanged = true;
        }
    }
    // Walks desktopGroup.items (interleaved order) so a row above a subgroup on Desktop mirrors that
    // order; falls back to rowKeys-then-subgroups for a legacy sectionOrder.
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
                    // Row-label rename mirroring, same manual-override guard as titles.
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

    // Groups with no Desktop counterpart pass through preserving CURRENT nesting: top-level ones go
    // to the end of newMobileOrder; nested ones into their translated parent, or top level if that
    // parent was dropped (never silently vanish).
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
                // Push into BOTH items and subgroups inside a translated parent (placeSection() reads items).
                // Top-level newMobileOrder needs no such fix - it IS what applySectionOrder() reads.
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
    // Rows in a translated group with no Desktop counterpart are appended, preserving relative order,
    // at every level. :scope-scoped so a subgroup's rows aren't swept into its parent's leftovers.
    function appendLeftoverRows(group) {
        const rawTitle = group.key.replace(new RegExp('^' + keyPrefix), '');
        const sec = mobileSectionsByNormTitle[stripParen(rawTitle)];
        if (sec) {
            const content = sec.querySelector(':scope > .dev-section-content');
            Array.from(content.querySelectorAll(':scope > .dev-row')).forEach((row, i) => {
                const rowKey = getRowKey(row, i);
                if (!placedRowIds.has(rowKey)) {
                    // Push into BOTH items (what applySectionOrder() reads) and derived rowKeys, or the row vanishes
                    // on restore.
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
    // Re-run the override painter so a carried-over rename (e.g. "LOSE") shows instead of the raw
    // internal name ("New Group (2)").
    if (overridesChanged) applyDevTextOverrides();
}
function syncMobileOrderToDesktop() {
    syncTabOrderToDesktop('mobileTabContent', 'Mobile');
}
function syncLandscapeOrderToDesktop() {
    syncTabOrderToDesktop('landscapeTabContent', 'Landscape');
}

// Color pickers not otherwise special-cased (colorBase/colorButton/colorButtonWin/colorButtonLose
// are handled by setBaseHue()/setButtonHue()). Top-level so setupDevSliders()'s 'input' listener
// and syncColorPickersFromState() share one definition.
const COLOR_VAR_MAP = {
    'colorBg': '--bg-color',
    'colorRoundBreakdownOutline': '--round-breakdown-outline-color',
    'colorRoundBreakdownPanel': '--round-breakdown-panel-color',
    'colorRoundBreakdownTitle': '--round-breakdown-title-color',
    'colorRoundBreakdownData': '--round-breakdown-data-color',
    'colorRoundBreakdownLostTitle': '--round-breakdown-lost-title-color',
    'colorRoundBreakdownLostData': '--round-breakdown-lost-data-color',
};
// 8-bit extrusion colors are mobile-split but don't live in colorVars - they write straight into
// extrusionVars/mobileExtrusionVars (see applyExtrusionStyles()).
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

// Desktop tab's "uniform" controls (one input per row, plain CSS-var/extrusion-var sliders and
// color pickers), generated at runtime. Bespoke controls (Dev Panel styling, Game Mechanics, Click
// Burst text inputs, X/Y-offset sliders with a bundled px/vw checkbox) stay hand-written HTML.
// Save/load/sync code finds controls generically by id, so generated vs hand-written is irrelevant.
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
    // Drives --high-score-rotate-deg (used by .high-score-text's transform; seeded 0 in both
    // device cssVars).
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
    // Prefix/Number/Suffix X/Y offsets live in COMPOUND_OFFSET_CONTROLS (vw/vh with a Px checkbox).
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
    // Round Breakdown (loss-screen round breakdown box). checkbox/select/color entries are shared
    // (mirrored via "Show in Mobile/Landscape"); sliders are per-device (own copies in
    // MOBILE_/LANDSCAPE_UNIFORM_CONTROLS), matching the per-device cssVars split.
    { group: 'Round Breakdown', id: 'checkboxRoundBreakdownEnabled', type: 'checkbox', label: 'Round Breakdown On/Off' },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownWidth', type: 'slider', label: 'Width (vw):', min: 10, max: 100, step: 0.1, value: 20 },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownHeight', type: 'slider', label: 'Height (vh):', min: 10, max: 100, step: 0.1, value: 45 },
    { group: 'Round Breakdown', id: 'checkboxRoundBreakdownResizerEnabled', type: 'checkbox', label: 'Panel Resizer On/Off' },
    { group: 'Round Breakdown', id: 'checkboxRoundBreakdownScaleWithBrowser', type: 'checkbox', label: 'Scale With Browser' },
    // Align/Valign + Edge Lock (see applyRoundBreakdownPosition()) - shared, not per-device.
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
    // Auto Scroll (see restartRoundBreakdownAutoscroll()) - checkbox is shared.
    { group: 'Round Breakdown', id: 'checkboxRoundBreakdownAutoscrollEnabled', type: 'checkbox', label: 'Auto Scroll On/Off' },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownAutoscrollSpeed', type: 'slider', label: 'Auto Scroll Speed (px/sec):', min: 5, max: 300, step: 1, value: 30 },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownAutoscrollPauseBefore', type: 'slider', label: 'Pause Before Auto Scroll (ms):', min: 0, max: 10000, step: 100, value: 1500 },
    { group: 'Round Breakdown', id: 'sliderRoundBreakdownAutoscrollPauseEnd', type: 'slider', label: 'Pause At End Of Scroll (ms):', min: 0, max: 10000, step: 100, value: 1500 },
];
// Resolves a group's .dev-section-content by data-sid, warning on 0 matches (not found) or 2+
// (data-sid collision). Shared by every render*Controls() function.
function findGroupContent(tabId, groupSid, callerName, ctrlId) {
    // Descendant (not `>`) selector: ensureDynamicDeviceRow() runs after saved nesting is restored,
    // so the group may be drag-nested inside a custom wrapper by then.
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
// One builder per control type, dispatched by buildUniformControlRow(ctrl).
function buildSliderRow(ctrl) {
    const row = document.createElement('div');
    row.className = 'dev-row';
    const label = document.createElement('span');
    label.className = 'dev-label';
    label.textContent = ctrl.label;
    row.appendChild(label);
    // Click-to-type min/max bound labels (makeDevSliderBoundsEditable()) - edit the slider's own
    // min/max, not its value.
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
    // Optional small note (e.g. "(grayscale + tint)") in place of a value readout.
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
// Checkbox rows are inverted (checkbox first, then label text), so they don't share the
// label-first skeleton of the other builders.
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
// Generated rows are appended into their group's .dev-section-content by data-sid (frozen original
// title). Must run BEFORE setupDevSliders() so event wiring sees them. Insertion order is irrelevant:
// applySectionOrder() (via loadSettings()) re-derives display order from saved data by row id.
// Dynamic Mobile/Landscape visibility + independence (ported from TEMPLATE_DEV_PANEL.html [JS-4b0]).
// Unlike the template, Clicko's MOBILE_/LANDSCAPE_UNIFORM_CONTROLS are separate arrays, so most
// Desktop controls already have a real per-tab counterpart. For a shared control with none (e.g.
// most colors), "Show in Mobile/Landscape" dynamically creates/destroys that tab's row by cloning
// the desktop ctrl under a translated id.
let devVisibility = {}; // { [desktopId]: boolean }; default when absent: isDevRowVisible()
let devIndependence = { mobile: {}, landscape: {} }; // { [desktopId]: boolean }; default when absent: isDevRowIndependent()
let devDeviceValues = { mobile: {}, landscape: {} }; // { [desktopId]: lastIndependentValue } - retained even while hidden/non-independent

// { [stage2ElementId]: { position: {...}, size: {...} } } - saved structural override for a
// UI-Engine Stage 2 element's position.mode/size.mode. Needed because createUIElement() hardcodes
// the mode on every load and cssVars only hold values. Captured/restored (lazily, on Inspector
// selection) by the Inspector-writeback module. Plain `let` so that module reads the live binding
// and applyLoadedSettings() can reassign it wholesale.
let stage2EngineOverrides = {};

// Every DESKTOP_UNIFORM_CONTROLS entry gets both checkboxes (`dynamicDevice: true` is vestigial).
// Checkbox defaults must reproduce existing behavior exactly: a control with a real static
// Mobile/Landscape counterpart defaults independent; one without defaults shared/hidden.
function hasStaticDeviceCounterpart(desktopId, tab) {
    const targetId = dynamicDeviceTargetId(desktopId, tab);
    if (!targetId) return false;
    const arr = tab === 'landscape' ? LANDSCAPE_UNIFORM_CONTROLS : MOBILE_UNIFORM_CONTROLS;
    if (arr.some(c => c.id === targetId)) return true;
    // Fallback for hand-authored static per-device rows outside the arrays (text-settings
    // batteries): an existing DOM element means a real per-device value exists. Static rows are in
    // the DOM from page parse; array-built rows already returned true above.
    return !!document.getElementById(targetId);
}
function findStaticDeviceCtrl(desktopId, tab) {
    const targetId = dynamicDeviceTargetId(desktopId, tab);
    if (!targetId) return null;
    const arr = tab === 'landscape' ? LANDSCAPE_UNIFORM_CONTROLS : MOBILE_UNIFORM_CONTROLS;
    return arr.find(c => c.id === targetId) || null;
}
// Reads the live loaded value for a device/tab (not the static array's `value:` literal, which can
// drift) - seeds devDeviceValues so a torn-down-then-rebuilt row shows its real value.
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
// Default when unset: visible if a static Mobile OR Landscape row exists (asymmetric cases like
// sliderButtonMaxScale/MinScale have Mobile only - Landscape gets seeded from Desktop), else hidden.
function isDevRowVisible(desktopId) {
    if (devVisibility[desktopId] !== undefined) return devVisibility[desktopId];
    return hasStaticDeviceCounterpart(desktopId, 'mobile') || hasStaticDeviceCounterpart(desktopId, 'landscape');
}
// Default when unset: independent iff a static row exists for THIS tab (it already has its own
// tuned value); otherwise mirrors Desktop.
function isDevRowIndependent(tab, desktopId) {
    if (devIndependence[tab] && devIndependence[tab][desktopId] !== undefined) return devIndependence[tab][desktopId];
    return hasStaticDeviceCounterpart(desktopId, tab);
}

// Re-syncs existing row checkboxes' .checked from devVisibility/devIndependence after a state
// restore (Undo/Reset/Load), which only restores the state objects. Call BEFORE
// injectGroupDeviceCheckboxes() (group checkboxes read these row checkboxes).
function syncDeviceCheckboxesFromState() {
    document.querySelectorAll('#desktopTabContent .dev-visibility-checkbox').forEach(cb => {
        const controlEl = cb.closest('.dev-row') && cb.closest('.dev-row').querySelector('[id]');
        if (!controlEl) return;
        cb.checked = isDevRowVisible(controlEl.id);
        // Re-applies hide/show to static (non-array) counterparts; no-op for array-driven ones
        // (syncDynamicDeviceRows() handles those).
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
// desktopId -> Mobile/Landscape id (inverse of resolveDevControlId()), e.g.
// 'colorResultWinFill' -> 'colorMobileResultWinFill'.
function dynamicDeviceTargetId(desktopId, tab) {
    const infix = tab === 'landscape' ? 'Landscape' : 'Mobile';
    const m = desktopId.match(/^(slider|color|select|checkbox)(.+)$/);
    return m ? (m[1] + infix + m[2]) : null;
}
// Per-desktopId reentrancy guard (a Set, so other controls can still mirror concurrently). Required:
// a mirrored dispatch on a sibling tab re-triggers its onDevDynamicTargetEdited(), and without this
// Mobile<->Landscape ping-pong hangs the page. A single shared boolean or excluding only the
// originating tab is NOT enough.
const devDynamicBroadcastInProgress = new Set();
// Broadcasts Desktop's current value onto every non-independent Mobile/Landscape row, skipping
// `excludeTab` (the originating tab, which already reflects it).
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
// Live-mirrors a Desktop edit onto non-independent Mobile/Landscape rows; wired once (dataset guard).
function wireDesktopMirrorSource(controlEl, desktopId) {
    if (!controlEl || controlEl.dataset.mirrorWired) return;
    controlEl.dataset.mirrorWired = '1';
    const evt = controlEl.type === 'checkbox' || controlEl.tagName === 'SELECT' ? 'change' : 'input';
    controlEl.addEventListener(evt, () => broadcastDesktopValue(desktopId, null));
}
// A Mobile/Landscape row edited directly. Non-independent: treat as a Desktop edit - write
// Desktop's element WITHOUT dispatching (would re-enter via wireDesktopMirrorSource) and broadcast
// to the sibling tab (reentrancy guarded). Independent: just retain this tab's value.
function onDevDynamicTargetEdited(tab, desktopId, targetId) {
    if (isDevRowIndependent(tab, desktopId)) {
        devDeviceValues[tab][desktopId] = readDevControlValue(targetId);
        return;
    }
    writeDevControlValue(desktopId, readDevControlValue(targetId));
    broadcastDesktopValue(desktopId, tab);
}
// Desktop-only "Show in Mobile/Landscape": unchecking removes the dynamic rows; checking restores
// them, seeded from devDeviceValues (or Desktop's value the first time).
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
// Mobile/Landscape-only "Independent from Desktop": unchecking snaps to Desktop's value; checking
// restores this tab's last independent value (devDeviceValues), if any.
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
            // Save the current value before snapping to Desktop's - a default-independent control
            // that was never edited has no devDeviceValues entry, so re-checking would lose it.
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
// Group-level cascade checkbox: visibility on Desktop, independence on Mobile/Landscape. A SIBLING
// of .dev-section-title (rename rewrites the title's textContent, deleting children). No persisted
// state: display is computed from children; a click writes through to child rows and subgroups.
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
            // Must also cascade into an indeterminate subgroup: a mixed subgroup reads
            // checked:false, so `checked !== checked` alone would skip it and its descendants.
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
// Recomputes one group's cascade checkbox from its live direct children (rows + subgroups); an
// indeterminate child propagates indeterminate upward.
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
// Recomputes sectionEl's cascade checkbox and every ancestor's, after any row checkbox change.
function refreshGroupCascadeCheckboxState(sectionEl, kind) {
    let sec = sectionEl;
    while (sec) {
        recomputeGroupCascadeCheckboxState(sec, kind);
        sec = sec.parentElement ? sec.parentElement.closest('.dev-section') : null;
    }
}
// One-time pass over every group at any depth. Innermost-first (reversed document order) so a
// parent's recompute sees its children's already-correct state.
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
// Creates/removes one tab's row for a Desktop control per its visibility flag. Prefers the real
// static Mobile/Landscape ctrl definition (its min/max/label often differ, e.g. Diameter 5-60 vs
// 5-120); clones Desktop's only when none exists. On normal load static rows already exist, so
// this no-ops via `existingEl`.
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
    content.appendChild(row); // must be in the DOM before writeDevControlValue()/setupDevSliders() look it up
    const seeded = devDeviceValues[tab][desktopCtrl.id];
    const liveValue = readLiveDeviceValue(desktopCtrl.id, tab);
    writeDevControlValue(targetId, seeded !== undefined ? seeded : (liveValue !== undefined ? liveValue : readDevControlValue(desktopCtrl.id)));
    row.appendChild(buildIndependenceCheckbox(tab, desktopCtrl.id, targetEl));
    // Wires the new row; setupDevSliders()'s [data-wired] guard prevents double-wiring.
    setupDevSliders();
}
// Re-derives every Desktop control's Mobile/Landscape row from its visibility flag. Must run AFTER
// render{Mobile,Landscape}UniformControls() build the static rows, or this builds duplicate-id rows.
function syncDynamicDeviceRows() {
    DESKTOP_UNIFORM_CONTROLS.forEach(ctrl => {
        ensureDynamicDeviceRow(ctrl, 'mobile');
        ensureDynamicDeviceRow(ctrl, 'landscape');
    });
}

// Shows/hides a static (hand-authored, outside the arrays) Mobile/Landscape row per devVisibility,
// via a CSS class rather than DOM removal since static rows can't be recreated. Skips rows owned
// by ensureDynamicDeviceRow() (data-dynamicDeviceFor) so the two mechanisms never fight.
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
// Backfills both checkbox kinds onto rows the array renderers never touch (idempotent). Also
// applies each row's visibility default immediately, so a default-hidden row is actually hidden.
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

// Hides a Mobile/Landscape group (any depth) when none of its rows/subgroups are visible.
// Deepest-first so parents see children's current state. Covers both hide mechanisms: removed
// dynamic rows simply don't match; static rows are excluded via .dev-row-hidden-by-checkbox.
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
    // syncDynamicDeviceRows() deliberately NOT called here - must wait for Mobile/Landscape render.
}

// Mobile tab's uniform controls. Group titles must match Desktop's exactly (data-sid lookup and
// syncTabOrderToDesktop() rely on it).
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
    // X/Y Offset sliders live in COMPOUND_OFFSET_CONTROLS.
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
// Shared renderer for the Mobile and Landscape static rows; `callerName` is only the diagnostic
// label findGroupContent() reports when a group is missing.
function renderDeviceUniformControls(tab, controls, callerName) {
    controls.forEach(ctrl => {
        const content = findGroupContent(tab, ctrl.group, callerName, ctrl.id);
        if (!content) return;
        const row = buildUniformControlRow(ctrl);
        // "Independent from Desktop" checkbox on static rows too. Every id here maps back via
        // resolveDevControlId(), so desktopId is never null.
        const { desktopId } = resolveDevControlId(ctrl.id);
        const controlEl = row.querySelector('[id]');
        row.appendChild(buildIndependenceCheckbox(tab, desktopId, controlEl));
        content.appendChild(row);
    });
}
function renderMobileUniformControls() {
    renderDeviceUniformControls('mobile', MOBILE_UNIFORM_CONTROLS, 'renderMobileUniformControls');
}

// Landscape tab's uniform controls - same pattern as Mobile's.
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
    // X/Y Offset sliders live in COMPOUND_OFFSET_CONTROLS.
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
    renderDeviceUniformControls('landscape', LANDSCAPE_UNIFORM_CONTROLS, 'renderLandscapeUniformControls');
}

// Compound X/Y-offset rows (slider + px/vw-unit checkbox), all 3 tabs in one array tagged by `tab`.
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
    // Round Breakdown X/Y: 0-100 (not -50/50) because the offset is a gap from an edge, not a
    // centered +/- offset.
    { tab: 'desktop', group: 'Round Breakdown', id: 'sliderRoundBreakdownX', label: 'X Offset (vw):', min: 0, max: 100, step: 0.1, value: 65, checkboxId: 'checkboxRoundBreakdownXOffsetUnitPx', checkboxFlagVar: '--round-breakdown-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Round Breakdown', id: 'sliderRoundBreakdownY', label: 'Y Offset (vh):', min: 0, max: 100, step: 0.1, value: 5, checkboxId: 'checkboxRoundBreakdownYOffsetUnitPx', checkboxFlagVar: '--round-breakdown-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Ms/Click Display', id: 'sliderMsPerClickY', label: 'Y Offset (vh):', min: -50, max: 50, step: 0.01, value: -14.88, checkboxId: 'checkboxMsPerClickYOffsetUnitPx', checkboxFlagVar: '--ms-per-click-y-offset-unit-is-px', checkboxLabel: 'Px' },
    // Target Prefix/Number/Suffix offsets: all 3 parts share ONE unit per axis (--target-x-unit/
    // --target-y-unit, inherited from .target-count), so their checkboxes share one flagVar per axis
    // and setupOffsetUnitCheckboxes() converts all sliders on that flagVar+device in lockstep.
    { tab: 'desktop', group: 'Target Count Display', id: 'sliderTargetPrefixXOffset', label: 'Prefix X Offset (vw):', min: -700, max: 700, step: 0.01, value: 49.20, checkboxId: 'checkboxTargetPrefixXOffsetUnitPx', checkboxFlagVar: '--target-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Target Count Display', id: 'sliderTargetPrefixYOffset', label: 'Prefix Y Offset (vh):', min: -700, max: 700, step: 0.01, value: 9.19, checkboxId: 'checkboxTargetPrefixYOffsetUnitPx', checkboxFlagVar: '--target-y-offset-unit-is-px', checkboxLabel: 'Px' },
    // Anchor-mode counterpart: shown only when the element's UI-Engine position.mode is 'anchor'
    // (see stage2SyncRowVisibility()). Uses the group's shared Y unit flag, so no own checkbox.
    { tab: 'desktop', group: 'Target Count Display', id: 'sliderTargetPrefixYAnchorOffset', label: 'Prefix Y Offset (Anchor Mode) (vh):', min: -700, max: 700, step: 0.01, value: 0 },
    { tab: 'desktop', group: 'Target Count Display', id: 'sliderTargetNumberXOffset', label: 'Number X Offset (vw):', min: -700, max: 700, step: 0.01, value: 200.24, checkboxId: 'checkboxTargetNumberXOffsetUnitPx', checkboxFlagVar: '--target-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Target Count Display', id: 'sliderTargetNumberYOffset', label: 'Number Y Offset (vh):', min: -700, max: 700, step: 0.01, value: -50.00, checkboxId: 'checkboxTargetNumberYOffsetUnitPx', checkboxFlagVar: '--target-y-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Target Count Display', id: 'sliderTargetSuffixXOffset', label: 'Suffix X Offset (vw):', min: -700, max: 700, step: 0.01, value: 324.34, checkboxId: 'checkboxTargetSuffixXOffsetUnitPx', checkboxFlagVar: '--target-x-offset-unit-is-px', checkboxLabel: 'Px' },
    { tab: 'desktop', group: 'Target Count Display', id: 'sliderTargetSuffixYOffset', label: 'Suffix Y Offset (vh):', min: -700, max: 700, step: 0.01, value: 11.60, checkboxId: 'checkboxTargetSuffixYOffsetUnitPx', checkboxFlagVar: '--target-y-offset-unit-is-px', checkboxLabel: 'Px' },
    // Anchor-mode counterparts - Suffix has both axes anchored to the Number.
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
    // Target Prefix/Number/Suffix offsets - share one flagVar per axis (see Desktop entries).
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
    // Target Prefix/Number/Suffix offsets - share one flagVar per axis (see Desktop entries).
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

// Dev Panel's own built-in styling group (12i). Writes to devPanelStyle/mobileDevPanelStyle/
// landscapeDevPanelStyle (not cssVars) via setupDevPanelStyleControls()'s by-id wiring.
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
    // These 7 are per-tab (removed from DEV_PANEL_STYLE_SHARED_KEYS) to match their sibling
    // font-size fields; bold toggles, Tab Text Color and Title Capitalize stay shared.
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

// Desktop's 4 special-cased color pickers, read by ID in setupDevSliders(): colorButton/colorBase
// trigger a hue-rotate refresh; Win/Lose are plain cssVar writes.
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

// Game Mechanics group: Desktop-only and shared (not device-split; see GAME_MECHANICS_SLIDER_IDS).
// Read by ID via captureGameMechanics().
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

// Desktop-only Dev Panel tail: font-family select + caps/bold checkboxes. Checkbox <label> wraps
// the input FIRST, then the text (inverted from the usual label-first order).
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

// Click Burst's text/number inputs (all 3 tabs). No slider/value span; read/written by ID via
// CLICK_BURST_TEXT_INPUT_MAP/setupClickBurstTextInputs(), not CSS_VAR_SLIDER_MAP.
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
// Visual/layout controls: desktop slider id -> cssVars key. Mobile/Landscape twins write into
// mobileCssVars/landscapeCssVars; only the set matching the current breakpoint is applied
// (via applyActiveVars()).
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
    // --text-* vars now drive the Start/Try Again BUTTON (Round Text no longer has a big state).
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

// Desktop slider id -> extrusionVars/mobileExtrusionVars/landscapeExtrusionVars key, device-split
// via resolveDevControlId (same convention as CSS_VAR_SLIDER_MAP).
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
    const m = id.match(/^(slider|color|select|checkbox)(Mobile|Landscape)(.+)$/);
    if (m) return { device: m[2] === 'Landscape' ? 'landscape' : 'mobile', desktopId: m[1] + m[3] };
    return { device: 'desktop', desktopId: id };
}

// "Scale With Browser" toggle: switches a text type between its *-font-size-px and a separate
// *-font-size-vw value. Not a live px<->vw conversion, so switching can visibly jump if the two
// values aren't tuned to match (accepted tradeoff of keeping it a plain toggle).
function updateScaleWithBrowser(checkboxId, cssVarName) {
    const { device } = resolveDevControlId(checkboxId);
    const checked = document.getElementById(checkboxId).checked;
    (device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars)[cssVarName] = checked ? 1 : 0;
    applyActiveVars();
}

// Px vs vw/vh unit toggle for X/Y Offset sliders. The stored cssVar keeps the raw number; only
// the unit it's multiplied by in CSS changes (see applyTextAlignAnchors()/applyActiveVars()).
// Toggling converts the slider's own number (current viewport as reference) so nothing jumps.
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
            // A flagVar can be shared by several sliders on the SAME device (Target Count's
            // Prefix/Number/Suffix share one unit flag), so convert every slider/checkbox bound to
            // this flagVar+device together, or the others would read their old number under the
            // new unit.
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
                // Same pipeline as a real drag (updates value span, re-applies live); the flag
                // set above makes the same cssVar read under the new unit.
                applySliderValue(slider, newValue);
            });
            applyTextAlignAnchors();
        });
    });
}

// Restores offset-unit checkboxes' .checked after a settings load (the flag cssVars restore via
// Object.assign, but DOM .checked needs an explicit sync). Bound widening for out-of-range values
// is already done by applyLoadedSettings()'s slider-sync loop, which runs before this.
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

// Gameplay-mechanics sliders are not a true per-device override (only one game runs); mobile
// copies drive the same live gameState/TAP_DEBOUNCE_MS.
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

// Applies a value to whatever a slider controls (cssVar, extrusion var, or game-mechanics special
// case) and refreshes its displayed number. Shared with click-to-edit (makeDevValuesEditable()),
// whose typed value may be outside the slider's min/max.
// deferApply: skip the expensive applyActiveVars()/applyExtrusionStyles() (~3.5ms each) so a batch
// caller (syncSlidersFromState(), ~450 sliders) can apply once after its loop. Live edits leave it
// falsy for immediate feedback.
function applySliderValue(slider, value, deferApply) {
    const { device, desktopId } = resolveDevControlId(slider.id);
    const varName = CSS_VAR_SLIDER_MAP[desktopId];

    const extrusionKey = EXTRUSION_SLIDER_MAP[desktopId];

    if (varName) {
        (device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars)[varName] = value;
        // Capture into the currently selected Click Burst frame set's own storage so switching
        // frame sets and back preserves it (see restoreClickBurstFrameVars()).
        if (CLICK_BURST_SCOPED_KEYS.includes(varName)) {
            const frameSet = cssVars['--click-frame-set'] || 'CLICK1';
            (device === 'landscape' ? landscapeClickBurstFrameVars : device === 'mobile' ? mobileClickBurstFrameVars : clickBurstFrameVars)[frameSet][varName] = value;
        }
        if (!deferApply) {
            applyActiveVars();
            // applyActiveVars() just reapplied the normal button light levels; re-apply the lose
            // override on top if the lose state is currently showing.
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

// Text align/valign dropdowns: each select's data-var names the cssVar it drives, so one generic
// handler covers all of them.
function setupTextAlignSelects() {
    document.querySelectorAll('.dev-align-select, .dev-valign-select').forEach(select => {
        select.addEventListener('change', () => {
            const { device } = resolveDevControlId(select.id);
            (device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars)[select.dataset.var] = select.value;
            applyActiveVars();
        });
    });
}

// Edge Lock checkboxes: when checked, that axis's offset holds a constant px distance from the
// anchor the align/valign dropdown selects instead of scaling with the viewport (see
// applyTextAlignAnchors()).
function setupTextEdgeLockCheckboxes() {
    document.querySelectorAll('.dev-edge-lock-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const { device } = resolveDevControlId(checkbox.id);
            const activeVars = device === 'landscape' ? landscapeCssVars : device === 'mobile' ? mobileCssVars : cssVars;
            // Convert the offset from the CURRENT rendered position BEFORE the lock flag changes,
            // to avoid a visual jump (see preserveVisualPositionOnLockToggle()).
            preserveVisualPositionOnLockToggle(checkbox.dataset.var, checkbox.checked, activeVars);
            activeVars[checkbox.dataset.var] = checkbox.checked ? 1 : 0;
            applyActiveVars();
        });
    });
}

// Alignment also sets the position ANCHOR: horizontal via .align-left/.align-right classes,
// vertical via a per-element --anchor-ty (elements share var names but need independent values).
// Called from applyActiveVars() so it re-evaluates on every cssVar change/breakpoint/load.
const TEXT_ALIGN_TARGET_ELEMENT_IDS = {
    '--start-text-align': 'startButton',
    // Shares startButton with --start-text-align (one DOM element, two states); see
    // applyTextAlignAnchors()'s startButton correction.
    '--try-again-text-align': 'startButton',
    '--try-again-question-mark-text-align': 'startButtonFlashChar',
    '--round-text-align': 'gameText',
    '--high-score-text-align': 'highScoreText',
    '--target-text-align': 'targetCount',
    '--speed-text-align': 'speedDisplay',
    '--ms-per-click-text-align': 'msPerClickDisplay',
    '--result-text-align': 'resultText',
    // Named "-text-align" (though the button isn't text) so it reuses the generic xPrefix
    // derivation in applyTextAlignAnchors() without a special case.
    '--button-text-align': 'buttonAssembly',
};
// Vertical align combines independently with horizontal: horizontal stays class-based (the
// resize-handle code reads those classes, see getTextEditAnchorSide()), vertical is a per-element
// --anchor-ty, avoiding a 3x3 CSS rule matrix.
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
// NOTE: valign alone determines --anchor-ty. Adding line-height/font-metric compensation here was
// a misdiagnosis (based on Range.getBoundingClientRect() of the text node, which doesn't match the
// rendered element box); keep it uncompensated.
function computeAnchorTy(valign) {
    return VALIGN_TY[valign] || VALIGN_TY.center;
}
// Edge Lock: when checked, that axis's offset becomes a constant px distance from the selected
// anchor (edge or center). Resolved into 3 CSS props per axis: *-base (0%/50%/100%: the point
// measured FROM), *-sign (+1, or -1 for right/bottom whose base is the far edge), *-unit (1px
// locked vs 1vw/1vh unlocked). Base/sign must change too, not just the unit, because 50%-of-
// viewport itself moves on resize.
const EDGE_LOCK_BASE = { left: '0%', top: '0%', center: '50%', right: '100%', bottom: '100%' };
const EDGE_LOCK_SIGN = { left: 1, top: 1, center: 1, right: -1, bottom: -1 };
// Maps each align-loop xPrefix (e.g. '--round' from '--round-text-align') to the element's OFFSET
// cssVar prefix where the names diverge (Round's offset is '--round-dock-...', Start's is
// '--text-...'). Used only to look up each offset's *-offset-unit-is-px flag.
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
// Preserves an element's current visual position across an Edge Lock toggle (either direction).
// Toggling swaps the offset's unit (vw/vh <-> px), so the stored number must be re-solved from the
// rendered left/top (read BEFORE the toggle applies) under the new base/sign/unit, or large
// proportional offsets jump. Excludes Target and Result: their bespoke multi-element/multi-offset
// position systems aren't safe for this generic single-offset conversion.
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
        // Defensive null-guard (every current target always exists).
        if (!el) return;
        const align = activeCssVars[varName] || 'center';
        el.classList.remove('align-left', 'align-center', 'align-right');
        el.classList.add('align-' + align);
        const xPrefix = varName.replace('-text-align', '');
        // Result (Win/Lose)'s unit is set separately below: it needs per-state units while
        // base/sign stay shared, which this per-xPrefix loop can't express.
        const edgeLocked = !!activeCssVars[varName + '-edge-lock'];
        const offsetFlagPrefix = OFFSET_UNIT_FLAG_PREFIX[xPrefix];
        const pxToggled = offsetFlagPrefix ? !!activeCssVars['--' + offsetFlagPrefix + '-x-offset-unit-is-px'] : false;
        const xLocked = edgeLocked || pxToggled;
        if (xPrefix !== '--result') {
            el.style.setProperty(xPrefix + '-x-unit', xLocked ? '1px' : 'var(--cq-vw, 1vw)');
        }
        el.style.setProperty(xPrefix + '-x-base', edgeLocked ? EDGE_LOCK_BASE[align] : '50%');
        el.style.setProperty(xPrefix + '-x-sign', edgeLocked ? EDGE_LOCK_SIGN[align] : 1);
        // Target's Prefix/Number/Suffix are positioned independently, so each needs the align
        // class directly (classes don't inherit like the --target-x-base/-sign custom props).
        if (varName === '--target-text-align') {
            ['targetCountPrefix', 'targetCountNumber', 'targetCountSuffix'].forEach(partId => {
                const partEl = document.getElementById(partId);
                if (!partEl) return;
                partEl.classList.remove('align-left', 'align-center', 'align-right');
                partEl.classList.add('align-' + align);
            });
        }
    });
    // Result's own unit split: 2 outputs (win/lose) from one align var's edge-lock state, each
    // OR'd with its own px checkbox.
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
    // startButton is shared by Start and Try Again, so the loop above set its align class in map
    // order (last wins). Re-resolve from whichever state is actually showing.
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
        // Result's unit is handled separately below (see X loop).
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
    // Result's own Y-unit split - same reasoning as the X-axis block above.
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
    // Same startButton-is-shared correction for --anchor-ty.
    const startValignVarName = startButtonEl.classList.contains('try-again-state') ? '--try-again-text-valign' : '--start-text-valign';
    const startValign = activeCssVars[startValignVarName] || 'center';
    startButtonEl.style.setProperty('--anchor-ty', computeAnchorTy(startValign));
    // The "?" glyph's Y deliberately tracks Try Again's vertical position (X stays independent).
    // It's a SIBLING of startButton, and the y-base/-sign/-unit props are inline on each target
    // (custom props only inherit down the tree), so mirror them onto it as "parent-y-*"; its own
    // top: calc() adds its Y offset as a delta on top.
    const questionMarkEl = document.getElementById('startButtonFlashChar');
    if (questionMarkEl) {
        questionMarkEl.style.setProperty('--try-again-question-mark-parent-y-base', startButtonEl.style.getPropertyValue('--try-again-y-base') || '50%');
        questionMarkEl.style.setProperty('--try-again-question-mark-parent-y-sign', startButtonEl.style.getPropertyValue('--try-again-y-sign') || '1');
        questionMarkEl.style.setProperty('--try-again-question-mark-parent-y-unit', startButtonEl.style.getPropertyValue('--try-again-y-unit') || 'var(--cq-vh, 1vh)');
    }
}

// Text Edit Mode: click any text to change its wording. Keyed by named SLOT, not element, since
// some elements show two strings by state (Start/Try Again, Win/Lose) and some show a static
// suffix beside a LIVE number (Speed/Ms-per-click) - only the static wording is overridden.
let textEditModeEnabled = false;
// Per-device text overrides (12f). null means "use TEXT_OVERRIDE_DEFAULTS"; editing one device's
// slot only writes that device's object.
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
// Seeded from Desktop's.
const landscapeTextOverrides = structuredClone(textOverrides);
const TEXT_OVERRIDE_DEFAULTS = {
    startLabel: 'START', tryAgainLabel: 'Try again', roundLabel: 'ROUND',
    winSymbol: ':)', loseSymbol: ':(', speedSuffix: ' ms', msPerClickSuffix: 'ms / \nCLICK',
    // targetSuffix uses the same overrideOr() mechanism as targetPrefix; each is its own editable
    // TEXT_EDIT_TARGETS entry and independently hideable.
    targetPrefix: 'CLICK ', targetSuffix: ' X',
    highScoreLabel: 'HIGH SCORE',
    // Round Breakdown's 5 stat labels, newline-joined (see TEXT_EDIT_TARGETS.roundBreakdownTable).
    roundBreakdownLabels: 'Click Count Target:\nClicks:\nAverage Click Speed:\nFastest Click:\nSlowest Click:',
};
// The currently-ACTIVE override object, using the same isMobileActive() check as every other
// per-device value.
function activeTextOverrides() {
    return isMobileActive() ? getActiveMobileTextOverrides() : textOverrides;
}
function overrideOr(slot) {
    const v = activeTextOverrides()[slot];
    return (v !== null && v !== undefined) ? v : TEXT_OVERRIDE_DEFAULTS[slot];
}

// elementId -> how to find the currently showing slot, extract any live numeric prefix to keep
// (Speed/Ms-per-click), and re-render. render() fully recomputes content from scratch, so it's
// safe for both a live commit and a settings-load restore.
const TEXT_EDIT_TARGETS = {
    startButton: {
        // The try-again-state class tracks which slot is showing (startButtonFlashChar is a
        // permanent sibling element).
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
            // Re-resolve startButton's shared align class/--anchor-ty (and the "?" glyph's) for
            // the state just switched to.
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
        // Reads the live number from its own span (not regex-scraped from combined text).
        getPrefix: () => speedDisplayNumber.textContent || '0',
        render: (slot, prefix) => {
            speedDisplayNumber.textContent = prefix != null ? prefix : '0';
            speedDisplaySuffix.textContent = overrideOr(slot);
        },
    },
    // Target Count's Prefix/Suffix are separate entries, one per real span. A shared entry keyed to
    // #targetCount broke: openTextEditFor()'s innerHTML wipe detached the span nodes render() wrote
    // into. With el === the span, wipe-then-rebuild always targets the same live node.
    targetCountPrefix: {
        getSlot: () => 'targetPrefix',
        render: (slot) => { targetCountPrefix.textContent = overrideOr(slot); },
    },
    // The Number is live gameplay data: it gets a bounding box and blocks stray gameplay clicks in
    // Text Edit Mode, but editable:false makes the contextmenu handler skip opening an editor.
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
        // Same as speedDisplay's getPrefix().
        getPrefix: () => msPerClickDisplayNumber.textContent || gameState.maxTimeMs.toFixed(0),
        render: (slot, prefix) => {
            msPerClickDisplayNumber.textContent = prefix != null ? prefix : gameState.maxTimeMs.toFixed(0);
            renderMsPerClickSuffix(overrideOr(slot));
        },
    },
    // Round Breakdown's 5 stat-line labels. No stable per-label element exists (rows are
    // per-round and appear only once roundHistory has entries), so all 5 are edited as ONE
    // newline-joined block on the always-present table container (Shift+Enter between labels).
    // render() re-runs renderRoundBreakdown(), which reads this override.
    roundBreakdownTable: {
        getSlot: () => 'roundBreakdownLabels',
        render: () => { renderRoundBreakdown(); },
    },
};

// The suffix can hold 2 newlines (white-space:pre-wrap), giving 3 lines. Text after the 2nd newline
// goes in its own block span so --ms-per-click-line2-gap-px can adjust only the line 2-3 gap
// without touching the shared line-height. Uses text nodes, so no HTML escaping is needed.
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

// These elements are pointer-events:none during play (so they don't block taps near the button),
// which also blocks Text Edit Mode clicks; re-enabled only while Text Edit Mode is on. (Test with
// real clicks: .click() bypasses pointer-events.)
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

// Bounding-box overlay for every visible TEXT_EDIT_TARGETS element. Also exposes overlap
// ambiguity: a right-click resolves to the topmost overlapping element. Boxes are reused per
// frame, and only run while Text Edit Mode is on.
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
// Non-null only while a handle is being dragged; updateTextEditBoundingBoxes() skips that element
// to avoid fighting the drag with redundant writes.
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

// Per-element wrap width set by dragging a bounding-box edge. null = normal shrink-to-fit width.
// white-space:pre-line already wraps at a constrained width.
const textEditWrapWidths = {
    startButton: null, gameTextLabel: null, resultText: null,
    speedDisplay: 540.1875, targetCountPrefix: null, targetCountNumber: null, targetCountSuffix: null, msPerClickDisplay: 188.640625,
};
const TEXT_EDIT_WRAP_MIN_PX = 20;
function applyTextEditWrapWidth(elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    const w = textEditWrapWidths[elId];
    // width, not max-width: these are shrink-to-fit, so max-width could only shrink them, never
    // expand past content.
    el.style.width = (w !== null && w !== undefined) ? w + 'px' : '';
}
function applyAllTextEditWrapWidths() {
    Object.keys(textEditWrapWidths).forEach(applyTextEditWrapWidth);
}
// anchorSide: which edge is pinned by the current text-align anchor. 'left' -> only the RIGHT
// handle can move; 'right' mirrors. Center grows symmetrically, so the drag uses 2x speed.
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
        // The anchor's own fixed edge can't move (pinned by CSS) - no-op.
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

// Opens the inline-textarea editor for one TEXT_EDIT_TARGETS element (shared by the game-canvas
// contextmenu and the dev-panel title right-click). Temporarily un-hides a hidden element for the
// edit and restores its hidden state on commit/cancel.
function openTextEditFor(elId) {
    const el = document.getElementById(elId);
    const cfg = TEXT_EDIT_TARGETS[elId];
    if (el.querySelector('.text-edit-input')) return; // already editing
    const wasHidden = el.classList.contains('hidden');
    if (wasHidden) el.classList.remove('hidden');
    const slot = cfg.getSlot();
    const prefix = cfg.getPrefix ? cfg.getPrefix() : null;
    // Save the original child NODE OBJECTS (not an innerHTML string): wrapper targets
    // (speedDisplay/msPerClickDisplay) render into cached span references used elsewhere, so the
    // same nodes must be reattached by identity or those references are stranded.
    const originalChildren = Array.from(el.childNodes);
    // <textarea>, not <input>, so Shift+Enter can insert a newline.
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
        // Writes only to the device active at commit time (see activeTextOverrides()).
        activeTextOverrides()[slot] = (typed === '' || typed === TEXT_OVERRIDE_DEFAULTS[slot]) ? null : typed;
        // Reattach the original nodes BEFORE render() so wrapper targets' cached spans are live
        // again (harmless no-op for single-element targets).
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
        // Plain Enter commits; Shift+Enter inserts a newline (textarea default).
        if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); input.blur(); }
        else if (ev.key === 'Escape') cancel();
    });
    input.addEventListener('click', (ev) => ev.stopPropagation());
}

function setupTextEditMode() {
    Object.keys(TEXT_EDIT_TARGETS).forEach(elId => {
        const el = document.getElementById(elId);
        // While Text Edit Mode is on, block the element's normal click/tap behavior (e.g.
        // startButton starting the game). Capture phase + stopImmediatePropagation() so this
        // runs first regardless of registration order.
        ['pointerdown', 'pointerup', 'click'].forEach(evtName => {
            el.addEventListener(evtName, (e) => {
                if (!textEditModeEnabled) return;
                if (el.querySelector('.text-edit-input')) return; // actively editing - let the input handle its own clicks/cursor placement normally
                e.stopImmediatePropagation();
                e.preventDefault();
            }, true);
        });
        // Right-click opens the editor; preventDefault suppresses the native context menu.
        el.addEventListener('contextmenu', (e) => {
            if (!textEditModeEnabled) return;
            e.stopPropagation();
            e.preventDefault();
            // editable:false (targetCountNumber) gets the bounding box/click-guard but no editor.
            if (TEXT_EDIT_TARGETS[elId].editable === false) return;
            openTextEditFor(elId);
        });
    });
}

// Right-clicking a dev-panel section title with data-text-edit-target="<elId>" edits that
// element's wording too; writes to whichever DEVICE is rendering, regardless of open tab.
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

// Dev Panel's own text (section titles, setting labels) is renameable in Text Edit Mode. Flat
// key->text map: section titles keyed by getSectionKey() (data-sid-backed, so renames don't break
// collapse/order persistence); labels keyed by their row's one control id.
let devTextOverrides = {};
// Keys typed directly on a tab (vs carried over by syncTabOrderToDesktop()'s rename mirroring),
// so the sync keeps following Desktop for auto-carried names but leaves manual renames alone.
let devTextOverridesManual = new Set();
// Locked groups (keyed by getSectionKey()): only the ROWS inside can't be reordered or dragged
// out; the group itself can still move. Enforced in setupDragReorder() ("lockedGroups.has") by
// refusing to start a row drag. Dev Panel and Debug start locked on every tab; loadSettings()
// overrides this default once saved data resolves.
let lockedGroups = new Set(
    ['desktop', 'mobile', 'landscape'].flatMap(tab => [tab + ':Dev Panel', tab + ':Debug'])
);
// Each dev text's original text, captured lazily the first time it's seen with no override
// stored. Derived from the DOM rather than hand-listed (~300 labels).
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

// Renders every override (or original text). Called on initial paint (capturing originals) and
// after a settings load. Section titles keep their 2-char "▼ "/"▶ " arrow outside the override,
// matching toggleSection()'s slice(2).
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

// Keeps the dev panel's scroll position stable when committing a text-box edit (on mobile, the
// keyboard closing can re-settle scroll). Restores scrollTop immediately, next frame, and over
// ~300ms to cover both synchronous and delayed (post-keyboard-animation) jumps.
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

// Generic dev-panel text editor: same textarea-swap UX as openTextEditFor() without slots.
// isTitle preserves the leading "▼ "/"▶ " arrow outside the editable text.
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
    // Keep setupDragReorder()'s document-level pointerdown from treating textarea interaction as a
    // reorder-drag start.
    input.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    input.addEventListener('click', (ev) => ev.stopPropagation());
    let settled = false;
    function commit() {
        if (settled) return;
        settled = true;
        const typed = input.value;
        devTextOverrides[key] = (typed === '' || typed === original) ? null : typed;
        // A non-null edit marks the key manual (syncTabOrderToDesktop() stops overwriting it);
        // clearing back to the original un-marks it.
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

// Setting-label click-to-edit via one delegated listener. Capture phase + preventDefault so
// clicking a checkbox row's <label> text doesn't toggle the checkbox. Section titles are handled
// in toggleSection() (their inline onclick) instead.
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

// Color pickers: colorBase/colorButton/colorButtonWin/colorButtonLose are special-cased and
// restored in applyLoadedSettings(); Dev Panel style colors via DEV_PANEL_STYLE_CONTROL_IDS.
// syncSlidersFromState(): syncs every .dev-slider's DOM value from live state. Also runs once
// right after setupDevSliders() (before loadSettings() resolves) so config-array `value:` literals,
// which can drift from real defaults, are only ever a momentary fallback.
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
                // Auto-expand whichever bound is crossed (12h), else the handle pins at the extreme.
                if (typeof value === 'number') {
                    const min = parseFloat(el.min);
                    const max = parseFloat(el.max);
                    if (!isNaN(max) && value > max) el.max = String(value + Math.abs(value) * 0.2);
                    if (!isNaN(min) && value < min) el.min = String(value - Math.abs(value) * 0.2);
                }
                el.value = value;
                // deferApply=true: apply once after both loops instead of per slider (see
                // applySliderValue()).
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

// Restores the Dev Panel's OWN style controls' DOM state (sliders + readouts, color swatches,
// font <select>, checkboxes) from devPanelStyle/mobileDevPanelStyle/landscapeDevPanelStyle.
// These live outside CSS_VAR_SLIDER_MAP/COLOR_VAR_MAP, so syncSlidersFromState()/
// syncColorPickersFromState() skip them. Id/key lists intentionally duplicate
// setupDevPanelStyleControls()'s function-local arrays - keep the two in sync.
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

// Startup validation: every uniform slider/color config entry must resolve to a real key in the
// map that drives it (CSS_VAR_SLIDER_MAP/EXTRUSION_SLIDER_MAP, COLOR_VAR_MAP/
// EXTRUSION_COLOR_MAP/special button-color ids). A typo'd id would otherwise render a control
// that silently moves nothing. Dev Panel style/Game Mechanics/select-checkbox controls use
// explicit wiring, so a mismatch there already fails loudly at its call site.
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

// Load-order tripwire: every render*Controls() call must run before setupDevSliders() wires
// events. A render call inserted after it would create controls that are never wired, silently -
// this check makes that ordering mistake fail loudly.
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
    // dataset guard - makes this safe to call again after new elements are added post-build
    // (ensureDynamicDeviceRow() does this) without double-wiring already-wired elements.
    const sliders = document.querySelectorAll('.dev-slider:not([data-wired])');
    sliders.forEach(slider => {
        slider.dataset.wired = '1';
        slider.addEventListener('input', (e) => {
            applySliderValue(e.target, parseFloat(e.target.value));
        });
    });

    // Setup color pickers (COLOR_VAR_MAP/EXTRUSION_COLOR_MAP are top-level - see their comment).
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
            // Win/Lose button tint: plain CSS custom properties, applied via
            // .game-container:has(#resultText.result-win/-lose) - no JS needed, so it stays correct
            // regardless of which call site toggles resultText's win/lose class.
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
                // The 4 Gameplay Win/Lose colors (Target/Speed/Ms-per-click tint while a result
                // shows - not
                // resultText's symbol colors) are read ONLY by applyGameplayResultColor(), which
                // applyExtrusionStyles() doesn't call. Re-apply immediately using whichever result
                // state is
                // currently showing, or tuning while a result is visible would have no effect until
                // the next
                // win/lose transition.
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

    // Overall Border toggle(s) for the 8-bit extrusion style (desktop +
    // checkboxMobileOverallBorder),
    // matched via .dev-overall-border-checkbox since checkboxes aren't covered by the generic
    // .dev-slider/.dev-color-picker loops above.
    document.querySelectorAll('.dev-overall-border-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const { device } = resolveDevControlId(e.target.id);
            (device === 'landscape' ? landscapeExtrusionVars : device === 'mobile' ? mobileExtrusionVars : extrusionVars).overallBorderEnabled = e.target.checked;
            applyExtrusionStyles();
        });
    });
}

// Click a slider's displayed number to type an exact value, including beyond the slider's
// min/max. Generic: uses the sliderXyz <-> valueXyz id convention and the same
// applySliderValue() as the drag path, so there's no parallel value-setting logic.
// A native range input CLAMPS .value to [min,max] on assignment, so the typed value must be
// applied separately from what's written to the slider.
// Only spans with an id AND a matching range slider become editable (.dev-value-editable) -
// decorative color-picker labels share .dev-value but have neither.
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
        // Deliberately no min/max/step on this temporary input - those would restrict typing back
        // to
        // the slider's own range.
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
            // Auto-expand whichever bound the typed value crosses to typed-value +/- 20%, so the
            // value isn't
            // visually pinned at the slider's old extreme.
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            if (val > max) slider.max = String(val + Math.abs(val) * 0.2);
            if (val < min) slider.min = String(val - Math.abs(val) * 0.2);
            slider.value = val;
            // Remove the temporary <input> BEFORE applySliderValue(): its textContent update is
            // guarded by
            // "!valueEl.querySelector('input')", so a leftover input would block every future
            // readout
            // update (including normal drags).
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
        // The click that opened this input would otherwise bubble to the document-level listener
        // above
        // and could re-trigger this handler on the same element.
        input.addEventListener('click', (ev) => ev.stopPropagation());
    });
}

// Click-to-type a slider's own MIN or MAX bound (the small labels at each end of the track).
// Parallel to makeDevValuesEditable() but keyed by data-slider-id/data-bound, since a bound
// label isn't itself the value of anything with its own id.
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
            // Clamp the current value into the new range and re-apply through applySliderValue()
            // (Clicko's
            // "commit slider value to game state") only when the value actually changed.
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

// Base/backing AND button/pressed-button recolor: grayscale + levels + overlay-tint (see
// #baseGrayscaleTint/#buttonGrayscaleTint filter defs, .base-tint-flood/.button-tint-flood CSS),
// not hue-rotate. The picked color feeds the filter's feFlood directly, so any color (incl.
// white/gray) works - hue-rotate can't desaturate and does nothing on grayscale artwork.
function setBaseHue(hex) {
    document.documentElement.style.setProperty('--base-tint-color', hex);
}
function setButtonHue(hex) {
    document.documentElement.style.setProperty('--button-tint-color', hex);
}

// Light Levels/Contrast/Floor/Ceiling -> the filter's feFuncR/G/B slope/intercept, set as SVG
// attributes (not CSS-stylable in most browsers). filterId picks Base vs Button's own trio.
// level>=0: v1 = input*(1-level) + level level<0: v1 = input*(1+level) [-1 black..+1 white]
// v2 = (v1-0.5)*contrast + 0.5; output = floor + v2*(ceiling-floor)
// All stages are linear in `input`, so they compose into ONE slope+intercept. Extremes reach true
// 0/1, so Overlay blend gives pure black/white even with a tint.
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

// Blend Mode dropdowns (Button/Base Color). feBlend's `mode` isn't reliably CSS-stylable
// cross-browser, so it's set directly, same as applyLightLevels()'s slope/intercept.
function applyBlendModes(baseMode, buttonMode) {
    document.getElementById('baseTintBlend').setAttribute('mode', baseMode);
    document.getElementById('buttonTintBlend').setAttribute('mode', buttonMode);
}

// Saturation (Base/Button). See the feColorMatrix primitives' comment for why this targets the
// already-tinted result rather than SourceGraphic.
function applySaturation(baseSat, buttonSat) {
    document.getElementById('baseSaturationMatrix').setAttribute('values', baseSat);
    document.getElementById('buttonSaturationMatrix').setAttribute('values', buttonSat);
}

// Thin vs Regular base+backing artwork: a shared, persisted cssVars flag plus a class toggle on
// the common ancestor; also syncs the checkbox's displayed state.
// thinBaseUserSet guards a race: loadSettings() is async, and if the user toggles Thin Base
// before it resolves, the fetched (stale) --thin-base-enabled would overwrite their live toggle
// when applyActiveVars() -> applyThinBaseState() re-runs post-load. A direct user toggle wins.
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

// Dev panel drag - same pattern as the round-breakdown panel's title-bar drag (see there for the
// setPointerCapture-ordering note). Single shared position/size (cssVars only, not
// mobile-split), matching --dev-panel-width-px. Hooked to the whole .dev-header, not just the
// narrow "DEV" text, so the whole visible bar is draggable.
const devPanelHeader = document.querySelector('.dev-header');
let isDraggingDevPanel = false;
let devPanelDragStart = { pointerX: 0, pointerY: 0, panelLeft: 0, panelTop: 0 };

devPanelHeader.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return; // Collapse/Hide keep their own click behavior
    // Explicit preventDefault (like the resize handles) - mobile drags otherwise cut out early.
    e.preventDefault();
    const rect = devPanel.getBoundingClientRect();
    devPanelDragStart = { pointerX: e.clientX, pointerY: e.clientY, panelLeft: rect.left, panelTop: rect.top };
    isDraggingDevPanel = true;
    devPanelHeader.classList.add('dragging');
    try { devPanelHeader.setPointerCapture(e.pointerId); } catch (err) { /* best-effort only */ }
});

document.addEventListener('pointermove', (e) => {
    if (!isDraggingDevPanel) return;
    // Recovery for a dropped gesture: on touch, pointermove/pointerup/pointercancel can never
    // arrive, leaving isDraggingDevPanel stuck true (which gates this handler for every later
    // pointer). A move with no button/touch down means the gesture already ended - treat it as an
    // implicit end rather than acting on stale drag-start data.
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
    // Bare number, matching every other cssVar (see applyActiveVars()) - the CSS is
    // calc(var(...) * 1px), and a 'px'-suffixed value silently renders at HALF the offset rather
    // than erroring.
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
// lostpointercapture fires whenever capture is revoked for ANY reason (incl. a native gesture
// recognizer mid-touch) - more reliable than pointerup/pointercancel, which may never arrive.
devPanelHeader.addEventListener('lostpointercapture', endDevPanelDrag);

function toggleDevPanelCollapsed() {
    const collapsed = devPanel.classList.toggle('panel-collapsed');
    document.getElementById('devCollapseBtn').textContent = collapsed ? '▢' : '▁';
    // Measure the collapsed height explicitly in JS rather than relying on .panel-collapsed's
    // height:auto flex auto-sizing - explicit, easy to verify, and doesn't depend on which
    // children happen to be hidden.
    if (collapsed) {
        const headerHeight = devPanelHeader.getBoundingClientRect().height;
        const panelPadding = parseFloat(getComputedStyle(devPanel).paddingTop) + parseFloat(getComputedStyle(devPanel).paddingBottom);
        devPanel.style.setProperty('height', (headerHeight + panelPadding) + 'px', 'important');
    } else {
        devPanel.style.removeProperty('height');
    }
}

// Custom resize handles (native `resize` isn't touch-draggable on most mobile browsers).
// xEdge/yEdge pick the side(s); 'left'/'top' also shift left/top by the post-clamp size change so
// the OPPOSITE edge stays fixed. Size is persisted by the ResizeObserver below; left/top here.
// Optional `setLeftTop(key, value)` lets Undock panels (createUndockPanel()) persist their own way.
function setupPanelResizeHandle(panel, handle, xEdge, yEdge, setLeftTop) {
    setLeftTop = setLeftTop || ((key, value) => {
        cssVars['--dev-panel-' + key + '-px'] = value;
        document.documentElement.style.setProperty('--dev-panel-' + key + '-px', value);
    });
    let dragging = false;
    let start = { pointerX: 0, pointerY: 0, left: 0, top: 0, width: 0, height: 0 };

    handle.addEventListener('pointerdown', (e) => {
        // Explicit preventDefault on top of CSS touch-action:none - not every mobile browser
        // suppresses
        // its default touch handling from touch-action alone, which made resize drags cut out
        // early.
        e.preventDefault();
        const rect = panel.getBoundingClientRect();
        start = { pointerX: e.clientX, pointerY: e.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        dragging = true;
        try { handle.setPointerCapture(e.pointerId); } catch (err) { /* best-effort only */ }
    });

    document.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        // Same dropped-gesture recovery as the header drag above (guards against a stuck `dragging`
        // flag absorbing every future pointer move).
        if (e.buttons === 0) { end(e); return; }
        const cs = getComputedStyle(panel);
        const minW = parseFloat(cs.minWidth) || 0, maxW = parseFloat(cs.maxWidth) || Infinity;
        const minH = parseFloat(cs.minHeight) || 0, maxH = parseFloat(cs.maxHeight) || Infinity;
        const dx = e.clientX - start.pointerX;
        const dy = e.clientY - start.pointerY;

        let newWidth = start.width, newLeft = start.left;
        if (xEdge === 'right') {
            newWidth = Math.max(minW, Math.min(maxW, start.width + dx));
            // Same edge-gesture margin as the title-bar drag (devPanelEdgeMarginX) - keeps the
            // right edge
            // and its handle out of Android's back-gesture zone.
            const maxWidthFromEdge = window.innerWidth - start.left - devPanelEdgeMarginX();
            newWidth = Math.min(newWidth, Math.max(minW, maxWidthFromEdge));
        } else if (xEdge === 'left') {
            newWidth = Math.max(minW, Math.min(maxW, start.width - dx));
            newLeft = start.left + (start.width - newWidth);
            // Don't let the left edge push the panel (or its -6px-overhang handle) off-screen.
            // Re-derives
            // width from the clamped left so the RIGHT edge still stays fixed.
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
            // Deliberately NOT also panel.style.left for the main dev panel: an inline left
            // permanently
            // shadows the CSS rule (left: calc(var(--dev-panel-left-px) * 1px)), which breaks
            // header
            // drag-to-move afterward. The setProperty() above already re-renders the position. (The
            // Undock
            // panel's own setLeftTop does set style.left - it has no CSS-var-driven position.)
        }
        if (yEdge === 'top') {
            setLeftTop('top', Math.round(newTop));
            // See the xEdge === 'left' branch's comment above - same issue, vertical axis.
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

// Named Setting States markup is static/eager (not built lazily by ensureDevPanelBuilt()), so its
// list needs populating here too.
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

// Round breakdown panel - draggable (by its title bar) and natively resizable (CSS
// `resize: both`). Persists into whichever cssVars set is active (desktop/mobile), so
// copySettings()/saveSettings() pick it up. Uses pointer events since real players see this
// panel on a loss, including on touch.
const roundBreakdownTitle = document.querySelector('.round-breakdown-title');
let isDraggingBreakdown = false;
let breakdownDragStart = { pointerX: 0, pointerY: 0, panelLeft: 0, panelTop: 0 };

roundBreakdownTitle.addEventListener('pointerdown', (e) => {
    // Compute the drag-start snapshot FIRST - setPointerCapture can throw, which would abort the
    // rest
    // of this handler and leave breakdownDragStart stale. Capture is best-effort only;
    // pointermove/pointerup are on `document`, so dragging still tracks if capture fails.
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
    // Clamp so the panel can't be dragged fully off-screen. Live feedback stays real-px inline
    // style; storage is vw/vh, but converting on every pointermove would just be lossy
    // round-tripping, so conversion happens once at drag-end.
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
    // Persist the final real-px position as vw/vh ONCE at drag-end, read from the panel's live
    // getBoundingClientRect() so it's correct regardless of how the live drag computed position.
    {
        const activeVars = isMobileActive() ? getActiveMobileVars() : cssVars;
        const rect = roundBreakdownPanel.getBoundingClientRect();
        // X/Y Offset Px checkbox (see applyRoundBreakdownPosition()): store real px directly when
        // checked, or a drag would overwrite a px-mode value with a percentage, reverting the
        // toggle.
        activeVars['--round-breakdown-left-vw'] = activeVars['--round-breakdown-x-offset-unit-is-px'] ? Math.round(rect.left) : +(rect.left / window.innerWidth * 100).toFixed(3);
        activeVars['--round-breakdown-top-vh'] = activeVars['--round-breakdown-y-offset-unit-is-px'] ? Math.round(rect.top) : +(rect.top / window.innerHeight * 100).toFixed(3);
    }
    // Align/Valign + Edge Lock: pointermove always writes a plain absolute left/top. If
    // edge-locked,
    // --round-breakdown-left-vw/-top-vh mean "gap from the locked edge" (see
    // applyRoundBreakdownPosition()), so re-derive that gap once here after the drag.
    {
        // Align/Valign/Edge Lock are shared (always read from desktop cssVars);
        // width/height/left/top
        // ARE per-device, so those come from activeVars.
        const activeVars = isMobileActive() ? getActiveMobileVars() : cssVars;
        const align = cssVars['--round-breakdown-align'] || 'left';
        const valign = cssVars['--round-breakdown-valign'] || 'top';
        // In vw/vh, "gap from the right/bottom edge" is just 100 - size - offset (100vw/100vh is
        // the
        // full viewport). In Px mode the gap needs the real viewport size.
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
    // Sync the X/Y Offset sliders' displayed values with the drag - only at drag END, since
    // syncSlidersFromState() walks every slider in CSS_VAR_SLIDER_MAP (cheap once per gesture,
    // costly
    // per pointermove tick).
    syncSlidersFromState();
    applyRoundBreakdownPosition();
}
document.addEventListener('pointerup', endBreakdownDrag);
document.addEventListener('pointercancel', endBreakdownDrag);

// Custom resize handle - same reasoning as the dev panel's (native `resize` isn't
// touch-draggable on most mobile browsers, and real players see this panel on mobile).
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
    // Width/Height sliders - same reasoning as endBreakdownDrag()'s sync call above.
    syncSlidersFromState();
    // Safety-net duplicate of the ResizeObserver's inline-style cleanup: observer callbacks fire
    // asynchronously, so its !isResizingBreakdown-gated cleanup isn't guaranteed to land after this
    // flag flips. Harmless if already done (removeProperty on an unset property is a no-op).
    roundBreakdownPanel.style.removeProperty('width');
    roundBreakdownPanel.style.removeProperty('height');
}
document.addEventListener('pointerup', endBreakdownResize);
document.addEventListener('pointercancel', endBreakdownResize);

// Native `resize` sets width/height inline - persist the result, converting px to vw/vh at this
// one persistence boundary.
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
    // Clear the inline px width/height (set for live drag feedback) now that vw/vh is captured:
    // inline
    // size permanently shadows the CSS rule (`width: calc(var(--round-breakdown-width-vw) * 1vw)`),
    // so the panel would stop scaling with the viewport (same pitfall as left/top). Guarded on
    // !isResizingBreakdown - the observer also fires mid-drag, and clearing then would fight the
    // live feedback.
    if (!isResizingBreakdown) {
        roundBreakdownPanel.style.removeProperty('width');
        roundBreakdownPanel.style.removeProperty('height');
    }
    // Re-anchor to the locked edge (if any) now that width/height changed - e.g. a right-locked
    // panel
    // should grow AWAY from the right edge. applyRoundBreakdownPosition() recomputes left/top from
    // the CURRENT width/height.
    applyRoundBreakdownPosition();
}).observe(roundBreakdownPanel);

// Align/Valign + Edge Lock for the Round Breakdown panel (a draggable position:fixed box, so it
// gets its own JS mechanism next to the drag/resize code rather than the centered/translate(-50%)
// text-anchor system - see applyTextAlignAnchors()). --round-breakdown-left-vw/-top-vh mean "gap
// from LEFT/TOP" normally, or "gap from RIGHT/BOTTOM" when Align/Valign is right/bottom AND that
// axis is edge-locked. Right/Bottom without Edge Lock is a deliberate no-op, matching every other
// element's Align+Edge-Lock pairing.
// Maps a Stage 2 engine element id to the real DOM element it represents, for Round Breakdown's
// relative-mode rendering (relativeTo can be ANY object offered by the Inspector's Object picker).
// Win/Lose both map to the shared #resultText; TryAgain to the shared #startButton (a class-toggled
// state, not a separate element).
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
// Round Breakdown relative-mode positioning: the X/Y offset sliders set the gap. Only MODE and GAP
// take effect; the myAnchor/targetAnchor 9-point choice is ignored (same as
// updateTargetAnchoredPositions()), hardcoded to panel top-left relative to target bottom-left.
// Known limitation: re-measured only on applyRoundBreakdownPosition() calls (window resize,
// slider/Inspector edits via reapply()) - unlike updateTargetAnchoredPositions(), there's no
// ResizeObserver on the target, so an independent target resize (e.g. its font-size slider)
// won't re-trigger this until the next window resize or Round Breakdown edit.
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
        // relativeTo target not resolvable (not rendered yet, or a stale id) - fall through to the
        // normal
        // anchor-mode formula rather than leaving the panel at a stale/undefined position.
    }
    // Align/Valign/Edge Lock are shared - always read cssVars (activeVars on Mobile/Landscape lacks
    // these keys, so reading through it silently no-ops). Width/height/left/top ARE per-device and
    // vw/vh-native, so the real px position for THIS viewport is derived here at render time.
    const activeVars = isMobileActive() ? getActiveMobileVars() : cssVars;
    const align = cssVars['--round-breakdown-align'] || 'left';
    const valign = cssVars['--round-breakdown-valign'] || 'top';
    const widthVw = activeVars['--round-breakdown-width-vw'] || 20;
    const heightVh = activeVars['--round-breakdown-height-vh'] || 45;
    const offsetXVw = activeVars['--round-breakdown-left-vw'] || 0;
    const offsetYVh = activeVars['--round-breakdown-top-vh'] || 0;
    const width = widthVw / 100 * window.innerWidth;
    const height = heightVh / 100 * window.innerHeight;
    // X/Y Offset Px checkbox (per-device, like the offsets). When checked the stored number is
    // ALREADY px (setupOffsetUnitCheckboxes() converts at flip time), so use it directly.
    const offsetX = activeVars['--round-breakdown-x-offset-unit-is-px'] ? offsetXVw : offsetXVw / 100 * window.innerWidth;
    const offsetY = activeVars['--round-breakdown-y-offset-unit-is-px'] ? offsetYVh : offsetYVh / 100 * window.innerHeight;
    const left = (align === 'right' && cssVars['--round-breakdown-align-edge-lock']) ? (window.innerWidth - width - offsetX) : offsetX;
    const top = (valign === 'bottom' && cssVars['--round-breakdown-valign-edge-lock']) ? (window.innerHeight - height - offsetY) : offsetY;
    roundBreakdownPanel.style.left = left + 'px';
    roundBreakdownPanel.style.top = top + 'px';
}
window.addEventListener('resize', applyRoundBreakdownPosition);

// Game logic
// Round Text has no "big" state or animation - it always renders at one permanent look
// (.game-text's CSS reads --round-dock-* directly).
function showRoundText(roundNum) {
    gameState.canTap = false;
    // Captured BEFORE resultText's .result-lose is cleared below. Try Again resets currentRound to
    // 1,
    // which often EQUALS the round just lost on - hadPreviousRound would then skip the blink/flash
    // sequence. Force it on for a Lose->Try Again transition; a fresh page load is still excluded
    // since gameTextNumber.textContent is empty then.
    const wasLoseTransition = resultText.classList.contains('result-lose');
    gameText.classList.remove('hidden');
    // Hide resultText explicitly here (not later in showTargetAndSpeed()) - otherwise the win ":)"
    // stays on screen through the whole round announcement, overlapping the Round text.
    resultText.classList.add('hidden');
    // When the flash checkbox is on, these texts aren't flatly hidden for the announcement -
    // runRoundBlinkSequence()'s step() toggles them in lockstep with the round number's blink.
    // Default (off): flat hide.
    if (!cssVars['--gameplay-result-flash-with-round']) {
        targetCount.classList.add('hidden');
        speedDisplay.classList.add('hidden');
        msPerClickDisplay.classList.add('hidden');
    }

    // "Round" is a separate element from the number so it never moves/re-renders when the number
    // blinks/changes (see #gameTextLabel's CSS comment).
    gameTextLabel.textContent = overrideOr('roundLabel');

    const hadPreviousRound = (!!gameTextNumber.textContent && gameTextNumber.textContent !== String(roundNum)) || wasLoseTransition;
    if (!hadPreviousRound) {
        // Nothing to blink away from (first round of a game, or same round shown) - show it and
        // start
        // gameplay immediately so Round Text appears in the same paint as
        // Target/Speed/Ms-per-click.
        // Post-win transitions (blink branch below) keep their hold, to show the OLD number first.
        gameTextNumber.textContent = roundNum;
        gameTextNumber.style.visibility = 'visible';
        showTargetAndSpeed();
        return;
    }

    // The OLD number stays on screen, the blink sequence runs immediately (no pre-blink hold), then
    // gameplay starts.
    runRoundBlinkSequence(roundNum);
}

// Flashes the OLD round number 3 times (hide/show x3), THEN reveals the new value. Each flash's
// hide/show duration is its own slider (6 total). Only #gameTextNumber's visibility toggles (not
// layout), so "Round" never shifts - see its CSS comment.
function runRoundBlinkSequence(roundNum) {
    const phases = [
        { visible: false, ms: cssVars['--round-blink1-hide-ms'] },
        { visible: true, ms: cssVars['--round-blink1-show-ms'] },
        { visible: false, ms: cssVars['--round-blink2-hide-ms'] },
        { visible: true, ms: cssVars['--round-blink2-show-ms'] },
        { visible: false, ms: cssVars['--round-blink3-hide-ms'] },
        { visible: true, ms: cssVars['--round-blink3-show-ms'] },
        // Blink 4 - a genuine 4th phase in the SAME sequential chain, still showing the OLD number,
        // hidden for its own duration; the swap to the new number happens only after it elapses
        // (race-free
        // by construction).
        { visible: false, ms: cssVars['--round-blink4-hide-ms'] },
    ];
    let i = 0;
    function step() {
        if (i >= phases.length) {
            gameTextNumber.textContent = roundNum;
            gameTextNumber.style.visibility = 'visible';
            // When flashing with the round number, Target/Speed/Ms-per-click's new-round values
            // must appear in
            // the SAME paint as the round number, so showTargetAndSpeed() (which computes/reveals
            // them and
            // sets gameState.canTap) runs here rather than after the --round-post-blink-hold-ms
            // wait.
            // Default (flag off): still holds before showTargetAndSpeed().
            if (cssVars['--gameplay-result-flash-with-round']) {
                showTargetAndSpeed();
                return;
            }
            // Holds the new number on screen (--round-post-blink-hold-ms) before gameplay starts -
            // the only
            // hold in the sequence.
            setTimeout(() => {
                showTargetAndSpeed();
            }, cssVars['--round-post-blink-hold-ms']);
            return;
        }
        const phase = phases[i++];
        gameTextNumber.style.visibility = phase.visible ? 'visible' : 'hidden';
        // Flash-with-round mode (see showRoundText()): toggles ONLY the live NUMBER spans, never
        // static
        // words. speedDisplay/msPerClickDisplay have their own number/suffix child spans for this,
        // so
        // " ms"/"CLICK" stay visible, same as "ROUND" beside gameTextNumber.
        if (cssVars['--gameplay-result-flash-with-round']) {
            // Blinks targetCountNumber AND targetCountSuffix ("x") together; the prefix stays
            // static.
            [targetCountNumber, targetCountSuffix, speedDisplayNumber, msPerClickDisplayNumber].forEach(el => {
                el.style.visibility = phase.visible ? 'visible' : 'hidden';
            });
        }
        setTimeout(step, phase.ms);
    }
    step();
}

// High Score blink - flashes only when checkHighScore() already confirmed the score changed (so no
// separate "unchanged" guard). Reuses the round number's Blink 1-4 timers (--round-blink1 ..
// --round-blink4-hide-ms), not a dedicated set. --high-score-flash-delay-ms (default 0 = same
// instant as the loss) delays the sequence START. Deliberately no enforced relationship with
// Result Text Duration (sliderResultDuration) - tuning the two is left to the delay slider.
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

// Blinks the "?" in "Try again?": Hold (visible) then Flash (hidden), repeating while the Try
// Again state is on screen; stopped via stopTryAgainFlash() when that state ends (new game or
// R-key reset).
function startTryAgainFlash() {
    stopTryAgainFlash();
    function cycle(visible) {
        const charEl = document.getElementById('startButtonFlashChar');
        if (!charEl) return; // defensive only - this is a permanent element now
        // opacity, not visibility: a visibility toggle forces a main-thread repaint of the heavy
        // multi-layer extrusion shadow; opacity on a will-change-promoted element is
        // compositor-only.
        // pointer-events:none already makes this element ignore clicks regardless.
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
    // Ceiling mirrors the floor's base+per-round-increase shape. Clamped to never fall below
    // targetFloor (e.g. if its increase is slower) so the random range is never inverted.
    const targetCeiling = Math.max(targetFloor, gameState.targetCeilingBase + (gameState.currentRound - 1) * gameState.targetCeilingIncreasePerRound);
    // Re-roll until it differs from the PREVIOUS round's target (no back-to-back repeats). Skipped
    // on
    // round 1, and when targetCeiling <= targetFloor - a single-value range can't avoid repeating,
    // so
    // that guard prevents an infinite loop.
    const previousTargetCount = gameState.targetCount;
    do {
        gameState.targetCount = Math.floor(Math.random() * (targetCeiling - targetFloor + 1)) + targetFloor;
    } while (gameState.currentRound > 1 && targetCeiling > targetFloor && gameState.targetCount === previousTargetCount);
    // Round 1 plays at exactly the Starting Time slider value (startGame() sets maxTimeMs from it),
    // so
    // the decrease block is skipped on round 1. The exponent below still counts from round 1
    // (currentRound - 1).
    if (gameState.currentRound > 1) {
        // effectiveDecrease shrinks each round when speedDecreaseDecay < 1 (exponential decay
        // compounded
        // per round), floored at 1ms rather than decaying toward 0.
        const baseSpeedDecrease = gameState.speedDecrease * Math.pow(gameState.speedDecreaseDecay, gameState.currentRound - 1);
        // Tolerance jitter: a fresh +/- speedDecreaseDecayTolerance% random swing on THIS round's
        // decay
        // only (not compounded into future rounds' exponent), re-rolled every round.
        const toleranceFraction = gameState.speedDecreaseDecayTolerance / 100;
        const jitter = 1 + (Math.random() * 2 - 1) * toleranceFraction;
        const effectiveSpeedDecrease = Math.max(1, baseSpeedDecrease * jitter);
        let nextMaxTimeMs = gameState.maxTimeMs - effectiveSpeedDecrease;
        // Rounds to the nearest multiple of speedTimeRounding (1 = no-op) BEFORE the 100ms floor,
        // so the
        // floor still holds even if rounding would push a near-floor value under it.
        if (gameState.speedTimeRounding > 1) {
            nextMaxTimeMs = Math.round(nextMaxTimeMs / gameState.speedTimeRounding) * gameState.speedTimeRounding;
        }
        gameState.maxTimeMs = Math.max(100, nextMaxTimeMs);
    }
    // currentTapCount and friends are PER-ROUND state - reset every time a new round begins.
    gameState.currentTapCount = 0;
    gameState.isCountingTaps = false;
    stopRoundCountdown();
    currentRoundTaps = [];
    roundStartTime = Date.now();
    // totalClickCount and lastAcceptedTapTime are session-wide (NOT reset here - this runs every
    // round). Only startGame() or the dev 'r' reset clears them, matching the tap-diagnostic log's
    // lifetime so the visible counter and the log never disagree.
    // gameText (Round Text) is deliberately NOT hidden here - it stays visible throughout gameplay.
    resultText.classList.add('hidden');
    // The next round genuinely begins here - the single choke point every path funnels through (the
    // fast path in showRoundText() and both branches of runRoundBlinkSequence()'s completion). The
    // button/base Win/Lose tint (driven by resultText's .result-win/.result-lose via the :has() CSS
    // rule) reverts here, not earlier, so every gameplay-result-color mechanism reverts in
    // lockstep.
    resultText.classList.remove('result-win', 'result-lose');
    // The next round begins here - revert Target/Speed/Ms-per-click to their normal (untinted)
    // color.
    // The explicit style.visibility resets below undo runRoundBlinkSequence()'s inline toggling
    // (its
    // last phase ends hidden, and classList.remove('hidden') doesn't touch inline visibility).
    // Every element in that function's toggle array - incl. targetCountSuffix - must be restored
    // here,
    // or it stays hidden after the first flash-with-round announcement. Keep the two lists in sync.
    applyGameplayResultColor(null);
    targetCountNumber.style.visibility = 'visible';
    targetCountSuffix.style.visibility = 'visible';
    speedDisplayNumber.style.visibility = 'visible';
    msPerClickDisplayNumber.style.visibility = 'visible';
    targetCountNumber.textContent = gameState.targetCount;
    targetCount.classList.remove('hidden');
    // Countdown's total budget, rounded to a whole number. The live ticking display
    // (startRoundCountdown()/tickRoundCountdown()) only begins on the round's first tap; until then
    // this shows the static starting value.
    gameState.roundTotalTimeMs = gameState.maxTimeMs * gameState.targetCount;
    gameState.countdownStartTime = null;
    speedDisplayNumber.textContent = gameState.roundTotalTimeMs.toFixed(0);
    speedDisplaySuffix.textContent = ' ms';
    speedDisplay.classList.remove('hidden');
    // The raw per-click rate, shown above the countdown (which shows the TOTAL round budget).
    msPerClickDisplayNumber.textContent = gameState.maxTimeMs.toFixed(0);
    renderMsPerClickSuffix(overrideOr('msPerClickSuffix'));
    msPerClickDisplay.classList.remove('hidden');
    // Target/Speed/Ms-per-click were just revealed from hidden - re-run so their
    // align/edge-lock/unit
    // vars (set by applyTextAlignAnchors(), not just --anchor-ty) are current.
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
    // The array is deliberately uncapped (full session history). Appends just the ONE new line
    // (O(1))
    // instead of re-rendering the whole array per tap, which lagged with many taps while the panel
    // was open. Falls back to a full rebuild only if the DOM fell behind the array (e.g. entries
    // added while hidden); rebuildTapDiagnosticDisplay() runs when the panel is toggled visible.
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
    // Visual press feedback, the click counter, and the tap diagnostic work regardless of game
    // state
    // (responsive on the landing page too), unlike actual gameplay.
    // Press gets its own transition duration, set right before the class that triggers the
    // transition - see .game-button's CSS comment for why this can't be a static CSS rule.
    const activeCssVarsForPress = isMobileActive() ? getActiveMobileVars() : cssVars;
    const pressMs = activeCssVarsForPress['--button-press-ms'];
    if (pressMs > 0) {
        // Set the transition inline, directly and completely, rather than through
        // --button-active-transition-ms - a leftover non-zero value there would survive into a
        // later
        // zero-duration press, since the zero branch below never touches it.
        gameButton.style.transition = `transform ${pressMs}ms ease-out`;
        gameButton.classList.add('pressed');
    } else {
        // transition:none (not a 0ms transition) forces the pressed position instantly even if a
        // prior
        // rapid tap's transition hasn't settled.
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

    // Per-click ceiling: lose immediately if the gap since the PREVIOUS tap THIS ROUND exceeds
    // maxTimeMs (the "ms/click" setting), independent of the round countdown. Checked from the 2nd
    // tap
    // onward only - time-to-first-tap isn't constrained.
    if (currentRoundTaps.length > 1) {
        const gapSinceLastRoundTap = currentRoundTaps[currentRoundTaps.length - 1] - currentRoundTaps[currentRoundTaps.length - 2];
        if (gapSinceLastRoundTap > gameState.maxTimeMs) {
            stopRoundCountdown();
            endGame(false, 'too-slow');
            return;
        }
    }

    // Countdown starts on the round's FIRST accepted tap, not before.
    if (gameState.currentTapCount === 1) {
        startRoundCountdown();
    }
    // (Re)arm the per-click ceiling's ACTIVE timer on every accepted tap, INCLUDING the tap that
    // reaches exactly targetCount: the reactive check above never fires if the player just stops
    // tapping. Intended win sequence: reach target -> this timer elapses with no further tap ->
    // win.
    // armPerClickTimeout()'s fire handler branches win (currentTapCount === targetCount) vs. lose,
    // so don't skip arming at target - that would make a win wait out the much slower aggregate
    // countdown instead.
    armPerClickTimeout();
}

// Round countdown: one continuous timer for the whole round, starting on the first tap. A single
// setTimeout fires the loss at roundTotalTimeMs, while a separate requestAnimationFrame loop
// (tickRoundCountdown) redraws remaining time into speedDisplay - decoupled so the visual update
// rate doesn't affect loss-timing accuracy.
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
    // Countdown Display Rounding (Game Mechanics) - rounds the LIVE display to the nearest
    // multiple;
    // 1 = no rounding (exact ms).
    if (gameState.countdownRoundingIncrement > 1) {
        remaining = Math.round(remaining / gameState.countdownRoundingIncrement) * gameState.countdownRoundingIncrement;
    }
    // Rounded to a whole number.
    speedDisplayNumber.textContent = remaining.toFixed(0);
    speedDisplaySuffix.textContent = overrideOr('speedSuffix');
    if (remaining > 0 && gameState.isCountingTaps) {
        gameState.countdownRafId = requestAnimationFrame(tickRoundCountdown);
    }
}

// Per-click ceiling's ACTIVE timer - (re)armed on every accepted tap (see handleGameButtonPress),
// independent of the round countdown. Fires the loss on its own the moment silence outlasts
// maxTimeMs, rather than waiting for a later tap to notice.
function armPerClickTimeout() {
    if (gameState.perClickTimeoutId) { clearTimeout(gameState.perClickTimeoutId); }
    gameState.perClickTimeoutId = setTimeout(() => {
        gameState.perClickTimeoutId = null;
        if (!gameState.isPlaying || !gameState.canTap) return;
        stopRoundCountdown();
        // Exactly at target when this fires = the player reached the goal and stopped tapping - win
        // immediately rather than waiting for the round countdown. Below target = too slow (lose).
        // Above
        // target can't reach here: the overshoot check in handleGameButtonPress() ends the round
        // first.
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
        // Highest round actually WON this run - separate from gameState.currentRound, which at a
        // loss is
        // the round you were ON, not the last one beaten. High score uses this (see
        // checkHighScore()).
        gameState.lastRoundWon = gameState.currentRound;
        // Plain ":)" instead of the randomized winMessages pool - winMessages is left declared but
        // unused.
        resultText.textContent = overrideOr('winSymbol');
        resultText.classList.remove('result-lose');
        resultText.classList.add('result-win');
        resultText.classList.remove('hidden');
        // Target/Speed/Ms-per-click don't disappear on win/lose - they just change color (reverted
        // in
        // showTargetAndSpeed() when the next round begins, or flashed by runRoundBlinkSequence() if
        // the
        // flash checkbox is on). See applyGameplayResultColor().
        applyGameplayResultColor('win');

        setTimeout(() => {
            // High Score check on WIN, so a new high score shows the instant the round that beats
            // it is won,
            // not only when the run ends. Called inside THIS setTimeout (not synchronously at win
            // time) so its
            // flash (runHighScoreBlinkSequence(), reusing the --round-blink*-ms timers) starts on
            // the same
            // tick as showRoundText()'s runRoundBlinkSequence() just below.
            // --high-score-flash-delay-ms
            // still offsets from this shared start point.
            checkHighScore(gameState.lastRoundWon);
            gameState.currentRound++;
            showRoundText(gameState.currentRound);
        }, gameState.resultDuration);
    } else {
        setButtonHue('#dd3333');
        // High Score check - safety-net call. The real trigger is in the win branch above; by the
        // time of
        // a loss round === highScore, so this is normally a no-op fallback. Uses
        // gameState.lastRoundWon
        // (0 if none), not currentRound (the round lost on, never a round beaten).
        checkHighScore(gameState.lastRoundWon);
        // Same as the win case: plain ":(" instead of the randomized
        // tooManyMessages/notEnoughMessages
        // pools (and no "(count/target)" suffix).
        resultText.textContent = overrideOr('loseSymbol');
        resultText.classList.remove('result-win');
        resultText.classList.add('result-lose');
        resultText.classList.remove('hidden');
        renderRoundBreakdown();
        // See the win branch's own comment above.
        applyGameplayResultColor('lose');

        setTimeout(() => {
            // Fixed literal "Try again?" text (tryAgainMessages pool left declared but unused; no
            // "ROUND X ·"
            // prefix). The "?" is its own permanent sibling element so it can blink
            // (startTryAgainFlash())
            // and position independently of this button.
            startButton.textContent = overrideOr('tryAgainLabel');
            startButton.classList.add('try-again-state');
            startButton.classList.remove('hidden');
            document.getElementById('startButtonFlashChar').classList.remove('hidden');
            // Re-resolve startButton's align-class/--anchor-ty and startButtonFlashChar's
            // Align/Valign anchors
            // for the now-current Try Again state (see applyTextAlignAnchors()).
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
    // Text Edit Mode's 5 editable stat labels (see TEXT_EDIT_TARGETS.roundBreakdownTable). Falls
    // back
    // to the individual TEXT_OVERRIDE_DEFAULTS strings if the override has fewer than 5 lines, so a
    // partial/mid-edit override never blanks a label.
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
    // ONE copy inside a .round-breakdown-scroll-track while Auto Scroll is enabled (manual-scroll
    // mode:
    // a single copy, no wrapper, native overflow). Don't duplicate here - tick() in
    // restartRoundBreakdownAutoscroll() adds the 2nd copy only once the content actually needs to
    // scroll; duplicating eagerly shows short content (e.g. one round) twice.
    roundBreakdownTable.innerHTML = cssVars['--round-breakdown-autoscroll-enabled']
        ? '<div class="round-breakdown-scroll-track">' + rows + '</div>'
        : rows;
    // Round Breakdown On/Off gate at the one call site that un-hides the panel. ALSO gated on an
    // actual loss existing in roundHistory: refreshAllTextOverrides() calls this generically on
    // every
    // page load/resize to restore Text Edit Mode labels, which would otherwise show the panel on
    // startup.
    const hasLoss = roundHistory.some(r => !r.won);
    if (cssVars['--round-breakdown-enabled'] !== 0 && hasLoss) {
        roundBreakdownPanel.classList.remove('hidden');
    }
    restartRoundBreakdownAutoscroll();
}

// Auto Scroll: seamless marquee of 2 duplicated copies via translateY() (scrollTop writes jitter).
// Loop: wait pauseBeforeMs -> translate up ONE copy's height at speedPxPerSec -> wait pauseEndMs
// (last round visible) -> reset to 0 (copy 2 there looks identical to copy 1 at 0) -> repeat.
// roundBreakdownAutoscrollToken lets a stale rAF loop from a PRIOR call detect it and bail.
let roundBreakdownAutoscrollToken = 0;
function stopRoundBreakdownAutoscroll() {
    roundBreakdownAutoscrollToken++;
}
function restartRoundBreakdownAutoscroll() {
    stopRoundBreakdownAutoscroll();
    // Shared, always desktop cssVars - reading a shared var through per-device activeVars silently
    // no-ops on Mobile/Landscape (see applyRoundBreakdownPosition()).
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
    // Cached once the track is duplicated, NOT re-read every frame: reading scrollHeight forces a
    // synchronous style/layout flush, and the Try Again "?" flash's pending style work made that
    // stall
    // frames (visible scroll hitches). One copy's height never changes for a given track -
    // renderRoundBreakdown() builds a fresh track (and restarts this) on any content change.
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
        // The 2nd duplicate copy for the seamless wrap is added HERE, lazily, only once the single
        // copy is
        // confirmed taller than the visible panel (otherwise short content would show twice).
        // Guarded by
        // dataset.duplicated so it runs once per track; a new render creates a fresh track, so size
        // changes are re-evaluated from scratch.
        if (!track.dataset.duplicated) {
            if (track.scrollHeight <= table.clientHeight) {
                // Single copy already fits - stay put and keep checking each frame in case more
                // rounds are added.
                // This per-frame scrollHeight read only happens while waiting, not in the
                // steady-state loop.
                requestAnimationFrame(tick);
                return;
            }
            track.innerHTML += track.innerHTML;
            track.dataset.duplicated = '1';
            // Exactly 2 identical copies, so one copy's height is half the track's scrollHeight -
            // measured
            // ONCE here.
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
