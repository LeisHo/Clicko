# Clicko — Project-Specific Conventions

Single-file HTML/CSS/JS browser tapping game (`index.html`), deployed via Vercel at clicko-one.vercel.app, GitHub remote `LeisHo/Clicko`. These rules extend `J:\CLAUDE\PROJECTS\CLAUDE.md` — see that file for the general HTML-project dev-panel standard (§12) this project follows; this file only covers what's specific to Clicko.

Not to be confused with the sibling project `DICKOCLICKO` (separate folder, separate GitHub repo `LeisHo/DickoClicko`, separate game) — similarly named and built on the same dev-panel conventions, but a different codebase with its own `CLAUDE.md`.

---

## Dev-panel settings now sync through a git-tracked file, not just localStorage

As of 2026-09-02, the dev panel's SAVE/LOAD no longer uses `localStorage` as its primary store (except when the page is opened directly as a local file — see the exception below):

- **`api/save-settings.js`** — a Vercel serverless function. The dev panel's SAVE button POSTs the full settings dump here; it commits to **`data/processed/dev-panel-settings.json`** via GitHub's Contents API (gated by a `DEV_PANEL_SAVE_SECRET` header, using a `GITHUB_TOKEN` scoped to this repo).
- **`data/processed/dev-panel-settings.json`** — the git-tracked settings file. Every real Save creates a **brand-new commit** (GitHub's Contents API PUT, not an amend/squash) — `git log -- data/processed/dev-panel-settings.json` is a genuine chronological history of every save, each fully recoverable via `git show <sha>:data/processed/dev-panel-settings.json`.
- **`loadSettings()`** is an async fetch of that same file (the game still paints/wires up synchronously with hardcoded defaults first, then the fetch resolves and overrides). This means the file's value **overrides the hardcoded JS defaults in `index.html` at runtime**, on every real page load.
- **Exception**: opened directly as a local file (`location.protocol === 'file:'`) has nothing to write/read the git file through, so Save/Load fall back to `localStorage` in that case only.

**Why this matters**: the hardcoded JS defaults in `index.html` and this git file can drift out of sync, and the file wins at runtime. This already caused a real bug once — an earlier "set defaults" apply wrote `--try-again-rotate-extrusion-matches-glyph: 0` into the hardcoded defaults from a pasted dump that didn't reflect the live-saved state; a later session traced that exact value to a "solid blob" visual bug (independent-extrusion mode lets a full-width shadow-stack render behind a squished glyph) and had to revert it in both places (commits `d1f601f`, `c5868c0`).

---

## "Set defaults" — mandatory 3-way reconciliation, every time

Per explicit standing instruction (2026-09-02): whenever the user pastes a copied settings dump and says **"set defaults"**, do **not** just diff the paste against the hardcoded JS defaults and overwrite. This reconciliation is **mandatory on every single "set defaults" request** — not optional, not skippable because a dump "looks straightforward."

Let **P** = the value in the pasted dump, **L** = the current hardcoded default in `index.html`, **V** = the current value in `data/processed/dev-panel-settings.json`.

1. **Establish the timeline first**: check `docs/CHANGELOG.txt` for when defaults were last actually changed, and check the settings file's own git history (`git log -- data/processed/dev-panel-settings.json`) for when it was last saved.
2. **Decide per field** (or per group, if the user named which groups changed — scope the whole comparison to just those):
   - `P == L` but `P != V` → trust **V** (the Vercel save log is more recent than the frozen L/P state).
   - `P != L` and `P != V` (pasted disagrees with both) → trust **P** (a fresh, deliberate change).
   - Everything else (commonly `P == V != L`, or all three agree) → judgment call — typically sync L to match P/V when they already agree; no-op when all three already match.
3. Apply the resolved values to the hardcoded defaults in `index.html`, same verification/ship process as any other change (div-tag balance, `node --check`, commit, push, poll Vercel deploy status, live-verify).

If the user's message doesn't include a pasted dump, "set defaults" doesn't apply — this reconciliation is specifically for the paste-and-apply workflow.
