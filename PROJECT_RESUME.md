# Healthplex Portal - Project Resume

> Last updated: 2026-01-07

## Quick Context

This is the **Healthplex Client Portal** - a web app for Ryan Ferns' virtual functional medicine practice. Built by Ben Reeder (builderbenai.com) as part of a business automation consulting project.

## Current State

### Live URLs
- **Main Portal**: `healthplex-portal.vercel.app` (login required)
- **Intake Wizard**: `healthplex-portal.vercel.app/intake-wizard/`

### What's Working
- Main portal with Supabase auth (login for Ryan & Ben)
- Journey board for tracking client notes across stages
- 8-step intake wizard combining:
  - Patient info & contact details
  - Health concerns & complaints
  - Commitment & vision questions
  - Family history (2 tables: immediate + extended)
  - Metabolic assessment (135 questions across 14 categories)
  - Review & submit
- Form submissions go to n8n webhooks → GHL

### Tech Stack
- Vanilla HTML/CSS/JS (no framework)
- Supabase for auth & database
- Vercel for hosting
- n8n for webhook automation
- GoHighLevel (GHL) as CRM

## File Structure

```
/
├── index.html          # Main portal (login + journey board)
├── app.js              # Portal logic (auth, CRUD, real-time)
├── styles.css          # Portal styles
├── supabase-config.js  # Supabase credentials
├── image.png           # Healthplex logo
├── intake-wizard/
│   ├── index.html      # 8-step wizard form
│   ├── wizard.js       # Step navigation, validation
│   └── wizard.css      # Wizard-specific styles
├── shared/
│   ├── config.js       # Webhook URLs
│   ├── form-utils.js   # Form handling, payload building
│   └── styles.css      # Shared form styles
├── vercel.json         # Routing config
└── CLAUDE.md           # AI assistant instructions
```

## Key Technical Details

### Webhook Endpoints (n8n)
```javascript
webhooks: {
  newConsultation: 'https://breeder80.app.n8n.cloud/webhook/new-consult',
  familyHistory: 'https://breeder80.app.n8n.cloud/webhook/fam-hist',
  metabolicAssessment: 'https://breeder80.app.n8n.cloud/webhook/metabolic-assessment',
  intakeWizard: 'https://healthplex.app.n8n.cloud/webhook/intake-wizard'
}
```

### Intake Wizard Payload Structure
The wizard sends a structured JSON payload with:
- `_meta` - form type, timestamp, duration, completedSteps
- `rawData` - all form fields including `spouseAttendanceConfirm: true/false`
- `contact` - name, email, phone
- `consultation` - address, demographics, complaints, history, fears, goals, commitment scores
- `familyHistory` - conditions by family member (immediate + extended) with summary
- `metabolicAssessment` - 14+ categories with question text + scores, rankings, topConcerns, genderSpecific responses
- `lifestyle` - alcohol, caffeine, exercise, stress, foods
- `medications` - current meds and supplements

### Important Code Locations
- **Category titles**: `intake-wizard/index.html:762-1085` - All "Category I", "Category II", etc. (no descriptions shown to users)
- **Progress tracker labels**: `intake-wizard/index.html:93-106` - Step labels (Digestive, Metabolism, Hormones)
- **Step names for mobile**: `wizard.js:11-21` - stepNames array
- **Spouse checkbox**: `intake-wizard/index.html:602-607` - Required confirmation checkbox
- **Score display**: `intake-wizard/index.html:1180-1184` - Single teal score box (duplicate removed from wizard.js)
- **Metabolic questions map**: `form-utils.js:1-150` - METABOLIC_QUESTIONS constant (still has descriptive names for payload)
- **Payload builder**: `form-utils.js:755-1120` - buildIntakeWizardPayload()
- **Wizard navigation**: `wizard.js:130-160` - nextStep/prevStep/goToStep
- **Draft saving disabled**: `wizard.js:38-40` - clears localStorage on init

## Recent Changes (Jan 7, 2026)

1. **Migrated intake wizard to new n8n instance** - Changed webhook from `breeder80.app.n8n.cloud` to `healthplex.app.n8n.cloud/webhook/intake-wizard`. The other three webhooks (newConsultation, familyHistory, metabolicAssessment) remain on the old instance but are decommissioned/unused.

## Previous Changes (Dec 30, 2025)

1. **Removed category descriptions from metabolic assessment** - Categories now show "Category I", "Category VI", etc. instead of "Category I (Digestion - Colon)", "Category VI (Hypoglycemia)" to prevent subconscious bias in user responses. Backend payload still includes descriptive names for data analysis.
2. **Renamed progress tracker steps** - "Blood Sugar" → "Metabolism", "Thyroid" → "Hormones" (also updated step headers and navigation buttons)
3. **Consolidated score displays** - Removed duplicate score summary from review step, kept only the teal "Metabolic Assessment Total Score" box
4. **Added spouse/SO attendance checkbox** - Required checkbox on Step 3 (Commitment): "By checking this box, I confirm that I understand that (if applicable) my spouse or significant other is expected to attend my Complete Wellness Evaluation..."
5. **Updated CLAUDE.md** - Improved project documentation with architecture overview, local dev commands, key code locations table

## Previous Changes (Dec 23, 2025)

1. Built complete 8-step intake wizard
2. Fixed double form submission bug
3. Added descriptive question text to metabolic payload
4. Split family history into 2 tables (immediate/extended)
5. Added sticky headers to family history tables (teal color)
6. Moved age/sex from Step 5 to Step 1
7. Disabled draft saving (always starts fresh)
8. Removed raw q1-q135 from payload (already in structured data)
9. Cleaned up repo (removed standalone form folders)
10. Added vercel.json for trailing slash routing
11. Removed "save progress" message from welcome (since saving is disabled)
12. Created personal skill for project resume generation (~/.claude/skills/project-resume/)

## Known Issues / Future Work

- [ ] Auto-calculate age from birthDate
- [ ] Add form validation feedback improvements
- [ ] Consider adding confirmation email on submission
- [ ] Mobile responsive testing needed

## Business Context

Ryan Healthplex is a virtual functional medicine practice focused on:
- Gut health & nutrition
- Fitness & stress management
- Sleep optimization

**Sales Funnel:**
1. Lead form (Meta/Google ads)
2. Free 15-min discovery call
3. $87 one-hour consultation
4. $8,000 avg six-month wellness program

## Credentials & Access

- **GitHub**: github.com/benreeder-coder/healthplex-portal
- **Vercel**: Connected to GitHub, auto-deploys on push
- **Supabase**: Credentials in supabase-config.js
- **n8n (active)**: healthplex.app.n8n.cloud (intake wizard)
- **n8n (decommissioned)**: breeder80.app.n8n.cloud (old instance, other forms no longer used)

## How to Continue

1. Clone/pull the repo
2. Run locally: `python -m http.server 8080` or VS Code Live Server
3. Test at `localhost:8080` (portal) or `localhost:8080/intake-wizard/` (wizard)
4. Push to GitHub → auto-deploys to Vercel
