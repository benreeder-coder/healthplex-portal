/* ============================================
   The Healthplex Project Portal
   Application Logic
   ============================================ */

// Global form handlers (called from HTML onsubmit)
function handleLoginSubmit(e) {
    e.preventDefault();
    console.log('Login submit triggered');
    handleLogin(e);
    return false;
}

function handleSignupSubmit(e) {
    e.preventDefault();
    console.log('Signup submit triggered');
    handleSignup(e);
    return false;
}

// Journey stages configuration with automation status
// Status: 'automated' | 'partial' | 'manual' | 'cant-automate'
const STAGES = [
    {
        id: 'lead-capture',
        name: 'Lead Capture',
        description: 'FB/Google ads, website forms, email nurture',
        order: 1,
        status: 'automated',
        statusNote: 'Ignite handles forms → Calendly'
    },
    {
        id: 'lead-nurturing',
        name: 'Lead Nurturing',
        description: 'Text/email follow-up after form submission',
        order: 2,
        status: 'partial',
        statusNote: '<50% schedule DC after submitting info'
    },
    {
        id: 'dc-prep',
        name: 'DC Preparation',
        description: 'Video watching, calendar confirm, health concerns',
        order: 3,
        status: 'manual',
        statusNote: '<50% prepared, need reminders'
    },
    {
        id: 'discovery-call',
        name: 'Discovery Call',
        description: 'Free 15-min call (or AI text/voice)',
        order: 4,
        status: 'partial',
        statusNote: '<50% show rate, AI agents in training'
    },
    {
        id: 'cwe-scheduling',
        name: 'CWE Scheduling',
        description: 'Payment ($87) + scheduling in Cerbo',
        order: 5,
        status: 'manual',
        statusNote: 'Done manually in Cerbo EHR'
    },
    {
        id: 'cwe-prep',
        name: 'CWE Preparation',
        description: 'Intake forms 48hrs before appointment',
        order: 6,
        status: 'partial',
        statusNote: 'Reminders at 72/48/24hrs, no completion detection'
    },
    {
        id: 'cwe',
        name: 'Complete Wellness Eval',
        description: '$87 one-hour health consultation',
        order: 7,
        status: 'cant-automate',
        statusNote: '70-80% convert to program'
    },
    {
        id: 'program-enrollment',
        name: 'Program Enrollment',
        description: '$8k comprehensive wellness program',
        order: 8,
        status: 'manual',
        statusNote: 'Welcome message + lab ordering manual'
    },
    {
        id: 'client-onboarding',
        name: 'Client Onboarding',
        description: 'Lab ordering, curriculum setup',
        order: 9,
        status: 'cant-automate',
        statusNote: 'Labs customized per client'
    },
    {
        id: 'protocols',
        name: 'Protocols & Plans',
        description: 'Meal plans, supplements, nutrition, fitness, sleep, stress',
        order: 10,
        status: 'manual',
        statusNote: 'AI-assisted but needs review'
    },
    {
        id: 'active-support',
        name: 'Active Support',
        description: 'Messaging, weekly Zoom sessions, progress reports',
        order: 11,
        status: 'partial',
        statusNote: 'AI drafts possible, 9 Zooms/week'
    }
];

// App state
let currentUser = null;
let notes = {};
let activeStageId = null;
let fullscreenStageId = null;

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const app = document.getElementById('app');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authTabs = document.querySelectorAll('.auth-tab');
const authError = document.getElementById('auth-error');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');
const journeyBoard = document.getElementById('journey-board');
const modalOverlay = document.getElementById('modal-overlay');
const noteModal = document.getElementById('note-modal');
const modalStageName = document.getElementById('modal-stage-name');
const noteContent = document.getElementById('note-content');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const modalSave = document.getElementById('modal-save');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const fullscreenOverlay = document.getElementById('fullscreen-overlay');
const fullscreenContent = document.getElementById('fullscreen-content');
const fullscreenClose = document.getElementById('fullscreen-close');
const fullscreenAddBtn = document.getElementById('fullscreen-add-btn');

// Get Supabase client reference (function to ensure we get latest)
function getSupabase() {
    return window.supabaseClient;
}

// Initialize app
async function init() {
    console.log('Initializing app...');

    const supabase = getSupabase();
    console.log('Supabase client:', supabase);

    // Check if Supabase is configured
    if (!supabase) {
        console.error('Supabase not configured');
        showConfigError();
        return;
    }

    console.log('Supabase client ready');

    try {
        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error('Session error:', error);
        }

        if (session) {
            console.log('Existing session found');
            currentUser = session.user;
            showApp();
            await loadNotes();
            setupRealtimeSubscription();
        } else {
            console.log('No session, showing auth');
            showAuth();
        }
    } catch (err) {
        console.error('Init error:', err);
        showAuth();
    }

    setupEventListeners();
    console.log('Event listeners attached');
}

// Show configuration error
function showConfigError() {
    authScreen.innerHTML = `
        <div class="auth-container">
            <div class="auth-brand">
                <img src="image.png" alt="The Healthplex" class="auth-logo">
                <div class="auth-divider"></div>
                <span class="portal-badge">Project Portal</span>
            </div>
            <div class="auth-card">
                <div style="text-align: center; padding: 20px;">
                    <h2 style="font-family: var(--font-display); color: var(--gray-800); margin-bottom: 16px;">Setup Required</h2>
                    <p style="color: var(--gray-600); margin-bottom: 16px;">
                        Please configure your Supabase credentials in <code style="background: var(--gray-100); padding: 2px 6px; border-radius: 4px;">supabase-config.js</code>
                    </p>
                    <p style="font-size: 0.875rem; color: var(--gray-500);">
                        See README.md for setup instructions.
                    </p>
                </div>
            </div>
        </div>
    `;
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    console.log('Login form found:', !!loginForm);
    console.log('Signup form found:', !!signupForm);

    // Auth tabs
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchAuthTab(tabName);
        });
    });

    // Login form
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            console.log('Login form submitted');
            handleLogin(e);
        });
    }

    // Signup form
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            console.log('Signup form submitted');
            handleSignup(e);
        });
    }

    // Logout
    logoutBtn?.addEventListener('click', handleLogout);

    // Modal controls
    modalClose?.addEventListener('click', closeModal);
    modalCancel?.addEventListener('click', closeModal);
    modalSave?.addEventListener('click', saveNote);
    modalOverlay?.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Fullscreen modal controls
    fullscreenClose?.addEventListener('click', closeFullscreen);
    fullscreenOverlay?.addEventListener('click', (e) => {
        if (e.target === fullscreenOverlay) closeFullscreen();
    });
    fullscreenAddBtn?.addEventListener('click', () => {
        if (fullscreenStageId) {
            closeFullscreen();
            setTimeout(() => openModal(fullscreenStageId), 300);
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeFullscreen();
        }
    });
}

// Switch auth tabs
function switchAuthTab(tabName) {
    authTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    loginForm.classList.toggle('active', tabName === 'login');
    signupForm.classList.toggle('active', tabName === 'signup');
    authError.textContent = '';
}

// Handle login
async function handleLogin(e) {
    if (e) e.preventDefault();

    const supabase = getSupabase();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('login-btn');
    const errorEl = document.getElementById('auth-error');

    console.log('Attempting login with:', email);

    if (!supabase) {
        alert('Supabase not initialized. Please refresh the page.');
        return;
    }

    // Show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Signing in...</span>';
    }
    if (errorEl) errorEl.textContent = '';

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        console.log('Login response:', { data, error });

        if (error) throw error;

        currentUser = data.user;
        showApp();
        await loadNotes();
        setupRealtimeSubscription();
        showToast('Welcome back!');
    } catch (error) {
        console.error('Login error:', error);
        if (errorEl) {
            errorEl.textContent = error.message || 'Login failed. Please check your credentials.';
            errorEl.style.display = 'block';
            errorEl.style.color = 'var(--error)';
        }
        alert('Login error: ' + (error.message || 'Unknown error'));
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Sign In</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
        }
    }
}

// Handle signup
async function handleSignup(e) {
    if (e) e.preventDefault();

    const supabase = getSupabase();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const submitBtn = document.getElementById('signup-btn');
    const errorEl = document.getElementById('auth-error');

    console.log('Attempting signup with:', email, name);

    if (!supabase) {
        alert('Supabase not initialized. Please refresh the page.');
        return;
    }

    // Validate password length
    if (password.length < 6) {
        if (errorEl) {
            errorEl.textContent = 'Password must be at least 6 characters';
            errorEl.style.display = 'block';
            errorEl.style.color = 'var(--error)';
        }
        alert('Password must be at least 6 characters');
        return;
    }

    // Show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Creating account...</span>';
    }
    if (errorEl) errorEl.textContent = '';

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name
                }
            }
        });

        console.log('Signup response:', { data, error });

        // Even if there's an error, check if user was created and try to sign in
        if (error) {
            console.log('Signup had error, attempting auto-signin...');
            // Try to sign in - user might have been created despite error
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (signInData?.session) {
                // Success - user was created and we signed them in
                currentUser = signInData.user;
                showApp();
                await loadNotes();
                setupRealtimeSubscription();
                showToast('Welcome to the portal!');
                return;
            }

            // If sign in also failed, show friendly error
            throw new Error('Unable to create account. Please try again or contact support.');
        }

        if (data.user && !data.session) {
            // Email confirmation required
            if (errorEl) {
                errorEl.style.color = 'var(--teal-primary)';
                errorEl.textContent = 'Check your email to confirm your account!';
                errorEl.style.display = 'block';
            }
            showToast('Confirmation email sent!');
        } else if (data.session) {
            // Auto-confirmed (email confirmation disabled)
            currentUser = data.user;
            showApp();
            await loadNotes();
            setupRealtimeSubscription();
            showToast('Account created successfully!');
        } else {
            // Unexpected state - try signing in
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (signInData?.session) {
                currentUser = signInData.user;
                showApp();
                await loadNotes();
                setupRealtimeSubscription();
                showToast('Welcome to the portal!');
            } else {
                if (errorEl) {
                    errorEl.style.color = 'var(--teal-primary)';
                    errorEl.textContent = 'Account created! Please sign in.';
                    errorEl.style.display = 'block';
                }
                switchAuthTab('login');
                document.getElementById('login-email').value = email;
                showToast('Please sign in with your new account');
            }
        }
    } catch (error) {
        console.error('Signup error:', error);
        if (errorEl) {
            errorEl.style.color = 'var(--error)';
            errorEl.textContent = 'Unable to create account. Please try again.';
            errorEl.style.display = 'block';
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Create Account</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
        }
    }
}

// Handle logout
async function handleLogout() {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    currentUser = null;
    notes = {};
    showAuth();
    showToast('Signed out successfully');
}

// Show auth screen
function showAuth() {
    authScreen.classList.remove('hidden');
    app.classList.add('hidden');
}

// Show main app
function showApp() {
    authScreen.classList.add('hidden');
    app.classList.remove('hidden');

    // Update user info
    const displayName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    userName.textContent = displayName;
    userAvatar.textContent = displayName.charAt(0).toUpperCase();

    renderJourneyBoard();
}

// Initial notes from project discovery
const SEED_NOTES = [
    {
        stage_id: 'lead-capture',
        content: '4 entry points: Facebook ads, Google ads, website direct, email nurture sequence. Google ad leads are better prepared (watch video, provide health concerns). FB form needs updating to match Google form.',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'lead-capture',
        content: 'Links:\n• FB: thehealthplex.co/book-a-call-functional-medicine-fb\n• Google: thehealthplex.co/book-a-free-call-ggl\n• Website: thehealthplex.co/book-free-call',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'lead-nurturing',
        content: 'OPPORTUNITY: <50% of leads actually schedule a discovery call after submitting info. Need automated emails/texts reminding them to schedule or offering text communication option.',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'lead-nurturing',
        content: 'AI bot trained for text conversations. Trial run completed, updated training done. Can walk leads through questions and schedule CWE. Some people only convert with live person call.',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'dc-prep',
        content: 'OPPORTUNITY: <50% prepared for DC. Need reminders to: confirm appointment (add to calendar), be in quiet place, watch video before call, submit health concerns.',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'dc-prep',
        content: 'IDEA: Send phenomenal client reviews after booking to build confidence. Show them what\'s possible with the program.',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'discovery-call',
        content: 'DC Questions:\n1. What are your health concerns?\n2. What have you tried in the past?\n3. What are your frustrations?\n4. What are you hoping to accomplish?\nThen explain CWE and ask if they want to proceed.',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'discovery-call',
        content: 'OPPORTUNITY: AI voice/text agents to automate DCs. Agent should take payment and schedule. Don\'t schedule until payment received to avoid losing time slots.',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'cwe-scheduling',
        content: 'Currently done manually in Cerbo EHR. Intake forms sent manually through Cerbo as well. GOAL: Migrate to GoHighLevel for automation.',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'cwe-prep',
        content: 'Forms should be filled 48hrs before appointment. Current reminders at 72/48/24 hrs. PROBLEM: No way to detect if forms completed. Only discover day-of, losing the time slot.',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'cwe-prep',
        content: 'SOLUTION: Build forms in GHL so completion can be detected. Stop reminders once filled. If not filled 48hrs before, reschedule and fill slot with someone else.',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'cwe',
        content: '70-80% conversion rate to wellness program. 1-hour deep dive into health history + sales presentation. This step requires human - can\'t be automated.',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'cwe',
        content: 'For non-converters: Consider downsell to DIY program (~$2k) or pre-made supplement bundle. Could move them back up the ladder later.',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'program-enrollment',
        content: 'Welcome message includes lab order. Lab orders are customized per client - can\'t automate the ordering. Could automate message directing them where to find their lab order.',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'client-onboarding',
        content: 'Current curriculum is standardized protocols (keto, autoimmune paleo, etc). Future: Build own curriculum with customized protocols as part of it.',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'protocols',
        content: 'Non-GHL automations needed:\n• Lab reviews & summaries\n• Meal plans (customized to preferences)\n• Supplement protocols\n• Nutrition/Fitness/Sleep/Stress protocols',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'protocols',
        content: 'Meal plan experiment: $49/week service. Clients filling food preference forms, AI creates customized plan with recipes, grocery list, prep instructions based on time availability. High satisfaction.',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'active-support',
        content: 'Communication flow:\n1. Submit questions in writing\n2. Team sends written response (AI can draft)\n3. If still need help → join one of 9 weekly Zoom group sessions',
        author_name: 'Project Notes'
    },
    {
        stage_id: 'active-support',
        content: 'OPPORTUNITY: Weekly progress report form → AI analyzes responses → triages by severity → drafts follow-up responses. Individual ChatGPT projects per client store their history.',
        author_name: 'Project Notes'
    }
];

// Load notes from Supabase
async function loadNotes() {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Group notes by stage
        notes = {};
        STAGES.forEach(stage => {
            notes[stage.id] = [];
        });

        data?.forEach(note => {
            if (notes[note.stage_id]) {
                notes[note.stage_id].push(note);
            }
        });

        // If no notes exist, seed with initial data
        if (!data || data.length === 0) {
            await seedInitialNotes();
        } else {
            renderNotes();
        }
    } catch (error) {
        console.error('Error loading notes:', error);
        showToast('Error loading notes');
    }
}

// Seed initial notes from project discovery
async function seedInitialNotes() {
    const supabase = getSupabase();
    if (!supabase || !currentUser) return;

    console.log('Seeding initial notes...');

    try {
        const notesToInsert = SEED_NOTES.map(note => ({
            ...note,
            author_id: currentUser.id
        }));

        const { error } = await supabase
            .from('notes')
            .insert(notesToInsert);

        if (error) {
            console.error('Error seeding notes:', error);
            renderNotes();
            return;
        }

        // Reload notes after seeding
        const { data } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: true });

        notes = {};
        STAGES.forEach(stage => {
            notes[stage.id] = [];
        });

        data?.forEach(note => {
            if (notes[note.stage_id]) {
                notes[note.stage_id].push(note);
            }
        });

        renderNotes();
        showToast('Loaded project notes');
    } catch (err) {
        console.error('Seed error:', err);
        renderNotes();
    }
}

// Setup realtime subscription
function setupRealtimeSubscription() {
    const supabase = getSupabase();
    if (!supabase) return;

    supabase
        .channel('notes-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'notes'
            },
            (payload) => {
                handleRealtimeUpdate(payload);
            }
        )
        .subscribe();
}

// Handle realtime updates
function handleRealtimeUpdate(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
        case 'INSERT':
            if (notes[newRecord.stage_id]) {
                notes[newRecord.stage_id].push(newRecord);
                renderStageNotes(newRecord.stage_id);

                // Update fullscreen if open
                if (fullscreenStageId === newRecord.stage_id) {
                    renderFullscreenNotes(newRecord.stage_id);
                }

                // Show notification if not from current user
                if (newRecord.author_id !== currentUser.id) {
                    showToast(`${newRecord.author_name} added a note`);
                }
            }
            break;

        case 'DELETE':
            if (notes[oldRecord.stage_id]) {
                notes[oldRecord.stage_id] = notes[oldRecord.stage_id].filter(
                    n => n.id !== oldRecord.id
                );
                renderStageNotes(oldRecord.stage_id);

                // Update fullscreen if open
                if (fullscreenStageId === oldRecord.stage_id) {
                    renderFullscreenNotes(oldRecord.stage_id);
                }
            }
            break;

        case 'UPDATE':
            if (notes[newRecord.stage_id]) {
                const index = notes[newRecord.stage_id].findIndex(
                    n => n.id === newRecord.id
                );
                if (index !== -1) {
                    notes[newRecord.stage_id][index] = newRecord;
                    renderStageNotes(newRecord.stage_id);

                    // Update fullscreen if open
                    if (fullscreenStageId === newRecord.stage_id) {
                        renderFullscreenNotes(newRecord.stage_id);
                    }
                }
            }
            break;
    }
}

// Render journey board
function renderJourneyBoard() {
    const statusLabels = {
        'automated': 'Automated',
        'partial': 'Partial',
        'manual': 'Manual',
        'cant-automate': "Can't Automate"
    };

    journeyBoard.innerHTML = STAGES.map(stage => `
        <div class="stage-column" data-stage="${stage.id}" data-status="${stage.status}">
            <div class="stage-header">
                <div class="stage-header-top">
                    <div class="stage-number">Stage ${stage.order}</div>
                    <button class="stage-expand-btn" data-stage="${stage.id}" title="Expand">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                        </svg>
                    </button>
                </div>
                <div class="stage-header-main">
                    <div class="status-badge status-${stage.status}">${statusLabels[stage.status]}</div>
                    <h3 class="stage-name">${stage.name}</h3>
                    <p class="stage-description">${stage.description}</p>
                    <p class="stage-status-note">${stage.statusNote}</p>
                </div>
            </div>
            <div class="stage-content" id="notes-${stage.id}">
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <span>Loading notes...</span>
                </div>
            </div>
            <div class="stage-footer">
                <button class="add-note-btn" data-stage="${stage.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    <span>Add Note</span>
                </button>
            </div>
        </div>
    `).join('');

    // Add click handlers for add note buttons
    document.querySelectorAll('.add-note-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openModal(btn.dataset.stage);
        });
    });

    // Add click handlers for expand buttons
    document.querySelectorAll('.stage-expand-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openFullscreen(btn.dataset.stage);
        });
    });
}

// Render all notes
function renderNotes() {
    STAGES.forEach(stage => {
        renderStageNotes(stage.id);
    });
}

// Render notes for a specific stage
function renderStageNotes(stageId) {
    const container = document.getElementById(`notes-${stageId}`);
    if (!container) return;

    const stageNotes = notes[stageId] || [];

    if (stageNotes.length === 0) {
        container.innerHTML = `
            <div class="note-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <span>No notes yet</span>
            </div>
        `;
        return;
    }

    container.innerHTML = stageNotes.map(note => `
        <div class="note-card" data-note-id="${note.id}">
            <button class="note-delete-btn" data-note-id="${note.id}" data-stage-id="${stageId}" title="Delete note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
            <div class="note-content">${escapeHtml(note.content)}</div>
            <div class="note-meta">
                <div class="note-author">
                    <div class="note-author-avatar">${note.author_name?.charAt(0).toUpperCase() || 'U'}</div>
                    <span class="note-author-name">${escapeHtml(note.author_name || 'Unknown')}</span>
                </div>
                <span class="note-time">${formatTime(note.created_at)}</span>
            </div>
        </div>
    `).join('');

    // Add delete handlers
    container.querySelectorAll('.note-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const noteId = btn.dataset.noteId;
            const stageId = btn.dataset.stageId;
            confirmDeleteNote(noteId, stageId);
        });
    });
}

// Open fullscreen view
function openFullscreen(stageId) {
    fullscreenStageId = stageId;
    const stage = STAGES.find(s => s.id === stageId);
    if (!stage) return;

    const statusLabels = {
        'automated': 'Automated',
        'partial': 'Partial',
        'manual': 'Manual',
        'cant-automate': "Can't Automate"
    };

    // Update header info
    document.getElementById('fullscreen-stage-number').textContent = `Stage ${stage.order}`;
    document.getElementById('fullscreen-title').textContent = stage.name;
    document.getElementById('fullscreen-description').textContent = stage.description;
    document.getElementById('fullscreen-status-note').textContent = stage.statusNote;

    // Update status badge
    const statusBadge = document.getElementById('fullscreen-status-badge');
    statusBadge.textContent = statusLabels[stage.status];
    statusBadge.className = `fullscreen-status-badge status-${stage.status}`;

    // Update header color based on status
    const header = document.querySelector('.fullscreen-header');
    header.setAttribute('data-status', stage.status);

    // Render notes
    renderFullscreenNotes(stageId);

    // Show modal
    fullscreenOverlay.classList.add('active');
}

// Close fullscreen view
function closeFullscreen() {
    fullscreenOverlay.classList.remove('active');
    fullscreenStageId = null;
}

// Render notes in fullscreen view
function renderFullscreenNotes(stageId) {
    const stageNotes = notes[stageId] || [];

    if (stageNotes.length === 0) {
        fullscreenContent.innerHTML = `
            <div class="fullscreen-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <span>No notes yet. Add your first note!</span>
            </div>
        `;
        return;
    }

    fullscreenContent.innerHTML = stageNotes.map(note => `
        <div class="note-card" data-note-id="${note.id}">
            <button class="note-delete-btn" data-note-id="${note.id}" data-stage-id="${stageId}" title="Delete note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
            <div class="note-content">${escapeHtml(note.content)}</div>
            <div class="note-meta">
                <div class="note-author">
                    <div class="note-author-avatar">${note.author_name?.charAt(0).toUpperCase() || 'U'}</div>
                    <span class="note-author-name">${escapeHtml(note.author_name || 'Unknown')}</span>
                </div>
                <span class="note-time">${formatTime(note.created_at)}</span>
            </div>
        </div>
    `).join('');

    // Add delete handlers
    fullscreenContent.querySelectorAll('.note-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const noteId = btn.dataset.noteId;
            const stageId = btn.dataset.stageId;
            confirmDeleteNote(noteId, stageId);
        });
    });
}

// Open modal
function openModal(stageId) {
    activeStageId = stageId;
    const stage = STAGES.find(s => s.id === stageId);

    modalStageName.textContent = stage.name;
    noteContent.value = '';
    modalOverlay.classList.add('active');
    noteContent.focus();
}

// Close modal
function closeModal() {
    modalOverlay.classList.remove('active');
    activeStageId = null;
    noteContent.value = '';
}

// Save note
async function saveNote() {
    const supabase = getSupabase();
    const content = noteContent.value.trim();

    if (!content) {
        showToast('Please enter a note');
        return;
    }

    if (!activeStageId) {
        showToast('Error: No stage selected');
        return;
    }

    if (!supabase) {
        showToast('Error: Database not connected');
        return;
    }

    const authorName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];

    try {
        const { data, error } = await supabase
            .from('notes')
            .insert({
                stage_id: activeStageId,
                content: content,
                author_id: currentUser.id,
                author_name: authorName
            })
            .select()
            .single();

        if (error) throw error;

        closeModal();
        showToast('Note added successfully');
    } catch (error) {
        console.error('Error saving note:', error);
        showToast('Error saving note');
    }
}

// Confirm delete note
function confirmDeleteNote(noteId, stageId) {
    if (confirm('Are you sure you want to delete this note?')) {
        deleteNote(noteId, stageId);
    }
}

// Delete note
async function deleteNote(noteId, stageId) {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId);

        if (error) throw error;

        // Remove from local state
        if (notes[stageId]) {
            notes[stageId] = notes[stageId].filter(n => n.id !== noteId);
            renderStageNotes(stageId);

            // Also update fullscreen view if open
            if (fullscreenStageId === stageId) {
                renderFullscreenNotes(stageId);
            }
        }

        showToast('Note deleted');
    } catch (error) {
        console.error('Error deleting note:', error);
        showToast('Error deleting note');
    }
}

// Show toast notification
function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add('active');

    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// Format timestamp
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
