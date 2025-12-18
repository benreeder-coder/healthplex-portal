/* ============================================
   Supabase Configuration
   ============================================ */

// Your Supabase project URL
const SUPABASE_URL = 'https://pckbnicersndcynbkgqe.supabase.co';

// Your Supabase anon/public key
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBja2JuaWNlcnNuZGN5bmJrZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMjM0NDUsImV4cCI6MjA4MTU5OTQ0NX0.Igx-hvnjRBhKDTCjuQ6zf0XUwnKuGDQ-cjUQ1ICeQ6A';

// Initialize Supabase client
let supabaseClient = null;

try {
    // The CDN exposes supabase globally with createClient method
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully');
    } else {
        console.error('Supabase library not loaded. window.supabase:', window.supabase);
    }
} catch (err) {
    console.error('Error initializing Supabase:', err);
}

// Export client for use in app.js (use different name to not conflict with library)
window.supabaseClient = supabaseClient;
