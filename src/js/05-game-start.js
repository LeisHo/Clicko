
// Event listeners - Pointer Events unify mouse/touch/pen into one event
// stream, avoiding the classic double-fire risk of attaching both mouse AND
// touch listeners (a mobile browser's synthetic mouse event after a real touch
// isn't always fully suppressed by preventDefault(), which could double-count
// taps on some devices).
gameButton.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handleGameButtonPress(e.pointerType, e);
});
gameButton.addEventListener('pointerup', handleGameButtonRelease);
gameButton.addEventListener('pointercancel', handleGameButtonRelease);
gameButton.addEventListener('pointerleave', handleGameButtonRelease);

function startGame() {
    stopTryAgainFlash();
    gameState.isPlaying = true;
    gameState.currentRound = 1;
    // Reset each new game - see checkHighScore()'s call site in
    // endGame()'s lose branch for why this exists.
    gameState.lastRoundWon = 0;
    gameState.maxTimeMs = parseFloat(document.getElementById('sliderStartingSpeed').value);
    startButton.classList.add('hidden');
    // Per direct report ("the question mark doesnt go away even
    // after i click try again"): startButtonFlashChar used to be a
    // DOM CHILD of startButton, so hiding the button here also hid
    // the "?" for free. Since the position-independence fix made it
    // a sibling instead, that implicit hide stopped happening -
    // this call site was missed when every OTHER hide-on-transition
    // spot (resetGameplayState(), TEXT_EDIT_TARGETS.startButton's
    // render(), endGame()'s lose branch) was updated for the new
    // structure, since it's the "click to actually play" handler,
    // not one of those state-transition functions.
    document.getElementById('startButtonFlashChar').classList.add('hidden');
    // Same missed-spot bug, one level deeper: this explicit hide
    // above only fixed the immediate/visible symptom - it never
    // removed startButton's own 'try-again-state' CLASS, which is
    // exactly what TEXT_EDIT_TARGETS.startButton.getSlot() reads to
    // decide whether the "?" should be showing at all. Any LATER
    // call to refreshAllTextOverrides() (runs on every window
    // resize/orientation-change via applyActiveVars(), or on a
    // settings load) would still see the stale class, conclude
    // Try-Again is still the active state, and re-show the "?" -
    // per direct report ("sometimes when i am on the Try Again
    // view, when i click it, the '?' stays"): "sometimes" because
    // it only reappears if a resize/orientation event happens to
    // fire in the window after this click, not on every click.
    startButton.classList.remove('try-again-state');
    totalClickCount = 0;
    clickCounter.textContent = totalClickCount;
    roundHistory = [];
    roundBreakdownPanel.classList.add('hidden');
    resultText.classList.add('hidden');
    showRoundText(gameState.currentRound);
}

// Used to also toggle a .pressed class (a 3px downward shift on
// pointerdown, matching the Main Button's own press feel) via
// handleUIButtonPress()/handleUIButtonRelease() - removed per direct
// report ("the Start text moves down (like the button) when I click
// it. It shouldn't... the button animation shouldn't apply to the
// start text"). preventDefault() is still needed here regardless
// (suppresses text selection/double-tap-zoom on the button), so it
// stays even with the press-feedback class gone.
startButton.addEventListener('pointerdown', (e) => {
    e.preventDefault();
});
startButton.addEventListener('pointerup', (e) => {
    e.preventDefault();
    startGame();
});

// Dev panel is only reachable locally (file:// or localhost) or with ?dev=1 -
// real players on a deployed URL never see it or its keyboard shortcut.
// Kept in the DOM either way (not removed) since game logic reads its slider
// values directly as the source of truth for defaults - only the D/R-key
// shortcuts are gated here now; actual PANEL VISIBILITY is gated by CSS
// from first paint (html.dev-mode, set by a tiny early <head> script,
// duplicating this same check) - per direct report of a real, visible
// "ghost" of the unstyled panel flashing on screen for non-dev visitors
// while this (correct, but far too late - this line only runs once the
// entire ~12,800-line script has downloaded) check used to be the ONLY
// thing hiding it.
const isDevAllowed = location.protocol === 'file:' ||
    location.protocol === 'data:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    new URLSearchParams(location.search).get('dev') === '1';

// Resets gameplay state back to the landing screen - factored out
// of the R-key handler so the dev panel's own RESET button (see
// CLAUDE.md Section 12d - every dev panel needs a Reset button, not
// just a keyboard shortcut) can call the exact same logic.
// Stops the current round/game and returns the UI to its idle
// state - the dev panel RESET button/R key used to do this, but per
// CLAUDE.md Section 12d ("Reset - restores inputs to the saved
// local default") that's not what Reset is supposed to mean; kept
// under its own name in case a dedicated gameplay-reset control is
// wanted later, just no longer wired to RESET/R.
function resetGameplayState() {
    gameState.isPlaying = false;
    gameState.isCountingTaps = false;
    gameState.currentRound = 0;
    stopRoundCountdown();
    stopTryAgainFlash();
    startButton.classList.remove('hidden');
    startButton.textContent = overrideOr('startLabel');
    startButton.classList.remove('try-again-state');
    document.getElementById('startButtonFlashChar').classList.add('hidden');
    // Re-resolves startButton's shared align-class/--anchor-ty back
    // to the Start state's own vars - see applyTextAlignAnchors()'s
    // own comment.
    applyTextAlignAnchors();
    gameText.classList.add('hidden');
    resultText.classList.add('hidden');
    // Same reasoning as showRoundText()'s own comment - returning to
    // the idle/landing state shouldn't leave a stuck win/lose tint
    // either.
    resultText.classList.remove('result-win', 'result-lose');
    targetCount.classList.add('hidden');
    speedDisplay.classList.add('hidden');
    msPerClickDisplay.classList.add('hidden');
    refreshButtonHue();
    totalClickCount = 0;
    clickCounter.textContent = totalClickCount;
}

// RESET (button + R key) - per CLAUDE.md Section 12d, restores
// every input to whatever was last SAVED locally (not the
// hardcoded page defaults, and not a gameplay reset - see
// resetGameplayState() above for the previous behavior this
// replaces). Reuses loadSettings() exactly - if nothing has been
// saved yet, that's correctly a no-op (there's no saved default to
// restore to).
function resetDevSettings() {
    loadSettings();
}
