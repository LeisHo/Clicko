// Helpers shared by the Stage 2 engine modules.

// Mirrors an engine-row edit onto Clicko's real dev-panel slider and its value readout.
export function syncReal(realId, value) {
    const el = document.getElementById(realId);
    const valEl = document.getElementById(realId.replace(/^slider/, 'value'));
    if (el) el.value = value;
    if (valEl) valEl.textContent = value;
}
