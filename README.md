# Clicko

Project description and overview goes here.

## Project Structure

- **src/** — Source code
- **data/** — Input and processed data
- **scripts/** — Automation scripts
  - active/ — Currently used scripts
  - archived/ — One-off/completed scripts
- **models/** — Trained models or model definitions
- **results/** — Output and results
- **tests/** — Test suite
- **docs/** — Documentation

## Getting Started

For regular static serving:

```cmd
python -m http.server 8000 --bind 0.0.0.0
```

For phone tuning with live settings sync, use the local dev sync server:

```cmd
node dev-server.js 8001
```

Open the desktop panel at `http://localhost:8001/?dev=1`, and open the
same server from the phone with the laptop's Wi-Fi IP, for example
`http://192.168.1.42:8001/`. While controls move on desktop, the server
broadcasts preview settings to open local tabs so the phone updates
without a page refresh. When SAVE is pressed locally, the server also
writes `data/processed/dev-panel-settings.json`.

### Dev panel settings sync (one-time Vercel setup)

The dev panel's SAVE button is git-only (no `localStorage`, by explicit
request — this project deliberately departs from CLAUDE.md Section 12l's
"not just local, but also git" wording): it pushes its settings dump
straight to `data/processed/dev-panel-settings.json` in this repo via
`api/save-settings.js`, and LOAD/RESET read it back the same way. Until
the two env vars below are set on the Vercel project, SAVE does nothing
at all — the panel shows "NOT saved: ..." next to the button, which is
expected until this is set up:

1. **`GITHUB_TOKEN`** — a GitHub fine-grained personal access token,
   scoped to only this repo (`LeisHo/Clicko`), with **Contents: Read and
   write** permission and nothing else. Create one at
   github.com → Settings → Developer settings → Personal access tokens →
   Fine-grained tokens.
2. **`DEV_PANEL_SAVE_SECRET`** — an anti-abuse shared token (not a real
   secret — it also lives in the page's own client-side source, same as
   any other value there). Set it to `PkrbMti03M6xm3FEThYXa8gGW_08BOGj`
   (the value already embedded in `index.html`'s `DEV_PANEL_SAVE_SECRET`
   constant) — or change both to a new value together if you'd rather
   generate your own.

Add both under the Vercel project → Settings → Environment Variables,
then redeploy. `GITHUB_REPO`, `GITHUB_BRANCH`, and `SETTINGS_FILE_PATH`
are optional overrides (see `api/save-settings.js`) — the defaults
already match this repo.

## Key Files

List important entry points and key files.
