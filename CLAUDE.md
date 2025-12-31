# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Healthplex Client Portal** - a web app for Ryan Ferns' virtual functional medicine practice. Built by Ben Reeder (builderbenai.com). Includes a main portal for tracking client journey notes and an 8-step intake wizard for new clients.

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (no framework)
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **Hosting**: Vercel (auto-deploys on push to GitHub)
- **Webhooks**: n8n (breeder80.app.n8n.cloud)
- **CRM**: GoHighLevel (GHL)

## Local Development

```bash
# Run locally (any of these work)
python -m http.server 8080
# or use VS Code Live Server extension

# Test URLs
# Portal: localhost:8080
# Intake Wizard: localhost:8080/intake-wizard/
```

Push to GitHub auto-deploys to Vercel.

## Architecture

### Main Portal (`/`)
Supabase-backed collaborative note-taking app with real-time sync.

- `index.html` - Auth screen + journey board UI
- `app.js` - Auth, CRUD, real-time subscriptions, 11 journey stages
- `styles.css` - Healthplex branding (teal, Marcellus/Montserrat fonts)
- `supabase-config.js` - Supabase credentials

### Intake Wizard (`/intake-wizard/`)
8-step client intake form that submits to n8n webhooks.

- `intake-wizard/index.html` - Multi-step form with progress indicator
- `intake-wizard/wizard.js` - Step navigation, validation, state management
- `intake-wizard/wizard.css` - Wizard-specific styles

### Shared (`/shared/`)
- `config.js` - Webhook URLs and settings
- `form-utils.js` - Form handling, payload building, validation
- `styles.css` - Shared form styles

## Key Code Locations

| What | Where |
|------|-------|
| Journey stages | `app.js:23-112` (STAGES array) |
| Branding colors | `styles.css` (CSS variables at top) |
| Webhook URLs | `shared/config.js:8-12` |
| Metabolic questions | `shared/form-utils.js:1-150` (METABOLIC_QUESTIONS) |
| Payload builder | `shared/form-utils.js:755-1120` (buildIntakeWizardPayload) |
| Wizard navigation | `intake-wizard/wizard.js:130-160` (nextStep/prevStep) |

## Webhook Endpoints

```javascript
webhooks: {
  newConsultation: 'https://breeder80.app.n8n.cloud/webhook/new-consult',
  familyHistory: 'https://breeder80.app.n8n.cloud/webhook/fam-hist',
  metabolicAssessment: 'https://breeder80.app.n8n.cloud/webhook/metabolic-assessment',
  intakeWizard: 'https://breeder80.app.n8n.cloud/webhook/intake-wizard'
}
```

## Live URLs

- **Portal**: healthplex-portal.vercel.app
- **Intake Wizard**: healthplex-portal.vercel.app/intake-wizard/

## Business Context

Ryan Healthplex is a virtual functional medicine practice. Sales funnel:
1. Lead form (Meta/Google ads)
2. Free 15-min discovery call
3. $87 one-hour consultation (CWE)
4. $8,000 avg six-month wellness program
