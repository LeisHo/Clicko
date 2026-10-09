
// Game state
const gameState = {
    currentRound: 0,
    // The highest round actually WON so far this run - see
    // checkHighScore()'s call site in endGame()'s lose branch.
    lastRoundWon: 0,
    targetCount: 0,
    currentTapCount: 0,
    isPlaying: false,
    canTap: false,
    isCountingTaps: false,
    maxTimeMs: 500,
    speedDecrease: 75,
    // Multiplier applied to speedDecrease, compounded per round
    // (effectiveDecrease = speedDecrease * decayMultiplier^(round-1))
    // - per explicit request that the speed-limit increase gets
    // SMALLER at higher rounds. 1 = no decay (every round drops
    // maxTimeMs by the same flat speedDecrease, the previous
    // behavior), less than 1 makes each round's drop shrink
    // relative to the one before it.
    speedDecreaseDecay: 0.75,
    // +/- tolerance (%) applied as a fresh random jitter to the
    // EFFECTIVE per-round decay value (not compounded into future
    // rounds' base) - per explicit request: "10" means each
    // round's decay can randomly land anywhere from -10% to +10%
    // of what it would otherwise be, re-rolled every round. 0 (the
    // default) means no jitter at all - exactly the previous
    // deterministic behavior.
    speedDecreaseDecayTolerance: 5,
    // Rounds the computed speed time to the nearest multiple of this
    // value each round (e.g. 10 -> nearest 10ms), applied before the
    // 100ms floor. 1 (the default) is a no-op - exact prior behavior.
    speedTimeRounding: 1,
    countdownRoundingIncrement: 1,
    resultDuration: 1000,
    // Minimum possible target count on Round 1, and how much that
    // minimum rises per round (targetFloor = targetFloorBase +
    // (currentRound-1) * targetFloorIncreasePerRound) - per
    // explicit request for a round-scaling floor. Increase
    // defaults to 0 (no scaling), reproducing the previous flat
    // "always +2" behavior exactly until tuned.
    targetFloorBase: 2,
    targetFloorIncreasePerRound: 0,
    // Maximum possible target count on Round 1, and how much that
    // maximum rises per round - same shape as targetFloorBase/
    // targetFloorIncreasePerRound above, per explicit request. 30/0
    // defaults reproduce the previous fixed "floor+29" range (2 to
    // 30 at round 1) exactly until tuned.
    targetCeilingBase: 30,
    targetCeilingIncreasePerRound: 0,
    checkTimeoutId: null,
    // The Speed display now shows a live countdown instead of a
    // static number - per explicit request. roundTotalTimeMs (the
    // countdown's starting value = maxTimeMs * targetCount) is
    // computed once per round in showTargetAndSpeed(); the actual
    // countdown only starts on the round's first accepted tap (see
    // startRoundCountdown()), not before. countdownRafId tracks the
    // requestAnimationFrame loop that redraws the remaining time
    // every frame - see stopRoundCountdown() for where both this
    // and checkTimeoutId get torn down together.
    roundTotalTimeMs: 0,
    countdownStartTime: null,
    countdownRafId: null,
    // Per-click ceiling's own ACTIVE timer - per direct follow-up
    // report ("if i dont click again for a duration longer than
    // the Ms/Click number I dont lose... the lose screen should
    // trigger the moment the time has passed"). The reactive gap
    // check added earlier only fires when a NEW tap arrives late -
    // it can never catch "no further tap ever comes" since there's
    // no event to react to. This is a real setTimeout, (re)armed on
    // every accepted tap via armPerClickTimeout(), that fires the
    // loss on its own if silence outlasts maxTimeMs - see
    // stopRoundCountdown() for where it's torn down.
    perClickTimeoutId: null,
};

// Per-round tap timing, for the loss-screen round breakdown. Reset for a
// fresh run in startGame(), reset per-round in showTargetAndSpeed(), and
// read/appended to roundHistory in endGame().
let roundHistory = [];
let currentRoundTaps = [];
let roundStartTime = 0;
// The "Try again?" button's flashing "?" - see startTryAgainFlash()/
// stopTryAgainFlash(). Corrected 2026-09-14 per direct request
// ("Flashing is the default and only option now. The previous ?
// rotating animation is now defunct."): flash (hide/show) is now
// the only mode - the rotate mode and its own state
// (tryAgainRotateRafId/StartTime/ShadowLastUpdate) are removed.
let tryAgainFlashTimeoutId = null;

// Messages
const tooManyMessages = ['TOO MANY!', 'OVERSHOT!', 'ONE TOO FAR!', 'TOO FAR!'];
const notEnoughMessages = ['TOO SLOW!', 'NOT ENOUGH!', 'RAN OUT OF TIME!', "DIDN'T MAKE IT!"];
const winMessages = ['PERFECT!', 'NICE!', 'EXCELLENT!', 'YES!', 'FANTASTIC!', 'BOOM!', 'LEGEND!', 'SICK!'];
const tryAgainMessages = ['try again?', 'again?', 'one more?', 'retry?', 'go again?', 'another round?'];

// DOM Elements
const gameButton = document.getElementById('gameButton');
const shadowCasterButtonLayer = document.getElementById('shadowCasterButtonLayer');
// Cached once at load: each path's normal `d` (its current, as-authored
// geometry) and pressed `d` (from its own data-pressed-d attribute, set
// by the build script that inlines this SVG). Swapping `d` in place on
// a single persistent SVG element - rather than toggling visibility
// between two separate SVG subtrees - avoids the browser having to
// freshly rasterize+filter a "new" subtree on every press/release.
const shadowButtonPaths = Array.from(
    document.getElementById('shadowButtonSvgRoot').querySelectorAll('path[data-pressed-d]')
);
const shadowButtonNormalDs = shadowButtonPaths.map(p => p.getAttribute('d'));
const shadowButtonPressedDs = shadowButtonPaths.map(p => p.getAttribute('data-pressed-d'));
function setShadowButtonPressed(pressed) {
    // Rewriting 19 `d` attributes inside a filtered (brightness+blur)
    // element forces the browser to re-rasterize and re-filter the
    // whole shadow layer - this session's own desktop investigation
    // already identified that blur-filter recompute as the dominant
    // per-tap rendering cost, and mobile GPUs are meaningfully slower
    // at exactly this operation than desktop ones. Skip the shape
    // swap on mobile entirely - the shadow still moves/scales via the
    // (cheap, compositor-only) transform on .shadow-caster-button-
    // layer.pressed, it just keeps its resting silhouette instead of
    // also reshaping. Trades a small shape-fidelity detail for
    // removing the dominant per-tap cost on the platform where it
    // lands hardest.
    if (isMobileActive()) return;
    const ds = pressed ? shadowButtonPressedDs : shadowButtonNormalDs;
    for (let i = 0; i < shadowButtonPaths.length; i++) {
        shadowButtonPaths[i].setAttribute('d', ds[i]);
    }
}
const startButton = document.getElementById('startButton');
const gameText = document.getElementById('gameText');
const gameTextLabel = document.getElementById('gameTextLabel');
const gameTextNumber = document.getElementById('gameTextNumber');
const resultText = document.getElementById('resultText');
const targetCount = document.getElementById('targetCount');
// Prefix/Number/Suffix children - see their own HTML comment,
// same "cache the children, every render call site sets them
// individually" pattern as speedDisplayNumber/Suffix below.
const targetCountPrefix = document.getElementById('targetCountPrefix');
const targetCountNumber = document.getElementById('targetCountNumber');
const targetCountSuffix = document.getElementById('targetCountSuffix');
// Measures the Number's own rendered box and pushes its bottom/right
// edges (in the SAME px coordinate space #targetCountPrefix/Suffix's
// own `left`/`top` already resolve in, i.e. relative to their real
// offsetParent - NOT raw viewport coordinates, which would be wrong
// if that offsetParent isn't positioned at the viewport origin) as
// live CSS custom properties on #targetCount, so the Prefix/Suffix
// CSS rules above can anchor directly to them. Per direct request:
// Prefix's Y anchored to the Number's bottom edge; Suffix's X/Y
// anchored to the Number's right/bottom edges. Set on #targetCount
// (not :root) so they inherit down to the 3 children the same way
// --target-x-base/-y-base already do.
function updateTargetAnchoredPositions() {
    if (!targetCountNumber || !targetCountPrefix) return;
    const containerEl = targetCountPrefix.offsetParent;
    if (!containerEl) return;
    const containerRect = containerEl.getBoundingClientRect();
    const numberRect = targetCountNumber.getBoundingClientRect();
    targetCount.style.setProperty('--target-number-bottom-px', (numberRect.bottom - containerRect.top) + 'px');
    targetCount.style.setProperty('--target-number-right-px', (numberRect.right - containerRect.left) + 'px');

    // Per-element mode-driven top-base/y-offset-active properties
    // (2026-09-20, see #targetCountPrefix/#targetCountSuffix's own
    // CSS comments for the full mechanism) - each one is set to a
    // var() REFERENCE STRING (not a computed number), so CSS still
    // does the actual arithmetic; this function only ever decides
    // WHICH variable applies, based on stage2EngineOverrides
    // (read directly, not the live engine - correct even before
    // the Inspector has ever primed this specific element this
    // session, since stage2EngineOverrides is the same object
    // applyLoadedSettings() already restores on load/Undo).
    // Defaults to 'relative' when nothing is saved yet, matching
    // both elements' ORIGINAL pre-2026-09-20 behavior exactly -
    // so a fresh deploy with no stage2EngineOverrides entry for
    // either element is a visual no-op. Prefix's X is NOT branched
    // here - see #targetCountPrefix's own CSS comment for why
    // (it's never had a second mode; only Y does).
    if (targetCountPrefix) {
        const prefixSaved = (typeof stage2EngineOverrides !== 'undefined') ? stage2EngineOverrides['stage2TargetPrefixY'] : null;
        const prefixMode = (prefixSaved && prefixSaved.position && prefixSaved.position.mode) ? prefixSaved.position.mode : 'relative';
        if (prefixMode === 'anchor') {
            targetCountPrefix.style.setProperty('--target-prefix-top-base', 'var(--target-y-base, 50%)');
            targetCountPrefix.style.setProperty('--target-prefix-y-offset-active', 'var(--target-prefix-y-anchor-offset-vh, 0)');
        } else {
            targetCountPrefix.style.setProperty('--target-prefix-top-base', 'var(--target-number-bottom-px, var(--target-y-base, 50%))');
            targetCountPrefix.style.setProperty('--target-prefix-y-offset-active', 'var(--target-prefix-y-offset-vh, 9.19)');
        }
    }
    if (targetCountSuffix) {
        const suffixSaved = (typeof stage2EngineOverrides !== 'undefined') ? stage2EngineOverrides['stage2TargetSuffix'] : null;
        const suffixMode = (suffixSaved && suffixSaved.position && suffixSaved.position.mode) ? suffixSaved.position.mode : 'relative';
        if (suffixMode === 'anchor') {
            targetCountSuffix.style.setProperty('--target-suffix-left-base', 'var(--target-x-base, 50%)');
            targetCountSuffix.style.setProperty('--target-suffix-x-offset-active', 'var(--target-suffix-x-anchor-offset-vw, 0)');
            targetCountSuffix.style.setProperty('--target-suffix-top-base', 'var(--target-y-base, 50%)');
            targetCountSuffix.style.setProperty('--target-suffix-y-offset-active', 'var(--target-suffix-y-anchor-offset-vh, 0)');
        } else {
            targetCountSuffix.style.setProperty('--target-suffix-left-base', 'var(--target-number-right-px, var(--target-x-base, 50%))');
            targetCountSuffix.style.setProperty('--target-suffix-x-offset-active', 'var(--target-suffix-x-offset-vw, 324.34)');
            targetCountSuffix.style.setProperty('--target-suffix-top-base', 'var(--target-number-bottom-px, var(--target-y-base, 50%))');
            targetCountSuffix.style.setProperty('--target-suffix-y-offset-active', 'var(--target-suffix-y-offset-vh, 11.60)');
        }
    }
}
