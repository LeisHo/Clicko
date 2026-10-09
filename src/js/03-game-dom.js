
// Game state
const gameState = {
    currentRound: 0,
    // Highest round actually WON this run (see endGame()'s lose branch / checkHighScore()).
    lastRoundWon: 0,
    targetCount: 0,
    currentTapCount: 0,
    isPlaying: false,
    canTap: false,
    isCountingTaps: false,
    maxTimeMs: 500,
    speedDecrease: 75,
    // Per-round compounding multiplier on speedDecrease:
    // effectiveDecrease = speedDecrease * decay^(round-1). 1 = no decay; <1 shrinks each drop.
    speedDecreaseDecay: 0.75,
    // +/- % random jitter on each round's EFFECTIVE decay, re-rolled per round (not compounded
    // into later rounds). 0 = deterministic.
    speedDecreaseDecayTolerance: 5,
    // Round computed speed time to nearest multiple of this (ms), before the 100ms floor. 1 = no-op.
    speedTimeRounding: 1,
    countdownRoundingIncrement: 1,
    resultDuration: 1000,
    // Round-scaling min target count: targetFloorBase + (round-1) * targetFloorIncreasePerRound.
    targetFloorBase: 2,
    targetFloorIncreasePerRound: 0,
    // Round-scaling max target count, same shape as the floor above.
    targetCeilingBase: 30,
    targetCeilingIncreasePerRound: 0,
    checkTimeoutId: null,
    // Live Speed countdown: roundTotalTimeMs (= maxTimeMs * targetCount) is computed per round in
    // showTargetAndSpeed(); the countdown only starts on the round's first accepted tap
    // (startRoundCountdown()). countdownRafId is its rAF redraw loop. stopRoundCountdown() tears
    // down this, checkTimeoutId and perClickTimeoutId together.
    roundTotalTimeMs: 0,
    countdownStartTime: null,
    countdownRafId: null,
    // Active per-click timeout, re-armed on every accepted tap (armPerClickTimeout()). Needed
    // because the late-tap gap check can't catch "no further tap ever comes" - this fires the
    // loss on its own once silence outlasts maxTimeMs.
    perClickTimeoutId: null,
};

// Per-round tap timing, for the loss-screen round breakdown. Reset for a
// fresh run in startGame(), reset per-round in showTargetAndSpeed(), and
// read/appended to roundHistory in endGame().
let roundHistory = [];
let currentRoundTaps = [];
let roundStartTime = 0;
// Timer for the "Try again?" button's flashing "?" - see startTryAgainFlash()/stopTryAgainFlash().
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
    // Skip the shape swap on mobile: rewriting the `d` attributes inside the filtered
    // (brightness+blur) layer forces a costly re-rasterize/re-filter, the dominant per-tap cost
    // on slower mobile GPUs. The cheap transform on .shadow-caster-button-layer.pressed still
    // moves/scales the shadow.
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
// Prefix/Number/Suffix children, cached; render call sites set each one individually.
const targetCountPrefix = document.getElementById('targetCountPrefix');
const targetCountNumber = document.getElementById('targetCountNumber');
const targetCountSuffix = document.getElementById('targetCountSuffix');
// Publishes the Number's bottom/right edges as CSS custom properties on #targetCount so the
// Prefix (Y) and Suffix (X/Y) CSS rules can anchor to them. Coordinates are relative to the
// children's offsetParent (the space their own left/top resolve in), NOT the viewport. Set on
// #targetCount (not :root) so they inherit to the 3 children.
function updateTargetAnchoredPositions() {
    if (!targetCountNumber || !targetCountPrefix) return;
    const containerEl = targetCountPrefix.offsetParent;
    if (!containerEl) return;
    const containerRect = containerEl.getBoundingClientRect();
    const numberRect = targetCountNumber.getBoundingClientRect();
    targetCount.style.setProperty('--target-number-bottom-px', (numberRect.bottom - containerRect.top) + 'px');
    targetCount.style.setProperty('--target-number-right-px', (numberRect.right - containerRect.left) + 'px');

    // Choose WHICH var() reference each element's top-base/offset uses, based on its saved
    // stage2EngineOverrides position mode (read directly so it's correct before the Inspector
    // has primed the element). Values are var() strings so CSS still does the arithmetic.
    // Default 'relative' = original behavior. Prefix X is never branched (only Y has 2 modes).
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
