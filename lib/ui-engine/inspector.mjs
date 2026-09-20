// ui-layout-engine v0.2.0 — canonical source: J:\CLAUDE\PROJECTS\HTML UI ENGINE\inspector.mjs
//
// Inspector — a schema-driven control generator, NOT a UI-building system of
// its own, and NOT a competing architecture a host Dev Panel would ever need
// to throw away. Every render below is driven entirely through
// createInspectorAdapter() (adapter.mjs) — this file contains ZERO
// per-element or per-Clicko-group hardcoded control definitions, and could
// be deleted and rebuilt by a completely different host (a real Clicko Dev
// Panel, eventually) using nothing but the same adapter contract. See
// docs/DEV_PANEL_ADAPTER.md for the full host/engine boundary this
// demonstrates.
//
// v0.2.0 rewrite: previously this file walked MODE_SCHEMA/FIELDS directly
// per element with one hardcoded POSITION/SIZE/CONSTRAINTS/ADVANCED
// section-builder each. It now walks the CANONICAL TREE (via the adapter)
// generically — the same 4 conceptual sections still appear for the 'base'
// context (they ARE the tree's own top-level groups now, not hardcoded
// functions), but the renderer itself has no knowledge of "position" or
// "size" as special cases beyond the one small bit of mode-switching UI
// each group needs (see renderGroupModeSelectIfApplicable below) — adding a
// 6th canonical group type requires zero changes here.
//
// Responsive contexts (Base / Mobile Portrait / Mobile Landscape) are now
// real tabs, each rendering through the adapter's context-aware tree/value
// API — not three copies of this rendering logic.

import { FIELDS, POSITION_MODES, SIZE_MODES } from './schema.mjs';
import { listElements, getElement, saveLayoutConfig, resetLayoutConfig, captureAllLayoutConfigs } from './registry.mjs';
import { createInspectorAdapter, ALL_CONTEXTS } from './adapter.mjs';

const CONTEXT_LABELS = { base: 'Base', mobilePortrait: 'Mobile Portrait', mobileLandscape: 'Mobile Landscape' };

let originalConfigSnapshot = null;
let selectedElementId = null;
let activeContext = 'base';
let mountedRoot = null;
let addOverridePickerOpen = false;

export function mountInspector(container) {
  mountedRoot = container;
  originalConfigSnapshot = captureAllLayoutConfigs();
  render();
}

export function refreshInspector() {
  if (mountedRoot) render();
}

function render() {
  mountedRoot.innerHTML = '';
  mountedRoot.appendChild(buildToolbar());
  mountedRoot.appendChild(buildElementSelect());
  if (!selectedElementId) {
    const hint = document.createElement('div');
    hint.className = 'ui-inspector-hint';
    hint.textContent = 'Select an element above to edit its layout.';
    mountedRoot.appendChild(hint);
    return;
  }
  const adapter = createInspectorAdapter({ elementId: selectedElementId });
  mountedRoot.appendChild(buildContextTabs(adapter));
  mountedRoot.appendChild(buildContextView(adapter));
  mountedRoot.appendChild(buildDiagnosticsSection(adapter));
}

function buildToolbar() {
  const row = document.createElement('div');
  row.className = 'ui-inspector-row ui-inspector-toolbar';
  row.appendChild(button('Copy', () => {
    const text = JSON.stringify(captureAllLayoutConfigs(), null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
    else window.prompt('Copy:', text);
  }));
  row.appendChild(button('Save', () => saveLayoutConfig()));
  row.appendChild(button('Reset', () => { resetLayoutConfig(originalConfigSnapshot); refreshInspector(); }));
  return row;
}

function buildElementSelect() {
  const wrap = document.createElement('div');
  wrap.className = 'ui-inspector-row';
  const label = document.createElement('span');
  label.className = 'ui-inspector-label';
  label.textContent = 'SELECT ELEMENT';
  const select = document.createElement('select');
  select.className = 'ui-inspector-select';
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '—';
  select.appendChild(blank);
  for (const el of listElements()) {
    const opt = document.createElement('option');
    opt.value = el.id;
    opt.textContent = el.id + ' (' + el.role + ')';
    if (el.id === selectedElementId) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => {
    selectedElementId = select.value || null;
    activeContext = 'base';
    addOverridePickerOpen = false;
    render();
  });
  wrap.appendChild(label);
  wrap.appendChild(select);
  return wrap;
}

// ============================================================
// Context tabs — Base / Mobile Portrait / Mobile Landscape. Purely a
// selection UI; all actual content comes from the adapter per active tab.
// ============================================================
function buildContextTabs(adapter) {
  const row = document.createElement('div');
  row.className = 'ui-inspector-row ui-inspector-context-tabs';
  for (const ctx of adapter.listContexts()) {
    const btn = document.createElement('button');
    btn.className = 'ui-inspector-button ui-inspector-tab-button' + (ctx === activeContext ? ' ui-inspector-tab-active' : '');
    btn.textContent = CONTEXT_LABELS[ctx];
    btn.addEventListener('click', () => { activeContext = ctx; addOverridePickerOpen = false; render(); });
    row.appendChild(btn);
  }
  return row;
}

function buildContextView(adapter) {
  const container = document.createElement('div');
  if (activeContext === 'base') {
    container.appendChild(buildTreeView(adapter, adapter.getCanonicalTree(), 'base', { showModeSelects: true }));
    container.appendChild(buildPresetSection(adapter));
    return container;
  }

  // Responsive context: enable/disable toggle first (Architecture point 11).
  const state = adapter.getContextState(activeContext);
  const enableRow = document.createElement('label');
  enableRow.className = 'ui-inspector-row';
  enableRow.style.cursor = 'pointer';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = state.enabled;
  checkbox.addEventListener('change', () => { adapter.setContextEnabled(activeContext, checkbox.checked); refreshInspector(); });
  enableRow.appendChild(checkbox);
  const enableLabel = document.createElement('span');
  enableLabel.className = 'ui-inspector-label';
  enableLabel.style.minWidth = 'auto';
  enableLabel.textContent = 'Context enabled';
  enableRow.appendChild(enableLabel);
  container.appendChild(enableRow);

  if (!state.enabled) {
    const note = document.createElement('div');
    note.className = 'ui-inspector-note';
    note.textContent = '(disabled — stored overrides are preserved but ignored; Base is the effective source for all settings)';
    container.appendChild(note);
  }

  const contextTree = adapter.getContextTree(activeContext);
  if (contextTree.length === 0 && !addOverridePickerOpen) {
    const empty = document.createElement('div');
    empty.className = 'ui-inspector-note';
    empty.textContent = 'No overrides';
    container.appendChild(empty);
    container.appendChild(button('+ Add Override', () => { addOverridePickerOpen = true; render(); }));
    return container;
  }

  if (contextTree.length > 0) {
    container.appendChild(buildTreeView(adapter, contextTree, activeContext, { showRemoveButton: true }));
  }
  container.appendChild(button('+ Add Override', () => { addOverridePickerOpen = true; render(); }));

  if (addOverridePickerOpen) {
    container.appendChild(buildAddOverridePicker(adapter));
  }
  return container;
}

// "+ Add Override" picker — Architecture point 7: exposes the FULL
// canonical hierarchy (never a flat list), with already-overridden settings
// excluded. Selecting a leaf creates the override and closes the picker.
function buildAddOverridePicker(adapter) {
  const box = document.createElement('div');
  box.className = 'ui-inspector-add-override-picker';
  const title = document.createElement('div');
  title.className = 'ui-inspector-section-title';
  title.textContent = 'ADD OVERRIDE — select a setting';
  box.appendChild(title);

  const flat = adapter.flatten(adapter.getAddOverrideTree());
  const overriddenKeys = new Set(adapter.getOverriddenFieldKeys(activeContext));
  for (const node of flat) {
    const row = document.createElement('div');
    row.className = 'ui-inspector-row';
    row.style.paddingLeft = (node.depth * 14) + 'px';
    if (node.type === 'group') {
      const label = document.createElement('span');
      label.className = 'ui-inspector-group-label';
      label.textContent = node.label;
      row.appendChild(label);
    } else {
      if (overriddenKeys.has(node.id)) continue; // already overridden — not offered again
      const pickBtn = button(node.label, () => {
        adapter.createOverride(node.id, activeContext);
        addOverridePickerOpen = false;
        refreshInspector();
      });
      row.appendChild(pickBtn);
    }
    box.appendChild(row);
  }
  return box;
}

// ============================================================
// Generic tree renderer — walks a flat, depth-annotated node list (from
// adapter.flatten()) and renders groups as section headers with indented
// children, settings as editable field rows. Used for BOTH the full Base
// tree and a responsive context's filtered tree — the exact same function,
// no per-context special-casing beyond the options passed in.
// ============================================================
function buildTreeView(adapter, tree, contextKey, options) {
  const container = document.createElement('div');
  const flat = adapter.flatten(tree);
  for (const node of flat) {
    if (node.type === 'group') {
      const heading = document.createElement('div');
      heading.className = 'ui-inspector-section-title';
      heading.style.marginLeft = (node.depth * 14) + 'px';
      heading.textContent = node.label;
      container.appendChild(heading);
      if (options.showModeSelects) {
        const modeRow = buildGroupModeSelectIfApplicable(adapter, node);
        if (modeRow) { modeRow.style.marginLeft = (node.depth * 14) + 'px'; container.appendChild(modeRow); }
      }
    } else {
      container.appendChild(buildSettingRow(adapter, node, contextKey, options));
    }
  }
  return container;
}

// The one place this generic renderer knows about specific group ids — mode
// selection isn't itself a canonical "setting" node (it's the dispatch key
// deciding WHICH settings apply at all), so it's rendered once per relevant
// group rather than being a tree leaf. Scoped to 'base' only: mode is a
// structural property, not a per-field value, and this engine's override
// model tracks individual FIELDS values, not mode switches — a deliberate
// scope decision (documented in docs/DEV_PANEL_ADAPTER.md).
function buildGroupModeSelectIfApplicable(adapter, groupNode) {
  const el = getElement(adapter.elementId);
  if (groupNode.id === 'position') {
    return modeSelectRow('Mode', POSITION_MODES, el.layout.position.mode, (newMode) => { adapter.setPositionMode(newMode); refreshInspector(); });
  }
  if (groupNode.id === 'size-width' || groupNode.id === 'size-height') {
    const axis = groupNode.id === 'size-width' ? 'width' : 'height';
    const current = (el.layout.size && el.layout.size[axis] && el.layout.size[axis].mode) || 'content';
    return modeSelectRow('Mode', SIZE_MODES, current, (newMode) => { adapter.setSizeMode(axis, newMode); refreshInspector(); });
  }
  return null;
}

function buildSettingRow(adapter, node, contextKey, options) {
  const def = FIELDS[node.id];
  const { value } = adapter.getEffectiveValue(node.id, contextKey);
  const row = document.createElement('div');
  row.className = 'ui-inspector-row';
  row.style.paddingLeft = (node.depth * 14) + 'px';

  const label = document.createElement('span');
  label.className = 'ui-inspector-label';
  label.textContent = node.label;
  row.appendChild(label);

  row.appendChild(buildControl(def, value, (newValue) => { adapter.setValue(node.id, contextKey, newValue); refreshInspector(); }));

  if (options.showRemoveButton) {
    row.appendChild(button('Remove Override', () => { adapter.removeOverride(node.id, contextKey); refreshInspector(); }));
  }
  return row;
}

// ---------------- PRESETS (base only — see Architecture's own scoping) ----------------
function buildPresetSection(adapter) {
  const section = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'ui-inspector-section-title';
  title.textContent = 'PRESETS';
  section.appendChild(title);
  const select = document.createElement('select');
  select.className = 'ui-inspector-select';
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = 'apply a preset…';
  select.appendChild(blank);
  for (const name of adapter.listPresetNames()) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => {
    if (!select.value) return;
    adapter.applyPreset(select.value);
    refreshInspector();
  });
  const row = document.createElement('div');
  row.className = 'ui-inspector-row';
  row.appendChild(select);
  section.appendChild(row);
  return section;
}

// ---------------- DIAGNOSTICS ----------------
// Minimal, single-element-scoped diagnostics (Architecture Section 15) PLUS
// the v0.2.0 adapter debug view (Architecture point 22): canonical schema,
// Base config, each context's overrides, effective configuration, and
// context state — read-only, for validation/debugging, never a second
// production Dev Panel.
let diagnosticsOverlay = null;

function buildDiagnosticsSection(adapter) {
  const section = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'ui-inspector-section-title';
  title.textContent = 'DIAGNOSTICS';
  section.appendChild(title);

  const toggleRow = document.createElement('div');
  toggleRow.className = 'ui-inspector-row';
  toggleRow.appendChild(button('Show Overlay', () => showDiagnosticsOverlay(adapter.elementId)));
  toggleRow.appendChild(button('Hide Overlay', () => hideDiagnosticsOverlay()));
  section.appendChild(toggleRow);

  const pre = document.createElement('pre');
  pre.className = 'ui-inspector-config-dump';
  pre.textContent = JSON.stringify(adapter.getDiagnostics(), null, 2);
  section.appendChild(pre);
  return section;
}

function showDiagnosticsOverlay(elementId) {
  hideDiagnosticsOverlay();
  const el = getElement(elementId);
  const rect = el.domNode.getBoundingClientRect();
  const box = document.createElement('div');
  box.className = 'ui-diagnostics-box';
  box.style.left = rect.left + 'px';
  box.style.top = rect.top + 'px';
  box.style.width = rect.width + 'px';
  box.style.height = rect.height + 'px';
  document.body.appendChild(box);
  diagnosticsOverlay = [box];

  const parentId = el.layout.position.parent || el.layout.position.containingBlock;
  if (parentId) {
    const parentEl = getElement(parentId);
    if (parentEl) {
      const prect = parentEl.domNode.getBoundingClientRect();
      const pbox = document.createElement('div');
      pbox.className = 'ui-diagnostics-parent-box';
      pbox.style.left = prect.left + 'px';
      pbox.style.top = prect.top + 'px';
      pbox.style.width = prect.width + 'px';
      pbox.style.height = prect.height + 'px';
      document.body.appendChild(pbox);
      diagnosticsOverlay.push(pbox);
    }
  }

  if (el.layout.position.mode === 'anchor' || el.layout.position.mode === 'fixed') {
    const dot = document.createElement('div');
    dot.className = 'ui-diagnostics-anchor-dot';
    const h = el.layout.position.horizontal ? el.layout.position.horizontal.anchor : 'left';
    const v = el.layout.position.vertical ? el.layout.position.vertical.anchor : 'top';
    const x = h === 'right' ? rect.right : h === 'center' ? (rect.left + rect.right) / 2 : rect.left;
    const y = v === 'bottom' ? rect.bottom : v === 'center' ? (rect.top + rect.bottom) / 2 : rect.top;
    dot.style.left = x + 'px';
    dot.style.top = y + 'px';
    document.body.appendChild(dot);
    diagnosticsOverlay.push(dot);
  }
}

function hideDiagnosticsOverlay() {
  if (!diagnosticsOverlay) return;
  for (const node of diagnosticsOverlay) node.remove();
  diagnosticsOverlay = null;
}

// ---------------- small DOM builder helpers ----------------
function modeSelectRow(label, options, current, onChange) {
  const row = document.createElement('div');
  row.className = 'ui-inspector-row';
  const lbl = document.createElement('span');
  lbl.className = 'ui-inspector-label';
  lbl.textContent = label;
  const select = document.createElement('select');
  select.className = 'ui-inspector-select';
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    if (opt === current) o.selected = true;
    select.appendChild(o);
  }
  select.addEventListener('change', () => onChange(select.value));
  row.appendChild(lbl);
  row.appendChild(select);
  return row;
}

function buildControl(def, value, onChange) {
  if (def.control === 'checkbox') {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!value;
    input.addEventListener('change', () => onChange(input.checked));
    return input;
  }
  if (def.control === 'select' && def.type === 'enum') {
    const select = document.createElement('select');
    select.className = 'ui-inspector-select';
    for (const v of def.values) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      if (v === value) o.selected = true;
      select.appendChild(o);
    }
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }
  if (def.control === 'select-element') {
    const select = document.createElement('select');
    select.className = 'ui-inspector-select';
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '—';
    select.appendChild(blank);
    for (const el of listElements()) {
      const o = document.createElement('option');
      o.value = el.id;
      o.textContent = el.id;
      if (el.id === value) o.selected = true;
      select.appendChild(o);
    }
    select.addEventListener('change', () => onChange(select.value || null));
    return select;
  }
  if (def.control === 'slider-number') {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'ui-inspector-text-input';
    input.value = value ?? def.default;
    input.addEventListener('change', () => onChange(parseFloat(input.value)));
    return input;
  }
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'ui-inspector-text-input';
  input.value = value ?? def.default ?? '';
  input.addEventListener('change', () => onChange(input.value));
  return input;
}

function button(label, onClick) {
  const btn = document.createElement('button');
  btn.className = 'ui-inspector-button';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}
