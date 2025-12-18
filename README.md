# The Healthplex Project Portal

A collaborative web application for tracking notes and ideas across the client journey stages.

## Features

- Real-time collaboration across team members
- 8 client journey stages to organize notes
- User authentication (email/password)
- Live updates when teammates add notes
- Mobile-responsive design

## Setup Instructions

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click "New Project"
3. Enter a project name (e.g., "healthplex-portal")
4. Set a secure database password (save this somewhere safe)
5. Select a region closest to you
6. Click "Create new project" and wait for it to initialize (~2 minutes)

### Step 2: Get Your API Credentials

1. In your Supabase dashboard, go to **Settings** (gear icon) → **API**
2. Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
3. Copy the **anon/public** key (under "Project API keys")

### Step 3: Configure the Portal

1. Open `supabase-config.js` in a text editor
2. Replace `YOUR_SUPABASE_URL` with your Project URL
3. Replace `YOUR_SUPABASE_ANON_KEY` with your anon key

Example:
```javascript
const SUPABASE_URL = 'https://abcdefghijk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### Step 4: Create the Database Table

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Paste the following SQL and click "Run":

```sql
-- Create notes table
CREATE TABLE notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stage_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_notes_stage_id ON notes(stage_id);
CREATE INDEX idx_notes_created_at ON notes(created_at);

-- Enable Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all notes
CREATE POLICY "Users can read all notes"
    ON notes FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Authenticated users can insert their own notes
CREATE POLICY "Users can insert own notes"
    ON notes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

-- Policy: Users can update their own notes
CREATE POLICY "Users can update own notes"
    ON notes FOR UPDATE
    TO authenticated
    USING (auth.uid() = author_id);

-- Policy: Users can delete their own notes
CREATE POLICY "Users can delete own notes"
    ON notes FOR DELETE
    TO authenticated
    USING (auth.uid() = author_id);

-- Enable realtime for notes table
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
```

### Step 5: Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. (Optional) Go to **Authentication** → **URL Configuration**
4. (Optional) Customize email templates under **Authentication** → **Email Templates**

### Step 6: Launch the Portal

1. Open `index.html` in your web browser
2. Create an account using your email
3. Start adding notes to the journey stages!

## Client Journey Stages

| Stage | Description |
|-------|-------------|
| **Lead Capture** | Meta/Google ads → Interest form submission |
| **Lead Nurturing** | GHL AI agents, automated text follow-up |
| **Discovery Call** | Free 15-minute introductory call |
| **Paid Consultation** | $87 one-hour health consultation |
| **Program Enrollment** | $8k comprehensive wellness program |
| **Onboarding** | Intake forms, instructions, initial setup |
| **Lab Review** | Diagnostic testing, summaries, treatment plans |
| **Active Support** | Meal plans, messaging, group Zoom sessions |

## Troubleshooting

### "Setup Required" message appears
- Make sure you've updated `supabase-config.js` with your credentials
- Verify the URL starts with `https://` and doesn't have a trailing slash

### Can't create an account
- Check that Email authentication is enabled in Supabase
- Verify your anon key is correct (not the secret key)

### Notes don't appear in real-time
- Make sure you ran the SQL that adds the table to `supabase_realtime`
- Refresh the page and try again

### CORS errors in browser console
- Your Supabase URL or key may be incorrect
- Make sure you're using the anon/public key, not the secret key

## File Structure

```
Ryan Healthplex/
├── index.html          # Main application HTML
├── styles.css          # Styling (Healthplex branding)
├── app.js              # Application logic
├── supabase-config.js  # Supabase credentials (edit this)
├── image.png           # Healthplex logo
└── README.md           # This file
```

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **Fonts**: Marcellus (headings), Montserrat (body)
