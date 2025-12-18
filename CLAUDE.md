# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This directory contains the **Healthplex Project Portal** - a collaborative web application for tracking notes across the client journey stages, plus meeting transcripts and documentation for the business automation consulting project between Ben Reeder (builderbenai.com) and Ryan Ferns (Ryan Healthplex).

## Portal Application

The portal is a vanilla HTML/CSS/JS web app with Supabase backend:

- **index.html** - Main application (auth screen + journey board)
- **styles.css** - Healthplex-branded styling (teal color scheme, Marcellus/Montserrat fonts)
- **app.js** - Application logic (auth, CRUD, real-time subscriptions)
- **supabase-config.js** - Supabase credentials (must be configured)
- **README.md** - Setup instructions for Supabase

### Running the Portal
1. Configure `supabase-config.js` with Supabase URL and anon key
2. Run the SQL in README.md to create the `notes` table
3. Open `index.html` in a browser

### Key Files for Modifications
- Stages are defined in `app.js` (STAGES array at top)
- Branding colors in `styles.css` (CSS variables at top)
- Auth and note logic in `app.js`

## Meeting Transcripts

- **init_meeting.txt** - Initial discovery call transcript (November 25)
- **Kickoff-Call-between-Ben-Reeder-and-Ryan-Ferns-*.json** - Kickoff meeting transcript
- **Ryan-Ben-Catchup-*.json** - Follow-up meeting transcript

## Business Context

Ryan Healthplex is a virtual functional medicine practice focused on gut health, nutrition, fitness, stress management, and sleep. The project scope involves:

1. **Lead nurturing automation** - Automating follow-up with leads from Meta/Google ads via GoHighLevel
2. **Form automation** - Triggering intake forms and instructions when consultations are booked
3. **Asset generation** - Creating personalized meal plans, nutrition protocols, and treatment summaries using AI
4. **Lab review automation** - Processing extensive diagnostic lab results into client-friendly summaries and treatment plans
5. **Client support automation** - Drafting responses to client messages using context from their history

## Key Systems

- **GoHighLevel (GHL)** - Primary CRM and automation platform
- **ChatGPT Projects** - Currently used for per-client context storage (lab results, intake forms, history)

## Sales Funnel

1. Lead form (Meta/Google ads)
2. Free 15-minute discovery call
3. Paid $87 one-hour consultation
4. $8,000 average six-month comprehensive wellness program

## Working With This Project

When asked to help with this project, you are likely being asked to:
- Analyze meeting transcripts for action items or requirements
- Help design automation workflows
- Draft proposals or documentation
- Create templates for client communications
