// Targeted checks for the Phase 4 template bug fixes. Run via:
//   node scripts/refactor-harness/run.js <root> <outDir> p4 desktop --eval scripts/refactor-harness/phase4-test.js
// Uses real dispatched pointer/keyboard events (never el.click() for pointerdown-gated paths).
(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    while (!window.__harness || !__harness.settingsServedAt) await wait(100);
    await wait(4000);
    if (typeof ensureDevPanelBuilt === 'function') ensureDevPanelBuilt();
    await wait(500);
    const out = {};
    const key = (k, mods) => {
        const e = new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, mods));
        document.body.dispatchEvent(e);
        return e.defaultPrevented;
    };
    // 1. Hotkeys: an UNASSIGNED Ctrl/Alt combo must not be swallowed; an assigned one must fire.
    out.ctrlF_prevented = key('f', { ctrlKey: true });
    out.ctrlR_prevented = key('r', { ctrlKey: true });
    const cb = document.querySelector('#devPanel input[type="checkbox"][id]');
    const before = cb.checked;
    devHotkeys['ctrl+k'] = { id: cb.id, type: 'checkbox' };
    out.ctrlK_assigned_prevented = key('k', { ctrlKey: true });
    out.ctrlK_toggled_checkbox = cb.checked !== before;
    delete devHotkeys['ctrl+k'];

    // 2. Undo: pointerdown on bare scroll space must NOT push a snapshot; on a real control it must.
    const pd = (el) => {
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, composed: true }));
        document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    };
    const content = document.querySelector('#desktopTabContent .dev-section-content') || document.querySelector('#devPanel .dev-section-content');
    const n0 = devUndoStack.length;
    pd(content);
    out.undo_pushed_on_scroll_space = devUndoStack.length - n0;
    const slider = document.querySelector('#devPanel input[type="range"]');
    const n1 = devUndoStack.length;
    pd(slider);
    out.undo_pushed_on_real_control = devUndoStack.length - n1;

    // 3. Lock cascade: locking a group with nested subgroups locks all of them, unlocking unlocks all.
    const parent = Array.from(document.querySelectorAll('#devPanel .dev-section')).find((s) => s.querySelector('.dev-section .dev-section-title') && s.querySelector(':scope > .dev-group-lock-icon'));
    const icon = parent.querySelector(':scope > .dev-group-lock-icon');
    const subKeys = Array.from(parent.querySelectorAll('.dev-section > .dev-section-title')).map((t) => getSectionKey(t));
    const wasLocked = lockedGroups.has(getSectionKey(parent.querySelector(':scope > .dev-section-title')));
    if (wasLocked) icon.click(); // start from unlocked
    icon.click(); // lock
    out.lock_parent = lockedGroups.has(getSectionKey(parent.querySelector(':scope > .dev-section-title')));
    out.lock_subgroups_locked = subKeys.filter((k) => lockedGroups.has(k)).length + '/' + subKeys.length;
    icon.click(); // unlock
    out.unlock_subgroups_still_locked = subKeys.filter((k) => lockedGroups.has(k)).length;
    out.parent_group = getSectionKey(parent.querySelector(':scope > .dev-section-title'));
    return out;
})()
