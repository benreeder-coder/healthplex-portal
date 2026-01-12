# Healthplex Portal - Project Resume

> Last updated: 2026-01-11

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
├── index.html            # Main portal (login + journey board)
├── app.js                # Portal logic (auth, CRUD, real-time)
├── styles.css            # Portal styles
├── supabase-config.js    # Supabase credentials
├── image.png             # Healthplex logo
├── ghl_body_for_n8n.txt  # GHL field mapping for n8n (copy lines 7-173)
├── intake-wizard/
│   ├── index.html        # 8-step wizard form
│   ├── wizard.js         # Step navigation, validation
│   └── wizard.css        # Wizard-specific styles
├── shared/
│   ├── config.js         # Webhook URLs
│   ├── form-utils.js     # Form handling, payload building, sanitization
│   └── styles.css        # Shared form styles
├── vercel.json           # Routing config
└── CLAUDE.md             # AI assistant instructions
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
- **Metabolic questions map**: `form-utils.js:18-169` - METABOLIC_QUESTIONS constant (still has descriptive names for payload)
- **Sanitization function**: `form-utils.js:178-183` - sanitizeString() replaces `"` with `'` for JSON safety
- **Payload sanitization**: `form-utils.js:362-370` - sanitizes all rawData strings before payload building
- **Payload builder**: `form-utils.js:779-1120` - buildIntakeWizardPayload()
- **Wizard navigation**: `wizard.js:130-160` - nextStep/prevStep/goToStep
- **Draft saving disabled**: `wizard.js:38-40` - clears localStorage on init
- **GHL field mapping**: `ghl_body_for_n8n.txt:7-173` - n8n JSON body template for GHL API

## Recent Changes (Jan 12, 2026) - PDF Attachment Feature

### What We Did
Added automatic PDF generation of the intake form at submission time. The PDF is sent as base64 in the webhook payload for upload to GHL.

### Files Modified
- **`intake-wizard/index.html`** - Added html2pdf.js CDN library
- **`intake-wizard/wizard.js`** - Added `generateFormPDF()` function and modified `handleSubmit()` to generate PDF before submission
- **`shared/form-utils.js`** - Added `pdfAttachment` object to the intake wizard payload

### New Payload Structure
The webhook payload now includes:
```javascript
{
  // ... existing fields ...
  pdfAttachment: {
    filename: "intake-form-{lastName}-{date}.pdf",
    mimeType: "application/pdf",
    base64Data: "JVBERi0xLjQK..." // Base64 encoded PDF
  }
}
```

### n8n Workflow Changes Required
To upload the PDF to GHL, add a new HTTP Request node after the Create/Update Contact nodes:

**Node: Upload PDF to GHL**
- Method: POST
- URL: `https://services.leadconnectorhq.com/forms/upload-custom-files`
- Query Parameters:
  - `contactId`: `{{ $json.contact.id }}` (from Create/Update response)
  - `locationId`: Your GHL location ID
- Headers:
  - `Authorization`: `Bearer {your_api_key}`
  - `Content-Type`: `multipart/form-data`
- Body (Form-Data):
  - Key: `{customFieldId}_{uuid}` (e.g., `intake_form_pdf_abc123`)
  - Value: Binary data from base64

**GHL Prerequisites:**
1. Create a "File Upload" custom field in GHL (Settings → Custom Fields)
2. Note the custom field ID (you'll need it for the upload)

### Full curl Example
```bash
curl --location 'https://services.leadconnectorhq.com/forms/upload-custom-files?contactId=CONTACT_ID&locationId=LOCATION_ID' \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Version: 2021-07-28' \
  --form 'CUSTOM_FIELD_ID_UUID=@/path/to/file.pdf'
```

### n8n Implementation Notes
1. Use a "Code" node to convert base64 to binary buffer
2. Use "HTTP Request" node with binary data option
3. Generate a UUID for each upload (use `{{ $randomUUID }}` in n8n)

---

## Recent Changes (Jan 11, 2026) - GHL Integration

### What We Did
Built the GoHighLevel (GHL) contact upsert integration via n8n. The workflow:
1. Receives intake wizard submission at `healthplex.app.n8n.cloud/webhook/intake-wizard`
2. Looks up contact by email in GHL
3. If found → Updates existing contact
4. If not found → Creates new contact
5. Maps 130+ fields from intake form to GHL custom fields

### Files Created/Modified
- **`ghl_body_for_n8n.txt`** - Complete JSON body template for n8n HTTP Request nodes. Copy lines 7-173 into the "JSON Body" field (with Expression mode ON) for both Create Contact and Update Contact nodes.
- **`shared/form-utils.js`** - Added `sanitizeString()` function to escape double quotes in form data (prevents JSON parsing errors, e.g., `6'2"` → `6'2'`)

### n8n Workflow Configuration
```
Webhook (Intake Form)
    → HTTP Request (Lookup by Email)
    → IF (contacts.length > 0)
        → TRUE: Update Contact (PUT)
        → FALSE: Create Contact (POST)
```

**Lookup Node:**
- Method: GET
- URL: `https://rest.gohighlevel.com/v1/contacts/lookup?email={{ $('Intake Form').item.json.body.rawData.email }}`
- Auth: Header Auth (Healthplex GHL credential)

**Create/Update Nodes:**
- Create: POST to `https://rest.gohighlevel.com/v1/contacts/`
- Update: PUT to `https://rest.gohighlevel.com/v1/contacts/{{ $json.contacts[0].id }}`
- Body: Paste from `ghl_body_for_n8n.txt` (lines 7-173)

### Field Mapping Notes
- Standard GHL fields: firstName, lastName, email, phone, address1, city, state, postalCode, dateOfBirth
- All other fields go in `customField` object using GHL custom field keys
- Metabolic questions (q1-q135) mapped to individual custom fields
- Gender-specific questions (male: q116-q123, female: q124-q135) use ternary expressions to return empty string when not applicable

### Known Issues - FIELDS THAT DON'T WORK YET
These need to be debugged in next session:

1. **Gender-specific field paths** - The ternary expressions may still have path issues:
   ```
   $('Intake Form').item.json.body.metabolicAssessment.genderSpecific.responses['q116']
   ```
   Need to verify the actual payload structure matches this path.

2. **Potentially missing metabolic questions** - Some questions may be mapped to wrong category paths. Verify:
   - `cat-6` through `cat-12` question ranges
   - Some questions may be numbered differently than expected

3. **Fields showing empty when they have data** - Need to compare actual webhook payload against the n8n expression paths

### How to Debug
1. Submit test form at `healthplex-portal.vercel.app/intake-wizard/`
2. Check n8n execution log - look at "Intake Form" node output to see actual payload structure
3. Compare payload paths with expressions in `ghl_body_for_n8n.txt`
4. Use n8n's expression editor to test individual field paths

### GHL Custom Fields Required
All these custom fields must exist in GHL (Settings → Custom Fields) with matching keys:
- `middle_name`, `occupation`, `employer`, `marital_status`
- `current_physician`, `current_physician_city`, `referred_by_if_applicable`
- `height`, `weight`, `main_complaints`, `health_concerns`
- All the metabolic symptom fields (see ghl_body_for_n8n.txt for full list)
- Commitment scores, lifestyle questions, etc.

## Previous Changes (Jan 7, 2026)

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

### GHL Integration (Priority)
- [ ] Debug fields that aren't mapping correctly (see "Known Issues - FIELDS THAT DON'T WORK YET" above)
- [ ] Verify all GHL custom fields exist with correct keys
- [ ] Test with both male and female form submissions to verify gender-specific fields

### General
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
