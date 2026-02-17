# Claude Code Handoff: Intake Form Blank-State Fixes

Date: February 17, 2026

## Scope
This patch only addresses form rendering reliability so the intake wizard cannot appear blank.

No webhook, payload, n8n, or GHL data mapping logic was changed.

## Files Changed

1. `shared/styles.css`
2. `intake-wizard/wizard.css`
3. `intake-wizard/wizard.js`

## What Changed

### 1) Added missing CSS tokens used by wizard styles
File: `shared/styles.css`

- Added:
  - `--text: #1F2937;`
  - `--border-light: #E5E7EB;`

Reason:
- Wizard CSS references `var(--text)` and `var(--border-light)`. Defining them prevents edge-case color/border resolution issues that can contribute to blank/unstyled rendering.

---

### 2) Added CSS visibility fail-safes for wizard steps
File: `intake-wizard/wizard.css`

- Hardened active step rendering:
  - `.wizard-step.active` now also forces:
    - `opacity: 1;`
    - `transform: none;`
    - `visibility: visible;`

- Added pre-init fallback:
  - `#intake-wizard-form:not(.wizard-ready) .wizard-step[data-step="1"] { ... }`
  - Keeps step 1 visible before JS sets wizard state.

- Added reduced-motion fallback:
  - `@media (prefers-reduced-motion: reduce) { .wizard-step { animation: none; } }`

Reason:
- Prevents edge cases where animation/state timing causes all steps to be hidden or appear blank.

---

### 3) Added JS fail-safe recovery for hidden/missing steps
File: `intake-wizard/wizard.js`

- Wrapped localStorage reset in `try/catch` in `init()`:
  - Avoids hard failures in restrictive browser contexts.

- Added readiness + visibility checks in `init()`:
  - `this.form.classList.add('wizard-ready');`
  - `this.ensureVisibleStep();`
  - delayed recheck: `setTimeout(..., 300)`
  - load-time recheck: `window.addEventListener('load', ...)`

- Wrapped `FormUtils.init(...)` in `try/catch/finally`:
  - If FormUtils fails, wizard UI still renders instead of appearing blank.

- Scoped step queries to `this.form` in `showStep()`:
  - Avoids accidental selection issues outside the wizard.

- Added fallback if target step is missing:
  - Restores step 1, updates progress/nav, and continues safely.

- Added new method `ensureVisibleStep()`:
  - Checks computed styles for visible step.
  - If none visible, forces fallback step active and updates nav/progress.

Reason:
- Guarantees that at least one step remains visible even if a render/state failure occurs.

## Explicit Non-Changes (Important)

No changes were made to:

- `shared/form-utils.js`
- `shared/config.js`
- `intake-wizard/index.html`
- Any n8n body files (`n8n_ghl_body_*.json`, `ghl_body_for_n8n.txt`)
- Any GHL field/value mapping logic

## Quick Validation Performed

- JS syntax check passed for wizard file:
  - `node -e "new Function(require('fs').readFileSync('intake-wizard/wizard.js','utf8')); console.log('wizard.js syntax OK')"`

## Suggested Commit

```bash
git add shared/styles.css intake-wizard/wizard.css intake-wizard/wizard.js Claude_Codex.MD
git commit -m "Fix intake wizard blank rendering with CSS/JS visibility fail-safes"
git push
```

