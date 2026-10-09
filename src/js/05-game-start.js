
// Event listeners - Pointer Events unify mouse/touch/pen, avoiding the double-count risk of
// attaching both mouse AND touch listeners (synthetic mouse events aren't always suppressed).
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
    // Reset each new game - see checkHighScore()'s call site in endGame()'s lose branch.
    gameState.lastRoundWon = 0;
    gameState.maxTimeMs = parseFloat(document.getElementById('sliderStartingSpeed').value);
    startButton.classList.add('hidden');
    // startButtonFlashChar is a sibling of startButton (not a child), so hiding the button
    // doesn't hide the "?" - it must be hidden explicitly.
    document.getElementById('startButtonFlashChar').classList.add('hidden');
    // Must also drop 'try-again-state': TEXT_EDIT_TARGETS.startButton.getSlot() reads it, and any
    // later refreshAllTextOverrides() (resize/orientation, settings load) would re-show the "?".
    startButton.classList.remove('try-again-state');
    totalClickCount = 0;
    clickCounter.textContent = totalClickCount;
    roundHistory = [];
    roundBreakdownPanel.classList.add('hidden');
    resultText.classList.add('hidden');
    showRoundText(gameState.currentRound);
}

// No .pressed class here on purpose - the Start text must not move like the button does.
// preventDefault() still suppresses text selection/double-tap-zoom.
startButton.addEventListener('pointerdown', (e) => {
    e.preventDefault();
});
startButton.addEventListener('pointerup', (e) => {
    e.preventDefault();
    startGame();
});

// Dev panel is only reachable locally (file:// or localhost) or with ?dev=1. It stays in the DOM
// either way since game logic reads its slider values as the source of truth for defaults; this
// gates only the D/R-key shortcuts. Panel VISIBILITY is gated by CSS from first paint
// (html.dev-mode, set by an early <head> script duplicating this check) - this line runs too late
// to prevent a flash of the unstyled panel.
const isDevAllowed = location.protocol === 'file:' ||
    location.protocol === 'data:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    new URLSearchParams(location.search).get('dev') === '1';

// Stops the current round/game and returns the UI to its idle landing state. No longer wired to
// RESET/R (those restore saved settings - see resetDevSettings()); also called once at startup.
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
    // Re-resolves startButton's shared align-class/--anchor-ty back to the Start state's vars.
    applyTextAlignAnchors();
    gameText.classList.add('hidden');
    resultText.classList.add('hidden');
    // Don't leave a stuck win/lose tint on the idle screen.
    resultText.classList.remove('result-win', 'result-lose');
    targetCount.classList.add('hidden');
    speedDisplay.classList.add('hidden');
    msPerClickDisplay.classList.add('hidden');
    refreshButtonHue();
    totalClickCount = 0;
    clickCounter.textContent = totalClickCount;
}

// RESET (button + R key) - restores every input to the last SAVED settings (not hardcoded
// defaults, not a gameplay reset). A no-op if nothing has been saved yet.
function resetDevSettings() {
    loadSettings();
}
